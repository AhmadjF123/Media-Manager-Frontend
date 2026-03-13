// ════════════════════════════════════════════════════════
//  CINÉMA — MEDIA VAULT  |  Script (Optimized for Speed)
//  جميع الوظائف الأصلية محفوظة + تحسينات أداء كبيرة
// ════════════════════════════════════════════════════════

window.addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error);
  showToast("خطأ: " + (event.error ? event.error.message : "غير معروف"), "error");
});

// ── API Configuration ──
const TMDB_API_KEY    = "001a45ee2ffa1d6f2f16fc4c16ae276a";
const OMDB_API_KEY    = "5812b153";
const TMDB_BASE_URL   = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL  = "https://image.tmdb.org/t/p/w500";
const API_BASE_URL    = "https://media-manager-backend-wfeb.onrender.com/api/media" || "http://localhost:3000/api/media";

// ── Caching ──
const CACHE_KEY       = "cinema_media_cache";
const CACHE_EXPIRY    = 5 * 60 * 1000; // 5 دقائق

// ── DOM Elements ──
const searchInput       = document.getElementById("search-input");
const searchBySelect    = document.getElementById("search-by");
const filterTypeSelect  = document.getElementById("filter-type");
const searchBtn         = document.getElementById("search-btn");
const resultsTable      = document.getElementById("results-table");
const resultsBody       = document.getElementById("results-body");
const statusLabel       = document.getElementById("status-label");
const selectAllCheckbox = document.getElementById("select-all");
const editBtn           = document.getElementById("edit-btn");
const deleteBtn         = document.getElementById("delete-btn");
const addForm           = document.getElementById("add-form");
const titleInput        = document.getElementById("title");
const genreInput        = document.getElementById("genre");
const releaseYearInput  = document.getElementById("release-year");
const endYearInput      = document.getElementById("end-year");
const endYearGroup      = document.getElementById("end-year-group");
const ratingInput       = document.getElementById("rating");
const mediaTypeSelect   = document.getElementById("media-type");
const autoFillBtn       = document.getElementById("auto-fill-btn");
const posterImage       = document.getElementById("poster-image");
const posterPlaceholder = document.getElementById("poster-placeholder");
const editModal         = document.getElementById("edit-modal");
const closeModalBtn     = document.querySelector(".close");
const editForm          = document.getElementById("edit-form");
const editIdInput       = document.getElementById("edit-id");
const editOrderInput    = document.getElementById("edit-order");
const editTitleInput    = document.getElementById("edit-title");
const editGenreInput    = document.getElementById("edit-genre");
const editReleaseYearInput = document.getElementById("edit-release-year");
const editEndYearInput  = document.getElementById("edit-end-year");
const editEndYearGroup  = document.getElementById("edit-end-year-group");
const editRatingInput   = document.getElementById("edit-rating");
const editMediaTypeInput = document.getElementById("edit-media-type");
const editAutoFillBtn   = document.getElementById("edit-auto-fill-btn");
const editPosterImage   = document.getElementById("edit-poster-image");
const editPosterPlaceholder = document.getElementById("edit-poster-placeholder");
const toast             = document.getElementById("toast");
const toastMessage      = document.getElementById("toast-message");
const toastIcon         = document.getElementById("toast-icon");
const loadingSpinner    = document.getElementById("loading-spinner");
const themeToggleBtn    = document.getElementById("theme-toggle-btn");

// ── Global state ──
let currentResults  = [];           // كل الوسائط (آخر تحميل)
let currentGridMode = 'grid';        // grid or list
let searchDebounceTimer = null;      // للبحث المباشر

// ════════════════════════════════════════════════════════
//  دوال المساعدة (Debounce)
// ════════════════════════════════════════════════════════
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// ════════════════════════════════════════════════════════
//  جلب البيانات (مع تخزين مؤقت)
// ════════════════════════════════════════════════════════
async function fetchAllMedia(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      } catch (e) { /* تجاهل الأخطاء */ }
    }
  }

  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/all`);
    if (!response.ok) throw new Error("فشل الاتصال");
    const data = await response.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (error) {
    showToast("خطأ في جلب البيانات", "error");
    return [];
  } finally {
    hideLoading();
  }
}

// ════════════════════════════════════════════════════════
//  دوال API (الأصلية)
// ════════════════════════════════════════════════════════
async function fetchMedia(mediaType) {
  try {
    const response = await fetch(`${API_BASE_URL}?type=${mediaType}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.map(item => ({
      ...item,
      order_number: parseInt(item.order_number) || 0,
      release_year: parseInt(item.release_year) || 0,
      end_year: parseInt(item.end_year) || 0,
      rating: parseFloat(item.rating) || 0,
    }));
  } catch (error) {
    showToast(`خطأ في جلب ${mediaType}`, "error");
    return [];
  }
}

async function saveMedia(mediaType, mediaData) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaType, data: mediaData }),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    showToast("خطأ في الحفظ", "error");
    return false;
  }
}

async function updateMedia(mediaType, orderNumber, mediaData) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaType, order_number: orderNumber, data: mediaData }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    showToast("خطأ في التحديث", "error");
    return false;
  }
}

async function deleteMedia(mediaType, orderNumber) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaType, order_number: orderNumber }),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    showToast("خطأ في الحذف", "error");
    return false;
  }
}

// ════════════════════════════════════════════════════════
//  البحث المباشر (فلترة محلية)
// ════════════════════════════════════════════════════════
function filterLocalResults() {
  const query = searchInput.value.trim().toLowerCase();
  const by = searchBySelect.value;
  const type = filterTypeSelect.value;

  let filtered = currentResults.filter(item => {
    if (type !== "all" && item.media_type !== type) return false;
    if (!query) return true;

    const val = item[by];
    if (val == null) return false;

    if (by === "title" || by === "genre") {
      return val.toLowerCase().includes(query);
    } else if (by === "release_year") {
      return val.toString() === query;
    } else if (by === "rating") {
      return parseFloat(val) === parseFloat(query);
    }
    return false;
  });

  // ترتيب حسب order_number
  filtered.sort((a, b) => a.order_number - b.order_number);

  // إضافة display_year
  filtered = filtered.map(item => ({
    ...item,
    display_year:
      item.media_type === "series" && item.end_year
        ? item.release_year === item.end_year
          ? item.release_year
          : `${item.release_year}–${item.end_year}`
        : item.release_year,
  }));

  // تحديث واجهة العرض
  updateResultsTable(filtered);
}

// البحث من الخادم (تحديث البيانات المخزنة)
async function searchMedia(forceRefresh = false) {
  try {
    const allMedia = await fetchAllMedia(forceRefresh);
    currentResults = allMedia.map(item => ({
      ...item,
      display_year:
        item.media_type === "series" && item.end_year
          ? item.release_year === item.end_year
            ? item.release_year
            : `${item.release_year}–${item.end_year}`
          : item.release_year,
    }));
    filterLocalResults(); // تطبيق الفلاتر الحالية على البيانات الجديدة
  } catch (error) {
    showToast("خطأ في البحث: " + error.message, "error");
  }
}

// ════════════════════════════════════════════════════════
//  تحديث الجدول والبطاقات
// ════════════════════════════════════════════════════════
function updateResultsTable(results) {
  // تحديث الجدول
  resultsBody.innerHTML = "";
  results.forEach(item => {
    const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="chk" onclick="toggleRowSelection(this)"></td>
      <td>${item.order_number}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.genre)}</td>
      <td>${item.display_year}</td>
      <td>${rating.toFixed(1)}</td>
      <td>${item.media_type}</td>
    `;
    resultsBody.appendChild(row);
  });

  // تحديث الحالة
  statusLabel.textContent = results.length > 0
    ? `${results.length} عنوان${results.length !== 1 ? "ات" : ""} في المجموعة`
    : "لا توجد نتائج";

  // تحديث البطاقات
  updateCardGrid(results);

  // تحديث الإحصائيات
  updateStats(results);

  // إظهار/إخفاء الحالة الفارغة
  const empty = document.getElementById("empty-state");
  if (empty) empty.style.display = results.length === 0 ? "flex" : "none";
}

function updateCardGrid(results) {
  const grid = document.getElementById("card-grid");
  if (!grid) return;
  grid.innerHTML = "";

  results.forEach((item, index) => {
    const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0;
    const ratingColor = rating >= 8 ? "#4caf50" : rating >= 6 ? "#d4a843" : "#e53935";
    const hasPoster = item.poster_url && item.poster_url.startsWith("http");

    const card = document.createElement("div");
    card.className = "media-card";
    card.style.animationDelay = `${index * 0.04}s`;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="card-chk-wrap">
        <input type="checkbox" class="card-chk chk" onclick="event.stopPropagation(); toggleCardSelection(this, ${index})">
      </div>
      <div class="card-poster-wrap">
        ${
          hasPoster
            ? `<img src="${item.poster_url}" alt="${escapeHtml(item.title)}" class="card-poster-img" loading="lazy">`
            : `<div class="card-poster-ph"><i class="fas fa-${item.media_type === "movie" ? "film" : "tv"}"></i></div>`
        }
        <div class="card-overlay">
          <div class="card-rating-badge" style="background:${ratingColor}22;color:${ratingColor};border-color:${ratingColor}55;">
            ★ ${rating.toFixed(1)}
          </div>
          <div class="card-type-chip">${item.media_type === "movie" ? "🎬" : "📺"} ${item.media_type}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title-text" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="card-meta-text">${escapeHtml(item.genre)} · ${item.display_year}</div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("card-chk")) return;
      showDetailModal(item);
    });

    grid.appendChild(card);
  });
}

function toggleCardSelection(checkbox, index) {
  const card = checkbox.closest(".media-card");
  if (checkbox.checked) {
    card.classList.add("selected");
  } else {
    card.classList.remove("selected");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  }
  // مزامنة مع الجدول
  const tableCheckboxes = document.querySelectorAll("#results-body input[type='checkbox']");
  if (tableCheckboxes[index]) {
    tableCheckboxes[index].checked = checkbox.checked;
    toggleRowSelection(tableCheckboxes[index]);
  }
}
window.toggleCardSelection = toggleCardSelection;

function toggleRowSelection(checkbox) {
  const row = checkbox.closest("tr");
  if (checkbox.checked) {
    row.classList.add("selected");
  } else {
    row.classList.remove("selected");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  }
}
window.toggleRowSelection = toggleRowSelection;

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = selectAllCheckbox.checked;
    const row = cb.closest("tr");
    row && (selectAllCheckbox.checked ? row.classList.add("selected") : row.classList.remove("selected"));
  });
  // مزامنة البطاقات
  const cards = document.querySelectorAll(".media-card");
  cards.forEach((card) => {
    selectAllCheckbox.checked ? card.classList.add("selected") : card.classList.remove("selected");
    const chk = card.querySelector(".card-chk");
    if (chk) chk.checked = selectAllCheckbox.checked;
  });
}

// ════════════════════════════════════════════════════════
//  الإحصائيات
// ════════════════════════════════════════════════════════
function updateStats(results) {
  const movies = results.filter(r => r.media_type === "movie");
  const series = results.filter(r => r.media_type === "series");
  const topItem = results.reduce((best, r) => (!best || r.rating > best.rating ? r : best), null);
  const avg = results.length > 0
    ? (results.reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / results.length).toFixed(1)
    : "—";

  const el = (id) => document.getElementById(id);
  if (el("stat-movies")) el("stat-movies").textContent = movies.length;
  if (el("stat-series")) el("stat-series").textContent = series.length;
  if (el("stat-avg")) el("stat-avg").textContent = avg;
  if (el("stat-top")) el("stat-top").textContent = topItem ? topItem.title : "—";
}

// ════════════════════════════════════════════════════════
//  التفاصيل (Detail Modal)
// ════════════════════════════════════════════════════════
function showDetailModal(item) {
  const overlay = document.getElementById("detail-modal");
  if (!overlay) return;

  const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0;

  const poster = document.getElementById("detail-poster");
  const posterPh = document.getElementById("detail-poster-ph");
  const bgBlur = document.getElementById("detail-bg-blur");

  if (item.poster_url && item.poster_url.startsWith("http")) {
    poster.src = item.poster_url;
    poster.style.display = "block";
    posterPh.style.display = "none";
    bgBlur.style.backgroundImage = `url(${item.poster_url})`;
  } else {
    poster.style.display = "none";
    posterPh.style.display = "flex";
    bgBlur.style.backgroundImage = "";
  }

  const typeBadge = document.getElementById("detail-type");
  typeBadge.textContent = item.media_type === "movie" ? "🎬 فيلم" : "📺 مسلسل";
  typeBadge.className = `det-type-badge ${item.media_type}`;

  document.getElementById("detail-title").textContent = item.title;

  document.getElementById("detail-meta").innerHTML = `
    <span class="meta-chip"><i class="fas fa-calendar"></i> ${item.display_year}</span>
    <span class="meta-chip"><i class="fas fa-hashtag"></i> #${item.order_number}</span>
  `;

  const filled = Math.round(rating / 2);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="${i <= filled ? "fas" : "far"} fa-star"></i>`;
  }
  document.getElementById("detail-rating-display").innerHTML = `
    <div class="rating-stars">${stars}</div>
    <div class="rating-number">${rating.toFixed(1)}<span>/10</span></div>
  `;

  const genres = item.genre.split(",").map(g => g.trim());
  document.getElementById("detail-genre-tags").innerHTML = genres
    .map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`)
    .join("");

  document.getElementById("detail-edit-btn").onclick = () => {
    closeDetailModal();
    setTimeout(() => editItemDirectly(item), 200);
  };

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", handleDetEscape);
}

function handleDetEscape(e) {
  if (e.key === "Escape") closeDetailModal();
}

function closeDetailModal() {
  const overlay = document.getElementById("detail-modal");
  if (!overlay) return;
  overlay.style.display = "none";
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleDetEscape);
}
window.closeDetailModal = closeDetailModal;

function editItemDirectly(item) {
  const rows = document.querySelectorAll("#results-body tr");
  rows.forEach((row) => {
    const oCell = row.cells[1];
    const tCell = row.cells[6];
    if (
      oCell &&
      parseInt(oCell.textContent) === item.order_number &&
      tCell &&
      tCell.textContent.toLowerCase() === item.media_type
    ) {
      const cb = row.querySelector("input[type='checkbox']");
      if (cb) {
        cb.checked = true;
        toggleRowSelection(cb);
      }
    }
  });
  editSelected();
}

// ════════════════════════════════════════════════════════
//  إضافة وسائط
// ════════════════════════════════════════════════════════
async function addMedia(e) {
  e.preventDefault();
  const title = titleInput.value.trim();
  const genre = genreInput.value.trim();
  const mediaType = mediaTypeSelect.value;

  if (!title || !genre) {
    showToast("الرجاء ملء جميع الحقول المطلوبة", "error");
    return;
  }

  try {
    const releaseYear = parseInt(releaseYearInput.value);
    const rating = parseFloat(ratingInput.value);

    if (isNaN(releaseYear)) {
      showToast("سنة الإصدار يجب أن تكون رقماً", "error");
      return;
    }
    if (isNaN(rating)) {
      showToast("التقييم يجب أن يكون رقماً", "error");
      return;
    }
    if (rating < 0 || rating > 10) {
      showToast("التقييم يجب أن يكون بين 0 و 10", "error");
      return;
    }

    const newMedia = {
      title,
      genre,
      release_year: releaseYear,
      rating,
      poster_url: posterImage.src && posterImage.src.startsWith("http") ? posterImage.src : null,
    };

    if (mediaType === "series") {
      const endYear = endYearInput.value.trim() ? parseInt(endYearInput.value) : releaseYear;
      if (endYear < releaseYear) {
        showToast("سنة النهاية يجب أن تكون ≥ سنة البداية", "error");
        return;
      }
      newMedia.end_year = endYear;
    }

    // التحقق من التكرار (محلياً)
    const existing = currentResults.filter(item => item.media_type === mediaType);
    const isDuplicate = existing.some(
      item => item.title && item.title.toLowerCase() === title.toLowerCase()
    );
    if (isDuplicate) {
      showToast(`"${title}" موجود بالفعل! 🎬`, "error");
      return;
    }

    const success = await saveMedia(mediaType, newMedia);
    if (success) {
      showToast(`"${title}" أضيف بنجاح!`, "success");
      clearForm();
      // تحديث البيانات من الخادم
      await searchMedia(true);
      switchView("collection");
    } else {
      showToast("فشلت الإضافة", "error");
    }
  } catch (error) {
    showToast("خطأ في الإضافة: " + error.message, "error");
  }
}

function clearForm() {
  addForm.reset();
  posterImage.src = "";
  posterImage.style.display = "none";
  posterPlaceholder.style.display = "flex";
  updateEndYearVisibility();
  titleInput.focus();
  showToast("تم مسح النموذج", "info");
}

// ════════════════════════════════════════════════════════
//  تعديل وسائط
// ════════════════════════════════════════════════════════
async function editSelected() {
  try {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
    if (checkboxes.length !== 1) {
      showToast("الرجاء تحديد عنصر واحد فقط للتعديل", "info");
      return;
    }

    const row = checkboxes[0].closest("tr");
    const cells = row.cells;
    if (!cells || cells.length < 7) {
      showToast("خطأ: بيانات غير صالحة", "error");
      return;
    }

    const orderNumber = parseInt(cells[1].textContent);
    const title = cells[2].textContent;
    const mediaType = cells[6].textContent.toLowerCase();

    // البحث في currentResults بدلاً من fetch
    let mediaItem = currentResults.find(
      item => item.order_number === orderNumber && item.media_type === mediaType
    );

    if (!mediaItem) {
      showToast("لم يتم العثور على العنصر", "error");
      return;
    }

    editOrderInput.value = orderNumber;
    editTitleInput.value = mediaItem.title || "";
    editGenreInput.value = mediaItem.genre || "";
    editReleaseYearInput.value = mediaItem.release_year || "";
    editRatingInput.value = mediaItem.rating || "";
    editMediaTypeInput.value = mediaType;

    if (mediaType === "series") {
      editEndYearGroup.style.display = "flex";
      editEndYearInput.value = mediaItem.end_year || mediaItem.release_year || "";
    } else {
      editEndYearGroup.style.display = "none";
    }

    if (mediaItem.poster_url) {
      editPosterImage.src = mediaItem.poster_url;
      editPosterImage.style.display = "block";
      editPosterPlaceholder.style.display = "none";
    } else {
      editPosterImage.style.display = "none";
      editPosterPlaceholder.style.display = "flex";
    }

    editModal.style.display = "flex";
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEditEscape);
  } catch (error) {
    showToast("خطأ في التعديل: " + error.message, "error");
  }
}

function handleEditEscape(e) {
  if (e.key === "Escape") closeModal();
}

function closeModal() {
  editModal.style.display = "none";
  document.body.style.overflow = "";
  document.removeEventListener("keydown", handleEditEscape);
}

async function saveChanges(e) {
  e.preventDefault();

  try {
    const orderNumber = parseInt(editOrderInput.value);
    const title = editTitleInput.value.trim();
    const genre = editGenreInput.value.trim();
    const mediaType = editMediaTypeInput.value;

    if (!title || !genre) {
      showToast("الرجاء ملء جميع الحقول المطلوبة", "error");
      return;
    }

    const releaseYear = parseInt(editReleaseYearInput.value) || new Date().getFullYear();
    const rating = parseFloat(editRatingInput.value) || 0;

    if (rating < 0 || rating > 10) {
      showToast("التقييم يجب أن يكون بين 0 و 10", "error");
      return;
    }

    const updatedMedia = {
      title,
      genre,
      release_year: releaseYear,
      rating,
      poster_url: editPosterImage.style.display === "block" ? editPosterImage.src : null,
    };

    if (mediaType === "series") {
      const endYear = parseInt(editEndYearInput.value) || releaseYear;
      if (endYear < releaseYear) {
        showToast("سنة النهاية يجب أن تكون ≥ سنة البداية", "error");
        return;
      }
      updatedMedia.end_year = endYear;
    }

    const success = await updateMedia(mediaType, orderNumber, updatedMedia);
    if (success) {
      showToast(`"${title}" تحديث بنجاح!`, "success");
      closeModal();
      // تحديث البيانات من الخادم
      await searchMedia(true);
    } else {
      showToast("فشل التحديث", "error");
    }
  } catch (error) {
    showToast("خطأ في التحديث: " + error.message, "error");
  }
}

async function fetchEditInfo() {
  const title = editTitleInput.value.trim();
  if (!title) {
    showToast("الرجاء إدخال عنوان للبحث", "error");
    return;
  }

  const mediaType = editMediaTypeInput.value;
  showLoading();

  try {
    const info = mediaType === "movie" ? await searchMovieInfo(title) : await searchSeriesInfo(title);

    if (!info) {
      showToast("لم يتم العثور على معلومات", "info");
      return;
    }

    editTitleInput.value = info.title;
    editGenreInput.value = info.genre;
    editReleaseYearInput.value = info.release_year;
    editRatingInput.value = info.rating;

    if (mediaType === "series" && info.end_year) editEndYearInput.value = info.end_year;

    if (info.poster_url) {
      editPosterImage.src = info.poster_url;
      editPosterImage.style.display = "block";
      editPosterPlaceholder.style.display = "none";
    }

    showToast(`تم تحميل معلومات "${info.title}"!`, "success");
  } catch (error) {
    showToast("خطأ في جلب المعلومات", "error");
  } finally {
    hideLoading();
  }
}

// ════════════════════════════════════════════════════════
//  حذف وسائط (محسن)
// ════════════════════════════════════════════════════════
async function deleteSelected() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    showToast("الرجاء تحديد عنصر واحد على الأقل للحذف", "info");
    return;
  }
  if (!confirm(`هل أنت متأكد من حذف ${checkboxes.length} عنصر؟`)) return;

  // جمع البيانات للحذف
  const toDelete = [];
  for (const cb of checkboxes) {
    const row = cb.closest("tr");
    const cells = row.cells;
    const orderNum = parseInt(cells[1].textContent);
    const mediaType = cells[6].textContent.toLowerCase();
    toDelete.push({ orderNum, mediaType, row });
  }

  // حذف متفائل (من الواجهة أولاً)
  toDelete.forEach(item => item.row.remove());
  // تحديث currentResults (إزالة العناصر المحذوفة)
  currentResults = currentResults.filter(item =>
    !toDelete.some(del => del.orderNum === item.order_number && del.mediaType === item.media_type)
  );
  // إعادة ترقيم local مؤقت (اختياري)
  // ولكن الأفضل تحديث من الخادم بعد الحذف

  // تنفيذ الحذف الفعلي على الخادم
  let allSuccess = true;
  for (const item of toDelete) {
    const success = await deleteMedia(item.mediaType, item.orderNum);
    if (!success) allSuccess = false;
  }

  if (allSuccess) {
    showToast("تم الحذف بنجاح!", "success");
    // تحديث البيانات من الخادم لضمان المزامنة
    await searchMedia(true);
  } else {
    showToast("بعض العناصر لم تُحذف", "error");
    await searchMedia(true); // استعادة الحالة الصحيحة
  }
}

// ════════════════════════════════════════════════════════
//  دوال Auto-Fill (TMDB/OMDB) - بدون تغيير
// ════════════════════════════════════════════════════════
async function fetchMediaInfo() {
  const title = titleInput.value.trim();
  if (!title) {
    showToast("الرجاء إدخال عنوان للبحث", "error");
    return;
  }

  const mediaType = mediaTypeSelect.value;
  showLoading();

  try {
    const info = mediaType === "movie" ? await searchMovieInfo(title) : await searchSeriesInfo(title);

    if (!info) {
      showToast("لم يتم العثور على معلومات", "info");
      return;
    }

    titleInput.value = info.title;
    genreInput.value = info.genre;
    releaseYearInput.value = info.release_year;
    ratingInput.value = info.rating;

    if (mediaType === "series" && info.end_year) {
      endYearInput.value = info.end_year;
    }

    if (info.poster_url) {
      posterImage.src = info.poster_url;
      posterImage.style.display = "block";
      posterPlaceholder.style.display = "none";
    }

    showToast(`تم تحميل معلومات "${info.title}"!`, "success");
  } catch (error) {
    showToast("خطأ في جلب المعلومات", "error");
  } finally {
    hideLoading();
  }
}

async function searchMovieInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const movie = data.results[0];
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US`;
    const details = await (await fetch(detailsUrl)).json();

    const year = details.release_date ? details.release_date.substring(0, 4) : "";
    const genres = details.genres ? details.genres.map(g => g.name) : [];
    let rating = details.vote_average || 0;
    const imdbId = details.imdb_id;

    if (imdbId) {
      const imdbData = await (await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`)).json();
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A") rating = parseFloat(imdbData.imdbRating);
    }

    return {
      title: details.title || "",
      release_year: parseInt(year) || new Date().getFullYear(),
      genre: genres.join(", "),
      rating,
      poster_url: details.poster_path ? `${TMDB_IMAGE_URL}${details.poster_path}` : null,
    };
  } catch (error) {
    console.error("Error fetching movie info:", error);
    throw error;
  }
}

async function searchSeriesInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const serie = data.results[0];
    const detailsUrl = `${TMDB_BASE_URL}/tv/${serie.id}?api_key=${TMDB_API_KEY}&language=en-US`;
    const details = await (await fetch(detailsUrl)).json();

    const startYear = details.first_air_date ? details.first_air_date.substring(0, 4) : "";
    let endYear = details.last_air_date ? details.last_air_date.substring(0, 4) : "";
    if (details.status === "Returning Series") endYear = "";

    const genres = details.genres ? details.genres.map(g => g.name) : [];
    let rating = details.vote_average || 0;

    const extIds = await (await fetch(`${TMDB_BASE_URL}/tv/${serie.id}/external_ids?api_key=${TMDB_API_KEY}`)).json();
    if (extIds.imdb_id) {
      const imdbData = await (await fetch(`https://www.omdbapi.com/?i=${extIds.imdb_id}&apikey=${OMDB_API_KEY}`)).json();
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A") rating = parseFloat(imdbData.imdbRating);
    }

    const parsedStart = parseInt(startYear) || new Date().getFullYear();
    const parsedEnd = endYear ? parseInt(endYear) : parsedStart;

    return {
      title: details.name || "",
      release_year: parsedStart,
      end_year: parsedEnd,
      genre: genres.join(", "),
      rating,
      poster_url: details.poster_path ? `${TMDB_IMAGE_URL}${details.poster_path}` : null,
    };
  } catch (error) {
    console.error("Error fetching series info:", error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════
//  تبديل العرض (Collection / Add)
// ════════════════════════════════════════════════════════
function switchView(view) {
  const colView = document.getElementById("view-collection");
  const addView = document.getElementById("view-add");
  const navCol = document.getElementById("nav-collection");
  const navAdd = document.getElementById("nav-add");

  if (view === "collection") {
    colView.style.display = "block";
    addView.style.display = "none";
    navCol.classList.add("active");
    navAdd.classList.remove("active");
  } else {
    colView.style.display = "none";
    addView.style.display = "block";
    navCol.classList.remove("active");
    navAdd.classList.add("active");
  }
}
window.switchView = switchView;

function toggleGridView(mode) {
  currentGridMode = mode;
  const grid = document.getElementById("card-grid");
  const tbl = document.getElementById("table-view");
  const gridBtn = document.getElementById("grid-toggle-btn");
  const listBtn = document.getElementById("list-toggle-btn");

  if (mode === "grid") {
    grid.style.display = "grid";
    tbl.style.display = "none";
    gridBtn.classList.add("active");
    listBtn.classList.remove("active");
  } else {
    grid.style.display = "none";
    tbl.style.display = "block";
    gridBtn.classList.remove("active");
    listBtn.classList.add("active");
  }
}
window.toggleGridView = toggleGridView;

// ════════════════════════════════════════════════════════
//  الثيم (الوضع المظلم/الفاتح)
// ════════════════════════════════════════════════════════
function toggleTheme() {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  localStorage.setItem("darkMode", isLight ? "false" : "true");
  const icon = themeToggleBtn.querySelector("i");
  if (isLight) {
    icon.classList.replace("fa-moon", "fa-sun");
  } else {
    icon.classList.replace("fa-sun", "fa-moon");
  }
}

// ════════════════════════════════════════════════════════
//  إظهار/إخفاء حقل End Year للمسلسلات
// ════════════════════════════════════════════════════════
function updateEndYearVisibility() {
  if (endYearGroup) {
    endYearGroup.style.display = mediaTypeSelect.value === "series" ? "flex" : "none";
  }
}

// ════════════════════════════════════════════════════════
//  Toast و Loading
// ════════════════════════════════════════════════════════
function showToast(message, type = "info") {
  toastMessage.textContent = message;
  toastIcon.className = "fas";

  if (type === "success") {
    toastIcon.classList.add("fa-check-circle", "success");
    toast.style.borderColor = "rgba(76,175,80,0.3)";
  } else if (type === "error") {
    toastIcon.classList.add("fa-exclamation-circle", "error");
    toast.style.borderColor = "rgba(229,57,53,0.3)";
  } else {
    toastIcon.classList.add("fa-info-circle", "info");
    toast.style.borderColor = "rgba(33,150,243,0.3)";
  }

  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("show");
    toast.style.borderColor = "";
  }, 5000);
}

function showLoading() {
  loadingSpinner.style.display = "flex";
}
function hideLoading() {
  loadingSpinner.style.display = "none";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ════════════════════════════════════════════════════════
//  التهيئة
// ════════════════════════════════════════════════════════
async function init() {
  // الثيم
  if (localStorage.getItem("darkMode") === "false") {
    document.body.classList.add("light-theme");
    themeToggleBtn.querySelector("i").classList.replace("fa-moon", "fa-sun");
  }

  updateEndYearVisibility();

  // التحميل الأولي
  await searchMedia();

  // مستمعو الأحداث
  searchInput.addEventListener("input", debounce(filterLocalResults, 300));
  searchBySelect.addEventListener("change", filterLocalResults);
  filterTypeSelect.addEventListener("change", filterLocalResults);
  searchBtn.addEventListener("click", () => searchMedia(true));

  selectAllCheckbox && selectAllCheckbox.addEventListener("change", toggleSelectAll);
  editBtn.addEventListener("click", editSelected);
  deleteBtn.addEventListener("click", deleteSelected);
  addForm.addEventListener("submit", addMedia);
  mediaTypeSelect.addEventListener("change", updateEndYearVisibility);
  autoFillBtn.addEventListener("click", fetchMediaInfo);
  closeModalBtn && closeModalBtn.addEventListener("click", closeModal);
  editForm.addEventListener("submit", saveChanges);
  editAutoFillBtn.addEventListener("click", fetchEditInfo);
  themeToggleBtn.addEventListener("click", toggleTheme);
  document.getElementById("clear-form-btn").addEventListener("click", clearForm);

  // إغلاق نافذة التفاصيل
  const detClose = document.getElementById("det-close-btn");
  if (detClose) detClose.addEventListener("click", closeDetailModal);
  const detCloseCta = document.querySelector(".det-close-cta");
  if (detCloseCta) detCloseCta.addEventListener("click", closeDetailModal);
  const detOverlay = document.getElementById("detail-modal");
  if (detOverlay) {
    detOverlay.addEventListener("click", (e) => {
      if (e.target === detOverlay) closeDetailModal();
    });
  }

  // إغلاق نافذة التعديل عند النقر خارجها
  window.addEventListener("click", (e) => {
    if (e.target === editModal) closeModal();
  });
}

document.addEventListener("DOMContentLoaded", init);