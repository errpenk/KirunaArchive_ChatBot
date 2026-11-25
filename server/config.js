import "dotenv/config";
import { ArkRuntimeClient } from "@volcengine/ark-runtime";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");
const TIMELINE_FILE = path.join(PUBLIC_DIR, "timeline.html");
const ARCHIVE_DATA_FILE = path.join(PUBLIC_DIR, "js", "archive-data.js");
const OUTSIDE_DATA_FILE = path.join(PUBLIC_DIR, "js", "outside-data.js");

const PORT = Number(process.env.PORT || 3000);
const RAW_ARK_API_KEY = String(process.env.ARK_API_KEY || "");
const ARK_API_KEY = RAW_ARK_API_KEY.trim();
const ARK_BASE_URL = String(process.env.ARK_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const MODEL = String(process.env.ARK_MODEL || process.env.ARK_ENDPOINT_ID || "").trim();
const MAX_ARCHIVE_HITS = 4;
const MAX_HISTORY_TURNS = 6;
const MAX_SOURCE_CARDS = 6;
const BLOCKED_WEB_DOMAINS = ["reddit.com", "quora.com"];
const MAX_WEAK_WEB_SOURCES = 8;

const client = ARK_API_KEY
  ? ArkRuntimeClient.withApiKey(
      ARK_API_KEY,
      ARK_BASE_URL
        ? {
            baseURL: ARK_BASE_URL
          }
        : {}
    )
  : null;

export {
  PUBLIC_DIR, INDEX_FILE, TIMELINE_FILE, ARCHIVE_DATA_FILE, OUTSIDE_DATA_FILE,
  PORT, RAW_ARK_API_KEY, ARK_API_KEY, ARK_BASE_URL, MODEL,
  MAX_ARCHIVE_HITS, MAX_HISTORY_TURNS, MAX_SOURCE_CARDS,
  BLOCKED_WEB_DOMAINS, MAX_WEAK_WEB_SOURCES, client
};
