# Traces de runs live — observabilité d'audit

Remédiation **P3** de l'[audit qualité ISO v1](../audit_qualite_iso_v1.md) : capture **persistante** des résultats de run live (statut, verdicts par étape, sorties tracées), **au lieu du `/tmp` éphémère** d'origine.

## Fonctionnement

- Le harness `test/wf-001-run-live.test.ts` écrit ici son résultat (`wf-001-live-result.json`) par défaut — surchargeable via `LIVE_RESULT_FILE`.
- Le `.json` **brut** est **gitignoré** (cf. `.gitignore` local) : une sortie d'agent brute ne doit pas être committée sans revue.
- La trace **anonymisée** d'un run probant est committée **sur décision**, après revue (briefs/sorties exempts de données client réelles — cf. règle d'anonymisation du projet), comme **artefact d'audit** daté.

## État

> ⚠️ Aucune trace committée à ce jour : le run live « plein pot » du **2026-06-09** a précédé ce mécanisme et sa capture `/tmp` n'a pas survécu. La première trace versionnée sera produite au **prochain run live** (Piste A — WF-002/003 ou re-run WF-001), facturé, sur accord explicite. P3 (mécanisme) est traité ; l'artefact suivra honnêtement une exécution réelle, jamais une reconstruction manuelle.
