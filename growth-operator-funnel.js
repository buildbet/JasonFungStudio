(() => {
  const form = document.querySelector("#fit-assessment");
  if (!form) return;

  const steps = [...form.querySelectorAll(".assessment-step")];
  const nextButton = form.querySelector("[data-next]");
  const backButton = form.querySelector("[data-back]");
  const submitButton = form.querySelector("[data-submit]");
  const status = document.querySelector("#assessment-status");
  const progressBar = document.querySelector("#assessment-progress-bar");
  const stepLabel = document.querySelector("#assessment-step-label");
  const percentLabel = document.querySelector("#assessment-percent");
  const calendarResult = document.querySelector("#calendar-result");
  const calendarWrap = document.querySelector("#calendar-wrap");
  const calendarLoading = document.querySelector("#calendar-loading");
  const calEmbed = document.querySelector("#funnel-cal");
  let currentStep = 0;
  let started = false;
  let calendarLoaded = false;

  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));

  const updateStep = (nextIndex, focus = true) => {
    currentStep = Math.max(0, Math.min(nextIndex, steps.length - 1));
    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.hidden = !active;
      step.classList.toggle("is-active", active);
    });

    const percent = Math.round(((currentStep + 1) / steps.length) * 100);
    progressBar.style.width = `${percent}%`;
    stepLabel.textContent = `Question ${currentStep + 1} of ${steps.length}`;
    percentLabel.textContent = `${percent}%`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    status.textContent = "";

    if (!started) {
      started = true;
      dispatch("growth_operator_assessment_started", { flow_variant: "growth_operator_funnel" });
    }
    dispatch("growth_operator_assessment_step_viewed", { step: currentStep + 1 });
    if (focus) steps[currentStep].querySelector("legend")?.focus?.({ preventScroll: true });
  };

  const validateStep = () => {
    const step = steps[currentStep];
    const error = step.querySelector(".step-error");
    const choices = [...step.querySelectorAll("input[type='checkbox'], input[type='radio']")];
    error.textContent = "";

    if (choices.length && !choices.some((input) => input.checked)) {
      error.textContent = "Choose at least one answer to continue.";
      step.querySelector("input")?.focus();
      return false;
    }

    const required = [...step.querySelectorAll("input[required], textarea[required]")];
    for (const input of required) {
      if (!input.checkValidity()) {
        error.textContent = input.validity.typeMismatch ? "Enter a valid email or website address." : "Complete the required field to continue.";
        input.focus();
        return false;
      }
    }
    return true;
  };

  const setSubmitting = (isSubmitting) => {
    submitButton.disabled = isSubmitting;
    submitButton.firstChild.nodeValue = isSubmitting ? "Sending... " : "See my next step ";
  };

  const markCalendarLoaded = () => {
    calendarWrap?.classList.add("is-loaded");
    calendarWrap?.setAttribute("aria-busy", "false");
  };

  const loadCalendar = (email, name) => {
    if (calendarLoaded || !calEmbed) return;
    calendarLoaded = true;

    const observer = new MutationObserver(() => {
      const frame = calEmbed.querySelector("iframe");
      if (!frame) return;
      frame.addEventListener("load", markCalendarLoaded, { once: true });
      window.setTimeout(markCalendarLoaded, 2500);
      observer.disconnect();
    });
    observer.observe(calEmbed, { childList: true, subtree: true });

    ((C, A, L) => {
      const p = (a, ar) => a.q.push(ar);
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal;
        const ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          const script = d.createElement("script");
          script.src = A;
          script.async = true;
          script.onerror = () => {
            calendarWrap?.setAttribute("aria-busy", "false");
            if (calendarLoading) calendarLoading.textContent = "Calendar could not load. Use the direct link below.";
          };
          d.head.appendChild(script);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    Cal("init", { origin: "https://app.cal.com" });
    Cal("inline", {
      elementOrSelector: "#funnel-cal",
      calLink: calEmbed.dataset.calLink,
      config: { layout: "month_view", theme: "light", email, name }
    });
    Cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    Cal("on", { action: "bookingSuccessfulV2", callback: () => window.location.assign("growth-operator-confirmed.html") });
  };

  nextButton.addEventListener("click", () => {
    if (!validateStep()) return;
    dispatch("growth_operator_assessment_answered", { step: currentStep + 1 });
    updateStep(currentStep + 1);
  });

  backButton.addEventListener("click", () => updateStep(currentStep - 1));

  form.addEventListener("change", (event) => {
    if (!event.target.matches("input[type='checkbox'], input[type='radio']")) return;
    const label = event.target.closest("label");
    if (label) label.classList.toggle("is-selected", event.target.checked);
    if (event.target.type === "radio") {
      event.target.closest(".choice-grid")?.querySelectorAll("label").forEach((item) => item.classList.toggle("is-selected", item.querySelector("input")?.checked));
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true);
    status.textContent = "Reviewing your answers…";

    const formData = new FormData(form);
    formData.append("access_key", form.dataset.web3formsKey);
    formData.append("page", window.location.href);
    formData.append("assessment_status", "Completed");

    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not send your assessment.");

      dispatch("booking_questionnaire_submitted", { flow_variant: "growth_operator_funnel" });
      form.hidden = true;
      document.querySelector(".assessment-meta")?.setAttribute("hidden", "");
      document.querySelector(".assessment-progress")?.setAttribute("hidden", "");
      calendarResult.hidden = false;
      loadCalendar(String(formData.get("email") || "").trim(), String(formData.get("name") || "").trim());
      calendarResult.focus({ preventScroll: true });
      calendarResult.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      status.textContent = error.message || "Something went wrong. Please try again.";
      status.classList.add("is-error");
    } finally {
      setSubmitting(false);
    }
  });

  document.querySelectorAll('a[href="#assessment"]').forEach((link) => {
    link.addEventListener("click", () => dispatch("growth_operator_assessment_cta_clicked", { label: link.textContent.trim() }));
  });

  document.querySelectorAll(".faq details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      const marker = detail.querySelector("summary span");
      if (marker) marker.textContent = detail.open ? "−" : "+";
    });
  });

  updateStep(0, false);
})();
