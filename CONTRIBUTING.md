# Contributing to `claude-agentic-runtime`

> Repo in English · UTF-8 · solo (Guy HUI-BON-HOA), but discipline kept for quality and portfolio signal.

## Non-negotiable invariants (see `docs/adr/`)
1. **Read-only on `claude-agents`**: no writes to the catalog, ever (ADR-0001).
2. **Catalog import pinned** to an exact tag; propagation = explicit bump (ADR-0002).
3. **Sidecar** = owned by the catalog (ADR-0003).
4. **Propagation guarded** by eval gates + contract validation (ADR-0004).
5. **Feedback to the catalog** only through a **human PR** (ADR-0005).

## Architecture decisions
Every structural decision = **one ADR** in `docs/adr/` (Nygard format: Status · Context · Decision · Consequences · Rejected alternatives). Numbering `NNNN-title.md`.

## Commits (Conventional Commits)
`<type>(<scope>): <description>` — types: `feat` · `fix` · `refactor` · `chore` · `docs` · `test` · `ci`.

## Versioning (SemVer)
- **Major**: contract or architecture break.
- **Minor**: new building block / capability.
- **Patch**: fixes.
- Every release → a `CHANGELOG.md` entry with the **Claude model used**.

## Quality
- Standards applied: **ISO/IEC/IEEE 42010** (architecture), **ISO/IEC 25012** (data), **ISO/IEC 25010** (runtime), **ISO/IEC 42001** (AI governance) — see ADR-0006.
- Anonymization: no real client (inherited from the catalog).
- Fact-checking: every published figure/standard/label is verified (nothing invented).

## Push
Push to `main` **only on explicit approval**. Never `--force` or `--no-verify` without approval.
