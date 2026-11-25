import express from "express";
import {
  PUBLIC_DIR, INDEX_FILE, PORT, RAW_ARK_API_KEY, ARK_API_KEY,
  ARK_BASE_URL, MODEL, MAX_ARCHIVE_HITS, MAX_SOURCE_CARDS
} from "./server/config.js";
import { normalizeWhitespace, uniqueBy, getSourceTargetKey } from "./server/shared.js";
import { searchWeakWeb } from "./server/web.js";
import {
  initializeArchiveChunks, archiveChunkCount, searchArchive,
  sanitizeClientArchiveSource, stripSourceAnswerText
} from "./server/archive.js";
import {
  toArchiveSource, buildArchiveOnlyAnswer, buildProvidedArchiveAnswer,
  getErrorMessage, generateArchiveHitAnswer, generateArchiveEnhancedAnswer, generateAnswer
} from "./server/answer.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR, { index: false }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "ark",
    model: MODEL,
    hasArkKey: Boolean(ARK_API_KEY),
    hasArkModel: Boolean(MODEL),
    arkBaseUrl: ARK_BASE_URL || null,
    arkKeyHasWhitespace: /\s/.test(RAW_ARK_API_KEY),
    arkKeyLooksLikeArkKey: /^ark-[A-Za-z0-9-]+$/.test(ARK_API_KEY),
    archiveChunks: archiveChunkCount()
  });
});

app.post("/api/weak-web-search", async (req, res) => {
  const question = normalizeWhitespace(req.body?.question || "");

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const sources = await searchWeakWeb(question);
    return res.json({
      ok: true,
      sources
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Weak web search failed.",
      sources: []
    });
  }
});

app.post("/api/archive-answer", async (req, res) => {
  const question = normalizeWhitespace(req.body?.question || "");
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const sources = Array.isArray(req.body?.sources) ? req.body.sources : [];

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const result = await generateArchiveEnhancedAnswer(question, history, sources);
    return res.json({
      answer: result.answer,
      sources: result.sources,
      mode: result.mode,
      used_ai: result.used_ai,
      error_detail: result.error_detail,
      web_search_unavailable: result.web_search_unavailable === true
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Ark archive-answer failed:", errorMessage || error);
    const safeSources = uniqueBy(sources
      .map((source, index) => sanitizeClientArchiveSource(source, index))
      .filter(Boolean)
      , (source) => getSourceTargetKey(source)).slice(0, MAX_SOURCE_CARDS);
    return res.status(500).json({
      error: "The archive assistant could not complete the request.",
      error_detail: errorMessage || undefined,
      answer: buildProvidedArchiveAnswer(
        question,
        safeSources,
        errorMessage
          ? `The live model request failed (${errorMessage}), so this is a local archive fallback.`
          : "The live model request failed, so this is a local archive fallback."
      ),
      sources: safeSources.map(stripSourceAnswerText),
      mode: "archive-fallback",
      used_ai: false
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const question = normalizeWhitespace(req.body?.question || "");
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const archiveHits = searchArchive(question, MAX_ARCHIVE_HITS);
    const result = await generateAnswer(question, history, archiveHits);
    if (result.mode === "web-search-unavailable" && !archiveHits.length) {
      const fallbackArchiveHits = searchArchive(question, MAX_ARCHIVE_HITS, { allowFallback: true });
      if (fallbackArchiveHits.length) {
        const archiveFallback = await generateArchiveHitAnswer(question, history, fallbackArchiveHits);
        return res.json({
          answer: archiveFallback.answer,
          sources: archiveFallback.sources,
          mode: archiveFallback.mode,
          used_ai: archiveFallback.used_ai,
          error_detail: result.error_detail,
          web_search_unavailable: true
        });
      }
    }

    return res.json({
      answer: result.answer,
      sources: result.sources,
      mode: result.mode,
      used_ai: result.used_ai,
      error_detail: result.error_detail,
      web_search_unavailable: result.web_search_unavailable === true
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Ark chat failed:", errorMessage || error);
    const archiveHits = searchArchive(question, MAX_ARCHIVE_HITS);
    return res.status(500).json({
      error: "The assistant could not complete the request.",
      error_detail: errorMessage || undefined,
      answer: buildArchiveOnlyAnswer(
        question,
        archiveHits,
        errorMessage
          ? `The live model request failed (${errorMessage}), so this is a local archive fallback.`
          : "The live model request failed, so this is a local archive fallback."
      ),
      sources: archiveHits.map(toArchiveSource).slice(0, MAX_SOURCE_CARDS),
      mode: "archive-fallback",
      used_ai: false
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(INDEX_FILE);
});


await initializeArchiveChunks();

app.listen(PORT, () => {
  console.log(`Kiruna chat server running on http://localhost:${PORT}`);
});
