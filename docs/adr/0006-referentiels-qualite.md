# ADR-0006 — Référentiels qualité retenus, différés et écartés

- **Statut** : Accepté (2026-06-03)
- **Décideur** : Guy HUIBONHOA (assisté Claude Opus 4.8)
- **Contexte projet** : POC `claude-agentic-runtime`

## Contexte
Le projet vise une qualité maximale des **données, docs, architecture et runtime**, sans tomber dans la sur-ingénierie (POC portfolio solo). On fixe les référentiels ISO **appliqués comme cadre méthodologique** — **pas comme objectif de certification** (sans ROI en solo ; la valeur est la rigueur + le signal portfolio).

## Décision

### Retenus (appliqués dès maintenant)
| Axe | Norme | Application |
|---|---|---|
| Architecture | **ISO/IEC/IEEE 42010:2022** | Description d'architecture : parties prenantes · préoccupations · points de vue (cf. `ARCHITECTURE.md`) + ADR |
| Données (catalogue + sidecar) | **ISO/IEC 25012:2008** | Sous-ensemble des 15 caractéristiques encodé dans le JSON Schema du sidecar (exactitude, complétude, cohérence, crédibilité, actualité, accessibilité, conformité) |
| Logiciel / runtime | **ISO/IEC 25010** | Exigences non-fonctionnelles du runtime (fiabilité, maintenabilité, sécurité) |
| Gouvernance IA | **ISO/IEC 42001:2023** | Principes de gouvernance, risques, cycle de vie d'un système d'IA (ombrelle) |

### Différés (à ajouter quand le contexte le justifie)
| Norme | Déclencheur d'activation |
|---|---|
| **ISO/IEC 25024:2015** (mesure de la qualité des données) | Quand on veut des **métriques chiffrées** de qualité du catalogue/sidecar |
| **ISO/IEC 23894:2023** (AI risk management) | Quand les **eval gates** (brique 2) évoluent vers une gestion de risque formalisée |
| **ISO/IEC 5230 (OpenChain)** (conformité licences open source) | Au moment de **fixer la licence** du repo (cf. README « à définir ») |

### Écartés (sur-ingénierie pour ce POC — décision explicite)
ISO/IEC 27001 (ISMS) · ISO/IEC 12207 / 15288 (cycles de vie complets) · série ISO/IEC 26511+ (gestion documentaire) · ISO/IEC 19770 (ITAM). Trop lourdes, ROI quasi nul pour un POC portfolio solo.

## Conséquences
### Positives
- Qualité **traçable et défendable** sur les 4 axes ; signal de maturité fort.
- La qualité des données devient **exécutable** (25012 dans le JSON Schema), pas déclarative.

### Négatives / coûts
- Maintenance des schémas + de la section architecture 42010.

## Révision
Les normes différées sont **réévaluées** à chaque franchissement d'étape majeure (fin POC, industrialisation).
