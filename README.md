# claude-agentic-runtime

> Runtime agentique qui **exécute** le catalogue déclaratif [`claude-agents`](https://github.com/guyhui01/claude-agents) via le **Claude Agent SDK**.
> **Statut : POC / asset de portfolio** — documentation d'architecture en place, code à venir.

## Pourquoi ce repo

[`claude-agents`](https://github.com/guyhui01/claude-agents) est une **bibliothèque agentique organisationnelle** : 38 rôles (agents), leurs skills et des workflows de delivery, en Markdown audité (grille qualité v2.8). C'est la **source de vérité unique (SSOT)**.

Ce repo en est le **consommateur exécutable** : il lit le catalogue (en lecture seule, version épinglée), le transforme en agents exécutables et orchestre une *spine* de delivery — sans jamais modifier le catalogue.

## Séparation des responsabilités

| Repo | Rôle | Écriture depuis ce runtime |
|---|---|---|
| `claude-agents` | Catalogue déclaratif, SSOT auditée | ❌ **Lecture seule** |
| **`claude-agentic-runtime`** | Exécution, eval, état de run | ✅ ses propres stores uniquement |
| `claude-projects` | Projets clients (séparé) | hors périmètre |

## Périmètre du POC

Exécuter la *spine delivery* **WF-001 cadrage → WF-002 delivery SAFe → WF-003 lancement app** en consommant le catalogue.

Trois briques à construire (le reste est porté par le Claude Agent SDK) :
1. **Loader** — sidecar du catalogue → définitions Agent SDK
2. **Contrats de handoff typés** — I/O schématisé entre étapes
3. **Eval gate** — garde-fou qualité sur une sortie d'agent

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
- 📏 [Contribuer & conventions](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

## État d'avancement

- [x] Note de cadrage validée
- [x] ADR fondateurs (5) + architecture
- [ ] Brique 0 — Loader (plan à valider avant code)
- [ ] Brique 1 — Contrats de handoff typés
- [ ] Brique 2 — Eval gate
- [ ] CI : validation schémas + PR de bump catalogue
- [ ] Exécution démontrée WF-001→003

## Stack

Claude Agent SDK (substrat d'exécution) · JSON Schema (contrats + sidecar) · Opus 4.8 / Sonnet 4.6 selon l'étape.

## Licence

[MIT](LICENSE) © 2026 Guy HUIBONHOA.

## Outillage

Documentation et conception assistées par **Claude Opus 4.8** (modèle en cours d'utilisation).
