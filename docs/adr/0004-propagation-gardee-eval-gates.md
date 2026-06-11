# ADR-0004 — Propagation gardée par eval gates + validation de contrats

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
Un changement du catalogue peut altérer le **contrat I/O** d'un agent et casser un handoff de workflow. Le bump de version (ADR-0002) est le point où ce risque doit être intercepté.

## Décision
Tout bump de version du catalogue passe par une **chaîne de validation en CI** (pattern Dependabot/Renovate) : **validation statique des contrats** (JSON Schema) + **eval gates comportementaux** sur les sorties d'agents. Si rouge → la **PR de bump échoue** (*fail-closed*) et n'est pas mergeable. L'automatisation **vérifie** (preuve) ; **l'humain décide** (merge).

## Conséquences
### Positives
- Défense en profondeur : aucune **rupture de contrat non détectée** ne se propage.
- Décision d'adoption tracée et fondée sur des preuves, pas sur une impression.

### Négatives / coûts
- Coût de maintien des schémas de contrat et des eval gates.

## Limite explicite (honnêteté)
Cette chaîne garantit qu'**aucune rupture de contrat _non détectée_ ne se propage** — elle **n'équivaut pas** à « aucune régression possible » : un test ne couvre que ce qu'il teste, une régression sémantique à l'intérieur d'un contrat valide peut subsister. Promettre l'infaillibilité serait un faux signal.

## Alternatives écartées
- **Agent de propagation dédié** : surdimensionné au POC (usine à gaz) ; un workflow CI + merge humain suffit. Re-packageable en agent plus tard si valeur démontrée.
- **Bump sans validation** : rejeté — propagation aveugle.
