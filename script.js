const header = document.querySelector("[data-header]");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

const trackEvent = (name, props = {}) => {
  if (typeof window.ghostlyx === "function") {
    window.ghostlyx("event", name, props);
  }
};

if (header && navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      const label = link.textContent ? link.textContent.trim() : "Unknown";
      const href = link.getAttribute("href") || "";

      trackEvent("Navbar Click", { label, href });

      if (header.classList.contains("nav-open")) {
        header.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

const profileCards = document.querySelectorAll(".profile-card");

profileCards.forEach((card) => {
  card.addEventListener("click", () => {
    const nameElement = card.querySelector(".profile-name");
    const profile = nameElement ? nameElement.textContent.trim() : "Unknown";
    const href = card.getAttribute("href") || "";

    trackEvent("Profile Click", { profile, href });
  });
});

const revealItems = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else if (revealItems.length > 0) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
}
