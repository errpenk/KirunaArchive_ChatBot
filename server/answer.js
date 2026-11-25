import { ARK_API_KEY, MODEL, MAX_HISTORY_TURNS, MAX_SOURCE_CARDS, client } from "./config.js";
import {
  normalizeWhitespace, tokenize, safeDomain, isBlockedWebDomain, uniqueBy, getSourceTargetKey
} from "./shared.js";
import {
  buildArchiveContext, sanitizeClientArchiveSource, stripSourceAnswerText, buildClientArchiveContext
} from "./archive.js";
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

function containsCjk(value) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(String(value || ""));
}

function detectResponseLanguage(question) {
  const text = normalizeWhitespace(question).toLowerCase();
  if (containsCjk(text)) return "zh";
  const italianMatches =
    text.match(
      /\b(il|lo|la|gli|le|un|uno|una|che|chi|come|dove|quando|quale|quali|per|con|senza|sono|sei|siamo|voglio|vorrei|mostra|dimmi|trova|spiega|recenti|ultimi|ultime|relazione|spostamento|discorso|dati|mappa|tempo|fuori|archivio)\b/g
    ) || [];
  if (italianMatches.length >= 2 || /[àèéìòù]/.test(text)) {
    return "it";
  }
  return "en";
}

function localizeForQuestion(question, messages) {
  const language = detectResponseLanguage(question);
  return messages[language] || messages.en;
}

function buildResponseStyleRules(question) {
  const languageInstruction = localizeForQuestion(question, {
    zh: "- The current user question is in Chinese. Answer in Chinese even if earlier turns used another language.",
    it: "- The current user question is in Italian. Answer in Italian even if earlier turns used another language.",
    en: "- The current user question is in English. Answer in English even if earlier turns used another language."
  });
  return [
    languageInstruction,
    "- Answer directly; do not start with meta phrases like 'Based solely on' or 'According to the archive'.",
    "- Keep the answer short, ideally 1-3 sentences unless the question clearly needs more detail."
  ];
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
    "- Keep the answer concise, accurate, and easy to verify against the supplied archive sources.",
    ...buildResponseStyleRules(question)
  ].join("\n");
}

function toArchiveSource(hit) {
  if (hit.sourceType === "event") {
    return {
      kind: "archive",
      sourceType: "event",
      title: hit.heading,
      domain: "Kiruna Archive",
      url: "",
      snippet: hit.text.slice(0, 180),
      locationLabel: hit.locationLabel,
      locator: {
        type: "event",
        pageId: "page-archive",
        eventId: hit.eventId,
        year: hit.year,
        heading: hit.heading,
        query: hit.text.slice(0, 220),
        matchText: hit.text,
        highlightText: hit.text.slice(0, 120),
        queryTokens: tokenize(hit.heading + " " + hit.text).slice(0, 12)
      }
    };
  }
  if (hit.sourceType === "outside-doc") {
    return {
      kind: "archive",
      sourceType: "outside-doc",
      title: hit.heading,
      domain: "Kiruna Web Archive",
      url: "",
      snippet: hit.text.slice(0, 180),
      locationLabel: hit.locationLabel,
      locator: {
        type: "outside-doc",
        pageId: hit.pageId || "page-timeline2",
        docIdx: Number(hit.docIdx) || null,
        year: Number(hit.year) || null,
        query: hit.text.slice(0, 220),
        heading: hit.heading,
        matchText: hit.text,
        highlightText: hit.text.slice(0, 120),
        queryTokens: tokenize(hit.heading + " " + hit.text).slice(0, 12)
      }
    };
  }
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
    return localizeForQuestion(question, {
      zh: "我没有在本地 archive web 里找到足够强的直接匹配。",
      it: "Non ho trovato una corrispondenza diretta abbastanza forte nell'archive web locale.",
      en: "I could not find a strong direct match in the local archive web."
    });
  }

  const lead = hits[0];
  return localizeForQuestion(question, {
    zh: `本地 archive web 里最接近的结果是“${lead.heading}”：${lead.text.slice(0, 180)}`,
    it: `Il risultato più vicino nell'archive web locale è "${lead.heading}": ${lead.text.slice(0, 180)}`,
    en: `The closest match in the local archive web is "${lead.heading}": ${lead.text.slice(0, 180)}`
  });
}

function buildProvidedArchiveAnswer(question, sources, reason) {
  if (!sources.length) {
    return localizeForQuestion(question, {
      zh: "我没有在本地 archive web 里找到足够强的直接匹配。",
      it: "Non ho trovato una corrispondenza diretta abbastanza forte nell'archive web locale.",
      en: "I could not find a strong direct match in the local archive web."
    });
  }

  const lead = sources[0];
  return localizeForQuestion(question, {
    zh: `本地 archive web 的直接命中是“${lead.title}”：${lead.answerText.slice(0, 180)}`,
    it: `La corrispondenza diretta nell'archive web è "${lead.title}": ${lead.answerText.slice(0, 180)}`,
    en: `The direct archive hit in the archive web is "${lead.title}": ${lead.answerText.slice(0, 180)}`
  });
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

function canonicalizeAnswerUnit(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[“”"'`´’]/g, "")
    .replace(/[.,!?;:()[\]{}\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeAnswerText(text) {
  const normalized = String(text || "").trim();
  if (!normalized) return "";

  const units = normalized
    .split(/\n{2,}|(?<=[。！？!?])\s+|(?<=[.?!])\s+/)
    .map((unit) => normalizeWhitespace(unit))
    .filter(Boolean);

  const seen = new Set();
  const deduped = [];
  for (const unit of units) {
    const canonical = canonicalizeAnswerUnit(unit);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    deduped.push(unit);
  }

  return normalizeWhitespace(deduped.join(" "));
}

function extractResponseText(response) {
  const directText = dedupeAnswerText(response?.output_text || "");
  if (directText) return directText;

  const assistantSegments = [];
  const fallbackSegments = [];

  for (const item of response?.output || []) {
    const isAssistantMessage = item?.type === "message" && item?.role === "assistant";
    for (const content of item?.content || []) {
      const text = normalizeWhitespace(content?.text || "");
      if (!text) continue;
      if (isAssistantMessage) assistantSegments.push(text);
      else fallbackSegments.push(text);
    }

    for (const block of item?.blocks || []) {
      const text = normalizeWhitespace(block?.text || "");
      if (!text) continue;
      if (isAssistantMessage) assistantSegments.push(text);
      else fallbackSegments.push(text);
    }
  }

  const preferred = assistantSegments.length ? assistantSegments : fallbackSegments;
  return dedupeAnswerText(preferred.join("\n\n"));
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
    "- When web search is used, let the built-in citations remain in the answer.",
    ...buildResponseStyleRules(question)
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
    "- Keep the answer concise and factual.",
    ...buildResponseStyleRules(question)
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
        "You are the Kiruna Archive assistant. Answer only from the provided archive excerpts. Do not use web search or outside facts. If the archive evidence is partial, say so clearly and avoid guessing. Reply in the user's language and answer directly without meta framing.",
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
  const archiveSources = uniqueBy((Array.isArray(providedSources) ? providedSources : [])
    .map((source, index) => sanitizeClientArchiveSource(source, index))
    .filter(Boolean)
    , (source) => getSourceTargetKey(source)).slice(0, MAX_SOURCE_CARDS);

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
        "You are the Kiruna Archive assistant. Answer only from the provided archive excerpts. Do not use web search or outside facts. If the local evidence is partial, say so clearly and avoid guessing. Reply in the user's language and answer directly without meta framing.",
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
          "You are the Kiruna Archive assistant. Help users understand Kiruna, LKAB, urban relocation, heritage, mining, public discourse, Sami land questions, and related topics. Prefer the supplied archive context when it is enough. If you use web search, stay tightly anchored to Kiruna or directly connected LKAB/Norrbotten developments rather than broad Sweden news. Cite multiple sources when possible and never fabricate facts or sources. Reply in the user's language and answer directly without meta framing.",
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
  const sources = uniqueBy([...webSources, ...archiveSources], (source) => getSourceTargetKey(source))
    .slice(0, MAX_SOURCE_CARDS);

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

export {
  toArchiveSource, buildArchiveOnlyAnswer, buildProvidedArchiveAnswer,
  getErrorMessage, generateArchiveHitAnswer, generateArchiveEnhancedAnswer, generateAnswer
};
