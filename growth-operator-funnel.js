(() => {
  const form = document.querySelector("#reserve-form");
  const status = document.querySelector("#reserve-status");
  const submitButton = form?.querySelector("button[type='submit']");
  const campaignAvailability = document.querySelectorAll("[data-campaign-availability]");
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  if (!form || !status || !submitButton) return;

  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

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
    status.textContent = "";
    if (form.elements.botcheck?.checked) return;
    if (!email.checkValidity()) {
      status.textContent = "Enter a valid email address to see available times.";
      email.focus();
      return;
    }
    if (!phone.checkValidity()) {
      status.textContent = "Enter your phone number to continue.";
      phone.focus();
      return;
    }

    const emailValue = email.value.trim();
    const phoneValue = phone.value.trim();
    submitButton.textContent = "Holding your spot…";
    submitButton.disabled = true;
    email.readOnly = true;
    phone.readOnly = true;
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
