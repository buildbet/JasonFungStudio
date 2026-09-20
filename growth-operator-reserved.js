(() => {
  const countdown = document.querySelector("#reservation-countdown");
  const emailLink = document.querySelector("#reserved-email");
  const whatsappLink = document.querySelector("#reserved-whatsapp");
  const instagramLink = document.querySelector("#reserved-instagram");
  const whatsappNumber = "16478083882";
  const instagramThreadId = "18164380366399175";
  let reservation = {};

  try {
    reservation = JSON.parse(sessionStorage.getItem("growthOperatorReservation") || "{}");
  } catch {
    reservation = {};
  }

  const email = reservation.email || "";
  const phone = reservation.phone || "";
  const expiresAt = Number(reservation.expiresAt) || (Date.now() + (2 * 60 * 60 * 1000));
  const message = `Hi Jason, I just reserved a Growth Operator spot. My email is ${email || "[your email]"}${phone ? ` and my phone number is ${phone}` : ""}.`;

  if (emailLink) {
    emailLink.href = `mailto:jasonfungstudio@gmail.com?subject=${encodeURIComponent("Confirm my Growth Operator reservation")}&body=${encodeURIComponent(message)}`;
  }

  if (whatsappLink && whatsappNumber) {
    whatsappLink.href = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    whatsappLink.classList.remove("is-disabled");
    whatsappLink.removeAttribute("aria-disabled");
    whatsappLink.removeAttribute("tabindex");
  }

  if (instagramLink) {
    instagramLink.addEventListener("click", (event) => {
      if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
      event.preventDefault();
      const webUrl = `https://www.instagram.com/direct/t/${instagramThreadId}/`;
      let fallbackTimer;
      const cancelFallback = () => {
        if (document.hidden) window.clearTimeout(fallbackTimer);
      };
      document.addEventListener("visibilitychange", cancelFallback, { once: true });
      window.location.href = `instagram://direct/t/${instagramThreadId}`;
      fallbackTimer = window.setTimeout(() => {
        window.location.href = webUrl;
      }, 1200);
    });
  }

  const updateCountdown = () => {
    if (!countdown) return;
    const remaining = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    countdown.textContent = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (remaining === 0) {
      countdown.textContent = "Expired";
      return;
    }
    window.setTimeout(updateCountdown, 1000);
  };

  updateCountdown();
  document.dispatchEvent(new CustomEvent("growth_operator_reserved_page_viewed", {
    detail: { has_contact_details: Boolean(email || phone) }
  }));
})();
