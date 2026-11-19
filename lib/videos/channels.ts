import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/**
 * Official-institution YouTube channels (content/videos.yaml). Like
 * content/sources.yaml, a channel is used only when it is listed here with a
 * licence note and `active: true`.
 */
const ChannelSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    /** One of channelId / handle / username identifies the channel. */
    channelId: z
      .string()
      .regex(/^UC[A-Za-z0-9_-]{22}$/)
      .optional(),
    handle: z.string().startsWith("@").optional(),
    username: z.string().optional(),
    /** YouTube's own title for the channel must be one of these, or it is skipped. */
    expect_titles: z.array(z.string().min(1)).min(1),
    license_note: z.string().min(10),
    active: z.boolean().default(true),
  })
  .refine((c) => Boolean(c.channelId || c.handle || c.username), {
    message: "a channel needs a channelId, handle or username",
  });
export type VideoChannel = z.infer<typeof ChannelSchema>;

let cache: VideoChannel[] | null = null;

export function loadVideoChannels(): VideoChannel[] {
  cache ??= z.array(ChannelSchema).parse(
    (
      parse(readFileSync(join(process.cwd(), "content", "videos.yaml"), "utf8")) as {
        channels?: unknown;
      }
    ).channels ?? [],
  );
  return cache;
}

export function channelName(id: string): string {
  return loadVideoChannels().find((c) => c.id === id)?.name ?? id;
}
