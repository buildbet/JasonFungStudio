(() => {
  const form = document.querySelector("#reserve-form");
  const scheduler = document.querySelector("#mini-scheduler");
  const status = document.querySelector("#reserve-status");
  const calendar = document.querySelector("#mini-calendar");
  const monthLabel = document.querySelector("#calendar-month");
  const timeGrid = document.querySelector("#time-grid");
  const timezoneLabel = document.querySelector("#timezone-label");
  const confirmButton = document.querySelector("#confirm-reservation");
  if (!form || !scheduler || !calendar || !timeGrid || !confirmButton) return;

  const dispatch = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const times = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"];
  let selectedDate = "";
  let selectedTime = "";
  let timezone = "America/Los_Angeles";

  const updateConfirm = () => { confirmButton.disabled = !(selectedDate && selectedTime); };
  const renderTimes = () => {
    timeGrid.replaceChildren(...times.map((time) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `time-option${selectedTime === time ? " is-selected" : ""}`;
      button.textContent = time;
      button.addEventListener("click", () => { selectedTime = time; renderTimes(); updateConfirm(); });
      return button;
    }));
  };

  const renderCalendar = () => {
    const today = new Date();
    monthLabel.textContent = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dates = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index + 1);
      return date;
    });
    calendar.replaceChildren(...dates.map((date, index) => {
      const value = date.toISOString().slice(0, 10);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `date-option${selectedDate === value ? " is-selected" : ""}`;
      button.disabled = index >= 7;
      button.setAttribute("aria-label", date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
      button.innerHTML = `<small>${date.toLocaleDateString("en-US", { weekday: "short" })}</small><strong>${date.getDate()}</strong>`;
      button.addEventListener("click", () => { selectedDate = value; renderCalendar(); updateConfirm(); });
      return button;
    }));
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.elements.email;
    status.textContent = "";
    if (!email.checkValidity()) {
      status.textContent = "Enter a valid email address to see available times.";
      email.focus();
      return;
    }
    scheduler.hidden = false;
    form.querySelector("button").textContent = "Reserved ✓";
    form.querySelector("button").disabled = true;
    email.readOnly = true;
    renderCalendar();
    renderTimes();
    scheduler.scrollIntoView({ behavior: "smooth", block: "center" });
    dispatch("growth_operator_reservation_started", { flow_variant: "growth_operator_funnel" });
  });

  document.querySelectorAll("[data-timezone]").forEach((button) => {
    button.addEventListener("click", () => {
      timezone = button.dataset.timezone;
      timezoneLabel.textContent = button.textContent;
      document.querySelectorAll("[data-timezone]").forEach((item) => item.classList.toggle("is-active", item === button));
    });
  });

  confirmButton.addEventListener("click", async () => {
    confirmButton.disabled = true;
    confirmButton.textContent = "Confirming…";
    const data = new FormData();
    data.append("access_key", form.dataset.web3formsKey);
    data.append("subject", "Growth Operator call reservation");
    data.append("from_name", "Jason Fung Studio website");
    data.append("email", form.elements.email.value.trim());
    data.append("date", selectedDate);
    data.append("time", selectedTime);
    data.append("timezone", timezone);
    data.append("page", window.location.href);
    try {
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Could not confirm your reservation.");
      dispatch("growth_operator_reservation_confirmed", { date: selectedDate, time: selectedTime, timezone });
      window.location.assign("growth-operator-confirmed.html");
    } catch (error) {
      status.textContent = `${error.message} Please try again.`;
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirm reservation";
    }
  });

  document.querySelectorAll(".faq details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      const marker = detail.querySelector("summary span");
      if (marker) marker.textContent = detail.open ? "−" : "+";
    });
  });

})();
