import { NextResponse } from "next/server";
import { unsubscribe, verifyToken } from "@/lib/newsletter";
import { SITE_URL } from "@/lib/site";

// One-click unsubscribe (§6): the link in every briefing email.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const data = verifyToken(token);
  if (!data) {
    return NextResponse.redirect(`${SITE_URL}/newsletter?state=invalid`);
  }
  await unsubscribe(data.email);
  return NextResponse.redirect(`${SITE_URL}/newsletter?state=unsubscribed`);
}

// RFC 8058 one-click unsubscribe (List-Unsubscribe-Post) hits this with POST.
export const POST = GET;
