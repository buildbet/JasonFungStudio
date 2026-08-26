(() => {
  const STRIPE_LINKS = {
    essentials: "https://buy.stripe.com/9B614m1zP9e9e8W6AmdQQ01",
    growth: "https://buy.stripe.com/9B68wO1zPgGBd4S2k6dQQ02",
    partner: "https://buy.stripe.com/3cI9ASemB1LH1ma7EqdQQ03",
  };
  const WEB3FORMS_KEY = "1795d87a-1dd7-42b5-85c4-36cad41e0c05";
  const modal = document.querySelector("#apply-modal");
  const panel = modal?.querySelector(".modal__panel");
  const form = document.querySelector("#quick-apply-form");
  const planSelect = document.querySelector("#apply-plan");
  const status = document.querySelector("#apply-status");
  const submit = form?.querySelector("button[type='submit']");
  let lastFocus = null;

  const openModal = (plan = "essentials") => {
    if (!modal || !planSelect) return;
    lastFocus = document.activeElement;
    planSelect.value = STRIPE_LINKS[plan] ? plan : "essentials";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => document.querySelector("#apply-name")?.focus(), 30);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  document.querySelectorAll("[data-apply]").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(trigger.dataset.plan || "essentials");
    });
  });
  modal?.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
    if (event.key !== "Tab" || !modal?.classList.contains("is-open") || !panel) return;
    const focusable = [...panel.querySelectorAll("button,input,select,textarea,a[href]")].filter((el) => !el.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const makeLeadId = () => `JFS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const setStatus = (message, error = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", error);
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const plan = String(data.get("plan") || "essentials");
    const leadId = makeLeadId();
    const params = new URLSearchParams(window.location.search);
    data.set("access_key", WEB3FORMS_KEY);
    data.set("subject", `New Shopify Growth quick apply — ${plan}`);
    data.set("from_name", "Jason Fung Studio website");
    data.set("lead_id", leadId);
    data.set("page_url", window.location.href);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((key) => {
      if (params.get(key)) data.set(key, params.get(key));
    });
    const lead = {
      id: leadId,
      name: String(data.get("name") || ""),
      email: String(data.get("email") || ""),
      storeUrl: String(data.get("store_url") || ""),
      problem: String(data.get("main_problem") || ""),
      plan,
      createdAt: new Date().toISOString(),
    };
    try { localStorage.setItem("jfs_shopify_growth_lead", JSON.stringify(lead)); } catch (_) {}
    submit.disabled = true;
    setStatus("Saving your application and opening secure checkout…");
    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Your application could not be saved.");
      document.dispatchEvent(new CustomEvent("shopify_growth_apply_submitted", { detail: { plan, leadId } }));
      window.location.assign(STRIPE_LINKS[plan] || STRIPE_LINKS.essentials);
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", true);
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
    menu.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
})();
