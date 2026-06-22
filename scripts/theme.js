(() => {
  const root = document.documentElement;
  const toggleButton = document.getElementById("theme-toggle");
  const themeColor = document.getElementById("theme-color");

  function applyTheme(theme) {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    toggleButton.textContent = isDark ? "Light mode" : "Dark mode";
    toggleButton.setAttribute("aria-pressed", String(isDark));
    toggleButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeColor.setAttribute("content", isDark ? "#121212" : "#fafafa");
  }

  applyTheme(root.dataset.theme || "light");

  toggleButton.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch (_) {
      // The selected theme still applies when storage is unavailable.
    }
  });
})();
