# ADR-0001 — Le runtime est un consommateur *read-only* du catalogue

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
Le catalogue `claude-agents` est la source de vérité unique (SSOT) des rôles, skills et workflows. Il est public et **audité** (grille qualité v2.8). Le runtime doit l'exécuter sans compromettre cette intégrité.

## Décision
Le runtime **consomme le catalogue en lecture seule**. Il n'écrit jamais dans `claude-agents`. La direction de dépendance est **unique** : `runtime → lit → catalogue`.

Mise en œuvre : repos séparés ; la CI du runtime n'a qu'un **token read-only** sur `claude-agents` ; le runtime n'écrit que dans ses propres stores (logs de run, résultats d'eval, état).

## Conséquences
### Positives
- Intégrité de la SSOT préservée ; pas de mutation silencieuse du catalogue audité.
- Pas de dépendance circulaire ; provenance claire.
- Le catalogue reste réutilisable par d'autres consommateurs.

### Négatives / coûts
- Toute amélioration du catalogue déclenchée par le runtime exige un détour humain (cf. ADR-0005).

## Alternatives écartées
- **Runtime read/write** : rejeté — dérive, couplage circulaire, perte des garanties d'audit.
