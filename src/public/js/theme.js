const toggleBtn = document.getElementById("themeToggle");

/* =========================
   LOAD SAVED THEME
========================= */
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
}

/* =========================
   TOGGLE THEME
========================= */
if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}