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
const blogActionLinks = document.querySelectorAll(".blog-actions a");

profileCards.forEach((card) => {
  card.addEventListener("click", () => {
    const nameElement = card.querySelector(".profile-name");
    const profile = nameElement ? nameElement.textContent.trim() : "Unknown";
    const href = card.getAttribute("href") || "";

    trackEvent("Profile Click", { profile, href });
  });
});

blogActionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const label = link.textContent ? link.textContent.trim() : "Unknown";
    const href = link.getAttribute("href") || "";

    trackEvent("Blog CTA Click", { label, href });
  });
});

const revealItems = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealObserver = null;

const observeRevealItem = (item) => {
  if (!item) {
    return;
  }

  if (prefersReducedMotion) {
    item.classList.add("is-visible");
    return;
  }

  if (revealObserver) {
    revealObserver.observe(item);
  } else {
    item.classList.add("is-visible");
  }
};

if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else if (revealItems.length > 0) {
  revealObserver = new IntersectionObserver(
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

  revealItems.forEach((item) => revealObserver.observe(item));
}

const blogFeed = document.querySelector("[data-blog-feed]");
const blogFeedUrl = "https://queueforge.dev/blog/rss.xml";

const stripHtml = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const clampText = (value, maxLength) => {
  if (!value) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
};

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const buildBlogCard = (item) => {
  const title = item.querySelector("title")?.textContent?.trim() || "QueueForge Blog";
  const link = item.querySelector("link")?.textContent?.trim() || "https://queueforge.dev/blog";
  const description = item.querySelector("description")?.textContent || "";
  const pubDate = item.querySelector("pubDate")?.textContent || "";

  const excerpt = clampText(stripHtml(description), 160) || "Read the full post on queueforge.dev.";
  const formattedDate = formatDate(pubDate) || "New post";

  const card = document.createElement("article");
  card.className = "card blog-card";

  const cardTop = document.createElement("div");
  cardTop.className = "card-top";

  const eyebrow = document.createElement("p");
  eyebrow.className = "card-eyebrow";
  eyebrow.textContent = "QueueForge Blog";

  const heading = document.createElement("h3");
  heading.textContent = title;

  cardTop.append(eyebrow, heading);

  const excerptNode = document.createElement("p");
  excerptNode.className = "blog-excerpt";
  excerptNode.textContent = excerpt;

  const meta = document.createElement("div");
  meta.className = "blog-meta";

  const metaSite = document.createElement("span");
  metaSite.textContent = "queueforge.dev";

  const metaDate = document.createElement("span");
  metaDate.textContent = formattedDate;

  meta.append(metaSite, metaDate);

  const cta = document.createElement("a");
  cta.className = "card-link";
  cta.href = link;
  cta.target = "_blank";
  cta.rel = "noopener noreferrer";
  cta.textContent = "Read article";

  card.append(cardTop, excerptNode, meta, cta);
  observeRevealItem(card);

  return card;
};

if (blogFeed) {
  blogFeed.addEventListener("click", (event) => {
    const link = event.target.closest("a");

    if (!link) {
      return;
    }

    const card = link.closest(".blog-card");
    const title = card?.querySelector("h3")?.textContent?.trim() || "Unknown";
    const href = link.getAttribute("href") || "";

    trackEvent("Blog Card Click", { title, href });
  });

  fetch(blogFeedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("QueueForge RSS request failed.");
      }

      return response.text();
    })
    .then((xmlText) => {
      const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
      const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 6);

      if (!items.length) {
        return;
      }

      const fragment = document.createDocumentFragment();
      items.forEach((item) => fragment.appendChild(buildBlogCard(item)));

      blogFeed.innerHTML = "";
      blogFeed.appendChild(fragment);
    })
    .catch(() => {
      // Keep the static fallback cards when RSS is unavailable.
    });
}
