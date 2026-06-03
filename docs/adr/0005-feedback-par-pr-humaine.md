# ADR-0005 — Le feedback runtime → catalogue passe uniquement par PR humaine

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUIBONHOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
À l'exécution, le runtime produit des signaux (résultats d'eval, métriques de qualité, « trust signals ») qui peuvent suggérer d'améliorer un skill ou un agent du catalogue. Le pattern *registry* fait parfois remonter ces signaux automatiquement.

## Décision
Tout retour du runtime vers `claude-agents` se fait **via une PR humaine normale** (revue, audit grille v2.8, CHANGELOG). Le runtime *propose* (issue, rapport, draft) ; **un humain (Guy) décide et committe**. **Aucun write-back automatique.**

## Conséquences
### Positives
- Préserve l'invariant read-only (ADR-0001) et la qualité auditée du catalogue.
- Cohérent avec la règle d'intégrité d'audit (ISO 19011) : préférer une vérification de preuve à l'approbation automatique.

### Négatives / coûts
- Latence humaine sur l'amélioration continue du catalogue (assumée).

## Alternatives écartées
- **Write-back automatique des signaux d'eval** : rejeté — muterait silencieusement un catalogue audité et public.
