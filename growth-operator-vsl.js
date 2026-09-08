(() => {
  const form = document.querySelector("#vsl-form");
  const emailInput = document.querySelector("#vsl-email");
  const submitButton = form?.querySelector("button[type='submit']");
  const status = document.querySelector("#vsl-form-status");
  const calendar = document.querySelector("#vsl-calendar");
  const calendarHeading = calendar?.querySelector(".vsl-calendar__heading");
  const calendarWrap = document.querySelector("#vsl-calendar-wrap");
  const calendarLoading = document.querySelector("#vsl-calendar-loading");
  const calEmbed = document.querySelector("#vsl-cal-embed");
  let calendarLoaded = false;

  if (!form || !emailInput || !submitButton || !calendar || !calEmbed) return;

  const setSubmitting = (isSubmitting) => {
    submitButton.disabled = isSubmitting;
    submitButton.firstChild.nodeValue = isSubmitting ? "Reserving... " : "Reserve my spot ";
  };

  const setStatus = (message = "", isError = false) => {
    status.textContent = message;
    status.style.color = isError ? "#b42318" : "#2563eb";
  };

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
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
      elementOrSelector: "#vsl-cal-embed",
      calLink: calEmbed.dataset.calLink,
      config: { layout: "month_view", theme: "light", email }
    });
    Cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    Cal("on", {
      action: "bookingSuccessfulV2",
      callback: () => {
        window.location.assign("growth-operator-confirmed.html");
      }
    });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    setSubmitting(true);
    setStatus("Saving your spot...");

    const formData = new FormData(form);
    formData.append("access_key", form.dataset.web3formsKey);
    formData.append("page", window.location.href);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save your email.");

      document.dispatchEvent(new CustomEvent("growth_operator_vsl_reserved", {
        detail: { email: emailInput.value }
      }));
      form.hidden = true;
      calendar.hidden = false;
      loadCalendar(emailInput.value.trim());
      window.requestAnimationFrame(() => {
        calendarHeading?.focus({ preventScroll: true });
        calendar.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", true);
    } finally {
      setSubmitting(false);
    }
  });
})();
