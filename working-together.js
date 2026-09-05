(() => {
  const panels = [...document.querySelectorAll(".wt-accordion")];
  if (!panels.length) return;

  const getPanel = (hash) => {
    if (!hash || hash === "#") return null;
    return document.getElementById(hash.slice(1));
  };

  const openPanel = (panel) => {
    if (!panel?.matches(".wt-accordion")) return;
    panels.forEach((item) => {
      item.open = item === panel;
    });
  };

  const alignPanel = (panel) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  panels.forEach((panel) => {
    panel.addEventListener("toggle", () => {
      if (!panel.open) return;
      panels.forEach((item) => {
        if (item !== panel) item.open = false;
      });
      alignPanel(panel);
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      const panel = getPanel(hash);
      if (!panel?.matches(".wt-accordion")) return;
      event.preventDefault();
      window.history.pushState(null, "", hash);
      const wasOpen = panel.open;
      openPanel(panel);
      if (wasOpen) alignPanel(panel);
    });
  });

  window.addEventListener("hashchange", () => {
    openPanel(getPanel(window.location.hash));
  });

  if (window.location.hash) {
    openPanel(getPanel(window.location.hash));
  }
})();
