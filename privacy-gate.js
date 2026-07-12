(function () {
  var password = "jasonfungstudio2026";
  var storageKey = "jfs_private_access";
  var root = document.documentElement;

  function unlock(gate) {
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch (error) {
      // Access can continue even if session storage is unavailable.
    }

    root.classList.remove("privacy-gate-pending");

    if (gate) {
      gate.remove();
    }
  }

  try {
    if (sessionStorage.getItem(storageKey) === "true") {
      unlock();
      return;
    }
  } catch (error) {
    // Fall through to the gate when storage is blocked.
  }

  var gate = document.createElement("div");
  gate.className = "privacy-gate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "privacy-gate-title");
  gate.innerHTML = [
    '<section class="privacy-gate__panel">',
    '<p class="privacy-gate__eyebrow">Private preview</p>',
    '<h1 id="privacy-gate-title">Jason Fung Studio</h1>',
    "<p>Enter the current studio password to view this page.</p>",
    '<form class="privacy-gate__form" novalidate>',
    '<label for="privacy-gate-password">Password</label>',
    '<input id="privacy-gate-password" name="password" type="password" autocomplete="current-password" required />',
    '<button type="submit">Open Page</button>',
    '<p class="privacy-gate__error" aria-live="polite"></p>',
    "</form>",
    "</section>"
  ].join("");

  document.body.prepend(gate);

  var form = gate.querySelector("form");
  var input = gate.querySelector("input");
  var error = gate.querySelector(".privacy-gate__error");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (input.value === password) {
      unlock(gate);
      return;
    }

    error.textContent = "That password did not work.";
    input.value = "";
    input.focus();
  });

  window.setTimeout(function () {
    input.focus();
  }, 0);
})();
