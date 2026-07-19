(function () {
  "use strict";

  var storageKey = "pratyaksh-color-theme";
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function storedTheme() {
    try {
      var value = localStorage.getItem(storageKey);
      return value === "light" || value === "dark" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function preferredTheme() {
    return storedTheme() || (media.matches ? "dark" : "light");
  }

  function iconFor(theme) {
    if (theme === "dark") {
      return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>';
    }

    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }

  function updateButton(theme) {
    var button = document.querySelector(".theme-toggle");
    if (!button) return;

    var nextTheme = theme === "dark" ? "light" : "dark";
    button.innerHTML = iconFor(theme);
    button.setAttribute("aria-label", "Switch to " + nextTheme + " mode");
    button.setAttribute("title", "Switch to " + nextTheme + " mode");
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.appendChild(themeColor);
    }
    themeColor.content = theme === "dark" ? "#101317" : "#f9f9f9";

    updateButton(theme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: theme } }));
  }

  applyTheme(preferredTheme());

  function mountToggle() {
    if (document.querySelector(".theme-toggle")) return;

    var button = document.createElement("button");
    button.className = "theme-toggle";
    button.type = "button";
    button.addEventListener("click", function () {
      var theme = root.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        // The selected theme still applies for this page when storage is unavailable.
      }
      applyTheme(theme);
    });

    document.body.appendChild(button);
    updateButton(root.dataset.theme);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }

  function handleSystemTheme(event) {
    if (!storedTheme()) applyTheme(event.matches ? "dark" : "light");
  }

  if (media.addEventListener) {
    media.addEventListener("change", handleSystemTheme);
  } else {
    media.addListener(handleSystemTheme);
  }

  window.addEventListener("storage", function (event) {
    if (event.key === storageKey) applyTheme(preferredTheme());
  });
})();
