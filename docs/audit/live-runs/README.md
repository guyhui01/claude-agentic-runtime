# Traces de runs live — observabilité d'audit

Remédiation **P3** de l'[audit qualité ISO v1](../audit_qualite_iso_v1.md) : capture **persistante** des résultats de run live (statut, verdicts par étape, sorties tracées), **au lieu du `/tmp` éphémère** d'origine.

## Fonctionnement

- Le harness `test/wf-001-run-live.test.ts` écrit ici son résultat (`wf-001-live-result.json`) par défaut — surchargeable via `LIVE_RESULT_FILE`.
- Le `.json` **brut** est **gitignoré** (cf. `.gitignore` local) : une sortie d'agent brute ne doit pas être committée sans revue.
- La trace **anonymisée** d'un run probant est committée **sur décision**, après revue (briefs/sorties exempts de données client réelles — cf. règle d'anonymisation du projet), comme **artefact d'audit** daté.

## État

> ✅ **Traces versionnées (runs live probants du 2026-06-13, facturés et observés sur accord explicite)**, revue P3 OK (cas synthétiques, aucune donnée client réelle ni secret), commit via `git add -f` :
> - **`wf-003-live-result.json`** — WF-003 « Lancement Application IA », statut **`completed`**, **7/7 étapes `pass`** (STEP-00 → STEP-06), cap budget respecté. Valide en live le correctif « structured output natif » à STEP-03.
> - **`wf-002-live-result.json`** — WF-002 « Delivery », statut **`completed`**, **5/5 étapes `pass`**. Run antérieur du même jour (avant les commits de session, dont le fix STEP-03) : artefact historique valide, non re-rejoué post-fix.
>
> P3 (mécanisme **et** artefacts) est désormais traité par des exécutions réelles, jamais une reconstruction manuelle. Le run « plein pot » du **2026-06-09** précédait ce mécanisme et sa capture `/tmp` n'avait pas survécu.
