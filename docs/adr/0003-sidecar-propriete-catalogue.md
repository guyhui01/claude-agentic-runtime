# ADR-0003 — Le manifeste *sidecar* appartient au catalogue

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
Les `AGENT-*.md` et `workflows/` de `claude-agents` sont en **prose Markdown** (lisible, audité). Pour être exécuté, le catalogue doit être **machine-lisible**. Trois options : loader tolérant (heuristiques sur la prose), front-matter ajouté à chaque fichier, ou **manifeste sidecar** (index structuré séparé).

## Décision
On adopte le **sidecar** : un index machine-lisible (JSON/YAML, validé par JSON Schema). Ce sidecar **appartient à `claude-agents`** : il y est **généré et validé en CI** à chaque PR. Le corps prose du catalogue reste **intact et auditable**. Le runtime ne fait que **lire** le sidecar.

## Conséquences
### Positives
- Catalogue **auto-descriptif et autoritaire** (l'index fait partie de la SSOT).
- Robustesse déterministe + validation CI, sans casser la lisibilité humaine.
- Le runtime n'a aucun motif d'écrire dans le catalogue (cohérent ADR-0001).

### Négatives / coûts
- Une étape de génération/validation à maintenir côté catalogue.

## Alternatives écartées
- **Loader tolérant** (parse la prose) : rejeté — fragile (casse si un titre change), heuristiques à maintenir, pas de garantie de validation.
- **Front-matter par fichier** : rejeté — modifie tout le repo audité ; et la spec `AGENTS.md` 1.0 ne définit pas de front-matter (proposition 1.1 non mergée, mai 2026).
- **Sidecar généré côté runtime** : rejeté — sortirait l'index de la SSOT (moins propre).
