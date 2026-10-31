import { ImageResponse } from "next/og";

// Dynamic OG image (§6). Monochrome canvas, iris dot, editorial title — the
// brand system, not a stock photo. Title comes from ?title=.
export const runtime = "edge";

export function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") ?? "Signal over noise.").slice(0, 120);
  const kicker = url.searchParams.get("kicker") ?? "market intelligence";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(70% 90% at 78% 4%, #3a2616 0%, transparent 60%), #0b0a09",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "2px solid #f5f1ea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#c0875a",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              color: "#f5f1ea",
              fontSize: 34,
              letterSpacing: 6,
              fontFamily: "sans-serif",
            }}
          >
            <span>MIZAA</span>
            <span style={{ color: "#d9a877" }}>N</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ color: "#d9a877", fontSize: 22, letterSpacing: 1 }}>
            {kicker}
          </div>
          <div
            style={{
              color: "#f5f1ea",
              fontSize: 62,
              lineHeight: 1.08,
              maxWidth: 960,
              fontWeight: 700,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ color: "#ada492", fontSize: 20 }}>
          A trusted source for market news & data · computed rankings, cited sources.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
