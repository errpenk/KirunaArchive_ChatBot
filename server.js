import "dotenv/config";

import express from "express";
import { ArkRuntimeClient } from "@volcengine/ark-runtime";
import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");

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

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR, { index: false }));

let archiveChunks = [];

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "amid",
  "among",
  "been",
  "before",
  "between",
  "both",
  "city",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "only",
  "over",
  "same",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
  "happened",
  "happen",
  "tell",
  "show",
  "find",
  "look",
  "inside",
  "index",
  "html",
  "content",
  "question",
  "answer",
  "please"
]);
const KIRUNA_CONTEXT_TOKENS = new Set([
  "kiruna",
  "kirunavaara",
  "lkab",
  "norrbotten",
  "sweden",
  "swedish",
  "sverige",
  "swiden",
  "sami",
  "sapmi",
  "geijer"
]);
const KIRUNA_TOPIC_REGEX = /\b(kiruna|kirunavaara|lkab|norrbotten|geijer)\b/i;
const SWEDEN_CONTEXT_REGEX = /\b(sweden|swedish|sverige|swiden|sami|sapmi)\b/i;

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedWebDomain(value) {
  const domain = safeDomain(value).toLowerCase();
  if (!domain) return false;
  return BLOCKED_WEB_DOMAINS.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
  );
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function questionHasKirunaContext(question) {
  return /\b(kiruna|kirunavaara|lkab|norrbotten|sweden|swedish|sverige|swiden|sami|sapmi)\b/i.test(
    String(question || "")
  );
}

function getRelevantTokens(question) {
  const tokens = tokenize(question);
  const discriminative = tokens.filter((token) => !KIRUNA_CONTEXT_TOKENS.has(token));
  return discriminative.length ? discriminative : tokens;
}

function buildNewsQueries(question) {
  const normalized = normalizeWhitespace(question);
  const keywordQuery = getRelevantTokens(question).slice(0, 6).join(" ");
  const questionYears = extractQuestionYears(question).join(" ");
  const hasKirunaContext = /\b(kiruna|kirunavaara|lkab|norrbotten)\b/i.test(normalized);
  const hasSwedenContext = /\b(sweden|swedish|sverige|swiden)\b/i.test(normalized);
  const prefix = [
    hasKirunaContext ? "" : "Kiruna",
    hasSwedenContext ? "" : "Sweden"
  ]
    .filter(Boolean)
    .join(" ");
  const suffix = [
    hasKirunaContext ? "" : "Kiruna",
    hasSwedenContext ? "" : "Sweden"
  ]
    .filter(Boolean)
    .join(" ");

  return [...new Set(
    [
      prefix ? `${prefix} ${normalized}` : normalized,
      suffix ? `${normalized} ${suffix}` : normalized,
      `Kiruna Sweden ${keywordQuery || normalized}`,
      `LKAB Kiruna Sweden ${keywordQuery || normalized}`,
      questionYears ? `Kiruna Sweden history ${questionYears}` : "",
      keywordQuery ? `Kiruna Sweden ${keywordQuery}` : "",
      normalized
    ]
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
  )].slice(0, 4);
}

function splitHeadlineAndSource(rawTitle) {
  const title = normalizeWhitespace(rawTitle);
  const dividerIndex = title.lastIndexOf(" - ");
  if (dividerIndex > 0) {
    return {
      headline: normalizeWhitespace(title.slice(0, dividerIndex)),
      source: normalizeWhitespace(title.slice(dividerIndex + 3))
    };
  }
  return {
    headline: title,
    source: ""
  };
}

function stripHtml(html) {
  const $ = cheerio.load(String(html || ""));
  return normalizeWhitespace($.text());
}

function sourceHasKirunaContext(source) {
  const haystack = normalizeWhitespace([source?.title, source?.snippet, source?.domain].join(" ")).toLowerCase();
  return KIRUNA_TOPIC_REGEX.test(haystack);
}

function extractQuestionYears(question) {
  return [...new Set((String(question || "").match(/\b(18|19|20)\d{2}\b/g) || []).map(Number))];
}

function scoreWeakWebSource(question, source) {
  const normalizedQuestion = normalizeWhitespace(question).toLowerCase();
  const queryTokens = [...new Set(getRelevantTokens(question))];
  const questionYears = extractQuestionYears(question);
  const haystack = normalizeWhitespace([source.title, source.snippet, source.domain].join(" ")).toLowerCase();
  const titleText = normalizeWhitespace(source.title).toLowerCase();
  const hasKirunaSignal = KIRUNA_TOPIC_REGEX.test(haystack);
  const hasSwedenSignal = SWEDEN_CONTEXT_REGEX.test(haystack);
  let score = 0;

  if (normalizedQuestion && haystack.includes(normalizedQuestion)) score += 10;
  for (const year of questionYears) {
    if (haystack.includes(String(year))) score += 7;
  }
  for (const token of queryTokens.filter((token) => !/^\d{4}$/.test(token))) {
    if (titleText.includes(token)) score += 4;
    else if (haystack.includes(token)) score += 2;
  }
  if (hasKirunaSignal) score += 12;
  if (hasSwedenSignal) score += 3;
  if (questionHasKirunaContext(question) && !hasKirunaSignal) score -= 12;
  else if (!hasKirunaSignal && !hasSwedenSignal) score -= 8;

  return score;
}

async function requestNewsArticles(query) {
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=SE&ceid=SE:en`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
  let response;
  try {
    response = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`News request failed with status ${response.status}`);
  }
  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];
  $("item").each((_, el) => {
    const rawTitle = normalizeWhitespace($(el).find("title").first().text());
    const link = normalizeWhitespace($(el).find("link").first().text());
    const pubDate = normalizeWhitespace($(el).find("pubDate").first().text());
    const description = normalizeWhitespace(stripHtml($(el).find("description").first().text()));
    const parts = splitHeadlineAndSource(rawTitle);
    if (!link || !parts.headline) return;
    items.push({
      url: link,
      title: parts.headline,
      domain: parts.source || "Google News",
      snippet: description,
      seendate: pubDate
    });
  });
  return items;
}

function decodeDuckDuckGoUrl(url) {
  const raw = String(url || "").replace(/^\/\//, "https://");
  try {
    const parsed = new URL(raw);
    const target = parsed.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : raw;
  } catch {
    return raw;
  }
}

async function requestDuckDuckGoResults(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed with status ${response.status}`);
  }
  const html = await response.text();
  const results = [];
  const anchorRegex = /<a rel="nofollow" class="result__a" href="([^"]+)">([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html))) {
    const href = normalizeWhitespace(match[1] || "");
    const title = normalizeWhitespace(stripHtml(match[2] || ""));
    const decodedUrl = decodeDuckDuckGoUrl(href);
    const nearbyHtml = html.slice(match.index, Math.min(html.length, match.index + 1200));
    const snippetMatch =
      nearbyHtml.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
      nearbyHtml.match(/<div class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = normalizeWhitespace(stripHtml(snippetMatch?.[1] || ""));
    if (!decodedUrl || !title) continue;
    results.push({
      url: decodedUrl,
      title,
      domain: safeDomain(decodedUrl) || "Web",
      snippet
    });
  }
  return results;
}

async function searchWeakWeb(question) {
  const queries = buildNewsQueries(question);
  const seenUrls = new Set();
  const collected = [];

  for (const query of queries) {
    let newsArticles = [];
    let webResults = [];
    try {
      [webResults, newsArticles] = await Promise.all([
        requestDuckDuckGoResults(query),
        requestNewsArticles(query)
      ]);
    } catch {
      try {
        webResults = await requestDuckDuckGoResults(query);
      } catch {
        webResults = [];
      }
      try {
        newsArticles = await requestNewsArticles(query);
      } catch {
        newsArticles = [];
      }
    }
    for (const article of [...webResults, ...newsArticles]) {
      if (!article.url || seenUrls.has(article.url)) continue;
      seenUrls.add(article.url);
      collected.push({
        ...article,
        score: scoreWeakWebSource(question, article)
      });
    }
    if (collected.length >= 20) break;
  }

  const sorted = collected
    .filter((source) => sourceHasKirunaContext(source) && source.score >= (extractQuestionYears(question).length ? 9 : 7))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Number(sourceHasKirunaContext(b)) - Number(sourceHasKirunaContext(a));
    });

  return uniqueBy(sorted, (source) => source.url)
    .slice(0, MAX_WEAK_WEB_SOURCES)
    .map(({ score, ...source }) => source);
}

function buildTokenFrequency(tokens) {
  const freq = new Map();
  tokens.forEach((token) => {
    freq.set(token, (freq.get(token) || 0) + 1);
  });
  return freq;
}

function buildArchiveEntries($) {
  const entries = [];
  const root = $("body");
  let currentHeading = "Kiruna Archive";
  const pageLabelMap = {
    "page-home": "Home",
    "page-archive": "Map",
    "page-timeline2": "Time",
    "page-discourse": "Discourse",
    "page-chat": "Chat"
  };

  root.find("script, style, noscript").remove();
  root.find("#chat-panel, #page-chat, #nav, #toc-panel, #toc-tab, #toc-trigger, #toc-edge-cue, #chat-fab").remove();

  root.find("h1, h2, h3, h4, p, li").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = normalizeWhitespace($(el).text());
    const pageId = $(el).closest(".page").attr("id") || "page-home";
    const sectionRoot = $(el).closest(
      "#home-hero, #home-stats, #tl-anchor, #home-documents, #src-section, .dc-section[id], .cards-section-outer[id], .stats-wrapper[id], .hero-outer[id], .htl-section-outer[id]"
    );
    const sectionId = sectionRoot.attr("id") || "";
    const pageLabel = pageLabelMap[pageId] || "Archive";
    if (!text) return;

    if (/^h[1-4]$/.test(tag)) {
      currentHeading = text;
      return;
    }

    if (text.length < 60) return;
    if (/^(home|map|time|discourse|chat)$/i.test(text)) return;
    if (/^type a question$/i.test(text)) return;

    entries.push({
      heading: currentHeading,
      text,
      pageId,
      sectionId,
      locationLabel: [pageLabel, currentHeading].filter(Boolean).join(" · ")
    });
  });

  return entries;
}

function chunkArchiveEntries(entries) {
  const chunks = [];
  let current = null;

  for (const entry of entries) {
    if (
      !current ||
      current.heading !== entry.heading ||
      current.pageId !== entry.pageId ||
      current.sectionId !== entry.sectionId ||
      current.text.length + entry.text.length > 900
    ) {
      if (current) chunks.push(current);
      current = {
        heading: entry.heading,
        text: entry.text,
        pageId: entry.pageId,
        sectionId: entry.sectionId,
        locationLabel: entry.locationLabel
      };
      continue;
    }

    current.text += " " + entry.text;
  }

  if (current) chunks.push(current);

  return chunks.map((chunk, index) => {
    const headingTokens = tokenize(chunk.heading);
    const bodyTokens = tokenize(chunk.text);
    return {
      id: "archive-" + index,
      index,
      heading: chunk.heading,
      text: chunk.text,
      pageId: chunk.pageId,
      sectionId: chunk.sectionId,
      locationLabel: chunk.locationLabel,
      searchText: normalizeWhitespace(chunk.heading + " " + chunk.text).toLowerCase(),
      headingTokens: new Set(headingTokens),
      tokenFreq: buildTokenFrequency(bodyTokens)
    };
  });
}

async function loadArchiveChunks() {
  const html = await fs.readFile(INDEX_FILE, "utf8");
  const $ = cheerio.load(html);
  const entries = buildArchiveEntries($);
  return chunkArchiveEntries(entries);
}

function scoreArchiveChunk(question, chunk) {
  const normalizedQuestion = normalizeWhitespace(question).toLowerCase();
  const queryTokens = [...new Set(getRelevantTokens(question))];
  const questionYears = extractQuestionYears(question);
  const nonYearTokens = queryTokens.filter((token) => !/^\d{4}$/.test(token));
  const wantsOverview = /\b(what is|overview|summary|tell me about|explain)\b/i.test(question);
  let score = 0;

  if (!queryTokens.length && !questionYears.length) return score;

  if (normalizedQuestion && normalizedQuestion.length >= 8 && chunk.searchText.includes(normalizedQuestion)) {
    score += 14;
  }

  if (questionYears.length) {
    const hasYearMatch = questionYears.some((year) => chunk.searchText.includes(String(year)));
    if (hasYearMatch) score += 18;
    else score -= 14;
  }

  let tokenMatches = 0;
  for (const token of queryTokens) {
    const bodyHits = chunk.tokenFreq.get(token) || 0;
    if (bodyHits) {
      tokenMatches += 1;
      score += 2 + Math.min(bodyHits, 3);
    }
    if (chunk.headingTokens.has(token)) score += 5;
  }

  if (nonYearTokens.length) {
    if (tokenMatches === nonYearTokens.length) score += 8;
    else if (tokenMatches >= Math.min(2, nonYearTokens.length)) score += 4;
    else if (!questionYears.length) score -= 8;
  }

  const importantPhrases = [
    "kiruna",
    "lkab",
    "relocation",
    "mine",
    "city hall",
    "sami",
    "tourism",
    "esrange",
    "deformation"
  ];

  for (const phrase of importantPhrases) {
    const phraseRegex = new RegExp("\\b" + escapeRegExp(phrase) + "\\b", "i");
    if (phraseRegex.test(normalizedQuestion) && phraseRegex.test(chunk.searchText)) {
      score += 3;
    }
  }

  score += Math.max(0, 2 - chunk.index * 0.15);

  if (wantsOverview) {
    score += Math.max(0, 6 - chunk.index * 1.1);
  }

  return score;
}

function sourceMatchesArchiveQuestionYears(hit, questionYears) {
  if (!questionYears.length) return true;
  return questionYears.some((year) =>
    normalizeWhitespace([hit.heading, hit.text].join(" ")).toLowerCase().includes(String(year))
  );
}

function countArchiveTokenMatches(hit, tokens) {
  const haystack = normalizeWhitespace([hit.heading, hit.text].join(" ")).toLowerCase();
  return [...new Set(tokens)].filter((token) => haystack.includes(String(token || "").toLowerCase())).length;
}

function isStrongArchiveHit(question, hit, topScore) {
  const questionYears = extractQuestionYears(question);
  const nonYearTokens = getRelevantTokens(question).filter((token) => !/^\d{4}$/.test(token));
  if (questionYears.length && !sourceMatchesArchiveQuestionYears(hit, questionYears)) return false;
  const tokenMatches = countArchiveTokenMatches(hit, nonYearTokens);
  if (questionYears.length) {
    if (nonYearTokens.length) return hit.score >= 16 && tokenMatches >= Math.min(1, nonYearTokens.length);
    return hit.score >= 16;
  }
  if (nonYearTokens.length) {
    return tokenMatches >= Math.min(2, Math.max(1, nonYearTokens.length)) && hit.score >= 14;
  }
  return hit.score >= Math.max(12, topScore * 0.78);
}

function searchArchive(question, limit = MAX_ARCHIVE_HITS) {
  const scored = archiveChunks
    .map((chunk) => ({
      ...chunk,
      score: scoreArchiveChunk(question, chunk)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const topScore = scored[0].score || 0;
  return scored
    .filter((chunk) => isStrongArchiveHit(question, chunk, topScore))
    .slice(0, limit);
}

function buildArchiveContext(hits) {
  if (!hits.length) {
    return "No strong local archive matches were found for this question.";
  }

  return hits
    .map((hit, index) => {
      return [
        `[Archive excerpt ${index + 1}]`,
        `Section: ${hit.heading}`,
        hit.text
      ].join("\n");
    })
    .join("\n\n");
}

function sanitizeClientArchiveSource(source, index) {
  const title = normalizeWhitespace(
    source?.title || source?.locator?.heading || `Archive source ${index + 1}`
  );
  const snippet = normalizeWhitespace(
    source?.snippet ||
      source?.locator?.highlightText ||
      source?.locator?.matchText ||
      source?.locator?.query ||
      ""
  );
  const answerText = normalizeWhitespace(
    source?.locator?.matchText || source?.locator?.query || source?.snippet || ""
  );

  if (!title || !snippet) return null;

  return {
    kind: "archive",
    sourceType: normalizeWhitespace(source?.sourceType || "text") || "text",
    title,
    domain: normalizeWhitespace(source?.domain || "Kiruna Archive") || "Kiruna Archive",
    url: "",
    snippet: snippet.slice(0, 320),
    locationLabel: normalizeWhitespace(source?.locationLabel || ""),
    locator: source?.locator && typeof source.locator === "object" ? source.locator : null,
    answerText: answerText.slice(0, 1800)
  };
}

function stripSourceAnswerText(source) {
  if (!source) return source;
  const { answerText, ...rest } = source;
  return rest;
}

function buildClientArchiveContext(sources) {
  if (!sources.length) {
    return "No strong client-side archive sources were supplied.";
  }

  return sources
    .map((source, index) => {
      return [
        `[Client archive source ${index + 1}]`,
        `Title: ${source.title}`,
        source.locationLabel ? `Location: ${source.locationLabel}` : "",
        source.answerText
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function buildConversationContext(history) {
  if (!Array.isArray(history) || !history.length) return "No previous conversation.";

  return history
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => {
      const role = turn.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${normalizeWhitespace(turn.text || "")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function needsFreshWebContext(question) {
  return /\b(latest|recent|current|today|now|newest|202[4-9]|this year|updated)\b/i.test(
    question
  );
}

function buildArchiveEnhancementInput(question, history, sources) {
  return [
    "Conversation so far:",
    buildConversationContext(history),
    "",
    "Direct local archive sources selected by the client:",
    buildClientArchiveContext(sources),
    "",
    "User question:",
    question,
    "",
    "Answer requirements:",
    "- Answer only from the provided local archive sources.",
    "- Do not use outside knowledge or web facts.",
    "- If the provided sources only partially answer the question, say so briefly instead of guessing.",
    "- Keep the answer concise, accurate, and easy to verify against the supplied archive sources."
  ].join("\n");
}

function toArchiveSource(hit) {
  return {
    kind: "archive",
    title: hit.heading,
    domain: "Kiruna Archive",
    url: "",
    snippet: hit.text.slice(0, 180),
    locationLabel: hit.locationLabel,
    locator: {
      type: "text",
      pageId: hit.pageId,
      sectionId: hit.sectionId,
      query: hit.text.slice(0, 220),
      heading: hit.heading,
      matchText: hit.text,
      highlightText: hit.text.slice(0, 120),
      queryTokens: tokenize(hit.heading + " " + hit.text).slice(0, 12)
    }
  };
}

function buildArchiveOnlyAnswer(question, hits, reason) {
  if (!hits.length) {
    const suffix = reason
      ? ` ${reason}`
      : "";
    return `I could not find a strong match in the local archive for "${question}".${suffix}`;
  }

  const lead = hits[0];
  const excerpts = hits
    .slice(0, 2)
    .map((hit) => `- ${hit.heading}: ${hit.text.slice(0, 220)}`)
    .join("\n");

  const suffix = reason
    ? ` ${reason}`
    : "";

  return [
    `I answered from the local archive because live web-backed synthesis is not available right now.${suffix}`,
    excerpts,
    "",
    `Question: ${question}`
  ].join("\n");
}

function buildProvidedArchiveAnswer(question, sources, reason) {
  if (!sources.length) {
    const suffix = reason ? ` ${reason}` : "";
    return `I could not find a strong match in the local archive for "${question}".${suffix}`;
  }

  const excerpts = sources
    .slice(0, 2)
    .map((source) => `- ${source.title}: ${source.answerText.slice(0, 220)}`)
    .join("\n");
  const suffix = reason ? ` ${reason}` : "";

  return [
    `I answered from the local archive sources already matched in this archive web.${suffix}`,
    excerpts,
    "",
    `Question: ${question}`
  ].join("\n");
}

function buildLiveModelUnavailableReason() {
  const missing = [];
  if (!process.env.ARK_API_KEY) missing.push("ARK_API_KEY");
  if (!MODEL) missing.push("ARK_MODEL or ARK_ENDPOINT_ID");

  if (!missing.length) {
    return "The Ark live-answer client is not available right now.";
  }

  return `Add ${missing.join(" and ")} to enable live Ark web-backed answers.`;
}

function modelSupportsReasoning(model) {
  const normalized = normalizeWhitespace(model).toLowerCase();
  if (!normalized) return false;
  return /\b(r1|reason|thinking)\b/.test(normalized);
}

function buildResponsesUserInput(text) {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: normalizeWhitespace(text)
        }
      ]
    }
  ];
}

function buildResponsesRequest(model, overrides = {}) {
  const request = {
    model,
    ...overrides
  };

  if (modelSupportsReasoning(model)) {
    request.reasoning = { effort: "low" };
  }

  return request;
}

function getErrorMessage(error) {
  return normalizeWhitespace(
    error?.message ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.error?.message ||
      ""
  );
}

function isWebSearchUnavailableError(error) {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) return false;
  return (
    message.includes("has not activated web search") ||
    message.includes("cc_content_plugin")
  );
}

function extractResponseText(response) {
  const directText = normalizeWhitespace(response?.output_text || "");
  if (directText) return directText;

  const segments = [];

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      const text = normalizeWhitespace(content?.text || "");
      if (text) segments.push(text);
    }

    for (const part of item?.summary || []) {
      const text = normalizeWhitespace(part?.text || "");
      if (text) segments.push(text);
    }

    for (const block of item?.blocks || []) {
      const text = normalizeWhitespace(block?.text || "");
      if (text) segments.push(text);
    }
  }

  return normalizeWhitespace(segments.join("\n\n"));
}

function extractWebSources(response) {
  const sources = [];

  for (const item of response.output || []) {
    const actionSources = item?.action?.sources;
    if (Array.isArray(actionSources)) {
      for (const source of actionSources) {
        if (!source?.url) continue;
        if (isBlockedWebDomain(source.url)) continue;
        sources.push({
          kind: "web",
          title: source.title || safeDomain(source.url) || "Web source",
          domain: safeDomain(source.url) || "Web",
          url: source.url,
          snippet: normalizeWhitespace(source.snippet || source.excerpt || "")
        });
      }
    }

    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        if (annotation?.type !== "url_citation" || !annotation?.url) continue;
        if (isBlockedWebDomain(annotation.url)) continue;
        sources.push({
          kind: "web",
          title:
            annotation.title ||
            annotation.site_name ||
            safeDomain(annotation.url) ||
            "Web source",
          domain: annotation.site_name || safeDomain(annotation.url) || "Web",
          url: annotation.url,
          snippet: normalizeWhitespace(annotation.summary || "")
        });
      }
    }
  }

  return uniqueBy(sources, (source) => source.url).slice(0, MAX_SOURCE_CARDS);
}

function buildModelInput(question, history, archiveHits) {
  const archiveRule = archiveHits.length
    ? "Strong local archive matches are available. Use them first, and only add web search if they are not sufficient."
    : "No strong local archive matches were found. You should use web search and answer only when you find directly relevant Kiruna-related evidence.";
  const freshnessRule = needsFreshWebContext(question)
    ? "This question explicitly asks for recent or current information, so you should use web search before answering."
    : "Use web search if the local archive context is not sufficient or if current developments would materially improve the answer.";

  return [
    "Conversation so far:",
    buildConversationContext(history),
    "",
    "Local archive context:",
    buildArchiveContext(archiveHits),
    "",
    "User question:",
    question,
    "",
    "Answer requirements:",
    "- Always ground the answer in multiple sources when available.",
    "- Prioritize the local Kiruna archive excerpts when they already answer the question.",
    `- ${archiveRule}`,
    `- ${freshnessRule}`,
    "- Keep the answer concise and factual.",
    "- If you are unsure, say what is uncertain.",
    "- Do not invent dates, figures, quotes, or sources.",
    "- When web search is used, let the built-in citations remain in the answer."
  ].join("\n");
}

function buildArchiveOnlyModelInput(question, history, archiveHits) {
  return [
    "Conversation so far:",
    buildConversationContext(history),
    "",
    "Local archive context:",
    buildArchiveContext(archiveHits),
    "",
    "User question:",
    question,
    "",
    "Answer requirements:",
    "- Answer only from the supplied archive context.",
    "- Do not use outside knowledge or claim web findings.",
    "- If the archive context only partially answers the question, say so briefly.",
    "- Keep the answer concise and factual."
  ].join("\n");
}

async function generateArchiveHitAnswer(question, history, archiveHits) {
  if (!archiveHits.length) {
    return {
      answer: "",
      sources: [],
      mode: "archive-missing",
      used_ai: false
    };
  }

  if (!client || !MODEL) {
    return {
      answer: buildArchiveOnlyAnswer(
        question,
        archiveHits,
        buildLiveModelUnavailableReason()
      ),
      sources: archiveHits.map(toArchiveSource).slice(0, MAX_SOURCE_CARDS),
      mode: "archive-only",
      used_ai: false
    };
  }

  const response = await client.createResponses(
    buildResponsesRequest(MODEL, {
      instructions:
        "You are the Kiruna Archive assistant. Answer only from the provided archive excerpts. Do not use web search or outside facts. If the archive evidence is partial, say so clearly and avoid guessing.",
      input: buildResponsesUserInput(
        buildArchiveOnlyModelInput(question, history, archiveHits)
      )
    })
  );

  if (response?.error?.message) {
    throw new Error(response.error.message);
  }

  const answerText = extractResponseText(response);

  return {
    answer:
      answerText ||
      buildArchiveOnlyAnswer(
        question,
        archiveHits,
        "The model returned an empty answer."
      ),
    sources: archiveHits.map(toArchiveSource).slice(0, MAX_SOURCE_CARDS),
    mode: "archive",
    used_ai: Boolean(answerText)
  };
}

async function generateArchiveEnhancedAnswer(question, history, providedSources) {
  const archiveSources = (Array.isArray(providedSources) ? providedSources : [])
    .map((source, index) => sanitizeClientArchiveSource(source, index))
    .filter(Boolean)
    .slice(0, MAX_SOURCE_CARDS);

  if (!archiveSources.length) {
    return {
      answer: "",
      sources: [],
      mode: "archive-missing",
      used_ai: false
    };
  }

  if (!client || !MODEL) {
    return {
      answer: buildProvidedArchiveAnswer(
        question,
        archiveSources,
        buildLiveModelUnavailableReason()
      ),
      sources: archiveSources.map(stripSourceAnswerText),
      mode: "archive-only",
      used_ai: false
    };
  }

  const response = await client.createResponses(
    buildResponsesRequest(MODEL, {
      instructions:
        "You are the Kiruna Archive assistant. Answer only from the provided archive excerpts. Do not use web search or outside facts. If the local evidence is partial, say so clearly and avoid guessing.",
      input: buildResponsesUserInput(
        buildArchiveEnhancementInput(question, history, archiveSources)
      )
    })
  );

  if (response?.error?.message) {
    throw new Error(response.error.message);
  }

  const answerText = extractResponseText(response);

  return {
    answer:
      answerText ||
      buildProvidedArchiveAnswer(
        question,
        archiveSources,
        "The model returned an empty answer."
      ),
    sources: archiveSources.map(stripSourceAnswerText),
    mode: "archive-enhanced",
    used_ai: Boolean(answerText)
  };
}

async function generateAnswer(question, history, archiveHits) {
  if (!client || !MODEL) {
    return {
      answer: buildArchiveOnlyAnswer(
        question,
        archiveHits,
        buildLiveModelUnavailableReason()
      ),
      sources: archiveHits.map(toArchiveSource).slice(0, MAX_SOURCE_CARDS),
      mode: "archive-only",
      used_ai: false
    };
  }

  let response;
  try {
    response = await client.createResponses(
      buildResponsesRequest(MODEL, {
        instructions:
          "You are the Kiruna Archive assistant. Help users understand Kiruna, LKAB, urban relocation, heritage, mining, public discourse, Sami land questions, and related topics. Prefer the supplied archive context when it is enough. If you use web search, stay tightly anchored to Kiruna or directly connected LKAB/Norrbotten developments rather than broad Sweden news. Cite multiple sources when possible and never fabricate facts or sources.",
        tools: [
          {
            type: "web_search",
            user_location: {
              type: "approximate",
              country: "SE",
              region: "Norrbotten",
              city: "Kiruna"
            }
          }
        ],
        tool_choice: "auto",
        input: buildResponsesUserInput(buildModelInput(question, history, archiveHits))
      })
    );
  } catch (error) {
    if (isWebSearchUnavailableError(error)) {
      if (archiveHits.length) {
        const archiveResult = await generateArchiveHitAnswer(question, history, archiveHits);
        return {
          ...archiveResult,
          error_detail: getErrorMessage(error),
          web_search_unavailable: true
        };
      }
      return {
        answer: "",
        sources: [],
        mode: "web-search-unavailable",
        used_ai: false,
        error_detail: getErrorMessage(error),
        web_search_unavailable: true
      };
    }
    throw error;
  }

  if (response?.error?.message) {
    throw new Error(response.error.message);
  }

  const webSources = extractWebSources(response);
  const archiveSources = archiveHits.map(toArchiveSource);
  const sources = uniqueBy([...webSources, ...archiveSources], (source) => {
    return source.url || `${source.kind}:${source.title}:${source.snippet}`;
  }).slice(0, MAX_SOURCE_CARDS);

  const answerText = extractResponseText(response);

  return {
    answer: answerText || buildArchiveOnlyAnswer(question, archiveHits, "The model returned an empty answer."),
    sources,
    mode: webSources.length ? "hybrid" : "archive",
    used_ai: Boolean(answerText),
    error_detail: undefined,
    web_search_unavailable: false
  };
}

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
    archiveChunks: archiveChunks.length
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
    const safeSources = sources
      .map((source, index) => sanitizeClientArchiveSource(source, index))
      .filter(Boolean)
      .slice(0, MAX_SOURCE_CARDS);
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

    return res.json({
      answer: result.answer,
      sources: result.sources,
      mode: result.mode,
      used_ai: result.used_ai
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

try {
  archiveChunks = await loadArchiveChunks();
} catch (error) {
  console.error("Failed to build archive chunks:", error);
  archiveChunks = [];
}

app.listen(PORT, () => {
  console.log(`Kiruna chat server running on http://localhost:${PORT}`);
});
