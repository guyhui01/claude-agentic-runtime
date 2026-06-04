# Changelog — claude-agentic-runtime

> Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versionnement [SemVer](https://semver.org/lang/fr/).
> Convention : chaque entrée indique le **modèle Claude** utilisé.

---

## [Unreleased]
> Modèle : Claude Opus 4.8

### Added
- **§2.4-B.2 — implémentation ADR-0007 : manifeste de spine + registre de critères (hors-ligne)** (`src/manifest/{types,load-manifest}.ts`, `src/eval/criteria-registry.ts`) : `loadSpine(manifest, sidecar, registry, resolveAgent)` assemble un `SpineManifest` en `SpineStep[]` prêt pour `runSpine`, en **croisant fail-closed** le sidecar (asset présent ET de type *agent*) et le registre (critère résolu par `id`), provenance (`assetId`/`catalogTag`) tirée de l'asset, agent résolu via un `AgentResolver` injecté (`toAgentDefinition` en prod). Contrats portés en JSON Schema (donnée) dans le manifeste ; critères restés du code, référencés par `id` via `CriterionRegistry` (refus des doublons, `resolve` fail-closed). `ManifestValidationError` agrège toutes les incohérences (asset inconnu, non-agent, critère inconnu, stepId dupliqué, spine vide). Orchestrateur `runSpine` **inchangé** (assembleur en amont). 7 tests hermétiques (dont bout-en-bout manifeste→runSpine) ; suite portée à **64 tests verts**.
- **§2.4-B.1 — exécuteur de la spine (hors-ligne, sans réseau)** (`src/orchestrator/{types,run-spine}.ts`) : `runSpine(steps, runner, initialInput)` déroule WF-001→002→003 en branchant, par étape, un **runner injectable** (abstraction de `query()`, mocké en B.1), l'**eval gate** (brique 2, fail-closed) sur la sortie, puis les **contrats de handoff** (brique 1, fail-closed) vers l'aval. **Pré-vol statique** (`checkContractCompatibility`) des contrats adjacents AVANT tout appel runner. Orchestrateur **pur** (aucun disque/réseau, seul effet via le runner). **Provenance** (`assetId` + `catalogTag`) et **`GateReport`** consignés dans une trace d'audit conservée jusqu'à l'étape atteinte, y compris en échec (posture ISO 19011). 6 tests hermétiques (happy path · provenance · fail-closed gate · fail-closed handoff · pré-vol statique · cohérence stepId) ; suite portée à **57 tests verts**. Source des contrats/critères encore en fixtures (décision de source = §2.4-B.2, à trancher).
- **§2.4-A — adaptateur catalogue → SDK** (`src/sdk/to-agent-definition.ts`) : transforme un `Asset` de type *agent* (+ sa prose `.md`) en `AgentDefinition` du Claude Agent SDK (`prompt` = prose, `description` = description du sidecar). Lecture seule (ADR-0001), garde anti-traversal, défauts read-only (`Read`/`Grep`/`Glob`) + `overrides` explicites en attendant que le sidecar porte `tools`/`model`/`mcp` (*data gap*, cf. `NEXT_STEPS §2.1`). 5 tests ; suite portée à **51 tests verts**.
- **Dépendance `@anthropic-ai/claude-agent-sdk`** (`^0.3.162`) : package vérifié (API `query({prompt, options})`, type `AgentDefinition`). Première moitié de l'intégration SDK, **sans réseau ni appel facturé**.

- **ADR-0007 — source des contrats/critères tranchée (§2.4-B.2)** (`docs/adr/0007-...md`) : **manifeste de spine propriété du runtime** — contrats en JSON Schema (donnée) + critères référencés par `id` depuis un registre TS (code déterministe, pas de DSL prématuré), croisés avec le sidecar (descriptif, inchangé — ADR-0003). Fait décisif : un `Criterion.check` est du code, non sérialisable en sidecar. Référencé dans README + NEXT_STEPS §2.4-B.2.

### Changed
- **`docs/NEXT_STEPS.md`** : briques 1 & 2 et §2.4-A actées ; prérequis §2.4-B précisé — **auth OAuth abonnement uniquement**, jamais `ANTHROPIC_API_KEY` (clé métrée = facturation au token + priorité sur l'OAuth → risque de dépassement budget), standby *fail-closed* à la limite de quota + caps par run (`maxBudgetUsd`/`maxTurns`/`permissionMode:"plan"`).

### Security
- `npm audit` après ajout du SDK : 5 vulnérabilités (4 modérées, 1 critique) en **dépendances transitives** de `@anthropic-ai/claude-agent-sdk` ; pas de `audit fix --force` (casse). Sans impact sur l'adaptateur (type-only) ni les tests ; à réévaluer aux montées de version du SDK.

### Notes
- Règle d'auth/budget consignée (mémoire projet) : OAuth abonnement, jamais de clé métrée. Vérifié 2026-06-04 : `ANTHROPIC_API_KEY` absente aux 3 scopes (session/User/Machine) — règle déjà structurellement tenue.

---

## [0.2.0] — 2026-06-04 — Socle d'exécution : Loader + contrats + eval gate
> Modèle : Claude Opus 4.8
>
> Premier socle de **code** du runtime (la 0.1.0 était documentaire). Briques 0, 1 et 2 du POC. **46 tests verts**, `typecheck` strict OK.

### Added
- **Brique 0 — Loader sidecar (fail-closed)** :
  - **`schema/sidecar.schema.json`** (JSON Schema 2020-12) : index machine-lisible du catalogue, encodant de façon **exécutable** 5 des 7 caractéristiques ISO/IEC 25012 retenues (ADR-0006) — complétude, cohérence (`if/then` par type), crédibilité (`source` = `{file, catalogTag}`), actualité (tag épinglé + horodatage), exactitude/accessibilité bien-formées. `path`/`source.file` anti-traversal (pas de `/` initial ni `..`).
  - **`src/sidecar/types.ts`** : miroir TypeScript du sidecar.
  - **`src/sidecar/integrity.ts`** : les 2 caractéristiques ISO 25012 hors portée d'un JSON Schema — `checkReferentialIntegrity` (`dependsOn`→`id`), `checkAccessibility` (joignabilité disque, refus défensif des chemins absolus/`..`) — plus `checkUniqueIds` (unicité globale des `id`) et l'agrégat `checkIntegrity`.
  - **`src/loader/load-sidecar.ts`** : pipeline ordonné à court-circuit `parse` → `schema` (ajv) → `integrity`, retournant un `Sidecar` typé ou levant une `SidecarValidationError` qui agrège **tous** les problèmes (`LoadIssue[]` par étape). Schéma compilé une seule fois (cache module) ; `catalogRoot` par défaut = dossier du sidecar ; intégrité non lancée si le schéma échoue.
  - Tests : `sidecar.schema.test.ts` (18), `sidecar.integrity.test.ts` (8) + fixture hermétique `test/fixtures/catalog/`, `loader.test.ts` (7).
- **Brique 1 — contrats de handoff typés** (`src/handoff/{types,validate-handoff}.ts`) : `checkContractCompatibility` (statique *shallow* : champs `required` de l'aval promis par la sortie amont) + `validateHandoff` (runtime fail-closed : payload conforme à la sortie amont ET à l'entrée aval), `HandoffValidationError` agrégée, ajv2020/strict réutilisé du loader. Comble le vide que le SDK ne couvre pas — la cohérence I/O inter-étapes. 7 tests.
- **Brique 2 — eval gate déterministe** (`src/eval/{types,eval-gate}.ts`) : critères `blocking`/`advisory` (check défensif), `runEvalGate` (ÉVALUE — ne lève jamais, produit le rapport-preuve même en succès) + `assertGatePassed` (APPLIQUE — fail-closed). Pas de LLM-as-judge (POC ; extension ultérieure, même interface `Criterion`). Fixture = DoD du cadrage WF-001. 6 tests.
- **`package.json`** : version 0.1.0 → 0.2.0 ; `package-lock.json` (premier `npm install`, 52 paquets).

### Notes
- Choix d'encodage sidecar : pas de champ `format` redondant, pas de checksum/score (ISO 25024 **différé**, ADR-0006), validation par `pattern` plutôt que `format` → aucune dépendance `ajv-formats`.
- Le sidecar de production n'est pas dans ce repo (ADR-0003) : importé épinglé depuis `claude-agents` ; `checkAccessibility` résout les chemins via un `catalogRoot` injecté (jamais hardcodé).
- vitest maintenu en `^2.1` (montée v4 = chantier dédié ; faille esbuild côté serveur de dev non exposée).

---

## [0.1.0] — 2026-06-03 — Fondation documentaire & gouvernance (pré-code)
> Modèle : Claude Opus 4.8

### Added
- **Note de cadrage** du POC (`docs/note_cadrage_poc.md`) — objectif portfolio, périmètre spine WF-001→003, 3 briques, invariants, risques.
- **6 ADR fondateurs** (`docs/adr/`) : consommateur read-only · import épinglé versionné · sidecar propriété du catalogue · propagation gardée par eval gates · feedback par PR humaine · **référentiels qualité (42010/25012/25010/42001 retenus ; 25024/23894/5230 différés ; 27001/12207/15288/26511+/19770 écartés)**.
- **`docs/ARCHITECTURE.md`** : couches, diagramme Mermaid, description d'architecture ISO/IEC/IEEE 42010 (parties prenantes / préoccupations / points de vue), modèle de propagation Dependabot-like.
- **Base projet GitHub** : `README.md`, ce `CHANGELOG.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `.gitignore`, gabarit de PR.
- **Licence MIT** (`LICENSE`) © 2026 Guy HUIBONHOA.

### Notes
- Aucun code à ce stade. `claude-agents` (catalogue SSOT) reste **intact** ; ce repo n'a aucun droit d'écriture dessus.

---

[Unreleased]: https://github.com/guyhui01/claude-agentic-runtime/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/guyhui01/claude-agentic-runtime/releases/tag/v0.2.0
