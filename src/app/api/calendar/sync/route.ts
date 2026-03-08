import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;

    if (!providerToken) {
      return NextResponse.json(
        {
          error:
            "No Google OAuth token found. Please sign in with Google to sync your calendar.",
        },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: providerToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: threeMonthsAgo.toISOString(),
      timeMax: threeMonthsFromNow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 500,
    });

    const googleEvents = response.data.items ?? [];
    let upsertCount = 0;

    for (const event of googleEvents) {
      if (!event.id || !event.summary) continue;

      const startTime =
        event.start?.dateTime || `${event.start?.date}T00:00:00Z`;
      const endTime =
        event.end?.dateTime || `${event.end?.date}T23:59:59Z`;
      const allDay = !event.start?.dateTime;

      const { error } = await supabase.from("calendar_events").upsert(
        {
          user_id: user.id,
          google_event_id: event.id,
          title: event.summary,
          description: event.description || null,
          start_time: startTime,
          end_time: endTime,
          all_day: allDay,
          color: event.colorId ? mapGoogleColor(event.colorId) : null,
          synced_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,google_event_id",
        }
      );

      if (!error) upsertCount++;
    }

    return NextResponse.json({
      success: true,
      synced: upsertCount,
      total: googleEvents.length,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}

function mapGoogleColor(colorId: string): string {
  const colors: Record<string, string> = {
    "1": "#7986cb",
    "2": "#33b679",
    "3": "#8e24aa",
    "4": "#e67c73",
    "5": "#f6bf26",
    "6": "#f4511e",
    "7": "#039be5",
    "8": "#616161",
    "9": "#3f51b5",
    "10": "#0b8043",
    "11": "#d50000",
  };
  return colors[colorId] || "#3b82f6";
}
