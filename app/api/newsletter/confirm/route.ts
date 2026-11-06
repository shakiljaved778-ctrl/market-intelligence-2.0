import { NextResponse } from "next/server";
import { confirmSubscription, verifyToken } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

// Double opt-in confirmation (§6): the link in the confirmation email.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const data = verifyToken(token);
  if (!data || data.action !== "confirm") {
    return NextResponse.redirect(`${SITE_URL}/newsletter?state=invalid`);
  }
  const ok = await confirmSubscription(data.email, data.source);
  return NextResponse.redirect(
    `${SITE_URL}/newsletter?state=${ok ? "confirmed" : "error"}`,
  );
}
