import * as cheerio from "cheerio";
import { MAX_WEAK_WEB_SOURCES } from "./config.js";
import {
  KIRUNA_CONTEXT_TOKENS, KIRUNA_TOPIC_REGEX, SWEDEN_CONTEXT_REGEX,
  normalizeWhitespace, tokenize, safeDomain, uniqueBy
} from "./shared.js";
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

export { getRelevantTokens, extractQuestionYears, searchWeakWeb };
