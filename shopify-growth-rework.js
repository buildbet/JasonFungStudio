(() => {
  const WEB3FORMS_KEY = "1795d87a-1dd7-42b5-85c4-36cad41e0c05";
  const STRIPE_LINKS = Object.freeze({
    40: "https://buy.stripe.com/8x2dR8cetbmh1maaQCdQQ04", 50: "https://buy.stripe.com/28E28q1zP2PL9SGaQCdQQ05",
    60: "https://buy.stripe.com/bJeaEW3HX1LH2qe0bYdQQ06", 70: "https://buy.stripe.com/14A00ia6lbmh9SG5widQQ07",
    90: "https://buy.stripe.com/14A6oGemB4XT8OCe2OdQQ09", 100: "https://buy.stripe.com/8x2bJ0fqFeyt7Ky1g2dQQ08",
    110: "https://buy.stripe.com/cNi6oGdix3TPe8Wf6SdQQ0a", 120: "https://buy.stripe.com/fZudR82DTdup5CqcYKdQQ0b",
    130: "https://buy.stripe.com/aFabJ03HXgGB0i63oadQQ0c", 140: "https://buy.stripe.com/6oU00i1zPeyt7Kye2OdQQ0d",
    150: "https://buy.stripe.com/28EeVc3HX0HD6GugaWdQQ0e", 160: "https://buy.stripe.com/00wdR80vL61X9SGe2OdQQ0g",
    170: "https://buy.stripe.com/eVq5kCemBaid4ym0bYdQQ0f", 180: "https://buy.stripe.com/bJe00i7Yd61X6Gu7EqdQQ0h",
    190: "https://buy.stripe.com/4gM9AS2DT4XT2qe9MydQQ0i", 200: "https://buy.stripe.com/9B614m2DTgGBaWK0bYdQQ0j",
    210: "https://buy.stripe.com/00w3cudixfCxd4S8IudQQ0k", 220: "https://buy.stripe.com/dRmcN4dixcqld4S5widQQ0l",
    230: "https://buy.stripe.com/bJeeVc92h3TPc0OgaWdQQ0m", 240: "https://buy.stripe.com/28EfZg2DT0HD4ymaQCdQQ0n",
    250: "https://buy.stripe.com/fZubJ02DTdup5CqgaWdQQ0o", 260: "https://buy.stripe.com/6oU28q5Q5dup1mae2OdQQ0p",
    270: "https://buy.stripe.com/5kQ8wO1zPcqlgh4e2OdQQ0q", 280: "https://buy.stripe.com/14AcN40vLaid4ym3oadQQ0x",
    290: "https://buy.stripe.com/cNidR82DT3TP2qe1g2dQQ0t", 300: "https://buy.stripe.com/8x2fZgemB3TPe8WcYKdQQ0r",
    310: "https://buy.stripe.com/28E4gy6U98a5fd09MydQQ0s", 320: "https://buy.stripe.com/fZudR82DTeyte8We2OdQQ0v",
    330: "https://buy.stripe.com/dRm4gya6l761d4ScYKdQQ0u", 340: "https://buy.stripe.com/6oU4gy5Q561X3ui7EqdQQ0w",
    350: "https://buy.stripe.com/7sY14ma6lbmhe8Wf6SdQQ0y", 360: "https://buy.stripe.com/dRm7sKcet61X9SG9MydQQ0z",
    370: "https://buy.stripe.com/7sYeVc1zPbmhfd0bUGdQQ0A", 380: "https://buy.stripe.com/00wbJ0a6l3TP7Ky3oadQQ0B",
    400: "https://buy.stripe.com/28EcN4bap1LH7Kye2OdQQ0C", 410: "https://buy.stripe.com/8x2fZgcetgGBd4SbUGdQQ0D",
    420: "https://buy.stripe.com/6oU14memB7613ui0bYdQQ0E", 430: "https://buy.stripe.com/14A8wOguJeyte8W4sedQQ0F",
    470: "https://buy.stripe.com/fZu9AS6U9cqlaWK9MydQQ0G",
  });
  const SERVICES = {
    paid_ads: { name: "Paid Ads", price: 70 },
    shopify: { name: "Shopify Improvements", price: 50 },
    creative: { name: "Creative", price: 50 },
    email_sms: { name: "Email + SMS", price: 40 },
    offers: { name: "Offers + Campaigns", price: 50 },
    growth: { name: "Growth Direction", price: 60 },
    brand: { name: "Brand Design + Direction", price: 100 },
    priority: { name: "Priority", price: 50 },
  };

  const modal = document.querySelector("#apply-modal");
  const panel = modal?.querySelector(".modal__panel");
  const form = document.querySelector("#quick-apply-form");
  const steps = [...(form?.querySelectorAll("[data-step]") || [])];
  const backButton = form?.querySelector("[data-back]");
  const progressBar = document.querySelector("#apply-progress-bar");
  const progressCopy = document.querySelector("#apply-progress-copy");
  const serviceList = document.querySelector("#apply-service-list");
  const totalOutput = document.querySelector("#apply-total");
  const status = document.querySelector("#apply-status");
  const submit = form?.querySelector("button[type='submit']");
  let currentStep = 0;
  let lastFocus = null;
  let recommendationTracked = false;

  const makeLeadId = () => `JFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const setStatus = (message, error = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", error);
  };

  const fieldForStep = (step) => step?.querySelector("input:not([type='radio']):not([type='checkbox']), input[type='radio']:checked");
  const validateStep = (step) => {
    const textInput = step?.querySelector("input:not([type='radio']):not([type='checkbox'])");
    if (textInput && !textInput.reportValidity()) return false;
    const requiredRadio = step?.querySelector("input[type='radio'][required]");
    if (requiredRadio && !step.querySelector(`input[name="${requiredRadio.name}"]:checked`)) {
      requiredRadio.reportValidity();
      return false;
    }
    return true;
  };

  const recommendedServices = () => {
    if (!form) return new Set();
    const data = new FormData(form);
    const selected = new Set();
    if (["want", "poor", "okay"].includes(String(data.get("ads")))) selected.add("paid_ads");
    if (["improvements", "work", "unsure"].includes(String(data.get("shopify")))) selected.add("shopify");
    if (["more", "direction", "both"].includes(String(data.get("creative")))) selected.add("creative");
    if (["some", "no", "unsure"].includes(String(data.get("followup")))) selected.add("email_sms");
    if (["unsure", "launch", "create"].includes(String(data.get("offers")))) selected.add("offers");
    if (["somewhat", "no", "guide"].includes(String(data.get("growth")))) selected.add("growth");
    if (["refine", "inconsistent", "define"].includes(String(data.get("brand")))) selected.add("brand");
    if (["deadline", "fast"].includes(String(data.get("priority")))) selected.add("priority");
    if (data.get("help") === "consistent") {
      selected.add("creative"); selected.add("offers"); selected.add("email_sms");
    }
    if (data.get("help") === "involved") selected.add("growth");
    if (selected.size === 1 && selected.has("priority")) selected.delete("priority");
    return selected;
  };

  const selectedServiceKeys = () => [...(serviceList?.querySelectorAll("input[type='checkbox']:checked") || [])].map((input) => input.value);
  const updateTotal = () => {
    const total = selectedServiceKeys().reduce((sum, key) => sum + (SERVICES[key]?.price || 0), 0);
    if (totalOutput) totalOutput.textContent = `$${total} USD/week`;
    return total;
  };

  const renderServices = () => {
    if (!serviceList) return;
    const recommended = recommendedServices();
    serviceList.innerHTML = Object.entries(SERVICES).map(([key, service]) => `
      <label class="apply-service${recommended.has(key) ? " is-recommended" : ""}">
        <input type="checkbox" name="services" value="${key}" ${recommended.has(key) ? "checked" : ""} />
        <span><strong>${service.name}</strong>${recommended.has(key) ? "<small>Recommended</small>" : ""}</span>
        <b>$${service.price}/week</b>
      </label>`).join("");
    serviceList.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateTotal));
    updateTotal();
  };

  const showStep = (index) => {
    if (!steps.length) return;
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => step.classList.toggle("is-active", stepIndex === currentStep));
    if (currentStep === steps.length - 1) {
      renderServices();
      if (!recommendationTracked) {
        recommendationTracked = true;
        document.dispatchEvent(new CustomEvent("shopify_growth_recommendation_viewed", {
          detail: { services: selectedServiceKeys(), total: updateTotal() }
        }));
      }
    }
    const questionCount = steps.length - 1;
    const progressIndex = Math.min(currentStep + 1, questionCount);
    if (progressBar) progressBar.style.width = `${(progressIndex / questionCount) * 100}%`;
    if (progressCopy) progressCopy.textContent = currentStep === steps.length - 1 ? "Your recommendation" : `Step ${currentStep + 1} of ${questionCount}`;
    if (backButton) backButton.hidden = currentStep === 0;
    const focusTarget = fieldForStep(steps[currentStep]) || steps[currentStep].querySelector("input,button");
    window.setTimeout(() => focusTarget?.focus(), 30);
  };

  const nextStep = () => {
    if (!validateStep(steps[currentStep])) return;
    showStep(currentStep + 1);
  };

  const openModal = (location = "unknown") => {
    if (!modal) return;
    lastFocus = document.activeElement;
    recommendationTracked = false;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.dispatchEvent(new CustomEvent("shopify_growth_apply_opened", { detail: { location } }));
    showStep(0);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  document.querySelectorAll("[data-apply]").forEach((trigger) => trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const location = trigger.classList.contains("header-apply") ? "header"
      : trigger.classList.contains("mobile-apply") ? "mobile_sticky"
        : trigger.closest(".hero__actions") ? "hero"
          : trigger.closest(".pricing-apply") ? "pricing"
            : trigger.closest(".final-cta") ? "final_cta"
              : "unknown";
    openModal(location);
  }));
  modal?.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  form?.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", nextStep));
  form?.querySelectorAll("input[type='radio']").forEach((input) => input.addEventListener("click", () => window.setTimeout(nextStep, 170)));
  backButton?.addEventListener("click", () => showStep(currentStep - 1));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
    if (event.key === "Enter" && modal?.classList.contains("is-open") && currentStep < 3 && document.activeElement?.tagName === "INPUT") {
      event.preventDefault(); nextStep();
    }
    if (event.key !== "Tab" || !modal?.classList.contains("is-open") || !panel) return;
    const focusable = [...panel.querySelectorAll("button:not([hidden]),input,a[href]")].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const serviceKeys = selectedServiceKeys();
    if (!serviceKeys.length) { setStatus("Select at least one service to continue.", true); return; }
    if (serviceKeys.length === 1 && serviceKeys[0] === "priority") {
      setStatus("Priority is an add-on. Select at least one regular service to continue.", true);
      return;
    }
    const data = new FormData(form);
    const leadId = makeLeadId();
    const total = updateTotal();
    const params = new URLSearchParams(window.location.search);
    data.set("access_key", WEB3FORMS_KEY);
    data.set("subject", `New Shopify Growth quick apply — $${total}/week`);
    data.set("from_name", "Jason Fung Studio website");
    data.set("lead_id", leadId);
    data.set("selected_services", serviceKeys.map((key) => SERVICES[key].name).join(", "));
    data.set("weekly_total_usd", String(total));
    data.set("page_url", window.location.href);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
      if (params.get(key)) data.set(key, params.get(key));
    });
    const lead = {
      id: leadId, name: String(data.get("name") || ""), email: String(data.get("email") || ""),
      storeUrl: String(data.get("store_url") || ""),
      services: serviceKeys, weeklyTotal: total,
      answers: Object.fromEntries([...data.entries()].filter(([key]) => key !== "access_key")),
      createdAt: new Date().toISOString(),
    };
    try { localStorage.setItem("jfs_shopify_growth_lead", JSON.stringify(lead)); } catch (_) {}
    submit.disabled = true;
    setStatus("Saving your application and opening secure checkout…");
    try {
      const saved = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
      const savedResult = await saved.json();
      if (!saved.ok || !savedResult.success) throw new Error(savedResult.message || "Your application could not be saved.");
      const stripeLink = STRIPE_LINKS[total];
      if (!stripeLink) throw new Error(`Your application was saved, but this weekly total is not configured. Please message Jason and reference ${leadId}.`);
      const checkoutUrl = new URL(stripeLink);
      checkoutUrl.searchParams.set("prefilled_email", lead.email);
      checkoutUrl.searchParams.set("client_reference_id", leadId);
      document.dispatchEvent(new CustomEvent("shopify_growth_apply_submitted", { detail: { services: serviceKeys, total, leadId } }));
      document.dispatchEvent(new CustomEvent("shopify_growth_checkout_started", { detail: { services: serviceKeys, total, leadId } }));
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please message Jason.", true);
      submit.disabled = false;
    }
  });

  const menu = document.querySelector("#growth-nav");
  const toggle = document.querySelector(".menu-toggle");
  toggle?.addEventListener("click", () => {
    const open = menu?.classList.toggle("is-open") || false;
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu?.addEventListener("click", () => {
    menu.classList.remove("is-open"); toggle?.setAttribute("aria-expanded", "false");
  });
})();
