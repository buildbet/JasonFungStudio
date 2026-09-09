(() => {
  const form = document.querySelector("#reserve-form");
  const scheduler = document.querySelector("#mini-scheduler");
  const status = document.querySelector("#reserve-status");
  const submitButton = form?.querySelector("button[type='submit']");
  const schedulerTimezone = document.querySelector("#scheduler-timezone");
  const calendarWrap = document.querySelector("#funnel-calendar-wrap");
  const calendarLoading = document.querySelector("#funnel-calendar-loading");
  const calEmbed = document.querySelector("#funnel-cal-embed");
  const campaignAvailability = document.querySelector("#campaign-availability");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  let calendarLoaded = false;
  if (!form || !scheduler || !status || !submitButton || !calEmbed) return;

  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

  if (campaignAvailability) {
    const expiresAt = new Date(campaignAvailability.dataset.expires).getTime();
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      campaignAvailability.innerHTML = '<i aria-hidden="true"></i> Limited onboarding capacity';
    }
  }

  const timeZoneName = new Intl.DateTimeFormat(undefined, {
    timeZone,
    timeZoneName: "long"
  }).formatToParts(new Date()).find(({ type }) => type === "timeZoneName")?.value;
  if (schedulerTimezone) {
    schedulerTimezone.textContent = `Showing actual availability in ${timeZoneName || timeZone}. You can change the timezone below.`;
  }

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
    status.textContent = "";
  };

  const saveLead = async (email) => {
    const data = new FormData();
    data.append("access_key", form.dataset.web3formsKey);
    data.append("subject", "Growth Operator call reservation started");
    data.append("from_name", "Jason Fung Studio website");
    data.append("email", email);
    data.append("timezone", timeZone);
    data.append("page", window.location.href);
    data.append("referrer", document.referrer || "direct");
    const searchParams = new URLSearchParams(window.location.search);
    campaignKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) data.append(key, value);
    });

    const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Lead capture failed.");
    dispatch("growth_operator_lead_captured", {
      flow_variant: "growth_operator_funnel",
      timezone: timeZone,
      campaign_source: searchParams.get("utm_source") || "direct"
    });
  };

  const loadCalendar = (email) => {
    if (calendarLoaded) return;
    calendarLoaded = true;

    const observer = new MutationObserver(() => {
      const frame = calEmbed.querySelector("iframe");
      if (!frame) return;
      frame.addEventListener("load", markCalendarLoaded, { once: true });
      window.setTimeout(markCalendarLoaded, 2500);
      observer.disconnect();
    });
    observer.observe(calEmbed, { childList: true, subtree: true });

    ((C, A, L) => {
      const p = (a, ar) => a.q.push(ar);
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const script = d.createElement("script");
          script.src = A;
          script.async = true;
          script.onerror = () => {
            calendarWrap?.setAttribute("aria-busy", "false");
            if (calendarLoading) calendarLoading.textContent = "Calendar could not load. Use the direct link below.";
            status.textContent = "The calendar could not load here. Please use the direct booking link below.";
          };
          d.head.appendChild(script);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    Cal("init", { origin: "https://app.cal.com" });
    Cal("inline", {
      elementOrSelector: "#funnel-cal-embed",
      calLink: calEmbed.dataset.calLink,
      config: {
        layout: "week_view",
        useSlotsViewOnSmallScreen: "true",
        theme: "dark",
        email
      }
    });
    Cal("ui", {
      hideEventTypeDetails: false,
      layout: "week_view",
      useSlotsViewOnSmallScreen: true
    });
    Cal("on", {
      action: "bookingSuccessfulV2",
      callback: () => {
        dispatch("growth_operator_reservation_confirmed", { timezone: timeZone });
        window.location.assign("growth-operator-confirmed.html");
      }
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.elements.email;
    status.textContent = "";
    if (form.elements.botcheck?.checked) return;
    if (!email.checkValidity()) {
      status.textContent = "Enter a valid email address to see available times.";
      email.focus();
      return;
    }

    scheduler.hidden = false;
    submitButton.textContent = "Times ready ✓";
    submitButton.disabled = true;
    email.readOnly = true;
    status.textContent = "Loading actual availability…";
    loadCalendar(email.value.trim());
    scheduler.focus({ preventScroll: true });
    scheduler.scrollIntoView({ behavior: "smooth", block: "center" });
    dispatch("growth_operator_reservation_started", {
      flow_variant: "growth_operator_funnel",
      timezone: timeZone
    });
    saveLead(email.value.trim()).catch(() => {
      dispatch("growth_operator_lead_capture_failed", {
        flow_variant: "growth_operator_funnel"
      });
    });
  });

  document.querySelectorAll('a[href="#reserve-form"]').forEach((link) => {
    link.addEventListener("click", () => {
      dispatch("growth_operator_reservation_cta_clicked", {
        label: link.textContent.trim().replace(/\s+/g, " "),
        location: link.closest("section")?.className || "page"
      });
    });
  });

  document.querySelectorAll(".faq details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      const marker = detail.querySelector("summary span");
      if (marker) marker.textContent = detail.open ? "−" : "+";
    });
  });

})();
