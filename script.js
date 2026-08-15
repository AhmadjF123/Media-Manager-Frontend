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
const SOCIAL_BASE_URL = "https://media-manager-backend-wfeb.onrender.com/api/social"
const RECOMMENDATIONS_BASE_URL = "https://media-manager-backend-wfeb.onrender.com/api/recommendations"

// ── Auth State ──
let currentUser = null   // null = guest, otherwise authenticated public profile + token

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
const tmdbIdInput       = document.getElementById("tmdb-id")
const titleInput        = document.getElementById("title")
const genreInput        = document.getElementById("genre")
const releaseYearInput  = document.getElementById("release-year")
const endYearInput      = document.getElementById("end-year")
const endYearGroup      = document.getElementById("end-year-group")
const seasonsInput      = document.getElementById("number-of-seasons")
const seasonsGroup      = document.getElementById("seasons-group")
const watchedSeasonsInput = document.getElementById("watched-seasons")
const watchedSeasonsGroup = document.getElementById("watched-seasons-group")
const ratingInput       = document.getElementById("rating")
const mediaTypeSelect   = document.getElementById("media-type")
const autoFillBtn       = document.getElementById("auto-fill-btn")
const posterImage       = document.getElementById("poster-image")
const posterPlaceholder = document.getElementById("poster-placeholder")
const posterFileInput   = document.getElementById("poster-file-input")
const choosePosterBtn   = document.getElementById("choose-poster-btn")
const removePosterBtn   = document.getElementById("remove-poster-btn")
const editModal         = document.getElementById("edit-modal")
const closeModalBtn     = document.querySelector(".close")
const editForm          = document.getElementById("edit-form")
const editIdInput       = document.getElementById("edit-id")
const editOrderInput    = document.getElementById("edit-order")
const editTmdbIdInput   = document.getElementById("edit-tmdb-id")
const editTitleInput    = document.getElementById("edit-title")
const editGenreInput    = document.getElementById("edit-genre")
const editReleaseYearInput = document.getElementById("edit-release-year")
const editEndYearInput  = document.getElementById("edit-end-year")
const editEndYearGroup  = document.getElementById("edit-end-year-group")
const editSeasonsInput  = document.getElementById("edit-number-of-seasons")
const editSeasonsGroup  = document.getElementById("edit-seasons-group")
const editWatchedSeasonsInput = document.getElementById("edit-watched-seasons")
const editWatchedSeasonsGroup = document.getElementById("edit-watched-seasons-group")
const editRatingInput   = document.getElementById("edit-rating")
const editMediaTypeInput = document.getElementById("edit-media-type")
const editAutoFillBtn   = document.getElementById("edit-auto-fill-btn")
const editPosterImage   = document.getElementById("edit-poster-image")
const editPosterPlaceholder = document.getElementById("edit-poster-placeholder")
const editPosterFileInput = document.getElementById("edit-poster-file-input")
const editChoosePosterBtn = document.getElementById("edit-choose-poster-btn")
const editRemovePosterBtn = document.getElementById("edit-remove-poster-btn")
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
let _lastResultsRenderSignature = null

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
  vaultFilter: "all",
  requestSerial: 0,
  imageRequestSerial: 0,
  vaultLookup: null,
}
const _actorProfileCache = new Map()
const _actorProfilePathHints = new Map()

// ── Sorting state ──
const SORT_STORAGE_KEY = "cinema_sort_preference"
const SORT_FIELDS = new Set(["added", "title", "release_year", "rating"])
const titleCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true })
let sortState = loadSortState()

// ── Cache layer (avoids redundant network calls) ──
const _cache = { data: null, ts: 0, TTL: 60_000 }   // 60s in-memory cache
const COLLECTION_SNAPSHOT_PREFIX = "cinema_collection_snapshot_v2"
const COLLECTION_SNAPSHOT_MAX_AGE = 7 * 24 * 60 * 60 * 1000
const RECOMMENDATION_SNAPSHOT_PREFIX = "cinema_recommendations_snapshot_v4"
const RECOMMENDATION_SNAPSHOT_MAX_AGE = 6 * 60 * 60 * 1000
const recommendationState = {
  data: null,
  loadedAt: 0,
  loading: false,
  requestSerial: 0,
  renderSignature: "",
  itemMap: new Map(),
  mediaFilter: "all",
  sortMode: "priority",
  searchQuery: "",
  searchData: null,
  searchLoading: false,
  searchRequestSerial: 0,
  searchDebounceTimer: null,
  searchCache: new Map(),
}

function _cacheGet()          { return (Date.now() - _cache.ts < _cache.TTL) ? _cache.data : null }
function _cacheSet(data)      { _cache.data = data; _cache.ts = Date.now() }
function _cacheInvalidate() {
  _cache.ts = 0
  _actorVaultCandidatesCache.clear()
  invalidateRecommendationClientCache()
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

function getRecommendationSnapshotKey() {
  const username = currentUser?.username || localStorage.getItem("cinema_username") || "guest"
  return `${RECOMMENDATION_SNAPSHOT_PREFIX}:${String(username).toLowerCase()}`
}

function saveRecommendationSnapshot(data) {
  if (!currentUser || !data) return
  try {
    localStorage.setItem(getRecommendationSnapshotKey(), JSON.stringify({
      savedAt: Date.now(),
      data,
    }))
  } catch (_) {}
}

function readRecommendationSnapshot() {
  if (!currentUser) return null
  try {
    const parsed = JSON.parse(localStorage.getItem(getRecommendationSnapshotKey()) || "null")
    if (!parsed?.data) return null
    if (Date.now() - Number(parsed.savedAt || 0) > RECOMMENDATION_SNAPSHOT_MAX_AGE) return null
    return parsed.data
  } catch (_) {
    return null
  }
}

function clearRecommendationSnapshot() {
  try { localStorage.removeItem(getRecommendationSnapshotKey()) } catch (_) {}
}

function invalidateRecommendationClientCache() {
  recommendationState.data = null
  recommendationState.loadedAt = 0
  recommendationState.renderSignature = ""
  clearRecommendationSnapshot()
}


function normaliseMediaItem(item = {}) {
  return {
    ...item,
    order_number: parseInt(item.order_number) || 0,
    release_year: parseInt(item.release_year) || 0,
    end_year: parseInt(item.end_year) || 0,
    number_of_seasons: parseInt(item.number_of_seasons) || 0,
    watched_seasons: item.watched_seasons === null || item.watched_seasons === undefined || item.watched_seasons === ""
      ? null
      : Math.max(0, parseInt(item.watched_seasons) || 0),
    tmdb_id: parseInt(item.tmdb_id) || null,
    rating: item.rating === null ? null : (parseFloat(item.rating) || 0),
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
  invalidateRecommendationClientCache()
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
  invalidateRecommendationClientCache()
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
  invalidateRecommendationClientCache()
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
  _cardObserver = null
  _cardRenderGeneration += 1
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

  const normalised = snapshot.map(normaliseMediaItem)

  _cacheSet(normalised)
  document.body.classList.add("instant-hydrate")
  updateResultsTable(prepareDisplayResults(normalised), { force: true, animate: false })
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove("instant-hydrate")
  }))
  return true
}


choosePosterBtn?.addEventListener("click", () => posterFileInput?.click())
posterFileInput?.addEventListener("change", () => handleManualPosterSelection(posterFileInput, posterImage, posterPlaceholder, removePosterBtn))
removePosterBtn?.addEventListener("click", () => removeManualPoster(posterFileInput, posterImage, posterPlaceholder, removePosterBtn))
editChoosePosterBtn?.addEventListener("click", () => editPosterFileInput?.click())
editPosterFileInput?.addEventListener("change", () => handleManualPosterSelection(editPosterFileInput, editPosterImage, editPosterPlaceholder, editRemovePosterBtn))
editRemovePosterBtn?.addEventListener("click", () => removeManualPoster(editPosterFileInput, editPosterImage, editPosterPlaceholder, editRemovePosterBtn))

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
  const initialCollectionLoad = searchMedia({
    forceRefresh: true,
    showSkeleton: !hydrated,
    animate: false,
  })
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
  mediaTypeSelect.addEventListener("change", () => {
    updateEndYearVisibility()
    syncAddSeriesProgressFromStatus()
  })
  watchStatusSelect?.addEventListener("change", syncAddSeriesProgressFromStatus)
  editWatchStatusSelect?.addEventListener("change", () => {
    if (editMediaTypeInput.value === "series" && editWatchStatusSelect.value === "watched" && editWatchedSeasonsInput?.value === "") {
      editWatchedSeasonsInput.value = String(Math.max(0, parseInt(editSeasonsInput?.value) || 0))
    }
  })
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

  initSocialUI()
  initRecommendationsUI()

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
  const isSeries = mediaTypeSelect.value === "series"
  if (endYearGroup) endYearGroup.style.display = isSeries ? "flex" : "none"
  if (seasonsGroup) seasonsGroup.style.display = isSeries ? "flex" : "none"
  if (watchedSeasonsGroup) watchedSeasonsGroup.hidden = !isSeries
  if (isSeries && seasonsInput && !seasonsInput.value) seasonsInput.value = "1"
  if (!isSeries && seasonsInput) seasonsInput.value = ""
  if (!isSeries && watchedSeasonsInput) watchedSeasonsInput.value = ""
}

function syncAddSeriesProgressFromStatus() {
  if (mediaTypeSelect.value !== "series" || !watchedSeasonsInput) return
  if (watchStatusSelect?.value === "watched" && watchedSeasonsInput.value === "") {
    watchedSeasonsInput.value = String(Math.max(0, parseInt(seasonsInput?.value) || 0))
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
  const animate = options?.animate !== false
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
    updateResultsTable(results, { animate })

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
    const hasSharedRating = item.rating !== null && item.rating !== undefined && item.rating !== ""
  const rating = hasSharedRating ? (typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0) : 0
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

function getResultsRenderSignature(results) {
  // Only fields that can change the visible collection UI belong here.
  // This lets the fresh network response update currentResults without tearing down
  // and rebuilding hundreds of identical cards already restored from local storage.
  return results.map(item => [
    item.media_type,
    Number(item.order_number) || 0,
    item.title || "",
    item.genre || "",
    Number(item.release_year) || 0,
    Number(item.end_year) || 0,
    Number(item.number_of_seasons) || 0,
    Number(item.rating) || 0,
    item.poster_url || "",
    item.watch_status || "",
    item.favorite ? 1 : 0,
    item._actorMatch?.character || "",
  ].join("")).join("")
}

function updateResultsTable(results, options = {}) {
  currentResults = results
  _cardPool = results

  const signature = getResultsRenderSignature(results)
  const unchanged = !options.force && signature === _lastResultsRenderSignature

  // The snapshot and the server often contain the exact same collection.
  // Keep the existing DOM in that case so cards do not visibly reload several times.
  if (unchanged) {
    if (currentGridMode === "list" && resultsBody && !resultsBody.children.length) {
      renderCurrentTableRows()
    }
    refreshStatusAndStats()
    const empty = document.getElementById("empty-state")
    if (empty) {
      empty.style.display = results.length === 0 ? "flex" : "none"
      updateEmptyStateCopy(results)
    }
    return false
  }

  _lastResultsRenderSignature = signature

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
  updateCardGrid(results, { animate: options.animate !== false })

  // ── Stats ──
  updateStats(results)

  // ── Empty state ──
  const empty = document.getElementById("empty-state")
  if (empty) {
    empty.style.display = results.length === 0 ? "flex" : "none"
    updateEmptyStateCopy(results)
  }
  return true
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
let _cardRenderGeneration = 0
const CARD_BATCH = 28

function buildMediaCard(item, index) {
  const rating = typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0
  const ratingColor = rating >= 8 ? "#4caf50" : rating >= 6 ? "#d4a843" : "#e53935"
  const displayYear = String(item.release_year || item.display_year || "—")
  const hasPoster = isDisplayablePosterSource(item.poster_url)
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
    // Read the latest object from currentResults. The card DOM may be intentionally
    // preserved when a background refresh returns visually identical data.
    showDetailModal(currentResults[Number(card.dataset.index)] || item)
  })
  return card
}

function _renderCardBatch(grid, batchSize = CARD_BATCH) {
  if (_cardRendered >= _cardPool.length) return
  const end = Math.min(_cardRendered + batchSize, _cardPool.length)
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

function getInitialCardBatchSize(grid) {
  // Render enough rows in one paint to move the infinite-scroll sentinel well below
  // the viewport. This prevents the observer from firing 4–5 times during startup.
  const width = Math.max(grid.clientWidth || window.innerWidth || 0, 320)
  const columns = Math.max(1, Math.floor(width / 185))
  const visibleRows = Math.max(3, Math.ceil((window.innerHeight || 800) / 310) + 3)
  return Math.min(84, Math.max(36, columns * visibleRows))
}

function updateCardGrid(results, options = {}) {
  const grid = document.getElementById("card-grid")
  if (!grid) return
  // Teardown old observer
  _cardObserver?.disconnect()
  _cardObserver = null
  const renderGeneration = ++_cardRenderGeneration
  grid.classList.remove("is-reordering")
  grid.classList.toggle("no-card-entry-animation", options.animate === false)
  grid.innerHTML = ""
  _cardPool = results
  _cardRendered = 0

  // First paint includes the visible area plus a generous buffer.
  _renderCardBatch(grid, getInitialCardBatchSize(grid))

  // Sentinel for infinite scroll
  if (_cardRendered < _cardPool.length) {
    const sentinel = document.createElement("div")
    sentinel.id = "card-sentinel"
    sentinel.style.cssText = "height:1px;grid-column:1/-1;pointer-events:none;"
    grid.appendChild(sentinel)

    let batchScheduled = false
    _cardObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || batchScheduled) return
      batchScheduled = true
      const renderNext = () => {
        batchScheduled = false
        if (renderGeneration !== _cardRenderGeneration) return
        _renderCardBatch(grid)
      }
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(renderNext, { timeout: 180 })
      } else {
        window.setTimeout(renderNext, 40)
      }
    }, { rootMargin: "180px 0px" })
    _cardObserver.observe(sentinel)
  }

  // Animate deliberate user-driven sorting/searching, never the initial hydration.
  if (options.animate === false) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      grid.classList.remove("no-card-entry-animation")
    }))
  } else {
    requestAnimationFrame(() => {
      grid.classList.add("is-reordering")
      window.setTimeout(() => grid.classList.remove("is-reordering"), 720)
    })
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
async function fetchTMDBDetails(title, year, mediaType, knownTmdbId = null) {
  try {
    const endpoint = mediaType === "movie" ? "movie" : "tv"
    let id = Number(knownTmdbId) || 0
    if (!id) {
      const yearParam = mediaType === "movie" ? `&year=${year}` : `&first_air_date_year=${year}`
      const searchRes = await fetch(
        `${TMDB_BASE_URL}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${yearParam}`
      )
      const searchData = await searchRes.json()
      if (!searchData.results?.length) return null
      id = searchData.results[0].id
    }
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
  const readOnlySharedTitle = Boolean(item.__shared_read_only)
  const readOnlyRecommendation = Boolean(item.__recommendation_read_only)
  const hasRatingValue = item.rating !== null && item.rating !== undefined && item.rating !== ""
  // Personal vault titles always show their local rating. Shared titles only show it
  // when the owner allowed the rating value to be included in the shared payload.
  const hasSharedRating = !readOnlySharedTitle || hasRatingValue
  const rating = hasRatingValue
    ? (typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 0)
    : 0

  // Poster
  const poster   = document.getElementById("detail-poster")
  const posterPh = document.getElementById("detail-poster-ph")
  const bgBlur   = document.getElementById("detail-bg-blur")

  if (isDisplayablePosterSource(item.poster_url)) {
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
  const savedSeasons = item.media_type === "series" && Number(item.number_of_seasons) > 0
    ? Number(item.number_of_seasons)
    : 0
  const watchedSeasons = item.media_type === "series" && item.watched_seasons !== null && item.watched_seasons !== undefined
    ? Math.max(0, Number(item.watched_seasons) || 0)
    : null
  const detailYear = item.display_year || item.release_year || "—"
  const orderChip = Number(item.order_number) > 0
    ? `<span class="meta-chip"><i class="fas fa-hashtag"></i> #${item.order_number}</span>`
    : ""
  document.getElementById("detail-meta").innerHTML = `
    <span class="meta-chip"><i class="fas fa-calendar"></i> ${escapeHtml(String(detailYear))}</span>
    ${orderChip}
    ${savedSeasons ? `<span class="meta-chip"><i class="fas fa-layer-group"></i> ${savedSeasons} season${savedSeasons === 1 ? "" : "s"}</span>` : ""}
    ${watchedSeasons !== null ? `<span class="meta-chip meta-chip-progress"><i class="fas fa-route"></i> ${watchedSeasons}${savedSeasons ? `/${savedSeasons}` : ""} watched</span>` : ""}
  `

  // Stars
  const filled = Math.round(rating / 2)
  let stars = ""
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="${i <= filled ? "fas" : "far"} fa-star"></i>`
  }
  document.getElementById("detail-rating-display").innerHTML = hasSharedRating
    ? `<div class="rating-stars">${stars}</div><div class="rating-number">${rating.toFixed(1)}<span>/10</span></div>`
    : `<div class="det-shared-readonly"><i class="fas fa-eye-slash"></i> Rating kept private</div>`

  // Genre tags
  const genres = String(item.genre || "")
    .split(",")
    .map(g => g.trim())
    .filter(Boolean)
  document.getElementById("detail-genre-tags").innerHTML = genres.length
    ? genres.map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join("")
    : `<span class="genre-tag">Genre unavailable</span>`

  // Clear extra info area
  const extraEl = document.getElementById("detail-extra")
  if (extraEl) {
    extraEl.innerHTML = `<div class="det-extra-loading"><i class="fas fa-spinner fa-spin"></i> Loading details…</div>`
  }

  // Shared titles are read-only. Recommendation details can be added directly to the vault.
  const detailEditButton = document.getElementById("detail-edit-btn")
  if (detailEditButton) {
    if (readOnlySharedTitle) {
      detailEditButton.style.display = "none"
      detailEditButton.onclick = null
    } else if (readOnlyRecommendation) {
      detailEditButton.style.display = "inline-flex"
      detailEditButton.innerHTML = '<i class="fas fa-plus"></i> Add to Vault'
      detailEditButton.onclick = () => {
        closeDetailModal()
        setTimeout(() => prefillRecommendation(item.__recommendation_data || item), 120)
      }
    } else {
      detailEditButton.style.display = "inline-flex"
      detailEditButton.innerHTML = '<i class="fas fa-pen"></i> Edit Title'
      detailEditButton.onclick = () => {
        closeDetailModal()
        setTimeout(() => editItemDirectly(item), 200)
      }
    }
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
  fetchTMDBDetails(item.title, item.release_year, item.media_type, item.tmdb_id).then(tmdb => {
    if (detailSerial !== detailRequestSerial || overlay.style.display !== "flex") return
    if (!tmdb || !extraEl) return

    // Overview
    const overview = tmdb.overview || ""

    // Top cast (max 4)
    const castMembers = (tmdb.credits?.cast || []).slice(0, 6)
    castMembers.forEach(c => {
      const personId = Number(c?.id || 0)
      if (personId > 0 && c?.profile_path) _actorProfilePathHints.set(personId, c.profile_path)
    })
    const cast = castMembers
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
      : !savedSeasons && tmdb.number_of_seasons
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
    `${TMDB_BASE_URL}/person/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=combined_credits,external_ids,images`
  )
  if (!response.ok) throw new Error("Could not load this performer right now")
  const person = await response.json()
  if (!person.profile_path && _actorProfilePathHints.has(id)) {
    person.profile_path = _actorProfilePathHints.get(id)
  }
  _actorProfileCache.set(id, person)
  return person
}

function renderActorProfileLoading() {
  actorProfileState.imageRequestSerial += 1
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
  const vaultShowcase = getActorProfileElement("actor-vault-showcase")
  if (vaultShowcase) vaultShowcase.hidden = true
  const vaultGrid = getActorProfileElement("actor-vault-grid")
  if (vaultGrid) vaultGrid.innerHTML = ""
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

function getActorProfileImageCandidates(person) {
  const profiles = Array.isArray(person?.images?.profiles)
    ? [...person.images.profiles].sort((a, b) =>
        Number(b.vote_count || 0) - Number(a.vote_count || 0)
        || Number(b.vote_average || 0) - Number(a.vote_average || 0)
        || Number(b.width || 0) - Number(a.width || 0))
    : []

  const hintedPath = _actorProfilePathHints.get(Number(person?.id)) || ""
  const paths = [person?.profile_path, hintedPath, ...profiles.map(image => image?.file_path)]
    .filter(Boolean)
  const uniquePaths = [...new Set(paths)]
  const urls = []

  uniquePaths.forEach(path => {
    urls.push(`https://image.tmdb.org/t/p/w500${path}`)
    urls.push(`https://image.tmdb.org/t/p/original${path}`)
  })

  return [...new Set(urls)]
}

function loadActorProfilePortrait(person) {
  const portrait = getActorProfileElement("actor-profile-portrait")
  const portraitPh = getActorProfileElement("actor-profile-portrait-ph")
  const backdrop = getActorProfileElement("actor-profile-bg")
  if (!portrait || !portraitPh || !backdrop) return

  const requestSerial = ++actorProfileState.imageRequestSerial
  const personId = Number(person?.id || 0)
  const candidates = getActorProfileImageCandidates(person)

  portrait.classList.remove("is-loaded")
  portrait.hidden = true
  portrait.removeAttribute("src")
  portrait.alt = person?.name || "Performer"
  portraitPh.hidden = false
  portraitPh.innerHTML = candidates.length
    ? `<i class="fas fa-circle-notch fa-spin"></i>`
    : `<i class="fas fa-user"></i>`
  backdrop.style.backgroundImage = ""

  if (!candidates.length) return

  const isCurrent = () =>
    requestSerial === actorProfileState.imageRequestSerial
    && Number(actorProfileState.person?.id || 0) === personId
    && isActorProfileOpen()

  const tryCandidate = index => {
    if (!isCurrent()) return
    if (index >= candidates.length) {
      portrait.hidden = true
      portrait.classList.remove("is-loaded")
      portraitPh.hidden = false
      portraitPh.innerHTML = `<i class="fas fa-user"></i>`
      backdrop.style.backgroundImage = ""
      return
    }

    const url = candidates[index]
    const probe = new Image()
    let finished = false
    const finish = success => {
      if (finished) return
      finished = true
      clearTimeout(timeoutId)
      probe.onload = null
      probe.onerror = null
      if (!isCurrent()) return

      if (!success || !probe.naturalWidth) {
        tryCandidate(index + 1)
        return
      }

      portrait.src = url
      portrait.hidden = false
      requestAnimationFrame(() => {
        if (!isCurrent()) return
        portrait.classList.add("is-loaded")
        portraitPh.hidden = true
        backdrop.style.backgroundImage = `url("${url}")`
      })
    }

    const timeoutId = setTimeout(() => finish(false), 8000)
    probe.onload = () => finish(true)
    probe.onerror = () => finish(false)
    probe.decoding = "async"
    probe.src = url
  }

  tryCandidate(0)
}

function renderActorProfile(person) {
  actorProfileState.person = person
  actorProfileState.credits = normaliseActorCredits(person)
  actorProfileState.filter = "all"
  actorProfileState.vaultFilter = "all"
  actorProfileState.visibleLimit = 24
  actorProfileState.vaultLookup = buildActorVaultLookup()

  loadActorProfilePortrait(person)

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
    <div class="actor-profile-stat actor-profile-stat-vault"><strong>${vaultCount}</strong><span>In vault</span></div>
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

  const vaultCredits = getActorVaultCredits()
  const vaultMovieCount = vaultCredits.filter(({ credit }) => credit._mediaType === "movie").length
  const vaultSeriesCount = vaultCredits.filter(({ credit }) => credit._mediaType === "series").length
  getActorProfileElement("actor-vault-summary").innerHTML = vaultCount
    ? `<strong>${vaultCount}</strong><span>${vaultMovieCount} movie${vaultMovieCount === 1 ? "" : "s"}${vaultMovieCount && vaultSeriesCount ? " · " : ""}${vaultSeriesCount ? `${vaultSeriesCount} series` : ""}</span>`
    : `<strong>0</strong><span>No matching titles in your collection yet.</span>`
  getActorProfileElement("actor-vault-panel").classList.toggle("has-vault-items", vaultCount > 0)
  const vaultFocusButton = document.querySelector("[data-actor-scroll-vault]")
  if (vaultFocusButton) vaultFocusButton.hidden = vaultCount === 0
  document.querySelectorAll(".actor-vault-filter").forEach(button => {
    button.classList.toggle("active", button.dataset.actorVaultFilter === "all")
  })
  renderActorVaultShowcase()

  document.querySelectorAll(".actor-filmography-filter").forEach(button => {
    button.classList.toggle("active", button.dataset.actorFilter === "all")
  })
  renderActorFilmography()
}

function getActorVaultCredits() {
  return actorProfileState.credits
    .map(credit => ({ credit, vaultItem: findVaultItemForActorCredit(credit) }))
    .filter(entry => entry.vaultItem)
    .sort((a, b) => {
      const aAdded = new Date(a.vaultItem.added_at || a.vaultItem.created_at || 0).getTime()
      const bAdded = new Date(b.vaultItem.added_at || b.vaultItem.created_at || 0).getTime()
      return (bAdded - aAdded)
        || Number(b.vaultItem.rating || 0) - Number(a.vaultItem.rating || 0)
        || a.credit._title.localeCompare(b.credit._title)
    })
}

function renderActorVaultShowcase() {
  const showcase = getActorProfileElement("actor-vault-showcase")
  const grid = getActorProfileElement("actor-vault-grid")
  const title = getActorProfileElement("actor-vault-showcase-title")
  const summary = getActorProfileElement("actor-vault-showcase-summary")
  if (!showcase || !grid || !summary) return

  const allEntries = getActorVaultCredits()
  showcase.hidden = allEntries.length === 0
  if (!allEntries.length) {
    grid.innerHTML = ""
    return
  }

  const personName = actorProfileState.person?.name || "This performer"
  title.textContent = `${personName} in your vault`
  const movieCount = allEntries.filter(entry => entry.credit._mediaType === "movie").length
  const seriesCount = allEntries.filter(entry => entry.credit._mediaType === "series").length
  summary.textContent = `${allEntries.length} saved title${allEntries.length === 1 ? "" : "s"} · ${movieCount} movie${movieCount === 1 ? "" : "s"} · ${seriesCount} series`

  const visible = allEntries.filter(({ credit }) =>
    actorProfileState.vaultFilter === "all" || credit._mediaType === actorProfileState.vaultFilter
  )

  if (!visible.length) {
    grid.innerHTML = `<div class="actor-vault-empty"><i class="fas fa-film"></i>No saved titles in this category.</div>`
    return
  }

  grid.innerHTML = visible.map(({ credit, vaultItem }) => {
    const posterUrl = vaultItem.poster_url || (credit.poster_path ? `${TMDB_IMAGE_URL}${credit.poster_path}` : "")
    const poster = posterUrl
      ? `<img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(vaultItem.title || credit._title)}" loading="lazy">`
      : `<span class="actor-vault-card-ph"><i class="fas ${credit._mediaType === "series" ? "fa-tv" : "fa-film"}"></i></span>`
    const year = vaultItem.release_year || credit._year || "—"
    const rating = Number(vaultItem.rating || credit._rating || 0)
    const character = credit._character || "Cast"
    return `
      <button type="button" class="actor-vault-card" data-actor-work-key="${escapeHtml(credit._key)}" title="Open ${escapeHtml(vaultItem.title || credit._title)}">
        <span class="actor-vault-card-poster">
          ${poster}
          <span class="actor-vault-card-year">${escapeHtml(String(year))}</span>
          ${rating > 0 ? `<span class="actor-vault-card-rating"><i class="fas fa-star"></i>${rating.toFixed(1)}</span>` : ""}
          <span class="actor-vault-card-type ${credit._mediaType}">${credit._mediaType === "series" ? "Series" : "Movie"}</span>
        </span>
        <span class="actor-vault-card-body">
          <strong>${escapeHtml(vaultItem.title || credit._title)}</strong>
          <small><i class="fas fa-masks-theater"></i>${escapeHtml(character)}</small>
          <span>Open from your collection <i class="fas fa-arrow-right"></i></span>
        </span>
      </button>`
  }).join("")
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

  const vaultFilterButton = event.target.closest("[data-actor-vault-filter]")
  if (vaultFilterButton) {
    actorProfileState.vaultFilter = vaultFilterButton.dataset.actorVaultFilter
    document.querySelectorAll(".actor-vault-filter").forEach(button => {
      button.classList.toggle("active", button === vaultFilterButton)
    })
    renderActorVaultShowcase()
    return
  }

  const scrollVaultButton = event.target.closest("[data-actor-scroll-vault]")
  if (scrollVaultButton) {
    getActorProfileElement("actor-vault-showcase")?.scrollIntoView({ behavior: "smooth", block: "start" })
    return
  }

  const scrollCareerButton = event.target.closest("[data-actor-scroll-career]")
  if (scrollCareerButton) {
    document.querySelector(".actor-filmography-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
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
  actorProfileState.vaultFilter = "all"
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
//  PERSONALIZED "FOR YOU" RECOMMENDATIONS
// ════════════════════════════════════════════════

const RECOMMENDATION_SECTIONS = {
  top_picks: {
    sectionId: "rec-section-top",
    gridId: "rec-grid-top",
    countId: "rec-count-top",
  },
  continue_story: {
    sectionId: "rec-section-continue",
    gridId: "rec-grid-continue",
    countId: "rec-count-continue",
  },
  from_vault: {
    sectionId: "rec-section-vault",
    gridId: "rec-grid-vault",
    countId: "rec-count-vault",
  },
  connected_universes: {
    sectionId: "rec-section-universe",
    gridId: "rec-grid-universe",
    countId: "rec-count-universe",
  },
  new_releases: {
    sectionId: "rec-section-new",
    gridId: "rec-grid-new",
    countId: "rec-count-new",
  },
  because_you_watched: {
    sectionId: "rec-section-because",
    gridId: "rec-grid-because",
    countId: "rec-count-because",
  },
}

function recommendationItemKey(item) {
  return `${item.media_type}:${item.tmdb_id}`
}

function recommendationPayloadSignature(data) {
  const sections = data?.sections || {}
  return JSON.stringify(Object.fromEntries(
    Object.keys(RECOMMENDATION_SECTIONS).map(key => [
      key,
      (sections[key] || []).map(item => [
        item.media_type,
        item.tmdb_id,
        item.score,
        item.vault_order_number,
        item.progress?.watched_seasons,
        item.progress?.aired_seasons,
      ])
    ])
  ))
}

function recommendationConnectionRank(item) {
  const types = new Set([item.primary_reason_type, ...(Array.isArray(item.reason_types) ? item.reason_types : [])].filter(Boolean))
  if (types.has("same_universe")) return 7
  if (types.has("franchise_next")) return 6
  if (types.has("new_season")) return 5
  if (types.has("because_watched")) return 3
  return item.in_vault ? 2 : 1
}

function recommendationContinueRank(item) {
  const types = new Set([item.primary_reason_type, ...(Array.isArray(item.reason_types) ? item.reason_types : [])].filter(Boolean))
  if (types.has("new_season")) return 6
  if (types.has("franchise_next")) return 5
  if (item.in_vault && item.vault_watch_status === "watching") return 4
  if (types.has("because_watched")) return 2
  return 1
}

function recommendationDateValue(item) {
  const direct = Date.parse(String(item.release_date || ""))
  if (Number.isFinite(direct)) return direct
  const year = Number(item.release_year) || 0
  return year ? Date.UTC(year, 0, 1) : 0
}

function recommendationPriorityValue(item) {
  return Number(item.__feedScore ?? item.score ?? item.match_score) || 0
}

function sortRecommendationClientItems(items, mode = recommendationState.sortMode) {
  const sorted = [...items]
  sorted.sort((a, b) => {
    let primary = 0
    if (mode === "latest") primary = recommendationDateValue(b) - recommendationDateValue(a)
    else if (mode === "universe") primary = recommendationConnectionRank(b) - recommendationConnectionRank(a)
    else if (mode === "continue") primary = recommendationContinueRank(b) - recommendationContinueRank(a)
    else primary = recommendationPriorityValue(b) - recommendationPriorityValue(a)
    if (primary) return primary

    const scoreDiff = recommendationPriorityValue(b) - recommendationPriorityValue(a)
    if (scoreDiff) return scoreDiff
    const dateDiff = recommendationDateValue(b) - recommendationDateValue(a)
    if (dateDiff) return dateDiff
    return String(a.title || "").localeCompare(String(b.title || ""))
  })
  return sorted
}

function filterRecommendationClientItems(items) {
  const mediaFilter = recommendationState.mediaFilter
  return items.filter(item => {
    if (!item || shouldHideRecommendationAsAlreadyWatched(item)) return false
    if (mediaFilter === "movie") return item.media_type === "movie"
    if (mediaFilter === "series") return item.media_type === "series"
    return true
  })
}

function interleaveRecommendationTypes(items, limit = 18) {
  if (recommendationState.mediaFilter !== "all") return items.slice(0, limit)
  const movies = items.filter(item => item.media_type === "movie")
  const series = items.filter(item => item.media_type === "series")
  const mixed = []
  let preferMovie = movies.length >= series.length
  while ((movies.length || series.length) && mixed.length < limit) {
    const primary = preferMovie ? movies : series
    const secondary = preferMovie ? series : movies
    if (primary.length) mixed.push(primary.shift())
    if (secondary.length && mixed.length < limit) mixed.push(secondary.shift())
    preferMovie = !preferMovie
  }
  return mixed
}

function buildTopRecommendationFeed(sections = {}) {
  const bucketMap = new Map()
  const sourceOrder = ["continue_story", "connected_universes", "from_vault", "new_releases", "because_you_watched"]

  sourceOrder.forEach((sectionKey, sectionIndex) => {
    const sourceItems = Array.isArray(sections[sectionKey]) ? sections[sectionKey] : []
    sourceItems.forEach((item, itemIndex) => {
      if (!item || shouldHideRecommendationAsAlreadyWatched(item)) return
      const key = recommendationItemKey(item)
      const score = Number(item.score) || 0
      const rankBoost = (sourceOrder.length - sectionIndex) * 1000 - itemIndex
      const enriched = { ...item, __feedScore: score + rankBoost, __originSection: sectionKey }
      const existing = bucketMap.get(key)
      if (!existing || enriched.__feedScore > existing.__feedScore) bucketMap.set(key, enriched)
    })
  })

  const filtered = filterRecommendationClientItems(Array.from(bucketMap.values()))
  const sorted = sortRecommendationClientItems(filtered)
  return interleaveRecommendationTypes(sorted, 18)
}

function recommendationSortLabel(mode) {
  if (mode === "universe") return "Same universe first"
  if (mode === "latest") return "Newest releases first"
  if (mode === "continue") return "Franchise continuations first"
  return "Highest priority first"
}

function updateRecommendationToolbarSummary(total) {
  const summary = document.getElementById("rec-toolbar-summary")
  if (!summary) return
  const typeLabel = recommendationState.mediaFilter === "movie"
    ? "movies"
    : recommendationState.mediaFilter === "series"
      ? "series"
      : "movies & series"
  summary.textContent = `${total} ${typeLabel} · ${recommendationSortLabel(recommendationState.sortMode)}`
}

function syncRecommendationToolbar() {
  document.querySelectorAll("[data-rec-filter]").forEach(button => {
    const active = button.dataset.recFilter === recommendationState.mediaFilter
    button.classList.toggle("active", active)
    button.setAttribute("aria-pressed", active ? "true" : "false")
  })
  const sortSelect = document.getElementById("rec-sort-mode")
  if (sortSelect && sortSelect.value !== recommendationState.sortMode) sortSelect.value = recommendationState.sortMode
}

const RECOMMENDATION_COLLAPSE_KEY = "cinema_for_you_collapsed_sections_v1"

function readRecommendationCollapsedSections() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECOMMENDATION_COLLAPSE_KEY) || "[]")
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeRecommendationCollapsedSections(set) {
  try { localStorage.setItem(RECOMMENDATION_COLLAPSE_KEY, JSON.stringify(Array.from(set))) } catch {}
}

function syncRecommendationSectionCollapse(section) {
  if (!section?.id) return
  const collapsed = readRecommendationCollapsedSections().has(section.id)
  section.classList.toggle("is-collapsed", collapsed)
  const button = section.querySelector("[data-rec-section-toggle]")
  if (button) {
    button.setAttribute("aria-expanded", collapsed ? "false" : "true")
    button.setAttribute("title", collapsed ? "Open section" : "Collapse section")
    const icon = button.querySelector("i")
    if (icon) icon.className = `fas ${collapsed ? "fa-chevron-down" : "fa-chevron-up"}`
  }
}

function ensureRecommendationSectionToggles() {
  document.querySelectorAll("#recommendations-content .rec-section").forEach(section => {
    const head = section.querySelector(".rec-section-head")
    if (!head) return
    let controls = head.querySelector(".rec-section-head-controls")
    if (!controls) {
      controls = document.createElement("div")
      controls.className = "rec-section-head-controls"
      const count = head.querySelector(".rec-section-count")
      if (count) controls.appendChild(count)
      head.appendChild(controls)
    }
    if (!controls.querySelector("[data-rec-section-toggle]")) {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "rec-section-toggle"
      button.dataset.recSectionToggle = section.id
      button.setAttribute("aria-label", "Collapse or open this recommendation section")
      button.innerHTML = '<i class="fas fa-chevron-up"></i>'
      controls.appendChild(button)
    }
    syncRecommendationSectionCollapse(section)
  })
}

function toggleRecommendationSection(sectionId) {
  const section = document.getElementById(sectionId)
  if (!section) return
  const collapsedSections = readRecommendationCollapsedSections()
  if (collapsedSections.has(sectionId)) collapsedSections.delete(sectionId)
  else collapsedSections.add(sectionId)
  writeRecommendationCollapsedSections(collapsedSections)
  syncRecommendationSectionCollapse(section)
}

function setRecommendationsLoading(show) {
  const loading = document.getElementById("recommendations-loading")
  if (loading) loading.hidden = !show
}

function hideRecommendationMessages() {
  const error = document.getElementById("recommendations-error")
  const empty = document.getElementById("recommendations-empty")
  if (error) error.hidden = true
  if (empty) empty.hidden = true
}

function formatRecommendationUpdatedAt(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "Updated recently"
  const now = Date.now()
  const diffMinutes = Math.max(0, Math.round((now - date.getTime()) / 60000))
  if (diffMinutes < 1) return "Updated just now"
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  return `Updated ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
}

function recommendationReasonIcon(type) {
  if (type === "new_season") return "fa-layer-group"
  if (type === "franchise_next") return "fa-forward-step"
  if (type === "same_universe") return "fa-sitemap"
  if (type === "because_watched") return "fa-link"
  return "fa-wand-magic-sparkles"
}

function effectiveVaultWatchedSeasons(mediaItem) {
  if (!mediaItem || mediaItem.media_type !== "series") return 0
  const savedSeasons = Math.max(0, Number(mediaItem.number_of_seasons) || 0)
  const hasTracked = mediaItem.watched_seasons !== null &&
    mediaItem.watched_seasons !== undefined &&
    mediaItem.watched_seasons !== "" &&
    Number.isFinite(Number(mediaItem.watched_seasons))
  const tracked = hasTracked ? Math.max(0, Number(mediaItem.watched_seasons)) : null

  if (mediaItem.watch_status === "watched") return Math.max(savedSeasons, tracked ?? 0)
  if (!mediaItem.watch_status) return tracked !== null && tracked > 0 ? tracked : savedSeasons
  return tracked ?? 0
}

function shouldHideRecommendationAsAlreadyWatched(item) {
  // Universe search intentionally shows the complete connected catalog, including
  // titles already watched, and marks them clearly instead of hiding them.
  if (item?.__universe_search) return false
  if (!item?.in_vault) return false
  const vaultItem = getVaultItemForRecommendation(item)
  if (!vaultItem) return false

  const reasonTypes = Array.isArray(item.reason_types) ? item.reason_types : []
  const isNewSeason = item.primary_reason_type === "new_season" || reasonTypes.includes("new_season")

  if (isNewSeason) {
    const aired = Math.max(0, Number(item.progress?.aired_seasons) || 0)
    if (!aired) return false

    const savedSeasons = Math.max(0, Number(vaultItem.number_of_seasons) || 0)
    const trackedSeasons = Math.max(0, Number(vaultItem.watched_seasons) || 0)
    const completedSemantics = vaultItem.watch_status === "watched" || !vaultItem.watch_status

    // Old vault entries can have no season metadata at all. They still mean the
    // series was watched, so suppress the stale 0/N recommendation while the new
    // backend establishes a proper baseline from TMDB.
    if (completedSemantics && savedSeasons === 0 && trackedSeasons === 0) return true

    return effectiveVaultWatchedSeasons(vaultItem) >= aired
  }

  // Existing collections before watch-status tracking represented watched titles.
  // Never recommend those titles back to the user as something they still need to see.
  return vaultItem.watch_status === "watched" || !vaultItem.watch_status
}

function recommendationSignal(item, reasonType) {
  if (item?.__universe_search) {
    if (item.is_watched) return { icon: "fa-circle-check", label: "Watched", className: "is-watched" }
    if (item.is_upcoming) return { icon: "fa-clock", label: "Upcoming", className: "is-upcoming" }
    if (item.in_vault) return { icon: "fa-vault", label: "In your vault", className: "is-vault" }
    return {
      icon: "fa-diagram-project",
      label: `${Math.max(0, Number(item.match_score) || 0)}% connected`,
      className: "is-universe",
    }
  }
  if (reasonType === "new_season") {
    const nextSeason = Math.max(1, Number(item.progress?.next_season) || 1)
    return { icon: "fa-layer-group", label: `Season ${nextSeason} ready`, className: "is-next" }
  }
  if (reasonType === "franchise_next") {
    return { icon: "fa-forward-step", label: "Next chapter", className: "is-next" }
  }
  if (reasonType === "same_universe") {
    return { icon: "fa-sitemap", label: "Same universe", className: "is-universe" }
  }
  if (item.in_vault) {
    return { icon: "fa-vault", label: "Ready in your vault", className: "is-vault" }
  }
  return {
    icon: "fa-bullseye",
    label: `${Math.max(0, Number(item.match_score) || 0)}% match`,
    className: "is-match",
  }
}

function buildRecommendationCard(item) {
  const article = document.createElement("article")
  const reasonType = item.primary_reason_type || item.reason_types?.[0] || "related"
  article.className = `recommendation-card recommendation-card--collection rec-kind-${reasonType}${item.in_vault ? " is-in-vault" : ""}${item.is_watched ? " is-watched" : ""}${item.is_upcoming ? " is-upcoming" : ""}`
  article.dataset.recKey = recommendationItemKey(item)

  const typeLabel = item.media_type === "movie" ? "Movie" : "Series"
  const year = item.release_year || "—"
  const ratingValue = Number(item.tmdb_rating) || 0
  const rating = ratingValue > 0 ? ratingValue.toFixed(1) : "—"
  const signal = recommendationSignal(item, reasonType)
  const genres = Array.isArray(item.genres) && item.genres.length
    ? item.genres.slice(0, 3).join(", ")
    : "Recommended"
  const reason = item.primary_reason || item.reasons?.[0] || "Picked for you"

  let progressHtml = ""
  if (item.progress) {
    const watched = Math.max(0, Number(item.progress.watched_seasons) || 0)
    const aired = Math.max(0, Number(item.progress.aired_seasons) || 0)
    const nextSeason = Math.max(1, Number(item.progress.next_season) || watched + 1)
    progressHtml = `
      <div class="rec-progress rec-progress-inline">
        <span><i class="fas fa-layer-group"></i> ${watched}/${Math.max(1, aired)} seasons</span>
        <strong>Next: Season ${nextSeason}</strong>
      </div>`
  }

  const posterHtml = item.poster_url
    ? `<img src="${escapeHtml(item.poster_url)}" alt="${escapeHtml(item.title)} poster" loading="lazy" decoding="async" />`
    : `<div class="rec-poster-placeholder"><i class="fas fa-photo-film"></i></div>`

  article.innerHTML = `
    <button type="button" class="rec-card-main" data-rec-action="open" aria-label="Open ${escapeHtml(item.title)}">
      <div class="rec-card-poster">
        ${posterHtml}
        <div class="rec-poster-shade"></div>
        <span class="rec-collection-badge rec-year-badge">${escapeHtml(String(year))}</span>
        <span class="rec-collection-badge rec-rating-badge"><i class="fas fa-star"></i>${escapeHtml(String(rating))}</span>
        <span class="rec-type-pill"><i class="fas ${item.media_type === "movie" ? "fa-film" : "fa-tv"}"></i>${escapeHtml(typeLabel)}</span>
        <span class="rec-signal-badge ${signal.className}"><i class="fas ${signal.icon}"></i>${escapeHtml(signal.label)}</span>
      </div>
      <div class="rec-card-body">
        <div class="rec-card-kicker">${escapeHtml(item.__universe_search
          ? (item.is_watched ? "Already watched" : item.in_vault ? "In your vault" : item.is_upcoming ? "Coming soon" : "Connected title")
          : (item.in_vault ? "In your vault" : "Suggested for you"))}</div>
        <h3 title="${escapeHtml(item.title || "Untitled")}">${escapeHtml(item.title || "Untitled")}</h3>
        <p class="rec-card-genres">${escapeHtml(genres)}</p>
        <p class="rec-short-reason">${escapeHtml(reason)}</p>
        ${progressHtml}
      </div>
    </button>
    <div class="rec-card-actions">
      <button type="button" class="rec-secondary-action" data-rec-action="open">
        <i class="fas fa-circle-info"></i> Details
      </button>
      ${item.in_vault
        ? `<button type="button" class="rec-primary-action${item.is_watched ? " is-watched-action" : ""}" data-rec-action="vault"><i class="fas ${item.is_watched ? "fa-circle-check" : "fa-arrow-up-right-from-square"}"></i> ${item.is_watched ? "Watched · Open" : "Open in vault"}</button>`
        : item.is_upcoming
          ? `<button type="button" class="rec-primary-action" data-rec-action="add"><i class="fas fa-bookmark"></i> Add to vault</button>`
          : `<button type="button" class="rec-primary-action" data-rec-action="add"><i class="fas fa-plus"></i> Add to vault</button>`}
    </div>
  `
  return article
}

function renderRecommendationSection(sectionKey, items = []) {
  const config = RECOMMENDATION_SECTIONS[sectionKey]
  if (!config) return
  const section = document.getElementById(config.sectionId)
  const grid = document.getElementById(config.gridId)
  const count = document.getElementById(config.countId)
  if (!section || !grid) return

  // Front-end safety net for stale snapshots or an older backend response.
  // A title already completed in the vault must never be rendered as a next watch.
  const visibleItems = sectionKey === "top_picks"
    ? items
    : sortRecommendationClientItems(filterRecommendationClientItems(items))

  grid.innerHTML = ""
  section.hidden = !visibleItems.length
  if (count) count.textContent = visibleItems.length
  if (!visibleItems.length) return

  const fragment = document.createDocumentFragment()
  for (const item of visibleItems) {
    recommendationState.itemMap.set(recommendationItemKey(item), item)
    fragment.appendChild(buildRecommendationCard(item))
  }
  grid.appendChild(fragment)
}


function setUniverseSearchLoading(show) {
  recommendationState.searchLoading = Boolean(show)
  const loader = document.getElementById("rec-universe-search-loader")
  const input = document.getElementById("rec-universe-search-input")
  if (loader) loader.hidden = !show
  if (input) input.setAttribute("aria-busy", show ? "true" : "false")
}

function updateUniverseSearchStatus(text, tone = "neutral") {
  const status = document.getElementById("rec-universe-search-status")
  if (!status) return
  status.textContent = text
  status.dataset.tone = tone
}

function setUniverseSearchClearVisibility() {
  const clear = document.getElementById("rec-universe-search-clear")
  if (clear) clear.hidden = !recommendationState.searchQuery
}

function hideStandardRecommendationSectionsForSearch() {
  Object.values(RECOMMENDATION_SECTIONS).forEach(config => {
    const section = document.getElementById(config.sectionId)
    if (section) section.hidden = true
  })
}

function filterUniverseSearchItems(items) {
  return (items || []).filter(item => {
    if (recommendationState.mediaFilter === "movie") return item.media_type === "movie"
    if (recommendationState.mediaFilter === "series") return item.media_type === "series"
    return true
  })
}

function renderUniverseSearchResults(data) {
  if (!data || !recommendationState.searchQuery) return
  recommendationState.searchData = data
  recommendationState.itemMap.clear()
  hideRecommendationMessages()
  hideStandardRecommendationSectionsForSearch()
  setUniverseSearchClearVisibility()

  const content = document.getElementById("recommendations-content")
  const section = document.getElementById("rec-section-search")
  const grid = document.getElementById("rec-grid-search")
  const count = document.getElementById("rec-count-search")
  const title = document.getElementById("rec-search-results-title")
  const copy = document.getElementById("rec-search-results-copy")
  const stats = document.getElementById("rec-search-result-stats")
  const filterEmpty = document.getElementById("recommendations-filter-empty")
  if (!section || !grid) return

  const filtered = filterUniverseSearchItems(data.results || [])
  const sorted = sortRecommendationClientItems(filtered)
  grid.innerHTML = ""
  const fragment = document.createDocumentFragment()
  for (const item of sorted) {
    item.__universe_search = true
    recommendationState.itemMap.set(recommendationItemKey(item), item)
    fragment.appendChild(buildRecommendationCard(item))
  }
  grid.appendChild(fragment)

  section.hidden = false
  if (content) content.hidden = false
  if (count) count.textContent = sorted.length
  if (title) title.textContent = `${data.interpreted_as || data.query || recommendationState.searchQuery}`
  if (copy) copy.textContent = sorted.length
    ? `Everything we could connect to “${data.interpreted_as || data.query}” — watched titles stay visible so you can see the full universe.`
    : `No connected titles matched this media filter.`

  const watched = filtered.filter(item => item.is_watched).length
  const unwatched = filtered.filter(item => !item.is_watched && !item.is_upcoming).length
  const upcoming = filtered.filter(item => item.is_upcoming).length
  const movies = filtered.filter(item => item.media_type === "movie").length
  const series = filtered.filter(item => item.media_type === "series").length
  if (stats) {
    stats.innerHTML = `
      <span><i class="fas fa-film"></i><b>${movies}</b> Movies</span>
      <span><i class="fas fa-tv"></i><b>${series}</b> Series</span>
      <span><i class="fas fa-circle-check"></i><b>${watched}</b> Watched</span>
      <span><i class="fas fa-play"></i><b>${unwatched}</b> To watch</span>
      ${upcoming ? `<span><i class="fas fa-clock"></i><b>${upcoming}</b> Upcoming</span>` : ""}`
  }

  if (filterEmpty) filterEmpty.hidden = sorted.length !== 0
  const summary = document.getElementById("rec-toolbar-summary")
  if (summary) summary.textContent = `${sorted.length} results · ${movies} movies · ${series} series`
  ensureRecommendationSectionToggles()
  syncRecommendationToolbar()
}

function getUniverseSearchCacheKey(query) {
  return String(query || "").trim().toLowerCase()
}

async function runUniverseSearch(query, { force = false } = {}) {
  const cleanQuery = String(query || "").trim().replace(/\s+/g, " ").slice(0, 80)
  recommendationState.searchQuery = cleanQuery
  const input = document.getElementById("rec-universe-search-input")
  if (input && input.value !== cleanQuery) input.value = cleanQuery
  setUniverseSearchClearVisibility()

  if (cleanQuery.length < 2) {
    recommendationState.searchData = null
    recommendationState.itemMap.clear()
    const searchSection = document.getElementById("rec-section-search")
    if (searchSection) searchSection.hidden = true
    updateUniverseSearchStatus("Fast search across connected studios, keywords and your vault graph.")
    if (recommendationState.data) renderRecommendations(recommendationState.data, { force: true })
    return
  }

  const cacheKey = getUniverseSearchCacheKey(cleanQuery)
  if (!force) {
    const cached = recommendationState.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < 10 * 60_000) {
      renderUniverseSearchResults(cached.data)
      updateUniverseSearchStatus(`Showing cached results for ${cached.data.interpreted_as || cleanQuery}.`, "success")
      return
    }
  }

  const serial = ++recommendationState.searchRequestSerial
  setUniverseSearchLoading(true)
  updateUniverseSearchStatus(`Understanding “${cleanQuery}” and mapping its connected titles…`, "loading")

  try {
    const params = new URLSearchParams({ q: cleanQuery })
    if (force) params.set("refresh", "1")
    const response = await fetch(`${RECOMMENDATIONS_BASE_URL}/search?${params.toString()}`, { headers: authHeaders() })
    if (serial !== recommendationState.searchRequestSerial) return
    if (response.status === 401) {
      handleUnauthorized()
      return
    }
    const data = await response.json()
    if (!response.ok || data?.error) throw new Error(data?.error || `Search returned ${response.status}`)
    if (recommendationState.searchQuery !== cleanQuery) return

    recommendationState.searchCache.set(cacheKey, { data, ts: Date.now() })
    while (recommendationState.searchCache.size > 20) {
      recommendationState.searchCache.delete(recommendationState.searchCache.keys().next().value)
    }
    renderUniverseSearchResults(data)
    const total = Number(data.stats?.total) || (data.results || []).length
    updateUniverseSearchStatus(
      total ? `${total} connected titles found for ${data.interpreted_as || cleanQuery}.` : `No connected titles found for ${cleanQuery}.`,
      total ? "success" : "neutral"
    )
  } catch (error) {
    if (serial !== recommendationState.searchRequestSerial) return
    console.error("Universe search failed:", error)
    updateUniverseSearchStatus("Could not complete this search right now. Try again in a moment.", "error")
    showToast("Universe search could not connect right now", "info")
  } finally {
    if (serial === recommendationState.searchRequestSerial) setUniverseSearchLoading(false)
  }
}

function scheduleUniverseSearch(query) {
  if (recommendationState.searchDebounceTimer) window.clearTimeout(recommendationState.searchDebounceTimer)
  const cleanQuery = String(query || "").trim()
  recommendationState.searchQuery = cleanQuery
  setUniverseSearchClearVisibility()
  if (cleanQuery.length < 2) {
    void runUniverseSearch(cleanQuery)
    return
  }
  updateUniverseSearchStatus(`Type detected. Searching for “${cleanQuery}”…`, "loading")
  recommendationState.searchDebounceTimer = window.setTimeout(() => {
    recommendationState.searchDebounceTimer = null
    void runUniverseSearch(cleanQuery)
  }, 320)
}

function clearUniverseSearch() {
  if (recommendationState.searchDebounceTimer) window.clearTimeout(recommendationState.searchDebounceTimer)
  recommendationState.searchDebounceTimer = null
  recommendationState.searchRequestSerial += 1
  recommendationState.searchQuery = ""
  recommendationState.searchData = null
  setUniverseSearchLoading(false)
  const input = document.getElementById("rec-universe-search-input")
  if (input) input.value = ""
  setUniverseSearchClearVisibility()
  const section = document.getElementById("rec-section-search")
  if (section) section.hidden = true
  updateUniverseSearchStatus("Fast search across connected studios, keywords and your vault graph.")
  if (recommendationState.data) renderRecommendations(recommendationState.data, { force: true })
}

function renderRecommendations(data, { force = false } = {}) {
  if (!data) return
  if (recommendationState.searchQuery) {
    recommendationState.data = data
    if (recommendationState.searchData) renderUniverseSearchResults(recommendationState.searchData)
    return
  }
  const signature = recommendationPayloadSignature(data)
  if (!force && signature === recommendationState.renderSignature) {
    recommendationState.data = data
    return
  }

  recommendationState.data = data
  recommendationState.renderSignature = signature
  recommendationState.itemMap.clear()

  setRecommendationsLoading(false)
  hideRecommendationMessages()

  const content = document.getElementById("recommendations-content")
  const profile = data.profile || {}
  const watchedEl = document.getElementById("rec-profile-watched")
  const vaultEl = document.getElementById("rec-profile-vault")
  const progressEl = document.getElementById("rec-profile-progress")
  const updatedEl = document.getElementById("recommendations-updated-label")
  if (watchedEl) watchedEl.textContent = Number(profile.watched_count) || 0
  if (vaultEl) vaultEl.textContent = Number(profile.vault_total) || 0
  if (progressEl) progressEl.textContent = Number(profile.tracked_series_progress) || 0
  if (updatedEl) updatedEl.textContent = formatRecommendationUpdatedAt(data.generated_at)

  const searchSection = document.getElementById("rec-section-search")
  if (searchSection) searchSection.hidden = true
  const sections = data.sections || {}
  ensureRecommendationSectionToggles()
  syncRecommendationToolbar()
  const topFeed = buildTopRecommendationFeed(sections)
  let total = topFeed.length
  renderRecommendationSection("top_picks", topFeed)

  for (const key of Object.keys(RECOMMENDATION_SECTIONS)) {
    if (key === "top_picks") continue
    const items = Array.isArray(sections[key]) ? sections[key] : []
    const visibleItems = sortRecommendationClientItems(filterRecommendationClientItems(items))
    total += visibleItems.length
    renderRecommendationSection(key, visibleItems)
  }

  if (content) content.hidden = false
  const empty = document.getElementById("recommendations-empty")
  if (empty) empty.hidden = true
  const filterEmpty = document.getElementById("recommendations-filter-empty")
  if (filterEmpty) filterEmpty.hidden = total !== 0
  updateRecommendationToolbarSummary(topFeed.length)
}

function getVaultItemForRecommendation(item) {
  const source = Array.isArray(_cache.data) && _cache.data.length
    ? _cache.data
    : (readCollectionSnapshot() || [])
  const order = Number(item.vault_order_number)
  const tmdbId = Number(item.tmdb_id)
  return source.find(media => (
    media.media_type === item.media_type &&
    (
      (order > 0 && Number(media.order_number) === order) ||
      (tmdbId > 0 && Number(media.tmdb_id) === tmdbId)
    )
  )) || null
}

function openRecommendationItem(item) {
  if (!item) return
  const vaultItem = item.in_vault ? getVaultItemForRecommendation(item) : null
  if (vaultItem) {
    const [displayItem] = prepareDisplayResults([normaliseMediaItem(vaultItem)])
    showDetailModal(displayItem || vaultItem)
    return
  }

  showDetailModal({
    title: item.title,
    media_type: item.media_type,
    release_year: Number(item.release_year) || "",
    display_year: item.release_year ? String(item.release_year) : "—",
    rating: Number(item.tmdb_rating) || 0,
    poster_url: item.poster_url || null,
    genre: (item.genres || []).join(", "),
    order_number: 0,
    number_of_seasons: item.progress?.aired_seasons || 0,
    watched_seasons: null,
    __recommendation_read_only: true,
    __recommendation_data: item,
  })
}

function prefillRecommendation(item) {
  if (!item) return
  switchView("add")
  mediaTypeSelect.value = item.media_type === "series" ? "series" : "movie"
  updateEndYearVisibility()
  titleInput.value = item.title || ""
  releaseYearInput.value = item.release_year || ""
  genreInput.value = Array.isArray(item.genres) ? item.genres.join(", ") : ""
  ratingInput.value = Number(item.tmdb_rating) > 0 ? Number(item.tmdb_rating).toFixed(1) : ""
  if (tmdbIdInput) tmdbIdInput.value = item.tmdb_id || ""
  if (watchStatusSelect) watchStatusSelect.value = "plan_to_watch"
  if (watchedSeasonsInput) watchedSeasonsInput.value = ""

  if (item.poster_url) {
    posterImage.src = item.poster_url
    syncPosterPreview(posterImage, posterPlaceholder, removePosterBtn)
  } else {
    posterImage.removeAttribute("src")
    syncPosterPreview(posterImage, posterPlaceholder, removePosterBtn)
  }

  document.querySelector("#view-add .personal-section")?.classList.add("personal-section--open")
  showToast(`"${item.title}" is ready to add — details are being filled in`, "success")
  window.setTimeout(() => {
    if (titleInput.value.trim() === String(item.title || "").trim()) void fetchMediaInfo()
  }, 80)
}

function openRecommendationVaultItem(item) {
  const vaultItem = getVaultItemForRecommendation(item)
  if (!vaultItem) {
    showToast("This title is not available in your local vault snapshot yet", "info")
    return
  }
  switchView("collection")
  window.setTimeout(() => {
    const [displayItem] = prepareDisplayResults([normaliseMediaItem(vaultItem)])
    showDetailModal(displayItem || vaultItem)
  }, 80)
}

function handleRecommendationClick(event) {
  const actionButton = event.target.closest("[data-rec-action]")
  const card = event.target.closest(".recommendation-card")
  if (!actionButton || !card) return
  const item = recommendationState.itemMap.get(card.dataset.recKey)
  if (!item) return

  const action = actionButton.dataset.recAction
  if (action === "add") prefillRecommendation(item)
  else if (action === "vault") openRecommendationVaultItem(item)
  else openRecommendationItem(item)
}

async function loadRecommendations({ force = false, background = false } = {}) {
  if (!currentUser) {
    openAuthModal("login")
    return
  }
  if (recommendationState.loading && !force) return

  const now = Date.now()
  if (!force && recommendationState.data && now - recommendationState.loadedAt < 5 * 60_000) {
    renderRecommendations(recommendationState.data)
    return
  }

  if (!recommendationState.data) {
    const snapshot = readRecommendationSnapshot()
    if (snapshot) {
      recommendationState.data = snapshot
      recommendationState.loadedAt = now - 10 * 60_000
      renderRecommendations(snapshot, { force: true })
      background = true
    }
  }

  const serial = ++recommendationState.requestSerial
  recommendationState.loading = true
  const refreshBtn = document.getElementById("recommendations-refresh-btn")
  if (refreshBtn) {
    refreshBtn.disabled = true
    refreshBtn.classList.add("is-loading")
  }

  let loadingTimer = null
  if (!background && !recommendationState.data) {
    loadingTimer = window.setTimeout(() => setRecommendationsLoading(true), 450)
  }

  try {
    const url = `${RECOMMENDATIONS_BASE_URL}${force ? "?refresh=1" : ""}`
    const response = await fetch(url, { headers: authHeaders() })
    if (serial !== recommendationState.requestSerial) return
    if (response.status === 401) {
      handleUnauthorized()
      return
    }
    if (!response.ok) throw new Error(`Recommendation service returned ${response.status}`)
    const data = await response.json()
    if (data?.error) throw new Error(data.error)

    recommendationState.data = data
    recommendationState.loadedAt = Date.now()
    saveRecommendationSnapshot(data)
    renderRecommendations(data, { force })
  } catch (error) {
    if (serial !== recommendationState.requestSerial) return
    console.error("Recommendation loading failed:", error)
    if (!recommendationState.data) {
      const errorBox = document.getElementById("recommendations-error")
      const errorMessage = document.getElementById("recommendations-error-message")
      const content = document.getElementById("recommendations-content")
      if (errorBox) errorBox.hidden = false
      if (errorMessage) errorMessage.textContent = "The recommendation engine could not connect right now. Your collection is unaffected."
      if (content) content.hidden = true
    } else if (force) {
      showToast("Could not refresh picks — keeping your last recommendations", "info")
    }
  } finally {
    if (loadingTimer) window.clearTimeout(loadingTimer)
    if (serial === recommendationState.requestSerial) {
      recommendationState.loading = false
      setRecommendationsLoading(false)
      if (refreshBtn) {
        refreshBtn.disabled = false
        refreshBtn.classList.remove("is-loading")
      }
    }
  }
}

function setRecommendationMediaFilter(filter) {
  if (!new Set(["all", "movie", "series"]).has(filter)) return
  recommendationState.mediaFilter = filter
  if (recommendationState.searchQuery && recommendationState.searchData) renderUniverseSearchResults(recommendationState.searchData)
  else if (recommendationState.data) renderRecommendations(recommendationState.data, { force: true })
  else syncRecommendationToolbar()
}

function setRecommendationSortMode(mode) {
  if (!new Set(["priority", "universe", "latest", "continue"]).has(mode)) return
  recommendationState.sortMode = mode
  if (recommendationState.searchQuery && recommendationState.searchData) renderUniverseSearchResults(recommendationState.searchData)
  else if (recommendationState.data) renderRecommendations(recommendationState.data, { force: true })
  else syncRecommendationToolbar()
}

function initRecommendationsUI() {
  document.getElementById("recommendations-refresh-btn")?.addEventListener("click", () => {
    if (recommendationState.searchQuery) void runUniverseSearch(recommendationState.searchQuery, { force: true })
    else void loadRecommendations({ force: true })
  })
  const universeSearchInput = document.getElementById("rec-universe-search-input")
  universeSearchInput?.addEventListener("input", event => scheduleUniverseSearch(event.target.value))
  universeSearchInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault()
      if (recommendationState.searchDebounceTimer) window.clearTimeout(recommendationState.searchDebounceTimer)
      recommendationState.searchDebounceTimer = null
      void runUniverseSearch(event.target.value)
    } else if (event.key === "Escape") {
      clearUniverseSearch()
      universeSearchInput.blur()
    }
  })
  document.getElementById("rec-universe-search-clear")?.addEventListener("click", clearUniverseSearch)
  document.querySelector(".rec-smart-search-chips")?.addEventListener("click", event => {
    const chip = event.target.closest("[data-rec-universe-query]")
    if (!chip) return
    const query = chip.dataset.recUniverseQuery || ""
    if (universeSearchInput) universeSearchInput.value = query
    void runUniverseSearch(query)
  })
  document.getElementById("view-for-you")?.addEventListener("click", handleRecommendationClick)
  document.getElementById("recommendations-content")?.addEventListener("click", event => {
    const toggle = event.target.closest("[data-rec-section-toggle]")
    if (!toggle) return
    event.preventDefault()
    event.stopPropagation()
    toggleRecommendationSection(toggle.dataset.recSectionToggle)
  })
  ensureRecommendationSectionToggles()
  document.getElementById("rec-toolbar")?.addEventListener("click", event => {
    const filterButton = event.target.closest("[data-rec-filter]")
    if (filterButton) setRecommendationMediaFilter(filterButton.dataset.recFilter)
  })
  document.getElementById("rec-sort-mode")?.addEventListener("change", event => {
    setRecommendationSortMode(event.target.value)
  })
  syncRecommendationToolbar()
}
window.loadRecommendations = loadRecommendations

// ════════════════════════════════════════════════
//  VIEW SWITCHING
// ════════════════════════════════════════════════

function switchView(view) {
  // Guests can't add media or open private personalized/social features.
  if ((view === "add" || view === "social" || view === "for-you") && !currentUser) {
    openAuthModal("login")
    const message = view === "social"
      ? "Please sign in to connect with friends"
      : view === "for-you"
        ? "Please sign in to build recommendations from your watch history"
        : "Please sign in to add titles to your vault"
    showToast(message, "info")
    return
  }

  const views = {
    collection: document.getElementById("view-collection"),
    "for-you": document.getElementById("view-for-you"),
    add: document.getElementById("view-add"),
    social: document.getElementById("view-social"),
  }
  const navs = {
    collection: document.getElementById("nav-collection"),
    "for-you": document.getElementById("nav-for-you"),
    add: document.getElementById("nav-add"),
    social: document.getElementById("nav-social"),
  }

  Object.entries(views).forEach(([key, element]) => {
    if (element) element.style.display = key === view ? "block" : "none"
  })
  Object.entries(navs).forEach(([key, element]) => {
    element?.classList.toggle("active", key === view)
  })

  if (view === "add") {
    views.add?.querySelector(".personal-section")?.classList.remove("personal-section--open")
  }
  if (view === "for-you") {
    void loadRecommendations()
  }
  if (view === "social") {
    closeFriendVault({ silent: true })
    syncSocialProfileUI()
    loadSocialDashboard()
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

function isDisplayablePosterSource(value) {
  const source = String(value || "").trim()
  return source.startsWith("http://") || source.startsWith("https://") || source.startsWith("data:image/")
}

function syncPosterPreview(imageEl, placeholderEl, removeButton) {
  const visible = isDisplayablePosterSource(imageEl?.src)
  if (imageEl) imageEl.style.display = visible ? "block" : "none"
  if (placeholderEl) placeholderEl.style.display = visible ? "none" : "flex"
  if (removeButton) removeButton.hidden = !visible
}

async function optimizePosterFile(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose a valid image file")
  if (file.size > 12 * 1024 * 1024) throw new Error("Image must be smaller than 12 MB")

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = "async"
    image.src = objectUrl
    await image.decode()

    const maxWidth = 900
    const maxHeight = 1350
    const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
    const width = Math.max(1, Math.round(image.naturalWidth * ratio))
    const height = Math.max(1, Math.round(image.naturalHeight * ratio))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d", { alpha: false })
    ctx.fillStyle = "#0b0b12"
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    let quality = 0.86
    let dataUrl = canvas.toDataURL("image/jpeg", quality)
    while (dataUrl.length > 900000 && quality > 0.58) {
      quality -= 0.08
      dataUrl = canvas.toDataURL("image/jpeg", quality)
    }
    if (dataUrl.length > 1200000) throw new Error("Image is still too large after optimization")
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function handleManualPosterSelection(fileInput, imageEl, placeholderEl, removeButton) {
  const file = fileInput?.files?.[0]
  if (!file) return
  try {
    const dataUrl = await optimizePosterFile(file)
    imageEl.src = dataUrl
    syncPosterPreview(imageEl, placeholderEl, removeButton)
    showToast("Custom poster ready — it will be saved with this title", "success")
  } catch (error) {
    fileInput.value = ""
    showToast(error.message || "Could not process this image", "error")
  }
}

function removeManualPoster(fileInput, imageEl, placeholderEl, removeButton) {
  if (fileInput) fileInput.value = ""
  imageEl.removeAttribute("src")
  syncPosterPreview(imageEl, placeholderEl, removeButton)
}

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
      poster_url: isDisplayablePosterSource(posterImage.src) ? posterImage.src : null,
      tmdb_id: parseInt(tmdbIdInput?.value) || null,
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
      const numberOfSeasons = parseInt(seasonsInput?.value)
      if (!Number.isInteger(numberOfSeasons) || numberOfSeasons < 1) {
        showToast("Seasons must be a whole number of at least 1", "error")
        return
      }
      newMedia.number_of_seasons = numberOfSeasons
      const rawWatchedSeasons = watchedSeasonsInput?.value?.trim()
      if (rawWatchedSeasons !== "") {
        const watchedSeasons = parseInt(rawWatchedSeasons)
        if (!Number.isInteger(watchedSeasons) || watchedSeasons < 0) {
          showToast("Seasons watched must be a whole number of 0 or more", "error")
          return
        }
        newMedia.watched_seasons = watchedSeasons
      } else if (watchStatusSelect?.value === "watched") {
        newMedia.watched_seasons = numberOfSeasons
      } else {
        newMedia.watched_seasons = null
      }
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
      clearForm(false)
      showToast(`Saved successfully — "${title}" was added to your vault! 🎬`, "success")
      // Stay on Add New so another title can be added immediately.
    } else {
      showToast("Failed to add media", "error")
    }
  } catch(error) {
    showToast("Error adding media: " + error.message, "error")
  }
}

function clearForm(showNotification = true) {
  addForm.reset()
  document.querySelector("#view-add .personal-section")?.classList.remove("personal-section--open")
  posterImage.removeAttribute("src")
  if (posterFileInput) posterFileInput.value = ""
  syncPosterPreview(posterImage, posterPlaceholder, removePosterBtn)
  updateEndYearVisibility()
  titleInput.focus()
  // Reset personal fields
  if (watchStatusSelect)  watchStatusSelect.value = ""
  if (watchDateInput)     watchDateInput.value    = ""
  if (rewatchCountInput)  rewatchCountInput.value = ""
  if (favoriteChk)        favoriteChk.checked     = false
  if (notesInput)         notesInput.value        = ""
  if (showNotification) showToast("Form cleared", "info")
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
    if (tmdbIdInput) tmdbIdInput.value = info.tmdb_id || ""

    if (mediaType === "series") {
      if (info.end_year) endYearInput.value = info.end_year
      if (seasonsInput && info.number_of_seasons) seasonsInput.value = info.number_of_seasons
      syncAddSeriesProgressFromStatus()
    }

    if (info.poster_url) {
      posterImage.src = info.poster_url
      syncPosterPreview(posterImage, posterPlaceholder, removePosterBtn)
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
      tmdb_id:      Number(details.id) || Number(movie.id) || null,
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
      tmdb_id:      Number(details.id) || Number(serie.id) || null,
      title:        details.name || "",
      release_year: parsedStart,
      end_year:     parsedEnd,
      number_of_seasons: Math.max(1, parseInt(details.number_of_seasons) || 1),
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
  if (editTmdbIdInput) editTmdbIdInput.value = mediaItem.tmdb_id || ""
  editTitleInput.value       = mediaItem.title || ""
  editGenreInput.value       = mediaItem.genre || ""
  editReleaseYearInput.value = mediaItem.release_year || ""
  editRatingInput.value      = mediaItem.rating ?? ""
  editMediaTypeInput.value   = mediaType

  if (mediaType === "series") {
    editEndYearGroup.style.display = "flex"
    editSeasonsGroup.style.display = "flex"
    if (editWatchedSeasonsGroup) editWatchedSeasonsGroup.hidden = false
    editEndYearInput.value = mediaItem.end_year || mediaItem.release_year || ""
    editSeasonsInput.value = mediaItem.number_of_seasons || ""
    if (editWatchedSeasonsInput) {
      const inferredProgress = mediaItem.watched_seasons !== null && mediaItem.watched_seasons !== undefined
        ? mediaItem.watched_seasons
        : (mediaItem.watch_status === "watched" ? (mediaItem.number_of_seasons || "") : "")
      editWatchedSeasonsInput.value = inferredProgress
    }
  } else {
    editEndYearGroup.style.display = "none"
    editSeasonsGroup.style.display = "none"
    if (editWatchedSeasonsGroup) editWatchedSeasonsGroup.hidden = true
    editEndYearInput.value = ""
    editSeasonsInput.value = ""
    if (editWatchedSeasonsInput) editWatchedSeasonsInput.value = ""
  }

  if (mediaItem.poster_url) {
    editPosterImage.src = mediaItem.poster_url
    syncPosterPreview(editPosterImage, editPosterPlaceholder, editRemovePosterBtn)
  } else {
    editPosterImage.removeAttribute("src")
    syncPosterPreview(editPosterImage, editPosterPlaceholder, editRemovePosterBtn)
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
    mediaItem.watch_status || mediaItem.notes || mediaItem.favorite || mediaItem.watch_date ||
    (mediaItem.media_type === "series" && mediaItem.watched_seasons !== null && mediaItem.watched_seasons !== undefined)
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
    if (editTmdbIdInput) editTmdbIdInput.value = info.tmdb_id || ""

    if (mediaType === "series") {
      if (info.end_year) editEndYearInput.value = info.end_year
      if (info.number_of_seasons) editSeasonsInput.value = info.number_of_seasons
    }

    if (info.poster_url) {
      editPosterImage.src = info.poster_url
      syncPosterPreview(editPosterImage, editPosterPlaceholder, editRemovePosterBtn)
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
      tmdb_id: parseInt(editTmdbIdInput?.value) || null,
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
      const numberOfSeasons = parseInt(editSeasonsInput.value)
      if (!Number.isInteger(numberOfSeasons) || numberOfSeasons < 1) {
        showToast("Seasons must be a whole number of at least 1", "error")
        return
      }
      updatedMedia.number_of_seasons = numberOfSeasons
      const rawWatchedSeasons = editWatchedSeasonsInput?.value?.trim()
      if (rawWatchedSeasons !== "") {
        const watchedSeasons = parseInt(rawWatchedSeasons)
        if (!Number.isInteger(watchedSeasons) || watchedSeasons < 0) {
          showToast("Seasons watched must be a whole number of 0 or more", "error")
          return
        }
        updatedMedia.watched_seasons = watchedSeasons
      } else if (editWatchStatusSelect?.value === "watched") {
        updatedMedia.watched_seasons = numberOfSeasons
      } else {
        updatedMedia.watched_seasons = null
      }
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
  const token = getToken()
  const username = localStorage.getItem("cinema_username")
  if (!token) { updateAuthUI(null); return }

  // Optimistically restore, then verify and enrich the public profile in parallel.
  currentUser = { token, username: username || "User" }
  updateAuthUI(currentUser)

  try {
    const res = await fetch(`${AUTH_BASE_URL}/me`, { headers: authHeaders() })
    if (res.ok) {
      const data = await res.json()
      currentUser = { token, ...data }
      localStorage.setItem("cinema_username", data.username)
      updateAuthUI(currentUser)
      syncSocialProfileUI()
      updateSocialRequestBadge(Number(data.pending_requests_count) || 0)
    } else {
      handleUnauthorized()
    }
  } catch { /* offline — keep local state */ }
}

// ── Update UI based on auth state ──
function updateAuthUI(user) {
  const guestBtn = document.getElementById("auth-open-btn")
  const userPill = document.getElementById("user-pill")
  const userAvatar = document.getElementById("user-avatar")
  const userLabel = document.getElementById("user-name-label")
  const guestBanner = document.getElementById("guest-banner")
  const navAdd = document.getElementById("nav-add")
  const navForYou = document.getElementById("nav-for-you")
  const navSocial = document.getElementById("nav-social")

  if (user) {
    if (guestBtn) guestBtn.style.display = "none"
    if (userPill) userPill.style.display = "flex"
    if (userAvatar) userAvatar.textContent = user.username.charAt(0).toUpperCase()
    if (userLabel) userLabel.textContent = `@${user.username}`
    if (guestBanner) guestBanner.style.display = "none"
    if (navAdd) navAdd.style.opacity = "1"
    if (navForYou) navForYou.style.opacity = "1"
    if (navSocial) navSocial.style.opacity = "1"
  } else {
    if (guestBtn) guestBtn.style.display = "flex"
    if (userPill) userPill.style.display = "none"
    if (guestBanner) guestBanner.style.display = "flex"
    if (navAdd) navAdd.style.opacity = "0.5"
    if (navForYou) navForYou.style.opacity = "0.5"
    if (navSocial) navSocial.style.opacity = "0.5"
    updateSocialRequestBadge(0)
  }
}

// ── Handle expired / invalid token ──
function handleUnauthorized() {
  clearCollectionSnapshot()
  clearToken()
  currentUser = null
  resetSocialState()
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
      currentUser = { token: data.token, ...(data.user || { username: data.username }) }
      _cacheInvalidate()
      updateAuthUI(currentUser)
      syncSocialProfileUI()
      void refreshSocialRequestBadge()
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
  const username = normalizeHandleInput(document.getElementById("reg-username")?.value)
  const email = document.getElementById("reg-email")?.value.trim()
  const password = document.getElementById("reg-password")?.value || ""
  const confirmPassword = document.getElementById("reg-confirm-password")?.value || ""
  const errEl = document.getElementById("auth-register-error")
  const btn = document.getElementById("register-submit-btn")

  updateRegistrationValidation()
  if (!USERNAME_PATTERN.test(username)) {
    showAuthError(errEl, "Username must be 3–20 lowercase letters, numbers, or underscores")
    return
  }
  if (!registrationState.usernameAvailable) {
    showAuthError(errEl, "Choose an available username first")
    return
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    showAuthError(errEl, "Enter a valid email address")
    return
  }
  if (password.length < 8) {
    showAuthError(errEl, "Password must be at least 8 characters")
    return
  }
  if (password !== confirmPassword) {
    showAuthError(errEl, "Passwords do not match")
    return
  }

  btn.disabled = true
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Creating account…`

  try {
    const res = await fetch(`${AUTH_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, confirm_password: confirmPassword })
    })
    const data = await res.json()

    if (!res.ok) {
      if (data.field === "username") registrationState.usernameAvailable = false
      showAuthError(errEl, data.error || "Registration failed")
      updateRegistrationValidation()
    } else {
      setToken(data.token)
      localStorage.setItem("cinema_username", data.username)
      currentUser = { token: data.token, ...(data.user || { username: data.username }) }
      _cacheInvalidate()
      updateAuthUI(currentUser)
      syncSocialProfileUI()
      closeAuthModal()
      showToast(`Account created! Welcome, @${data.username} 🎉`, "success")
      await searchMedia()
    }
  } catch {
    showAuthError(errEl, "Network error — please try again")
  }

  btn.innerHTML = `<i class="fas fa-user-plus"></i> Create Account`
  updateRegistrationValidation()
}
window.submitRegister = submitRegister

// ── Logout ──
function logout() {
  clearCollectionSnapshot()
  clearToken()
  currentUser = null
  resetSocialState()
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
  ;["reg-username", "reg-email", "reg-password", "reg-confirm-password"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", handleRegistrationInput)
  })
  document.getElementById("reg-confirm-password")?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !document.getElementById("register-submit-btn")?.disabled) submitRegister()
  })
  updateRegistrationValidation()
})
// ════════════════════════════════════════════════
//  UNIQUE USERNAME REGISTRATION
// ════════════════════════════════════════════════

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const registrationState = {
  usernameAvailable: false,
  checkedUsername: "",
  requestSerial: 0,
  debounceTimer: null,
}

function normalizeHandleInput(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20)
}

function setUsernameAvailability(message, kind = "") {
  const hint = document.getElementById("username-availability")
  const icon = document.getElementById("username-check-icon")
  if (hint) {
    hint.textContent = message
    hint.className = `auth-field-hint ${kind}`.trim()
  }
  if (icon) {
    icon.className = `username-check-icon ${kind}`.trim()
    icon.innerHTML = kind === "valid"
      ? `<i class="fas fa-circle-check"></i>`
      : kind === "invalid"
        ? `<i class="fas fa-circle-xmark"></i>`
        : kind === "checking"
          ? `<i class="fas fa-spinner fa-spin"></i>`
          : ""
  }
}

function updatePasswordStrength() {
  const password = document.getElementById("reg-password")?.value || ""
  const el = document.getElementById("password-strength")
  if (!el) return 0
  let level = 0
  if (password.length > 0) level = 1
  if (password.length >= 8) level = 2
  if (password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password)) level = 3
  if (password.length >= 12 && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) level = 4
  el.className = `password-strength level-${level}`
  const label = el.querySelector("span")
  if (label) {
    label.textContent = level === 0 ? "Use at least 8 characters"
      : level === 1 ? "Too short"
      : level === 2 ? "Good"
      : level === 3 ? "Strong"
      : "Excellent"
  }
  return level
}

function updatePasswordMatch() {
  const password = document.getElementById("reg-password")?.value || ""
  const confirm = document.getElementById("reg-confirm-password")?.value || ""
  const status = document.getElementById("password-match-status")
  if (!status) return false

  if (!confirm) {
    status.textContent = "Re-enter your password to confirm it."
    status.className = "auth-field-hint"
    return false
  }
  const matches = password === confirm
  status.innerHTML = matches
    ? `<i class="fas fa-circle-check"></i> Passwords match`
    : `<i class="fas fa-circle-xmark"></i> Passwords do not match`
  status.className = `auth-field-hint ${matches ? "valid" : "invalid"}`
  return matches
}

function updateRegistrationValidation() {
  const username = normalizeHandleInput(document.getElementById("reg-username")?.value)
  const email = document.getElementById("reg-email")?.value.trim() || ""
  const password = document.getElementById("reg-password")?.value || ""
  const confirm = document.getElementById("reg-confirm-password")?.value || ""
  const button = document.getElementById("register-submit-btn")
  updatePasswordStrength()
  const matches = updatePasswordMatch()
  const valid = USERNAME_PATTERN.test(username)
    && registrationState.usernameAvailable
    && registrationState.checkedUsername === username
    && /^\S+@\S+\.\S+$/.test(email)
    && password.length >= 8
    && confirm.length > 0
    && matches
  if (button && !button.querySelector(".fa-spinner")) button.disabled = !valid
  return valid
}

async function checkUsernameAvailability(username) {
  const serial = ++registrationState.requestSerial
  registrationState.usernameAvailable = false
  registrationState.checkedUsername = ""
  setUsernameAvailability(`Checking @${username}…`, "checking")
  updateRegistrationValidation()
  try {
    const response = await fetch(`${AUTH_BASE_URL}/username-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
    const data = await response.json()
    if (serial !== registrationState.requestSerial) return
    registrationState.checkedUsername = username
    registrationState.usernameAvailable = Boolean(response.ok && data.available)
    setUsernameAvailability(
      registrationState.usernameAvailable
        ? `@${username} is available`
        : (data.error || `@${username} is already taken`),
      registrationState.usernameAvailable ? "valid" : "invalid"
    )
  } catch {
    if (serial !== registrationState.requestSerial) return
    registrationState.checkedUsername = ""
    registrationState.usernameAvailable = false
    setUsernameAvailability("Could not check the username. Try again.", "invalid")
  }
  updateRegistrationValidation()
}

function handleRegistrationInput(event) {
  const err = document.getElementById("auth-register-error")
  if (err) err.style.display = "none"

  if (event?.target?.id === "reg-username") {
    const normalized = normalizeHandleInput(event.target.value)
    if (event.target.value !== normalized) event.target.value = normalized
    window.clearTimeout(registrationState.debounceTimer)
    registrationState.requestSerial += 1
    registrationState.usernameAvailable = false
    registrationState.checkedUsername = ""
    if (!normalized) {
      setUsernameAvailability("3–20 lowercase letters, numbers, or underscores.")
    } else if (!USERNAME_PATTERN.test(normalized)) {
      setUsernameAvailability("Username must contain 3–20 valid characters.", "invalid")
    } else {
      setUsernameAvailability(`Checking @${normalized}…`, "checking")
      registrationState.debounceTimer = window.setTimeout(() => checkUsernameAvailability(normalized), 330)
    }
  }
  updateRegistrationValidation()
}

// ════════════════════════════════════════════════
//  FRIENDS, PEOPLE SEARCH & PRIVATE SHARING
// ════════════════════════════════════════════════

const socialState = {
  loaded: false,
  loading: false,
  activeTab: "people",
  friends: [],
  requests: { incoming: [], outgoing: [] },
  blocked: [],
  searchResults: [],
  searchTimer: null,
  searchSerial: 0,
  permissionFriend: null,
  permissionMode: "friend",
  permissionScope: "filters",
  permissionSelected: new Set(),
  permissionMediaFilter: "all",
  permissionAudience: new Set(),
  sharedOwner: null,
  sharedItems: [],
  sharedPermissions: null,
  sharedFilter: "all",
}

function resetSocialState() {
  socialState.loaded = false
  socialState.loading = false
  socialState.activeTab = "people"
  socialState.friends = []
  socialState.requests = { incoming: [], outgoing: [] }
  socialState.blocked = []
  socialState.searchResults = []
  socialState.permissionFriend = null
  socialState.permissionMode = "friend"
  socialState.permissionScope = "filters"
  socialState.permissionSelected = new Set()
  socialState.permissionMediaFilter = "all"
  socialState.permissionAudience = new Set()
  socialState.sharedOwner = null
  socialState.sharedItems = []
  socialState.sharedPermissions = null
  socialState.sharedFilter = "all"
  closeSharingModal()
  closeFriendVault({ silent: true })
}

async function socialFetch(path, options = {}) {
  const response = await fetch(`${SOCIAL_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  if (response.status === 401) {
    handleUnauthorized()
    throw new Error("Session expired")
  }
  let data = null
  try { data = await response.json() } catch { data = {} }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

function syncSocialProfileUI() {
  const username = currentUser?.username || "username"
  const usernameEl = document.getElementById("social-profile-username")
  const avatar = document.getElementById("social-profile-avatar")
  if (usernameEl) usernameEl.textContent = `@${username}`
  if (avatar) avatar.textContent = username.charAt(0).toUpperCase()
  const discoverable = document.getElementById("setting-discoverable")
  const requests = document.getElementById("setting-friend-requests")
  if (discoverable) discoverable.checked = currentUser?.discoverable !== false
  if (requests) requests.checked = currentUser?.allow_friend_requests !== false
}

function updateSocialRequestBadge(count) {
  const value = Math.max(0, Number(count) || 0)
  const badge = document.getElementById("social-request-badge")
  const tabBadge = document.getElementById("requests-tab-count")
  ;[badge, tabBadge].forEach(el => {
    if (!el) return
    el.textContent = value > 99 ? "99+" : String(value)
    el.hidden = value === 0
  })
}

async function refreshSocialRequestBadge() {
  if (!currentUser) return
  try {
    const data = await socialFetch("/requests")
    socialState.requests = data
    updateSocialRequestBadge(data.incoming?.length || 0)
    renderSocialRequests()
  } catch { /* badge refresh stays silent */ }
}

function initSocialUI() {
  const input = document.getElementById("people-search-input")
  input?.addEventListener("input", () => {
    window.clearTimeout(socialState.searchTimer)
    const query = normalizeHandleInput(input.value)
    if (input.value !== query) input.value = query
    if (query.length < 2) {
      socialState.searchSerial += 1
      socialState.searchResults = []
      renderPeopleResults()
      setPeopleSearchStatus("Start typing at least two characters.")
      return
    }
    socialState.searchTimer = window.setTimeout(() => performPeopleSearch(), 300)
  })
  input?.addEventListener("keydown", event => {
    if (event.key === "Enter") performPeopleSearch()
  })
  document.getElementById("people-search-btn")?.addEventListener("click", performPeopleSearch)

  document.querySelectorAll("[data-shared-filter]").forEach(button => {
    button.addEventListener("click", () => {
      socialState.sharedFilter = button.dataset.sharedFilter || "all"
      document.querySelectorAll("[data-shared-filter]").forEach(item => item.classList.toggle("active", item === button))
      renderSharedVault()
    })
  })
  document.getElementById("friend-vault-search")?.addEventListener("input", renderSharedVault)

  document.querySelectorAll('input[name="sharing-scope"]').forEach(input => {
    input.addEventListener("change", () => {
      if (!input.checked) return
      socialState.permissionScope = input.value
      syncSharingScopeUI()
    })
  })
  document.getElementById("sharing-title-search")?.addEventListener("input", renderSharingTitlePicker)
  document.querySelectorAll("[data-sharing-media-filter]").forEach(button => {
    button.addEventListener("click", () => {
      socialState.permissionMediaFilter = button.dataset.sharingMediaFilter || "all"
      document.querySelectorAll("[data-sharing-media-filter]").forEach(item => item.classList.toggle("active", item === button))
      renderSharingTitlePicker()
    })
  })

  const sharingOverlay = document.getElementById("sharing-modal")
  sharingOverlay?.addEventListener("click", event => {
    if (event.target === sharingOverlay) closeSharingModal()
  })
}

async function loadSocialDashboard(force = false) {
  if (!currentUser || socialState.loading) return
  if (socialState.loaded && !force) {
    syncSocialProfileUI()
    return
  }
  socialState.loading = true
  syncSocialProfileUI()
  try {
    await Promise.all([loadSocialFriends(force), loadSocialRequests(force), loadBlockedUsers(force)])
    socialState.loaded = true
  } finally {
    socialState.loading = false
  }
}

function activateSocialTab(tab) {
  socialState.activeTab = tab
  closeFriendVault({ silent: true })
  document.getElementById("social-main-panels")?.removeAttribute("hidden")
  document.querySelectorAll("[data-social-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.socialTab === tab)
  })
  document.querySelectorAll("[data-social-panel]").forEach(panel => {
    const active = panel.dataset.socialPanel === tab
    panel.hidden = !active
    panel.classList.toggle("active", active)
  })
  if (tab === "requests") void loadSocialRequests()
  if (tab === "friends") void loadSocialFriends()
  if (tab === "settings") {
    syncSocialProfileUI()
    void loadBlockedUsers()
  }
}
window.activateSocialTab = activateSocialTab

function setPeopleSearchStatus(message) {
  const status = document.getElementById("people-search-status")
  if (status) status.textContent = message
}

async function performPeopleSearch() {
  if (!currentUser) return
  const query = normalizeHandleInput(document.getElementById("people-search-input")?.value)
  if (query.length < 2) {
    setPeopleSearchStatus("Enter at least two characters.")
    return
  }
  const serial = ++socialState.searchSerial
  setPeopleSearchStatus(`Searching for @${query}…`)
  const results = document.getElementById("people-results")
  if (results) results.innerHTML = `<div class="social-loading"><i class="fas fa-spinner fa-spin"></i> Searching people…</div>`
  try {
    const data = await socialFetch(`/search?q=${encodeURIComponent(query)}`)
    if (serial !== socialState.searchSerial) return
    socialState.searchResults = Array.isArray(data) ? data : []
    setPeopleSearchStatus(socialState.searchResults.length
      ? `${socialState.searchResults.length} account${socialState.searchResults.length === 1 ? "" : "s"} found`
      : "No discoverable account matches this username.")
    renderPeopleResults()
  } catch (error) {
    if (serial !== socialState.searchSerial) return
    socialState.searchResults = []
    setPeopleSearchStatus(error.message)
    renderPeopleResults()
  }
}
window.performPeopleSearch = performPeopleSearch

function personRowTemplate(user, actions, subtitle = "Discoverable account") {
  return `
    <div class="person-row">
      <div class="person-avatar">${escapeHtml(user.username?.charAt(0).toUpperCase() || "U")}</div>
      <div class="person-copy"><strong>@${escapeHtml(user.username)}</strong><small>${escapeHtml(subtitle)}</small></div>
      <div class="person-actions">${actions}</div>
    </div>`
}

function renderPeopleResults() {
  const container = document.getElementById("people-results")
  if (!container) return
  if (!socialState.searchResults.length) {
    container.innerHTML = ""
    return
  }
  container.innerHTML = socialState.searchResults.map(user => {
    let actions = ""
    if (user.relationship === "friends") {
      actions = `<button class="social-action-btn success" onclick="openFriendVault('${escapeHtml(user.username)}')"><i class="fas fa-vault"></i> View Shared Vault</button>`
    } else if (user.relationship === "outgoing") {
      actions = `<button class="social-action-btn" onclick="cancelFriendRequest('${escapeHtml(user.request_id)}')"><i class="fas fa-clock"></i> Cancel Request</button>`
    } else if (user.relationship === "incoming") {
      actions = `<button class="social-action-btn primary" onclick="acceptFriendRequest('${escapeHtml(user.request_id)}')"><i class="fas fa-check"></i> Accept</button>`
    } else if (user.allow_friend_requests === false) {
      actions = `<button class="social-action-btn" disabled><i class="fas fa-user-lock"></i> Requests Off</button>`
    } else {
      actions = `<button class="social-action-btn primary" onclick="sendFriendRequest('${escapeHtml(user.username)}')"><i class="fas fa-user-plus"></i> Add Friend</button>`
    }
    return personRowTemplate(user, actions, user.relationship === "friends" ? "Connected friend" : "Unique public username")
  }).join("")
}

async function sendFriendRequest(username) {
  try {
    await socialFetch("/requests", { method: "POST", body: JSON.stringify({ username }) })
    showToast(`Friend request sent to @${username}`, "success")
    await Promise.all([performPeopleSearch(), loadSocialRequests(true)])
  } catch (error) { showToast(error.message, "error") }
}
window.sendFriendRequest = sendFriendRequest

async function acceptFriendRequest(id) {
  try {
    await socialFetch(`/requests/${encodeURIComponent(id)}/accept`, { method: "POST" })
    showToast("Friend request accepted", "success")
    await Promise.all([loadSocialRequests(true), loadSocialFriends(true)])
    if (document.getElementById("people-search-input")?.value) void performPeopleSearch()
  } catch (error) { showToast(error.message, "error") }
}
window.acceptFriendRequest = acceptFriendRequest

async function declineFriendRequest(id) {
  try {
    await socialFetch(`/requests/${encodeURIComponent(id)}/decline`, { method: "POST" })
    showToast("Friend request declined", "info")
    await loadSocialRequests(true)
  } catch (error) { showToast(error.message, "error") }
}
window.declineFriendRequest = declineFriendRequest

async function cancelFriendRequest(id) {
  try {
    await socialFetch(`/requests/${encodeURIComponent(id)}`, { method: "DELETE" })
    showToast("Friend request cancelled", "info")
    await loadSocialRequests(true)
    if (document.getElementById("people-search-input")?.value) void performPeopleSearch()
  } catch (error) { showToast(error.message, "error") }
}
window.cancelFriendRequest = cancelFriendRequest

async function loadSocialRequests(force = false) {
  if (!currentUser) return
  const incomingContainer = document.getElementById("incoming-requests")
  if (!socialState.requests.incoming.length && incomingContainer && !force) {
    incomingContainer.innerHTML = `<div class="social-loading"><i class="fas fa-spinner fa-spin"></i> Loading requests…</div>`
  }
  try {
    socialState.requests = await socialFetch("/requests")
    updateSocialRequestBadge(socialState.requests.incoming?.length || 0)
    renderSocialRequests()
  } catch (error) {
    if (incomingContainer) incomingContainer.innerHTML = `<div class="social-empty"><p>${escapeHtml(error.message)}</p></div>`
  }
}
window.loadSocialRequests = loadSocialRequests

function renderSocialRequests() {
  const incoming = socialState.requests.incoming || []
  const outgoing = socialState.requests.outgoing || []
  const inEl = document.getElementById("incoming-requests")
  const outEl = document.getElementById("outgoing-requests")
  const inCount = document.getElementById("incoming-count")
  const outCount = document.getElementById("outgoing-count")
  if (inCount) inCount.textContent = incoming.length
  if (outCount) outCount.textContent = outgoing.length
  if (inEl) inEl.innerHTML = incoming.length ? incoming.map(request => personRowTemplate(
    request.user,
    `<button class="social-action-btn primary" onclick="acceptFriendRequest('${request.id}')"><i class="fas fa-check"></i> Accept</button><button class="social-action-btn danger" onclick="declineFriendRequest('${request.id}')"><i class="fas fa-times"></i> Decline</button>`,
    "Wants to connect with you"
  )).join("") : `<div class="social-empty"><i class="fas fa-inbox"></i><h3>No incoming requests</h3><p>New requests will appear here.</p></div>`
  if (outEl) outEl.innerHTML = outgoing.length ? outgoing.map(request => personRowTemplate(
    request.user,
    `<button class="social-action-btn" onclick="cancelFriendRequest('${request.id}')"><i class="fas fa-times"></i> Cancel</button>`,
    "Waiting for a response"
  )).join("") : `<div class="social-empty"><i class="fas fa-paper-plane"></i><h3>No sent requests</h3><p>Search for someone to connect.</p></div>`
}

async function loadSocialFriends(force = false) {
  if (!currentUser) return
  const container = document.getElementById("friends-grid")
  if (!socialState.friends.length && container && !force) {
    container.innerHTML = `<div class="social-loading"><i class="fas fa-spinner fa-spin"></i> Loading friends…</div>`
  }
  try {
    socialState.friends = await socialFetch("/friends")
    renderSocialFriends()
  } catch (error) {
    if (container) container.innerHTML = `<div class="social-empty"><p>${escapeHtml(error.message)}</p></div>`
  }
}
window.loadSocialFriends = loadSocialFriends

function normaliseSharingPermissions(permission = {}) {
  const validScopes = new Set(["filters", "all", "selected", "all_except", "none"])
  const scope = validScopes.has(permission.scope)
    ? permission.scope
    : (permission.full_collection ? "all" : "filters")
  return {
    watching: Boolean(permission.watching),
    watched: Boolean(permission.watched),
    favorites: Boolean(permission.favorites),
    ratings: permission.ratings !== false,
    full_collection: scope === "all",
    scope,
    selected_items: Array.isArray(permission.selected_items) ? permission.selected_items.map(String) : [],
  }
}

function sharingSummary(permission = {}) {
  const normalized = normaliseSharingPermissions(permission)
  if (normalized.scope === "all") return ["All titles", normalized.ratings ? "Ratings shown" : "Ratings private"]
  if (normalized.scope === "selected") return [`${normalized.selected_items.length} selected`, normalized.ratings ? "Ratings shown" : "Ratings private"]
  if (normalized.scope === "all_except") return [`All except ${normalized.selected_items.length}`, normalized.ratings ? "Ratings shown" : "Ratings private"]
  if (normalized.scope === "none") return ["Nothing shared"]
  const labels = []
  if (normalized.watching) labels.push("Watching")
  if (normalized.watched) labels.push("Watched")
  if (normalized.favorites) labels.push("Favorites")
  if (normalized.ratings) labels.push("Ratings")
  return labels.length ? labels : ["Nothing shared"]
}

function renderSocialFriends() {
  const container = document.getElementById("friends-grid")
  if (!container) return
  if (!socialState.friends.length) {
    container.innerHTML = `<div class="social-empty"><i class="fas fa-user-group"></i><h3>Your circle is empty</h3><p>Find someone by @username or share an invite code.</p></div>`
    return
  }
  container.innerHTML = socialState.friends.map(friend => `
    <article class="friend-card">
      <div class="friend-card-head">
        <div class="person-avatar">${escapeHtml(friend.username.charAt(0).toUpperCase())}</div>
        <div><strong>@${escapeHtml(friend.username)}</strong><small>Connected friend</small></div>
      </div>
      <div class="friend-share-summary">${sharingSummary(friend.sharing).map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>
      <div class="friend-card-actions">
        <button class="social-action-btn primary" onclick="openFriendVault('${escapeHtml(friend.username)}')"><i class="fas fa-vault"></i> Shared Vault</button>
        <button class="social-action-btn" onclick="openSharingModal('${escapeHtml(friend.username)}')" title="Sharing permissions"><i class="fas fa-shield-halved"></i></button>
        <button class="social-action-btn danger" onclick="removeFriend('${escapeHtml(friend.username)}')" title="Remove friend"><i class="fas fa-user-minus"></i></button>
        <button class="social-action-btn danger" onclick="blockUser('${escapeHtml(friend.username)}')" title="Block user"><i class="fas fa-ban"></i></button>
      </div>
    </article>`).join("")
}

async function removeFriend(username) {
  if (!window.confirm(`Remove @${username} from your friends?`)) return
  try {
    await socialFetch(`/friends/${encodeURIComponent(username)}`, { method: "DELETE" })
    showToast(`@${username} was removed`, "info")
    await loadSocialFriends(true)
  } catch (error) { showToast(error.message, "error") }
}
window.removeFriend = removeFriend

async function blockUser(username) {
  if (!window.confirm(`Block @${username}? This removes any friendship and requests.`)) return
  try {
    await socialFetch(`/block/${encodeURIComponent(username)}`, { method: "POST" })
    showToast(`@${username} was blocked`, "info")
    await Promise.all([loadSocialFriends(true), loadSocialRequests(true), loadBlockedUsers(true)])
  } catch (error) { showToast(error.message, "error") }
}
window.blockUser = blockUser

async function unblockUser(username) {
  try {
    await socialFetch(`/block/${encodeURIComponent(username)}`, { method: "DELETE" })
    showToast(`@${username} was unblocked`, "success")
    await loadBlockedUsers(true)
  } catch (error) { showToast(error.message, "error") }
}
window.unblockUser = unblockUser

async function loadBlockedUsers() {
  if (!currentUser) return
  const container = document.getElementById("blocked-users")
  try {
    socialState.blocked = await socialFetch("/blocked")
    if (container) container.innerHTML = socialState.blocked.length
      ? socialState.blocked.map(user => personRowTemplate(user, `<button class="social-action-btn" onclick="unblockUser('${escapeHtml(user.username)}')">Unblock</button>`, "Blocked account")).join("")
      : `<div class="social-empty"><i class="fas fa-shield"></i><h3>No blocked users</h3><p>Accounts you block will appear here.</p></div>`
  } catch (error) {
    if (container) container.innerHTML = `<div class="social-empty"><p>${escapeHtml(error.message)}</p></div>`
  }
}

function sharingMediaToken(item = {}) {
  const type = item.media_type === "series" ? "series" : "movie"
  const rawId = item._id || item.id
  if (rawId) return `${type}:${rawId}`
  return `${type}:order:${Number(item.order_number) || 0}`
}

function getSharingCatalog() {
  const source = Array.isArray(_cache.data) && _cache.data.length
    ? _cache.data
    : (readCollectionSnapshot() || currentResults || [])
  const map = new Map()
  source.forEach(raw => {
    const item = normaliseMediaItem(raw)
    const token = sharingMediaToken(item)
    if (!map.has(token)) map.set(token, item)
  })
  return [...map.values()].sort((a, b) => titleCollator.compare(a.title || "", b.title || ""))
}

function updateSharingSelectedSummary() {
  const count = socialState.permissionSelected.size
  const summary = document.getElementById("sharing-selected-summary")
  if (!summary) return
  if (socialState.permissionScope === "selected") summary.textContent = `${count} visible title${count === 1 ? "" : "s"}`
  else if (socialState.permissionScope === "all_except") summary.textContent = `${count} hidden title${count === 1 ? "" : "s"}`
  else summary.textContent = socialState.permissionScope === "all" ? "Entire collection" : socialState.permissionScope === "none" ? "No titles" : "Automatic"
}

function syncSharingScopeUI() {
  document.querySelectorAll('input[name="sharing-scope"]').forEach(input => {
    input.checked = input.value === socialState.permissionScope
    input.closest(".sharing-scope-card")?.classList.toggle("active", input.checked)
  })
  const isFilters = socialState.permissionScope === "filters"
  const usesPicker = socialState.permissionScope === "selected" || socialState.permissionScope === "all_except"
  const filterOptions = document.getElementById("sharing-filter-options")
  const picker = document.getElementById("sharing-title-picker")
  if (filterOptions) filterOptions.hidden = !isFilters
  if (picker) picker.hidden = !usesPicker
  const pickerKicker = document.getElementById("sharing-picker-kicker")
  const pickerTitle = document.getElementById("sharing-picker-title")
  if (pickerKicker) pickerKicker.textContent = socialState.permissionScope === "all_except" ? "Private exceptions" : "Manual selection"
  if (pickerTitle) pickerTitle.textContent = socialState.permissionScope === "all_except" ? "Choose titles to hide" : "Choose visible titles"
  updateSharingSelectedSummary()
  if (usesPicker) renderSharingTitlePicker()
}

function renderSharingTitlePicker() {
  const grid = document.getElementById("sharing-title-grid")
  const empty = document.getElementById("sharing-title-empty")
  if (!grid) return
  const query = String(document.getElementById("sharing-title-search")?.value || "").trim().toLowerCase()
  const mediaFilter = socialState.permissionMediaFilter || "all"
  const catalog = getSharingCatalog()
  const visible = catalog.filter(item => {
    const token = sharingMediaToken(item)
    if (mediaFilter === "selected" && !socialState.permissionSelected.has(token)) return false
    if (mediaFilter === "movie" && item.media_type !== "movie") return false
    if (mediaFilter === "series" && item.media_type !== "series") return false
    if (query && !`${item.title || ""} ${item.release_year || ""} ${item.genre || ""}`.toLowerCase().includes(query)) return false
    return true
  })
  grid.innerHTML = visible.map(item => {
    const token = sharingMediaToken(item)
    const selected = socialState.permissionSelected.has(token)
    const poster = item.poster_url
      ? `<img src="${escapeHtml(item.poster_url)}" alt="" loading="lazy">`
      : `<span class="sharing-title-placeholder"><i class="fas fa-${item.media_type === "series" ? "tv" : "film"}"></i></span>`
    return `<button type="button" class="sharing-title-card${selected ? " selected" : ""}" data-sharing-token="${escapeHtml(token)}" onclick="toggleSharingTitle('${escapeHtml(token)}')" aria-pressed="${selected}">
      <span class="sharing-title-poster">${poster}<i class="fas fa-check"></i></span>
      <span class="sharing-title-copy"><b>${escapeHtml(item.title || "Untitled")}</b><small>${escapeHtml(String(item.release_year || "—"))} · ${item.media_type === "series" ? "Series" : "Movie"}</small></span>
    </button>`
  }).join("")
  if (empty) empty.hidden = visible.length > 0
  updateSharingSelectedSummary()
}

function toggleSharingTitle(token) {
  if (socialState.permissionSelected.has(token)) socialState.permissionSelected.delete(token)
  else socialState.permissionSelected.add(token)
  renderSharingTitlePicker()
}
window.toggleSharingTitle = toggleSharingTitle

function selectAllSharingTitles() {
  const query = String(document.getElementById("sharing-title-search")?.value || "").trim().toLowerCase()
  const mediaFilter = socialState.permissionMediaFilter || "all"
  if (mediaFilter === "selected") return
  getSharingCatalog().forEach(item => {
    if (mediaFilter === "movie" && item.media_type !== "movie") return
    if (mediaFilter === "series" && item.media_type !== "series") return
    if (query && !`${item.title || ""} ${item.release_year || ""} ${item.genre || ""}`.toLowerCase().includes(query)) return
    socialState.permissionSelected.add(sharingMediaToken(item))
  })
  renderSharingTitlePicker()
}
window.selectAllSharingTitles = selectAllSharingTitles

function clearSharingTitles() {
  socialState.permissionSelected.clear()
  renderSharingTitlePicker()
}
window.clearSharingTitles = clearSharingTitles

function renderSharingAudience(currentUsername = "") {
  const container = document.getElementById("sharing-audience-list")
  if (!container) return
  if (socialState.permissionMode === "global") {
    container.innerHTML = ""
    return
  }
  container.innerHTML = socialState.friends.map(friend => {
    const mandatory = friend.username === currentUsername
    const checked = mandatory || socialState.permissionAudience.has(friend.username)
    return `<label class="sharing-audience-chip${checked ? " selected" : ""}">
      <input type="checkbox" value="${escapeHtml(friend.username)}" ${checked ? "checked" : ""} ${mandatory ? "disabled" : ""} onchange="toggleSharingAudience('${escapeHtml(friend.username)}', this.checked)">
      <span>${escapeHtml(friend.username.charAt(0).toUpperCase())}</span><b>@${escapeHtml(friend.username)}</b>${mandatory ? "<small>Current</small>" : ""}
    </label>`
  }).join("")
}

function toggleSharingAudience(username, checked) {
  if (checked) socialState.permissionAudience.add(username)
  else socialState.permissionAudience.delete(username)
  renderSharingAudience(socialState.permissionFriend?.username || "")
}
window.toggleSharingAudience = toggleSharingAudience

function toggleAllSharingAudience() {
  const current = socialState.permissionFriend?.username
  const others = socialState.friends.filter(friend => friend.username !== current)
  const allSelected = others.every(friend => socialState.permissionAudience.has(friend.username))
  if (allSelected) socialState.permissionAudience.clear()
  else others.forEach(friend => socialState.permissionAudience.add(friend.username))
  renderSharingAudience(current || "")
}
window.toggleAllSharingAudience = toggleAllSharingAudience

function fillSharingEditor(permissions, { mode = "friend", user = null } = {}) {
  const normalized = normaliseSharingPermissions(permissions)
  socialState.permissionMode = mode
  socialState.permissionFriend = user
  socialState.permissionScope = normalized.scope
  socialState.permissionSelected = new Set(normalized.selected_items)
  socialState.permissionMediaFilter = "all"
  socialState.permissionAudience = new Set()
  document.getElementById("perm-watching").checked = normalized.watching
  document.getElementById("perm-watched").checked = normalized.watched
  document.getElementById("perm-favorites").checked = normalized.favorites
  document.getElementById("perm-ratings").checked = normalized.ratings
  const search = document.getElementById("sharing-title-search")
  if (search) search.value = ""
  document.querySelectorAll("[data-sharing-media-filter]").forEach(button => button.classList.toggle("active", button.dataset.sharingMediaFilter === "all"))
  const audience = document.getElementById("sharing-audience-section")
  const globalApply = document.getElementById("sharing-global-apply")
  if (audience) audience.hidden = mode === "global"
  if (globalApply) globalApply.hidden = mode !== "global"
  const applyExisting = document.getElementById("apply-defaults-existing")
  if (applyExisting) applyExisting.checked = false
  document.getElementById("sharing-modal-title").textContent = mode === "global" ? "Defaults for all friends" : `Share with @${user.username}`
  document.getElementById("sharing-modal-subtitle").textContent = mode === "global"
    ? "Set the starting access for new friends, with an option to apply it to everyone already connected."
    : "Choose exact cards for this friend, or copy the same access to several friends at once."
  document.getElementById("save-sharing-btn").innerHTML = mode === "global"
    ? `<i class="fas fa-check"></i> Save Defaults`
    : `<i class="fas fa-check"></i> Save Sharing`
  renderSharingAudience(user?.username || "")
  syncSharingScopeUI()
  const modal = document.getElementById("sharing-modal")
  if (modal) modal.hidden = false
  document.body.style.overflow = "hidden"
}

async function openSharingModal(username) {
  try {
    if (!socialState.friends.length) await loadSocialFriends(true)
    const data = await socialFetch(`/friends/${encodeURIComponent(username)}/permissions`)
    fillSharingEditor(data.permissions, { mode: "friend", user: data.user })
  } catch (error) { showToast(error.message, "error") }
}
window.openSharingModal = openSharingModal

async function openGlobalSharingModal() {
  try {
    const data = await socialFetch("/sharing/defaults")
    fillSharingEditor(data.permissions, { mode: "global" })
  } catch (error) { showToast(error.message, "error") }
}
window.openGlobalSharingModal = openGlobalSharingModal

function closeSharingModal() {
  const modal = document.getElementById("sharing-modal")
  if (modal) modal.hidden = true
  if (document.getElementById("detail-modal")?.style.display !== "flex") document.body.style.overflow = ""
  socialState.permissionFriend = null
  socialState.permissionAudience = new Set()
}
window.closeSharingModal = closeSharingModal

async function saveSharingPermissions() {
  const mode = socialState.permissionMode
  const username = socialState.permissionFriend?.username
  if (mode !== "global" && !username) return
  const button = document.getElementById("save-sharing-btn")
  const scope = socialState.permissionScope
  if (scope === "selected" && !socialState.permissionSelected.size) {
    showToast("Choose at least one title, or use Nothing", "info")
    return
  }
  const permissions = {
    watching: document.getElementById("perm-watching").checked,
    watched: document.getElementById("perm-watched").checked,
    favorites: document.getElementById("perm-favorites").checked,
    ratings: document.getElementById("perm-ratings").checked,
    full_collection: scope === "all",
    scope,
    selected_items: (scope === "selected" || scope === "all_except") ? [...socialState.permissionSelected] : [],
  }
  if (button) { button.disabled = true; button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving…` }
  try {
    if (mode === "global") {
      const applyToExisting = Boolean(document.getElementById("apply-defaults-existing")?.checked)
      await socialFetch("/sharing/defaults", {
        method: "PUT",
        body: JSON.stringify({ permissions, apply_to_existing: applyToExisting }),
      })
      showToast(applyToExisting ? "Defaults saved and applied to all friends" : "Sharing defaults saved", "success")
    } else {
      const usernames = [username, ...socialState.permissionAudience].filter((value, index, array) => array.indexOf(value) === index)
      if (usernames.length === 1) {
        await socialFetch(`/friends/${encodeURIComponent(username)}/permissions`, {
          method: "PUT",
          body: JSON.stringify(permissions),
        })
      } else {
        await socialFetch("/sharing/bulk", {
          method: "PUT",
          body: JSON.stringify({ usernames, permissions }),
        })
      }
      showToast(usernames.length === 1 ? `Sharing updated for @${username}` : `Same access applied to ${usernames.length} friends`, "success")
    }
    closeSharingModal()
    await loadSocialFriends(true)
  } catch (error) { showToast(error.message, "error") }
  if (button) {
    button.disabled = false
    button.innerHTML = mode === "global" ? `<i class="fas fa-check"></i> Save Defaults` : `<i class="fas fa-check"></i> Save Sharing`
  }
}
window.saveSharingPermissions = saveSharingPermissions

async function openFriendVault(username) {
  const main = document.getElementById("social-main-panels")
  const panel = document.getElementById("friend-vault-panel")
  const grid = document.getElementById("friend-vault-grid")
  if (main) main.hidden = true
  if (panel) panel.hidden = false
  if (grid) grid.innerHTML = `<div class="social-loading"><i class="fas fa-spinner fa-spin"></i> Opening @${escapeHtml(username)}'s shared vault…</div>`
  socialState.sharedOwner = { username }
  socialState.sharedItems = []
  socialState.sharedFilter = "all"
  document.querySelectorAll("[data-shared-filter]").forEach(button => button.classList.toggle("active", button.dataset.sharedFilter === "all"))
  const search = document.getElementById("friend-vault-search")
  if (search) search.value = ""
  try {
    const data = await socialFetch(`/friends/${encodeURIComponent(username)}/vault`)
    socialState.sharedOwner = data.owner
    socialState.sharedPermissions = data.permissions
    socialState.sharedItems = (data.items || []).map(item => ({
      ...normaliseMediaItem(item),
      display_year: item.media_type === "series" && item.end_year
        ? `${item.release_year}–${item.end_year}`
        : String(item.release_year || "—"),
      __shared_read_only: true,
    }))
    document.getElementById("friend-vault-name").textContent = `@${data.owner.username}`
    document.getElementById("friend-vault-avatar").textContent = data.owner.username.charAt(0).toUpperCase()
    document.getElementById("friend-stat-total").textContent = data.stats?.total || 0
    document.getElementById("friend-stat-movies").textContent = data.stats?.movies || 0
    document.getElementById("friend-stat-series").textContent = data.stats?.series || 0
    document.getElementById("friend-vault-access").textContent = `${sharingSummary(data.permissions).join(" • ")}. Read-only access.`
    renderSharedVault()
  } catch (error) {
    if (grid) grid.innerHTML = `<div class="social-empty"><i class="fas fa-triangle-exclamation"></i><h3>Could not open this vault</h3><p>${escapeHtml(error.message)}</p></div>`
  }
}
window.openFriendVault = openFriendVault

function closeFriendVault({ silent = false } = {}) {
  const main = document.getElementById("social-main-panels")
  const panel = document.getElementById("friend-vault-panel")
  if (main) main.hidden = false
  if (panel) panel.hidden = true
  if (!silent) activateSocialTab("friends")
}
window.closeFriendVault = closeFriendVault

function getFilteredSharedItems() {
  const query = normalizeMediaSearchTitle(document.getElementById("friend-vault-search")?.value || "").toLowerCase()
  return socialState.sharedItems.filter(item => {
    const filter = socialState.sharedFilter
    const categoryMatch = filter === "all"
      || (filter === "favorites" ? item.favorite : item.watch_status === filter)
    const queryMatch = !query || normalizeMediaSearchTitle(item.title).toLowerCase().includes(query)
    return categoryMatch && queryMatch
  })
}

function buildSharedMediaCard(item) {
  const card = document.createElement("article")
  card.className = "shared-media-card"
  const hasPoster = isDisplayablePosterSource(item.poster_url)
  const rating = item.rating === null ? "Private" : `★ ${Number(item.rating || 0).toFixed(1)}`
  card.innerHTML = `
    <div class="shared-media-poster">
      ${hasPoster ? `<img src="${escapeHtml(item.poster_url)}" alt="${escapeHtml(item.title)}" loading="lazy">` : `<div class="shared-media-placeholder"><i class="fas fa-${item.media_type === "movie" ? "film" : "tv"}"></i></div>`}
      <div class="shared-media-badges"><span>${escapeHtml(item.display_year)}</span><span>${escapeHtml(rating)}</span></div>
      ${item.watch_status ? `<div class="shared-media-status"><i class="fas fa-${item.watch_status === "watching" ? "play" : "circle-check"}"></i> ${escapeHtml(item.watch_status.replace(/_/g, " "))}${item.favorite ? " • ♥" : ""}</div>` : item.favorite ? `<div class="shared-media-status"><i class="fas fa-heart"></i> Favorite</div>` : ""}
    </div>
    <div class="shared-media-body"><strong title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</strong><small>${escapeHtml(item.genre || (item.media_type === "movie" ? "Movie" : "Series"))}</small></div>`
  card.addEventListener("click", () => showDetailModal(item))
  return card
}

function renderSharedVault() {
  const grid = document.getElementById("friend-vault-grid")
  const empty = document.getElementById("friend-vault-empty")
  if (!grid || !empty) return
  const items = getFilteredSharedItems()
  grid.innerHTML = ""
  empty.hidden = items.length > 0
  if (!items.length) return
  const fragment = document.createDocumentFragment()
  items.forEach(item => fragment.appendChild(buildSharedMediaCard(item)))
  grid.appendChild(fragment)
}

async function createInviteCode() {
  const button = document.getElementById("create-invite-btn")
  if (button) { button.disabled = true; button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating…` }
  try {
    const data = await socialFetch("/invites", { method: "POST", body: "{}" })
    const box = document.getElementById("generated-invite")
    document.getElementById("generated-invite-code").textContent = data.code
    document.getElementById("generated-invite-expiry").textContent = `Expires ${new Date(data.expires_at).toLocaleString()}`
    if (box) box.hidden = false
    showToast("One-time invite code created", "success")
  } catch (error) { showToast(error.message, "error") }
  if (button) { button.disabled = false; button.innerHTML = `<i class="fas fa-ticket"></i> Generate Code` }
}
window.createInviteCode = createInviteCode

async function copyInviteCode() {
  const code = document.getElementById("generated-invite-code")?.textContent
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    showToast("Invite code copied", "success")
  } catch { showToast(`Copy this code: ${code}`, "info") }
}
window.copyInviteCode = copyInviteCode

async function joinInviteCode() {
  const input = document.getElementById("join-invite-code")
  const code = input?.value.trim().toUpperCase()
  if (!code) { showToast("Enter an invite code", "error"); return }
  try {
    const data = await socialFetch("/invites/join", { method: "POST", body: JSON.stringify({ code }) })
    if (input) input.value = ""
    showToast(`Friend request sent to @${data.user.username}`, "success")
    await loadSocialRequests(true)
  } catch (error) { showToast(error.message, "error") }
}
window.joinInviteCode = joinInviteCode

async function saveSocialSettings() {
  const discoverable = Boolean(document.getElementById("setting-discoverable")?.checked)
  const allow_friend_requests = Boolean(document.getElementById("setting-friend-requests")?.checked)
  try {
    const response = await fetch(`${AUTH_BASE_URL}/settings`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ discoverable, allow_friend_requests }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Could not save settings")
    currentUser = { ...currentUser, ...(data.user || {}) }
    syncSocialProfileUI()
    showToast("Privacy settings saved", "success")
  } catch (error) { showToast(error.message, "error") }
}
window.saveSocialSettings = saveSocialSettings
