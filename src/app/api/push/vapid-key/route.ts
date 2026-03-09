import { NextResponse } from "next/server";

export async function GET() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 404 }
    );
  }

  return NextResponse.json({ publicKey: vapidKey });
}
