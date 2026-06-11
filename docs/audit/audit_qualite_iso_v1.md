# Audit qualité ISO — `claude-agentic-runtime` (v1)

- **Date** : 2026-06-11
- **Modèle Claude** : Claude Opus 4.8
- **Auditeur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Nature** : auto-évaluation interne (*gap analysis*), **PAS une certification** (cf. [ADR-0006](../adr/0006-referentiels-qualite.md), ROI de certification nul en solo).
- **Posture** : ISO 19011 — objectivité, preuves **factuelles** (citation `fichier:ligne`, sorties de tests, run live réel), indépendance. **Verdict défavorable assumé si la preuve l'impose.**
- **Déclencheur** ([ADR-0006](../adr/0006-referentiels-qualite.md) §révision, [NEXT_STEPS](../NEXT_STEPS.md) §3.4) : run live WF-001 « plein pot » abouti le 2026-06-09 (la spine s'exécute) → condition d'audit **atteinte**, avant toute industrialisation.

---

## 0. Synthèse exécutive

| Axe | Norme | Verdict | Réserve principale |
|---|---|---|---|
| **Données** | ISO/IEC 25012:2008 | 🟡 **Conforme avec réserve** | Les 7 caractéristiques sont réellement encodées et exécutables, mais la **décomposition documentée « 5 schéma + 2 intégrité » est inexacte** (conformité omise ; exactitude/accessibilité réparties). |
| **Architecture** | ISO/IEC/IEEE 42010:2022 | 🟡 **Conforme avec réserve** | Parties prenantes / préoccupations / points de vue complets, mais un point de vue cite une **nomenclature obsolète** (« spine WF-001→003 »). |
| **Logiciel / runtime** | ISO/IEC 25010 | 🟢 **Conforme** | Fiabilité (fail-closed), maintenabilité (types stricts, 111 tests), sécurité (anti-traversal, read-only, garde clé) avérées. Note d'observabilité (run live capturé en `/tmp`, non versionné). |
| **Gouvernance IA** | ISO/IEC 42001:2023 | 🟢 **Conforme** | Invariants tracés (ADR-0001/0004/0005), honnêteté des garanties explicite. Analyse de risque IA seulement implicite (cf. ISO 23894 différée). |

**Verdict global** : socle **solide et défendable**. Aucune non-conformité majeure. Les réserves sont **documentaires/factuelles** (cohérence des énoncés), pas des défauts de conception. Le plan de remédiation (§7) est à dominante « correction de wording » + 2 déclencheurs de normes différées à acter.

---

## 1. Corpus de preuves (reproductible)

| Preuve | Source | Constat au 2026-06-11 |
|---|---|---|
| Suite de tests | `npx vitest run` | **111 passés, 2 skippés** (run live gardés `LIVE_RUN=1`), 16 fichiers |
| Typage strict | `npm run typecheck` (`tsc --noEmit`) | **OK**, zéro erreur |
| Vulnérabilités | `npm audit` | **0 vulnérabilité** |
| Run live WF-001 | CHANGELOG [Unreleased] + [NEXT_STEPS §2.4-B.3](../NEXT_STEPS.md) | `completed` « plein pot » 2026-06-09 — **0 critère en échec** (blocking + advisory), 3 agents en live, OAuth abonnement |
| Garde clé API (env) | `echo $ANTHROPIC_API_KEY` | **non définie** (règle budget structurellement tenue) |
| Propreté dépôt | `git ls-files \| grep DS_Store` | aucun `.DS_Store` suivi ; `.gitignore:34` le couvre |
| Licence | `LICENSE`, `package.json:6`, `README.md:66` | **MIT** © 2026 Guy HUI-BON-HOA |

---

## 2. Axe Données — ISO/IEC 25012:2008

**Question d'audit** ([NEXT_STEPS §3.2](../NEXT_STEPS.md)) : le sidecar encode-t-il *réellement* les 7 caractéristiques annoncées ? Recalcul, pas de déclaratif.

### 2.1 Recensement effectif des caractéristiques encodées

| # | Caractéristique ISO 25012 | Encodage réel | Preuve |
|---|---|---|---|
| 1 | **Complétude** | Schéma : `assets` `minItems: 1` | `schema/sidecar.schema.json` (`assets`) |
| 2 | **Cohérence** | Schéma : arêtes `dependsOn` + `if/then` par `type` | idem (`$defs/asset` `allOf`) |
| 3 | **Crédibilité** | Schéma : `source = {file, catalogTag}` (provenance) | idem (`source`) |
| 4 | **Actualité** | Schéma : `catalogTag` épinglé + `generatedAt` (ISO 8601) | idem (`generatedAt`, `catalog.version`) |
| 5 | **Conformité** | Schéma : `type` enum `agent\|skill\|workflow` | idem (`type`, annoté « ISO 25012 : conformité ») |
| 6 | **Exactitude** | Schéma : `id` bien-formé (pattern) **+ intégrité** : unicité (`checkUniqueIds`) + référentielle (`checkReferentialIntegrity`) | `src/sidecar/integrity.ts:23,38` |
| 7 | **Accessibilité** | Schéma : `path`/`source.file` anti-traversal (pattern) **+ intégrité** : joignabilité réelle (`checkAccessibility`) | `src/sidecar/integrity.ts:61` |

**Couverture par les tests** : `test/sidecar.schema.test.ts` (18 cas) + `test/sidecar.integrity.test.ts` (8 cas) → la qualité des données est **exécutable**, pas déclarative. ✅ Point fort réel et différenciant.

### 2.2 Critère → preuve → verdict

| Critère | Preuve | Verdict |
|---|---|---|
| Les 7 caractéristiques retenues (ADR-0006) sont encodées | Tableau §2.1 : 7/7 présentes, dont 5 pleinement au schéma + 2 (exactitude, accessibilité) réparties schéma↔intégrité | **Conforme** |
| L'encodage est exécutable (non déclaratif) | 26 tests verts (schéma 18 + intégrité 8), fail-closed au chargement (`src/loader/load-sidecar.ts`) | **Conforme** |
| La **décomposition documentée** est exacte | ❌ **Écart** : la formule « **5 schéma + 2 intégrité** » (CHANGELOG [0.2.0], [NEXT_STEPS §1 l.15](../NEXT_STEPS.md), `$id` du schéma) **omet `conformité`** de l'énumération des « 5 », et compte `exactitude`/`accessibilité` comme purement « intégrité » alors qu'elles sont **bien-formées dès le schéma**. Le **total de 7 tient**, la **ventilation non**. | **Partiel** |

> **Constat ISO 19011 (verdict nuancé assumé)** : la substance est conforme (7 caractéristiques réellement encodées et testées), mais l'**énoncé** qui la décrit est inexact. Un évaluateur externe qui recompte trouvera 5 caractéristiques pleinement au schéma (dont `conformité`, non listée) + 2 réparties — pas « 5+2 » disjoints. À corriger pour que la documentation dise la vérité du code (cf. P1).

---

## 3. Axe Architecture — ISO/IEC/IEEE 42010:2022

**Question d'audit** : parties prenantes / préoccupations / points de vue complets et cohérents.

| Critère 42010 | Preuve | Verdict |
|---|---|---|
| Parties prenantes identifiées | `ARCHITECTURE.md:54-60` — 4 PP (owner, catalogue, évaluateur externe, exécution SDK) avec préoccupation principale | **Conforme** |
| Préoccupations rattachées | idem | **Conforme** |
| Points de vue (viewpoints) → vues | `ARCHITECTURE.md:62-68` — 4 points de vue (Dépendance, Données, Exécution, Gouvernance), chacun rattaché à une vue/ADR | **Conforme** |
| Décisions tracées (correspondance ADR) | 7 ADR (`docs/adr/0001`→`0007`), invariants listés `ARCHITECTURE.md:42-48` | **Conforme** |
| **Cohérence** des énoncés | ❌ **Écart mineur** : le point de vue « Exécution » (`ARCHITECTURE.md:67`) parle d'« Orchestration de la spine **WF-001→003** » — **nomenclature placeholder obsolète**. [NEXT_STEPS §2.4-B.3 l.74](../NEXT_STEPS.md) précise explicitement que l'unité réellement exécutable est le **backbone d'UN workflow** (ex. WF-001), pas une macro-chaîne WF-001→003. | **Partiel** |

> **Verdict axe : Conforme avec réserve.** La description d'architecture est structurée conformément au standard. Le seul écart est une **incohérence interne** entre `ARCHITECTURE.md` (terme historique) et `NEXT_STEPS.md` (clarification ultérieure) → à aligner (P2).

---

## 4. Axe Logiciel / runtime — ISO/IEC 25010

**Questions d'audit** : fiabilité (fail-closed), maintenabilité (tests, types stricts), sécurité (anti-traversal, read-only, garde clé API).

### 4.1 Fiabilité

| Critère | Preuve | Verdict |
|---|---|---|
| Chargement fail-closed | `src/loader/load-sidecar.ts` (parse→schéma→intégrité, court-circuit, `SidecarValidationError` agrégée) | **Conforme** |
| Handoff fail-closed | `src/handoff/validate-handoff.ts` (`validateHandoff` lève si non conforme amont/aval) | **Conforme** |
| Eval gate fail-closed | `src/eval/eval-gate.ts` (`assertGatePassed`) ; `runEvalGate` produit la preuve même en succès | **Conforme** |
| Run live échoue **proprement** | Run du 2026-06-09 : 1ᵉʳ run `failed` fail-closed à STEP-03 (écart de contrat, **résultat valide tracé**) avant correctif | **Conforme** (la défaillance est *contrôlée*) |

### 4.2 Maintenabilité

| Critère | Preuve | Verdict |
|---|---|---|
| Typage strict | `npm run typecheck` OK (zéro erreur) | **Conforme** |
| Couverture par tests | 111 tests verts / 16 fichiers ; tests **hermétiques** (`query` injectable → zéro réseau) | **Conforme** |
| DRY / factorisation | `src/spines/spine-helpers.ts` partagé par les 3 spines (WF-001 refactoré sans changement de comportement) | **Conforme** |
| Dette technique | §2.6 soldée : `vitest` 2→4, `npm audit` 5→0 | **Conforme** |

### 4.3 Sécurité

| Critère | Preuve | Verdict |
|---|---|---|
| Anti-traversal | Schéma : `path`/`source.file` pattern `^(?!/)(?!.*\.\.).+$` **+** double garde `src/sidecar/integrity.ts:61-72` (refus absolus / `..`) | **Conforme** |
| Read-only forcé | `src/sdk/query-runner.ts:159` — `permissionMode: "plan"` forcé, non surchargeable (ADR-0001) | **Conforme** |
| Garde clé API métrée | `src/sdk/query-runner.ts:137` — refus AVANT tout appel si `ANTHROPIC_API_KEY` défini (OAuth abonnement uniquement) | **Conforme** |
| Caps durs par run | `src/sdk/query-runner.ts:152-157` — `maxTurns`/`maxBudgetUsd` plafonnés même si l'agent demande plus | **Conforme** |
| Surface de vulnérabilités | `npm audit` = 0 ; posture Dependabot + correctifs auto ON | **Conforme** |

> **Note d'observabilité (non bloquante)** : le résultat structuré du run live est capturé via `LIVE_RESULT_FILE` (défaut `/tmp/wf-001-live-result.json`, `test/wf-001-run-live.test.ts`) — **éphémère, non versionné**. La preuve d'exécution « plein pot » subsiste seulement en **prose** (CHANGELOG / NEXT_STEPS). Acceptable pour un POC, mais la traçabilité d'audit gagnerait à versionner une trace anonymisée (P3).

> **Verdict axe : Conforme.** Fiabilité, maintenabilité et sécurité étayées par des preuves factuelles convergentes.

---

## 5. Axe Gouvernance IA — ISO/IEC 42001:2023

**Questions d'audit** : principes, risques, cycle de vie ; cohérence des invariants (read-only ADR-0001, propagation gardée ADR-0004).

| Critère 42001 | Preuve | Verdict |
|---|---|---|
| Principes de gouvernance explicites | 7 ADR ; invariants `ARCHITECTURE.md:42-48` (read-only, épinglage, sidecar SSOT, propagation gardée, feedback PR humaine) | **Conforme** |
| Invariant read-only | ADR-0001 + `permissionMode:"plan"` forcé (`query-runner.ts:159`) + adaptateur lecture seule | **Conforme** |
| Propagation **gardée** (contrôle de risque) | ADR-0004 (validation contrats + eval gates en CI, *fail-closed*, merge humain) | **Conforme** |
| Feedback sans write-back automatique | ADR-0005 (PR humaine uniquement) | **Conforme** |
| **Honnêteté des garanties** (anti-faux-signal) | ADR-0004 §« Limite explicite », ADR-0007 §« Limite explicite » : les limites sont écrites, pas dissimulées | **Conforme** (exemplaire) |
| Cycle de vie maîtrisé | ADR-0002 (bump explicite tracé) + CI (§2.5) + CHANGELOG/NEXT_STEPS docs-as-code | **Conforme** |
| Gestion de risque IA **formalisée** | Eval gates = contrôle de risque *de facto* (le run live a matérialisé puis traité un risque réel : divergence de contrat). Pas de **registre de risques** formel → relève d'ISO 23894 **différée** (§6) | **Conforme** au périmètre 42001 ; risque formel → cf. P5 |

> **Verdict axe : Conforme.** Les invariants de gouvernance sont cohérents, tracés et **réellement appliqués dans le code** (pas seulement déclarés). La posture d'honnêteté (limites explicites) est un point fort aligné ISO 19011.

---

## 6. Normes différées — révision du statut ([NEXT_STEPS §3.3](../NEXT_STEPS.md))

| Norme différée | Déclencheur ([ADR-0006](../adr/0006-referentiels-qualite.md)) | Statut au 2026-06-11 | Décision |
|---|---|---|---|
| **ISO/IEC 25024:2015** (métriques qualité données) | « quand on veut des métriques **chiffrées** » | Le run live a produit des **comptages de facto** (13 US, 5 épics, 7 scénarios) mais **aucun système de métriques** formel | **Reste différée** — réévaluable si reporting qualité catalogue souhaité |
| **ISO/IEC 23894:2023** (AI risk management) | « quand les eval gates évoluent vers une **gestion de risque formalisée** » | Gates déterministes en place ; un risque réel **matérialisé puis traité** au run live, mais **pas de registre de risques** | **Déclencheur en approche** — recommandé si industrialisation (P5) |
| **ISO/IEC 5230 (OpenChain)** (conformité licences) | « au moment de **fixer la licence** » | ⚠️ **Déclencheur ATTEINT** : licence **fixée à MIT** (`LICENSE`, `package.json:6`, `README.md:66`) — l'« à définir » d'ADR-0006 est résolu | **À activer (P4)** : contrôle de compatibilité des licences des dépendances avec MIT |

---

## 7. Plan de remédiation priorisé

| # | Priorité | Action | Cible | Effort | Impact |
|---|---|---|---|---|---|
| **P1** | 🔴 Haute | Corriger la **décomposition ISO 25012** : énoncer les **7 caractéristiques** avec leur lieu d'encodage exact (5 pleinement au schéma — dont `conformité` — + `exactitude`/`accessibilité` réparties schéma↔intégrité). Remplacer la formule trompeuse « 5 schéma + 2 intégrité ». | `schema/sidecar.schema.json` (`$id` desc), `CHANGELOG.md` [0.2.0], `NEXT_STEPS.md` §1 l.15 | Faible | Crédibilité / honnêteté de la doc (axe Données → Conforme) |
| **P2** | 🟠 Moyenne | Aligner le **point de vue « Exécution »** sur la nomenclature réelle : « backbone d'un workflow » au lieu de « spine WF-001→003 ». | `ARCHITECTURE.md:67` | Faible | Cohérence inter-docs (axe Architecture → Conforme) |
| **P3** | 🟡 Basse | **Versionner une trace** du run live « plein pot » (résultat structuré anonymisé) comme artefact d'audit, au lieu du `/tmp` éphémère. | nouveau `docs/audit/` ou fixture | Faible | Traçabilité d'audit (observabilité) |
| **P4** | 🟠 Moyenne | **ISO 5230 déclenché** : vérifier la compatibilité des licences des dépendances (`@anthropic-ai/claude-agent-sdk`, `ajv`, `vitest`…) avec MIT ; consigner le résultat. | nouveau contrôle / note | Faible | Conformité licences (norme différée activée) |
| **P5** | 🟡 Basse (si industrialisation) | **ISO 23894** : registre de risques IA léger (le run live a déjà fourni un cas réel : divergence de contrat → resserrement de schéma). | `docs/` | Moyen | Gestion de risque formalisée (au passage produit→mission) |

> **Aucune action ne touche le code de production** (cohérent avec la contrainte d'audit : lecture/analyse seule). P1/P2 sont des corrections documentaires ; P3/P4/P5 sont des ajouts de traçabilité/gouvernance.

---

## 8. Conclusion

Le POC `claude-agentic-runtime` présente une **qualité réelle et défendable** sur les 4 axes retenus. La thèse — *vrais agents + vrai catalogue + handoffs/gates déterministes → workflow qui aboutit en live, qualité contrôlée, read-only, capé* — est **empiriquement validée** par le run live « plein pot » du 2026-06-09.

Les écarts relevés sont **honnêtes et circonscrits** : ils concernent la **précision des énoncés documentaires** (P1, P2) et l'**activation de deux normes différées** dont les déclencheurs sont désormais atteints ou proches (P4 licences, P5 risque), **non la conception**. Aucun faux signal de qualité n'a été détecté ; au contraire, la documentation expose ses propres limites (ADR-0004/0007).

**Avant industrialisation** (passage « asset portfolio » → « produit de mission »), traiter P1, P2 et P4 est recommandé ; P3 et P5 deviennent prioritaires si une mission client l'exige.

---

> Rapport élaboré avec **Claude Opus 4.8** (2026-06-11). Posture d'audit ISO 19011 — preuves factuelles, indépendance, verdict nuancé assumé.
