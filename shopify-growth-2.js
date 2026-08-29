(() => {
  const welcome = document.querySelector("#growth2-welcome");
  const welcomeStart = welcome?.querySelector("[data-welcome-start]");
  const welcomeKey = "jfs_growth2_welcome_seen_v4";
  const firstAssessmentChoice = document.querySelector("#quick-apply-form input[name='ads']");

  const beginAssessment = (source) => document.dispatchEvent(new CustomEvent("shopify_growth_assessment_begin", { detail: { source } }));

  const closeWelcome = (source = "popup_skip") => {
    if (!welcome) return;
    const wasOpen = welcome.classList.contains("is-open");
    welcome.classList.remove("is-open");
    welcome.setAttribute("aria-hidden", "true");
    document.body.classList.remove("welcome-open");
    try { sessionStorage.setItem(welcomeKey, "1"); } catch (_) {}
    window.setTimeout(() => firstAssessmentChoice?.focus(), 30);
    if (wasOpen) beginAssessment(source);
  };

  let welcomeSeen = false;
  try { welcomeSeen = sessionStorage.getItem(welcomeKey) === "1"; } catch (_) {}
  if (welcome && !welcomeSeen) {
    welcome.classList.add("is-open");
    welcome.setAttribute("aria-hidden", "false");
    document.body.classList.add("welcome-open");
    window.setTimeout(() => welcomeStart?.focus(), 30);
  } else {
    window.setTimeout(() => beginAssessment("returning_session"), 0);
  }
  welcome?.querySelectorAll("[data-welcome-close]").forEach((button) => button.addEventListener("click", () => closeWelcome("popup_skip")));
  welcomeStart?.addEventListener("click", () => closeWelcome("popup_cta"));
  document.addEventListener("keydown", (event) => {
    if (!welcome?.classList.contains("is-open")) return;
    if (event.key === "Escape") { closeWelcome("popup_escape"); return; }
    if (event.key !== "Tab") return;
    const focusable = [...welcome.querySelectorAll(".growth2-welcome__panel button")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const viewport = document.querySelector("#growth2-coverflow");
  const images = [...(viewport?.querySelectorAll("img") || [])];
  const previous = document.querySelector("[data-coverflow-prev]");
  const next = document.querySelector("[data-coverflow-next]");
  if (!viewport || !images.length) return;

  let activeIndex = 0;
  let frame = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  const update = () => {
    frame = 0;
    const viewportCenter = viewport.getBoundingClientRect().left + (viewport.clientWidth / 2);
    let closestDistance = Infinity;

    images.forEach((image, index) => {
      const bounds = image.getBoundingClientRect();
      const distance = Math.abs((bounds.left + (bounds.width / 2)) - viewportCenter);
      const progress = Math.min(distance / Math.max(bounds.width, 1), 1);
      image.style.setProperty("--coverflow-scale", String(1 - (progress * .18)));
      image.style.setProperty("--coverflow-opacity", String(1 - (progress * .45)));
      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    images.forEach((image, index) => image.classList.toggle("is-active", index === activeIndex));
  };

  const requestUpdate = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  const show = (index) => {
    const target = images[Math.max(0, Math.min(index, images.length - 1))];
    if (!target) return;
    const left = target.offsetLeft - ((viewport.clientWidth - target.clientWidth) / 2);
    viewport.scrollTo({ left, behavior: "smooth" });
  };

  viewport.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  previous?.addEventListener("click", () => show(activeIndex - 1));
  next?.addEventListener("click", () => show(activeIndex + 1));
  images.forEach((image) => image.setAttribute("draggable", "false"));
  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    dragStartX = event.clientX;
    dragStartScroll = viewport.scrollLeft;
    viewport.classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    event.preventDefault();
    viewport.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    requestUpdate();
  });
  const finishDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove("is-dragging");
    update();
    show(activeIndex);
  };
  viewport.addEventListener("pointerup", finishDrag);
  viewport.addEventListener("pointercancel", finishDrag);
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); show(activeIndex - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); show(activeIndex + 1); }
  });

  update();
})();
