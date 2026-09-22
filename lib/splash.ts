/**
 * Shared by the client splash component and the server-rendered head script.
 *
 * It lives in its own module with no "use client" directive on purpose: a
 * const exported from a client module reaches a server component as a client
 * reference, not as its value, so interpolating it into the inline script
 * would silently emit a stub instead of the key.
 */
export const SPLASH_KEY = "bandobast-splash";
