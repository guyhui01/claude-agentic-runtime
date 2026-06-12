# claude-agentic-runtime

[![License: BUSL 1.1](https://img.shields.io/badge/license-BUSL--1.1-blue.svg)](LICENSE)

> **Compilateur de gouvernance** au-dessus du **Claude Agent SDK** : lit le catalogue déclaratif [`claude-agents`](https://github.com/guyhui01/claude-agents), **valide ses contrats**, puis l'exécute via le SDK — qui porte le moteur.
> **Statut : POC exécutable / asset de portfolio** — `v0.3.0` : backbone WF-001 **exécuté en live de bout en bout** (vrais agents + vrai catalogue, toutes gates *blocking* et *advisory* vertes), CI verte, **111 tests** · audit qualité ISO v1 livré. Spines WF-002/003 modélisées et testées (run live en attente de leur indexation au sidecar — repo `claude-agents`).

## Pourquoi ce repo

[`claude-agents`](https://github.com/guyhui01/claude-agents) est une **bibliothèque agentique organisationnelle** : 38 rôles (agents), leurs skills et des workflows de delivery, en Markdown audité (grille qualité v2.8). C'est la **source de vérité unique (SSOT)**.

Ce repo en est le **consommateur exécutable** : il lit le catalogue (en lecture seule, version épinglée), le transforme en agents exécutables et orchestre une *spine* de delivery — sans jamais modifier le catalogue.

### Positionnement : compilateur de gouvernance, pas un moteur

Le moteur d'exécution agentique (agent loop, tools, sandbox, sessions) est **commoditisé** — fourni par le Claude Agent SDK (et, en production, par Claude Managed Agents). La valeur non commoditisée de ce repo est **en amont et à la frontière** : transformer une connaissance **gouvernée et versionnée** en agents exécutables, en **validant les contrats** (handoff typés), en **gardant la qualité** (eval gates) et en **traçant la provenance** — le tout *fail-closed*. C'est une **couche de gouvernance**, pas une réécriture du moteur.

## Séparation des responsabilités

| Repo | Rôle | Écriture depuis ce runtime |
|---|---|---|
| `claude-agents` | Catalogue déclaratif, SSOT auditée | ❌ **Lecture seule** |
| **`claude-agentic-runtime`** | Exécution, eval, état de run | ✅ ses propres stores uniquement |
| `claude-projects` | Projets clients (séparé) | hors périmètre |

## Périmètre du POC

Exécuter la *spine delivery* **WF-001 cadrage → WF-002 delivery SAFe → WF-003 lancement app** en consommant le catalogue.

Trois briques (le reste est porté par le Claude Agent SDK) :
1. ✅ **Loader** — sidecar du catalogue → `Sidecar` typé (fail-closed)
2. ✅ **Contrats de handoff typés** — I/O schématisé entre étapes
3. ✅ **Eval gate** — garde-fou qualité sur une sortie d'agent

Intégration **Claude Agent SDK** : adaptateur `Asset → AgentDefinition` (§2.4-A) **et exécuteur live de la spine** (§2.4-B) **livrés** — `runWf001` déroule le backbone via `query()` (capé, `permissionMode:"plan"`, OAuth abonnement).

## Documentation

- 📋 [Note de cadrage](docs/note_cadrage_poc.md) — objectif, périmètre, invariants, risques
- 🏛️ [Architecture](docs/ARCHITECTURE.md) — couches, diagramme, modèle de propagation
- 🧭 [Décisions d'architecture (ADR)](docs/adr/) :
  - [ADR-0001 — Consommateur read-only du catalogue](docs/adr/0001-consommateur-read-only.md)
  - [ADR-0002 — Import épinglé versionné](docs/adr/0002-import-epingle-versionne.md)
  - [ADR-0003 — Sidecar propriété du catalogue](docs/adr/0003-sidecar-propriete-catalogue.md)
  - [ADR-0004 — Propagation gardée par eval gates](docs/adr/0004-propagation-gardee-eval-gates.md)
  - [ADR-0005 — Feedback par PR humaine](docs/adr/0005-feedback-par-pr-humaine.md)
  - [ADR-0006 — Référentiels qualité (ISO 42010 / 25012 / 25010 / 42001)](docs/adr/0006-referentiels-qualite.md)
  - [ADR-0007 — Contrats & critères : manifeste de spine propriété du runtime](docs/adr/0007-source-contrats-criteres-manifeste-runtime.md)
- 📏 [Contribuer & conventions](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

## État d'avancement

- [x] Note de cadrage validée
- [x] ADR fondateurs (6) + architecture
- [x] Brique 0 — Loader sidecar (fail-closed)
- [x] Brique 1 — Contrats de handoff typés
- [x] Brique 2 — Eval gate
- [x] §2.4-A — Adaptateur catalogue → `AgentDefinition`
- [x] §2.4-B — Exécuteur live du backbone d'un workflow (ex. WF-001) (+ provenance)
- [x] Run live WF-001 de bout en bout (gates *blocking* + *advisory* vertes) + audit qualité ISO v1
- [x] Spines WF-002 / WF-003 modélisées + testées (hors-ligne)
- [x] CI (typecheck strict + tests, Node 20/22) + Dependabot
- [x] Indexer les agents de WF-002/003 au sidecar (repo `claude-agents`) — 14 assets, consommable, défaut `CATALOG_ROOT` réaligné
- [ ] Run live WF-002/003 de bout en bout (sur accord explicite + run observé)

## Stack

Claude Agent SDK (substrat d'exécution) · JSON Schema (contrats + sidecar) · Opus 4.8 / Sonnet 4.6 selon l'étape.

## Licence

[Business Source License 1.1](LICENSE) © 2026 Guy HUI-BON-HOA.

- **Usage non-production** (développement, test, évaluation) : libre, sous les termes de la BSL.
- **Usage en production** : requiert une licence commerciale → voir [`COMMERCIAL.md`](COMMERCIAL.md).
- **Bascule automatique** : **4 ans après la publication** de chaque version (*Change Date* glissante), celle-ci passe sous **Apache License 2.0**.

> **Dépendance d'exécution propriétaire** : indépendamment de la BSL ci-dessus, le substrat d'exécution `@anthropic-ai/claude-agent-sdk` est **propriétaire** (© Anthropic PBC, [Anthropic Commercial Terms](https://code.claude.com/docs/en/legal-and-compliance)) — son usage requiert l'acceptation des conditions Anthropic et un abonnement. Le reste de l'arbre de dépendances est permissif (MIT/ISC/BSD/Apache-2.0), sans copyleft fort. Détails : [`docs/audit/conformite_licences_iso5230.md`](docs/audit/conformite_licences_iso5230.md).

## Outillage

Documentation et conception assistées par **Claude Opus 4.8** (modèle en cours d'utilisation).
