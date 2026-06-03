# Changelog — claude-agentic-runtime

> Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versionnement [SemVer](https://semver.org/lang/fr/).
> Convention : chaque entrée indique le **modèle Claude** utilisé.

---

## [Unreleased] — Brique 0 (Loader) — en cours
> Modèle : Claude Opus 4.8

### Added
- **Dépendances verrouillées** : `package-lock.json` généré au premier `npm install` (52 paquets). vitest maintenu en `^2.1` (montée vitest 4 reportée en chantier dédié ; faille esbuild côté serveur de dev non exposée).
- **`schema/sidecar.schema.json`** (JSON Schema 2020-12) : index machine-lisible du catalogue, encodant de façon **exécutable** 5 des 7 caractéristiques ISO/IEC 25012 retenues (ADR-0006) — complétude, cohérence (`if/then` par type), crédibilité (`source` = `{file, catalogTag}`), actualité (tag épinglé + horodatage), exactitude/accessibilité bien-formées. Conformité portée par `type` (enum formats ouverts) + `$schema` + `additionalProperties:false`. `path`/`source.file` anti-traversal (pas de `/` initial ni `..`).
- **`test/sidecar.schema.test.ts`** : 18 cas valides/invalides (un par caractéristique) couvrant les 5 caractéristiques natives au schéma.
- **`src/sidecar/types.ts`** : miroir TypeScript du sidecar (premier code `src/`).
- **`src/sidecar/integrity.ts`** : les 2 caractéristiques ISO 25012 hors portée d'un JSON Schema, encodées comme fonctions pures réutilisables par le loader — `checkReferentialIntegrity` (exactitude référentielle `dependsOn`→`id`), `checkAccessibility` (joignabilité disque, refus défensif des chemins absolus/`..`) — plus `checkUniqueIds` (unicité globale des `id`) et l'agrégat `checkIntegrity`.
- **`test/sidecar.integrity.test.ts`** + **`test/fixtures/catalog/`** : mini-catalogue factice hermétique (sidecar + 3 fichiers prose) ; 8 cas (nominal + dégradés). Total suite : **26 tests verts**, `typecheck` strict OK.

### Notes
- Choix d'encodage : pas de champ `format` redondant, pas de checksum/score (relèverait d'ISO 25024, **différé** par ADR-0006), validation par `pattern` plutôt que `format` → aucune dépendance `ajv-formats` ajoutée.
- Le sidecar de production n'est pas dans ce repo (ADR-0003) : il est importé épinglé depuis `claude-agents` ; `checkAccessibility` résout les chemins relativement à un `catalogRoot` injecté (jamais hardcodé).

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
- Aucun code à ce stade. Prochaine étape : plan détaillé de la **brique 0 (Loader)** à valider avant écriture.
- `claude-agents` (catalogue SSOT) reste **intact** ; ce repo n'a aucun droit d'écriture dessus.
