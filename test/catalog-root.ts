/**
 * Racine du catalogue `claude-agents` consommé par les tests « sidecar réel »
 * (`run-wf-001-real-sidecar`) et le run live (`wf-001-run-live`).
 *
 * POINT DE VÉRITÉ UNIQUE du défaut : factorisé ici pour éviter la dérive entre
 * tests (deux défauts dupliqués = un clone stale qui se fait consommer en
 * silence — exactement le piège évité).
 *
 * Défaut : sibling `claude-agents` — le NOM RÉEL du repo catalogue. Surchargeable
 * par la variable d'env `CATALOG_ROOT` (checkout ailleurs). `SIDECAR_PATH` en découle.
 * Le runtime ne DÉPEND pas du catalogue (repos séparés, ADR-0002) : si le sibling
 * est absent, les blocs qui en dépendent se SKIPPENT (cf. `HAVE_CATALOG` côté tests).
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));

export const CATALOG_ROOT =
  process.env.CATALOG_ROOT ?? join(HERE, "..", "..", "claude-agents");
export const SIDECAR_PATH = join(CATALOG_ROOT, "sidecar.json");
