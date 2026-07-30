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
const actorSearchPanel  = document.getElementById("actor-search-panel")
const actorSuggestions  = document.getElementById("actor-suggestions")
const actorMatchBanner  = document.getElementById("actor-match-banner")
const actorMatchPhoto   = document.getElementById("actor-match-photo")
const actorMatchName    = document.getElementById("actor-match-name")
const actorMatchMeta    = document.getElementById("actor-match-meta")
const actorMatchTotal   = document.getElementById("actor-match-total")
const actorClearBtn     = document.getElementById("actor-clear-btn")
const actorCopyBtn      = document.getElementById("actor-copy-btn")
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
const sortStudio         = document.getElementById("sort-studio")
const sortMenuBtn        = document.getElementById("sort-menu-btn")
const sortPopover        = document.getElementById("sort-popover")
const sortDirectionBtn   = document.getElementById("sort-direction-btn")
const sortCurrentLabel   = document.getElementById("sort-current-label")
const sortDirectionShort = document.getElementById("sort-direction-short")
const sortDirectionIcon  = document.getElementById("sort-direction-icon")

// ── Personal / Notes fields (add form) ──
const watchStatusSelect  = document.getElementById("watch-status")
const watchDateInput     = document.getElementById("watch-date")
const rewatchCountInput  = document.getElementById("rewatch-count")
const favoriteChk        = document.getElementById("favorite-chk")
const notesInput         = document.getElementById("notes")

// ── Personal / Notes fields (edit modal) ──
const editWatchStatusSelect = document.getElementById("edit-watch-status")
const editWatchDateInput    = document.getElementById("edit-watch-date")
const editRewatchCountInput = document.getElementById("edit-rewatch-count")
const editFavoriteChk       = document.getElementById("edit-favorite-chk")
const editNotesInput        = document.getElementById("edit-notes")

// ── Global state ──
let currentResults  = []
let currentGridMode = 'grid'
let detailRequestSerial = 0

// ── Actor search state ──
const actorSearchState = {
  selected: null,
  suggestions: [],
  requestSerial: 0,
  debounceTimer: null,
  busy: false,
}
const _actorPeopleCache          = new Map()
const _actorCreditsCache         = new Map()
const _actorVaultCandidatesCache = new Map()

// ── Performer profile state ──
const actorProfileState = {
  person: null,
  credits: [],
  filter: "all",
  visibleLimit: 24,
  requestSerial: 0,
  vaultLookup: null,
}
const _actorProfileCache = new Map()

// ── Sorting state ──
const SORT_STORAGE_KEY = "cinema_sort_preference"
const SORT_FIELDS = new Set(["added", "title", "release_year", "rating"])
const titleCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })
let sortState = loadSortState()

// ── Cache layer (avoids redundant network calls) ──
const _cache = { data: null, ts: 0, TTL: 60_000 }   // 60s in-memory cache
const COLLECTION_SNAPSHOT_PREFIX = "cinema_collection_snapshot_v2"
const COLLECTION_SNAPSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function _cacheGet()          { return (Date.now() - _cache.ts < _cache.TTL) ? _cache.data : null }
function _cacheSet(data)      { _cache.data = data; _cache.ts = Date.now() }
function _cacheInvalidate() {
  _cache.ts = 0
  _actorVaultCandidatesCache.clear()
}

function getCollectionSnapshotKey() {
  const username = currentUser?.username || localStorage.getItem("cinema_username") || "guest"
  return `${COLLECTION_SNAPSHOT_PREFIX}:${username.toLowerCase()}`
}

function saveCollectionSnapshot(items) {
  if (!currentUser || !Array.isArray(items)) return
  try {
    localStorage.setItem(getCollectionSnapshotKey(), JSON.stringify({
      savedAt: Date.now(),
      items,
    }))
  } catch (_) {
    // Storage can be full or disabled; the normal network path still works.
  }
}

function readCollectionSnapshot() {
  if (!currentUser) return null
  try {
    const parsed = JSON.parse(localStorage.getItem(getCollectionSnapshotKey()) || "null")
    if (!parsed || !Array.isArray(parsed.items)) return null
    if (Date.now() - Number(parsed.savedAt || 0) > COLLECTION_SNAPSHOT_MAX_AGE) return null
    return parsed.items
  } catch (_) {
    return null
  }
}

function clearCollectionSnapshot() {
  try { localStorage.removeItem(getCollectionSnapshotKey()) } catch (_) {}
}


function normaliseMediaItem(item = {}) {
  return {
    ...item,
    order_number: parseInt(item.order_number) || 0,
    release_year: parseInt(item.release_year) || 0,
    end_year: parseInt(item.end_year) || 0,
    rating: parseFloat(item.rating) || 0,
  }
}

function applyLocalMediaUpdate(mediaType, orderNumber, mediaData, serverItem = null) {
  const source = Array.isArray(_cache.data)
    ? _cache.data
    : (readCollectionSnapshot() || [])

  let updatedItem = null
  const nextCollection = source.map(item => {
    if (item.media_type !== mediaType || Number(item.order_number) !== Number(orderNumber)) {
      return item
    }

    updatedItem = normaliseMediaItem({
      ...item,
      ...mediaData,
      ...(serverItem || {}),
      media_type: mediaType,
      order_number: orderNumber,
    })
    return updatedItem
  })

  // A defensive fallback for an old snapshot that did not contain the edited item.
  if (!updatedItem) {
    updatedItem = normaliseMediaItem({
      ...mediaData,
      ...(serverItem || {}),
      media_type: mediaType,
      order_number: orderNumber,
    })
    nextCollection.push(updatedItem)
  }

  _cacheSet(nextCollection)
  saveCollectionSnapshot(nextCollection)
  _actorVaultCandidatesCache.clear()
  return updatedItem
}

function applyLocalMediaInsert(item) {
  const source = Array.isArray(_cache.data)
    ? _cache.data
    : (readCollectionSnapshot() || [])
  const inserted = normaliseMediaItem(item)
  const nextCollection = [
    ...source.filter(existing => !(
      existing.media_type === inserted.media_type &&
      Number(existing.order_number) === Number(inserted.order_number)
    )),
    inserted,
  ]
  _cacheSet(nextCollection)
  saveCollectionSnapshot(nextCollection)
  _actorVaultCandidatesCache.clear()
  return inserted
}

function applyLocalMediaDelete(mediaType, orderNumber) {
  const source = Array.isArray(_cache.data)
    ? _cache.data
    : (readCollectionSnapshot() || [])
  const nextCollection = source.filter(item => !(
    item.media_type === mediaType &&
    Number(item.order_number) === Number(orderNumber)
  ))
  _cacheSet(nextCollection)
  saveCollectionSnapshot(nextCollection)
  _actorVaultCandidatesCache.clear()
  return nextCollection
}

function mediaMatchesCurrentFilters(item) {
  const filterType = filterTypeSelect.value
  if (filterType !== "all" && item.media_type !== filterType) return false

  if (searchBySelect.value === "actor") return Boolean(item._actorMatch)

  const rawQuery = searchInput.value.trim()
  const searchBy = searchBySelect.value
  const query = searchBy === "title"
    ? normalizeMediaSearchTitle(rawQuery).toLowerCase()
    : rawQuery.toLowerCase()

  if (!query) return true
  if (searchBy === "title") {
    return normalizeMediaSearchTitle(item.title).toLowerCase().includes(query)
  }
  if (searchBy === "genre") return item.genre?.toLowerCase().includes(query)
  if (searchBy === "release_year") {
    const year = parseInt(query)
    return !Number.isNaN(year) && (item.release_year === year || item.end_year === year)
  }
  if (searchBy === "rating") {
    const rating = parseFloat(query)
    return !Number.isNaN(rating) && parseFloat(item.rating) === rating
  }
  return true
}

function mediaIdentity(item) {
  return `${item.media_type}:${Number(item.order_number)}`
}

function replaceRenderedCard(item, index) {
  const existingCard = document.querySelector(`.media-card[data-index="${index}"]`)
  if (!existingCard) return false
  const replacement = buildMediaCard(item, index)
  replacement.classList.add("card-just-updated")
  existingCard.replaceWith(replacement)
  window.setTimeout(() => replacement.classList.remove("card-just-updated"), 500)
  return true
}

function refreshStatusAndStats() {
  if (statusLabel) {
    const directionCopy = getSortDirectionCopy()
    const actor = searchBySelect.value === "actor" ? actorSearchState.selected : null
    statusLabel.textContent = currentResults.length > 0
      ? actor
        ? `${currentResults.length} title${currentResults.length !== 1 ? "s" : ""} featuring ${actor.name} · ${getSortFieldLabel()}, ${directionCopy.long}`
        : `${currentResults.length} title${currentResults.length !== 1 ? "s" : ""} · ${getSortFieldLabel()}, ${directionCopy.long}`
      : actor
        ? `No titles featuring ${actor.name} in your vault`
        : "No results found"
  }
  updateStats(currentResults)
}

async function renderAfterLocalMediaUpdate(mediaType, orderNumber, updatedItem) {
  const previousIndex = currentResults.findIndex(item =>
    item.media_type === mediaType && Number(item.order_number) === Number(orderNumber)
  )
  if (previousIndex < 0) return

  const previous = currentResults[previousIndex]
  const prepared = prepareDisplayResults([{
    ...previous,
    ...updatedItem,
    _actorMatch: previous._actorMatch,
  }])[0]

  // If an edit makes the item stop matching the active search, remove it cleanly.
  if (!mediaMatchesCurrentFilters(prepared)) {
    currentResults.splice(previousIndex, 1)
    document.body.classList.add("instant-hydrate")
    updateResultsTable(currentResults)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove("instant-hydrate")
    }))
    return
  }

  currentResults[previousIndex] = prepared
  const sorted = sortMediaItems([...currentResults])
  const newIndex = sorted.findIndex(item => mediaIdentity(item) === mediaIdentity(prepared))
  currentResults = sorted
  _cardPool = currentResults

  // When the edited sort field changes its position, redraw silently without loaders.
  if (newIndex !== previousIndex) {
    document.body.classList.add("instant-hydrate")
    updateResultsTable(currentResults)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.body.classList.remove("instant-hydrate")
    }))
    return
  }

  // Common path: replace only the edited card/row. No collection refresh and no network call.
  replaceRenderedCard(prepared, previousIndex)
  if (currentGridMode === "list") renderCurrentTableRows()
  refreshStatusAndStats()
}

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
        <div class="sk-year-badge"></div>
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
async function fetchAllMedia({ showSkeleton = true, force = false } = {}) {
  // Guest users have no collection
  if (!currentUser) return []

  const cached = _cacheGet()
  if (!force && cached) return cached

  // Skeletons are a slow-network fallback, not the first thing the user sees.
  // A fast response finishes before this timer fires, so no loading flash occurs.
  let skeletonTimer = null
  let skeletonShown = false
  const scheduleSkeleton = () => {
    if (!showSkeleton) return
    skeletonTimer = window.setTimeout(() => {
      skeletonTimer = null
      skeletonShown = true
      showSkeletons(20)
    }, 550)
  }
  const stopSkeletonTimer = () => {
    if (skeletonTimer) {
      window.clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  try {
    scheduleSkeleton()
    const params = new URLSearchParams({
      type: "all",
      sort_by: sortState.field,
      sort_order: sortState.direction,
    })
    const response = await fetch(`${API_BASE_URL}/all?${params.toString()}`, {
      headers: authHeaders()
    })

    // The network answered. Prevent a late skeleton from appearing while JSON is parsed.
    stopSkeletonTimer()

    if (response.status === 401) {
      if (skeletonShown) hideSkeletons()
      handleUnauthorized()
      return []
    }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    if (skeletonShown) hideSkeletons()
    if (!Array.isArray(data)) return []
    const normalised = data.map(normaliseMediaItem)
    _cacheSet(normalised)
    saveCollectionSnapshot(normalised)
    return normalised
  } catch(error) {
    stopSkeletonTimer()
    if (skeletonShown) hideSkeletons()
    if (Array.isArray(cached) && cached.length) {
      showToast("Showing your saved collection while the server reconnects", "info")
      return cached
    }
    showToast(`Error fetching media: ${error.message}`, "error")
    return []
  }
}

// ── Legacy helper (used in edit/duplicate checks — uses cache) ──
async function fetchMedia(mediaType) {
  const all = await fetchAllMedia({ showSkeleton: false })
  return all.filter(item => item.media_type === mediaType)
}

async function saveMedia(mediaType, mediaData) {
  if (!currentUser) { openAuthModal('login'); return null }
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, data: mediaData }),
    })
    if (response.status === 401) { handleUnauthorized(); return null }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()
    hideLoading()
    if (result.error) throw new Error(result.error)
    if (result.success !== true) return null
    return result.item || {
      ...mediaData,
      media_type: mediaType,
      order_number: result.order_number,
    }
  } catch(error) {
    hideLoading()
    showToast("Error saving media: " + error.message, "error")
    return null
  }
}

async function updateMedia(mediaType, orderNumber, mediaData) {
  if (!currentUser) { openAuthModal('login'); return null }
  try {
    const response = await fetch(API_BASE_URL, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, order_number: orderNumber, data: mediaData }),
    })
    if (response.status === 401) { handleUnauthorized(); return null }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const result = await response.json()
    if (result.error) throw new Error(result.error)
    if (result.success !== true) return null

    // New backend versions return the updated document. Older ones remain compatible.
    return result.item || {
      ...mediaData,
      media_type: mediaType,
      order_number: orderNumber,
    }
  } catch(error) {
    showToast("Error updating media: " + error.message, "error")
    return null
  }
}

async function deleteMedia(mediaType, orderNumber) {
  if (!currentUser) { openAuthModal('login'); return false }
  try {
    const response = await fetch(API_BASE_URL, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ type: mediaType, order_number: orderNumber }),
    })
    if (response.status === 401) { handleUnauthorized(); return false }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const result = await response.json()
    return result.success === true
  } catch(error) {
    showToast("Error deleting media: " + error.message, "error")
    return false
  }
}

// ════════════════════════════════════════════════
//  CORE FUNCTIONS
// ════════════════════════════════════════════════

function applySavedTheme() {
  const light = localStorage.getItem("darkMode") === "false"
  document.documentElement.dataset.theme = light ? "light" : "dark"
  document.documentElement.style.colorScheme = light ? "light" : "dark"
  document.documentElement.style.backgroundColor = light ? "#f0ede8" : "#06060e"
  document.body.classList.toggle("light-theme", light)
  if (themeCheckbox) themeCheckbox.checked = light
}

function hydrateCollectionSnapshot() {
  const snapshot = readCollectionSnapshot()
  if (!snapshot?.length) return false

  const normalised = snapshot.map(item => ({
    ...item,
    order_number: parseInt(item.order_number) || 0,
    release_year: parseInt(item.release_year) || 0,
    end_year: parseInt(item.end_year) || 0,
    rating: parseFloat(item.rating) || 0,
  }))

  _cacheSet(normalised)
  document.body.classList.add("instant-hydrate")
  updateResultsTable(prepareDisplayResults(normalised))
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove("instant-hydrate")
  }))
  return true
}

async function init() {
  // Apply the saved theme before any network work, so refresh never flashes the opposite theme.
  applySavedTheme()
  themeCheckbox.addEventListener("change", toggleTheme)

  initFancySearchSelects()
  updateEndYearVisibility()
  bindDatePickerButtons()
  bindSortControls()
  updateSortUI()

  // restoreSession sets currentUser synchronously, then verifies the token in parallel.
  const sessionVerification = restoreSession()
  const hydrated = hydrateCollectionSnapshot()

  // Start the real collection request immediately; cached cards remain visible while it refreshes.
  const initialCollectionLoad = searchMedia({ forceRefresh: true, showSkeleton: !hydrated })
  void sessionVerification

  // Bind controls immediately instead of waiting for the backend response.
  searchBtn.addEventListener("click", () => searchMedia())
  searchInput.addEventListener("keypress", e => { if(e.key==="Enter") searchMedia() })
  searchInput.addEventListener("input", handleCollectionSearchInput)
  searchBySelect.addEventListener("change", handleSearchModeChange)
  filterTypeSelect.addEventListener("change", () => searchMedia())
  actorClearBtn?.addEventListener("click", clearActorSearch)
  actorCopyBtn?.addEventListener("click", copyActorRecommendationList)
  document.addEventListener("click", event => {
    if (actorSearchPanel && !actorSearchPanel.contains(event.target) && event.target !== searchInput) {
      hideActorSuggestions()
    }
  })
  syncSearchModeUI()
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

  const actorProfileModal = document.getElementById("actor-profile-modal")
  document.getElementById("actor-profile-close")?.addEventListener("click", closeActorProfile)
  document.getElementById("actor-bio-toggle")?.addEventListener("click", toggleActorBiography)
  document.getElementById("actor-filmography-more")?.addEventListener("click", () => {
    actorProfileState.visibleLimit += 24
    renderActorFilmography()
  })
  actorProfileModal?.addEventListener("click", handleActorProfileClick)

  // Edit modal close
  window.addEventListener("click", e => {
    if (e.target === editModal) closeModal()
  })

  await initialCollectionLoad
}

// ── Accordion toggle for Personal Notes section ──
function togglePersonalSection(headerEl) {
  const section = headerEl.closest(".personal-section")
  if (!section) return
  section.classList.toggle("personal-section--open")
}
window.togglePersonalSection = togglePersonalSection

function bindDatePickerButtons(root = document) {
  root.querySelectorAll(".date-picker-btn").forEach(btn => {
    if (btn.dataset.bound === "1") return
    btn.dataset.bound = "1"
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.dateTarget
      const input = targetId ? document.getElementById(targetId) : null
      if (!input) return
      input.focus()
      if (typeof input.showPicker === "function") input.showPicker()
      else input.click()
    })
  })
}

function toggleTheme(e) {
  // Disable ALL transitions instantly → prevents 800-card repaint storm
  const kill = document.createElement("style")
  kill.id = "_theme_kill"
  kill.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}"
  document.head.appendChild(kill)

  const light = Boolean(e.target.checked)
  document.body.classList.toggle("light-theme", light)
  document.documentElement.dataset.theme = light ? "light" : "dark"
  document.documentElement.style.colorScheme = light ? "light" : "dark"
  document.documentElement.style.backgroundColor = light ? "#f0ede8" : "#06060e"
  localStorage.setItem("darkMode", light ? "false" : "true")

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
//  SORTING
// ════════════════════════════════════════════════

function loadSortState() {
  const fallback = { field: "added", direction: "desc" }
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) || "null")
    if (!saved || !SORT_FIELDS.has(saved.field)) return fallback
    return {
      field: saved.field,
      direction: saved.direction === "asc" ? "asc" : "desc",
    }
  } catch {
    return fallback
  }
}

function saveSortState() {
  try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortState)) } catch { /* storage unavailable */ }
}

function defaultSortDirection(field) {
  return field === "title" ? "asc" : "desc"
}

function getSortFieldLabel(field = sortState.field) {
  return {
    added: "Date added",
    title: "Title",
    release_year: "Release year",
    rating: "Rating",
  }[field] || "Date added"
}

function getSortDirectionCopy(field = sortState.field, direction = sortState.direction) {
  const isAsc = direction === "asc"
  if (field === "title") {
    return { short: isAsc ? "A–Z" : "Z–A", long: isAsc ? "A to Z" : "Z to A" }
  }
  if (field === "rating") {
    return { short: isAsc ? "Lowest" : "Highest", long: isAsc ? "lowest first" : "highest first" }
  }
  if (field === "release_year") {
    return { short: isAsc ? "Oldest" : "Newest", long: isAsc ? "oldest release first" : "newest release first" }
  }
  return { short: isAsc ? "Oldest" : "Newest", long: isAsc ? "oldest added first" : "newest added first" }
}

function getAddedTimestamp(item) {
  const explicitDate = Date.parse(item.created_at || item.createdAt || "")
  if (Number.isFinite(explicitDate)) return explicitDate

  // MongoDB ObjectIds embed their creation timestamp in the first 8 hex characters.
  const objectId = String(item._id || "")
  if (/^[a-f0-9]{24}$/i.test(objectId)) {
    return parseInt(objectId.slice(0, 8), 16) * 1000
  }

  return Number(item.order_number) || 0
}

function compareSortValues(a, b, field) {
  if (field === "title") {
    return titleCollator.compare(String(a.title || ""), String(b.title || ""))
  }
  if (field === "added") {
    return getAddedTimestamp(a) - getAddedTimestamp(b)
  }

  const aValue = Number(a[field]) || 0
  const bValue = Number(b[field]) || 0
  return aValue - bValue
}

function sortMediaItems(items) {
  const multiplier = sortState.direction === "asc" ? 1 : -1
  return [...items].sort((a, b) => {
    const primary = compareSortValues(a, b, sortState.field)
    if (primary !== 0) return primary * multiplier

    // Deterministic tie-breaker: keep the add order aligned with the chosen direction.
    const tie = (Number(a.order_number) || 0) - (Number(b.order_number) || 0)
    return tie * multiplier
  })
}

function positionSortPopover() {
  if (!sortStudio || !sortPopover) return

  const viewportPadding = 12
  const gap = 10
  const studioRect = sortStudio.getBoundingClientRect()
  const width = Math.min(354, Math.max(260, window.innerWidth - viewportPadding * 2))
  const left = Math.min(
    Math.max(studioRect.left, viewportPadding),
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding)
  )

  // Measure at the final width so the placement also works on narrow screens.
  sortPopover.style.setProperty("--sort-popover-width", `${width}px`)
  sortPopover.style.setProperty("--sort-popover-left", `${Math.round(left)}px`)
  sortPopover.style.setProperty("--sort-popover-max-height", `${Math.max(160, window.innerHeight - viewportPadding * 2)}px`)

  const naturalHeight = Math.min(sortPopover.scrollHeight, window.innerHeight - viewportPadding * 2)
  const roomBelow = window.innerHeight - studioRect.bottom - gap - viewportPadding
  const roomAbove = studioRect.top - gap - viewportPadding
  const placeAbove = roomBelow < naturalHeight && roomAbove > roomBelow
  const availableRoom = Math.max(120, placeAbove ? roomAbove : roomBelow)
  const renderedHeight = Math.min(naturalHeight, availableRoom)
  const top = placeAbove
    ? Math.max(viewportPadding, studioRect.top - gap - renderedHeight)
    : Math.min(window.innerHeight - viewportPadding - renderedHeight, studioRect.bottom + gap)

  sortPopover.style.setProperty("--sort-popover-top", `${Math.round(top)}px`)
  sortPopover.style.setProperty("--sort-popover-max-height", `${Math.round(availableRoom)}px`)
  sortPopover.style.setProperty("--sort-popover-origin", placeAbove ? "bottom left" : "top left")
}

function closeSortMenu() {
  if (!sortStudio || !sortPopover || !sortMenuBtn) return
  sortStudio.classList.remove("open")
  sortStudio.closest(".toolbar")?.classList.remove("sort-menu-open")
  sortPopover.setAttribute("aria-hidden", "true")
  sortMenuBtn.setAttribute("aria-expanded", "false")
}

function toggleSortMenu() {
  if (!sortStudio || !sortPopover || !sortMenuBtn) return
  const willOpen = !sortStudio.classList.contains("open")
  if (willOpen) positionSortPopover()
  sortStudio.classList.toggle("open", willOpen)
  sortStudio.closest(".toolbar")?.classList.toggle("sort-menu-open", willOpen)
  sortPopover.setAttribute("aria-hidden", String(!willOpen))
  sortMenuBtn.setAttribute("aria-expanded", String(willOpen))
}

function setSort(field, requestedDirection = null) {
  if (!SORT_FIELDS.has(field)) return

  const direction = requestedDirection
    ? (requestedDirection === "asc" ? "asc" : "desc")
    : sortState.field === field
      ? (sortState.direction === "asc" ? "desc" : "asc")
      : defaultSortDirection(field)

  sortState = { field, direction }
  saveSortState()
  updateSortUI()
  closeSortMenu()

  if (currentResults.length) {
    updateResultsTable(sortMediaItems(currentResults))
  }
}

function updateSortUI() {
  const directionCopy = getSortDirectionCopy()
  if (sortCurrentLabel) sortCurrentLabel.textContent = getSortFieldLabel()
  if (sortDirectionShort) sortDirectionShort.textContent = directionCopy.short

  if (sortDirectionIcon) {
    sortDirectionIcon.className = "fas"
    if (sortState.field === "title") {
      sortDirectionIcon.classList.add(sortState.direction === "asc" ? "fa-arrow-down-a-z" : "fa-arrow-down-z-a")
    } else {
      sortDirectionIcon.classList.add(sortState.direction === "asc" ? "fa-arrow-up-short-wide" : "fa-arrow-down-wide-short")
    }
  }

  if (sortDirectionBtn) {
    sortDirectionBtn.title = `Reverse order — currently ${directionCopy.long}`
    sortDirectionBtn.setAttribute("aria-label", `Reverse order. Currently ${directionCopy.long}`)
  }

  document.querySelectorAll(".sort-option").forEach(option => {
    const active = option.dataset.sortField === sortState.field
    option.classList.toggle("active", active)
    option.setAttribute("aria-checked", String(active))
  })

  document.querySelectorAll(".sort-th").forEach(th => {
    const active = th.dataset.sortField === sortState.field
    th.classList.toggle("active-sort", active)
    th.setAttribute("aria-sort", active
      ? (sortState.direction === "asc" ? "ascending" : "descending")
      : "none")

    const icon = th.querySelector(".table-sort-icon")
    if (icon) {
      icon.className = "fas table-sort-icon"
      icon.classList.add(active
        ? (sortState.direction === "asc" ? "fa-arrow-up" : "fa-arrow-down")
        : "fa-sort")
    }
  })
}

function bindSortControls() {
  sortMenuBtn?.addEventListener("click", event => {
    event.stopPropagation()
    toggleSortMenu()
  })

  sortDirectionBtn?.addEventListener("click", event => {
    event.stopPropagation()
    setSort(sortState.field, sortState.direction === "asc" ? "desc" : "asc")
  })

  document.querySelectorAll(".sort-option").forEach(option => {
    option.addEventListener("click", () => setSort(option.dataset.sortField))
  })

  document.querySelectorAll(".table-sort-btn").forEach(button => {
    button.addEventListener("click", () => setSort(button.dataset.sortField))
  })

  document.addEventListener("click", event => {
    if (sortStudio && !sortStudio.contains(event.target)) closeSortMenu()
  })

  const keepSortPopoverAnchored = () => {
    if (sortStudio?.classList.contains("open")) positionSortPopover()
  }
  window.addEventListener("resize", keepSortPopoverAnchored, { passive: true })
  window.addEventListener("scroll", keepSortPopoverAnchored, { passive: true, capture: true })

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSortMenu()
  })
}

// ════════════════════════════════════════════════
//  SEARCH & DISPLAY
// ════════════════════════════════════════════════

async function searchMedia(options = {}) {
  const forceRefresh = Boolean(options?.forceRefresh)
  const showSkeleton = options?.showSkeleton !== false
  const rawSearchQuery = searchInput.value.trim()
  const searchBy       = searchBySelect.value
  const filterType     = filterTypeSelect.value

  // Actor mode uses TMDB cast credits, then intersects them with the user's own vault.
  if (searchBy === "actor") {
    await searchCollectionByActor(rawSearchQuery, filterType)
    return
  }

  setActorSearchBusy(false)
  hideActorSuggestions()
  hideActorMatchBanner()

  // Make dotted/file-style title searches match normal titles in the collection.
  // Example: "How.To.Train.Your.Dragon" → "How To Train Your Dragon"
  const searchQuery = searchBy === "title"
    ? normalizeMediaSearchTitle(rawSearchQuery).toLowerCase()
    : rawSearchQuery.toLowerCase()

  if (searchBy === "title" && rawSearchQuery && searchQuery !== rawSearchQuery.toLowerCase()) {
    searchInput.value = normalizeMediaSearchTitle(rawSearchQuery)
  }

  try {
    const all = await fetchAllMedia({ showSkeleton, force: forceRefresh })

    let results = all.filter(mediaMatchesCurrentFilters)

    results = prepareDisplayResults(results)
    updateResultsTable(results)

  } catch(error) {
    showToast("Error searching media: " + error.message, "error")
  }
}

function prepareDisplayResults(results) {
  return sortMediaItems(
    results.map(item => ({
      ...item,
      display_year: item.media_type === "movie"
        ? item.release_year?.toString() || ""
        : item.release_year === item.end_year
          ? item.release_year?.toString() || ""
          : `${item.release_year || ""}–${item.end_year || ""}`,
    }))
  )
}


function refreshActorSearchPanelVisibility() {
  if (!actorSearchPanel) return
  const isActorMode = searchBySelect.value === "actor"
  const hasSuggestions = actorSuggestions && !actorSuggestions.hidden && actorSuggestions.innerHTML.trim() !== ""
  const hasBanner = actorMatchBanner && !actorMatchBanner.hidden
  actorSearchPanel.hidden = !(isActorMode && (hasSuggestions || hasBanner))
}

function closeFancySearchSelects(except = null) {
  document.querySelectorAll('.fancy-select.open').forEach(el => {
    if (el !== except) {
      el.classList.remove('open')
      el.querySelector('.fancy-select-trigger')?.setAttribute('aria-expanded', 'false')
    }
  })
}

function getFancySelectOptionMeta(selectId, value) {
  const maps = {
    'search-by': {
      title: { icon: 'fa-font' },
      actor: { icon: 'fa-user' },
      release_year: { icon: 'fa-calendar-days' },
      genre: { icon: 'fa-masks-theater' },
      rating: { icon: 'fa-star' },
    },
    'filter-type': {
      all: { icon: 'fa-layer-group' },
      movie: { icon: 'fa-film' },
      series: { icon: 'fa-tv' },
    }
  }
  return maps[selectId]?.[value] || { icon: 'fa-check' }
}

function createFancySearchSelectMarkup(selectEl) {
  const wrapper = document.createElement('div')
  wrapper.className = `fancy-select ${selectEl.id === 'filter-type' ? 'compact' : ''}`
  wrapper.dataset.forSelect = selectEl.id
  wrapper.innerHTML = `
    <button type="button" class="fancy-select-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="fancy-select-trigger-main">
        <i class="fas fa-check fancy-select-current-icon"></i>
        <span class="fancy-select-trigger-label"></span>
      </span>
      <i class="fas fa-chevron-down fancy-select-trigger-icon"></i>
    </button>
    <div class="fancy-select-menu" role="listbox"></div>`
  selectEl.insertAdjacentElement('afterend', wrapper)
  return wrapper
}

function buildFancySearchSelect(selectEl) {
  if (!selectEl) return null
  selectEl.classList.add('native-select-hidden')

  const wrapper = document.querySelector(`.fancy-select[data-for-select="${selectEl.id}"]`)
    || createFancySearchSelectMarkup(selectEl)
  if (wrapper.dataset.bound === 'true') return wrapper
  wrapper.dataset.bound = 'true'

  const trigger = wrapper.querySelector('.fancy-select-trigger')
  const label = wrapper.querySelector('.fancy-select-trigger-label')
  const currentIcon = wrapper.querySelector('.fancy-select-current-icon')
  const menu = wrapper.querySelector('.fancy-select-menu')

  const ensureOptions = () => {
    if (menu.querySelector('.fancy-select-option')) return
    menu.innerHTML = Array.from(selectEl.options).map(option => {
      const meta = getFancySelectOptionMeta(selectEl.id, option.value)
      return `<button type="button" class="fancy-select-option" data-value="${option.value}" role="option">
        <span class="fancy-select-option-main"><i class="fas ${meta.icon}"></i><span>${option.textContent}</span></span>
        <i class="fas fa-check fancy-select-check"></i>
      </button>`
    }).join('')
  }

  const render = () => {
    ensureOptions()
    const selectedOption = selectEl.options[selectEl.selectedIndex]
    const meta = getFancySelectOptionMeta(selectEl.id, selectEl.value)
    label.textContent = selectedOption?.textContent || ''
    currentIcon.className = `fas ${meta.icon} fancy-select-current-icon`
    menu.querySelectorAll('.fancy-select-option').forEach(button => {
      const active = button.dataset.value === selectEl.value
      button.classList.toggle('active', active)
      button.setAttribute('aria-selected', active ? 'true' : 'false')
    })
  }

  trigger.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    const willOpen = !wrapper.classList.contains('open')
    closeFancySearchSelects(wrapper)
    wrapper.classList.toggle('open', willOpen)
    trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false')
  })

  menu.addEventListener('click', event => {
    const optionButton = event.target.closest('.fancy-select-option')
    if (!optionButton) return
    const nextValue = optionButton.dataset.value
    if (selectEl.value !== nextValue) {
      selectEl.value = nextValue
      selectEl.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      render()
    }
    wrapper.classList.remove('open')
    trigger.setAttribute('aria-expanded', 'false')
  })

  selectEl.addEventListener('change', render)
  render()
  return wrapper
}

function initFancySearchSelects() {
  buildFancySearchSelect(searchBySelect)
  buildFancySearchSelect(filterTypeSelect)
  document.addEventListener('click', event => {
    if (!event.target.closest('.fancy-select')) closeFancySearchSelects()
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeFancySearchSelects()
  })
}

function syncSearchModeUI() {
  const isActorMode = searchBySelect.value === "actor"
  searchInput.placeholder = isActorMode
    ? "Search an actor — e.g. Cillian Murphy"
    : "Search your vault…"

  const icon = document.querySelector(".search-ico")
  if (icon) {
    icon.className = isActorMode
      ? "fas fa-user-magnifying-glass search-ico"
      : "fas fa-search search-ico"
  }

  document.querySelector(".search-wrap")?.classList.toggle("actor-mode", isActorMode)
  refreshActorSearchPanelVisibility()
}

function handleSearchModeChange() {
  window.clearTimeout(actorSearchState.debounceTimer)
  actorSearchState.requestSerial += 1
  actorSearchState.selected = null
  searchInput.value = ""
  hideActorSuggestions()
  hideActorMatchBanner()
  syncSearchModeUI()
  searchMedia()
  searchInput.focus()
}

function handleCollectionSearchInput() {
  if (searchBySelect.value !== "actor") return

  const cleaned = normalizeMediaSearchTitle(searchInput.value)
  if (actorSearchState.selected && cleaned.toLowerCase() !== actorSearchState.selected.name.toLowerCase()) {
    actorSearchState.selected = null
    hideActorMatchBanner()
  }

  window.clearTimeout(actorSearchState.debounceTimer)
  if (cleaned.length < 2) {
    actorSearchState.requestSerial += 1
    hideActorSuggestions()
    return
  }

  actorSearchState.debounceTimer = window.setTimeout(() => loadActorSuggestions(cleaned), 280)
}

async function searchPeopleByName(query) {
  const cleaned = normalizeMediaSearchTitle(query)
  const cacheKey = cleaned.toLowerCase()
  if (_actorPeopleCache.has(cacheKey)) return _actorPeopleCache.get(cacheKey)

  const response = await fetch(
    `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleaned)}&language=en-US&include_adult=false&page=1`
  )
  if (!response.ok) throw new Error("Could not search actors right now")
  const data = await response.json()
  const people = (data.results || [])
    .filter(person => person?.id && person?.name && person.known_for_department === "Acting")
    .slice(0, 10)
  _actorPeopleCache.set(cacheKey, people)
  return people
}

function getActorVaultCacheKey(query, filterType, collection) {
  // _cache.ts changes whenever the collection is refetched after an add/edit/delete.
  return `${normalizeMediaSearchTitle(query).toLowerCase()}|${filterType}|${_cache.ts}|${collection.length}`
}

async function findActorsInsideVault(query, filterType = "all") {
  const cleaned = normalizeMediaSearchTitle(query)
  if (!cleaned) return []

  // Fetch the user's collection silently, without replacing the visible cards with skeletons.
  const collection = await fetchAllMedia({ showSkeleton: false })
  if (!collection.length) return []

  const cacheKey = getActorVaultCacheKey(cleaned, filterType, collection)
  if (_actorVaultCandidatesCache.has(cacheKey)) {
    return _actorVaultCandidatesCache.get(cacheKey)
  }

  const people = await searchPeopleByName(cleaned)
  if (!people.length) return []

  // Reverse matching is much faster than indexing every title in a large vault:
  // one filmography request per likely name, then intersect it with the local collection.
  const checked = await Promise.allSettled(
    people.map(async person => {
      const credits = await fetchActorCredits(person.id)
      const allMatches = matchCollectionToActorCredits(collection, credits, "all", person)
      const visibleMatches = filterType === "all"
        ? allMatches
        : allMatches.filter(item => item.media_type === filterType)
      if (!visibleMatches.length) return null

      return {
        ...person,
        // Keep every vault match so switching Movies/Series after selection is instant.
        _vaultMatches: allMatches,
        _vaultSuggestionMatches: visibleMatches,
        _vaultCount: visibleMatches.length,
        _vaultMovieCount: visibleMatches.filter(item => item.media_type === "movie").length,
        _vaultSeriesCount: visibleMatches.filter(item => item.media_type === "series").length,
        _vaultCreditsCount: credits.length,
      }
    })
  )

  const exactName = cleaned.toLowerCase()
  const candidates = checked
    .filter(result => result.status === "fulfilled" && result.value)
    .map(result => result.value)
    .sort((a, b) => {
      const aExact = a.name.toLowerCase() === exactName ? 1 : 0
      const bExact = b.name.toLowerCase() === exactName ? 1 : 0
      return (bExact - aExact)
        || (b._vaultCount - a._vaultCount)
        || ((b.popularity || 0) - (a.popularity || 0))
    })
    .slice(0, 7)

  _actorVaultCandidatesCache.set(cacheKey, candidates)
  return candidates
}

async function loadActorSuggestions(query) {
  const serial = ++actorSearchState.requestSerial
  showActorSuggestionsLoading()

  try {
    const people = await findActorsInsideVault(query, filterTypeSelect.value)
    if (serial !== actorSearchState.requestSerial || searchBySelect.value !== "actor") return
    actorSearchState.suggestions = people
    renderActorSuggestions(people, query)
  } catch (error) {
    if (serial !== actorSearchState.requestSerial) return
    renderActorSuggestionsError(error.message)
  }
}

function getActorVaultPreview(person) {
  return (person._vaultSuggestionMatches || person._vaultMatches || [])
    .map(item => item.title)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ")
}

function renderActorSuggestions(people, query) {
  if (!actorSuggestions) return
  actorSuggestions.hidden = false

  if (!people.length) {
    actorSuggestions.innerHTML = `
      <div class="actor-suggestion-empty">
        <i class="fas fa-user-slash"></i>
        <div>
          <strong>No matching performer in your collection</strong>
          <span>Try the full name, or switch the media filter to “All”.</span>
        </div>
      </div>`
    refreshActorSearchPanelVisibility()
    return
  }

  actorSuggestions.innerHTML = `
    <div class="actor-suggestions-head">
      <span><i class="fas fa-vault"></i> Performers found in your collection</span>
      <small>${people.length} vault match${people.length === 1 ? "" : "es"}</small>
    </div>
    <div class="actor-suggestions-grid">
      ${people.map((person, index) => {
        const preview = getActorVaultPreview(person) || "Titles available in your vault"
        const photo = person.profile_path
          ? `<img src="${TMDB_IMAGE_URL}${person.profile_path}" alt="" loading="lazy">`
          : `<span class="actor-suggestion-ph"><i class="fas fa-user"></i></span>`
        return `
          <button type="button" class="actor-suggestion-card" data-actor-index="${index}" role="option">
            <span class="actor-suggestion-photo">${photo}</span>
            <span class="actor-suggestion-copy">
              <span class="actor-suggestion-title-row">
                <strong>${escapeHtml(person.name)}</strong>
                <em>${person._vaultCount} title${person._vaultCount === 1 ? "" : "s"}</em>
              </span>
              <small>${escapeHtml(preview)}</small>
              <span class="actor-vault-breakdown">
                ${person._vaultMovieCount ? `<b><i class="fas fa-film"></i> ${person._vaultMovieCount}</b>` : ""}
                ${person._vaultSeriesCount ? `<b><i class="fas fa-tv"></i> ${person._vaultSeriesCount}</b>` : ""}
              </span>
            </span>
            <i class="fas fa-chevron-right"></i>
          </button>`
      }).join("")}
    </div>`

  actorSuggestions.querySelectorAll(".actor-suggestion-card").forEach(button => {
    button.addEventListener("click", () => {
      const person = people[Number(button.dataset.actorIndex)]
      if (person) selectActorSuggestion(person)
    })
  })
  refreshActorSearchPanelVisibility()
}

function showActorSuggestionsLoading() {
  if (!actorSuggestions) return
  actorSuggestions.hidden = false
  actorSuggestions.innerHTML = `
    <div class="actor-suggestion-loading">
      <span class="actor-loading-orbit"><i class="fas fa-user"></i></span>
      <div><strong>Checking performers in your vault…</strong><span>Only names with matching titles will appear</span></div>
    </div>`
  refreshActorSearchPanelVisibility()
}

function renderActorSuggestionsError(message) {
  if (!actorSuggestions) return
  actorSuggestions.hidden = false
  actorSuggestions.innerHTML = `
    <div class="actor-suggestion-empty error">
      <i class="fas fa-triangle-exclamation"></i>
      <div><strong>Cast search unavailable</strong><span>${escapeHtml(message)}</span></div>
    </div>`
}

function hideActorSuggestions() {
  if (!actorSuggestions) return
  actorSuggestions.hidden = true
  actorSuggestions.innerHTML = ""
  refreshActorSearchPanelVisibility()
}

function selectActorSuggestion(person) {
  actorSearchState.selected = person
  searchInput.value = person.name
  hideActorSuggestions()
  renderActorMatchBanner(person, { loading: true })
  searchMedia()
}

async function fetchActorCredits(personId) {
  if (_actorCreditsCache.has(personId)) return _actorCreditsCache.get(personId)

  const response = await fetch(
    `${TMDB_BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}&language=en-US`
  )
  if (!response.ok) throw new Error("Could not load this actor's filmography")
  const data = await response.json()
  const castCredits = (data.cast || []).filter(credit => credit.media_type === "movie" || credit.media_type === "tv")
  _actorCreditsCache.set(personId, castCredits)
  return castCredits
}

function normalizeCreditTitle(value) {
  return normalizeMediaSearchTitle(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function getCreditYear(credit) {
  const date = credit.release_date || credit.first_air_date || ""
  const year = parseInt(String(date).slice(0, 4))
  return Number.isFinite(year) ? year : 0
}

function buildActorCreditIndex(credits) {
  const titleIndex = new Map()
  const posterIndex = new Map()

  credits.forEach(credit => {
    const type = credit.media_type === "tv" ? "series" : "movie"
    const names = [credit.title, credit.original_title, credit.name, credit.original_name]
      .filter(Boolean)

    names.forEach(name => {
      const normalized = normalizeCreditTitle(name)
      if (!normalized) return
      const key = `${type}|${normalized}`
      if (!titleIndex.has(key)) titleIndex.set(key, [])
      titleIndex.get(key).push(credit)
    })

    if (credit.poster_path) {
      posterIndex.set(`${type}|${credit.poster_path}`, credit)
    }
  })

  return { titleIndex, posterIndex }
}

function getStoredPosterPath(posterUrl) {
  if (!posterUrl) return ""
  try {
    const pathname = new URL(posterUrl, window.location.href).pathname
    const marker = "/t/p/"
    const markerIndex = pathname.indexOf(marker)
    if (markerIndex >= 0) {
      const afterSize = pathname.slice(markerIndex + marker.length)
      const slashIndex = afterSize.indexOf("/")
      return slashIndex >= 0 ? afterSize.slice(slashIndex) : ""
    }
    return pathname.startsWith("/") ? pathname : `/${pathname}`
  } catch (_) {
    const match = String(posterUrl).match(/\/([^/?#]+\.(?:jpg|jpeg|png|webp))(?:[?#]|$)/i)
    return match ? `/${match[1]}` : ""
  }
}

function chooseBestActorCredit(item, candidates) {
  if (!candidates?.length) return null
  const itemYear = parseInt(item.release_year) || 0

  if (itemYear) {
    const exactYear = candidates.find(credit => getCreditYear(credit) === itemYear)
    if (exactYear) return exactYear

    const closeYear = candidates.find(credit => {
      const creditYear = getCreditYear(credit)
      return creditYear && Math.abs(creditYear - itemYear) <= 1
    })
    if (closeYear) return closeYear
  }

  return candidates[0]
}

function matchCollectionToActorCredits(collection, credits, filterType, actor) {
  const { titleIndex, posterIndex } = buildActorCreditIndex(credits)

  return collection.flatMap(item => {
    if (filterType !== "all" && item.media_type !== filterType) return []

    // Poster paths are TMDB-stable and avoid missing matches when stored/display titles differ.
    const posterPath = getStoredPosterPath(item.poster_url)
    const posterCredit = posterPath
      ? posterIndex.get(`${item.media_type}|${posterPath}`)
      : null

    const titleKey = `${item.media_type}|${normalizeCreditTitle(item.title)}`
    const credit = posterCredit || chooseBestActorCredit(item, titleIndex.get(titleKey))
    if (!credit) return []

    return [{
      ...item,
      _actorMatch: {
        actorName: actor.name,
        character: String(credit.character || "").trim(),
        episodeCount: parseInt(credit.episode_count) || 0,
      },
    }]
  })
}

async function resolveActorForSearch(query, filterType = "all") {
  const cleaned = normalizeMediaSearchTitle(query)
  if (!cleaned) return null

  const selected = actorSearchState.selected
  if (selected && selected.name.toLowerCase() === cleaned.toLowerCase()) return selected

  const people = await findActorsInsideVault(cleaned, filterType)
  if (!people.length) return null

  const exact = people.find(person => person.name.toLowerCase() === cleaned.toLowerCase())
  return exact || people[0]
}

async function searchCollectionByActor(rawQuery, filterType) {
  window.clearTimeout(actorSearchState.debounceTimer)
  const serial = ++actorSearchState.requestSerial
  const query = normalizeMediaSearchTitle(rawQuery)
  if (query !== rawQuery) searchInput.value = query
  hideActorSuggestions()

  if (!query) {
    setActorSearchBusy(false)
    actorSearchState.selected = null
    hideActorMatchBanner()
    const all = await fetchAllMedia()
    if (serial !== actorSearchState.requestSerial) return
    updateResultsTable(prepareDisplayResults(
      all.filter(item => filterType === "all" || item.media_type === filterType)
    ))
    return
  }

  setActorSearchBusy(true)
  try {
    const actor = await resolveActorForSearch(query, filterType)
    if (serial !== actorSearchState.requestSerial || searchBySelect.value !== "actor") return

    if (!actor) {
      actorSearchState.selected = null
      hideActorMatchBanner()
      updateResultsTable([])
      showToast(`No performer named “${query}” has titles in your collection`, "info")
      return
    }

    actorSearchState.selected = actor
    searchInput.value = actor.name
    renderActorMatchBanner(actor, { loading: true })

    const [collection, credits] = await Promise.all([
      fetchAllMedia({ showSkeleton: false }),
      fetchActorCredits(actor.id),
    ])
    if (serial !== actorSearchState.requestSerial || searchBySelect.value !== "actor") return

    const matchedItems = Array.isArray(actor._vaultMatches)
      ? actor._vaultMatches.filter(item => filterType === "all" || item.media_type === filterType)
      : matchCollectionToActorCredits(collection, credits, filterType, actor)

    const results = prepareDisplayResults(matchedItems)

    renderActorMatchBanner(actor, {
      count: results.length,
      creditsCount: credits.length,
      movieCount: results.filter(item => item.media_type === "movie").length,
      seriesCount: results.filter(item => item.media_type === "series").length,
    })
    updateResultsTable(results)
  } catch (error) {
    if (serial !== actorSearchState.requestSerial) return
    renderActorMatchBanner(actorSearchState.selected, { error: error.message })
    showToast("Actor search error: " + error.message, "error")
  } finally {
    if (serial === actorSearchState.requestSerial) setActorSearchBusy(false)
  }
}

function renderActorMatchBanner(actor, options = {}) {
  if (!actor || !actorMatchBanner) return
  actorMatchBanner.hidden = false
  refreshActorSearchPanelVisibility()
  actorMatchBanner.classList.toggle("is-loading", Boolean(options.loading))
  actorMatchBanner.classList.toggle("has-error", Boolean(options.error))

  actorMatchName.textContent = actor.name
  actorMatchTotal.textContent = options.loading ? "…" : String(options.count ?? 0)
  if (actorCopyBtn) actorCopyBtn.disabled = Boolean(options.loading || options.error || !(options.count > 0))

  if (options.error) {
    actorMatchMeta.textContent = options.error
  } else if (options.loading) {
    actorMatchMeta.textContent = "Scanning movies and series in your collection…"
  } else {
    const department = actor.known_for_department || "Acting"
    const movieCount = Number(options.movieCount || 0)
    const seriesCount = Number(options.seriesCount || 0)
    const vaultParts = [
      movieCount ? `${movieCount} movie${movieCount === 1 ? "" : "s"}` : "",
      seriesCount ? `${seriesCount} series` : "",
    ].filter(Boolean).join(" · ")
    actorMatchMeta.textContent = vaultParts || `${department} · ${options.creditsCount || 0} cast credits checked`
  }

  if (actor.profile_path) {
    actorMatchPhoto.innerHTML = `<img src="${TMDB_IMAGE_URL}${actor.profile_path}" alt="${escapeHtml(actor.name)}">`
  } else {
    actorMatchPhoto.innerHTML = `<i class="fas fa-user"></i>`
  }
}

function hideActorMatchBanner() {
  if (!actorMatchBanner) return
  actorMatchBanner.hidden = true
  actorMatchBanner.classList.remove("is-loading", "has-error")
  if (actorCopyBtn) actorCopyBtn.disabled = true
  refreshActorSearchPanelVisibility()
}

function setActorSearchBusy(busy) {
  actorSearchState.busy = busy
  searchBtn.disabled = busy
  searchBtn.classList.toggle("is-loading", busy)
  searchBtn.innerHTML = busy
    ? `<i class="fas fa-circle-notch fa-spin"></i>`
    : `<i class="fas fa-arrow-right"></i>`
}


async function copyActorRecommendationList() {
  const actor = actorSearchState.selected
  if (!actor || !currentResults.length) return

  const lines = currentResults.map((item, index) => {
    const year = item.display_year || item.release_year || ""
    const type = item.media_type === "series" ? "Series" : "Movie"
    return `${index + 1}. ${item.title}${year ? ` (${year})` : ""} — ${type}`
  })
  const text = `${actor.name} — ${currentResults.length} title${currentResults.length === 1 ? "" : "s"} in my collection\n\n${lines.join("\n")}`

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }
    showToast(`Copied ${currentResults.length} ${actor.name} title${currentResults.length === 1 ? "" : "s"}`, "success")
  } catch (error) {
    showToast("Could not copy the recommendation list", "error")
  }
}

function clearActorSearch() {
  actorSearchState.requestSerial += 1
  actorSearchState.selected = null
  window.clearTimeout(actorSearchState.debounceTimer)
  searchInput.value = ""
  hideActorSuggestions()
  hideActorMatchBanner()
  searchMedia()
  searchInput.focus()
}
window.clearActorSearch = clearActorSearch

function clearCollectionSearch() {
  searchInput.value = ""
  actorSearchState.selected = null
  hideActorSuggestions()
  hideActorMatchBanner()
  searchMedia()
  searchInput.focus()
}
window.clearCollectionSearch = clearCollectionSearch

function renderCurrentTableRows() {
  if (!resultsBody) return
  resultsBody.innerHTML = ""
  if (currentGridMode !== "list") return

  const fragment = document.createDocumentFragment()
  currentResults.forEach((item, index) => {
    const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0
    const row = document.createElement("tr")
    row.dataset.index = index
    row.innerHTML = `
      <td><input type="checkbox" class="chk" onclick="toggleRowSelection(this)"></td>
      <td>${item.order_number}</td>
      <td title="${escapeHtml(item.title)}">
        <span class="table-title-main">${escapeHtml(item.title)}</span>
        ${item._actorMatch ? `<span class="table-actor-role"><i class="fas fa-masks-theater"></i> ${escapeHtml(item._actorMatch.character || "Cast member")}</span>` : ""}
      </td>
      <td>${escapeHtml(item.genre)}</td>
      <td>${escapeHtml(item.display_year)}</td>
      <td>${rating.toFixed(1)}</td>
      <td>${escapeHtml(item.media_type)}</td>
    `
    fragment.appendChild(row)
  })
  resultsBody.appendChild(fragment)
}

function updateResultsTable(results) {
  currentResults = results

  // ── Table rows ──
  // Avoid creating hundreds of hidden rows while Grid View is active.
  renderCurrentTableRows()

  // Status
  if (statusLabel) {
    const directionCopy = getSortDirectionCopy()
    const actor = searchBySelect.value === "actor" ? actorSearchState.selected : null
    statusLabel.textContent = results.length > 0
      ? actor
        ? `${results.length} title${results.length !== 1 ? "s" : ""} featuring ${actor.name} · ${getSortFieldLabel()}, ${directionCopy.long}`
        : `${results.length} title${results.length !== 1 ? "s" : ""} · ${getSortFieldLabel()}, ${directionCopy.long}`
      : actor
        ? `No titles featuring ${actor.name} in your vault`
        : "No results found"
  }

  // ── Card grid ──
  updateCardGrid(results)

  // ── Stats ──
  updateStats(results)

  // ── Empty state ──
  const empty = document.getElementById("empty-state")
  if (empty) {
    empty.style.display = results.length === 0 ? "flex" : "none"
    updateEmptyStateCopy(results)
  }
}

function updateEmptyStateCopy(results) {
  if (results.length) return

  const title = document.getElementById("empty-title")
  const copy = document.getElementById("empty-copy")
  const action = document.getElementById("empty-action")
  const actionLabel = document.getElementById("empty-action-label")
  if (!title || !copy || !action || !actionLabel) return

  const query = searchInput.value.trim()
  const actor = searchBySelect.value === "actor" ? actorSearchState.selected : null

  if (actor) {
    title.textContent = `No ${actor.name} titles yet`
    copy.textContent = `This performer has no matching movie or series in your current collection.`
    action.setAttribute("onclick", "clearActorSearch()")
    action.querySelector("i").className = "fas fa-rotate-left"
    actionLabel.textContent = "Back to Full Collection"
    return
  }

  if (query) {
    title.textContent = "No matching titles"
    copy.textContent = "Try another phrase or clear the search to see your complete vault."
    action.setAttribute("onclick", "clearCollectionSearch()")
    action.querySelector("i").className = "fas fa-xmark"
    actionLabel.textContent = "Clear Search"
    return
  }

  title.textContent = "Your vault is empty"
  copy.textContent = "Add your first movie or series to get started."
  action.setAttribute("onclick", "switchView('add')")
  action.querySelector("i").className = "fas fa-plus"
  actionLabel.textContent = "Add Something"
}

// ════════════════════════════════════════════════
//  CARD GRID
// ════════════════════════════════════════════════

// ── Progressive card rendering state ──
let _cardPool = []
let _cardRendered = 0
let _cardObserver = null
const CARD_BATCH = 28

function buildMediaCard(item, index) {
  const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0
  const ratingColor = rating >= 8 ? "#4caf50" : rating >= 6 ? "#d4a843" : "#e53935"
  const displayYear = String(item.release_year || item.display_year || "—")
  const hasPoster = item.poster_url && item.poster_url.startsWith("http")
  const typeLabel = item.media_type === "movie" ? "🎬 Movie" : "📺 Series"

  const card = document.createElement("div")
  card.className = "media-card"
  card.dataset.index = index
  card.style.setProperty("--card-i", index % 12)

  const statusDotMap = {
    watched: "#4caf50", watching: "#2196f3",
    plan_to_watch: "#ff9800", dropped: "#e53935"
  }
  const statusDot = item.watch_status
    ? `<div class="card-status-dot" style="background:${statusDotMap[item.watch_status]}" title="${item.watch_status.replace(/_/g,' ')}"></div>`
    : ""
  const favBadge = item.favorite
    ? `<div class="card-fav-badge"><i class="fas fa-heart"></i></div>` : ""

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
        <div class="card-top-badges">
          <div class="card-year-badge" title="Release year">${escapeHtml(displayYear)}</div>
          <div class="card-rating-badge" style="background:${ratingColor}22;color:${ratingColor};border-color:${ratingColor}55;">
            ★ ${rating.toFixed(1)}
          </div>
        </div>
        <div class="card-type-chip ${item.media_type}">${typeLabel}</div>
      </div>
      ${statusDot}
      ${favBadge}
    </div>
    <div class="card-body">
      <div class="card-title-text" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
      ${item._actorMatch ? `
        <div class="card-actor-role" title="${escapeHtml(item._actorMatch.actorName)} as ${escapeHtml(item._actorMatch.character || "Cast member")}">
          <i class="fas fa-masks-theater"></i>
          <span>${escapeHtml(item._actorMatch.character || "Cast member")}</span>
        </div>` : ""}
      <div class="card-meta-text">${escapeHtml(item.genre)}</div>
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
  grid.classList.remove("is-reordering")
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

  // A subtle staggered "reel shuffle" makes sorting in Grid View feel intentional.
  requestAnimationFrame(() => {
    grid.classList.add("is-reordering")
    window.setTimeout(() => grid.classList.remove("is-reordering"), 720)
  })
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
  const detailSerial = ++detailRequestSerial

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

  // ── Personal section (local data, shown immediately) ──
  const personalEl = document.getElementById("detail-personal")
  if (personalEl) {
    const statusLabels = {
      watched:       "✅ Watched",
      watching:      "▶️ Watching",
      plan_to_watch: "🔖 Plan to Watch",
      dropped:       "⛔ Dropped",
    }
    const statusClass = {
      watched: "ps-watched", watching: "ps-watching",
      plan_to_watch: "ps-plan", dropped: "ps-dropped"
    }
    const parts = []
    if (item.watch_status) {
      parts.push(`<span class="ps-badge ${statusClass[item.watch_status] || ''}">${statusLabels[item.watch_status] || item.watch_status}</span>`)
    }
    if (item.favorite) {
      parts.push(`<span class="ps-badge ps-fav"><i class="fas fa-heart"></i> Favourite</span>`)
    }
    if (item.watch_date) {
      const d = new Date(item.watch_date)
      const formatted = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      parts.push(`<span class="ps-chip"><i class="fas fa-calendar-check"></i> ${formatted}</span>`)
    }
    if (item.rewatch_count && item.rewatch_count > 0) {
      parts.push(`<span class="ps-chip"><i class="fas fa-redo"></i> Watched ${item.rewatch_count}×</span>`)
    }

    const hasMeta = parts.length > 0
    const hasNotes = item.notes && item.notes.trim()

    if (hasMeta || hasNotes) {
      personalEl.style.display = "block"
      personalEl.innerHTML = `
        <div class="ps-section">
          ${hasMeta ? `<div class="ps-meta-row">${parts.join("")}</div>` : ""}
          ${hasNotes ? `
            <div class="ps-notes-block">
              <div class="ps-notes-label"><i class="fas fa-pencil-alt"></i> My Notes</div>
              <p class="ps-notes-text">${escapeHtml(item.notes)}</p>
            </div>` : ""}
        </div>
      `
    } else {
      personalEl.style.display = "none"
    }
  }

  // Show modal
  overlay.style.display = "flex"
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", handleDetEscape)

  // Async: fetch TMDB extra info
  fetchTMDBDetails(item.title, item.release_year, item.media_type).then(tmdb => {
    if (detailSerial !== detailRequestSerial || overlay.style.display !== "flex") return
    if (!tmdb || !extraEl) return

    // Overview
    const overview = tmdb.overview || ""

    // Top cast (max 4)
    const cast = (tmdb.credits?.cast || []).slice(0, 6)
      .map(c => `
        <button type="button" class="cast-chip" onclick="openActorProfile(${Number(c.id)})"
          aria-label="Open ${escapeHtml(c.name)} profile" title="${escapeHtml(c.character ? `${c.name} as ${c.character}` : `View ${c.name} profile`)}">
          ${c.profile_path
            ? `<img src="${TMDB_IMAGE_URL + c.profile_path}" onerror="this.style.display='none'" class="cast-img" alt="">`
            : `<span class="cast-img cast-img-placeholder"><i class="fas fa-user"></i></span>`}
          <span class="cast-chip-copy">
            <strong>${escapeHtml(c.name)}</strong>
            ${c.character ? `<small>${escapeHtml(c.character)}</small>` : ""}
          </span>
          <i class="fas fa-chevron-right cast-chip-arrow"></i>
        </button>`)
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
    if (detailSerial === detailRequestSerial && extraEl) extraEl.innerHTML = ""
  })
}


function getActorProfileElement(id) {
  return document.getElementById(id)
}

function isActorProfileOpen() {
  return getActorProfileElement("actor-profile-modal")?.classList.contains("open") || false
}

async function fetchActorProfile(personId) {
  const id = Number(personId)
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid performer")
  if (_actorProfileCache.has(id)) return _actorProfileCache.get(id)

  const response = await fetch(
    `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=combined_credits,external_ids`
  )
  if (!response.ok) throw new Error("Could not load this performer right now")
  const person = await response.json()
  _actorProfileCache.set(id, person)
  return person
}

function renderActorProfileLoading() {
  getActorProfileElement("actor-profile-bg").style.backgroundImage = ""
  const portrait = getActorProfileElement("actor-profile-portrait")
  const portraitPh = getActorProfileElement("actor-profile-portrait-ph")
  portrait.hidden = true
  portrait.removeAttribute("src")
  portraitPh.hidden = false
  portraitPh.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i>`

  getActorProfileElement("actor-profile-name").textContent = "Loading profile…"
  getActorProfileElement("actor-profile-department").textContent = ""
  getActorProfileElement("actor-profile-facts").innerHTML = ""
  getActorProfileElement("actor-profile-socials").innerHTML = ""
  getActorProfileElement("actor-profile-stats").innerHTML = `
    <div class="actor-profile-stat is-loading"></div>
    <div class="actor-profile-stat is-loading"></div>
    <div class="actor-profile-stat is-loading"></div>`
  getActorProfileElement("actor-profile-biography").textContent = "Loading biography and filmography…"
  getActorProfileElement("actor-profile-biography").classList.remove("expanded")
  getActorProfileElement("actor-profile-aliases").innerHTML = ""
  getActorProfileElement("actor-filmography-grid").innerHTML = Array.from({ length: 8 }, () => `
    <div class="actor-work-card actor-work-skeleton"><span></span><span></span></div>`).join("")
  getActorProfileElement("actor-filmography-summary").textContent = "Gathering credits…"
  getActorProfileElement("actor-known-for").innerHTML = ""
  getActorProfileElement("actor-vault-summary").innerHTML = ""
  getActorProfileElement("actor-profile-error").hidden = true
  getActorProfileElement("actor-profile-content").hidden = false
  getActorProfileElement("actor-filmography-more").hidden = true
  getActorProfileElement("actor-bio-toggle").hidden = true
}

function normaliseActorCredits(person) {
  const credits = person?.combined_credits?.cast || []
  const unique = new Map()

  credits.forEach(raw => {
    if (!raw?.id || !["movie", "tv"].includes(raw.media_type)) return
    const title = (raw.title || raw.name || "").trim()
    if (!title) return

    const mediaType = raw.media_type === "tv" ? "series" : "movie"
    const date = raw.release_date || raw.first_air_date || ""
    const year = date ? String(date).slice(0, 4) : ""
    const key = `${mediaType}:${raw.id}`
    const existing = unique.get(key)
    const character = (raw.character || "").trim()

    const credit = {
      ...raw,
      _key: key,
      _mediaType: mediaType,
      _title: title,
      _date: date,
      _year: year,
      _character: character,
      _popularity: Number(raw.popularity || 0),
      _rating: Number(raw.vote_average || 0),
      _votes: Number(raw.vote_count || 0),
    }

    if (!existing) {
      unique.set(key, credit)
      return
    }

    if (character && !existing._character.includes(character)) {
      existing._character = [existing._character, character].filter(Boolean).join(" / ")
    }
    if (credit._popularity > existing._popularity) {
      unique.set(key, { ...credit, _character: existing._character || credit._character })
    }
  })

  return Array.from(unique.values()).sort((a, b) =>
    (b._popularity - a._popularity)
      || (b._votes - a._votes)
      || String(b._date).localeCompare(String(a._date))
      || a._title.localeCompare(b._title)
  )
}

function buildActorVaultLookup() {
  const collection = Array.isArray(_cache.data) ? _cache.data : []
  const byTitle = new Map()

  collection.forEach(item => {
    const title = normalizeMediaSearchTitle(item.title || "").toLowerCase()
    if (!title) return
    const type = item.media_type === "series" ? "series" : "movie"
    const key = `${type}|${title}`
    if (!byTitle.has(key)) byTitle.set(key, [])
    byTitle.get(key).push(item)
  })

  return byTitle
}

function findVaultItemForActorCredit(credit) {
  const lookup = actorProfileState.vaultLookup
  if (!lookup || !credit) return null
  const key = `${credit._mediaType}|${normalizeMediaSearchTitle(credit._title).toLowerCase()}`
  const candidates = lookup.get(key) || []
  if (!candidates.length) return null

  const creditYear = Number(credit._year || 0)
  if (!creditYear) return candidates[0]
  return candidates.find(item => Number(item.release_year || 0) === creditYear)
    || candidates.find(item => Math.abs(Number(item.release_year || 0) - creditYear) <= 1)
    || null
}

function formatActorDate(value) {
  if (!value) return ""
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
}

function calculateActorAge(birthday, deathday = null) {
  if (!birthday) return null
  const birth = new Date(`${birthday}T00:00:00Z`)
  const end = deathday ? new Date(`${deathday}T00:00:00Z`) : new Date()
  if (Number.isNaN(birth.getTime()) || Number.isNaN(end.getTime())) return null
  let age = end.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday = end.getUTCMonth() < birth.getUTCMonth()
    || (end.getUTCMonth() === birth.getUTCMonth() && end.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

function getActorSocialLinks(person) {
  const ids = person.external_ids || {}
  const links = []
  if (ids.imdb_id) links.push({ label: "IMDb", icon: "fa-imdb", brand: true, url: `https://www.imdb.com/name/${ids.imdb_id}` })
  if (ids.instagram_id) links.push({ label: "Instagram", icon: "fa-instagram", brand: true, url: `https://www.instagram.com/${ids.instagram_id}` })
  if (ids.facebook_id) links.push({ label: "Facebook", icon: "fa-facebook-f", brand: true, url: `https://www.facebook.com/${ids.facebook_id}` })
  if (ids.twitter_id) links.push({ label: "X", icon: "fa-x-twitter", brand: true, url: `https://x.com/${ids.twitter_id}` })
  if (person.homepage && /^https?:\/\//i.test(person.homepage)) {
    links.push({ label: "Website", icon: "fa-globe", brand: false, url: person.homepage })
  }
  return links
}

function renderActorProfile(person) {
  actorProfileState.person = person
  actorProfileState.credits = normaliseActorCredits(person)
  actorProfileState.filter = "all"
  actorProfileState.visibleLimit = 24
  actorProfileState.vaultLookup = buildActorVaultLookup()

  const portrait = getActorProfileElement("actor-profile-portrait")
  const portraitPh = getActorProfileElement("actor-profile-portrait-ph")
  const profileUrl = person.profile_path ? `${TMDB_IMAGE_URL}${person.profile_path}` : ""
  if (profileUrl) {
    portrait.src = profileUrl
    portrait.alt = person.name || "Performer"
    portrait.hidden = false
    portraitPh.hidden = true
    getActorProfileElement("actor-profile-bg").style.backgroundImage = `url(${profileUrl})`
  } else {
    portrait.hidden = true
    portraitPh.hidden = false
    portraitPh.innerHTML = `<i class="fas fa-user"></i>`
    getActorProfileElement("actor-profile-bg").style.backgroundImage = ""
  }

  getActorProfileElement("actor-profile-name").textContent = person.name || "Performer"
  getActorProfileElement("actor-profile-department").textContent = person.known_for_department || "Acting"

  const age = calculateActorAge(person.birthday, person.deathday)
  const facts = []
  if (person.birthday) {
    facts.push(`<span><i class="fas fa-cake-candles"></i>${escapeHtml(formatActorDate(person.birthday))}${age !== null ? ` · ${age} ${person.deathday ? "years" : "years old"}` : ""}</span>`)
  }
  if (person.deathday) facts.push(`<span><i class="fas fa-ribbon"></i>Died ${escapeHtml(formatActorDate(person.deathday))}</span>`)
  if (person.place_of_birth) facts.push(`<span><i class="fas fa-location-dot"></i>${escapeHtml(person.place_of_birth)}</span>`)
  getActorProfileElement("actor-profile-facts").innerHTML = facts.join("")

  const socialLinks = getActorSocialLinks(person)
  getActorProfileElement("actor-profile-socials").innerHTML = socialLinks.map(link => `
    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(link.label)}">
      <i class="${link.brand ? "fab" : "fas"} ${link.icon}"></i><span>${escapeHtml(link.label)}</span>
    </a>`).join("")

  const movieCount = actorProfileState.credits.filter(c => c._mediaType === "movie").length
  const seriesCount = actorProfileState.credits.filter(c => c._mediaType === "series").length
  const vaultCount = actorProfileState.credits.filter(findVaultItemForActorCredit).length
  getActorProfileElement("actor-profile-stats").innerHTML = `
    <div class="actor-profile-stat"><strong>${actorProfileState.credits.length}</strong><span>Credits</span></div>
    <div class="actor-profile-stat"><strong>${movieCount}</strong><span>Movies</span></div>
    <div class="actor-profile-stat"><strong>${seriesCount}</strong><span>Series</span></div>`

  const biography = (person.biography || "").trim()
  const bioEl = getActorProfileElement("actor-profile-biography")
  bioEl.textContent = biography || "No biography is currently available for this performer."
  bioEl.classList.remove("expanded")
  const bioToggle = getActorProfileElement("actor-bio-toggle")
  bioToggle.hidden = biography.length < 430
  bioToggle.textContent = "Read more"

  const aliases = (person.also_known_as || []).filter(Boolean).slice(0, 8)
  getActorProfileElement("actor-profile-aliases").innerHTML = aliases.length
    ? `<span class="actor-aliases-label">Also known as</span>${aliases.map(name => `<span>${escapeHtml(name)}</span>`).join("")}`
    : ""

  const highlights = actorProfileState.credits.slice(0, 5)
  getActorProfileElement("actor-known-for").innerHTML = highlights.length
    ? highlights.map(credit => renderActorHighlight(credit)).join("")
    : `<p class="actor-profile-empty">No highlighted credits available.</p>`

  getActorProfileElement("actor-vault-summary").innerHTML = vaultCount
    ? `<strong>${vaultCount}</strong><span>${vaultCount === 1 ? "title is" : "titles are"} already in your collection.</span>`
    : `<strong>0</strong><span>No matching titles in your collection yet.</span>`
  getActorProfileElement("actor-vault-panel").classList.toggle("has-vault-items", vaultCount > 0)

  document.querySelectorAll(".actor-filmography-filter").forEach(button => {
    button.classList.toggle("active", button.dataset.actorFilter === "all")
  })
  renderActorFilmography()
}

function renderActorHighlight(credit) {
  const poster = credit.poster_path
    ? `<img src="${TMDB_IMAGE_URL}${credit.poster_path}" alt="" loading="lazy">`
    : `<span class="actor-highlight-ph"><i class="fas ${credit._mediaType === "series" ? "fa-tv" : "fa-film"}"></i></span>`
  return `
    <button type="button" class="actor-highlight" data-actor-work-key="${escapeHtml(credit._key)}">
      ${poster}
      <span><strong>${escapeHtml(credit._title)}</strong><small>${escapeHtml(credit._year || credit._mediaType)}</small></span>
      <i class="fas fa-chevron-right"></i>
    </button>`
}

function renderActorFilmography() {
  const grid = getActorProfileElement("actor-filmography-grid")
  if (!grid) return

  const filtered = actorProfileState.credits.filter(credit =>
    actorProfileState.filter === "all" || credit._mediaType === actorProfileState.filter
  )
  const visible = filtered.slice(0, actorProfileState.visibleLimit)

  getActorProfileElement("actor-filmography-summary").textContent = `${filtered.length} ${actorProfileState.filter === "all" ? "movie and series" : actorProfileState.filter === "movie" ? "movie" : "series"} credit${filtered.length === 1 ? "" : "s"}`

  if (!visible.length) {
    grid.innerHTML = `<div class="actor-profile-empty actor-filmography-empty"><i class="fas fa-film"></i>No credits in this category.</div>`
  } else {
    grid.innerHTML = visible.map(credit => {
      const vaultItem = findVaultItemForActorCredit(credit)
      const poster = credit.poster_path
        ? `<img src="${TMDB_IMAGE_URL}${credit.poster_path}" alt="${escapeHtml(credit._title)}" loading="lazy">`
        : `<span class="actor-work-poster-ph"><i class="fas ${credit._mediaType === "series" ? "fa-tv" : "fa-film"}"></i></span>`
      const character = credit._character ? escapeHtml(credit._character) : "Cast"
      const rating = credit._rating > 0 ? `<span><i class="fas fa-star"></i>${credit._rating.toFixed(1)}</span>` : ""
      return `
        <button type="button" class="actor-work-card ${vaultItem ? "in-vault" : ""}" data-actor-work-key="${escapeHtml(credit._key)}" title="${vaultItem ? "Open this title from your collection" : "Open on TMDB"}">
          <span class="actor-work-poster">
            ${poster}
            <span class="actor-work-type ${credit._mediaType}">${credit._mediaType === "series" ? "Series" : "Movie"}</span>
            ${vaultItem ? `<span class="actor-work-vault"><i class="fas fa-vault"></i> In vault</span>` : ""}
          </span>
          <span class="actor-work-body">
            <strong>${escapeHtml(credit._title)}</strong>
            <small>${escapeHtml(credit._year || "Year unknown")} · ${character}</small>
            <span class="actor-work-meta">${rating}<span><i class="fas fa-arrow-up-right-from-square"></i>${vaultItem ? "View title" : "TMDB"}</span></span>
          </span>
        </button>`
    }).join("")
  }

  const moreButton = getActorProfileElement("actor-filmography-more")
  moreButton.hidden = visible.length >= filtered.length
  if (!moreButton.hidden) {
    moreButton.innerHTML = `<i class="fas fa-plus"></i> Show ${Math.min(24, filtered.length - visible.length)} more credits`
  }
}

function toggleActorBiography() {
  const bio = getActorProfileElement("actor-profile-biography")
  const button = getActorProfileElement("actor-bio-toggle")
  if (!bio || !button) return
  const expanded = bio.classList.toggle("expanded")
  button.textContent = expanded ? "Show less" : "Read more"
}

function handleActorProfileClick(event) {
  const modal = getActorProfileElement("actor-profile-modal")
  if (event.target === modal) {
    closeActorProfile()
    return
  }

  const filterButton = event.target.closest("[data-actor-filter]")
  if (filterButton) {
    actorProfileState.filter = filterButton.dataset.actorFilter
    actorProfileState.visibleLimit = 24
    document.querySelectorAll(".actor-filmography-filter").forEach(button => {
      button.classList.toggle("active", button === filterButton)
    })
    renderActorFilmography()
    return
  }

  const workButton = event.target.closest("[data-actor-work-key]")
  if (workButton) openActorWork(workButton.dataset.actorWorkKey)
}

function openActorWork(key) {
  const credit = actorProfileState.credits.find(item => item._key === key)
  if (!credit) return

  const vaultItem = findVaultItemForActorCredit(credit)
  if (vaultItem) {
    closeActorProfile()
    const prepared = prepareDisplayResults([{ ...vaultItem }])[0]
    requestAnimationFrame(() => showDetailModal(prepared))
    return
  }

  const tmdbType = credit._mediaType === "series" ? "tv" : "movie"
  window.open(`https://www.themoviedb.org/${tmdbType}/${credit.id}`, "_blank", "noopener,noreferrer")
}

async function openActorProfile(personId) {
  const modal = getActorProfileElement("actor-profile-modal")
  if (!modal) return

  const serial = ++actorProfileState.requestSerial
  actorProfileState.person = null
  actorProfileState.credits = []
  actorProfileState.filter = "all"
  actorProfileState.visibleLimit = 24
  renderActorProfileLoading()

  modal.classList.add("open")
  modal.setAttribute("aria-hidden", "false")
  document.body.style.overflow = "hidden"

  try {
    const person = await fetchActorProfile(personId)
    if (serial !== actorProfileState.requestSerial || !isActorProfileOpen()) return
    renderActorProfile(person)
  } catch (error) {
    if (serial !== actorProfileState.requestSerial) return
    const errorEl = getActorProfileElement("actor-profile-error")
    errorEl.hidden = false
    errorEl.innerHTML = `<i class="fas fa-triangle-exclamation"></i><div><strong>Profile unavailable</strong><span>${escapeHtml(error.message || "Please try again")}</span></div>`
    getActorProfileElement("actor-profile-content").hidden = true
    getActorProfileElement("actor-profile-name").textContent = "Could not load profile"
    getActorProfileElement("actor-profile-stats").innerHTML = ""
  }
}
window.openActorProfile = openActorProfile

function closeActorProfile() {
  const modal = getActorProfileElement("actor-profile-modal")
  if (!modal) return
  actorProfileState.requestSerial += 1
  modal.classList.remove("open")
  modal.setAttribute("aria-hidden", "true")
  const detailModal = document.getElementById("detail-modal")
  document.body.style.overflow = detailModal?.style.display === "flex" ? "hidden" : ""
}
window.closeActorProfile = closeActorProfile

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
    if (isActorProfileOpen()) {
      closeActorProfile()
      return
    }
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
  detailRequestSerial += 1
  closeActorProfile()
  overlay.style.display = "none"
  document.body.style.overflow = ""
  document.removeEventListener("keydown", handleDetEscape)
  closeTrailerLightbox()
}
window.closeDetailModal = closeDetailModal

function editItemDirectly(item) {
  openEditModalForItem(item)
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
    // Always start Add New with Personal Notes collapsed.
    addView.querySelector(".personal-section")?.classList.remove("personal-section--open")
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
    if (resultsBody) resultsBody.innerHTML = ""
  } else {
    grid.style.display = "none"
    tbl.style.display  = "block"
    gridBtn.classList.remove("active")
    listBtn.classList.add("active")
    renderCurrentTableRows()
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
      // Personal fields (optional)
      notes:         notesInput?.value.trim()        || null,
      watch_status:  watchStatusSelect?.value        || null,
      watch_date:    watchDateInput?.value           || null,
      favorite:      favoriteChk?.checked            || false,
      rewatch_count: parseInt(rewatchCountInput?.value) || 0,
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

    const savedItem = await saveMedia(mediaType, newMedia)
    if (savedItem) {
      applyLocalMediaInsert(savedItem)
      // Redraws the hidden Collection view from memory; no second backend request.
      await searchMedia({ showSkeleton: false })
      showToast(`"${title}" added to your vault! 🎬`, "success")
      clearForm()
      // Stay on Add New so another title can be added immediately.
    } else {
      showToast("Failed to add media", "error")
    }
  } catch(error) {
    showToast("Error adding media: " + error.message, "error")
  }
}

function clearForm() {
  addForm.reset()
  document.querySelector("#view-add .personal-section")?.classList.remove("personal-section--open")
  posterImage.src = ""
  posterImage.style.display = "none"
  posterPlaceholder.style.display = "flex"
  updateEndYearVisibility()
  titleInput.focus()
  // Reset personal fields
  if (watchStatusSelect)  watchStatusSelect.value = ""
  if (watchDateInput)     watchDateInput.value    = ""
  if (rewatchCountInput)  rewatchCountInput.value = ""
  if (favoriteChk)        favoriteChk.checked     = false
  if (notesInput)         notesInput.value        = ""
  showToast("Form cleared", "info")
}

// ════════════════════════════════════════════════
//  AUTO-FILL
// ════════════════════════════════════════════════

// Make copied/file-style titles TMDB-friendly.
// Example: "How.To.Train.Your.Dragon" → "How To Train Your Dragon"
function normalizeMediaSearchTitle(value) {
  return String(value || "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchMediaInfo() {
  const rawTitle = titleInput.value.trim()
  const title = normalizeMediaSearchTitle(rawTitle)
  if (!title) { showToast("Please enter a title to search", "error"); return }

  // Show the cleaned title immediately, then replace it with TMDB's official title.
  if (title !== rawTitle) titleInput.value = title

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
    const cleanTitle = normalizeMediaSearchTitle(searchTitle)
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=en-US`
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
    const cleanTitle = normalizeMediaSearchTitle(searchTitle)
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=en-US`
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

function getSelectedMediaItems() {
  const selector = currentGridMode === "grid"
    ? "#card-grid .card-chk:checked"
    : "#results-body input[type='checkbox']:checked"

  return Array.from(document.querySelectorAll(selector))
    .map(checkbox => {
      const container = currentGridMode === "grid"
        ? checkbox.closest(".media-card")
        : checkbox.closest("tr")
      const index = Number(container?.dataset.index)
      return Number.isInteger(index) ? currentResults[index] : null
    })
    .filter(Boolean)
}

function openEditModalForItem(mediaItem) {
  if (!mediaItem) {
    showToast("Could not find the selected item", "error")
    return
  }

  const orderNumber = Number(mediaItem.order_number)
  const mediaType = mediaItem.media_type

  editOrderInput.value       = orderNumber
  editTitleInput.value       = mediaItem.title || ""
  editGenreInput.value       = mediaItem.genre || ""
  editReleaseYearInput.value = mediaItem.release_year || ""
  editRatingInput.value      = mediaItem.rating ?? ""
  editMediaTypeInput.value   = mediaType

  if (mediaType === "series") {
    editEndYearGroup.style.display = "flex"
    editEndYearInput.value = mediaItem.end_year || mediaItem.release_year || ""
  } else {
    editEndYearGroup.style.display = "none"
    editEndYearInput.value = ""
  }

  if (mediaItem.poster_url) {
    editPosterImage.src = mediaItem.poster_url
    editPosterImage.style.display = "block"
    editPosterPlaceholder.style.display = "none"
  } else {
    editPosterImage.removeAttribute("src")
    editPosterImage.style.display = "none"
    editPosterPlaceholder.style.display = "flex"
  }

  if (editWatchStatusSelect) editWatchStatusSelect.value = mediaItem.watch_status || ""
  if (editWatchDateInput) editWatchDateInput.value = mediaItem.watch_date
    ? new Date(mediaItem.watch_date).toISOString().split("T")[0]
    : ""
  if (editRewatchCountInput) editRewatchCountInput.value = mediaItem.rewatch_count ?? 0
  if (editFavoriteChk) editFavoriteChk.checked = Boolean(mediaItem.favorite)
  if (editNotesInput) editNotesInput.value = mediaItem.notes || ""

  const personalSection = editModal?.querySelector(".personal-section")
  const hasPersonal = Boolean(
    mediaItem.watch_status || mediaItem.notes || mediaItem.favorite || mediaItem.watch_date
  )
  personalSection?.classList.toggle("personal-section--open", hasPersonal)

  editModal.style.display = "flex"
  editModal.style.alignItems = "center"
  editModal.style.justifyContent = "center"
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", handleEditEscape)
}

async function editSelected() {
  try {
    const selectedItems = getSelectedMediaItems()
    if (selectedItems.length !== 1) {
      showToast("Please select exactly one item to edit", "info")
      return
    }

    // Open instantly from the already-loaded collection; no backend fetch is needed.
    openEditModalForItem(selectedItems[0])
  } catch(error) {
    showToast("Error editing item: " + error.message, "error")
  }
}

function handleEditEscape(e) {
  if (e.key === "Escape") closeModal()
}

function closeModal() {
  editModal.style.display = "none"
  editModal?.querySelector(".personal-section")?.classList.remove("personal-section--open")
  document.body.style.overflow = ""
  document.removeEventListener("keydown", handleEditEscape)
}

async function fetchEditInfo() {
  const rawTitle = editTitleInput.value.trim()
  const title = normalizeMediaSearchTitle(rawTitle)
  if (!title) { showToast("Please enter a title to search", "error"); return }

  if (title !== rawTitle) editTitleInput.value = title

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

  const saveButton = editForm.querySelector('button[type="submit"]')
  const originalButtonHtml = saveButton?.innerHTML || ""

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
      notes:         editNotesInput?.value.trim()        || null,
      watch_status:  editWatchStatusSelect?.value        || null,
      watch_date:    editWatchDateInput?.value           || null,
      favorite:      editFavoriteChk?.checked            || false,
      rewatch_count: parseInt(editRewatchCountInput?.value) || 0,
    }

    if (mediaType === "series") {
      const endYear = parseInt(editEndYearInput.value) || releaseYear
      if (endYear < releaseYear) { showToast("End year must be ≥ release year", "error"); return }
      updatedMedia.end_year = endYear
    }

    if (saveButton) {
      saveButton.disabled = true
      saveButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving…'
    }

    const serverItem = await updateMedia(mediaType, orderNumber, updatedMedia)
    if (!serverItem) {
      showToast("Failed to update media", "error")
      return
    }

    const updatedItem = applyLocalMediaUpdate(
      mediaType,
      orderNumber,
      updatedMedia,
      serverItem
    )

    closeModal()
    await renderAfterLocalMediaUpdate(mediaType, orderNumber, updatedItem)
    showToast(`"${title}" updated successfully!`, "success")
  } catch(error) {
    showToast("Error updating media: " + error.message, "error")
  } finally {
    if (saveButton) {
      saveButton.disabled = false
      saveButton.innerHTML = originalButtonHtml
    }
  }
}

// ════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════

async function deleteSelected() {
  const selectedItems = getSelectedMediaItems()
  if (selectedItems.length === 0) {
    showToast("Please select at least one item to delete", "info")
    return
  }
  if (!confirm(`Delete ${selectedItems.length} item(s) from your vault?`)) return

  const targets = selectedItems.map(item => ({
    orderNumber: Number(item.order_number),
    mediaType: item.media_type,
  }))

  try {
    showLoading()
    const outcomes = await Promise.all(
      targets.map(target => deleteMedia(target.mediaType, target.orderNumber))
    )
    hideLoading()

    targets.forEach((target, index) => {
      if (outcomes[index]) applyLocalMediaDelete(target.mediaType, target.orderNumber)
    })

    await searchMedia({ showSkeleton: false })
    if (outcomes.every(Boolean)) {
      showToast("Deleted from vault successfully!", "success")
    } else {
      showToast("Some items could not be deleted", "error")
    }
  } catch(error) {
    hideLoading()
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
  clearCollectionSnapshot()
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
  clearCollectionSnapshot()
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