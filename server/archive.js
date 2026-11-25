import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import vm from "node:vm";
import {
  INDEX_FILE, TIMELINE_FILE, ARCHIVE_DATA_FILE, OUTSIDE_DATA_FILE, MAX_ARCHIVE_HITS
} from "./config.js";
import { normalizeWhitespace, tokenize, escapeRegExp, needsFreshWebContext } from "./shared.js";
import { getRelevantTokens, extractQuestionYears } from "./web.js";

let archiveChunks = [];
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

  root.find("h1, h2, h3, h4, p, li, .sec-title, .sub, .src-title, .src-group-label, .dc-h2, .dc-p, .dc-chart-title, .dc-chart-desc").each((_, el) => {
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

function buildTimelineFrameEntries($) {
  const entries = [];
  const root = $("body");
  let currentHeading = "Time";

  root.find("script, style, noscript").remove();

  root.find("h1, h2, h3, h4, p, li, .cph-title, .peb-evt-title, .txt-title, .txt-label, .dc-chart-title, .dc-chart-desc, .eyebrow, .ribbon-label").each((_, el) => {
    const text = normalizeWhitespace($(el).text());
    if (!text) return;
    const isHeading =
      /^h[1-4]$/i.test(el.tagName || "") ||
      $(el).is(".cph-title, .peb-evt-title, .txt-title, .txt-label");
    if (isHeading) {
      currentHeading = text;
      if (text.length < 18) return;
    }
    if (text.length < (isHeading ? 18 : 36)) return;
    if (/^(overview|calendar|inside map|outside map|viewing)$/i.test(text)) return;
    const sectionRoot = $(el).closest("[id], .peb-era-block, .txt-col, .dtl-col");
    const sectionId = sectionRoot.attr("id") || "";
    entries.push({
      heading: currentHeading,
      text,
      pageId: "page-timeline2",
      sectionId,
      locationLabel: ["Time", "Inside Map", currentHeading].filter(Boolean).join(" · ")
    });
  });

  return entries;
}

function buildInsideEventEntries({ EVENTS }) {
  return EVENTS.map(ev => ({
      heading: ev.title,
      text: [ev.year, ev.loc, ev.desc, ...(ev.tags || []), ...(ev.stakeholders || [])].filter(Boolean).join(" · "),
      pageId: "page-archive",
      sectionId: `inside-event-${ev.id}`,
      locationLabel: `Map · ${ev.year}`,
      sourceType: "event",
      eventId: ev.id,
      year: ev.year
    }));
}

function buildTimelineOutsideEntries({ RAW: rawDocs, FIELD_META: fieldMeta }) {
  const monthMap = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12
  };

  const getYear = (rawDate) => {
    const parts = String(rawDate || "").replace(/[~]/g, "").trim().split(/\s+/);
    return Number(parts.length === 2 ? parts[1] : parts[0]) || null;
  };

  return rawDocs
        .map((row) => {
          const rawDate = normalizeWhitespace(row?.[0] || "");
          const title = normalizeWhitespace(row?.[1] || "");
          const actor = normalizeWhitespace(row?.[2] || "");
          const field = normalizeWhitespace(row?.[3] || "");
          const label = normalizeWhitespace(row?.[4] || "");
          const desc = normalizeWhitespace(row?.[5] || "");
          if (!title || !rawDate) return null;
          const monthToken = String(rawDate).toLowerCase().split(/\s+/)[0];
          const year = getYear(rawDate);
          return {
            heading: title,
            text: [rawDate, actor, field, label, desc].filter(Boolean).join(" · "),
            pageId: "page-timeline2",
            sectionId: `outside-doc-${row[7]}`,
            locationLabel: ["Time", "Outside Map", rawDate].filter(Boolean).join(" · "),
            sourceType: "outside-doc",
            docIdx: row[7],
            year,
            month: monthMap[monthToken] || 0,
            fieldColor: fieldMeta?.[field]?.color || "#86868b"
          };
        })
        .filter(Boolean);
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
        locationLabel: entry.locationLabel,
        sourceType: entry.sourceType || "text",
        eventId: entry.eventId ?? null,
        docIdx: entry.docIdx ?? null,
        year: entry.year ?? null
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
      sourceType: chunk.sourceType || "text",
      eventId: chunk.eventId ?? null,
      docIdx: chunk.docIdx ?? null,
      year: chunk.year ?? null,
      searchText: normalizeWhitespace(chunk.heading + " " + chunk.text).toLowerCase(),
      headingTokens: new Set(headingTokens),
      tokenFreq: buildTokenFrequency(bodyTokens)
    };
  });
}

async function loadArchiveChunks() {
  const [html, timelineHtml, archiveDataScript, outsideDataScript] = await Promise.all([
    fs.readFile(INDEX_FILE, "utf8"),
    fs.readFile(TIMELINE_FILE, "utf8"),
    fs.readFile(ARCHIVE_DATA_FILE, "utf8"),
    fs.readFile(OUTSIDE_DATA_FILE, "utf8")
  ]);
  const context = { window: {} };
  vm.runInNewContext(archiveDataScript, context, { filename: ARCHIVE_DATA_FILE, timeout: 1000 });
  vm.runInNewContext(outsideDataScript, context, { filename: OUTSIDE_DATA_FILE, timeout: 1000 });
  const archiveData = context.window.KirunaArchiveData;
  const outsideData = context.window.KirunaOutsideData;
  const outsideIds = outsideData?.RAW?.map(row => row[7]);
  if (!Array.isArray(archiveData?.EVENTS) || !Array.isArray(outsideIds) ||
      outsideIds.some(id => !Number.isInteger(id) || id < 1) ||
      new Set(outsideIds).size !== outsideIds.length) {
    throw new Error("Archive event data has missing or duplicate stable IDs.");
  }
  const entries = [
    ...buildInsideEventEntries(archiveData),
    ...buildArchiveEntries(cheerio.load(html)),
    ...buildTimelineFrameEntries(cheerio.load(timelineHtml)),
    ...buildTimelineOutsideEntries(outsideData)
  ];
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

function isReliableArchiveHit(question, hit, topScore) {
  const questionYears = extractQuestionYears(question);
  const nonYearTokens = getRelevantTokens(question).filter((token) => !/^\d{4}$/.test(token));
  if (questionYears.length && !sourceMatchesArchiveQuestionYears(hit, questionYears)) return false;
  const tokenMatches = countArchiveTokenMatches(hit, nonYearTokens);
  if (questionYears.length) {
    if (nonYearTokens.length) return hit.score >= 12 && tokenMatches >= 1;
    return hit.score >= 12;
  }
  if (needsFreshWebContext(question)) {
    return hit.score >= Math.max(14, topScore * 0.72) && tokenMatches >= Math.min(2, Math.max(1, nonYearTokens.length || 1));
  }
  if (tokenMatches >= 1 && hit.score >= 10) return true;
  return hit.score >= Math.max(11, topScore * 0.62);
}

function searchArchive(question, limit = MAX_ARCHIVE_HITS, options = {}) {
  const scored = archiveChunks
    .map((chunk) => ({
      ...chunk,
      score: scoreArchiveChunk(question, chunk)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];

  const topScore = scored[0].score || 0;
  const strongHits = scored
    .filter((chunk) => isStrongArchiveHit(question, chunk, topScore))
    .slice(0, limit);
  if (strongHits.length || options.allowFallback !== true) {
    return strongHits;
  }
  return scored
    .filter((chunk) => isReliableArchiveHit(question, chunk, topScore))
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

async function initializeArchiveChunks() {
  try {
    archiveChunks = await loadArchiveChunks();
  } catch (error) {
    console.error("Failed to build archive chunks:", error);
    archiveChunks = [];
  }
}

function archiveChunkCount() {
  return archiveChunks.length;
}

export {
  initializeArchiveChunks, archiveChunkCount, searchArchive, buildArchiveContext,
  sanitizeClientArchiveSource, stripSourceAnswerText, buildClientArchiveContext
};
