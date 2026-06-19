# License compliance (ISO/IEC 5230 / OpenChain) — `claude-agentic-runtime`

- **Date**: 2026-06-11 (updated 2026-06-19 — see the license timeline in §5)
- **Claude model**: Claude Opus 4.8
- **Author**: Guy HUI-BON-HOA (assisted by Claude Opus 4.8)
- **Origin**: **P4** remediation of the [ISO quality audit v1](audit_qualite_iso_v1.md) — the ISO 5230 trigger of [ADR-0006](../adr/0006-referentiels-qualite.md) ("when setting the license") is **reached**: project license set to **PolyForm Noncommercial 1.0.0** (`LICENSE`, `package.json`, `README.md`).
- **Object**: inventory of dependency licenses + verdict on **compatibility with a PolyForm Noncommercial distribution**. A **factual** check (reading the real `package.json` files), not declarative.
- **Scope**: solo *portfolio asset* POC → a lightweight reproducible inventory (no tooled SBOM: YAGNI, see the maintenance-simplicity rule).

---

## 1. Method (reproducible)

| Check | Command |
|---|---|
| Inventory of the whole installed tree | recursive walk of `node_modules/**/package.json` (`license` field) |
| Isolating the **production** subtree | `npm ls --omit=dev --all` |
| Resolving non-SPDX entries | reading the `LICENSE.md`/`README.md` of the packages concerned |
| Strong-copyleft detection | `GPL\|AGPL\|LGPL\|EUPL\|CDDL` filter over the whole tree |

State on 2026-06-11: **149 packages** installed (prod + dev + transitive).

## 2. License inventory (whole tree)

| License | # packages | Family |
|---|---:|---|
| MIT | 128 | permissive |
| ISC | 9 | permissive |
| Apache-2.0 | 3 | permissive |
| BSD-3-Clause | 3 | permissive |
| BSD-2-Clause | 1 | permissive |
| Unlicense | 1 | public domain |
| MPL-2.0 | 2 | *weak* copyleft (file-level) |
| `SEE LICENSE IN README.md` | 1 | non-SPDX → resolved in §3 |
| `SEE LICENSE IN LICENSE.md` | 1 | non-SPDX → resolved in §3 |

## 3. Resolving non-SPDX entries (the heart of the check)

| Package | Declared | REAL license (verified) | Status |
|---|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `SEE LICENSE IN README.md` | **Proprietary** — "© Anthropic PBC. All rights reserved", use subject to the [Anthropic Legal Agreements](https://code.claude.com/docs/en/legal-and-compliance) / Commercial Terms. **Not an OSI license.** | ⚠️ to disclose |
| `@anthropic-ai/claude-agent-sdk-darwin-arm64` | `SEE LICENSE IN LICENSE.md` | Same (platform binary of the same SDK) | ⚠️ same |
| `lightningcss` + `lightningcss-darwin-arm64` | `MPL-2.0` | MPL-2.0 confirmed — **DEV only** (`vitest` → `vite` → `lightningcss`), **absent from the production subtree** (`npm ls --omit=dev lightningcss` → *empty*). Not distributed. | ✅ no concern |

## 4. Verdicts (criterion → evidence → verdict)

| ISO 5230 criterion | Evidence | Verdict |
|---|---|---|
| Project license declared and present | **PolyForm-Noncommercial-1.0.0** — `LICENSE`, `package.json:6`, `README.md` | **Conforming** |
| No **strong copyleft** (GPL/AGPL/LGPL/EUPL/CDDL) in the tree | dedicated filter → **0 occurrence** | **Conforming** |
| **Production** dependencies compatible with the project license | `ajv` + transitive = MIT/ISC/BSD/Apache-2.0 (permissive). The project license (PolyForm Noncommercial) is **more restrictive** than these permissive deps → **no inbound incompatibility**: permissive code can be redistributed inside a more restrictive project. | **Conforming** |
| Weak copyleft (MPL-2.0) under control | `lightningcss` = **dev-only**, not distributed; MPL = *file-level* copyleft (compatible even if distributed, as long as unmodified) | **Conforming** |
| **Proprietary** dependency identified and **disclosed** | `@anthropic-ai/claude-agent-sdk` = proprietary (Anthropic Commercial Terms). Does **not** prevent publishing the original code under PolyForm Noncommercial (no relicensing), **but** running the runtime requires accepting Anthropic's terms + a subscription. | **Partial** → disclosure added (§5) |

**Overall verdict: 🟢 Conforming.** No dependency forbids distributing the project under PolyForm Noncommercial; no contaminating copyleft. **A single action**: make explicit, in the docs, that the execution substrate (Anthropic SDK) is **proprietary**.

## 5. Remediation action applied

- **README disclosure**: the "License" section now states that the code is under PolyForm Noncommercial **but** that `@anthropic-ai/claude-agent-sdk` (an execution dependency) is under **Anthropic commercial terms** (proprietary), requiring a subscription — consistent with the project's budget/subscription rule.

### License timeline (post-audit)

At audit time (2026-06-11) the project was **MIT** — the original baseline of this audit, correct then. The license was subsequently hardened in two steps:

| Date | Change |
|---|---|
| 2026-06-12 | MIT → **BSL 1.1** (Business Source License) |
| 2026-06-17 | BSL 1.1 → **PolyForm Noncommercial 1.0.0** (current) |

This audit was updated (2026-06-19) to the current PolyForm Noncommercial baseline. The **dependency analysis is unaffected**: the permissive deps (MIT/ISC/BSD/Apache-2.0) remain compatible under a more restrictive project license, and no strong copyleft is present.

## 6. Deferred standards — status

- **ISO 5230**: trigger **handled** by this document, re-assessed at the latest license change (2026-06-17, → PolyForm Noncommercial 1.0.0). Re-assessable again if the project is published as a bundled npm artifact, or if a copyleft dependency is introduced.
- **ISO 23894** (AI risk): **stays deferred** — trigger = formalizing AI risk management; not reached (POC *portfolio asset*, no industrialization). Building a risk register now would be over-engineering.
- **ISO 25024** (data metrics): stays deferred.

---

> Document produced with **Claude Opus 4.8** (2026-06-11). A factual check, not declarative (ISO 19011 posture).
