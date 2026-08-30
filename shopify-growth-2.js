(() => {
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

(() => {
  const item = document.querySelector("[data-benefit-strip]");
  if (!item) return;

  const benefits = ["Simple pricing", "Flexible support", "No sales call", "Cancel anytime"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    item.textContent = benefits.join(" · ");
    return;
  }

  let index = 0;
  window.setInterval(() => {
    item.classList.add("is-exiting");
    window.setTimeout(() => {
      index = (index + 1) % benefits.length;
      item.textContent = benefits[index];
      item.classList.remove("is-exiting");
      item.classList.add("is-entering");
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => item.classList.remove("is-entering")));
    }, 260);
  }, 1000);
})();
