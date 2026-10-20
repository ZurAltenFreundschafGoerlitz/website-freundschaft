// Interpret reservations in the restaurant's time zone, also for guests abroad.
function isShortNoticeBooking(date, time, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const berlinTime = (day, clock) => {
    const target = Date.parse(`${day}T${clock}:00Z`);
    let timestamp = target;
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
      const wallTime = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
      timestamp += target - wallTime;
    }
    return timestamp;
  };
  const end = now + 24 * 60 * 60 * 1000;
  if (/^\d{2}:\d{2}$/.test(time)) {
    const requested = berlinTime(date, time);
    return requested >= now && requested <= end;
  }
  // Without a time, warn if any part of the selected day overlaps the next 24 hours.
  return berlinTime(date, "23:59") + 59999 >= now && berlinTime(date, "00:00") <= end;
}

document.addEventListener("DOMContentLoaded", () => {
  // Show the temporary email notice once per visit, including direct subpage visits.
  const emailNoticeKey = "freundschaftEmailNotice202610";
  let emailNoticeDismissed = false;
  try {
    emailNoticeDismissed = sessionStorage.getItem(emailNoticeKey) === "dismissed";
  } catch (_) {
    // The notice also works when browser storage is unavailable.
  }
  if (!emailNoticeDismissed && !document.querySelector("[data-short-notice-dialog]")) {
    const notice = document.createElement("dialog");
    notice.className = "email-notice";
    notice.setAttribute("aria-labelledby", "email-notice-title");
    notice.setAttribute("aria-describedby", "email-notice-description");
    notice.innerHTML = `
      <p class="email-notice-eyebrow">Wichtige Information</p>
      <h2 id="email-notice-title">Hinweis zu Ihren E-Mail-Anfragen</h2>
      <div id="email-notice-description">
        <p>In den letzten Tagen gab es technische Probleme mit unserem E-Mail-Postfach. Daher konnten uns möglicherweise nicht alle Anfragen erreichen oder von uns beantwortet werden.</p>
        <p>Falls Sie noch auf eine Antwort warten, bitten wir Sie, Ihre Anfrage erneut zu stellen oder telefonisch bei uns nachzufragen. Bei dringenden Anliegen erreichen Sie uns am besten telefonisch.</p>
        <p>Wir bitten um Entschuldigung und danken Ihnen für Ihr Verständnis.</p>
      </div>
      <div class="email-notice-phones">
        <a href="tel:+493581879499">03581 87 94 99</a>
        <a href="tel:+491711430783">0171 1430783</a>
      </div>
      <form method="dialog">
        <button type="submit" autofocus>Verstanden – zur Website</button>
      </form>
    `;
    document.body.append(notice);
    const previousOverflow = document.documentElement.style.overflow;
    notice.addEventListener("close", () => {
      document.documentElement.style.overflow = previousOverflow;
      try {
        sessionStorage.setItem(emailNoticeKey, "dismissed");
      } catch (_) {}
      notice.remove();
    }, { once: true });
    notice.showModal();
    document.documentElement.style.overflow = "hidden";
  }

  const cookieBanner = document.querySelector("[data-cookie-banner]");
  const cookieAccept = document.querySelector("[data-cookie-accept]");
  const cookieDecline = document.querySelector("[data-cookie-decline]");
  const cookieOpenButtons = document.querySelectorAll("[data-cookie-open]");
  if (cookieBanner) {
    const accepted = window.localStorage.getItem("freundschaftCookieNotice") === "accepted";
    cookieBanner.classList.toggle("is-hidden", accepted);

    const closeCookieBanner = () => {
      window.localStorage.setItem("freundschaftCookieNotice", "accepted");
      cookieBanner.classList.add("is-hidden");
    };

    cookieAccept?.addEventListener("click", closeCookieBanner);
    cookieDecline?.addEventListener("click", closeCookieBanner);
    cookieOpenButtons.forEach((button) => {
      button.addEventListener("click", () => {
        window.localStorage.removeItem("freundschaftCookieNotice");
        cookieBanner.classList.remove("is-hidden");
        cookieAccept?.focus();
      });
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

  const floatingPhone = document.createElement("a");
  floatingPhone.className = "floating-phone";
  floatingPhone.href = "tel:+491711430783";
  floatingPhone.setAttribute("aria-label", "0171 1430783 anrufen");
  floatingPhone.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 1.27 3.38 2 2 0 0 1 3.25 1.2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L7.1 8.93a16 16 0 0 0 6 6l1.29-1.29a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z"/>
    </svg>
  `;
  document.body.append(floatingPhone);

  const shortNoticeDialog = document.querySelector("[data-short-notice-dialog]");
  if (shortNoticeDialog && new URLSearchParams(window.location.search).get("kurzfristig") === "1") {
    const previousOverflow = document.documentElement.style.overflow;
    shortNoticeDialog.addEventListener("close", () => {
      document.documentElement.style.overflow = previousOverflow;
    }, { once: true });
    shortNoticeDialog.showModal();
    document.documentElement.style.overflow = "hidden";
  }

  const bookingDate = document.querySelector("#booking-date");
  const inquiryForm = bookingDate?.closest("form");
  inquiryForm?.addEventListener("submit", () => {
    const next = inquiryForm.querySelector('input[name="_next"]');
    const time = inquiryForm.querySelector("#booking-time").value;
    const destination = new URL("https://www.zur-alten-freundschaft.de/danke.html");
    if (isShortNoticeBooking(bookingDate.value, time)) destination.searchParams.set("kurzfristig", "1");
    next.value = destination.href;
  });
  if (bookingDate) {
    // Keep the ISO date for submission and the 24-hour notice; use an independent UI.
    bookingDate.type = "hidden";
    const textDate = document.createElement("input");
    textDate.id = "booking-date-text";
    textDate.type = "text";
    textDate.placeholder = "TT.MM.JJJJ";
    textDate.autocomplete = "off";
    bookingDate.before(textDate);
    document.querySelector('label[for="booking-date"]').htmlFor = textDate.id;
    const picker = document.createElement("div");
    picker.className = "booking-calendar";
    picker.id = "booking-calendar";
    picker.hidden = true;
    picker.setAttribute("role", "group");
    picker.setAttribute("aria-label", "Datum auswählen");
    textDate.setAttribute("aria-controls", picker.id);
    textDate.setAttribute("aria-expanded", "false");
    const openCalendar = () => { picker.hidden = false; textDate.setAttribute("aria-expanded", "true"); };
    const closeCalendar = () => { picker.hidden = true; textDate.setAttribute("aria-expanded", "false"); };
    textDate.addEventListener("click", openCalendar);
    textDate.addEventListener("focus", openCalendar);
    picker.innerHTML = `
      <div class="calendar-header"><button type="button" aria-label="Vorheriger Monat">‹</button>
      <strong aria-live="polite"></strong><button type="button" aria-label="Nächster Monat">›</button></div>
      <div class="calendar-days"></div>`;
    bookingDate.after(picker);
    const grid = picker.querySelector(".calendar-days");
    const monthLabel = picker.querySelector("strong");
    const today = new Date();
    let month = new Date(today.getFullYear(), today.getMonth(), 1);
    const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const display = value => value ? value.split("-").reverse().join(".") : "";
    const render = () => {
      monthLabel.textContent = month.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      grid.replaceChildren();
      ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(day => {
        const label = document.createElement("span"); label.textContent = day; grid.append(label);
      });
      const offset = (month.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) grid.append(document.createElement("span"));
      const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= days; day++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        const value = iso(date);
        const button = document.createElement("button");
        button.type = "button"; button.textContent = day;
        button.setAttribute("aria-label", date.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }));
        button.setAttribute("aria-pressed", String(value === bookingDate.value));
        button.addEventListener("click", () => {
          bookingDate.value = value; textDate.value = display(value);
          textDate.setCustomValidity(""); textDate.focus(); closeCalendar(); render();
        });
        grid.append(button);
      }
    };
    const syncText = () => {
      const match = textDate.value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      const date = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
      const valid = date && date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]);
      bookingDate.value = valid ? iso(date) : "";
      textDate.setCustomValidity(textDate.value.trim() && !valid ? "Bitte ein gültiges Datum als TT.MM.JJJJ eingeben." : "");
      if (valid) month = new Date(date.getFullYear(), date.getMonth(), 1);
      render();
    };
    textDate.value = display(bookingDate.value);
    textDate.addEventListener("input", syncText);
    picker.querySelector('[aria-label="Vorheriger Monat"]').addEventListener("click", () => {
      month.setMonth(month.getMonth() - 1); render();
    });
    picker.querySelector('[aria-label="Nächster Monat"]').addEventListener("click", () => {
      month.setMonth(month.getMonth() + 1); render();
    });
    const dateRow = bookingDate.parentElement;
    dateRow.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); textDate.focus(); closeCalendar(); }
      if (event.target === textDate && event.key === "ArrowDown") {
        event.preventDefault(); openCalendar();
        (grid.querySelector('[aria-pressed="true"]') || grid.querySelector("button"))?.focus();
      }
    });
    document.addEventListener("pointerdown", event => {
      if (!dateRow.contains(event.target)) closeCalendar();
    });
    dateRow.addEventListener("focusout", event => {
      if (event.relatedTarget && !dateRow.contains(event.relatedTarget)) closeCalendar();
    });
    render();
  }

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

  document.querySelectorAll("[data-review-slider]").forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll("[data-review-slide]"));
    const dots = Array.from(slider.querySelectorAll("[data-review-dot]"));
    const previous = slider.querySelector("[data-review-prev]");
    const next = slider.querySelector("[data-review-next]");
    if (slides.length === 0) return;

    let index = 0;
    let timer = null;

    const showReview = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === index;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    };

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = window.setInterval(() => showReview(index + 1), 5200);
    };

    previous?.addEventListener("click", () => {
      showReview(index - 1);
      start();
    });

    next?.addEventListener("click", () => {
      showReview(index + 1);
      start();
    });

    dots.forEach((dot, dotIndex) => {
      dot.addEventListener("click", () => {
        showReview(dotIndex);
        start();
      });
    });

    slider.addEventListener("mouseenter", stop);
    slider.addEventListener("mouseleave", start);
    slider.addEventListener("focusin", stop);
    slider.addEventListener("focusout", start);

    showReview(0);
    start();
  });
});
