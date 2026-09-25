import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.JFS_TRAFFIC_ANALYTICS || {};
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.supabaseUrl || "")
  && !String(config.supabaseUrl).includes("YOUR_PROJECT_REF")
  && typeof config.supabaseAnonKey === "string"
  && config.supabaseAnonKey.length > 40
  && !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

const $ = (selector) => document.querySelector(selector);
const setupCard = $("#setup-card");
const authCard = $("#auth-card");
const dashboard = $("#dashboard");
const signOut = $("#sign-out");
const status = $("#dashboard-status");
const layoutUpdateAt = new Date("2026-09-25T12:29:17-04:00").getTime();

if (!configured) {
  setupCard.hidden = false;
} else {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, detectSessionInUrl: true }
  });

  const localDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 29);
  $("#filter-from").value = localDate(fromDate);
  $("#filter-to").value = localDate(toDate);

  const seconds = (value) => {
    const total = Number(value) || 0;
    if (total < 60) return `${total}s`;
    return `${Math.floor(total / 60)}m ${total % 60}s`;
  };

  const shortDate = (value) => value ? new Date(value).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }) : "—";

  const sourceLabel = (source, medium) => {
    if (!source || source === "direct") return "Direct";
    const channel = ({ paid: "Paid", organic: "Organic search", social: "Social", referral: "Referral", campaign: "Campaign" })[medium] || medium || "Unknown";
    return `${source.charAt(0).toUpperCase()}${source.slice(1)} · ${channel}`;
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const setOptions = (select, values, current, mapper = (value) => ({ value, label: value })) => {
    const first = select.options[0];
    select.replaceChildren(first);
    values.forEach((raw) => {
      const item = mapper(raw);
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    select.value = current;
  };

  const renderRanks = (selector, rows, labelKey = "label") => {
    const root = $(selector);
    if (!rows?.length) {
      root.innerHTML = '<p class="empty-state">No traffic in this range.</p>';
      return;
    }
    const max = Math.max(...rows.map((row) => Number(row.sessions) || 0), 1);
    root.innerHTML = rows.map((row) => `<div class="rank-item"><span class="rank-label" title="${escapeHtml(row[labelKey])}">${escapeHtml(row[labelKey])}</span><span class="rank-value">${Number(row.sessions).toLocaleString()}</span><div class="rank-track"><div class="rank-fill" style="width:${Math.max(2, (Number(row.sessions) / max) * 100)}%"></div></div></div>`).join("");
  };

  const renderDashboard = (data) => {
    const metrics = data.metrics || {};
    $("#metric-sessions").textContent = Number(metrics.sessions || 0).toLocaleString();
    $("#metric-pageviews").textContent = Number(metrics.pageviews || 0).toLocaleString();
    $("#metric-active").textContent = seconds(metrics.avg_active_seconds);
    $("#metric-duration").textContent = seconds(metrics.avg_duration_seconds);
    $("#metric-bounce").textContent = `${Number(metrics.bounce_rate || 0)}%`;

    const daily = data.daily || [];
    const maxDaily = Math.max(...daily.map((row) => Number(row.sessions) || 0), 1);
    $("#daily-chart").innerHTML = daily.length ? daily.map((row) => {
      const date = new Date(`${row.day}T00:00:00`);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const height = Math.max(2, (Number(row.sessions) / maxDaily) * 150);
      return `<div class="chart-day" title="${escapeHtml(label)}: ${row.sessions} sessions"><div class="chart-bar" style="height:${height}px"></div><span>${escapeHtml(label)}</span></div>`;
    }).join("") : '<p class="empty-state">No traffic in this range.</p>';
    $("#chart-total").textContent = `${Number(metrics.sessions || 0).toLocaleString()} sessions`;

    renderRanks("#source-list", data.sources);
    renderRanks("#device-list", data.devices);
    renderRanks("#location-list", data.locations);

    const pages = data.pages || [];
    $("#page-list").innerHTML = pages.length ? pages.map((page) => `<div class="page-item"><span class="page-path" title="${escapeHtml(page.label)}">${escapeHtml(page.label)}</span><strong>${Number(page.pageviews).toLocaleString()}</strong><span class="page-meta">${seconds(page.avg_active_seconds)} engaged · ${Number(page.avg_scroll || 0)}% average scroll</span></div>`).join("") : '<p class="empty-state">No page views in this range.</p>';

    const filters = data.filters || {};
    setOptions($("#filter-source"), filters.sources || [], $("#filter-source").value);
    setOptions($("#filter-device"), filters.devices || [], $("#filter-device").value);
    setOptions($("#filter-country"), filters.countries || [], $("#filter-country").value, (item) => ({ value: item.code, label: item.name }));
  };

  const eventNames = {
    page_view: "Viewed page",
    video_play: "Started video",
    video_pause: "Paused video",
    video_progress: "Reached video milestone",
    video_watch: "Watched video",
    video_complete: "Completed video",
    form_start: "Started reserve form",
    reserve_cta_click: "Clicked reserve CTA",
    reserve_submit: "Submitted reservation",
    confirmation_view: "Reached confirmation page",
    contact_channel_click: "Selected contact channel",
    section_view: "Reached section"
  };

  const renderJourneys = (rows = []) => {
    $("#journey-total").textContent = `${rows.length.toLocaleString()} visitors`;
    const renderJourney = (row) => {
      const id = String(row.visitor_id || "");
      const shortId = id.slice(-6).toUpperCase();
      const progress = Number(row.video_progress || 0);
      return `<button class="journey-row" type="button" data-visitor-id="${escapeHtml(id)}">
        <span class="journey-identity"><strong>Visitor ${escapeHtml(shortId)}</strong><small>Last seen ${escapeHtml(shortDate(row.last_visit))}</small></span>
        <span><strong>${Number(row.visits || 0)} visit${Number(row.visits) === 1 ? "" : "s"}</strong><small>${Number(row.pageviews || 0)} page views</small></span>
        <span><strong>${escapeHtml(sourceLabel(row.first_source, row.first_medium))}</strong><small>First source</small></span>
        <span><strong>${escapeHtml(seconds(row.total_seconds))}</strong><small>Total time</small></span>
        <span><strong>${progress ? `${progress}%` : "Not played"}</strong><small>${Number(row.video_watch_seconds || 0) ? `${seconds(row.video_watch_seconds)} watched` : "Video"}</small></span>
        <span><strong>${escapeHtml(row.furthest_section || "Not tracked")}</strong><small>Furthest section</small></span>
        <span class="${row.converted ? "journey-converted" : ""}"><strong>${row.converted ? "Reserved" : "In progress"}</strong><small>${escapeHtml(row.location || "Unknown")}</small></span>
      </button>`;
    };
    if (!rows.length) {
      $("#journey-list").innerHTML = '<p class="empty-state">No visitor journeys in this range yet.</p>';
      return;
    }
    const newLayoutVisitors = rows.filter((row) => new Date(row.first_visit).getTime() >= layoutUpdateAt);
    const earlierVisitors = rows.filter((row) => new Date(row.first_visit).getTime() < layoutUpdateAt);
    const divider = earlierVisitors.length
      ? `<div class="journey-divider"><span>Earlier visitors · before this layout update (${earlierVisitors.length})</span></div>`
      : "";
    $("#journey-list").innerHTML = `${newLayoutVisitors.map(renderJourney).join("")}${divider}${earlierVisitors.map(renderJourney).join("")}`;
  };

  const eventDetail = (event) => {
    const meta = event.event_metadata || {};
    if (["video_progress", "video_complete"].includes(event.event_name)) return `${Number(meta.progress || event.event_value || 0)}% · ${seconds(meta.watch_seconds)} actually watched`;
    if (["video_play", "video_pause", "video_watch"].includes(event.event_name)) return `${seconds(meta.video_time)} into video · ${seconds(meta.watch_seconds)} actually watched`;
    if (event.event_name === "section_view") {
      const total = Number(meta.section_total || 0);
      return total
        ? `Section ${Number(meta.section_order || event.event_value || 0)} of ${total}`
        : `Section ${Number(meta.section_order || event.event_value || 0)}`;
    }
    if (event.event_name === "contact_channel_click") return event.event_label || meta.channel || "Contact selected";
    return event.event_label || event.page_path || "";
  };

  const openJourney = async (visitorId) => {
    const dialog = $("#journey-dialog");
    $("#journey-dialog-title").textContent = `Visitor ${visitorId.slice(-6).toUpperCase()}`;
    $("#journey-dialog-content").innerHTML = '<p class="empty-state">Loading journey…</p>';
    dialog.showModal();
    const { data, error } = await supabase.rpc("analytics_visitor_timeline", { p_visitor: visitorId });
    if (error) {
      $("#journey-dialog-content").innerHTML = `<p class="empty-state">Could not load journey: ${escapeHtml(error.message)}</p>`;
      return;
    }
    const visitor = data?.visitor || {};
    const sessions = data?.sessions || [];
    const events = data?.events || [];
    const furthestSection = events
      .filter((event) => event.event_name === "section_view")
      .sort((a, b) => Number(b.event_value || 0) - Number(a.event_value || 0))[0];
    $("#journey-dialog-content").innerHTML = `
      <div class="journey-summary">
        <div><span>First seen</span><strong>${escapeHtml(shortDate(visitor.first_seen_at))}</strong></div>
        <div><span>Latest visit</span><strong>${escapeHtml(shortDate(visitor.last_seen_at))}</strong></div>
        <div><span>Visits</span><strong>${Number(visitor.visits || sessions.length)}</strong></div>
        <div><span>First source</span><strong>${escapeHtml(sourceLabel(visitor.first_source, visitor.first_medium))}</strong></div>
        <div><span>Latest source</span><strong>${escapeHtml(sourceLabel(visitor.latest_source, visitor.latest_medium))}</strong></div>
        <div><span>Device</span><strong>${escapeHtml(visitor.device_type || "Unknown")}</strong></div>
        <div><span>Furthest section</span><strong>${escapeHtml(furthestSection?.event_label || "Not tracked")}</strong></div>
      </div>
      <div class="timeline">${events.length ? events.map((event) => `<div class="timeline-item">
        <strong>${escapeHtml(eventNames[event.event_name] || event.event_name)}</strong>
        <span>${escapeHtml(shortDate(event.occurred_at))} · ${escapeHtml(event.page_path || "")}</span>
        ${eventDetail(event) ? `<span>${escapeHtml(eventDetail(event))}</span>` : ""}
      </div>`).join("") : '<p class="empty-state">No detailed events recorded yet.</p>'}</div>`;
  };

  const loadDashboard = async () => {
    status.textContent = "Loading traffic…";
    $("#refresh-dashboard").disabled = true;
    const from = new Date(`${$("#filter-from").value}T00:00:00`);
    const to = new Date(`${$("#filter-to").value}T00:00:00`);
    to.setDate(to.getDate() + 1);
    const params = {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_device: $("#filter-device").value || null,
      p_source: $("#filter-source").value || null,
      p_country: $("#filter-country").value || null
    };
    const [{ data, error }, { data: journeys, error: journeyError }] = await Promise.all([
      supabase.rpc("analytics_dashboard", params),
      supabase.rpc("analytics_visitor_journeys", params)
    ]);
    $("#refresh-dashboard").disabled = false;
    if (error) {
      status.textContent = error.message.includes("authorized") ? "This account is not authorized to view analytics." : `Could not load traffic: ${error.message}`;
      return;
    }
    renderDashboard(data || {});
    renderJourneys(journeyError ? [] : journeys || []);
    status.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  const showSession = async (session) => {
    const signedIn = Boolean(session?.user);
    authCard.hidden = signedIn;
    dashboard.hidden = !signedIn;
    signOut.hidden = !signedIn;
    if (signedIn) await loadDashboard();
  };

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#login-password").value;
    $("#login-status").textContent = "Signing in…";
    const { error } = await supabase.auth.signInWithPassword({
      email: config.adminEmail,
      password
    });
    $("#login-password").value = "";
    $("#login-status").textContent = error ? "Incorrect password or dashboard access is not configured." : "Signed in.";
  });

  signOut.addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
  $("#refresh-dashboard").addEventListener("click", loadDashboard);
  $("#journey-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-visitor-id]");
    if (row) openJourney(row.dataset.visitorId);
  });
  $("#journey-dialog-close").addEventListener("click", () => $("#journey-dialog").close());
  $("#journey-dialog").addEventListener("click", (event) => {
    if (event.target === $("#journey-dialog")) $("#journey-dialog").close();
  });
  const { data: { session } } = await supabase.auth.getSession();
  await showSession(session);
  supabase.auth.onAuthStateChange((_event, nextSession) => setTimeout(() => showSession(nextSession), 0));
}
