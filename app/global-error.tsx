"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{ background: "#0C0E11", color: "#E8EAED", fontFamily: "sans-serif" }}
      >
        <div style={{ padding: 80, textAlign: "center" }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong.</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #2A2F36",
              background: "transparent",
              color: "#E8EAED",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
