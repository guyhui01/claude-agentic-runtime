# ADR-0007 — Contrats de handoff & critères d'eval gate : manifeste de spine propriété du runtime

- **Statut** : Accepté (2026-06-04)
- **Décideur** : Guy HUI-BON-HOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime` — §2.4-B.2

## Contexte
L'exécuteur de spine (§2.4-B.1) branche, sur chaque étape, des **contrats de handoff** (brique 1) et des **critères d'eval gate** (brique 2). Jusqu'ici ces deux artefacts sont en **fixtures de test**. Il faut trancher leur **source de production**.

Fait technique décisif : les deux artefacts n'ont pas la même nature.
- Un **contrat** (`StepContract`) est du **JSON Schema** → donnée sérialisable.
- Un **critère** (`Criterion.check: (output) => boolean`) est un **prédicat exécutable** → **pas** sérialisable en données sans inventer un DSL déclaratif compilé au chargement (perte d'expressivité, langage à maintenir).

Par ailleurs, contrats et gates relèvent de la **politique d'exécution et de jugement** d'un runtime donné — *comment* on évalue une sortie — et non de la **description** du catalogue (*ce qui existe*).

## Décision
La source est un **manifeste de spine, propriété du `claude-agentic-runtime`** :
- chaque spine y décrit ses **étapes ordonnées** + le **contrat** de chaque étape (JSON Schema, donnée) ;
- les **critères** sont **référencés par `id`** depuis un **registre de critères en TypeScript** (le code reste expressif, déterministe, testé hermétiquement) ;
- le manifeste **croise** les `stepId`/`assetId` du **sidecar** ; le loader vérifie la cohérence (toute étape pointe un asset réel du catalogue épinglé).

Le **sidecar reste descriptif et inchangé** (ADR-0003) : il dit *ce qui existe* (assets, dépendances, provenance) ; le manifeste dit *comment exécuter une spine*.

## Conséquences
### Positives
- **Séparation des préoccupations** : description (catalogue, ADR-0003) ≠ politique d'exécution (runtime). Le catalogue prose-first n'est pas couplé au jugement d'un runtime particulier.
- **Critères = vrai code déterministe** (pas de DSL prématuré, YAGNI) : expressifs, typés, testables.
- **Cohérent ADR-0002/0004** : le bump et sa chaîne de validation (contrats + gates) sont déjà des actes côté runtime ; la source l'est aussi.
- **SSOT préservée** : le « quoi existe » reste au sidecar ; le croisement par `id` empêche la dérive.
- **Lecture seule du catalogue maintenue** (ADR-0001).

### Négatives / coûts
- Les `stepId`/`assetId` du manifeste doivent rester synchronisés avec le sidecar (mitigation : contrôle de cohérence au chargement, fail-closed).
- Le manifeste n'est pas validé par la CI du catalogue ; il l'est par celle du runtime.

## Limite explicite (honnêteté)
Loger les critères comme code maximise l'expressivité mais les rend **non éditables par un non-développeur** et non portables hors TypeScript. Si un besoin réel d'authoring déclaratif émerge (critères édités par un métier, partagés multi-runtime), un **DSL de critères** sérialisable redeviendra pertinent — il pourra alors être adopté **sans casser** l'interface `Criterion` (le registre compilera le DSL vers des `check`). On ne l'introduit pas au POC (YAGNI).

## Alternatives écartées
- **Étendre le sidecar** (contrats + critères-en-DSL portés par le catalogue) : rejeté — pousse la politique de jugement dans le catalogue (couplage), impose un DSL de critères dès maintenant, contredit la rationale *descriptive* d'ADR-0003.
- **Hybride** (contrats → sidecar, critères → registre runtime) : rejeté pour le POC — oblige le catalogue prose-first à générer du JSON Schema par asset (étape lourde) et crée deux sources pour un même handoff. Réévaluable si les contrats d'I/O deviennent un livrable descriptif du catalogue.
