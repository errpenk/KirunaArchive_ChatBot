import { BLOCKED_WEB_DOMAINS } from "./config.js";
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
const TOKEN_ALIASES = {
  raddit: "reddit",
  redddit: "reddit",
  redit: "reddit",
  subreddits: "subreddit",
  twiter: "twitter",
  tweets: "twitter",
  tweet: "twitter",
  xcom: "twitter",
  discource: "discourse",
  discussion: "discourse",
  discussions: "discourse",
  dataset: "data",
  datasets: "data",
  statistic: "data",
  statistics: "data",
  stats: "data",
  records: "data",
  replies: "reply",
  replys: "reply",
  posts: "post"
};
const TOKEN_EXPANSIONS = {
  reddit: ["reddit", "subreddit", "subreddits", "reply", "post", "discussion"],
  subreddit: ["subreddit", "subreddits", "reddit"],
  twitter: ["twitter", "post", "reply", "discourse"],
  discourse: ["discourse", "analysis", "sentiment", "keyword", "discussion"],
  data: ["data", "analysis", "records", "sentiment", "keyword"],
  reply: ["reply", "replies", "discussion"],
  post: ["post", "posts"]
};
const KIRUNA_TOPIC_REGEX = /\b(kiruna|kirunavaara|lkab|norrbotten|geijer)\b/i;
const SWEDEN_CONTEXT_REGEX = /\b(sweden|swedish|sverige|swiden|sami|sapmi)\b/i;

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canonicalizeToken(token) {
  const lowered = String(token || "").toLowerCase();
  return TOKEN_ALIASES[lowered] || lowered;
}

function expandToken(token) {
  const canonical = canonicalizeToken(token);
  return [canonical].concat(TOKEN_EXPANSIONS[canonical] || []);
}

function tokenize(value) {
  const baseTokens = normalizeWhitespace(value)
    .toLowerCase()
    .replace(/\bx\/twitter\b/g, " twitter ")
    .replace(/\btwitter\/x\b/g, " twitter ")
    .replace(/\bx\b/g, " twitter ")
    .replace(/\br\/\b/g, " reddit ")
    .split(/[^a-z0-9]+/i)
    .map(canonicalizeToken)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
  const expanded = [];
  for (const token of baseTokens) {
    for (const nextToken of expandToken(token)) {
      if (nextToken.length > 2 && !STOPWORDS.has(nextToken)) {
        expanded.push(nextToken);
      }
    }
  }
  return expanded;
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

function getSourceTargetKey(source) {
  if (source?.url) return `url:${source.url}`;
  const locator = source?.locator || {};
  if (locator.type === "event") {
    return `event:${locator.pageId || "page-timeline2"}:${String(locator.eventId ?? source?.title ?? "")}`;
  }
  if (locator.type === "outside-doc") {
    return `outside:${locator.pageId || "page-timeline2"}:${String(locator.docIdx ?? source?.title ?? "")}`;
  }
  const pageId = locator.pageId || source?.pageId || "page-home";
  const sectionId = locator.sectionId || source?.sectionId || "";
  if (sectionId) return `text:${pageId}:${sectionId}`;
  const heading = normalizeWhitespace(locator.heading || source?.title || source?.heading || "").toLowerCase();
  return `text:${pageId}:${heading || "page-root"}`;
}

function needsFreshWebContext(question) {
  return /\b(latest|recent|current|today|now|newest|202[4-9]|this year|updated)\b/i.test(
    question
  );
}

export {
  KIRUNA_CONTEXT_TOKENS, KIRUNA_TOPIC_REGEX, SWEDEN_CONTEXT_REGEX,
  normalizeWhitespace, tokenize, escapeRegExp, safeDomain,
  isBlockedWebDomain, uniqueBy, getSourceTargetKey, needsFreshWebContext
};
