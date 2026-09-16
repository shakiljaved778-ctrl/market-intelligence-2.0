import { cookies } from "next/headers";
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCY,
  isDisplayCurrency,
  type DisplayCurrency,
} from "./peg";

/**
 * Read the display currency from the cookie in a Server Component (§7), so
 * figures render server-side in the right currency with no client flash.
 */
export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const store = await cookies();
  const value = store.get(CURRENCY_COOKIE)?.value;
  return isDisplayCurrency(value) ? value : DEFAULT_CURRENCY;
}
