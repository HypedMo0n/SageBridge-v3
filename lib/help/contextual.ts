// Reusable mapping from an application error/status to the Help Center
// article that explains it. Used so error and status displays can link
// straight to the relevant article instead of leaving a customer stuck.
// Deliberately conservative: unrecognized input resolves to null rather
// than a guessed article.

const CODE_MAP: Record<string, string> = {
  'network/unreachable': 'could-not-reach-sagebridge',
  'auth/session-ended': 'sign-in-problems',
  COMPANY_REQUIRED: 'no-company-available',
};

const KEYWORD_MAP: Array<[RegExp, string]> = [
  [/pairing/i, 'pairing-failed'],
  [/sage\s*50.*(not|couldn'?t|unable).*detect/i, 'sage-50-not-detected'],
  [/offline|reach|connector/i, 'connector-offline'],
];

/**
 * Resolve a known API error code, or (failing that) keyword-match a raw
 * message, to a Help Center slug. Returns null when nothing matches -
 * callers should omit the "Get help" link rather than showing a wrong one.
 */
export function contextualHelpSlug(hint: { code?: string | null; message?: string | null } | string | null | undefined): string | null {
  const { code, message } = typeof hint === 'string' ? { code: null, message: hint } : hint || {};
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  const text = message || '';
  for (const [pattern, slug] of KEYWORD_MAP) if (pattern.test(text)) return slug;
  return null;
}

export const CONNECTOR_STATUS_HELP_SLUG = 'connector-offline';
export const PROVISIONING_FAILED_HELP_SLUG = 'sync-failed';
export const NO_COMPANY_HELP_SLUG = 'no-company-available';
