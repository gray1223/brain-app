import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // Fetch the page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let html: string;
    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BrainSpace/1.0; +https://brainspace.app)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      html = await response.text();
    } catch {
      // If fetch fails, return minimal data
      return NextResponse.json({
        title: parsedUrl.hostname,
        description: null,
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`,
        image: null,
      });
    } finally {
      clearTimeout(timeout);
    }

    // Parse meta tags from HTML
    const title = extractMeta(html, [
      { attr: "property", value: "og:title" },
      { attr: "name", value: "twitter:title" },
    ]) ?? extractTitle(html) ?? parsedUrl.hostname;

    const description = extractMeta(html, [
      { attr: "property", value: "og:description" },
      { attr: "name", value: "twitter:description" },
      { attr: "name", value: "description" },
    ]);

    const image = extractMeta(html, [
      { attr: "property", value: "og:image" },
      { attr: "name", value: "twitter:image" },
    ]);

    // Resolve relative image URLs
    const resolvedImage = image ? resolveUrl(image, parsedUrl.origin) : null;

    // Get favicon
    const favicon = extractFavicon(html, parsedUrl.origin);

    return NextResponse.json({
      title: title.slice(0, 500),
      description: description ? description.slice(0, 1000) : null,
      favicon,
      image: resolvedImage,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

function extractMeta(
  html: string,
  selectors: { attr: string; value: string }[]
): string | null {
  for (const { attr, value } of selectors) {
    // Match meta tags with content attribute, handling both orderings
    const pattern1 = new RegExp(
      `<meta[^>]*${attr}=["']${escapeRegex(value)}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const pattern2 = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${escapeRegex(value)}["']`,
      "i"
    );

    const match = html.match(pattern1) ?? html.match(pattern2);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function extractFavicon(html: string, origin: string): string {
  // Look for link rel="icon" or rel="shortcut icon"
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i,
    /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrl(match[1], origin);
    }
  }

  // Fallback to Google's favicon service
  try {
    const hostname = new URL(origin).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

function resolveUrl(url: string, origin: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}
