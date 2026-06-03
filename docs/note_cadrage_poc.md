# Note de cadrage — POC `claude-agentic-runtime`

> Statut : **brouillon à valider (Guy)** · Date : 2026-06-03 · Auteur : Guy HUIBONHOA (assisté Claude Opus 4.8)
> Document fondateur du repo. Aucune ligne de code n'est écrite avant validation de cette note.

---

## 1. Objectif & nature du projet

Construire un **runtime agentique exécutable** qui consomme le catalogue déclaratif `claude-agents` (rôles, skills, workflows) comme **source de vérité unique**, et l'exécute via le **Claude Agent SDK**.

- **Finalité retenue : asset de portfolio** (démonstrateur de maturité d'architecture agentique d'entreprise orientée delivery). Pas un produit de mission à ce stade.
- **Critère de poursuite** : si le POC prouve sa valeur « en mission 6 mois », industrialisation ; sinon, il reste un showcase soigné et on s'arrête là (règle anti-usine-à-gaz, 80/20).

## 2. Positionnement dans l'écosystème de repos

| Repo | Rôle | Mutabilité depuis le runtime |
|---|---|---|
| `claude-agents` | **SSOT** : catalogue déclaratif pur, audité (grille v2.8) | **Lecture seule** |
| **`claude-agentic-runtime`** (ce repo) | Consommateur : exécution, eval, état de run | Écrit uniquement **ses propres** stores |
| `claude-projects` | Projets clients (existant, séparé) | Hors périmètre |

**Direction de dépendance unique** : `runtime → lit → catalogue`. Jamais l'inverse.

## 3. Invariants d'architecture (non négociables)

1. **Consommateur read-only** : le runtime n'a aucun droit d'écriture sur `claude-agents` (token CI *read-only*, repos séparés).
2. **Import versionné & épinglé** : dépendance sur **tag exact** (ex. `claude-agents@v3.25.0`), jamais une plage `^`/`~`. La propagation est un **bump explicite tracé** (commit + CHANGELOG runtime).
3. **Sidecar propriété du catalogue** : le manifeste machine-lisible (index JSON/YAML) est **généré et validé en CI dans `claude-agents`** ; le runtime ne fait que le lire. Le corps prose du catalogue reste intact et auditable.
4. **Propagation gardée** : tout bump de version passe par validation de contrats + eval gates (cf. §6) ; *fail-closed* si rouge.
5. **Feedback par PR humaine** : un signal du runtime (eval, trust) qui suggère d'améliorer le catalogue remonte **via une PR humaine normale** (revue + CHANGELOG), **jamais** par write-back automatique.

> Ces 5 invariants sont formalisés en **ADR** dans `docs/adr/` (voir §8).

## 4. Périmètre du POC

### Dans le périmètre — la *spine delivery*
Exécuter de bout en bout la colonne : **`WF-001 cadrage` → `WF-002 delivery SAFe` → `WF-003 lancement app`**, en consommant les agents/skills du catalogue.

### Les 3 briques à construire (le reste est porté par le SDK)
| # | Brique | Valeur |
|---|---|---|
| **0** | **Loader** catalogue → définitions SDK (lecture du sidecar) + contrat de lisibilité | Fondation : rend le catalogue exécutable |
| **1** | **Contrats de handoff typés** (I/O schématisé entre étapes de workflow) | Cœur de valeur — le SDK ne le fournit pas |
| **2** | **1 eval gate** branché sur une sortie d'agent (ex. conformité du livrable de cadrage) | Garde-fou de qualité runtime |

### Hors périmètre POC
- **État/mémoire partagée** et **routeur d'orchestration** → **fournis par le Claude Agent SDK** (à configurer, pas à bâtir).
- **Enrichissement du catalogue MCP** → post-POC (Jira/Confluence existants ou stubs suffisent).
- Eval suite complète, multi-spines, UI → post-POC.

## 5. Stack

- **Substrat d'exécution** : Claude Agent SDK (sub-agents, routing d'outils, état, MCP) — **on ne réécrit pas de moteur**.
- **Modèle** : Opus 4.8 (raisonnement/orchestration), Sonnet 4.6 (étapes haut volume) — tiers à arbitrer par étape.
- **Validation** : JSON Schema (contrats + sidecar), exécutée en CI.

## 6. Modèle de propagation (pattern Dependabot/Renovate)

| Étape | Acteur | Auto ? |
|---|---|---|
| Détecter une nouvelle version du catalogue | CI / bot | ✅ |
| Lancer validation de contrats + eval gates | CI | ✅ (preuve) |
| Ouvrir une **PR de bump** si vert / la bloquer si rouge | CI / bot | ✅ |
| **Merger la PR** (adopter la version) | **Humain (Guy)** | ❌ décision |

→ L'automatisation **vérifie** (preuve), l'humain **décide** (merge). Aucun write-back automatique. *(Pas d'« agent de propagation » dédié au POC : un workflow CI + merge humain suffit — re-packageable en agent plus tard si valeur démontrée.)*

### Garde-fou contrat I/O — formulation exacte
> Défense en profondeur : **validation statique de contrat** + **eval gates comportementaux** + **épinglage**. Garantit qu'**aucune rupture de contrat _non détectée_ ne peut se propager** (la PR de bump échoue en CI = *fail-closed*).
>
> ⚠️ **N'équivaut pas à « aucune régression possible »** : un test ne couvre que ce qu'il teste ; une régression sémantique à l'intérieur d'un contrat valide peut subsister. Promettre l'infaillibilité serait un faux signal.

## 7. Best practices & recommandations retenues

- **Formats ouverts** comme identité native : `AGENTS.md` (guidance repo), Agent Skills, MCP `server.json` — ne pas inventer un format propriétaire.
- **Front-matter `AGENTS.md`** : rappel — la spec **1.0 n'en définit pas** ; l'ajout (`description`/`tags`) est une **proposition 1.1 non mergée** (mai 2026). Tout fichier doit rester lisible **si le bloc YAML est retiré** → ne pas en dépendre pour la portabilité.
- **Registry / SSOT** : le catalogue est le registre autoritaire ; toute la gouvernance en dépend.
- **Validation CI à chaque PR** : JSON Schema, unicité des identifiants, accessibilité des URLs, scan sécurité.
- **Gouvernance documentée par ADR** (Architecture Decision Records) — un fichier court par décision, daté, dans `docs/adr/` ; signal de maturité pour un livrable portfolio. **Pas de gros `BESTPRACTICES.md` monolithique** (anti-usine-à-gaz).
- **SemVer + CHANGELOG** côté runtime, comme pour le catalogue.
- **Anonymisation** : héritée du catalogue ; aucun client réel dans le runtime non plus.

## 8. ADR à créer (1 page chacun, `docs/adr/`)

- `ADR-001` — Consommateur read-only du catalogue
- `ADR-002` — Import épinglé versionné (tag exact, bump explicite)
- `ADR-003` — Sidecar propriété du catalogue (généré + validé en CI côté `claude-agents`)
- `ADR-004` — Propagation gardée par eval gates + validation de contrats
- `ADR-005` — Feedback runtime → catalogue uniquement par PR humaine

## 9. Livrables du POC

1. `loader/` — lecture du sidecar catalogue → définitions Agent SDK.
2. `contracts/` — schémas I/O typés des étapes WF-001→003 (JSON Schema).
3. `gates/` — 1 eval gate opérationnel sur une sortie d'agent.
4. Exécution démontrée de la spine WF-001→003 + trace de run.
5. `docs/adr/` (5 ADR) + `README.md` + `ARCHITECTURE.md` + `CHANGELOG.md`.
6. Pipeline CI : validation schémas + eval gate + PR de bump catalogue.

## 10. Critère de succès (POC)

- La spine **WF-001→003 s'exécute** en consommant le catalogue épinglé, sans aucune écriture vers `claude-agents`.
- Un **changement de contrat I/O** simulé dans une nouvelle version du catalogue **fait échouer la PR de bump** en CI (preuve du *fail-closed*).
- La gouvernance (read-only, sidecar, ADR) est **lisible et défendable** par un évaluateur technique externe.

## 11. Risques & garde-fous

| Risque | Garde-fou |
|---|---|
| **Usine à gaz** (sur-ingénierie) | Périmètre 3 briques ; SDK pour le reste ; critère « mission 6 mois » |
| **ROI faible** (curiosité technique) | Finalité portfolio assumée ; arrêt après POC si valeur non prouvée |
| **Dérive catalogue/runtime** | SSOT unique + read-only + import épinglé |
| **Surclaim de fiabilité** | Formulation honnête du garde-fou (§6) |

## 12. Prochaine étape

Sur validation de cette note : rédiger les **5 ADR** + le `README.md` du repo, **puis seulement** démarrer la brique 0 (loader). Plan détaillé de la brique 0 à valider avant écriture de code.
