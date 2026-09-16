/**
 * Per-exchange trading session logic (§13). Uses IANA time zones via Intl so
 * DST is handled correctly. GCC exchanges have no reliable free intraday feed,
 * so they are treated as EOD-only and always labelled delayed (§6).
 */
export type SessionState = "open" | "pre" | "post" | "closed" | "eod";

export interface SessionInfo {
  state: SessionState;
  label: string;
  /** True when prices for this exchange must carry an explicit delay note. */
  delayed: boolean;
}

interface ExchangeHours {
  tz: string;
  open: [number, number]; // [hour, minute] local
  close: [number, number];
  /** EOD-only rail (GCC): never "live". */
  eodOnly?: boolean;
  /** Trades every day (crypto). */
  alwaysOpen?: boolean;
}

const EXCHANGES: Record<string, ExchangeHours> = {
  NASDAQ: { tz: "America/New_York", open: [9, 30], close: [16, 0] },
  NYSE: { tz: "America/New_York", open: [9, 30], close: [16, 0] },
  LSE: { tz: "Europe/London", open: [8, 0], close: [16, 30] },
  XETRA: { tz: "Europe/Berlin", open: [9, 0], close: [17, 30] },
  TSE: { tz: "Asia/Tokyo", open: [9, 0], close: [15, 0] },
  QSE: { tz: "Asia/Qatar", open: [9, 30], close: [13, 15], eodOnly: true },
  TADAWUL: { tz: "Asia/Riyadh", open: [10, 0], close: [15, 0], eodOnly: true },
  DFM: { tz: "Asia/Dubai", open: [10, 0], close: [15, 0], eodOnly: true },
  ADX: { tz: "Asia/Dubai", open: [10, 0], close: [15, 0], eodOnly: true },
  CRYPTO: { tz: "UTC", open: [0, 0], close: [23, 59], alwaysOpen: true },
};

function localParts(tz: string, now: Date): { minutes: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  return { minutes: hour * 60 + minute, weekday };
}

/** Weekend by exchange region. GCC markets trade Sun–Thu; the rest Mon–Fri. */
function isWeekend(weekday: number, gcc: boolean): boolean {
  if (gcc) return weekday === 5 || weekday === 6; // Fri, Sat
  return weekday === 0 || weekday === 6; // Sun, Sat
}

export function sessionFor(
  exchange: string | null,
  now: Date = new Date(),
): SessionInfo {
  const key = (exchange ?? "").toUpperCase();
  const hours = EXCHANGES[key];
  if (!hours) {
    return { state: "closed", label: "Session unknown", delayed: true };
  }
  if (hours.alwaysOpen) {
    return { state: "open", label: "24/7", delayed: false };
  }

  const { minutes, weekday } = localParts(hours.tz, now);
  const gcc = Boolean(hours.eodOnly);
  const openMin = hours.open[0] * 60 + hours.open[1];
  const closeMin = hours.close[0] * 60 + hours.close[1];
  const withinHours =
    !isWeekend(weekday, gcc) && minutes >= openMin && minutes < closeMin;

  if (hours.eodOnly) {
    return {
      state: "eod",
      label: withinHours ? "EOD · trading (delayed)" : "EOD · prior close",
      delayed: true,
    };
  }
  if (isWeekend(weekday, gcc))
    return { state: "closed", label: "Closed · weekend", delayed: false };
  if (minutes < openMin) return { state: "pre", label: "Pre-market", delayed: false };
  if (minutes >= closeMin)
    return { state: "post", label: "After hours", delayed: false };
  return { state: "open", label: "Open", delayed: false };
}
