document.addEventListener("DOMContentLoaded", () => {
  const cookieBanner = document.querySelector("[data-cookie-banner]");
  const cookieAccept = document.querySelector("[data-cookie-accept]");
  if (cookieBanner) {
    const accepted = window.localStorage.getItem("freundschaftCookieNotice") === "accepted";
    cookieBanner.classList.toggle("is-hidden", accepted);

    cookieAccept?.addEventListener("click", () => {
      window.localStorage.setItem("freundschaftCookieNotice", "accepted");
      cookieBanner.classList.add("is-hidden");
    });
  }

  document.querySelectorAll(".bites-header").forEach((header) => {
    const toggle = header.querySelector(".bites-menu-toggle");
    const nav = header.querySelector(".bites-nav");
    const reserve = header.querySelector(".bites-reserve");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
      reserve?.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
  });

  document.querySelectorAll("form[data-local-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const status = form.querySelector(".form-status");
      const invalid = Array.from(form.querySelectorAll("[required]")).find((field) => {
        if (field.type === "checkbox") return !field.checked;
        return !field.value.trim();
      });

      if (invalid) {
        invalid.focus();
        if (status) {
          status.textContent = "Bitte füllen Sie die markierten Pflichtfelder aus.";
        }
        return;
      }

      form.reset();
      if (status) {
        status.textContent = "Danke! In dieser lokalen HTML-Version wird keine Nachricht versendet.";
      }
    });
  });

  const lightbox = document.querySelector("dialog.lightbox");
  const lightboxImage = lightbox?.querySelector("img");
  const closeButton = lightbox?.querySelector("button");

  if (lightbox && lightboxImage) {
    document.querySelectorAll("[data-lightbox]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const img = trigger.querySelector("img");
        if (!img) return;
        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt;
        lightbox.showModal();
      });
    });

    closeButton?.addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });
  }

  document.querySelectorAll("[data-rotating-image]").forEach((image, slotIndex) => {
    const images = image.dataset.images?.split("|").filter(Boolean) || [];
    const alts = image.dataset.alts?.split("|") || [];
    const interval = Number(image.dataset.interval) || 5000;
    if (images.length < 2) return;

    let index = 0;
    images.slice(1).forEach((src) => {
      const preload = new Image();
      preload.src = src;
    });

    window.setTimeout(() => {
      window.setInterval(() => {
        index = (index + 1) % images.length;
        image.classList.add("is-changing");

        window.setTimeout(() => {
          image.src = images[index];
          image.alt = alts[index] || image.alt;
          image.classList.remove("is-changing");
        }, 520);
      }, interval);
    }, slotIndex * 900);
  });

  const countUpNumbers = document.querySelectorAll("[data-count-up]");
  const revealBlocks = document.querySelectorAll("[data-reveal]");
  const animateCount = (number, options = {}) => {
    if (number.closest(".kegel-scroll-story")) return;
    if (!options.repeat && number.dataset.counted === "true") return;
    number.dataset.counted = "true";

    const target = Number(number.dataset.countUp);
    const duration = Number(number.dataset.duration) || 1200;
    const start = performance.now();
    const animationId = `${start}-${Math.random()}`;
    number.dataset.countAnimationId = animationId;
    number.textContent = "0";

    const tick = (now) => {
      if (number.dataset.countAnimationId !== animationId) return;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      number.textContent = Math.round(target * eased).toString();

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        number.textContent = target.toString();
      }
    };

    window.requestAnimationFrame(tick);
  };

  if (countUpNumbers.length) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const repeat = Boolean(entry.target.closest(".kegel-hero-card"));

          if (entry.isIntersecting) {
            animateCount(entry.target, { repeat });
            if (!repeat) observer.unobserve(entry.target);
            return;
          }

          if (repeat) {
            entry.target.dataset.counted = "false";
            entry.target.dataset.countAnimationId = "";
            entry.target.textContent = "0";
          }
        });
      }, { threshold: 0.45 });

      countUpNumbers.forEach((number) => observer.observe(number));
    } else {
      countUpNumbers.forEach(animateCount);
    }
  }

  if (revealBlocks.length) {
    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.18 });

      revealBlocks.forEach((block) => revealObserver.observe(block));
    } else {
      revealBlocks.forEach((block) => block.classList.add("is-visible"));
    }
  }

  const kegelStory = document.querySelector(".kegel-scroll-story");
  const kegelCountNumbers = kegelStory ? Array.from(kegelStory.querySelectorAll("[data-count-up]")) : [];
  if (kegelStory && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    kegelStory.style.setProperty("--kegel-stats-opacity", "1");
    kegelStory.style.setProperty("--kegel-stats-y", "0px");
    kegelStory.style.setProperty("--kegel-stats-scale", "1");
    kegelStory.style.setProperty("--kegel-stats-blur", "0px");
    kegelCountNumbers.forEach((number) => {
      number.textContent = number.dataset.countUp || number.textContent;
    });
  } else if (kegelStory) {
    let ticking = false;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updateKegelStory = () => {
      const rect = kegelStory.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, 1);
      const zoomProgress = clamp(progress / 0.66, 0, 1);
      const statsProgress = clamp((progress - 0.58) / 0.34, 0, 1);

      kegelStory.style.setProperty("--kegel-progress", progress.toFixed(3));
      kegelStory.style.setProperty("--kegel-stats-progress", statsProgress.toFixed(3));
      kegelStory.style.setProperty("--kegel-zoom-scale", (1 + zoomProgress * 4.55).toFixed(3));
      kegelStory.style.setProperty("--kegel-zoom-y", `${(-18 * zoomProgress).toFixed(2)}%`);
      kegelStory.style.setProperty("--kegel-copy-opacity", clamp(1 - zoomProgress * 1.08, 0, 1).toFixed(3));
      kegelStory.style.setProperty("--kegel-copy-y", `${(-78 * zoomProgress).toFixed(1)}px`);
      kegelStory.style.setProperty("--kegel-stats-opacity", statsProgress.toFixed(3));
      kegelStory.style.setProperty("--kegel-stats-y", "0px");
      kegelStory.style.setProperty("--kegel-stats-scale", (0.24 + statsProgress * 0.76).toFixed(3));
      kegelStory.style.setProperty("--kegel-stats-blur", `${(14 - statsProgress * 14).toFixed(1)}px`);
      kegelCountNumbers.forEach((number) => {
        const target = Number(number.dataset.countUp) || 0;
        number.textContent = Math.round(target * statsProgress).toString();
      });
      ticking = false;
    };

    const requestKegelUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateKegelStory);
    };

    updateKegelStory();
    window.addEventListener("scroll", requestKegelUpdate, { passive: true });
    window.addEventListener("resize", requestKegelUpdate);
  }

  document.querySelectorAll("[data-slider]").forEach((slider) => {
    const currentImage = slider.querySelector("[data-slider-current]");
    const thumbs = Array.from(slider.querySelectorAll("[data-slider-thumb]"));
    const previous = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    if (!currentImage || thumbs.length === 0) return;

    let index = Math.max(0, thumbs.findIndex((thumb) => thumb.getAttribute("aria-current") === "true"));

    const showSlide = (nextIndex) => {
      index = (nextIndex + thumbs.length) % thumbs.length;
      const thumb = thumbs[index];
      const src = thumb.dataset.src;
      const alt = thumb.dataset.alt || "";
      if (!src) return;

      currentImage.classList.add("is-changing");
      window.setTimeout(() => {
        currentImage.src = src;
        currentImage.alt = alt;
        currentImage.classList.remove("is-changing");
      }, 180);

      thumbs.forEach((item, itemIndex) => {
        if (itemIndex === index) {
          item.setAttribute("aria-current", "true");
          item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
          item.removeAttribute("aria-current");
        }
      });
    };

    thumbs.forEach((thumb, thumbIndex) => {
      thumb.addEventListener("click", () => showSlide(thumbIndex));
    });

    previous?.addEventListener("click", () => showSlide(index - 1));
    next?.addEventListener("click", () => showSlide(index + 1));
  });
});
