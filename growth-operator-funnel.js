(() => {
  const form = document.querySelector("#reserve-form");
  const status = document.querySelector("#reserve-status");
  const submitButton = form?.querySelector("button[type='submit']");
  const countryCodeField = form?.elements.country_code;
  const vslVideo = document.querySelector("#vsl-video");
  const vslPlay = document.querySelector("#vsl-play");
  const vslRewind = document.querySelector("#vsl-rewind");
  const vslSound = document.querySelector("#vsl-sound");
  const vslFullscreen = document.querySelector("#vsl-fullscreen");
  const vslUnmute = document.querySelector("#vsl-unmute");
  const vslTime = document.querySelector("#vsl-time");
  const vslProgress = document.querySelector("#vsl-progress");
  const vslProgressFill = document.querySelector("#vsl-progress-fill");
  const campaignAvailability = document.querySelectorAll("[data-campaign-availability]");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  if (!form || !status || !submitButton || !countryCodeField) return;

  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

  if (vslVideo && vslPlay && vslRewind && vslSound && vslFullscreen && vslUnmute && vslTime && vslProgress && vslProgressFill) {
    let furthestTime = 0;
    let correctingSeek = false;
    let soundHasBeenEnabled = false;
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return "0:00";
      const wholeSeconds = Math.max(0, Math.floor(seconds));
      return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
    };
    const updatePlayer = () => {
      const duration = Number.isFinite(vslVideo.duration) ? vslVideo.duration : 0;
      const percent = duration ? Math.min(100, (vslVideo.currentTime / duration) * 100) : 0;
      vslProgressFill.style.width = `${percent}%`;
      vslProgress.setAttribute("aria-valuenow", String(Math.round(percent)));
      vslTime.textContent = `${formatTime(vslVideo.currentTime)} / ${formatTime(duration)}`;
      vslPlay.classList.toggle("is-paused", !vslVideo.paused);
      vslPlay.setAttribute("aria-label", vslVideo.paused ? "Play video" : "Pause video");
      vslSound.textContent = vslVideo.muted ? "🔇" : "🔊";
      vslSound.setAttribute("aria-label", vslVideo.muted ? "Turn sound on" : "Mute video");
    };

    vslVideo.addEventListener("timeupdate", () => {
      if (!vslVideo.seeking) furthestTime = Math.max(furthestTime, vslVideo.currentTime);
      updatePlayer();
    });
    vslVideo.addEventListener("loadedmetadata", updatePlayer);
    vslVideo.addEventListener("play", updatePlayer);
    vslVideo.addEventListener("pause", updatePlayer);
    vslVideo.addEventListener("ratechange", () => {
      if (vslVideo.playbackRate !== 1) vslVideo.playbackRate = 1;
    });
    vslVideo.addEventListener("seeking", () => {
      if (correctingSeek || vslVideo.currentTime <= furthestTime + .35) return;
      correctingSeek = true;
      vslVideo.currentTime = furthestTime;
      window.setTimeout(() => { correctingSeek = false; }, 0);
    });
    vslPlay.addEventListener("click", () => {
      if (vslVideo.paused) vslVideo.play().catch(() => {});
      else vslVideo.pause();
    });
    vslRewind.addEventListener("click", () => {
      vslVideo.currentTime = Math.max(0, vslVideo.currentTime - 10);
      vslVideo.play().catch(() => {});
    });
    const toggleSound = () => {
      const enablingSound = vslVideo.muted;
      vslVideo.muted = !vslVideo.muted;
      if (enablingSound && !soundHasBeenEnabled) {
        soundHasBeenEnabled = true;
        if (vslVideo.currentTime <= 10) vslVideo.currentTime = 0;
      }
      vslUnmute.classList.toggle("is-hidden", !vslVideo.muted);
      vslVideo.play().catch(() => {});
      updatePlayer();
    };
    vslSound.addEventListener("click", toggleSound);
    vslUnmute.addEventListener("click", toggleSound);
    vslFullscreen.addEventListener("click", () => {
      const player = document.querySelector("#vsl-player");
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else if (player?.requestFullscreen) {
        player.requestFullscreen();
      } else if (vslVideo.webkitEnterFullscreen) {
        vslVideo.webkitEnterFullscreen();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      vslFullscreen.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
    });
    vslVideo.muted = true;
    vslVideo.play().catch(() => updatePlayer());
    updatePlayer();
  }

  try {
    const browserRegion = new Intl.Locale(navigator.language).region;
    const regionalOption = Array.from(countryCodeField.options).find((option) => option.dataset.region === browserRegion);
    if (regionalOption) regionalOption.selected = true;
  } catch {
    // Canada +1 remains the fallback when the browser does not expose a region.
  }

  campaignAvailability.forEach((notice) => {
    const expiresAt = new Date(notice.dataset.expires).getTime();
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
      const statusClass = notice.classList.contains("cta-urgency") ? "cta-urgency__spots" : "hero-urgency__spots";
      notice.innerHTML = `<span class="${statusClass}">Limited onboarding capacity</span>`;
    }
  });

  const saveLead = async (email, phone) => {
    const data = new FormData();
    data.append("access_key", form.dataset.web3formsKey);
    data.append("subject", "New lead — 2-hour spot held, awaiting message confirmation");
    data.append("from_name", "Jason Fung Studio website");
    data.append("email", email);
    data.append("phone", phone);
    data.append("lead_status", "Two-hour priority hold started — awaiting message confirmation");
    data.append("recommended_follow_up", "Reply to this email or contact the supplied phone number if the lead does not message within two hours.");
    data.append("submitted_at", new Date().toISOString());
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.elements.email;
    const phone = form.elements.phone;
    const countryCode = countryCodeField;
    status.textContent = "";
    if (form.elements.botcheck?.checked) return;
    if (!email.checkValidity()) {
      status.textContent = "Enter a valid email address to see available times.";
      email.focus();
      return;
    }
    const rawPhone = phone.value.trim();
    const phoneDigits = rawPhone.replace(/\D/g, "");
    const countryDigits = countryCode.value.replace(/\D/g, "");
    const localDigits = !rawPhone.startsWith("+") && countryDigits !== "1" && phoneDigits.startsWith("0")
      ? phoneDigits.slice(1)
      : phoneDigits;
    const normalizedPhone = rawPhone.startsWith("+")
      ? `+${phoneDigits}`
      : `+${localDigits.startsWith(countryDigits) && localDigits.length > 10 ? localDigits : countryDigits + localDigits}`;
    if (!phone.checkValidity() || phoneDigits.length < 7 || normalizedPhone.length > 16) {
      status.textContent = "Enter your phone number to continue.";
      phone.focus();
      return;
    }

    const emailValue = email.value.trim();
    const phoneValue = normalizedPhone;
    submitButton.textContent = "Holding your spot…";
    submitButton.disabled = true;
    email.readOnly = true;
    phone.readOnly = true;
    countryCode.disabled = true;
    status.textContent = "Saving your details…";
    try {
      sessionStorage.setItem("growthOperatorReservation", JSON.stringify({
        email: emailValue,
        phone: phoneValue,
        createdAt: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000)
      }));
    } catch {
      // The reservation still continues if browser storage is unavailable.
    }
    dispatch("growth_operator_reservation_started", {
      flow_variant: "growth_operator_funnel",
      timezone: timeZone
    });
    try {
      await saveLead(emailValue, phoneValue);
    } catch {
      dispatch("growth_operator_lead_capture_failed", {
        flow_variant: "growth_operator_funnel"
      });
    }
    window.location.assign("growth-operator-reserved.html");
  });

  document.querySelectorAll('a[href="#reserve-form"]').forEach((link) => {
    link.addEventListener("click", () => {
      dispatch("growth_operator_reservation_cta_clicked", {
        label: link.textContent.trim().replace(/\s+/g, " "),
        location: link.closest("section")?.className || "page"
      });
    });
  });

  document.querySelectorAll(".faq details, .f2-faq details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      const marker = detail.querySelector("summary span");
      if (marker) marker.textContent = detail.open ? "−" : "+";
    });
  });

})();
