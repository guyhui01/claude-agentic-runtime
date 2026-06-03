# Changelog — claude-agentic-runtime

> Format [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) · Versionnement [SemVer](https://semver.org/lang/fr/).
> Convention : chaque entrée indique le **modèle Claude** utilisé.

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
