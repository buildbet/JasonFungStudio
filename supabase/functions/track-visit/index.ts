import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ANALYTICS_ALLOWED_ORIGINS") || "https://jasonfung.studio,https://www.jasonfung.studio")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const integer = (value: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function approximateLocation(request: Request) {
  const headerCountry = text(request.headers.get("cf-ipcountry") || request.headers.get("x-country-code"), 2).toUpperCase();
  const result = { country_code: headerCountry || null, country: null as string | null, region: null as string | null, city: null as string | null };
  const token = Deno.env.get("IPINFO_TOKEN");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!token || !forwarded || !/^[0-9a-f:.]+$/i.test(forwarded)) return result;

  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(forwarded)}/json?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(1200)
    });
    if (!response.ok) return result;
    const data = await response.json();
    return {
      country_code: text(data.country, 2).toUpperCase() || result.country_code,
      country: text(data.country_name || data.country, 80) || null,
      region: text(data.region, 100) || null,
      city: text(data.city, 100) || null
    };
  } catch (_) {
    return result;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers });
  if (origin && !allowedOrigins.includes(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers });
  if (Number(request.headers.get("content-length") || 0) > 16_384) return Response.json({ error: "Payload too large" }, { status: 413, headers });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceRoleKey) {
    try {
      const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      serviceRoleKey = secretKeys.default || "";
    } catch (_) {}
  }
  if (!supabaseUrl || !serviceRoleKey) return Response.json({ error: "Server is not configured" }, { status: 500, headers });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (_) {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const event = text(body.event, 30);
  const visitorId = text(body.visitor_id, 50);
  const sessionId = text(body.session_id, 100);
  const pageviewId = text(body.pageview_id, 50);
  const pagePath = text(body.page_path, 1000);
  if (!['page_view', 'engagement', 'custom_event'].includes(event) || !validUuid(visitorId) || !sessionId || !validUuid(pageviewId) || !pagePath.startsWith('/')) {
    return Response.json({ error: "Invalid event" }, { status: 422, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const [{ data: existing }, { data: existingVisitor }] = await Promise.all([
    supabase.from("analytics_sessions").select("session_id,pageviews").eq("session_id", sessionId).maybeSingle(),
    supabase.from("analytics_visitors").select("visitor_id,visits").eq("visitor_id", visitorId).maybeSingle()
  ]);

  if (!existing) {
    const location = await approximateLocation(request);
    let referrerHost = "";
    try { referrerHost = body.referrer_url ? new URL(text(body.referrer_url, 1000)).hostname : ""; } catch (_) {}
    const startedAt = text(body.session_started_at, 40);
    const session = {
      visitor_id: visitorId,
      session_id: sessionId,
      started_at: /^\d{4}-\d{2}-\d{2}T/.test(startedAt) ? startedAt : now,
      last_seen_at: now,
      duration_seconds: integer(body.session_duration_seconds, 0, 86400),
      pageviews: event === "page_view" ? 1 : 0,
      entry_page: pagePath,
      exit_page: pagePath,
      referrer_url: text(body.referrer_url, 1000) || null,
      referrer_host: referrerHost || null,
      source: text(body.source, 80) || "direct",
      medium: text(body.medium, 80) || "none",
      campaign: text(body.campaign, 120) || null,
      content: text(body.content, 120) || null,
      term: text(body.term, 120) || null,
      device_type: text(body.device_type, 20) || null,
      browser: text(body.browser, 40) || null,
      os: text(body.os, 40) || null,
      language: text(body.language, 20) || null,
      timezone: text(body.timezone, 80) || null,
      ...location
    };
    const { error } = await supabase.from("analytics_sessions").insert(session);
    if (error) return Response.json({ error: "Session write failed" }, { status: 500, headers });

    const visitorUpdate = {
      visitor_id: visitorId,
      first_seen_at: now,
      last_seen_at: now,
      visits: 1,
      first_source: session.source,
      first_medium: session.medium,
      first_campaign: session.campaign,
      latest_source: session.source,
      latest_medium: session.medium,
      latest_campaign: session.campaign,
      device_type: session.device_type,
      browser: session.browser,
      os: session.os,
      country_code: session.country_code,
      country: session.country,
      region: session.region,
      city: session.city
    };
    if (existingVisitor) {
      const { first_seen_at: _firstSeen, first_source: _firstSource, first_medium: _firstMedium, first_campaign: _firstCampaign, ...returningUpdate } = visitorUpdate;
      await supabase.from("analytics_visitors").update({ ...returningUpdate, visits: Number(existingVisitor.visits || 0) + 1 }).eq("visitor_id", visitorId);
    } else {
      await supabase.from("analytics_visitors").insert(visitorUpdate);
    }
  }

  if (event === "page_view") {
    const { data: inserted, error } = await supabase.from("analytics_pageviews").upsert({
      pageview_id: pageviewId,
      session_id: sessionId,
      page_path: pagePath,
      page_title: text(body.page_title, 300) || null,
      viewport_width: integer(body.viewport_width, 0, 10000),
      viewport_height: integer(body.viewport_height, 0, 10000),
      screen_width: integer(body.screen_width, 0, 10000),
      screen_height: integer(body.screen_height, 0, 10000)
    }, { onConflict: "pageview_id", ignoreDuplicates: true }).select("pageview_id").maybeSingle();
    if (error) return Response.json({ error: "Pageview write failed" }, { status: 500, headers });
    if (existing && inserted) {
      await supabase.from("analytics_sessions").update({
        pageviews: Number(existing.pageviews || 0) + 1,
        exit_page: pagePath,
        last_seen_at: now
      }).eq("session_id", sessionId);
    }
    if (inserted) {
      await supabase.from("analytics_events").insert({
        event_id: pageviewId,
        visitor_id: visitorId,
        session_id: sessionId,
        pageview_id: pageviewId,
        event_name: "page_view",
        event_label: text(body.page_title, 300) || null,
        page_path: pagePath,
        occurred_at: now
      });
    }
  } else if (event === "engagement") {
    const duration = integer(body.duration_seconds, 0, 86400);
    const active = integer(body.active_seconds, 0, 86400);
    const scroll = integer(body.max_scroll, 0, 100);
    await Promise.all([
      supabase.from("analytics_pageviews").update({
        updated_at: now,
        duration_seconds: duration,
        active_seconds: Math.min(active, duration),
        max_scroll: scroll
      }).eq("pageview_id", pageviewId).eq("session_id", sessionId),
      supabase.from("analytics_sessions").update({
        last_seen_at: now,
        duration_seconds: integer(body.session_duration_seconds, 0, 86400),
        exit_page: pagePath
      }).eq("session_id", sessionId)
    ]);
  } else {
    const eventId = text(body.event_id, 50);
    const eventName = text(body.event_name, 50);
    const allowedEvents = new Set([
      "video_play", "video_pause", "video_progress", "video_watch", "video_complete",
      "form_start", "reserve_cta_click", "reserve_submit", "confirmation_view", "contact_channel_click",
      "section_view"
    ]);
    if (!validUuid(eventId) || !allowedEvents.has(eventName)) {
      return Response.json({ error: "Invalid custom event" }, { status: 422, headers });
    }
    const rawMetadata = body.event_metadata && typeof body.event_metadata === "object" ? body.event_metadata as Record<string, unknown> : {};
    const metadata = {
      progress: integer(rawMetadata.progress, 0, 100),
      video_time: integer(rawMetadata.video_time, 0, 86400),
      video_duration: integer(rawMetadata.video_duration, 0, 86400),
      watch_seconds: integer(rawMetadata.watch_seconds, 0, 86400),
      channel: text(rawMetadata.channel, 30) || null,
      section_id: text(rawMetadata.section_id, 80) || null,
      section_name: text(rawMetadata.section_name, 120) || null,
      section_order: integer(rawMetadata.section_order, 0, 999)
    };
    const numericValue = Number(body.event_value);
    const { error } = await supabase.from("analytics_events").upsert({
      event_id: eventId,
      visitor_id: visitorId,
      session_id: sessionId,
      pageview_id: pageviewId,
      event_name: eventName,
      event_label: text(body.event_label, 120) || null,
      event_value: Number.isFinite(numericValue) ? numericValue : null,
      event_metadata: metadata,
      page_path: pagePath,
      occurred_at: now
    }, { onConflict: "event_id", ignoreDuplicates: true });
    if (error) return Response.json({ error: "Event write failed" }, { status: 500, headers });
  }

  await supabase.from("analytics_visitors").update({ last_seen_at: now }).eq("visitor_id", visitorId);

  return Response.json({ ok: true }, { headers: { ...headers, "Cache-Control": "no-store" } });
});
