# Traces de runs live — observabilité d'audit

Remédiation **P3** de l'[audit qualité ISO v1](../audit_qualite_iso_v1.md) : capture **persistante** des résultats de run live (statut, verdicts par étape, sorties tracées), **au lieu du `/tmp` éphémère** d'origine.

## Fonctionnement

- Le harness `test/wf-001-run-live.test.ts` écrit ici son résultat (`wf-001-live-result.json`) par défaut — surchargeable via `LIVE_RESULT_FILE`.
- Le `.json` **brut** est **gitignoré** (cf. `.gitignore` local) : une sortie d'agent brute ne doit pas être committée sans revue.
- La trace **anonymisée** d'un run probant est committée **sur décision**, après revue (briefs/sorties exempts de données client réelles — cf. règle d'anonymisation du projet), comme **artefact d'audit** daté.

## État

> ✅ **Première trace versionnée : `wf-003-live-result.json`** — run live WF-003 « Lancement Application IA » du **2026-06-13**, facturé et observé sur accord explicite. Statut **`completed`**, **7/7 étapes `pass`** (STEP-00 → STEP-06), cap budget respecté. Revue P3 effectuée : cas synthétique « assureur » avec placeholders, **aucune donnée client réelle ni secret** — commit via `git add -f`. P3 (mécanisme **et** artefact) est désormais traité par une exécution réelle, jamais une reconstruction manuelle.
>
> Le run « plein pot » du **2026-06-09** précédait ce mécanisme et sa capture `/tmp` n'avait pas survécu — d'où l'attente d'un run live ultérieur pour produire le premier artefact, désormais en place.
