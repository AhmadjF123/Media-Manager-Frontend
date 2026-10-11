/* Cinéma | Discovery + Release Radar — isolated UI controller.
   All requests are account-scoped. This file does not change existing vault data. */
(() => {
  "use strict";
  const BASE = AUTH_BASE_URL.replace(/\/auth$/, "");
  const TICK_MS = 20 * 60_000;
  const ALERT_REFRESH_MS = 15 * 60_000;
  const DISCOVER_CACHE_MS = 7 * 60_000;
  const discovery = { items: [], map: new Map(), nextPage: null, loading: false, serial: 0,
    controller: null, savedParams: "", searchKey: "", cached: new Map() };
  const radar = { items: [], map: new Map(), preferences: { movies: true, seasons: true },
    loading: false, serial: 0, scanning: false, filter: "all", loadedAt: 0, checkTimer: null, pollTimer: null,
    userKey: "" };
  let initialized = false;
  const el = id => document.getElementById(id);
  const h = value => escapeHtml(String(value ?? ""));

  function status(id, message, error = false) {
    const node = el(id);
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = error ? "error" : "info";
  }
  function toDateString(raw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(raw || ""))) return "Date TBA";
    return new Date(`${raw}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function errorMessage(error) {
    return /\b404\b/.test(String(error?.message || ""))
      ? "Update the backend server.js and intelligence.js to activate this feature."
      : error?.message || "The service is temporarily unavailable.";
  }
  async function api(path, options = {}) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", onAbort, { once: true });
    }
    const timeout = setTimeout(() => controller.abort(), options.timeout || 17_000);
    try {
      const response = await fetch(`${BASE}${path}`, {
        method: options.method || "GET", headers: authHeaders(),
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        if (currentUser) handleUnauthorized();
        throw new Error("Please sign in to continue.");
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      return data;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }
  function cardHtml(item, source) {
    const isAlert = source === "alert";
    const upcoming = isAlert ? item.phase === "upcoming" : item.is_upcoming;
    const poster = isDisplayablePosterSource(item.poster_url)
      ? `<img src="${h(mediaImageSize(item.poster_url, 342))}" alt="${h(item.title)} poster" loading="lazy" decoding="async" width="342" height="256">`
      : `<i class="fas fa-${item.media_type === "series" ? "tv" : "film"}" aria-hidden="true"></i>`;
    const phaseLabel = isAlert
      ? item.kind === "season" ? `${upcoming ? "Upcoming" : "New"} season ${Number(item.season_number) || 1}`
        : upcoming ? "Coming soon" : "Just released"
      : item.in_vault ? item.is_watched ? "Already watched" : "In your vault"
        : upcoming ? "Coming soon" : item.media_type === "series" ? "Series" : "Movie";
    const date = isAlert ? toDateString(item.date) : String(item.release_year || "—");
    const rating = Number(item.tmdb_rating) > 0 ? Number(item.tmdb_rating).toFixed(1) : "—";
    const detail = item.kind === "season" ? `Season ${item.season_number} · ${item.title}` : item.title;
    const reason = isAlert ? item.reason : (item.genres?.slice(0, 2).join(" · ") || item.reason || "Recommended for you");
    return `<article class="intel-media-card${item.is_read ? " is-read" : ""}" data-intel-key="${h(item.key || `${item.media_type}:${item.tmdb_id}`)}">
      <div class="intel-media-poster">${poster}
        <span class="intel-media-tag${upcoming ? " is-upcoming" : ""}">${h(phaseLabel)}</span>
        ${isAlert && !item.is_read ? '<span class="intel-unread-dot" aria-label="Unread"></span>' : ""}
      </div>
      <div class="intel-media-info">
        <h3 title="${h(detail)}">${h(item.title)}</h3>
        <div class="intel-media-meta"><span><i class="far fa-calendar"></i> ${h(date)}</span><span><i class="fas fa-star"></i> ${h(rating)}</span></div>
        <p class="intel-media-reason">${h(isAlert ? `${item.kind === "season" ? `Season ${item.season_number} · ` : ""}${reason}` : reason)}</p>
      </div>
      <div class="intel-media-actions">
        <button type="button" data-intel-action="details"><i class="fas fa-circle-info"></i> Details</button>
        ${isAlert
          ? item.is_read ? '' : '<button type="button" data-intel-action="read"><i class="fas fa-check"></i> Read</button>'
          : item.in_vault ? '<button type="button" class="is-primary" data-intel-action="details">Open vault</button>'
            : '<button type="button" class="is-primary" data-intel-action="add"><i class="fas fa-plus"></i> Add</button>'}
      </div>
    </article>`;
  }

  function renderDiscovery() {
    const grid = el("intel-discovery-results");
    if (!grid) return;
    discovery.map = new Map(discovery.items.map(item => [`${item.media_type}:${item.tmdb_id}`, item]));
    grid.innerHTML = discovery.items.map(item => cardHtml(item, "discover")).join("");
    const more = el("intel-discovery-more");
    if (more) { more.hidden = !discovery.nextPage; more.disabled = discovery.loading; }
  }
  function discoverParams() {
    const params = new URLSearchParams();
    const fields = [
      ["q", "intel-discovery-query"], ["type", "intel-discovery-type"],
      ["genre", "intel-discovery-genre"], ["min_rating", "intel-discovery-rating"],
      ["sort", "intel-discovery-sort"],
    ];
    for (const [key, id] of fields) {
      const value = el(id)?.value.trim();
      if (value) params.set(key, value);
    }
    params.set("exclude_watched", el("intel-discovery-exclude")?.checked ? "1" : "0");
    return params;
  }
  function understood(parsed) {
    const container = el("intel-discovery-understood");
    if (!container) return;
    const chips = [parsed.type === "series" ? "TV series" : "Movies", ...(parsed.genres || []),
      parsed.min_rating !== null ? `★ ${parsed.min_rating}+` : "",
      parsed.max_runtime ? `≤ ${parsed.max_runtime} min` : "",
      parsed.year_from ? `From ${parsed.year_from}` : "",
      parsed.year_to ? `Until ${parsed.year_to}` : "",
      parsed.upcoming ? "Upcoming included" : "",
      parsed.title_search ? `Title: ${parsed.title_search}` : "",
    ].filter(Boolean);
    container.innerHTML = chips.map(chip => `<span>${h(chip)}</span>`).join("");
    container.hidden = false;
  }
  async function runDiscovery({ more = false } = {}) {
    if (!currentUser) return switchView("collection");
    if (discovery.loading && more) return;
    if (!more) {
      if (discovery.controller) discovery.controller.abort();
      discovery.serial++;
      discovery.items = [];
      discovery.nextPage = null;
      discovery.savedParams = discoverParams().toString();
      el("intel-discovery-understood").hidden = true;
    }
    const serial = discovery.serial;
    const page = more ? discovery.nextPage : 1;
    if (!page) return;
    const params = new URLSearchParams(discovery.savedParams);
    params.set("page", String(page));
    const key = `${radar.userKey}:${params.toString()}`;
    discovery.loading = true;
    const controller = new AbortController();
    discovery.controller = controller;
    el("intel-discovery-loading").hidden = more;
    const btn = el("intel-discovery-submit");
    if (btn) btn.disabled = true;
    const moreBtn = el("intel-discovery-more");
    if (moreBtn) moreBtn.disabled = true;
    status("intel-discovery-status", more ? "Looking for more matching titles…" : "Understanding your request and searching the catalog…");
    if (!more) renderDiscovery();
    try {
      const cached = discovery.cached.get(key);
      const data = cached?.expires > Date.now() ? cached.data
        : await api(`/discovery/search?${params}`, { signal: controller.signal, timeout: 17_000 });
      if (serial !== discovery.serial || radar.userKey !== key.split(":")[0]) return;
      if (!cached || cached.expires <= Date.now()) {
        discovery.cached.set(key, { data, expires: Date.now() + DISCOVER_CACHE_MS });
        if (discovery.cached.size > 28) discovery.cached.delete(discovery.cached.keys().next().value);
      }
      const existing = new Set(discovery.items.map(item => `${item.media_type}:${item.tmdb_id}`));
      for (const item of data.results || []) {
        const identity = `${item.media_type}:${item.tmdb_id}`;
        if (!existing.has(identity)) { existing.add(identity); discovery.items.push(item); }
      }
      discovery.nextPage = data.next_page || null;
      understood(data.parsed || {});
      renderDiscovery();
      status("intel-discovery-status", discovery.items.length
        ? `${discovery.items.length} matching titles · ${data.next_page ? "Load more to keep exploring." : "You've reached the end of these results."}`
        : "No matches on this page. Try another genre, lower rating or different search.");
      // Hover prefetch is handled by existing TMDB detail cache, with no upfront detail flood.
    } catch (error) {
      if (error?.name === "AbortError" || serial !== discovery.serial) return;
      status("intel-discovery-status", errorMessage(error), true);
    } finally {
      if (serial === discovery.serial) {
        discovery.loading = false;
        el("intel-discovery-loading").hidden = true;
        if (btn) btn.disabled = false;
        if (moreBtn) moreBtn.disabled = !discovery.nextPage;
      }
    }
  }

  function updateBadge() {
    const count = radar.items.filter(a => !a.is_read).length;
    const badge = el("release-unread-badge");
    if (badge) { badge.hidden = count === 0; badge.textContent = count > 99 ? "99+" : String(count); }
    const markAll = el("intel-read-all");
    if (markAll) markAll.disabled = count === 0;
    if (el("intel-alert-total")) el("intel-alert-total").textContent = String(radar.items.length);
  }
  function renderAlerts() {
    const grid = el("intel-alert-results");
    if (!grid) return;
    const filtered = radar.items.filter(item => radar.filter === "all" || radar.filter === item.phase);
    radar.map = new Map(radar.items.map(item => [item.key, item]));
    grid.innerHTML = filtered.map(item => cardHtml(item, "alert")).join("");
    updateBadge();
    if (!radar.scanning) {
      status("intel-alert-status", filtered.length
        ? `${filtered.length} release alerts shown · ${radar.items.filter(a => !a.is_read).length} unread. Dates reflect TMDB information.`
        : radar.items.length ? "Nothing in this category yet. Try another filter."
          : "No new releases or season premieres matched your collection in the current date window.");
    }
  }
  function seenStorageKey() { return `cinema_release_seen_v2:${radar.userKey}`; }
  function maybeNotifyNewAlerts(items) {
    if (!radar.userKey || !items.length) return;
    try {
      const key = seenStorageKey();
      const stored = localStorage.getItem(key);
      const previous = new Set(stored ? JSON.parse(stored) : []);
      const current = [...new Set([...previous, ...items.map(item => item.key)])].slice(-350);
      localStorage.setItem(key, JSON.stringify(current));
      if (!stored || !('Notification' in window) || Notification.permission !== "granted") return;
      for (const alert of items.filter(item => !item.is_read && !previous.has(item.key)).slice(0, 3)) {
        const notification = new Notification(alert.kind === "season" ? `New season: ${alert.title}` : `Movie release: ${alert.title}`, {
          body: `${alert.kind === "season" ? `Season ${alert.season_number} · ` : ""}${alert.phase === "upcoming" ? "Coming" : "Released"} ${toDateString(alert.date)}`,
          tag: `cinema-${radar.userKey}-${alert.key}`,
        });
        notification.onclick = () => { window.focus(); switchView("alerts"); notification.close(); };
      }
    } catch (_) { /* Private browsing and disabled storage must not block alerts. */ }
  }
  function scheduleScanPoll() {
    if (radar.pollTimer) clearTimeout(radar.pollTimer);
    radar.pollTimer = null;
    if (radar.scanning && currentUser) {
      radar.pollTimer = setTimeout(() => { radar.pollTimer = null; void loadAlerts(); }, 4000);
    }
  }
  async function loadAlerts({ force = false, background = false } = {}) {
    if (!currentUser || radar.loading) return;
    if (!force && !radar.scanning && radar.loadedAt && Date.now() - radar.loadedAt < ALERT_REFRESH_MS) {
      renderAlerts();
      return;
    }
    const currentIdentity = radar.userKey;
    const serial = ++radar.serial;
    radar.loading = true;
    if (!background && !radar.items.length) el("intel-alert-loading").hidden = false;
    status("intel-alert-status", "Checking actual movie release dates and season premieres…");
    try {
      const data = await api(`/alerts${force ? "?refresh=1" : ""}`);
      if (serial !== radar.serial || radar.userKey !== currentIdentity) return;
      radar.scanning = Boolean(data.scanning);
      radar.preferences = data.preferences || { movies: true, seasons: true };
      radar.items = Array.isArray(data.alerts) ? data.alerts : [];
      radar.loadedAt = radar.scanning ? 0 : Date.now();
      if (el("intel-alert-movies")) el("intel-alert-movies").checked = radar.preferences.movies;
      if (el("intel-alert-seasons")) el("intel-alert-seasons").checked = radar.preferences.seasons;
      maybeNotifyNewAlerts(radar.items);
      renderAlerts();
      if (radar.scanning) status("intel-alert-status", "Scanning the latest releases for your saved shows. Results update automatically…");
      scheduleScanPoll();
    } catch (error) {
      if (serial !== radar.serial || radar.userKey !== currentIdentity) return;
      status("intel-alert-status", errorMessage(error), true);
    } finally {
      if (serial === radar.serial) {
        radar.loading = false;
        el("intel-alert-loading").hidden = true;
      }
    }
  }
  async function readAlertKeys(keys) {
    if (!keys.length) return;
    const initialIdentity = radar.userKey;
    try {
      await api("/alerts/read", { method: "POST", body: { keys }, timeout: 15_000 });
      if (initialIdentity !== radar.userKey) return;
      const set = new Set(keys);
      radar.items.forEach(item => { if (set.has(item.key)) item.is_read = true; });
      renderAlerts();
    } catch (error) { showToast(`Could not save read status: ${errorMessage(error)}`, "error"); }
  }
  function handleCardClick(event, type) {
    const action = event.target.closest("[data-intel-action]");
    const card = event.target.closest(".intel-media-card");
    if (!action || !card) return;
    const item = (type === "alert" ? radar.map : discovery.map).get(card.dataset.intelKey);
    if (!item) return;
    if (type === "alert" && !item.is_read) void readAlertKeys([item.key]);
    if (action.dataset.intelAction === "read") return;
    if (action.dataset.intelAction === "add") prefillRecommendation(item);
    else openRecommendationItem(item);
  }
  async function saveAlertSettings() {
    const payload = { movies: Boolean(el("intel-alert-movies")?.checked), seasons: Boolean(el("intel-alert-seasons")?.checked) };
    try {
      const data = await api("/alerts/settings", { method: "PATCH", body: payload });
      radar.preferences = data.preferences;
      radar.items = radar.items.filter(item => data.preferences[item.kind === "season" ? "seasons" : "movies"]);
      renderAlerts();
      radar.loadedAt = 0;
      await loadAlerts();
      showToast("Release preferences saved to your account", "success");
    } catch (error) {
      el("intel-alert-movies").checked = radar.preferences.movies;
      el("intel-alert-seasons").checked = radar.preferences.seasons;
      showToast(errorMessage(error), "error");
    }
  }
  async function enableBrowserNotifications() {
    if (!("Notification" in window) || !window.isSecureContext) {
      showToast("Browser alerts need HTTPS and browser notification support", "info"); return;
    }
    if (Notification.permission === "denied") {
      showToast("Notifications are blocked in your browser settings", "info"); return;
    }
    const permission = await Notification.requestPermission();
    syncBrowserButton();
    showToast(permission === "granted" ? "Browser alerts enabled while Cinéma is open" : "Browser alerts were not enabled", "info");
  }
  function syncBrowserButton() {
    const button = el("intel-enable-desktop");
    if (!button) return;
    const enabled = "Notification" in window && Notification.permission === "granted";
    button.innerHTML = enabled ? '<i class="fas fa-check"></i> Browser alerts enabled' : '<i class="far fa-bell"></i> Enable browser alerts';
  }
  function cancelBackgroundWork() {
    if (radar.checkTimer) clearInterval(radar.checkTimer);
    if (radar.pollTimer) clearTimeout(radar.pollTimer);
    radar.checkTimer = radar.pollTimer = null;
    radar.serial++;
    radar.loading = false;
    radar.scanning = false;
    if (discovery.controller) discovery.controller.abort();
    discovery.serial++;
  }
  function onAuthChange(isSignedIn) {
    const identity = isSignedIn ? String(currentUser?.username || "") : "";
    if (identity === radar.userKey && (!identity || radar.checkTimer)) return;
    cancelBackgroundWork();
    radar.userKey = identity;
    radar.items = [];
    radar.map.clear();
    radar.loadedAt = 0;
    discovery.items = [];
    discovery.map.clear();
    discovery.nextPage = null;
    discovery.cached.clear();
    updateBadge();
    if (!identity) return;
    radar.checkTimer = setInterval(() => {
      if (currentUser && !radar.scanning) void loadAlerts({ background: true });
    }, TICK_MS);
    // Do not compete with the instant vault restore or For You prewarming on login.
    setTimeout(() => {
      if (radar.userKey === identity && currentUser) void loadAlerts({ background: true });
    }, 2400);
  }
  function onView(view) {
    if (view === "alerts") {
      if (!radar.items.length || radar.scanning || Date.now() - radar.loadedAt > ALERT_REFRESH_MS) void loadAlerts();
      else renderAlerts();
    }
    if (view === "discover") {
      requestAnimationFrame(() => { if (el("view-discover")?.style.display !== "none") el("intel-discovery-query")?.focus({ preventScroll: true }); });
    }
  }
  function onMediaChange() {
    discovery.cached.clear();
    radar.loadedAt = 0;
    if (radar.userKey && el("view-alerts")?.style.display !== "none") void loadAlerts({ force: true, background: true });
  }
  function init() {
    if (initialized) return;
    initialized = true;
    el("intel-discovery-form")?.addEventListener("submit", event => { event.preventDefault(); void runDiscovery(); });
    document.querySelector(".intel-examples")?.addEventListener("click", event => {
      const example = event.target.closest("[data-intel-example]");
      if (!example) return;
      el("intel-discovery-query").value = example.dataset.intelExample;
      void runDiscovery();
    });
    el("intel-discovery-more")?.addEventListener("click", () => { void runDiscovery({ more: true }); });
    el("intel-discovery-exclude")?.addEventListener("change", () => { if (discovery.items.length) void runDiscovery(); });
    for (const id of ["intel-discovery-type", "intel-discovery-genre", "intel-discovery-rating", "intel-discovery-sort"]) {
      el(id)?.addEventListener("change", () => { if (discovery.items.length) void runDiscovery(); });
    }
    el("intel-discovery-results")?.addEventListener("click", event => handleCardClick(event, "discovery"));
    el("intel-alert-results")?.addEventListener("click", event => handleCardClick(event, "alert"));
    document.querySelector(".intel-alert-tabs")?.addEventListener("click", event => {
      const btn = event.target.closest("[data-alert-filter]");
      if (!btn) return;
      radar.filter = btn.dataset.alertFilter;
      document.querySelectorAll("[data-alert-filter]").forEach(node => node.classList.toggle("active", node === btn));
      renderAlerts();
    });
    el("intel-read-all")?.addEventListener("click", () => {
      void readAlertKeys(radar.items.filter(item => !item.is_read).map(item => item.key));
    });
    el("intel-refresh-alerts")?.addEventListener("click", () => { void loadAlerts({ force: true }); });
    el("intel-alert-movies")?.addEventListener("change", () => { void saveAlertSettings(); });
    el("intel-alert-seasons")?.addEventListener("change", () => { void saveAlertSettings(); });
    el("intel-enable-desktop")?.addEventListener("click", () => { void enableBrowserNotifications(); });
    syncBrowserButton();
  }
  window.CinemaIntel = { init, onAuthChange, onView, onMediaChange, loadAlerts, runDiscovery };
})();
