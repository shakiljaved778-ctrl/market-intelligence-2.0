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
          background: "#0C0E11",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "2px solid #2A2F36",
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
                background: "#5D5FEF",
              }}
            />
          </div>
          <div style={{ display: "flex", color: "#E8EAED", fontSize: 34 }}>
            <span>miza</span>
            <span style={{ color: "#5D5FEF" }}>n</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ color: "#6B7280", fontSize: 22, letterSpacing: 1 }}>
            {kicker}
          </div>
          <div
            style={{ color: "#E8EAED", fontSize: 60, lineHeight: 1.1, maxWidth: 960 }}
          >
            {title}
          </div>
        </div>
        <div style={{ color: "#6B7280", fontSize: 20 }}>
          Computed from market data — not AI-written analysis.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
