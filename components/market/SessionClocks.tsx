"use client";

import { useEffect, useState } from "react";
import { sessionFor, sessionTimes } from "@/lib/format/session";

/**
 * Per-exchange session clocks. Each card shows whether the venue is open and
 * its regular open and close — in Doha time (the house timezone) and in the
 * reader's own time. State is computed from each venue's regular hours and
 * re-evaluated every 30 seconds in the browser.
 *
 * The server renders with the request time passed in (`nowIso`), so the first
 * paint is correct and identical on server and client; the reader's local time
 * line is added after mount, when the browser's zone is known.
 */
const VENUES: { code: string; label: string }[] = [
  { code: "QSE", label: "Qatar · QSE" },
  { code: "TADAWUL", label: "Saudi · Tadawul" },
  { code: "ADX", label: "Abu Dhabi · ADX" },
  { code: "DFM", label: "Dubai · DFM" },
  { code: "NYSE", label: "New York" },
  { code: "LSE", label: "London" },
  { code: "TSE", label: "Tokyo" },
];

function hm(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function SessionClocks({ nowIso }: { nowIso: string }) {
  const [now, setNow] = useState<Date>(() => new Date(nowIso));
  const [localZone, setLocalZone] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    try {
      // An explicit locale: some environments report a default locale tag that
      // Intl rejects, and the zone does not depend on the locale anyway.
      setLocalZone(new Intl.DateTimeFormat("en-GB").resolvedOptions().timeZone);
    } catch {
      setLocalZone(null);
    }
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const showLocal = localZone !== null && localZone !== "Asia/Qatar";

  return (
    <div data-volatile>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {VENUES.map((v) => {
          const s = sessionFor(v.code, now);
          const t = sessionTimes(v.code, now);
          const open = s.state === "open";
          return (
            <div key={v.code} className="card min-w-0 p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-text-mid text-[12px]">{v.label}</div>
                {open ? <span className="live-dot" aria-hidden /> : null}
              </div>
              <div
                className={`mt-2 text-[13px] ${open ? "dir-gain" : "text-text-low"}`}
              >
                {s.label}
              </div>
              {t ? (
                <dl className="text-text-low mt-2 space-y-0.5 text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt>Doha time</dt>
                    <dd className="tnum text-text-mid">
                      {hm(t.open, "Asia/Qatar")}–{hm(t.close, "Asia/Qatar")}
                    </dd>
                  </div>
                  {showLocal ? (
                    <div className="flex justify-between gap-2">
                      <dt>Your time</dt>
                      <dd className="tnum text-text-mid">
                        {hm(t.open)}–{hm(t.close)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2">
                    <dt>Trading days</dt>
                    <dd className="text-text-mid">{t.days}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-text-low mt-2 text-[11px]">
        Regular trading hours. Public holidays and half-days are not reflected.
      </p>
    </div>
  );
}
