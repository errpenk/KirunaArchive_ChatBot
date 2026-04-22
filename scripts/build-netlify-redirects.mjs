import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT_DIR, "netlify", "_redirects.template");
const OUTPUT_PATH = path.resolve(
  ROOT_DIR,
  process.env.NETLIFY_REDIRECTS_OUTPUT || path.join("public", "_redirects")
);

const apiOrigin = String(process.env.NETLIFY_RAILWAY_API_ORIGIN || "")
  .trim()
  .replace(/\/+$/, "");

function fail(message) {
  console.error(`Netlify redirect setup failed: ${message}`);
  process.exit(1);
}

if (!apiOrigin) {
  const message =
    "Missing NETLIFY_RAILWAY_API_ORIGIN. Set it to your Railway public URL, for example https://your-api.up.railway.app";
  if (process.env.NETLIFY === "true" || process.env.CONTEXT) {
    fail(message);
  }
  console.warn(message);
  process.exit(0);
}

if (!/^https?:\/\/[^/\s]+$/i.test(apiOrigin)) {
  fail(
    "NETLIFY_RAILWAY_API_ORIGIN must be an absolute origin like https://your-api.up.railway.app"
  );
}

const template = await fs.readFile(TEMPLATE_PATH, "utf8");
const redirects = template.replaceAll("__RAILWAY_API_ORIGIN__", apiOrigin);

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, redirects, "utf8");

console.log(
  `Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)} with API proxy origin ${apiOrigin}`
);
