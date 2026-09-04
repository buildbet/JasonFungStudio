(() => {
  const source = new URLSearchParams(window.location.search).get("from");
  if (source !== "growth-operator") return;

  const brand = document.querySelector(".selected-brand");
  if (brand) {
    brand.href = "../growth-operator.html";
    brand.setAttribute("aria-label", "Return to Growth Operator");
  }

  document.querySelectorAll(".selected-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    if (href === "../selected-work-2.html") {
      link.href = "../growth-operator-work.html";
      return;
    }

    if (/^(shopify|campaigns|creative|pandaii)-2\.html$/.test(href)) {
      link.href = `${href}?from=growth-operator`;
    }
  });

  const headerCta = document.querySelector(".selected-cta");
  if (headerCta) {
    headerCta.href = "../growth-operator.html";
    headerCta.textContent = "Back to Growth Operator";
  }

  document.querySelectorAll(".return-button").forEach((link) => {
    link.href = "../growth-operator-start.html";
    link.innerHTML = "Start the handoff <span>→</span>";
  });
})();
