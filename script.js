// ════════════════════════════════════════════════════════
//  CINÉMA — MEDIA VAULT  |  Script
//  All original API logic preserved + cinematic UI layer
// ════════════════════════════════════════════════════════

window.addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error)
  showToast("Error: " + (event.error ? event.error.message : "Unknown"), "error")
})

// ── API Configuration ──
const TMDB_API_KEY    = "001a45ee2ffa1d6f2f16fc4c16ae276a"
const OMDB_API_KEY    = "5812b153"
const TMDB_BASE_URL   = "https://api.themoviedb.org/3"
const TMDB_IMAGE_URL  = "https://image.tmdb.org/t/p/w500"
const API_BASE_URL    = "https://media-manager-backend-wfeb.onrender.com/api/media"
const AUTH_BASE_URL   = "https://media-manager-backend-wfeb.onrender.com/api/auth"

// ── Auth State ──
let currentUser = null   // null = guest, { username, token } = logged in

function getToken()    { return localStorage.getItem("cinema_token") }
function setToken(t)   { localStorage.setItem("cinema_token", t) }
function clearToken()  { localStorage.removeItem("cinema_token") }
function authHeaders() {
  const t = getToken()
  return t
    ? { "Content-Type": "application/json", "Authorization": `Bearer ${t}` }
    : { "Content-Type": "application/json" }
}

// ── DOM References ──
const searchInput       = document.getElementById("search-input")
const searchBySelect    = document.getElementById("search-by")
const filterTypeSelect  = document.getElementById("filter-type")
const searchBtn         = document.getElementById("search-btn")
const resultsTable      = document.getElementById("results-table")
const resultsBody       = document.getElementById("results-body")
const statusLabel       = document.getElementById("status-label")
const selectAllCheckbox = document.getElementById("select-all")
const editBtn           = document.getElementById("edit-btn")
const deleteBtn         = document.getElementById("delete-btn")
const addForm           = document.getElementById("add-form")
const titleInput        = document.getElementById("title")
const genreInput        = document.getElementById("genre")
const releaseYearInput  = document.getElementById("release-year")
const endYearInput      = document.getElementById("end-year")
const endYearGroup      = document.getElementById("end-year-group")
const ratingInput       = document.getElementById("rating")
const mediaTypeSelect   = document.getElementById("media-type")
const autoFillBtn       = document.getElementById("auto-fill-btn")
const posterImage       = document.getElementById("poster-image")
const posterPlaceholder = document.getElementById("poster-placeholder")
const editModal         = document.getElementById("edit-modal")
const closeModalBtn     = document.querySelector(".close")
const editForm          = document.getElementById("edit-form")
const editIdInput       = document.getElementById("edit-id")
const editOrderInput    = document.getElementById("edit-order")
const editTitleInput    = document.getElementById("edit-title")
const editGenreInput    = document.getElementById("edit-genre")
const editReleaseYearInput = document.getElementById("edit-release-year")
const editEndYearInput  = document.getElementById("edit-end-year")
const editEndYearGroup  = document.getElementById("edit-end-year-group")
const editRatingInput   = document.getElementById("edit-rating")
const editMediaTypeInput = document.getElementById("edit-media-type")
const editAutoFillBtn   = document.getElementById("edit-auto-fill-btn")
const editPosterImage   = document.getElementById("edit-poster-image")
const editPosterPlaceholder = document.getElementById("edit-poster-placeholder")
const toast             = document.getElementById("toast")
const toastMessage      = document.getElementById("toast-message")
const toastIcon         = document.getElementById("toast-icon")
const loadingSpinner    = document.getElementById("loading-spinner")
const themeCheckbox     = document.getElementById("theme-checkbox")   // new switch

// ── Global state ──
let currentResults  = []
let currentGridMode = 'grid'

// ── Cache layer (avoids redundant network calls) ──
const _cache = { data: null, ts: 0, TTL: 60_000 }   // 60s cache
function _cacheGet()          { return (Date.now() - _cache.ts < _cache.TTL) ? _cache.data : null }
function _cacheSet(data)      { _cache.data = data; _cache.ts = Date.now() }
function _cacheInvalidate()   { _cache.ts = 0 }

// ════════════════════════════════════════════════
//  API FUNCTIONS
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
//  SKELETON LOADING
// ════════════════════════════════════════════════

function showSkeletons(count = 16) {
  const grid = document.getElementById("card-grid")
  if (!grid) return
  // Clear any existing cards
  _cardObserver?.disconnect()
  grid.innerHTML = ""
  const frag = document.createDocumentFragment()
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div")
    sk.className = "skeleton-card"
    sk.innerHTML = `
      <div class="sk-poster">
        <div class="sk-shine"></div>
        <div class="sk-rating-badge"></div>
        <div class="sk-type-chip"></div>
      </div>
      <div class="sk-body">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-meta"></div>
      </div>
    `
    frag.appendChild(sk)
  }
  grid.appendChild(frag)
  // Also show stats as skeleton
  ;["stat-movies","stat-series","stat-avg","stat-top"].forEach(id => {
    const el = document.getElementById(id)
    if (el) { el.dataset.real = el.textContent; el.classList.add("sk-stat-pulse") }
  })
}

function hideSkeletons() {
  ;["stat-movies","stat-series","stat-avg","stat-top"].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.classList.remove("sk-stat-pulse")
  })
}

// ── Fetch ALL media in one request (with cache) ──
async function fetchAllMedia() {
  // Guest users have no collection
  if (!currentUser) return []

  const cached = _cacheGet()
  if (cached) return cached

  try {
    // Show skeletons in the grid instead of fullscreen spinner
    showSkeletons(20)
    const response = await fetch(`${API_BASE_URL}/all?type=all`, {
      headers: authHeaders()
    })
    if (response.status === 401) { handleUnauthorized(); return [] }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    hideSkeletons()
    if (!Array.isArray(data)) return []
    const normalised = data.map(item => ({
      ...item,
      order_number: parseInt(item.order_number) || 0,
      release_year: parseInt(item.release_year) || 0,
      end_year:     parseInt(item.end_year)     || 0,
      rating:       parseFloat(item.rating)     || 0,
    }))
    _cacheSet(normalised)
    return normalised
  } catch(error) {
    hideSkeletons()
    showToast(`Error fetching media: ${error.message}`, "error")
    return []
  }
}

// ── Legacy helper (used in edit/duplicate checks — uses cache) ──
async function fetchMedia(mediaType) {
  const all = await fetchAllMedia()
  return all.filter(item => item.media_type === mediaType)
}

async function saveMedia(mediaType, mediaData) {
  if (!currentUser) { openAuthModal('login'); return false }
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, data: mediaData }),
    })
    if (response.status === 401) { handleUnauthorized(); return false }
    const result = await response.json()
    hideLoading()
    _cacheInvalidate()
    return result.success
  } catch(error) {
    hideLoading()
    showToast("Error saving media", "error")
    return false
  }
}

async function updateMedia(mediaType, orderNumber, mediaData) {
  if (!currentUser) { openAuthModal('login'); return false }
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, order_number: orderNumber, data: mediaData }),
    })
    if (response.status === 401) { handleUnauthorized(); return false }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const text = await response.text()
    let result
    try { result = JSON.parse(text) } catch(e) {
      throw new Error(`Invalid JSON: ${text.substring(0,100)}...`)
    }
    hideLoading()
    _cacheInvalidate()
    if (result.error) throw new Error(result.error)
    return result.success === true
  } catch(error) {
    hideLoading()
    showToast("Error updating media: " + error.message, "error")
    return false
  }
}

async function deleteMedia(mediaType, orderNumber) {
  if (!currentUser) { openAuthModal('login'); return false }
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, order_number: orderNumber }),
    })
    if (response.status === 401) { handleUnauthorized(); return false }
    const result = await response.json()
    hideLoading()
    _cacheInvalidate()
    return result.success
  } catch(error) {
    hideLoading()
    showToast("Error deleting media", "error")
    return false
  }
}

// ════════════════════════════════════════════════
//  CORE FUNCTIONS
// ════════════════════════════════════════════════

async function init() {
  // ── Auth: restore session ──
  await restoreSession()

  // Theme
  if (localStorage.getItem("darkMode") === "false") {
    document.body.classList.add("light-theme")
    themeCheckbox.checked = true
  } else {
    themeCheckbox.checked = false
  }
  themeCheckbox.addEventListener("change", toggleTheme)

  updateEndYearVisibility()
  await searchMedia()

  // Event listeners
  searchBtn.addEventListener("click", searchMedia)
  searchInput.addEventListener("keypress", e => { if(e.key==="Enter") searchMedia() })
  selectAllCheckbox && selectAllCheckbox.addEventListener("change", toggleSelectAll)
  editBtn.addEventListener("click", editSelected)
  deleteBtn.addEventListener("click", deleteSelected)
  addForm.addEventListener("submit", addMedia)
  mediaTypeSelect.addEventListener("change", updateEndYearVisibility)
  autoFillBtn.addEventListener("click", fetchMediaInfo)
  closeModalBtn && closeModalBtn.addEventListener("click", closeModal)
  editForm.addEventListener("submit", saveChanges)
  editAutoFillBtn.addEventListener("click", fetchEditInfo)

  document.getElementById("clear-form-btn").addEventListener("click", clearForm)

  // Detail modal close
  const detClose = document.getElementById("det-close-btn")
  if (detClose) detClose.addEventListener("click", () => closeDetailModal())

  const detCloseCta = document.querySelector(".det-close-cta")
  if (detCloseCta) detCloseCta.addEventListener("click", () => closeDetailModal())

  const detOverlay = document.getElementById("detail-modal")
  if (detOverlay) {
    detOverlay.addEventListener("click", e => {
      if (e.target === detOverlay) closeDetailModal()
    })
  }

  // Edit modal close
  window.addEventListener("click", e => {
    if (e.target === editModal) closeModal()
  })
}

function toggleTheme(e) {
  // Disable ALL transitions instantly → prevents 800-card repaint storm
  const kill = document.createElement("style")
  kill.id = "_theme_kill"
  kill.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}"
  document.head.appendChild(kill)

  if (e.target.checked) {
    document.body.classList.add("light-theme")
    localStorage.setItem("darkMode", "false")
  } else {
    document.body.classList.remove("light-theme")
    localStorage.setItem("darkMode", "true")
  }

  // Re-enable after two frames (browser has committed the paint)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById("_theme_kill")?.remove()
  }))
}

function updateEndYearVisibility() {
  if (endYearGroup) {
    endYearGroup.style.display = mediaTypeSelect.value === "series" ? "flex" : "none"
  }
}

function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]')
  checkboxes.forEach(cb => {
    cb.checked = selectAllCheckbox.checked
    const row = cb.closest("tr")
    row && (selectAllCheckbox.checked ? row.classList.add("selected") : row.classList.remove("selected"))
  })
  // Sync card selections
  const cards = document.querySelectorAll('.media-card')
  cards.forEach(card => {
    selectAllCheckbox.checked ? card.classList.add("selected") : card.classList.remove("selected")
    const chk = card.querySelector('.card-chk')
    if (chk) chk.checked = selectAllCheckbox.checked
  })
}

function toggleRowSelection(checkbox) {
  const row = checkbox.closest("tr")
  if (checkbox.checked) {
    row.classList.add("selected")
  } else {
    row.classList.remove("selected")
    if (selectAllCheckbox) selectAllCheckbox.checked = false
  }
}
window.toggleRowSelection = toggleRowSelection

// ════════════════════════════════════════════════
//  SEARCH & DISPLAY
// ════════════════════════════════════════════════

async function searchMedia() {
  const searchQuery = searchInput.value.trim().toLowerCase()
  const searchBy    = searchBySelect.value
  const filterType  = filterTypeSelect.value

  try {
    const all = await fetchAllMedia()

    let results = all.filter(item => {
      // Type filter
      if (filterType !== "all" && item.media_type !== filterType) return false
      // Search filter
      if (!searchQuery) return true
      if (searchBy === "title")        return item.title?.toLowerCase().includes(searchQuery)
      if (searchBy === "genre")        return item.genre?.toLowerCase().includes(searchQuery)
      if (searchBy === "release_year") {
        const y = parseInt(searchQuery)
        return !isNaN(y) && (item.release_year === y || item.end_year === y)
      }
      if (searchBy === "rating") {
        const r = parseFloat(searchQuery)
        return !isNaN(r) && parseFloat(item.rating) === r
      }
      return true
    })

    results = results
      .map(item => ({
        ...item,
        display_year: item.media_type === "movie"
          ? item.release_year?.toString() || ""
          : item.release_year === item.end_year
            ? item.release_year?.toString() || ""
            : `${item.release_year || ""}–${item.end_year || ""}`,
      }))
      .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))

    updateResultsTable(results)

  } catch(error) {
    showToast("Error searching media: " + error.message, "error")
  }
}

function updateResultsTable(results) {
  currentResults = results

  // ── Table rows ──
  resultsBody.innerHTML = ""
  results.forEach(item => {
    const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0
    const row = document.createElement("tr")
    row.innerHTML = `
      <td><input type="checkbox" class="chk" onclick="toggleRowSelection(this)"></td>
      <td>${item.order_number}</td>
      <td>${item.title}</td>
      <td>${item.genre}</td>
      <td>${item.display_year}</td>
      <td>${rating.toFixed(1)}</td>
      <td>${item.media_type}</td>
    `
    resultsBody.appendChild(row)
  })

  // Status
  if (statusLabel) {
    statusLabel.textContent = results.length > 0
      ? `${results.length} title${results.length !== 1 ? "s" : ""} in collection`
      : "No results found"
  }

  // ── Card grid ──
  updateCardGrid(results)

  // ── Stats ──
  updateStats(results)

  // ── Empty state ──
  const empty = document.getElementById("empty-state")
  if (empty) empty.style.display = results.length === 0 ? "flex" : "none"
}

// ════════════════════════════════════════════════
//  CARD GRID
// ════════════════════════════════════════════════

// ── Progressive card rendering state ──
let _cardPool = []
let _cardRendered = 0
let _cardObserver = null
const CARD_BATCH = 40

function buildMediaCard(item, index) {
  const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0
  const ratingColor = rating >= 8 ? "#4caf50" : rating >= 6 ? "#d4a843" : "#e53935"
  const hasPoster = item.poster_url && item.poster_url.startsWith("http")
  const typeLabel = item.media_type === "movie" ? "🎬 Movie" : "📺 Series"

  const card = document.createElement("div")
  card.className = "media-card"
  card.dataset.index = index

  card.innerHTML = `
    <div class="card-chk-wrap">
      <input type="checkbox" class="card-chk chk" onclick="event.stopPropagation(); toggleCardSelection(this, ${index})">
    </div>
    <div class="card-poster-wrap">
      ${hasPoster
        ? `<img src="${item.poster_url}" alt="${escapeHtml(item.title)}" class="card-poster-img" loading="lazy">`
        : `<div class="card-poster-ph"><i class="fas fa-${item.media_type === "movie" ? "film" : "tv"}"></i></div>`
      }
      <div class="card-overlay">
        <div class="card-rating-badge" style="background:${ratingColor}22;color:${ratingColor};border-color:${ratingColor}55;">
          ★ ${rating.toFixed(1)}
        </div>
        <div class="card-type-chip ${item.media_type}">${typeLabel}</div>
      </div>
    </div>
    <div class="card-body">
      <div class="card-title-text" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
      <div class="card-meta-text">${escapeHtml(item.genre)} · ${item.display_year}</div>
    </div>
  `

  card.addEventListener("click", e => {
    if (e.target.classList.contains("card-chk")) return
    showDetailModal(item)
  })
  return card
}

function _renderCardBatch(grid) {
  if (_cardRendered >= _cardPool.length) return
  const end = Math.min(_cardRendered + CARD_BATCH, _cardPool.length)
  const frag = document.createDocumentFragment()
  for (let i = _cardRendered; i < end; i++) {
    frag.appendChild(buildMediaCard(_cardPool[i], i))
  }
  _cardRendered = end
  // Insert before sentinel if it exists
  const sentinel = document.getElementById("card-sentinel")
  if (sentinel) grid.insertBefore(frag, sentinel)
  else grid.appendChild(frag)
  // Remove sentinel if done
  if (_cardRendered >= _cardPool.length && sentinel) {
    _cardObserver?.disconnect()
    sentinel.remove()
  }
}

function updateCardGrid(results) {
  const grid = document.getElementById("card-grid")
  if (!grid) return
  // Teardown old observer
  _cardObserver?.disconnect()
  _cardObserver = null
  grid.innerHTML = ""
  _cardPool = results
  _cardRendered = 0

  // First batch — immediate
  _renderCardBatch(grid)

  // Sentinel for infinite scroll
  if (_cardRendered < _cardPool.length) {
    const sentinel = document.createElement("div")
    sentinel.id = "card-sentinel"
    sentinel.style.cssText = "height:1px;grid-column:1/-1;pointer-events:none;"
    grid.appendChild(sentinel)

    _cardObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) _renderCardBatch(grid)
    }, { rootMargin: "300px" })
    _cardObserver.observe(sentinel)
  }
}

function toggleCardSelection(checkbox, index) {
  const card = checkbox.closest(".media-card")
  if (checkbox.checked) {
    card.classList.add("selected")
  } else {
    card.classList.remove("selected")
    if (selectAllCheckbox) selectAllCheckbox.checked = false
  }
  // Sync table checkbox
  const tableCheckboxes = document.querySelectorAll("#results-body input[type='checkbox']")
  if (tableCheckboxes[index]) {
    tableCheckboxes[index].checked = checkbox.checked
    toggleRowSelection(tableCheckboxes[index])
  }
}
window.toggleCardSelection = toggleCardSelection

// ════════════════════════════════════════════════
//  STATS
// ════════════════════════════════════════════════

function updateStats(results) {
  const movies  = results.filter(r => r.media_type === "movie")
  const series  = results.filter(r => r.media_type === "series")
  const topItem = results.reduce((best, r) => !best || r.rating > best.rating ? r : best, null)
  const avg     = results.length > 0
    ? (results.reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / results.length).toFixed(1)
    : "—"

  const el = id => document.getElementById(id)
  if (el("stat-movies")) el("stat-movies").textContent = movies.length
  if (el("stat-series")) el("stat-series").textContent = series.length
  if (el("stat-avg"))    el("stat-avg").textContent    = avg
  if (el("stat-top"))    el("stat-top").textContent    = topItem ? topItem.title : "—"
}

// ════════════════════════════════════════════════
//  DETAIL MODAL
// ════════════════════════════════════════════════

// ── Fetch full TMDB details (overview, cast, trailer, runtime) ──
async function fetchTMDBDetails(title, year, mediaType) {
  try {
    const endpoint = mediaType === "movie" ? "movie" : "tv"
    const yearParam = mediaType === "movie" ? `&year=${year}` : `&first_air_date_year=${year}`
    const searchRes = await fetch(
      `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${yearParam}`
    )
    const searchData = await searchRes.json()
    if (!searchData.results?.length) return null
    const id = searchData.results[0].id
    const detRes = await fetch(
      `${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`
    )
    return await detRes.json()
  } catch { return null }
}

function showDetailModal(item) {
  const overlay = document.getElementById("detail-modal")
  if (!overlay) return

  const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0

  // Poster
  const poster   = document.getElementById("detail-poster")
  const posterPh = document.getElementById("detail-poster-ph")
  const bgBlur   = document.getElementById("detail-bg-blur")

  if (item.poster_url && item.poster_url.startsWith("http")) {
    poster.src = item.poster_url
    poster.style.display = "block"
    posterPh.style.display = "none"
    bgBlur.style.backgroundImage = `url(${item.poster_url})`
  } else {
    poster.style.display = "none"
    posterPh.style.display = "flex"
    bgBlur.style.backgroundImage = ""
  }

  // Type badge
  const typeBadge = document.getElementById("detail-type")
  typeBadge.textContent = item.media_type === "movie" ? "🎬 Movie" : "📺 Series"
  typeBadge.className = `det-type-badge ${item.media_type}`

  // Title
  document.getElementById("detail-title").textContent = item.title

  // Meta chips
  document.getElementById("detail-meta").innerHTML = `
    <span class="meta-chip"><i class="fas fa-calendar"></i> ${item.display_year}</span>
    <span class="meta-chip"><i class="fas fa-hashtag"></i> #${item.order_number}</span>
  `

  // Stars
  const filled = Math.round(rating / 2)
  let stars = ""
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="${i <= filled ? "fas" : "far"} fa-star"></i>`
  }
  document.getElementById("detail-rating-display").innerHTML = `
    <div class="rating-stars">${stars}</div>
    <div class="rating-number">${rating.toFixed(1)}<span>/10</span></div>
  `

  // Genre tags
  const genres = item.genre.split(",").map(g => g.trim())
  document.getElementById("detail-genre-tags").innerHTML =
    genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join("")

  // Clear extra info area
  const extraEl = document.getElementById("detail-extra")
  if (extraEl) {
    extraEl.innerHTML = `<div class="det-extra-loading"><i class="fas fa-spinner fa-spin"></i> Loading details…</div>`
  }

  // Edit button
  document.getElementById("detail-edit-btn").onclick = () => {
    closeDetailModal()
    setTimeout(() => editItemDirectly(item), 200)
  }

  // Show modal
  overlay.style.display = "flex"
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", handleDetEscape)

  // Async: fetch TMDB extra info
  fetchTMDBDetails(item.title, item.release_year, item.media_type).then(tmdb => {
    if (!tmdb || !extraEl) return

    // Overview
    const overview = tmdb.overview || ""

    // Top cast (max 4)
    const cast = (tmdb.credits?.cast || []).slice(0, 4)
      .map(c => `<span class="cast-chip"><img src="${c.profile_path ? TMDB_IMAGE_URL + c.profile_path : ""}" onerror="this.style.display='none'" class="cast-img">${escapeHtml(c.name)}</span>`)
      .join("")

    // Trailer
    const trailer = (tmdb.videos?.results || []).find(v => v.type === "Trailer" && v.site === "YouTube")
      || (tmdb.videos?.results || []).find(v => v.site === "YouTube")

    // Runtime / seasons
    const runtime = tmdb.runtime
      ? (() => {
          const h = Math.floor(tmdb.runtime / 60)
          const m = tmdb.runtime % 60
          const label = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
          return `<span class="meta-chip"><i class="fas fa-clock"></i> ${label}</span>`
        })()
      : tmdb.number_of_seasons
        ? `<span class="meta-chip"><i class="fas fa-layer-group"></i> ${tmdb.number_of_seasons} season${tmdb.number_of_seasons > 1 ? "s" : ""}</span>`
        : ""

    // TMDB score
    const tmdbScore = tmdb.vote_average
      ? `<span class="meta-chip tmdb-score"><i class="fas fa-star"></i> ${tmdb.vote_average.toFixed(1)} TMDB</span>`
      : ""

    // Append runtime/score to meta
    if (runtime || tmdbScore) {
      const metaEl = document.getElementById("detail-meta")
      if (metaEl) metaEl.innerHTML += runtime + tmdbScore
    }

    extraEl.innerHTML = `
      ${overview ? `<p class="det-overview">${escapeHtml(overview)}</p>` : ""}
      ${cast ? `<div class="det-cast-row">${cast}</div>` : ""}
      ${trailer
        ? `<button class="btn-trailer" id="trailer-btn" onclick="playTrailer('${trailer.key}')">
            <i class="fab fa-youtube"></i> Watch Trailer
           </button>`
        : ""
      }
    `
  }).catch(() => {
    if (extraEl) extraEl.innerHTML = ""
  })
}

function playTrailer(key) {
  const lb    = document.getElementById("trailer-lightbox")
  const frame = document.getElementById("trailer-lb-frame")
  if (!lb || !frame) return
  frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${key}?autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
  lb.classList.add("open")
  document.body.style.overflow = "hidden"
}

function closeTrailerLightbox() {
  const lb    = document.getElementById("trailer-lightbox")
  const frame = document.getElementById("trailer-lb-frame")
  if (!lb) return
  lb.classList.remove("open")
  if (frame) frame.innerHTML = ""
}
window.closeTrailerLightbox = closeTrailerLightbox

function handleDetEscape(e) {
  if (e.key === "Escape") {
    const lb = document.getElementById("trailer-lightbox")
    if (lb && lb.classList.contains("open")) {
      closeTrailerLightbox()
    } else {
      closeDetailModal()
    }
  }
}

function closeDetailModal() {
  const overlay = document.getElementById("detail-modal")
  if (!overlay) return
  overlay.style.display = "none"
  document.body.style.overflow = ""
  document.removeEventListener("keydown", handleDetEscape)
  closeTrailerLightbox()
}
window.closeDetailModal = closeDetailModal

function editItemDirectly(item) {
  // Find & select corresponding table row then trigger edit
  const rows = document.querySelectorAll("#results-body tr")
  let found = false
  rows.forEach(row => {
    const oCell = row.cells[1]
    const tCell = row.cells[6]
    if (oCell && parseInt(oCell.textContent) === item.order_number &&
        tCell && tCell.textContent.toLowerCase() === item.media_type) {
      const cb = row.querySelector("input[type='checkbox']")
      if (cb) {
        cb.checked = true
        toggleRowSelection(cb)
        found = true
      }
    }
  })
  if (found) editSelected()
}

// ════════════════════════════════════════════════
//  VIEW SWITCHING
// ════════════════════════════════════════════════

function switchView(view) {
  // Guests can't add media
  if (view === "add" && !currentUser) {
    openAuthModal("login")
    showToast("Please sign in to add titles to your vault", "info")
    return
  }

  const colView = document.getElementById("view-collection")
  const addView = document.getElementById("view-add")
  const navCol  = document.getElementById("nav-collection")
  const navAdd  = document.getElementById("nav-add")

  if (view === "collection") {
    colView.style.display = "block"
    addView.style.display = "none"
    navCol.classList.add("active")
    navAdd.classList.remove("active")
  } else {
    colView.style.display = "none"
    addView.style.display = "block"
    navCol.classList.remove("active")
    navAdd.classList.add("active")
  }
}
window.switchView = switchView

function toggleGridView(mode) {
  currentGridMode = mode
  const grid    = document.getElementById("card-grid")
  const tbl     = document.getElementById("table-view")
  const gridBtn = document.getElementById("grid-toggle-btn")
  const listBtn = document.getElementById("list-toggle-btn")

  if (mode === "grid") {
    grid.style.display = "grid"
    tbl.style.display  = "none"
    gridBtn.classList.add("active")
    listBtn.classList.remove("active")
  } else {
    grid.style.display = "none"
    tbl.style.display  = "block"
    gridBtn.classList.remove("active")
    listBtn.classList.add("active")
  }
}
window.toggleGridView = toggleGridView

// ════════════════════════════════════════════════
//  ADD MEDIA
// ════════════════════════════════════════════════

async function addMedia(e) {
  e.preventDefault()
  const title     = titleInput.value.trim()
  const genre     = genreInput.value.trim()
  const mediaType = mediaTypeSelect.value

  if (!title || !genre) {
    showToast("Please fill in all required fields", "error")
    return
  }

  try {
    const releaseYear = parseInt(releaseYearInput.value)
    const rating      = parseFloat(ratingInput.value)

    if (isNaN(releaseYear)) { showToast("Release year must be a valid number", "error"); return }
    if (isNaN(rating))       { showToast("Rating must be a valid number", "error"); return }
    if (rating < 0 || rating > 10) { showToast("Rating must be between 0 and 10", "error"); return }

    const newMedia = {
      title, genre,
      release_year: releaseYear,
      rating,
      poster_url: posterImage.src && posterImage.src.startsWith("http") ? posterImage.src : null,
    }

    if (mediaType === "series") {
      const endYear = endYearInput.value.trim() ? parseInt(endYearInput.value) : releaseYear
      if (endYear < releaseYear) { showToast("End year must be ≥ release year", "error"); return }
      newMedia.end_year = endYear
    }

    // ── Duplicate check ──
    showLoading()
    const existing = await fetchMedia(mediaType)
    hideLoading()
    if (Array.isArray(existing)) {
      const isDuplicate = existing.some(
        item => item.title && item.title.toLowerCase() === title.toLowerCase()
      )
      if (isDuplicate) {
        showToast(`"${title}" is already in your vault as a ${mediaType}! 🎬`, "error")
        return
      }
    }

    const success = await saveMedia(mediaType, newMedia)
    if (success) {
      showToast(`"${title}" added to your vault! 🎬`, "success")
      clearForm()
      await searchMedia()
      setTimeout(() => switchView("collection"), 1200)
    } else {
      showToast("Failed to add media", "error")
    }
  } catch(error) {
    showToast("Error adding media: " + error.message, "error")
  }
}

function clearForm() {
  addForm.reset()
  posterImage.src = ""
  posterImage.style.display = "none"
  posterPlaceholder.style.display = "flex"
  updateEndYearVisibility()
  titleInput.focus()
  showToast("Form cleared", "info")
}

// ════════════════════════════════════════════════
//  AUTO-FILL
// ════════════════════════════════════════════════

async function fetchMediaInfo() {
  const title = titleInput.value.trim()
  if (!title) { showToast("Please enter a title to search", "error"); return }

  const mediaType = mediaTypeSelect.value
  showLoading()

  try {
    const info = mediaType === "movie"
      ? await searchMovieInfo(title)
      : await searchSeriesInfo(title)

    hideLoading()
    if (!info) {
      showToast("No info found. Please check the title.", "info")
      return
    }

    titleInput.value       = info.title
    genreInput.value       = info.genre
    releaseYearInput.value = info.release_year
    ratingInput.value      = info.rating

    if (mediaType === "series" && info.end_year) {
      endYearInput.value = info.end_year
    }

    if (info.poster_url) {
      posterImage.src = info.poster_url
      posterImage.style.display = "block"
      posterPlaceholder.style.display = "none"
    }

    showToast(`"${info.title}" info loaded! ✨`, "success")
  } catch(error) {
    hideLoading()
    showToast("Error fetching info: " + error.message, "error")
  }
}

// ════════════════════════════════════════════════
//  TMDB / OMDB  (unchanged original logic)
// ════════════════════════════════════════════════

async function searchMovieInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`
    const response  = await fetch(searchUrl)
    const data      = await response.json()

    if (!data.results || data.results.length === 0) return null

    const movie     = data.results[0]
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US`
    const details   = await (await fetch(detailsUrl)).json()

    const year   = details.release_date ? details.release_date.substring(0,4) : ""
    const genres = details.genres ? details.genres.map(g => g.name) : []
    let rating   = details.vote_average || 0
    const imdbId = details.imdb_id

    if (imdbId) {
      const imdbData = await (await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`)).json()
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A")
        rating = parseFloat(imdbData.imdbRating)
    }

    return {
      title:        details.title || "",
      release_year: parseInt(year) || new Date().getFullYear(),
      genre:        genres.join(", "),
      rating,
      poster_url:   details.poster_path ? `${TMDB_IMAGE_URL}${details.poster_path}` : null,
    }
  } catch(error) {
    console.error("Error fetching movie info:", error)
    throw error
  }
}

async function searchSeriesInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`
    const response  = await fetch(searchUrl)
    const data      = await response.json()

    if (!data.results || data.results.length === 0) return null

    const serie     = data.results[0]
    const detailsUrl = `${TMDB_BASE_URL}/tv/${serie.id}?api_key=${TMDB_API_KEY}&language=en-US`
    const details   = await (await fetch(detailsUrl)).json()

    const startYear = details.first_air_date ? details.first_air_date.substring(0,4) : ""
    let endYear     = details.last_air_date  ? details.last_air_date.substring(0,4)  : ""
    if (details.status === "Returning Series") endYear = ""

    const genres = details.genres ? details.genres.map(g => g.name) : []
    let rating   = details.vote_average || 0

    const extIds = await (await fetch(`${TMDB_BASE_URL}/tv/${serie.id}/external_ids?api_key=${TMDB_API_KEY}`)).json()
    if (extIds.imdb_id) {
      const imdbData = await (await fetch(`https://www.omdbapi.com/?i=${extIds.imdb_id}&apikey=${OMDB_API_KEY}`)).json()
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A")
        rating = parseFloat(imdbData.imdbRating)
    }

    const parsedStart = parseInt(startYear) || new Date().getFullYear()
    const parsedEnd   = endYear ? parseInt(endYear) : parsedStart

    return {
      title:        details.name || "",
      release_year: parsedStart,
      end_year:     parsedEnd,
      genre:        genres.join(", "),
      rating,
      poster_url:   details.poster_path ? `${TMDB_IMAGE_URL}${details.poster_path}` : null,
    }
  } catch(error) {
    console.error("Error fetching series info:", error)
    throw error
  }
}

// ════════════════════════════════════════════════
//  EDIT
// ════════════════════════════════════════════════

async function editSelected() {
  try {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked')
    if (checkboxes.length !== 1) {
      showToast("Please select exactly one item to edit", "info")
      return
    }

    const row    = checkboxes[0].closest("tr")
    const cells  = row.cells
    if (!cells || cells.length < 7) { showToast("Error: Invalid row data", "error"); return }

    const orderNumber = parseInt(cells[1].textContent)
    const title       = cells[2].textContent
    const mediaType   = cells[6].textContent.toLowerCase()

    showLoading()
    const mediaList = await fetchMedia(mediaType)
    hideLoading()

    if (!Array.isArray(mediaList)) { showToast("Error: Failed to fetch media list", "error"); return }

    let mediaItem = mediaList.find(item => item.order_number === orderNumber)
    if (!mediaItem && title) mediaItem = mediaList.find(item => item.title === title)

    if (!mediaItem) {
      mediaItem = {
        order_number: orderNumber,
        title:        cells[2].textContent,
        genre:        cells[3].textContent,
        release_year: parseInt(cells[4].textContent.split("–")[0]) || new Date().getFullYear(),
        rating:       parseFloat(cells[5].textContent) || 0,
        media_type:   mediaType,
      }
      if (mediaType === "series") {
        const parts = cells[4].textContent.split("–")
        mediaItem.end_year = parts.length > 1 ? parseInt(parts[1]) : mediaItem.release_year
      }
    }

    editOrderInput.value       = orderNumber
    editTitleInput.value       = mediaItem.title || ""
    editGenreInput.value       = mediaItem.genre || ""
    editReleaseYearInput.value = mediaItem.release_year || ""
    editRatingInput.value      = mediaItem.rating || ""
    editMediaTypeInput.value   = mediaType

    if (mediaType === "series") {
      editEndYearGroup.style.display = "flex"
      editEndYearInput.value = mediaItem.end_year || mediaItem.release_year || ""
    } else {
      editEndYearGroup.style.display = "none"
    }

    if (mediaItem.poster_url) {
      editPosterImage.src = mediaItem.poster_url
      editPosterImage.style.display = "block"
      editPosterPlaceholder.style.display = "none"
    } else {
      editPosterImage.style.display = "none"
      editPosterPlaceholder.style.display = "flex"
    }

    // Show edit modal with flex for centering
    editModal.style.display = "flex"
    editModal.style.alignItems = "center"
    editModal.style.justifyContent = "center"
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleEditEscape)

  } catch(error) {
    hideLoading()
    showToast("Error editing item: " + error.message, "error")
  }
}

function handleEditEscape(e) {
  if (e.key === "Escape") closeModal()
}

function closeModal() {
  editModal.style.display = "none"
  document.body.style.overflow = ""
  document.removeEventListener("keydown", handleEditEscape)
}

async function fetchEditInfo() {
  const title = editTitleInput.value.trim()
  if (!title) { showToast("Please enter a title to search", "error"); return }

  const mediaType = editMediaTypeInput.value
  showLoading()

  try {
    const info = mediaType === "movie"
      ? await searchMovieInfo(title)
      : await searchSeriesInfo(title)

    hideLoading()
    if (!info) { showToast("No info found.", "info"); return }

    editTitleInput.value       = info.title
    editGenreInput.value       = info.genre
    editReleaseYearInput.value = info.release_year
    editRatingInput.value      = info.rating

    if (mediaType === "series" && info.end_year) editEndYearInput.value = info.end_year

    if (info.poster_url) {
      editPosterImage.src = info.poster_url
      editPosterImage.style.display = "block"
      editPosterPlaceholder.style.display = "none"
    }

    showToast(`Info loaded for "${info.title}"!`, "success")
  } catch(error) {
    hideLoading()
    showToast("Error fetching info: " + error.message, "error")
  }
}

async function saveChanges(e) {
  e.preventDefault()

  try {
    const orderNumber = parseInt(editOrderInput.value)
    const title       = editTitleInput.value.trim()
    const genre       = editGenreInput.value.trim()
    const mediaType   = editMediaTypeInput.value

    if (!title || !genre) { showToast("Please fill in all required fields", "error"); return }

    const releaseYear = parseInt(editReleaseYearInput.value) || new Date().getFullYear()
    const rating      = parseFloat(editRatingInput.value) || 0

    if (rating < 0 || rating > 10) { showToast("Rating must be between 0 and 10", "error"); return }

    const updatedMedia = {
      title, genre,
      release_year: releaseYear,
      rating,
      poster_url: editPosterImage.style.display === "block" ? editPosterImage.src : null,
    }

    if (mediaType === "series") {
      const endYear = parseInt(editEndYearInput.value) || releaseYear
      if (endYear < releaseYear) { showToast("End year must be ≥ release year", "error"); return }
      updatedMedia.end_year = endYear
    }

    showLoading()
    const success = await updateMedia(mediaType, orderNumber, updatedMedia)
    hideLoading()

    if (success) {
      showToast(`"${title}" updated successfully!`, "success")
      closeModal()
      await searchMedia()
    } else {
      showToast("Failed to update media", "error")
    }
  } catch(error) {
    hideLoading()
    showToast("Error updating media: " + error.message, "error")
  }
}

// ════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════

async function deleteSelected() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked')
  if (checkboxes.length === 0) {
    showToast("Please select at least one item to delete", "info")
    return
  }
  if (!confirm(`Delete ${checkboxes.length} item(s) from your vault?`)) return

  try {
    let allSuccess = true
    for (const cb of checkboxes) {
      const row       = cb.closest("tr")
      const cells     = row.cells
      const orderNum  = parseInt(cells[1].textContent)
      const mediaType = cells[6].textContent.toLowerCase()
      const success   = await deleteMedia(mediaType, orderNum)
      if (!success) allSuccess = false
    }
    if (allSuccess) {
      showToast("Deleted from vault successfully!", "success")
      await searchMedia()
    } else {
      showToast("Some items could not be deleted", "error")
    }
  } catch(error) {
    showToast("Error deleting: " + error.message, "error")
  }
}

// ════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════

function showToast(message, type = "info") {
  toastMessage.textContent = message
  toastIcon.className = "fas"

  if (type === "success") {
    toastIcon.classList.add("fa-check-circle", "success")
    toast.style.borderColor = "rgba(76,175,80,0.3)"
  } else if (type === "error") {
    toastIcon.classList.add("fa-exclamation-circle", "error")
    toast.style.borderColor = "rgba(229,57,53,0.3)"
  } else {
    toastIcon.classList.add("fa-info-circle", "info")
    toast.style.borderColor = "rgba(33,150,243,0.3)"
  }

  // Reset progress animation
  const prog = toast.querySelector(".toast-progress")
  if (prog) {
    prog.innerHTML = ""
    void prog.offsetWidth
    prog.innerHTML = ""
    prog.style.cssText = ""
  }

  toast.classList.add("show")
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => {
    toast.classList.remove("show")
    toast.style.borderColor = ""
  }, 5000)
}

function showLoading() {
  loadingSpinner.style.display = "flex"
}
function hideLoading() {
  loadingSpinner.style.display = "none"
}

function escapeHtml(str) {
  if (!str) return ""
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
}

// ════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", init)

// ════════════════════════════════════════════════
//  AUTH SYSTEM
// ════════════════════════════════════════════════

// ── Restore session from localStorage ──
async function restoreSession() {
  const token    = getToken()
  const username = localStorage.getItem("cinema_username")
  if (!token) { updateAuthUI(null); return }

  // Optimistically restore, then verify in background
  currentUser = { token, username: username || "User" }
  updateAuthUI(currentUser)

  try {
    const res = await fetch(`${AUTH_BASE_URL}/me`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      currentUser = { token, username: data.username }
      localStorage.setItem("cinema_username", data.username)
      updateAuthUI(currentUser)
    } else {
      // Token expired
      handleUnauthorized()
    }
  } catch { /* offline — keep local state */ }
}

// ── Update UI based on auth state ──
function updateAuthUI(user) {
  const guestBtn   = document.getElementById("auth-open-btn")
  const userPill   = document.getElementById("user-pill")
  const userAvatar = document.getElementById("user-avatar")
  const userLabel  = document.getElementById("user-name-label")
  const guestBanner = document.getElementById("guest-banner")
  const navAdd     = document.getElementById("nav-add")

  if (user) {
    // Logged in
    if (guestBtn)   guestBtn.style.display   = "none"
    if (userPill)   userPill.style.display   = "flex"
    if (userAvatar) userAvatar.textContent   = user.username.charAt(0).toUpperCase()
    if (userLabel)  userLabel.textContent    = user.username
    if (guestBanner) guestBanner.style.display = "none"
    if (navAdd)     navAdd.style.opacity     = "1"
  } else {
    // Guest
    if (guestBtn)   guestBtn.style.display   = "flex"
    if (userPill)   userPill.style.display   = "none"
    if (guestBanner) guestBanner.style.display = "flex"
    if (navAdd)     navAdd.style.opacity     = "0.5"
  }
}

// ── Handle expired / invalid token ──
function handleUnauthorized() {
  clearToken()
  currentUser = null
  _cacheInvalidate()
  updateAuthUI(null)
  showToast("Session expired — please sign in again", "info")
}

// ── Open / close auth modal ──
function openAuthModal(tab = "login") {
  const modal = document.getElementById("auth-modal")
  if (!modal) return
  modal.style.display = "flex"
  document.body.style.overflow = "hidden"
  switchAuthTab(tab)
  // Close on backdrop click
  modal.addEventListener("click", _authModalBackdropClose)
  document.addEventListener("keydown", _authModalEscClose)
}
window.openAuthModal = openAuthModal

function closeAuthModal() {
  const modal = document.getElementById("auth-modal")
  if (!modal) return
  modal.style.display = "none"
  document.body.style.overflow = ""
  modal.removeEventListener("click", _authModalBackdropClose)
  document.removeEventListener("keydown", _authModalEscClose)
  // Clear errors
  const loginErr = document.getElementById("auth-login-error")
  const regErr   = document.getElementById("auth-register-error")
  if (loginErr) loginErr.style.display = "none"
  if (regErr)   regErr.style.display   = "none"
}
window.closeAuthModal = closeAuthModal

function _authModalBackdropClose(e) {
  if (e.target === document.getElementById("auth-modal")) closeAuthModal()
}
function _authModalEscClose(e) {
  if (e.key === "Escape") closeAuthModal()
}

// ── Switch between login / register tabs ──
function switchAuthTab(tab) {
  const loginForm = document.getElementById("auth-login-form")
  const regForm   = document.getElementById("auth-register-form")
  const tabLogin  = document.getElementById("tab-login")
  const tabReg    = document.getElementById("tab-register")
  const indicator = document.getElementById("auth-tab-indicator")

  if (tab === "login") {
    loginForm.style.display = "block"
    regForm.style.display   = "none"
    tabLogin.classList.add("active")
    tabReg.classList.remove("active")
    if (indicator) indicator.classList.remove("right")
    setTimeout(() => document.getElementById("auth-email")?.focus(), 50)
  } else {
    loginForm.style.display = "none"
    regForm.style.display   = "block"
    tabLogin.classList.remove("active")
    tabReg.classList.add("active")
    if (indicator) indicator.classList.add("right")
    setTimeout(() => document.getElementById("reg-username")?.focus(), 50)
  }
}
window.switchAuthTab = switchAuthTab

// ── Submit login ──
async function submitLogin() {
  const email    = document.getElementById("auth-email")?.value.trim()
  const password = document.getElementById("auth-password")?.value
  const errEl    = document.getElementById("auth-login-error")
  const btn      = document.getElementById("login-submit-btn")

  if (!email || !password) {
    showAuthError(errEl, "Please enter your email and password")
    return
  }

  btn.disabled = true
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing in…`

  try {
    const res  = await fetch(`${AUTH_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()

    if (!res.ok) {
      showAuthError(errEl, data.error || "Login failed")
    } else {
      setToken(data.token)
      localStorage.setItem("cinema_username", data.username)
      currentUser = { token: data.token, username: data.username }
      _cacheInvalidate()
      updateAuthUI(currentUser)
      closeAuthModal()
      showToast(`Welcome back, ${data.username}! 🎬`, "success")
      await searchMedia()
    }
  } catch {
    showAuthError(errEl, "Network error — please try again")
  }

  btn.disabled = false
  btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> Sign In`
}
window.submitLogin = submitLogin

// ── Submit register ──
async function submitRegister() {
  const username = document.getElementById("reg-username")?.value.trim()
  const email    = document.getElementById("reg-email")?.value.trim()
  const password = document.getElementById("reg-password")?.value
  const errEl    = document.getElementById("auth-register-error")
  const btn      = document.getElementById("register-submit-btn")

  if (!username || !email || !password) {
    showAuthError(errEl, "All fields are required")
    return
  }

  btn.disabled = true
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating account…`

  try {
    const res  = await fetch(`${AUTH_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    })
    const data = await res.json()

    if (!res.ok) {
      showAuthError(errEl, data.error || "Registration failed")
    } else {
      setToken(data.token)
      localStorage.setItem("cinema_username", data.username)
      currentUser = { token: data.token, username: data.username }
      _cacheInvalidate()
      updateAuthUI(currentUser)
      closeAuthModal()
      showToast(`Account created! Welcome, ${data.username} 🎉`, "success")
      await searchMedia()
    }
  } catch {
    showAuthError(errEl, "Network error — please try again")
  }

  btn.disabled = false
  btn.innerHTML = `<i class="fas fa-user-plus"></i> Create Account`
}
window.submitRegister = submitRegister

// ── Logout ──
function logout() {
  clearToken()
  currentUser = null
  _cacheInvalidate()
  updateAuthUI(null)
  switchView("collection")
  updateResultsTable([])
  showToast("Signed out successfully", "info")
}
window.logout = logout

// ── Show error inside auth modal ──
function showAuthError(el, msg) {
  if (!el) return
  el.textContent   = msg
  el.style.display = "block"
}

// ── Toggle password visibility ──
function togglePwVisibility(inputId, btn) {
  const inp = document.getElementById(inputId)
  if (!inp) return
  const isHidden = inp.type === "password"
  inp.type = isHidden ? "text" : "password"
  btn.innerHTML = isHidden ? `<i class="fas fa-eye-slash"></i>` : `<i class="fas fa-eye"></i>`
}
window.togglePwVisibility = togglePwVisibility

// Allow Enter key in auth forms
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("auth-password")?.addEventListener("keydown", e => {
    if (e.key === "Enter") submitLogin()
  })
  document.getElementById("reg-password")?.addEventListener("keydown", e => {
    if (e.key === "Enter") submitRegister()
  })
})