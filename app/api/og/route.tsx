import { ImageResponse } from "next/og";

// Dynamic OG image. Terminal-Night canvas, capital-M mark (◆ signal vertex),
// editorial title. Brand system, not a stock photo. Title + kicker from query.
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
            "radial-gradient(60% 80% at 82% 2%, #16213a 0%, transparent 60%), #0a0d12",
          padding: "72px",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* capital-M mark with ◆ signal vertex */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M4.4 20 V5 L12 12.6 L19.6 5 V20"
              stroke="#eceef1"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="9.8"
              y="10.4"
              width="4.4"
              height="4.4"
              rx="0.5"
              transform="rotate(45 12 12.6)"
              fill="#e8a93b"
            />
          </svg>
          <div
            style={{
              display: "flex",
              color: "#eceef1",
              fontSize: 34,
              letterSpacing: 8,
              fontFamily: "serif",
              fontWeight: 600,
            }}
          >
            MIZAAN
          </div>
          <div
            style={{
              color: "#868d98",
              fontSize: 18,
              letterSpacing: 3,
              marginLeft: 4,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            Intelligence
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#7fa6ff",
              fontSize: 22,
              letterSpacing: 1,
              fontFamily: "sans-serif",
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              color: "#eceef1",
              fontSize: 62,
              lineHeight: 1.08,
              maxWidth: 980,
              fontWeight: 600,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ color: "#868d98", fontSize: 20, fontFamily: "sans-serif" }}>
          Signal-ranked market intelligence · computed rankings, cited sources.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
