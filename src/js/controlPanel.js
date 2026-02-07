;(function () {
  document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userMenu");

    if (btn && menu) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
      });

      document.addEventListener("click", (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.add("hidden");
        }
      });
    }

    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebarToggle");

    if (sidebar && toggle) {
      toggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }

  });
})();
