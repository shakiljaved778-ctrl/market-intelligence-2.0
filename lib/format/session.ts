/**
 * Per-exchange trading session logic. Uses IANA time zones via Intl so DST is
 * handled correctly. The state describes the EXCHANGE's regular hours — whether
 * it is open right now — independently of how delayed our own feed for it is
 * (`delayed` carries that). Public holidays are not modelled; the UI says so.
 */
export type SessionState = "open" | "pre" | "post" | "closed";

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
  /** Non-trading weekdays, 0 = Sunday … 6 = Saturday. */
  weekend: number[];
  /** Our data for this venue is end-of-day only. */
  eodOnly?: boolean;
  /** Trades every day (crypto). */
  alwaysOpen?: boolean;
}

const SAT_SUN = [6, 0];
const FRI_SAT = [5, 6];

const EXCHANGES: Record<string, ExchangeHours> = {
  NASDAQ: { tz: "America/New_York", open: [9, 30], close: [16, 0], weekend: SAT_SUN },
  NYSE: { tz: "America/New_York", open: [9, 30], close: [16, 0], weekend: SAT_SUN },
  LSE: { tz: "Europe/London", open: [8, 0], close: [16, 30], weekend: SAT_SUN },
  XETRA: { tz: "Europe/Berlin", open: [9, 0], close: [17, 30], weekend: SAT_SUN },
  TSE: { tz: "Asia/Tokyo", open: [9, 0], close: [15, 30], weekend: SAT_SUN },
  // Qatar and Saudi Arabia trade Sunday–Thursday.
  QSE: {
    tz: "Asia/Qatar",
    open: [9, 30],
    close: [13, 15],
    weekend: FRI_SAT,
    eodOnly: true,
  },
  TADAWUL: {
    tz: "Asia/Riyadh",
    open: [10, 0],
    close: [15, 0],
    weekend: FRI_SAT,
    eodOnly: true,
  },
  // The UAE exchanges moved to a Monday–Friday week in January 2022.
  DFM: {
    tz: "Asia/Dubai",
    open: [10, 0],
    close: [15, 0],
    weekend: SAT_SUN,
    eodOnly: true,
  },
  ADX: {
    tz: "Asia/Dubai",
    open: [10, 0],
    close: [15, 0],
    weekend: SAT_SUN,
    eodOnly: true,
  },
  CRYPTO: { tz: "UTC", open: [0, 0], close: [23, 59], weekend: [], alwaysOpen: true },
};

interface Local {
  year: number;
  month: number;
  day: number;
  minutes: number;
  weekday: number;
}

function localParts(tz: string, now: Date): Local {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    minutes: hour * 60 + Number(get("minute")),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd),
  };
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
    return { state: "open", label: "Open 24/7", delayed: false };
  }

  const { minutes, weekday } = localParts(hours.tz, now);
  const delayed = Boolean(hours.eodOnly);
  const openMin = hours.open[0] * 60 + hours.open[1];
  const closeMin = hours.close[0] * 60 + hours.close[1];

  if (hours.weekend.includes(weekday))
    return { state: "closed", label: "Closed · weekend", delayed };
  if (minutes < openMin) return { state: "pre", label: "Before the open", delayed };
  if (minutes >= closeMin)
    return { state: "post", label: "Closed for the day", delayed };
  return { state: "open", label: "Open", delayed };
}

/**
 * Session state plus minutes to the next relevant boundary (close when open,
 * open when before the open), for the header market-status pill. etaMin is null
 * when there's no same-day boundary (closed / after the close / 24-7).
 */
export function marketCountdown(
  exchange: string,
  now: Date = new Date(),
): { state: SessionState; label: string; etaMin: number | null } {
  const info = sessionFor(exchange, now);
  const hours = EXCHANGES[(exchange ?? "").toUpperCase()];
  if (!hours || hours.alwaysOpen) {
    return { state: info.state, label: info.label, etaMin: null };
  }
  const { minutes } = localParts(hours.tz, now);
  const openMin = hours.open[0] * 60 + hours.open[1];
  const closeMin = hours.close[0] * 60 + hours.close[1];
  if (info.state === "open")
    return { state: info.state, label: info.label, etaMin: closeMin - minutes };
  if (info.state === "pre")
    return { state: info.state, label: info.label, etaMin: openMin - minutes };
  return { state: info.state, label: info.label, etaMin: null };
}

/** UTC instant of a wall-clock time in a zone, on that zone's calendar day. */
function zonedToUtc(
  tz: string,
  y: number,
  m: number,
  d: number,
  minutes: number,
): Date {
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const l = localParts(tz, new Date(guess));
  const asLocal = Date.UTC(
    l.year,
    l.month - 1,
    l.day,
    Math.floor(l.minutes / 60),
    l.minutes % 60,
  );
  return new Date(guess - (asLocal - guess));
}

export interface SessionTimes {
  /** Today's regular open and close for the venue, as UTC instants. */
  open: Date;
  close: Date;
  /** The venue's own time zone (IANA). */
  tz: string;
  /** Trading days, e.g. "Sun–Thu". */
  days: string;
}

/**
 * The venue's regular open and close on its current calendar day, as instants a
 * client can format in the reader's own time zone and in Doha time. Null for
 * unknown venues and 24/7 markets.
 */
export function sessionTimes(
  exchange: string,
  now: Date = new Date(),
): SessionTimes | null {
  const hours = EXCHANGES[(exchange ?? "").toUpperCase()];
  if (!hours || hours.alwaysOpen) return null;
  const l = localParts(hours.tz, now);
  const openMin = hours.open[0] * 60 + hours.open[1];
  const closeMin = hours.close[0] * 60 + hours.close[1];
  return {
    open: zonedToUtc(hours.tz, l.year, l.month, l.day, openMin),
    close: zonedToUtc(hours.tz, l.year, l.month, l.day, closeMin),
    tz: hours.tz,
    days: hours.weekend.includes(5) ? "Sun–Thu" : "Mon–Fri",
  };
}
