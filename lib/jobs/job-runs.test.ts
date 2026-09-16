import { describe, expect, it, vi } from "vitest";
import { runJob, type JobOutcome, type JobRecorder } from "./job-runs";

class FakeRecorder implements JobRecorder {
  started: string[] = [];
  finished: { outcome: JobOutcome; error?: string }[] = [];
  async start(job: string): Promise<number | null> {
    this.started.push(job);
    return 1;
  }
  async finish(
    _id: number | null,
    fields: {
      itemsIn?: number;
      itemsOut?: number;
      outcome: JobOutcome;
      error?: string;
    },
  ): Promise<void> {
    this.finished.push({ outcome: fields.outcome, error: fields.error });
  }
}

describe("runJob", () => {
  it("records a start and an ok finish on success", async () => {
    const rec = new FakeRecorder();
    const result = await runJob(
      "quotes",
      async () => ({ itemsIn: 3, itemsOut: 3 }),
      rec,
    );

    expect(rec.started).toEqual(["quotes"]);
    expect(rec.finished).toEqual([{ outcome: "ok", error: undefined }]);
    expect(result.outcome).toBe("ok");
    expect(result.itemsOut).toBe(3);
  });

  it("records an error finish and rethrows on failure (§8 forced-failure path)", async () => {
    const rec = new FakeRecorder();
    const boom = vi.fn(async () => {
      throw new Error("forced failure for quotes");
    });

    await expect(runJob("quotes", boom, rec)).rejects.toThrow("forced failure");
    expect(rec.finished).toEqual([
      { outcome: "error", error: "forced failure for quotes" },
    ]);
  });
});
