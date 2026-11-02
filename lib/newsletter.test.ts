import { describe, expect, it } from "vitest";
import { isValidEmail, rateLimited, signToken, verifyToken } from "./newsletter";

describe("newsletter tokens", () => {
  it("round-trips a signed confirm token", () => {
    const t = signToken("User@Example.com", "confirm", "footer");
    const data = verifyToken(t);
    expect(data?.action).toBe("confirm");
    expect(data?.email).toBe("user@example.com");
    expect(data?.source).toBe("footer");
  });

  it("rejects a tampered token", () => {
    const t = signToken("a@b.com", "unsub");
    expect(verifyToken(t + "x")).toBeNull();
    expect(verifyToken("garbage")).toBeNull();
    const [enc] = t.split(".");
    expect(verifyToken(`${enc}.deadbeef`)).toBeNull();
  });
});

describe("isValidEmail", () => {
  it("accepts well-formed and rejects malformed addresses", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
});

describe("rateLimited", () => {
  it("allows up to the limit then blocks", () => {
    const ip = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(rateLimited(ip, 5)).toBe(false);
    expect(rateLimited(ip, 5)).toBe(true);
  });
});
