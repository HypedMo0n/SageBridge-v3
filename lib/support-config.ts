// Contact Support configuration.
//
// Audit result: no authoritative support email or ticketing URL exists in
// any repository yet. Set NEXT_PUBLIC_SUPPORT_EMAIL and/or
// NEXT_PUBLIC_SUPPORT_URL once one is chosen - until then Contact Support
// shows an honest "not yet configured" state instead of a fabricated one.
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
export const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || '';
export const SUPPORT_CONFIGURED = Boolean(SUPPORT_EMAIL || SUPPORT_URL);
