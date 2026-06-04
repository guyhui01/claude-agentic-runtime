# Next steps — `claude-agentic-runtime`

> Feuille de route d'exécution du POC + planification de l'audit qualité ISO.
> Document vivant (mis à jour à chaque étape). Décisions figées dans [`docs/adr/`](adr/) ; cadrage complet dans [`docs/note_cadrage_poc.md`](note_cadrage_poc.md).
> Modèle en cours : **Claude Opus 4.8**.

---

## 1. État actuel (2026-06-04)

**Brique 0 (Loader) — bouclée.**

| Élément | Fichier | Couverture ISO 25012 |
|---|---|---|
| Schéma sidecar (JSON Schema 2020-12) | `schema/sidecar.schema.json` | 5 caractéristiques natives : complétude, cohérence, crédibilité, actualité, exactitude/accessibilité bien-formées |
| Contrôles d'intégrité | `src/sidecar/integrity.ts` | 2 restantes : exactitude référentielle, accessibilité réelle + unicité des id |
| Loader fail-closed | `src/loader/load-sidecar.ts` | orchestre schéma + intégrité (ADR-0004) |
| Types | `src/sidecar/types.ts` | miroir TypeScript du sidecar |

**Brique 1 (contrats de handoff) — bouclée (2026-06-04, Opus 4.8).**

| Élément | Fichier | Rôle |
|---|---|---|
| Types de contrat | `src/handoff/types.ts` | `StepContract { stepId, input?, output }` + `HandoffIssue` |
| Validateur | `src/handoff/validate-handoff.ts` | `checkContractCompatibility` (statique, shallow) + `validateHandoff` (runtime, fail-closed) ; ajv2020 réutilisé du loader |
| Tests | `test/handoff.test.ts` | 7 cas (compat statique + runtime amont/aval + agrégation) |

**Brique 2 (eval gate) — bouclée (2026-06-04, Opus 4.8).**

| Élément | Fichier | Rôle |
|---|---|---|
| Types | `src/eval/types.ts` | `Criterion` (déterministe, `blocking`/`advisory`) + `GateReport` (preuve d'audit) |
| Gate | `src/eval/eval-gate.ts` | `runEvalGate` (évalue, ne lève jamais) + `assertGatePassed` (applique, fail-closed) |
| Tests | `test/eval-gate.test.ts` | 6 cas (DoD cadrage WF-001 : pass · advisory non bloquant · fail bloquant · check défensif · fail-closed) |

**§2.4-A (adaptateur catalogue → SDK) — bouclé (2026-06-04, Opus 4.8).**

| Élément | Fichier | Rôle |
|---|---|---|
| Adaptateur | `src/sdk/to-agent-definition.ts` | `Asset` (+ prose `.md`) → `AgentDefinition` du SDK ; lecture seule (ADR-0001), défauts read-only + overrides (data gap §2.1) |
| Tests | `test/sdk-adapter.test.ts` | 5 cas (mapping prose→prompt · défauts · overrides · refus non-agent · anti-traversal) |

Package vérifié : **`@anthropic-ai/claude-agent-sdk`** (^0.3.162 ; type `AgentDefinition`, `query({prompt, options})`).

**§2.4-B.1 (orchestrateur de spine, hors-ligne) — bouclé (2026-06-04, Opus 4.8).** `src/orchestrator/{types,run-spine}.ts` : `runSpine` + `StepRunner` injectable, pré-vol statique + eval gate + handoff fail-closed + provenance/`GateReport` tracés (cf. §2.4-B ci-dessous).

**Total : 57 tests verts, `typecheck` strict OK.** Source des contrats/critères/définitions = fixtures pour l'instant (câblage à la vraie source repoussé — YAGNI, brique 0 non touchée). Choix eval gate : critères **déterministes**, pas de LLM-as-judge (reproductible/auditable ; juge-LLM = extension ultérieure si besoin).

---

## 2. Feuille de route (par priorité)

### 2.1 — Brique 1 : contrats de handoff typés ✅ *(cœur de valeur — FAIT 2026-06-04)*
- ✅ I/O schématisé (JSON Schema) validé entre étapes, en réutilisant le pattern ajv du loader.
- ✅ Deux niveaux ADR-0004 : compatibilité **statique** amont↔aval + validation **runtime** fail-closed du payload.
- ▶️ **Reste à câbler** (à l'intégration SDK §2.4) : la **source réelle** des schémas de contrat (sidecar étendu vs manifeste) — aujourd'hui en fixtures.

### 2.2 — Brique 2 : un eval gate ✅ *(FAIT 2026-06-04)*
- ✅ Garde-fou qualité déterministe sur la sortie d'une étape (DoD du cadrage WF-001 en fixture).
- ✅ Fail-closed (`assertGatePassed`), évaluation traçable séparée (`runEvalGate` produit la preuve même en succès) — cohérent ADR-0004 + posture ISO 19011.
- ▶️ **Reste à câbler** (intégration SDK §2.4) : les critères réels par étape, sourcés depuis le catalogue (cf. §2.1, même décision de source).

### 2.3 — Générateur de sidecar *(hors ce repo)*
- **Conformité ADR-0003** : le générateur appartient à **`claude-agents`** (généré + validé en CI côté catalogue). Le runtime ne fait que **lire**.
- À planifier comme chantier `claude-agents` quand on voudra produire un vrai sidecar à partir de la prose. Le schéma de ce repo sert de contrat de référence.

### 2.4 — Intégration Claude Agent SDK *(exécution de la spine)*
- ✅ **§2.4-A FAIT (2026-06-04)** : package vérifié (`@anthropic-ai/claude-agent-sdk`, cf. [[feedback-verification-factuelle]]) + adaptateur `Asset → AgentDefinition` (lecture seule, testé, sans réseau).
- ✅ **§2.4-B.1 — orchestrateur + runner injectable (HORS-LIGNE, FAIT 2026-06-04, Opus 4.8)** : `src/orchestrator/{types,run-spine}.ts`. `runSpine` déroule WF-001→002→003 en branchant un **runner injectable** (abstraction de `query()`, mocké), l'**eval gate** (brique 2, fail-closed) et les **contrats de handoff** (brique 1, fail-closed) ; **pré-vol statique** des contrats adjacents avant exécution ; orchestrateur **pur** (zéro disque/réseau) ; **provenance** (`assetId`/`catalogTag`) + **`GateReport`** consignés dans une trace conservée même en échec. 6 tests hermétiques → **57 tests verts**, `typecheck` strict OK. Source des contrats/critères encore en fixtures.
- ▶️ **§2.4-B.2 — source des contrats/critères (À TRANCHER, hors-ligne)** : aujourd'hui en fixtures. Choix d'architecture à arbitrer — **étendre le sidecar** (porté par le catalogue, généré/validé en CI côté `claude-agents`, ADR-0003) **vs manifeste de spine dédié** au runtime. Décision à présenter avec reco + ADR avant implémentation.
- ▶️ **§2.4-B.3 — run live de la spine (À FAIRE, sous condition)** : remplacer le runner mock par un adaptateur enveloppant `query()` et dérouler WF-001→002→003 pour de vrai.
  - **Prérequis auth (règle budget)** : **OAuth abonnement Pro/Max uniquement** (`claude` login) — **NE PAS** définir `ANTHROPIC_API_KEY` (clé métrée = facturation au token + priorité sur l'OAuth → risque de dépassement). À la limite de quota : échec *fail-closed*, pas de bascule payante. Vérifié 2026-06-04 : variable absente aux 3 scopes (règle déjà tenue). Voir memory `feedback-budget-quota-abonnement`.
  - **Garde par run** : `maxBudgetUsd` bas + `maxTurns` faible + `permissionMode: "plan"` (read-only). À lancer **sur accord explicite Guy + run observé**.
  - C'est ce run de bout en bout qui **atteint le déclencheur d'audit ISO §3.4** (« quand la spine s'exécute »).

### 2.5 — Pipeline CI
- Validation schémas + eval gate + **PR de bump** du catalogue épinglé (note §9, livrable 6 ; pattern Dependabot/Renovate, ADR-0002).

### 2.6 — Dette technique connue
- **Montée `vitest` 2 → 4** (chantier dédié). Faille `esbuild` du serveur de dev **non exposée** ; aucune urgence, mais à tracer.
- **`npm audit` après ajout du SDK** : 5 vulnérabilités (4 modérées, 1 critique) dans les deps transitives de `@anthropic-ai/claude-agent-sdk`. Pas de `audit fix --force` (casse). À réévaluer aux montées de version du SDK ; sans impact sur l'adaptateur (type-only) ni les tests.

---

## 3. Planification de l'audit qualité ISO

> ⚠️ **Pas une certification.** Conformément à [ADR-0006](adr/0006-referentiels-qualite.md), les normes ISO sont un **cadre méthodologique**, pas un objectif de certification (ROI nul en solo). Cet audit est une **auto-évaluation interne (gap analysis)**. La certification reste hors périmètre, **réévaluable si une mission client l'exige**.

### 3.1 — Objet
Mesurer, preuve à l'appui, l'écart entre l'état du repo et les **4 référentiels retenus** (ADR-0006) : data, structure, architecture, gouvernance.

### 3.2 — Périmètre (les 4 référentiels retenus)
| Axe | Norme | Ce qui est audité |
|---|---|---|
| **Données** | ISO/IEC 25012:2008 | Le sidecar encode-t-il réellement les **7 caractéristiques** annoncées ? (5 schéma + 2 intégrité). Recalcul/contrôle, pas de déclaratif. |
| **Architecture** | ISO/IEC/IEEE 42010:2022 | `ARCHITECTURE.md` + ADR : parties prenantes / préoccupations / points de vue complets et cohérents. |
| **Logiciel / runtime** | ISO/IEC 25010 | Fiabilité (fail-closed), maintenabilité (tests, types stricts), sécurité (anti-traversal, read-only). |
| **Gouvernance IA** | ISO/IEC 42001:2023 | Principes, risques, cycle de vie ; cohérence des invariants (read-only, propagation gardée). |

### 3.3 — Méthode
- Grille **un critère → une preuve → un verdict** (Conforme / Partiel / Non couvert) → recommandation.
- Posture d'audit alignée **ISO 19011** (objectivité, preuves factuelles, indépendance) — cohérent avec [[feedback-projet-avant-validation-sociale]] et [[feedback-verification-factuelle]] : **oser le verdict défavorable** si la preuve l'impose.
- Vérifier les **structures différées** (ISO 25024 métriques, 23894 risque IA, 5230 licences) : toujours hors périmètre, ou déclencheur atteint ?

### 3.4 — Déclenchement *(condition, pas date fixe — POC solo)*
Clause de révision ADR-0006 : audit déclenché à un **jalon majeur**, c'est-à-dire :
- **Fin de POC** : après la livraison de la **brique 2** (eval gate), quand la spine WF-001→003 s'exécute ;
- **ET avant toute industrialisation** (passage du statut « asset portfolio » à « produit de mission »).

### 3.5 — Livrable
- `docs/audit/audit_qualite_iso_v1.md` : rapport daté, modèle Claude indiqué, verdict par axe + plan de remédiation priorisé.

---

> Document élaboré avec **Claude Opus 4.8** (2026-06-03).
