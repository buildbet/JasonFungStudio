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
