(() => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-nav");
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(".sr-only").textContent = "Open menu";
    nav.classList.remove("is-open");
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
    nav.classList.toggle("is-open", open);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();

(() => {
  const track = document.querySelector("#reviews-track");
  const cards = [...(track?.querySelectorAll(".review-card") || [])];
  const previous = document.querySelector("[data-review-prev]");
  const next = document.querySelector("[data-review-next]");
  const dots = [...document.querySelectorAll("[data-review-dot]")];
  if (!track || cards.length < 2) return;

  let activeIndex = 0;
  let frame = 0;

  const update = () => {
    frame = 0;
    const trackLeft = track.getBoundingClientRect().left;
    let closestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });
    dots.forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", String(active));
    });
  };

  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  const show = (index) => {
    const nextIndex = (index + cards.length) % cards.length;
    const target = cards[nextIndex];
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: "smooth" });
    activeIndex = nextIndex;
    update();
  };

  track.addEventListener("scroll", requestUpdate, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(activeIndex + 1);
    }
  });
  window.addEventListener("resize", requestUpdate);
  previous?.addEventListener("click", () => show(activeIndex - 1));
  next?.addEventListener("click", () => show(activeIndex + 1));
  dots.forEach((dot) =>
    dot.addEventListener("click", () => show(Number(dot.dataset.reviewDot)))
  );
  update();
})();

(() => {
  const calendarWrap = document.querySelector("#final-calendar-wrap");
  const calendarLoading = document.querySelector("#final-calendar-loading");
  const calEmbed = document.querySelector("#growth-operator-cal");
  if (!calEmbed) return;

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
  };

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
          if (calendarLoading) calendarLoading.textContent = "Calendar could not load. Use the booking-page link below.";
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
    elementOrSelector: "#growth-operator-cal",
    calLink: calEmbed.dataset.calLink,
    config: { layout: "month_view", theme: "light" },
  });
  Cal("ui", { theme: "light", layout: "month_view", hideEventTypeDetails: true });
})();
