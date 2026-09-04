(() => {
  const form = document.querySelector("#operator-lead-form");
  const status = document.querySelector("#operator-lead-status");
  const success = document.querySelector("#lead-success");
  const firstName = document.querySelector("#lead-first-name");
  const showCalendarButton = document.querySelector("#show-calendar");
  const calendarSection = document.querySelector("#calendar-section");
  const calendarWrap = document.querySelector("#calendar-wrap");
  const calendarLoading = document.querySelector("#calendar-loading");
  const calEmbed = document.querySelector("#operator-cal-embed");
  if (!form || !success) return;

  let leadDetails = {};
  let calendarLoaded = false;

  const setStatus = (message = "", isError = false) => {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#b42318" : "#475569";
  };

  const setSubmitting = (submitting) => {
    const button = form.querySelector(".operator-lead-form__submit");
    if (!button) return;
    button.disabled = submitting;
    button.firstChild.nodeValue = submitting ? "Sending... " : "Send this to Jason ";
  };

  const getPayload = () => {
    const data = new FormData(form);
    data.set("access_key", form.dataset.web3formsKey || "");
    data.set("subject", "New Growth Operator lead - Jason Fung Studio");
    data.set("from_name", "Jason Fung Studio Growth Operator form");
    data.set("lead_type", "growth_operator");
    data.set("page_url", window.location.href);
    return data;
  };

  const revealSuccess = () => {
    form.hidden = true;
    success.hidden = false;
    const name = String(leadDetails.name || "").trim();
    if (firstName && name) firstName.textContent = name.split(/\s+/)[0];
    success.focus?.({ preventScroll: true });
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
  };

  const loadCalendar = () => {
    if (calendarLoaded || !calEmbed) return;
    calendarLoaded = true;

    const observer = new MutationObserver(() => {
      const frame = calEmbed.querySelector("iframe");
      if (!frame) return;
      frame.addEventListener("load", markCalendarLoaded, { once: true });
      markCalendarLoaded();
      observer.disconnect();
    });
    observer.observe(calEmbed, { childList: true, subtree: true });

    (function (C, A, L) {
      const push = (api, args) => api.q.push(args);
      const doc = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal;
        const args = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const script = doc.createElement("script");
          script.src = A;
          script.async = true;
          script.onerror = () => {
            if (calendarLoading) calendarLoading.textContent = "Calendar could not load. Use the direct link below.";
          };
          doc.head.appendChild(script);
          cal.loaded = true;
        }
        if (args[0] === L) {
          const api = function () { push(api, arguments); };
          const namespace = args[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            push(cal.ns[namespace], args);
          } else {
            push(cal, args);
          }
          return;
        }
        push(cal, args);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    Cal("init", { origin: "https://app.cal.com" });
    Cal("inline", {
      elementOrSelector: "#operator-cal-embed",
      calLink: calEmbed.dataset.calLink,
      config: {
        layout: "month_view",
        theme: "light",
        name: leadDetails.name || "",
        email: leadDetails.email || "",
      },
    });
    Cal("ui", {
      theme: "light",
      layout: "month_view",
      hideEventTypeDetails: true,
    });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    leadDetails = Object.fromEntries(formData.entries());
    setSubmitting(true);
    setStatus("Sending your context to Jason...");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: getPayload(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Your details could not be sent.");
      }

      document.dispatchEvent(new CustomEvent("booking_questionnaire_submitted", {
        detail: { bookingKind: "growth_operator" },
      }));
      revealSuccess();
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", true);
    } finally {
      setSubmitting(false);
    }
  });

  showCalendarButton?.addEventListener("click", () => {
    if (!calendarSection) return;
    calendarSection.hidden = false;
    loadCalendar();
    calendarSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
