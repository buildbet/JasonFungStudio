(() => {
  const WEB3FORMS_KEY = "1795d87a-1dd7-42b5-85c4-36cad41e0c05";
  const form = document.querySelector("#onboarding-form");
  const card = document.querySelector("#onboarding-card");
  const complete = document.querySelector("#onboarding-complete");
  const status = document.querySelector("#onboarding-status");
  const submit = form?.querySelector("button[type='submit']");
  let lead = {};
  try { lead = JSON.parse(localStorage.getItem("jfs_shopify_growth_lead") || "{}"); } catch (_) {}

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    data.set("access_key", WEB3FORMS_KEY);
    const serviceNames = Array.isArray(lead.services) ? lead.services.join(", ") : "services not recorded";
    data.set("subject", `Shopify Growth onboarding — ${serviceNames}`);
    data.set("from_name", "Jason Fung Studio onboarding");
    data.set("lead_id", lead.id || "not available");
    data.set("selected_services", serviceNames);
    data.set("weekly_total_usd", String(lead.weeklyTotal || "not available"));
    data.set("applicant_name", lead.name || "not available");
    data.set("applicant_email", lead.email || "not available");
    data.set("store_url_from_application", lead.storeUrl || "not available");
    data.set("page_url", window.location.href);
    submit.disabled = true;
    status.textContent = "Saving your onboarding information…";
    status.classList.remove("is-error");
    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Your onboarding information could not be saved.");
      document.dispatchEvent(new CustomEvent("shopify_growth_onboarding_submitted", { detail: { leadId: lead.id || null, services: lead.services || [] } }));
      try { localStorage.removeItem("jfs_shopify_growth_lead"); } catch (_) {}
      card.hidden = true;
      complete.classList.add("is-visible");
      complete.focus();
    } catch (error) {
      status.textContent = error.message || "Something went wrong. Please try again.";
      status.classList.add("is-error");
      submit.disabled = false;
    }
  });
})();
