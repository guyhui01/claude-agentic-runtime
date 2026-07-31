#!/usr/bin/env bash
#
# Falsification harness — mutate one literal in one tracked file, run the suite,
# and report WHICH tests turn red.
#
# WHY IT IS A VERSIONED SCRIPT AND NOT A COMMAND TYPED PER LOT. The first
# harness of this shape (2026-07-30) lived in a scratchpad and routed its
# substitutions through sed. Its escaping was broken, the mutations never
# reached the files, the suite ran on intact code — and it reported "0 failing
# test(s)" six times, which is indistinguishable from six guards that genuinely
# fail to guard. Nothing downstream can catch that: the suite is green whether
# the mutation bit or not. The guard therefore has to sit on the MUTATION.
#
# Three refusals, never warnings — a refused case is not a result:
#   (a) the literal must occur EXACTLY ONCE in the file. Zero occurrences is a
#       case aimed at code that moved; several is a case that cannot say which
#       one it measured.
#   (b) after substituting, `git diff` on that file must be NON-EMPTY. This is
#       the guard that the first harness lacked.
#   (c) the file is restored from the INDEX. That is why (a) is preceded by a
#       check that the file carries no unstaged changes: `git checkout --`
#       would destroy them. Stage new or edited files before running.
#
# Substitution is a literal string replace performed in Node — never a sed or
# perl pattern, and never a `String.replace` with a raw replacement string
# either (`$&` and `$1` are live there). The escaping IS the defect this script
# exists to prevent, so cases travel base64-encoded from end to end.
#
# READ THE VERDICT THIS WAY: a case is a PASS when the mutation turns something
# red, because that is what proves a guard measures its subject. A GREEN case is
# the finding — the property has no test watching it.

set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/falsify.sh <cases.json>
  scripts/falsify.sh --case <file> <old-literal> <new-literal> [label]

cases.json:
  [ { "file": "src/…", "old": "…", "new": "…", "label": "what this case claims" } ]

`old` must occur exactly once in `file`; every file must be tracked and free of
unstaged changes (stage your work first — the restore reads the index).
Exit code 0 only when every case turned red.
USAGE
}

if [[ $# -eq 0 || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

WORK="$(mktemp -d)"
MUTATED=""
cleanup() {
  # Restore first, delete second: a crash mid-case must never leave a mutated
  # working tree behind.
  if [[ -n "$MUTATED" ]]; then git checkout -- "$MUTATED" 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# --- case list, base64-encoded so no character can be reinterpreted -----------
CASES="$WORK/cases.tsv"
if [[ "${1:-}" == "--case" ]]; then
  shift
  [[ $# -ge 3 ]] || { usage; exit 2; }
  printf '%s\t%s\t%s\t%s\n' \
    "$1" \
    "$(printf '%s' "$2" | base64)" \
    "$(printf '%s' "$3" | base64)" \
    "$(printf '%s' "${4:-$1}" | base64)" >"$CASES"
else
  node -e '
    const fs = require("node:fs");
    const cases = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (!Array.isArray(cases) || cases.length === 0) {
      console.error("REFUSED: cases file is not a non-empty array");
      process.exit(2);
    }
    const b64 = (s) => Buffer.from(String(s), "utf8").toString("base64");
    const out = cases.map((c, i) => {
      for (const k of ["file", "old", "new"]) {
        if (typeof c[k] !== "string" || c[k] === "") {
          console.error(`REFUSED: case #${i + 1} has no "${k}"`);
          process.exit(2);
        }
      }
      return [c.file, b64(c.old), b64(c.new), b64(c.label ?? `case #${i + 1}`)].join("\t");
    });
    fs.writeFileSync(process.argv[2], out.join("\n") + "\n");
  ' "$1" "$CASES"
fi

total=0
red=0
green=0
refused=0

while IFS=$'\t' read -r file o64 n64 l64; do
  [[ -n "$file" ]] || continue
  total=$((total + 1))
  label="$(printf '%s' "$l64" | base64 -d)"
  printf '\n── CASE %d — %s\n   file: %s\n' "$total" "$label" "$file"

  if ! git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
    printf '   REFUSED: not tracked by git (stage it first — the restore reads the index)\n'
    refused=$((refused + 1))
    continue
  fi
  if ! git diff --quiet -- "$file"; then
    printf '   REFUSED: file carries unstaged changes; restoring it would destroy them\n'
    refused=$((refused + 1))
    continue
  fi

  # (a) exactly-one-occurrence, then the literal substitution.
  if ! node -e '
    const fs = require("node:fs");
    const [file, o64, n64] = process.argv.slice(1);
    const oldText = Buffer.from(o64, "base64").toString("utf8");
    const newText = Buffer.from(n64, "base64").toString("utf8");
    const src = fs.readFileSync(file, "utf8");
    let count = 0;
    for (let i = src.indexOf(oldText); i !== -1; i = src.indexOf(oldText, i + oldText.length)) count++;
    if (count !== 1) {
      console.error(`   REFUSED: literal occurs ${count} time(s), expected exactly 1`);
      process.exit(3);
    }
    // Function replacement: a raw string would let `$&` and `$1` fire.
    fs.writeFileSync(file, src.replace(oldText, () => newText));
  ' "$file" "$o64" "$n64"; then
    refused=$((refused + 1))
    continue
  fi
  MUTATED="$file"

  # (b) THE guard the first harness lacked: prove the mutation reached the file.
  if git diff --quiet -- "$file"; then
    printf '   REFUSED: substitution left the file byte-identical — not counted\n'
    git checkout -- "$file"
    MUTATED=""
    refused=$((refused + 1))
    continue
  fi

  npx vitest run --reporter=json --outputFile="$WORK/report.json" >/dev/null 2>&1 || true

  verdict="$(node -e '
    const fs = require("node:fs");
    const path = process.argv[1];
    if (!fs.existsSync(path)) { console.log("NOREPORT"); process.exit(0); }
    const report = JSON.parse(fs.readFileSync(path, "utf8"));
    const failed = [];
    for (const suite of report.testResults ?? []) {
      const name = (suite.name ?? "").split("/").pop();
      const assertions = suite.assertionResults ?? [];
      for (const a of assertions) if (a.status === "failed") failed.push(`${name} › ${a.fullName}`);
      // A mutation that breaks the module at import time fails the whole file
      // with no assertion attached. It IS red, but it proves nothing about a
      // guard, so it is labelled rather than counted as an ordinary hit.
      if (suite.status === "failed" && !assertions.some((a) => a.status === "failed")) {
        failed.push(`${name} › (collection failed — the mutation broke the module, not a guard)`);
      }
    }
    console.log(failed.length === 0 ? "GREEN" : "RED");
    for (const f of failed) console.log(`     • ${f}`);
  ' "$WORK/report.json")"

  git checkout -- "$file"
  MUTATED=""
  if ! git diff --quiet -- "$file"; then
    printf '   FATAL: restore left the file modified — stopping to avoid a dirty tree\n'
    exit 4
  fi

  head="$(printf '%s' "$verdict" | head -1)"
  rest="$(printf '%s' "$verdict" | tail -n +2)"
  case "$head" in
    RED)
      printf '   RED — %d test(s):\n%s\n' "$(printf '%s' "$rest" | grep -c '•' || true)" "$rest"
      red=$((red + 1))
      ;;
    GREEN)
      printf '   GREEN — the mutation survived: NOTHING measures this property (finding)\n'
      green=$((green + 1))
      ;;
    *)
      printf '   REFUSED: vitest produced no report\n'
      refused=$((refused + 1))
      ;;
  esac
done <"$CASES"

printf '\n────────\n%d case(s): %d red · %d green · %d refused\n' "$total" "$red" "$green" "$refused"
if [[ $green -gt 0 || $refused -gt 0 ]]; then
  printf 'A green or refused case is not a pass. Read it before committing.\n'
  exit 1
fi
