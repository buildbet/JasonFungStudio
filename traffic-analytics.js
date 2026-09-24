(() => {
  "use strict";

  const config = window.JFS_TRAFFIC_ANALYTICS || {};
  const isConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/track-visit$/i.test(config.endpoint || "")
    && !String(config.endpoint).includes("YOUR_PROJECT_REF")
    && typeof config.supabaseAnonKey === "string"
    && config.supabaseAnonKey.length > 40
    && !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

  if (!isConfigured || navigator.doNotTrack === "1") return;

  const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storageKey = "jfs_traffic_session";
  const sessionMaxAge = 30 * 60 * 1000;
  const now = Date.now();
  let stored = {};

  try {
    stored = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
  } catch (_) {}

  if (!stored.id || !stored.startedAt || now - Number(stored.lastSeenAt || 0) > sessionMaxAge) {
    stored = { id: uuid(), startedAt: now, lastSeenAt: now };
  } else {
    stored.lastSeenAt = now;
  }

  try {
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  } catch (_) {}

  const pageviewId = uuid();
  const pageStartedAt = Date.now();
  let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
  let activeMilliseconds = 0;
  let maxScroll = 0;
  let lastSentActive = -1;
  let lastSentDuration = -1;
  let ending = false;

  const clampText = (value, max = 500) => String(value || "").slice(0, max);
  const query = new URLSearchParams(location.search);
  let referrer = null;
  try {
    referrer = document.referrer ? new URL(document.referrer) : null;
  } catch (_) {}

  const classifySource = () => {
    const explicitSource = clampText(query.get("utm_source"), 80).toLowerCase();
    const explicitMedium = clampText(query.get("utm_medium"), 80).toLowerCase();
    const userAgent = navigator.userAgent || "";
    if (query.get("gclid")) return { source: explicitSource || "google", medium: explicitMedium || "paid" };
    if (query.get("fbclid")) return { source: explicitSource || "meta", medium: explicitMedium || "paid" };
    if (explicitSource) return { source: explicitSource, medium: explicitMedium || "campaign" };
    if (!referrer || referrer.hostname === location.hostname) {
      // Meta's in-app browsers sometimes suppress the HTTP referrer. This
      // fallback keeps those visits out of "Direct" when the browser itself
      // clearly identifies the host app.
      if (/Instagram/i.test(userAgent)) return { source: "instagram", medium: "social" };
      if (/FBAN|FBAV|\[FB_/i.test(userAgent)) return { source: "facebook", medium: "social" };
      return { source: "direct", medium: "none" };
    }

    const host = referrer.hostname.replace(/^www\./, "").toLowerCase();
    if (/(^|\.)google\./.test(host)) return { source: "google", medium: "organic" };
    if (/(^|\.)instagram\.com$/.test(host)) return { source: "instagram", medium: "social" };
    if (/(^|\.)facebook\.com$/.test(host) || host === "l.facebook.com") return { source: "facebook", medium: "social" };
    if (/(^|\.)linkedin\.com$/.test(host)) return { source: "linkedin", medium: "social" };
    if (host === "t.co" || /(^|\.)x\.com$/.test(host)) return { source: "x", medium: "social" };
    if (/(^|\.)bing\.com$/.test(host)) return { source: "bing", medium: "organic" };
    if (/(^|\.)duckduckgo\.com$/.test(host)) return { source: "duckduckgo", medium: "organic" };
    if (/(^|\.)search\.yahoo\.com$/.test(host)) return { source: "yahoo", medium: "organic" };
    return { source: host, medium: "referral" };
  };

  const detectDevice = () => {
    const ua = navigator.userAgent;
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
    return "desktop";
  };

  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua)) return "Opera";
    if (/CriOS|Chrome\//.test(ua)) return "Chrome";
    if (/FxiOS|Firefox\//.test(ua)) return "Firefox";
    if (/Safari\//.test(ua)) return "Safari";
    return "Other";
  };

  const detectOs = () => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return "Windows";
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Mac OS/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Other";
  };

  const source = classifySource();
  const basePayload = {
    session_id: stored.id,
    pageview_id: pageviewId,
    page_path: clampText(location.pathname, 1000),
    page_title: clampText(document.title, 300),
    referrer_url: referrer ? clampText(`${referrer.origin}${referrer.pathname}`, 1000) : "",
    source: source.source,
    medium: source.medium,
    campaign: clampText(query.get("utm_campaign"), 120),
    content: clampText(query.get("utm_content"), 120),
    term: clampText(query.get("utm_term"), 120),
    device_type: detectDevice(),
    browser: detectBrowser(),
    os: detectOs(),
    language: clampText(navigator.language, 20),
    timezone: clampText(Intl.DateTimeFormat().resolvedOptions().timeZone, 80),
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    screen_width: window.screen.width,
    screen_height: window.screen.height
  };

  const visibleActiveSeconds = () => Math.round((activeMilliseconds + (visibleSince === null ? 0 : performance.now() - visibleSince)) / 1000);
  const durationSeconds = () => Math.max(0, Math.round((Date.now() - pageStartedAt) / 1000));
  const sessionDurationSeconds = () => Math.max(0, Math.round((Date.now() - Number(stored.startedAt)) / 1000));

  const transmit = (eventName, extra = {}) => {
    const payload = JSON.stringify({ event: eventName, ...basePayload, ...extra });
    return fetch(config.endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`
      },
      body: payload
    }).catch(() => undefined);
  };

  const sendEngagement = (force = false) => {
    const active = visibleActiveSeconds();
    const duration = durationSeconds();
    if (!force && active === lastSentActive && duration - lastSentDuration < 15) return;
    lastSentActive = active;
    lastSentDuration = duration;
    stored.lastSeenAt = Date.now();
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (_) {}
    transmit("engagement", {
      duration_seconds: duration,
      session_duration_seconds: sessionDurationSeconds(),
      active_seconds: active,
      max_scroll: maxScroll
    });
  };

  const updateScroll = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    maxScroll = Math.max(maxScroll, Math.min(100, Math.round((scrollY / scrollable) * 100)));
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && visibleSince !== null) {
      activeMilliseconds += performance.now() - visibleSince;
      visibleSince = null;
      sendEngagement(true);
    } else if (document.visibilityState === "visible" && visibleSince === null) {
      visibleSince = performance.now();
    }
  });

  addEventListener("scroll", updateScroll, { passive: true });
  addEventListener("pagehide", () => {
    if (ending) return;
    ending = true;
    if (visibleSince !== null) {
      activeMilliseconds += performance.now() - visibleSince;
      visibleSince = null;
    }
    sendEngagement(true);
  });

  transmit("page_view", {
    session_started_at: new Date(Number(stored.startedAt)).toISOString()
  });
  setInterval(() => sendEngagement(false), 15000);
})();
