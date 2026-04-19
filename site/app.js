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
      a.setAttribute("role", "listitem");

      const img = document.createElement("img");
      img.src = `photos/${p.file}`;
      img.alt = altFor(p);
      img.loading = "lazy";
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
    applyFilter();
  }

  function applyFilter() {
    document.querySelectorAll(".grid-item").forEach(el => {
      const match = activeCategory === "all" || el.dataset.category === activeCategory;
      el.classList.toggle("is-hidden", !match);
    });
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
