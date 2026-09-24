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

  const loadDashboard = async () => {
    status.textContent = "Loading traffic…";
    $("#refresh-dashboard").disabled = true;
    const from = new Date(`${$("#filter-from").value}T00:00:00`);
    const to = new Date(`${$("#filter-to").value}T00:00:00`);
    to.setDate(to.getDate() + 1);
    const { data, error } = await supabase.rpc("analytics_dashboard", {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_device: $("#filter-device").value || null,
      p_source: $("#filter-source").value || null,
      p_country: $("#filter-country").value || null
    });
    $("#refresh-dashboard").disabled = false;
    if (error) {
      status.textContent = error.message.includes("authorized") ? "This account is not authorized to view analytics." : `Could not load traffic: ${error.message}`;
      return;
    }
    renderDashboard(data || {});
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
  const { data: { session } } = await supabase.auth.getSession();
  await showSession(session);
  supabase.auth.onAuthStateChange((_event, nextSession) => setTimeout(() => showSession(nextSession), 0));
}
