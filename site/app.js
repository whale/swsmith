(() => {
  const grid = document.getElementById("grid");
  const filters = document.querySelectorAll(".filter");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");

  let photos = [];
  let activeCategory = "all";
  let currentIndex = -1;

  const photoHeader = document.querySelector(".photography-header");
  const FADE_DISTANCE = 80;
  let ticking = false;
  let isCrossfading = false;

  function getColumnCount() {
    const w = window.innerWidth;
    if (w <= 540) return 2;
    if (w <= 780) return 3;
    if (w <= 1024) return 4;
    if (w <= 1280) return 5;
    return 6;
  }

  function layoutMasonry() {
    if (!grid) return;
    const items = [...grid.querySelectorAll(".grid-item")];
    if (!items.length) return;
    const cols = getColumnCount();
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 16;
    const containerWidth = grid.clientWidth;
    const colWidth = (containerWidth - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);

    items.forEach(item => {
      const w = Number(item.dataset.w) || 1;
      const h = Number(item.dataset.h) || 1;
      const scaledH = colWidth * (h / w);
      const minH = Math.min(...heights);
      const idx = heights.indexOf(minH);
      item.style.width = `${colWidth}px`;
      item.style.left = `${idx * (colWidth + gap)}px`;
      item.style.top = `${minH}px`;
      heights[idx] = minH + scaledH + gap;
    });

    grid.style.height = `${Math.max(...heights) - gap}px`;
  }

  function updateFades() {
    ticking = false;
    if (!photoHeader || isCrossfading) return;
    const headerBottom = photoHeader.getBoundingClientRect().bottom;
    document.querySelectorAll(".grid-item").forEach(item => {
      const top = item.getBoundingClientRect().top;
      const delta = top - headerBottom;
      let opacity = 1;
      if (delta <= 0) opacity = 0;
      else if (delta < FADE_DISTANCE) opacity = delta / FADE_DISTANCE;
      item.style.opacity = opacity === 1 ? "" : String(opacity);
    });
  }

  function altFor(photo) {
    return photo.caption || photo.file.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  }

  function visiblePhotos() {
    return activeCategory === "all"
      ? photos
      : photos.filter(p => p.category === activeCategory);
  }

  function renderGrid() {
    const frag = document.createDocumentFragment();
    photos.forEach((p, i) => {
      const a = document.createElement("a");
      a.href = `photos/${p.file}`;
      a.className = "grid-item";
      a.dataset.category = p.category;
      a.dataset.index = String(i);
      a.dataset.w = String(p.width || 1);
      a.dataset.h = String(p.height || 1);
      a.setAttribute("role", "listitem");

      const img = document.createElement("img");
      img.src = `photos/${p.file}`;
      img.alt = altFor(p);
      img.loading = "lazy";
      img.setAttribute("nopin", "nopin");
      if (p.width && p.height) {
        img.width = p.width;
        img.height = p.height;
      }

      a.appendChild(img);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openLightbox(i);
      });
      frag.appendChild(a);
    });
    grid.replaceChildren(frag);
    applyFilter(false);
  }

  const itemJitter = new WeakMap();

  function applyFilter(animate = true) {
    const items = [...grid.querySelectorAll(".grid-item")];
    items.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));

    const doReorder = () => {
      items.forEach(el => {
        const match = activeCategory === "all" || el.dataset.category === activeCategory;
        el.classList.toggle("is-hidden", !match);
      });
      const ordered = [
        ...items.filter(el => !el.classList.contains("is-hidden")),
        ...items.filter(el => el.classList.contains("is-hidden"))
      ];
      ordered.forEach(el => grid.appendChild(el));
      layoutMasonry();
    };

    if (!animate) {
      doReorder();
      updateFades();
      return;
    }

    const STAGGER = 180;
    const FADE = 160;
    const JITTER = 240;
    const TOTAL = STAGGER + JITTER + FADE;
    const maxDist = Math.hypot(window.innerWidth, window.innerHeight);
    items.forEach(it => {
      if (!itemJitter.has(it)) itemJitter.set(it, Math.random() * JITTER);
    });
    const delayFor = item => {
      const r = item.getBoundingClientRect();
      const x = Math.max(0, r.left);
      const y = Math.max(0, r.top);
      const base = Math.min(STAGGER, (Math.hypot(x, y) / maxDist) * STAGGER);
      return base + itemJitter.get(item);
    };

    isCrossfading = true;
    items.forEach(item => {
      item.style.transition = `opacity ${FADE}ms ease`;
      item.style.transitionDelay = `${delayFor(item)}ms`;
      item.style.opacity = "0";
    });
    setTimeout(() => {
      doReorder();
      void grid.offsetHeight;
      items.forEach(item => {
        item.style.transitionDelay = `${delayFor(item)}ms`;
        item.style.opacity = "";
      });
      setTimeout(() => {
        items.forEach(item => {
          item.style.transition = "";
          item.style.transitionDelay = "";
        });
        isCrossfading = false;
        updateFades();
      }, TOTAL + 40);
    }, TOTAL);
  }

  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      filters.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      activeCategory = btn.dataset.category;
      applyFilter();
    });
  });

  function openLightbox(index) {
    const list = visiblePhotos();
    const photo = photos[index];
    currentIndex = list.indexOf(photo);
    if (currentIndex < 0) currentIndex = 0;
    showCurrent();
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  }

  function showCurrent() {
    const list = visiblePhotos();
    const photo = list[currentIndex];
    if (!photo) return;
    lightboxImage.src = `photos/${photo.file}`;
    lightboxImage.alt = altFor(photo);
  }

  function closeLightbox() {
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
    document.body.classList.remove("lightbox-open");
  }

  function step(delta) {
    const list = visiblePhotos();
    if (!list.length) return;
    currentIndex = (currentIndex + delta + list.length) % list.length;
    showCurrent();
  }

  function showError(message) {
    const msg = document.createElement("p");
    msg.textContent = message;
    msg.style.color = "var(--text-dim)";
    grid.replaceChildren(msg);
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => step(-1));
  lightboxNext.addEventListener("click", () => step(1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.getAttribute("aria-hidden") === "true") return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  if (photoHeader) {
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateFades);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  let resizeRaf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      layoutMasonry();
      updateFades();
      updateFiltersEdgeMask();
    });
  }, { passive: true });

  const filtersEl = document.querySelector(".filters");
  function updateFiltersEdgeMask() {
    if (!filtersEl) return;
    const atEnd = filtersEl.scrollLeft + filtersEl.clientWidth >= filtersEl.scrollWidth - 1;
    filtersEl.classList.toggle("at-end", atEnd);
  }
  if (filtersEl) {
    filtersEl.addEventListener("scroll", updateFiltersEdgeMask, { passive: true });
    updateFiltersEdgeMask();
  }

  fetch("photos.json", { cache: "no-cache" })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`photos.json ${r.status}`)))
    .then(data => {
      photos = data;
      renderGrid();
    })
    .catch(err => {
      console.error("Failed to load photos.json:", err);
      showError("Could not load photos.");
    });
})();
