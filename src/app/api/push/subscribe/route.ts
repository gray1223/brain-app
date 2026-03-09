import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();

  if (!subscription || !subscription.endpoint) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 }
    );
  }

  // Store subscription in user's preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
  const existingSubs = (prefs.push_subscriptions as unknown[]) ?? [];

  // Check if this subscription already exists
  const subString = JSON.stringify(subscription);
  const alreadyExists = existingSubs.some(
    (s) => JSON.stringify(s) === subString
  );

  if (!alreadyExists) {
    existingSubs.push(subscription);
  }

  await supabase
    .from("profiles")
    .update({
      preferences: {
        ...prefs,
        push_subscriptions: existingSubs,
        push_enabled: true,
      },
    })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = (profile?.preferences as Record<string, unknown>) ?? {};
  const existingSubs = (prefs.push_subscriptions as Record<string, unknown>[]) ?? [];

  const filtered = existingSubs.filter(
    (s) => (s as { endpoint?: string }).endpoint !== endpoint
  );

  await supabase
    .from("profiles")
    .update({
      preferences: {
        ...prefs,
        push_subscriptions: filtered,
        push_enabled: filtered.length > 0,
      },
    })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
