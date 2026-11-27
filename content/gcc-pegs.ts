import { QAR_PER_USD } from "@/lib/currency/peg";

/**
 * GCC currency pegs (pre-launch brief §5). These are official policy rates set
 * by each central bank, not market quotes, and they change only by a policy
 * decision. Shown as reference with the central bank named; review if a
 * central bank ever announces a change.
 */
export interface GccPeg {
  code: string;
  currency: string;
  /** Units of local currency per 1 USD, or null for a basket peg. */
  perUsd: number | null;
  regime: string;
  authority: string;
  since: number;
}

export const GCC_PEGS: readonly GccPeg[] = [
  {
    code: "SAR",
    currency: "Saudi riyal",
    perUsd: 3.75,
    regime: "Fixed to the US dollar",
    authority: "Saudi Central Bank (SAMA)",
    since: 1986,
  },
  {
    code: "AED",
    currency: "UAE dirham",
    perUsd: 3.6725,
    regime: "Fixed to the US dollar",
    authority: "Central Bank of the UAE",
    since: 1997,
  },
  {
    code: "QAR",
    currency: "Qatari riyal",
    perUsd: QAR_PER_USD,
    regime: "Fixed to the US dollar",
    authority: "Qatar Central Bank",
    since: 2001,
  },
  {
    code: "BHD",
    currency: "Bahraini dinar",
    perUsd: 0.376,
    regime: "Fixed to the US dollar",
    authority: "Central Bank of Bahrain",
    since: 2001,
  },
  {
    code: "OMR",
    currency: "Omani rial",
    perUsd: 0.3845,
    regime: "Fixed to the US dollar",
    authority: "Central Bank of Oman",
    since: 1986,
  },
  {
    code: "KWD",
    currency: "Kuwaiti dinar",
    perUsd: null,
    regime: "Pegged to an undisclosed basket of currencies",
    authority: "Central Bank of Kuwait",
    since: 2007,
  },
];
