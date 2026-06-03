# Contribuer à `claude-agentic-runtime`

> Repo en français · UTF-8 · solo (Guy HUIBONHOA), mais discipline maintenue pour la qualité et le signal portfolio.

## Invariants non négociables (voir `docs/adr/`)
1. **Read-only sur `claude-agents`** : aucune écriture vers le catalogue, jamais (ADR-0001).
2. **Import du catalogue épinglé** sur tag exact ; propagation = bump explicite (ADR-0002).
3. **Sidecar** = propriété du catalogue (ADR-0003).
4. **Propagation gardée** par eval gates + validation de contrats (ADR-0004).
5. **Feedback vers le catalogue** uniquement par **PR humaine** (ADR-0005).

## Décisions d'architecture
Toute décision structurante = **un ADR** dans `docs/adr/` (format Nygard : Statut · Contexte · Décision · Conséquences · Alternatives écartées). Numérotation `NNNN-titre.md`.

## Commits (Conventional Commits)
`<type>(<scope>): <description>` — types : `feat` · `fix` · `refactor` · `chore` · `docs` · `test` · `ci`.

## Versioning (SemVer)
- **Major** : rupture de contrat / d'architecture.
- **Minor** : nouvelle brique / capacité.
- **Patch** : corrections.
- Chaque release → entrée `CHANGELOG.md` avec **mention du modèle Claude** utilisé.

## Qualité
- Référentiels appliqués : **ISO/IEC/IEEE 42010** (architecture), **ISO/IEC 25012** (données), **ISO/IEC 25010** (runtime), **ISO/IEC 42001** (gouvernance IA) — cf. ADR-0006.
- Anonymisation : aucun client réel (héritée du catalogue).
- Vérification factuelle : tout chiffre/norme/libellé publié est vérifié (pas d'invention).

## Push
Push sur `main` **uniquement sur accord explicite**. Jamais de `--force` ni `--no-verify` sans accord.
