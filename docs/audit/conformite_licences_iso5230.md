# Conformité licences (ISO/IEC 5230 / OpenChain) — `claude-agentic-runtime`

- **Date** : 2026-06-11
- **Modèle Claude** : Claude Opus 4.8
- **Auteur** : Guy HUIBONHOA (assisté Claude Opus 4.8)
- **Origine** : remédiation **P4** de l'[audit qualité ISO v1](audit_qualite_iso_v1.md) — le déclencheur ISO 5230 d'[ADR-0006](../adr/0006-referentiels-qualite.md) (« au moment de fixer la licence ») est **atteint** : licence du projet fixée à **MIT** (`LICENSE`, `package.json`, `README.md`).
- **Objet** : inventaire des licences des dépendances + verdict de **compatibilité avec une distribution sous MIT**. Contrôle **factuel** (lecture des `package.json` réels), pas déclaratif.
- **Portée** : POC solo *asset portfolio* → inventaire léger reproductible (pas de SBOM outillé : YAGNI, cf. règle de simplicité de maintenance).

---

## 1. Méthode (reproductible)

| Contrôle | Commande |
|---|---|
| Inventaire de tout l'arbre installé | parcours récursif des `node_modules/**/package.json` (champ `license`) |
| Isolation du sous-arbre **production** | `npm ls --omit=dev --all` |
| Résolution des entrées non-SPDX | lecture des `LICENSE.md`/`README.md` des paquets concernés |
| Détection copyleft fort | filtre `GPL\|AGPL\|LGPL\|EUPL\|CDDL` sur tout l'arbre |

État au 2026-06-11 : **149 paquets** installés (prod + dev + transitif).

## 2. Inventaire des licences (tout l'arbre)

| Licence | Nb paquets | Famille |
|---|---:|---|
| MIT | 128 | permissive |
| ISC | 9 | permissive |
| Apache-2.0 | 3 | permissive |
| BSD-3-Clause | 3 | permissive |
| BSD-2-Clause | 1 | permissive |
| Unlicense | 1 | domaine public |
| MPL-2.0 | 2 | copyleft *faible* (fichier) |
| `SEE LICENSE IN README.md` | 1 | non-SPDX → résolu §3 |
| `SEE LICENSE IN LICENSE.md` | 1 | non-SPDX → résolu §3 |

## 3. Résolution des entrées non-SPDX (le cœur du contrôle)

| Paquet | Déclaré | Licence RÉELLE (vérifiée) | Statut |
|---|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `SEE LICENSE IN README.md` | **Propriétaire** — « © Anthropic PBC. All rights reserved », usage soumis aux [Anthropic Legal Agreements](https://code.claude.com/docs/en/legal-and-compliance) / Commercial Terms. **Pas une licence OSI.** | ⚠️ à divulguer |
| `@anthropic-ai/claude-agent-sdk-darwin-arm64` | `SEE LICENSE IN LICENSE.md` | Idem (binaire de plateforme du même SDK) | ⚠️ idem |
| `lightningcss` + `lightningcss-darwin-arm64` | `MPL-2.0` | MPL-2.0 confirmée — **DEV uniquement** (`vitest` → `vite` → `lightningcss`), **absente du sous-arbre production** (`npm ls --omit=dev lightningcss` → *empty*). Non distribuée. | ✅ sans enjeu |

## 4. Verdicts (critère → preuve → verdict)

| Critère ISO 5230 | Preuve | Verdict |
|---|---|---|
| Licence du projet déclarée et présente | MIT — `LICENSE`, `package.json:6`, `README.md` | **Conforme** |
| Aucune licence **copyleft fort** (GPL/AGPL/LGPL/EUPL/CDDL) dans l'arbre | filtre dédié → **0 occurrence** | **Conforme** |
| Dépendances de **production** compatibles MIT | `ajv` + transitif = MIT/ISC/BSD/Apache-2.0 (permissives) — toutes compatibles avec une distribution MIT | **Conforme** |
| Copyleft faible (MPL-2.0) maîtrisé | `lightningcss` = **dev-only**, non distribué ; MPL = copyleft *au fichier* (compatible même si distribué, tant que non modifié) | **Conforme** |
| Dépendance **propriétaire** identifiée et **divulguée** | `@anthropic-ai/claude-agent-sdk` = propriétaire (Anthropic Commercial Terms). N'empêche **pas** la publication sous MIT du code propre (pas de relicenciement), **mais** l'exécution du runtime requiert l'acceptation des conditions Anthropic + un abonnement. | **Partiel** → divulgation ajoutée (§5) |

**Verdict global : 🟢 Conforme.** Aucune licence n'interdit la distribution du projet sous MIT ; aucun copyleft contaminant. **Une seule action** : rendre explicite, dans la doc, que le substrat d'exécution (SDK Anthropic) est **propriétaire**.

## 5. Action de remédiation appliquée

- **Divulgation README** : la section « Licence » précise désormais que le code est MIT **mais** que le `@anthropic-ai/claude-agent-sdk` (dépendance d'exécution) est sous **conditions commerciales Anthropic** (propriétaire), nécessitant un abonnement — cohérent avec la règle budget/abonnement du projet.

## 6. Normes différées — statut

- **ISO 5230** : déclencheur **traité** par ce document (ré-évaluable si le projet est publié comme artefact npm bundlé, ou si une dépendance copyleft est introduite).
- **ISO 23894** (risque IA) : **reste différée** — déclencheur = formalisation d'une gestion de risque IA ; non atteint (POC *asset portfolio*, pas d'industrialisation). Bâtir un registre de risques maintenant serait de la sur-ingénierie.
- **ISO 25024** (métriques données) : reste différée.

---

> Document élaboré avec **Claude Opus 4.8** (2026-06-11). Contrôle factuel, non déclaratif (posture ISO 19011).
