const intents = new Set(['events', 'dues', 'announcements', 'volunteering', 'leadership', 'help']);

function isSafeAssistantHref(value) {
  return typeof value === 'string' && /^#\/[a-z0-9/_-]*$/i.test(value);
}

/**
 * Convert an untrusted Edge Function payload into values that are safe to render.
 * @param {unknown} value
 * @returns {import('../types/assistant').AssistantReply}
 */
export function normalizeAssistantReply(value) {
  const data = value && typeof value === 'object' ? value : {};
  const candidate = /** @type {Record<string, unknown>} */ (data);
  const citations = Array.isArray(candidate.citations)
    ? candidate.citations.flatMap((citation) => {
      if (!citation || typeof citation !== 'object') return [];
      const item = /** @type {Record<string, unknown>} */ (citation);
      return typeof item.label === 'string' && isSafeAssistantHref(item.href)
        ? [{ label: item.label, href: item.href }]
        : [];
    })
    : [];

  return {
    answer: typeof candidate.answer === 'string' ? candidate.answer : '',
    citations,
    suggestedActions: Array.isArray(candidate.suggestedActions)
      ? candidate.suggestedActions.filter((action) => typeof action === 'string')
      : [],
    conversationId: typeof candidate.conversationId === 'string' ? candidate.conversationId : '',
    intent: typeof candidate.intent === 'string' && intents.has(candidate.intent)
      ? /** @type {import('../types/assistant').AssistantIntent} */ (candidate.intent)
      : 'help',
  };
}

/**
 * Read a Functions error response when possible without cloning an already-used body.
 * @param {Response | undefined} response
 * @returns {Promise<{ error?: string, details?: string } | null>}
 */
export async function readAssistantError(response) {
  if (!response || response.bodyUsed) return null;
  try {
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') return null;
    const candidate = /** @type {Record<string, unknown>} */ (payload);
    return {
      ...(typeof candidate.error === 'string' ? { error: candidate.error } : {}),
      ...(typeof candidate.details === 'string' ? { details: candidate.details } : {}),
    };
  } catch {
    return null;
  }
}
