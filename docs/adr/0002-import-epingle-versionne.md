# ADR-0002 — Import du catalogue épinglé et versionné

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
Le runtime doit décider *comment* il charge le catalogue : import live sur `main`, ou dépendance versionnée. L'enjeu est l'arbitrage **stabilité ↔ fraîcheur**.

## Décision
Le runtime dépend du catalogue par **tag exact** (ex. `claude-agents@v3.25.0`), **jamais** par une plage `^`/`~`. La propagation d'une nouvelle version est un **bump explicite et tracé** (commit + entrée CHANGELOG côté runtime), pas un effet implicite.

## Conséquences
### Positives
- Exécutions reproductibles ; pas de surprise au runtime.
- Le bump devient un point de contrôle où s'appliquent les garde-fous (cf. ADR-0004).

### Négatives / coûts
- La fraîcheur n'est pas immédiate : il faut bumper pour propager (acceptable, c'est le but).

## Alternatives écartées
- **Import live (`main`)** : rejeté pour la prod — une édition du catalogue casserait le runtime sans filet.
- **Plages SemVer (`^`/`~`)** : rejeté — réintroduit de la propagation implicite non contrôlée.
