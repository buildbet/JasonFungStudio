(() => {
  const calendarWrap = document.querySelector("#calendar-wrap");
  const calendarLoading = document.querySelector("#calendar-loading");
  const calEmbed = document.querySelector("#operator-cal-embed");
  if (!calEmbed) return;

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
  };

  const loadCalendar = () => {
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
      },
    });
    Cal("ui", {
      theme: "light",
      layout: "month_view",
      hideEventTypeDetails: true,
    });
  };

  loadCalendar();
})();
