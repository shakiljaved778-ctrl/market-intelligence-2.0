import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendIssue } from "./newsletter";

const issue = { name: "Mizaan Morning 2026-11-28", subject: "s", text: "t", html: "h" };
type Call = { url: string; method: string; body: Record<string, unknown> | null };

function stub(handler: (c: Call) => Response) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { method?: string; body?: string }) => {
      const c = {
        url,
        method: init.method ?? "GET",
        body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null,
      };
      calls.push(c);
      return handler(c);
    }),
  );
  return calls;
}

beforeEach(() => {
  process.env.RESEND_API_KEY = "k";
  process.env.RESEND_AUDIENCE_ID = "aud";
  delete process.env.NEWSLETTER_DRYRUN;
  delete process.env.NEWSLETTER_ENABLED;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_AUDIENCE_ID;
});

describe("sendIssue (Mizaan Morning)", () => {
  it("creates and sends one broadcast to the subscriber list", async () => {
    const calls = stub((c) =>
      c.method === "GET" ? Response.json({ data: [] }) : Response.json({ id: "b1" }),
    );
    expect(await sendIssue(issue)).toEqual({ sent: true, mode: "broadcast", id: "b1" });
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toMatchObject({
      segment_id: "aud",
      send: true,
      name: issue.name,
    });
  });

  it("never sends the same day's issue twice", async () => {
    const calls = stub(() => Response.json({ data: [{ name: issue.name }] }));
    expect(await sendIssue(issue)).toEqual({ sent: false, reason: "already_sent" });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("falls back to audience_id if segment_id is refused", async () => {
    const calls = stub((c) => {
      if (c.method === "GET") return Response.json({ data: [] });
      return c.body?.segment_id
        ? new Response("unknown field", { status: 422 })
        : Response.json({ id: "b2" });
    });
    expect((await sendIssue(issue)).sent).toBe(true);
    expect(calls.filter((c) => c.method === "POST").at(-1)?.body).toMatchObject({
      audience_id: "aud",
    });
  });

  it("dry run sends only to the editor's inbox", async () => {
    process.env.NEWSLETTER_DRYRUN = "1";
    process.env.CONTACT_INBOX = "editor@example.com";
    const calls = stub(() => Response.json({ id: "e1" }));
    expect(await sendIssue(issue)).toMatchObject({ sent: true, mode: "dryrun" });
    expect(calls.map((c) => c.url)).toEqual(["https://api.resend.com/emails"]);
    delete process.env.CONTACT_INBOX;
  });
});
