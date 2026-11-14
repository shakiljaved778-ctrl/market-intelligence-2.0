/**
 * Upper bound on one provider request. A provider that stops answering must not
 * hold a scheduled job until the platform kills it (the macro job hit Vercel's
 * 60 s limit on 14 Nov with no per-request limit). A timed-out request is a
 * failed request: the job skips that item and serves the last stored value.
 */
export const PROVIDER_TIMEOUT_MS = 10_000;
