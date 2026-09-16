import { afterEach, describe, expect, it, vi } from "vitest";
import { checkCronAuth } from "./auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/cron/quotes", { headers });
}

describe("checkCronAuth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a correct bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(checkCronAuth(req({ authorization: "Bearer s3cret" })).ok).toBe(true);
  });

  it("rejects a wrong or missing token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(checkCronAuth(req({ authorization: "Bearer nope" })).ok).toBe(false);
    expect(checkCronAuth(req()).ok).toBe(false);
  });

  it("is open in local dev when no secret is set", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("VERCEL", "");
    expect(checkCronAuth(req()).ok).toBe(true);
  });

  it("refuses an unconfigured secret in a deployed Vercel env", () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("VERCEL", "1");
    expect(checkCronAuth(req()).ok).toBe(false);
  });
});
