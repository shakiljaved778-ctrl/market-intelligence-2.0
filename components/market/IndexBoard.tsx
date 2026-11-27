import Link from "next/link";
import { ChangePill } from "@/components/market/ChangePill";
import { readIndexBoard, type BoardCard } from "@/lib/market/board";
import { getDisplayCurrency } from "@/lib/currency/server";
import { compactStamp, stampText } from "@/lib/market/provenance";

/**
 * Index board — the row of market cards across the top of every page (owner
 * request, 2026-11-27): S&P 500, Nasdaq 100, Dow Jones and Russell 2000 (each
 * via the ETF that tracks it, labelled so), gold, the 10-year yield, oil,
 * Bitcoin and EUR/USD. Every card prints its own source and time; a card with
 * no stored value is not drawn, and with nothing stored the board is absent.
 *
 * Fixed height (BOARD_HEIGHT) so the streamed board never shifts the page; the
 * layout reserves the same height while it loads.
 */
export const BOARD_HEIGHT_CLASS = "h-[76px]";

function Card({ card }: { card: BoardCard }) {
  const body = (
    <span
      className="border-hairline bg-surface flex h-[60px] min-w-[150px] flex-col justify-center rounded-[10px] border px-3"
      title={stampText(card.stamp) ?? undefined}
    >
      <span className="flex items-baseline gap-1.5">
        <span className="text-ink text-[13px] font-semibold">{card.label}</span>
        {card.via ? <span className="text-ink-3 text-[10px]">{card.via}</span> : null}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="tnum text-ink text-[15px] font-semibold">{card.value}</span>
        <ChangePill pct={card.changePct} className="text-[12px] font-medium" />
      </span>
      <span className="text-ink-3 truncate text-[10px]">
        {compactStamp(card.stamp)}
      </span>
    </span>
  );
  return card.href ? (
    <Link href={card.href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export async function IndexBoard() {
  const cards = await readIndexBoard(await getDisplayCurrency());
  if (cards.length === 0) return null;
  return (
    <nav
      aria-label="Markets at a glance"
      className={`border-hairline bg-surface-2 border-b ${BOARD_HEIGHT_CLASS}`}
    >
      <ul className="mx-auto flex h-full max-w-[1320px] snap-x items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {cards.map((card) => (
          <li key={card.key} className="shrink-0 snap-start">
            <Card card={card} />
          </li>
        ))}
        <li className="shrink-0 pr-2">
          <Link href="/markets" className="text-ink-3 hover:text-ink text-[12px]">
            All markets →
          </Link>
        </li>
      </ul>
    </nav>
  );
}
