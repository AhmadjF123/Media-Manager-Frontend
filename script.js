document.addEventListener("DOMContentLoaded", () => {


  const moviesOriginal = [
    { title: "The Shawshank Redemption", genre: "Drama", rating: "9.3" },
    { title: "The Godfather", genre: "Crime", rating: "9.2" },
    { title: "The Dark Knight", genre: "Action", rating: "9.0" },
    { title: "Pulp Fiction", genre: "Crime", rating: "8.9" },
    { title: "Schindler's List", genre: "Drama", rating: "8.9" },
  ]

  const seriesOriginal = [
    { title: "Breaking Bad", genre: "Drama", rating: "9.5" },
    { title: "Game of Thrones", genre: "Fantasy", rating: "9.3" },
    { title: "The Sopranos", genre: "Crime", rating: "9.2" },
    { title: "The Wire", genre: "Crime", rating: "8.8" },
    { title: "Mad Men", genre: "Drama", rating: "8.6" },
  ]

  searchButtonOriginal.addEventListener("click", searchOriginal)

  searchInputOriginal.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchOriginal()
    }
  })

  function searchOriginal() {
    const searchQueryOriginal = searchInputOriginal.value.trim()
    const mediaTypeOriginal = mediaTypeSelectOriginal.value
    const searchByOriginal = searchBySelectOriginal.value

    if (!searchQueryOriginal) {
      displayResultsOriginal("Please enter a search query.")
      return
    }

    const searchResultsOriginal = searchMediaOriginal(searchQueryOriginal, mediaTypeOriginal, searchByOriginal)

    if (searchResultsOriginal.length > 0) {
      displayResultsOriginal(searchResultsOriginal)
    } else {
      displayResultsOriginal("No results found.")
    }
  }

  function searchMediaOriginal(searchQueryOriginal, mediaTypeOriginal, searchByOriginal) {
    let resultsOriginal = []

    if (mediaTypeOriginal === "movie" || mediaTypeOriginal === "all") {
      resultsOriginal = resultsOriginal.concat(
        moviesOriginal.filter((movieOriginal) => {
          if (searchByOriginal === "title") {
            return movieOriginal.title.toLowerCase().includes(searchQueryOriginal.toLowerCase())
          } else if (searchByOriginal === "genre") {
            return movieOriginal.genre.toLowerCase().includes(searchQueryOriginal.toLowerCase())
          } else if (searchByOriginal === "rating") {
            const ratingOriginal = Number.parseFloat(searchQueryOriginal)
            if (isNaN(ratingOriginal)) return false
            return movieOriginal.rating !== undefined && Number.parseFloat(movieOriginal.rating) === ratingOriginal
          }
          return false
        }),
      )
    }

    if (mediaTypeOriginal === "series" || mediaTypeOriginal === "all") {
      resultsOriginal = resultsOriginal.concat(
        seriesOriginal.filter((serieOriginal) => {
          if (searchByOriginal === "title") {
            return serieOriginal.title.toLowerCase().includes(searchQueryOriginal.toLowerCase())
          } else if (searchByOriginal === "genre") {
            return serieOriginal.genre.toLowerCase().includes(searchQueryOriginal.toLowerCase())
          } else if (searchByOriginal === "rating") {
            const ratingOriginal = Number.parseFloat(searchQueryOriginal)
            if (isNaN(ratingOriginal)) return false
            return serieOriginal.rating !== undefined && Number.parseFloat(serieOriginal.rating) === ratingOriginal
          }
          return false
        }),
      )
    }

    return resultsOriginal
  }

  function displayResultsOriginal(resultsOriginal) {
    resultsContainerOriginal.innerHTML = ""

    if (typeof resultsOriginal === "string") {
      const messageOriginal = document.createElement("p")
      messageOriginal.textContent = resultsOriginal
      resultsContainerOriginal.appendChild(messageOriginal)
    } else {
      const listOriginal = document.createElement("ul")
      resultsOriginal.forEach((resultOriginal) => {
        const itemOriginal = document.createElement("li")
        itemOriginal.textContent = `${resultOriginal.title} (${resultOriginal.genre}, Rating: ${resultOriginal.rating})`
        listOriginal.appendChild(itemOriginal)
      })
      resultsContainerOriginal.appendChild(listOriginal)
    }
  }
})

// إضافة مستمع أحداث للأخطاء غير المعالجة
window.addEventListener("error", (event) => {
  console.error("Uncaught error:", event.error)
  showToast("Error: " + event.error.message, "error")
})

// تعريف دالة للتحقق من وجود العناصر في DOM
function checkElements() {
  const elements = [
    { name: "editBtn", element: document.getElementById("edit-btn") },
    { name: "deleteBtn", element: document.getElementById("delete-btn") },
    { name: "editModal", element: document.getElementById("edit-modal") },
    { name: "editForm", element: document.getElementById("edit-form") },
    { name: "editOrderInput", element: document.getElementById("edit-order") },
    { name: "editTitleInput", element: document.getElementById("edit-title") },
    { name: "editGenreInput", element: document.getElementById("edit-genre") },
    { name: "editReleaseYearInput", element: document.getElementById("edit-release-year") },
    { name: "editEndYearInput", element: document.getElementById("edit-end-year") },
    { name: "editRatingInput", element: document.getElementById("edit-rating") },
    { name: "editMediaTypeInput", element: document.getElementById("edit-media-type") },
  ]

  let allFound = true
  elements.forEach((item) => {
    if (!item.element) {
      console.error(`Element not found: ${item.name}`)
      allFound = false
    }
  })

  return allFound
}

// استدعاء دالة التحقق عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  if (!checkElements()) {
    showToast("Some UI elements are missing. The application may not work correctly.", "error")
  }
})

// API Configuration
const TMDB_API_KEY = "001a45ee2ffa1d6f2f16fc4c16ae276a"
const OMDB_API_KEY = "5812b153"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500"
const API_BASE_URL = "https://media-manager-backend-ai69.onrender.com/api/media";

// DOM Elements
const searchInput = document.getElementById("search-input")
const searchBySelect = document.getElementById("search-by")
const filterTypeSelect = document.getElementById("filter-type")
const searchBtn = document.getElementById("search-btn")
const resultsTable = document.getElementById("results-table")
const resultsBody = document.getElementById("results-body")
const statusLabel = document.getElementById("status-label")
const selectAllCheckbox = document.getElementById("select-all")
const editBtn = document.getElementById("edit-btn")
const deleteBtn = document.getElementById("delete-btn")
const addForm = document.getElementById("add-form")
const titleInput = document.getElementById("title")
const genreInput = document.getElementById("genre")
const releaseYearInput = document.getElementById("release-year")
const endYearInput = document.getElementById("end-year")
const endYearGroup = document.getElementById("end-year-group")
const ratingInput = document.getElementById("rating")
const mediaTypeSelect = document.getElementById("media-type")
const autoFillBtn = document.getElementById("auto-fill-btn")
const posterImage = document.getElementById("poster-image")
const posterPlaceholder = document.getElementById("poster-placeholder")
const editModal = document.getElementById("edit-modal")
const closeModalBtn = document.querySelector(".close")
const editForm = document.getElementById("edit-form")
const editIdInput = document.getElementById("edit-id")
const editOrderInput = document.getElementById("edit-order")
const editTitleInput = document.getElementById("edit-title")
const editGenreInput = document.getElementById("edit-genre")
const editReleaseYearInput = document.getElementById("edit-release-year")
const editEndYearInput = document.getElementById("edit-end-year")
const editEndYearGroup = document.getElementById("edit-end-year-group")
const editRatingInput = document.getElementById("edit-rating")
const editMediaTypeInput = document.getElementById("edit-media-type")
const editAutoFillBtn = document.getElementById("edit-auto-fill-btn")
const editPosterImage = document.getElementById("edit-poster-image")
const editPosterPlaceholder = document.getElementById("edit-poster-placeholder")
const toast = document.getElementById("toast")
const toastMessage = document.getElementById("toast-message")
const toastIcon = document.getElementById("toast-icon")
const loadingSpinner = document.getElementById("loading-spinner")
const themeToggleBtn = document.getElementById("theme-toggle-btn")

// ==================== API Functions ====================

// ثم قم بتعديل دالة fetchMedia لتتضمن تصحيح الأخطاء
async function fetchMedia(mediaType) {
  try {
    showLoading()
    console.log(`Fetching ${mediaType} data...`)

    const response = await fetch(`${API_BASE_URL}?type=${mediaType}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text()
    console.log(`Raw response for ${mediaType}:`, text)

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("Error parsing JSON:", e)
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
    }

    hideLoading()

    if (!Array.isArray(data)) {
      console.error(`Expected array but got:`, data)
      // إذا كان هناك خطأ في البيانات، حاول إرجاع مصفوفة فارغة
      return []
    }

    // تحويل البيانات إلى الأنواع الصحيحة
    return data.map((item) => ({
      ...item,
      order_number: Number.parseInt(item.order_number) || 0,
      release_year: Number.parseInt(item.release_year) || 0,
      end_year: Number.parseInt(item.end_year) || 0,
      rating: Number.parseFloat(item.rating) || 0,
    }))
  } catch (error) {
    hideLoading()
    showToast(`Error fetching ${mediaType} data: ${error.message}`, "error")
    console.error(`Error fetching ${mediaType}:`, error)
    return []
  }
}

async function saveMedia(mediaType, mediaData) {
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: mediaType,
        data: mediaData,
      }),
    })
    const result = await response.json()
    hideLoading()
    return result.success
  } catch (error) {
    hideLoading()
    showToast("Error saving media", "error")
    console.error("Error saving media:", error)
    return false
  }
}

async function updateMedia(mediaType, orderNumber, mediaData) {
  try {
    showLoading()
    console.log("Sending PUT request:", { mediaType, orderNumber, mediaData })

    const response = await fetch(API_BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: mediaType,
        order_number: orderNumber,
        data: mediaData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text()
    console.log("PUT response:", text)

    let result
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.error("Error parsing JSON:", e)
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
    }

    hideLoading()

    if (result.error) {
      throw new Error(result.error)
    }

    return result.success === true
  } catch (error) {
    hideLoading()
    showToast("Error updating media: " + error.message, "error")
    console.error("Error updating media:", error)
    return false
  }
}

async function deleteMedia(mediaType, orderNumber) {
  try {
    showLoading()
    const response = await fetch(API_BASE_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: mediaType,
        order_number: orderNumber,
      }),
    })
    const result = await response.json()
    hideLoading()
    return result.success
  } catch (error) {
    hideLoading()
    showToast("Error deleting media", "error")
    console.error("Error deleting media:", error)
    return false
  }
}

// دالة تصحيح الأخطاء - أضفها في بداية الملف
function debug(message, data) {
  console.log(`DEBUG: ${message}`, data)
}

// ==================== Core Functions ====================

// Initialize the application
// Initialize the application
async function init() {
  try {
    debug("Initializing application", {})

    // Check if dark mode is enabled
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark-theme")
      themeToggleBtn.classList.replace("fa-moon", "fa-sun")
    }

    document.getElementById("clear-form-btn").addEventListener("click", clearForm)

    // Update end year visibility based on media type
    updateEndYearVisibility()

    // Load initial data
    debug("Loading initial data", {})
    await searchMedia()

    // Add event listeners
    searchBtn.addEventListener("click", searchMedia)
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchMedia()
    })
    selectAllCheckbox.addEventListener("change", toggleSelectAll)
    editBtn.addEventListener("click", editSelected)
    deleteBtn.addEventListener("click", deleteSelected)
    addForm.addEventListener("submit", addMedia)
    mediaTypeSelect.addEventListener("change", updateEndYearVisibility)
    autoFillBtn.addEventListener("click", fetchMediaInfo)
    closeModalBtn.addEventListener("click", closeModal)
    editForm.addEventListener("submit", saveChanges)
    editAutoFillBtn.addEventListener("click", fetchEditInfo)
    themeToggleBtn.addEventListener("click", toggleTheme)

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === editModal) {
        closeModal()
      }
    })

    debug("Initialization complete", {})
  } catch (error) {
    console.error("Error in init:", error)
    showToast("Error initializing application: " + error.message, "error")
  }
}

// Toggle dark/light theme
function toggleTheme() {
  document.body.classList.toggle("dark-theme")
  const isDarkMode = document.body.classList.contains("dark-theme")
  localStorage.setItem("darkMode", isDarkMode)

  if (isDarkMode) {
    themeToggleBtn.classList.replace("fa-moon", "fa-sun")
  } else {
    themeToggleBtn.classList.replace("fa-sun", "fa-moon")
  }
}

// Update end year visibility based on media type
function updateEndYearVisibility() {
  if (mediaTypeSelect.value === "series") {
    endYearGroup.style.display = "block"
  } else {
    endYearGroup.style.display = "none"
  }
}

// Toggle select all checkboxes
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked
    const row = checkbox.closest("tr")
    if (selectAllCheckbox.checked) {
      row.classList.add("selected")
    } else {
      row.classList.remove("selected")
    }
  })
}

// Toggle row selection
// Toggle row selection - يجب أن تكون في النطاق العام
function toggleRowSelection(checkbox) {
  const row = checkbox.closest("tr")
  if (checkbox.checked) {
    row.classList.add("selected")
  } else {
    row.classList.remove("selected")
    selectAllCheckbox.checked = false
  }
}

// تأكد من أن الدالة متاحة عالميًا
window.toggleRowSelection = toggleRowSelection

// Search media based on filters
async function searchMedia() {
  const searchQuery = searchInput.value.toLowerCase()
  const searchBy = searchBySelect.value
  const filterType = filterTypeSelect.value

  console.log("Search parameters", { query: searchQuery, searchBy, filterType })

  let results = []

  try {
    if (filterType === "all" || filterType === "movie") {
      const movies = await fetchMedia("movie")
      console.log("Fetched movies", movies)

      if (Array.isArray(movies)) {
        const filteredMovies = movies.filter((movie) => {
          if (!movie) return false
          if (searchQuery === "") return true

          if (searchBy === "title") {
            return movie.title && movie.title.toLowerCase().includes(searchQuery)
          } else if (searchBy === "release_year") {
            return movie.release_year && movie.release_year.toString() === searchQuery
          } else if (searchBy === "genre") {
            return movie.genre && movie.genre.toLowerCase().includes(searchQuery)
          } else if (searchBy === "rating") {
            const rating = Number.parseFloat(searchQuery)
            if (isNaN(rating)) return false
            // Changed to exact match instead of tolerance-based match
            return movie.rating !== undefined && Number.parseFloat(movie.rating) === rating
          }
          return true
        })

        console.log("Filtered movies", filteredMovies)

        results = [
          ...results,
          ...filteredMovies.map((movie) => ({
            ...movie,
            media_type: "movie",
            display_year: movie.release_year ? movie.release_year.toString() : "",
            rating: Number.parseFloat(movie.rating) || 0,
          })),
        ]
      }
    }

    if (filterType === "all" || filterType === "series") {
      const series = await fetchMedia("series")
      console.log("Fetched series", series)

      if (Array.isArray(series)) {
        const filteredSeries = series.filter((serie) => {
          if (!serie) return false
          if (searchQuery === "") return true

          if (searchBy === "title") {
            return serie.title && serie.title.toLowerCase().includes(searchQuery)
          } else if (searchBy === "release_year") {
            const year = Number.parseInt(searchQuery)
            return (
              !isNaN(year) &&
              ((serie.release_year && serie.release_year === year) || (serie.end_year && serie.end_year === year))
            )
          } else if (searchBy === "genre") {
            return serie.genre && serie.genre.toLowerCase().includes(searchQuery)
          } else if (searchBy === "rating") {
            const rating = Number.parseFloat(searchQuery)
            if (isNaN(rating)) return false
            // Changed to exact match instead of tolerance-based match
            return serie.rating !== undefined && Number.parseFloat(serie.rating) === rating
          }
          return true
        })

        console.log("Filtered series", filteredSeries)

        results = [
          ...results,
          ...filteredSeries.map((serie) => ({
            ...serie,
            media_type: "series",
            display_year:
              serie.release_year === serie.end_year
                ? serie.release_year
                  ? serie.release_year.toString()
                  : ""
                : `${serie.release_year || ""}-${serie.end_year || ""}`,
            rating: Number.parseFloat(serie.rating) || 0,
          })),
        ]
      }
    }

    // Sort results by order number
    results.sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
    console.log("Final results", results)

    // Update the table
    updateResultsTable(results)
  } catch (error) {
    console.error("Error in searchMedia:", error)
    showToast("Error searching media: " + error.message, "error")
  }
}

// Update the results table
function updateResultsTable(results) {
  resultsBody.innerHTML = ""

  if (results.length > 0) {
    results.forEach((item) => {
      // تأكد من أن التقييم رقم
      const rating = typeof item.rating === "number" ? item.rating : Number.parseFloat(item.rating) || 0

      const row = document.createElement("tr")
      row.innerHTML = `
        <td><input type="checkbox" onclick="toggleRowSelection(this)"></td>
        <td>${item.order_number}</td>
        <td>${item.title}</td>
        <td>${item.genre}</td>
        <td>${item.display_year}</td>
        <td>${rating.toFixed(1)}</td>
        <td>${item.media_type}</td>
      `
      resultsBody.appendChild(row)
    })

    statusLabel.textContent = `${results.length} results found`
  } else {
    statusLabel.textContent = "No results found"
  }
}

// Add new media
async function addMedia(e) {
  e.preventDefault()

  const title = titleInput.value.trim()
  const genre = genreInput.value.trim()
  const mediaType = mediaTypeSelect.value

  // Validate inputs
  if (!title || !genre) {
    showToast("Please fill in all required fields", "error")
    return
  }

  try {
    const releaseYear = Number.parseInt(releaseYearInput.value)
    const rating = Number.parseFloat(ratingInput.value)

    if (isNaN(releaseYear)) {
      showToast("Release year must be a valid number", "error")
      return
    }

    if (isNaN(rating)) {
      showToast("Rating must be a valid number", "error")
      return
    }

    if (rating < 0 || rating > 10) {
      showToast("Rating must be between 0 and 10", "error")
      return
    }

    // Create new media object
    const newMedia = {
      title,
      genre,
      release_year: releaseYear,
      rating,
      poster_url: posterImage.src !== "" ? posterImage.src : null,
    }

    // Add end year for series
    if (mediaType === "series") {
      const endYear = endYearInput.value.trim() !== "" ? Number.parseInt(endYearInput.value) : releaseYear

      if (endYear < releaseYear) {
        showToast("End year must be greater than or equal to release year", "error")
        return
      }

      newMedia.end_year = endYear
    }

    // Save to database
    const success = await saveMedia(mediaType, newMedia)
    if (success) {
      showToast(`${mediaType} added successfully!`, "success")
      clearForm()
      await searchMedia()
    } else {
      showToast("Failed to add media", "error")
    }
  } catch (error) {
    showToast("Error adding media: " + error.message, "error")
  }
}

// Clear the add form
// Clear the add form
function clearForm() {
  // إعادة تعيين النموذج
  addForm.reset()

  // إخفاء صورة الملصق وإظهار العنصر النائب
  posterImage.src = ""
  posterImage.style.display = "none"
  posterPlaceholder.style.display = "flex"

  // إعادة تركيز المؤشر على حقل العنوان
  titleInput.focus()

  // عرض رسالة تأكيد
  showToast("Form cleared", "info")
}

// Fetch media info from APIs
async function fetchMediaInfo() {
  const title = titleInput.value.trim()
  if (!title) {
    showToast("Please enter a title to search", "error")
    return
  }

  const mediaType = mediaTypeSelect.value
  showLoading()

  try {
    let info = null
    if (mediaType === "movie") {
      info = await searchMovieInfo(title)
    } else {
      info = await searchSeriesInfo(title)
    }

    hideLoading()

    if (!info) {
      showToast("No information found. Please check the title or add information manually.", "info")
      return
    }

    // Fill form with fetched info
    titleInput.value = info.title
    genreInput.value = info.genre
    releaseYearInput.value = info.release_year
    ratingInput.value = info.rating

    if (mediaType === "series" && info.end_year) {
      endYearInput.value = info.end_year
    }

    // Display poster
    if (info.poster_url) {
      posterImage.src = info.poster_url
      posterImage.style.display = "block"
      posterPlaceholder.style.display = "none"
    }

    showToast(`${mediaType} information found and filled!`, "success")
  } catch (error) {
    hideLoading()
    showToast("Error fetching information: " + error.message, "error")
  }
}

// Search movie info from TMDB API
// Search movie info from TMDB API
async function searchMovieInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`
    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return null
    }

    const movie = data.results[0]
    const movieId = movie.id
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
    const detailsResponse = await fetch(detailsUrl)
    const details = await detailsResponse.json()

    const movieTitle = details.title || ""
    const year = details.release_date ? details.release_date.substring(0, 4) : ""

    const genres = details.genres ? details.genres.map((g) => g.name) : []
    const genre = genres.join(", ")

    let rating = details.vote_average || 0
    const imdbId = details.imdb_id

    if (imdbId) {
      const imdbUrl = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`
      const imdbResponse = await fetch(imdbUrl)
      const imdbData = await imdbResponse.json()
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A") {
        rating = Number.parseFloat(imdbData.imdbRating)
      }
    }

    const posterPath = details.poster_path
    const posterUrl = posterPath ? `${TMDB_IMAGE_URL}${posterPath}` : null

    return {
      title: movieTitle,
      release_year: Number.parseInt(year) || new Date().getFullYear(),
      genre,
      rating,
      poster_url: posterUrl,
    }
  } catch (error) {
    console.error("Error fetching movie info:", error)
    throw error
  }
}

// Search series info from TMDB API
// Search series info from TMDB API
async function searchSeriesInfo(searchTitle) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`
    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      return null
    }

    const series = data.results[0]
    const seriesId = series.id
    const detailsUrl = `${TMDB_BASE_URL}/tv/${seriesId}?api_key=${TMDB_API_KEY}&language=en-US`
    const detailsResponse = await fetch(detailsUrl)
    const details = await detailsResponse.json()

    const seriesTitle = details.name || ""
    const startYear = details.first_air_date ? details.first_air_date.substring(0, 4) : ""
    const endYear = details.last_air_date ? details.last_air_date.substring(0, 4) : ""
    const status = details.status || ""

    let finalEndYear = endYear
    if (status === "Returning Series") {
      finalEndYear = ""
    }

    const genres = details.genres ? details.genres.map((g) => g.name) : []
    const genre = genres.join(", ")

    let rating = details.vote_average || 0

    const externalIdsUrl = `${TMDB_BASE_URL}/tv/${seriesId}/external_ids?api_key=${TMDB_API_KEY}`
    const externalIdsResponse = await fetch(externalIdsUrl)
    const externalIds = await externalIdsResponse.json()
    const imdbId = externalIds.imdb_id

    if (imdbId) {
      const imdbUrl = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`
      const imdbResponse = await fetch(imdbUrl)
      const imdbData = await imdbResponse.json()
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A") {
        rating = Number.parseFloat(imdbData.imdbRating)
      }
    }

    const posterPath = details.poster_path
    const posterUrl = posterPath ? `${TMDB_IMAGE_URL}${posterPath}` : null

    const currentYear = new Date().getFullYear()
    const parsedStartYear = Number.parseInt(startYear) || currentYear
    const parsedEndYear = finalEndYear ? Number.parseInt(finalEndYear) : parsedStartYear

    return {
      title: seriesTitle,
      release_year: parsedStartYear,
      end_year: parsedEndYear,
      genre,
      rating,
      poster_url: posterUrl,
    }
  } catch (error) {
    console.error("Error fetching series info:", error)
    throw error
  }
}

// Edit selected media
// Edit selected media
async function editSelected() {
  try {
    const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked')

    if (checkboxes.length !== 1) {
      showToast("Please select exactly one item to edit", "info")
      return
    }

    const row = checkboxes[0].closest("tr")
    const cells = row.cells

    // تأكد من أن الخلايا موجودة وتحتوي على البيانات المتوقعة
    if (!cells || cells.length < 7) {
      showToast("Error: Invalid row data", "error")
      console.error("Invalid row data:", cells)
      return
    }

    const orderNumber = Number.parseInt(cells[1].textContent)
    const title = cells[2].textContent
    const mediaType = cells[6].textContent.toLowerCase()

    if (isNaN(orderNumber) || !mediaType) {
      showToast("Error: Invalid order number or media type", "error")
      console.error("Invalid data:", { orderNumber, mediaType })
      return
    }

    console.log("Editing item:", { orderNumber, title, mediaType })

    // Fetch the media item from database
    showLoading()
    const mediaList = await fetchMedia(mediaType)
    hideLoading()

    if (!Array.isArray(mediaList)) {
      showToast("Error: Failed to fetch media list", "error")
      console.error("Media list is not an array:", mediaList)
      return
    }

    console.log("Media list:", mediaList)

    // البحث عن العنصر باستخدام رقم الترتيب أو العنوان
    let mediaItem = mediaList.find((item) => item.order_number === orderNumber)

    // إذا لم يتم العثور على العنصر باستخدام رقم الترتيب، حاول البحث باستخدام العنوان
    if (!mediaItem && title) {
      mediaItem = mediaList.find((item) => item.title === title)
    }

    if (!mediaItem) {
      // إذا لم يتم العثور على العنصر، استخدم بيانات الصف مباشرة
      showToast(`Creating edit form from displayed data`, "info")

      mediaItem = {
        order_number: orderNumber,
        title: cells[2].textContent,
        genre: cells[3].textContent,
        release_year: Number.parseInt(cells[4].textContent.split("-")[0]) || new Date().getFullYear(),
        rating: Number.parseFloat(cells[5].textContent) || 0,
        media_type: mediaType,
      }

      // إذا كان نوع الوسائط هو مسلسل، أضف سنة الانتهاء
      if (mediaType === "series") {
        const yearParts = cells[4].textContent.split("-")
        if (yearParts.length > 1) {
          mediaItem.end_year = Number.parseInt(yearParts[1]) || mediaItem.release_year
        } else {
          mediaItem.end_year = mediaItem.release_year
        }
      }
    }

    console.log("Found/Created media item:", mediaItem)

    // Fill the edit form
    editOrderInput.value = orderNumber
    editTitleInput.value = mediaItem.title || ""
    editGenreInput.value = mediaItem.genre || ""
    editReleaseYearInput.value = mediaItem.release_year || ""
    editRatingInput.value = mediaItem.rating || ""
    editMediaTypeInput.value = mediaType

    // Handle end year for series
    if (mediaType === "series") {
      editEndYearGroup.style.display = "block"
      editEndYearInput.value = mediaItem.end_year || mediaItem.release_year || ""
    } else {
      editEndYearGroup.style.display = "none"
    }

    // Display poster if available
    if (mediaItem.poster_url) {
      editPosterImage.src = mediaItem.poster_url
      editPosterImage.style.display = "block"
      editPosterPlaceholder.style.display = "none"
    } else {
      editPosterImage.style.display = "none"
      editPosterPlaceholder.style.display = "flex"
    }

    // Show the modal
    editModal.style.display = "block"
  } catch (error) {
    hideLoading()
    showToast("Error editing item: " + error.message, "error")
    console.error("Error in editSelected:", error)
  }
}

// Close the edit modal
function closeModal() {
  editModal.style.display = "none"
}

// Fetch info for the edit form
async function fetchEditInfo() {
  const title = editTitleInput.value.trim()
  if (!title) {
    showToast("Please enter a title to search", "error")
    return
  }

  const mediaType = editMediaTypeInput.value
  showLoading()

  try {
    let info = null
    if (mediaType === "movie") {
      info = await searchMovieInfo(title)
    } else {
      info = await searchSeriesInfo(title)
    }

    hideLoading()

    if (!info) {
      showToast("No information found. Please check the title or add information manually.", "info")
      return
    }

    // Fill form with fetched info
    editTitleInput.value = info.title
    editGenreInput.value = info.genre
    editReleaseYearInput.value = info.release_year
    editRatingInput.value = info.rating

    if (mediaType === "series" && info.end_year) {
      editEndYearInput.value = info.end_year
    }

    // Display poster
    if (info.poster_url) {
      editPosterImage.src = info.poster_url
      editPosterImage.style.display = "block"
      editPosterPlaceholder.style.display = "none"
    }

    showToast(`${mediaType} information found and filled!`, "success")
  } catch (error) {
    hideLoading()
    showToast("Error fetching information: " + error.message, "error")
  }
}

// Save changes from edit form
// Save changes from edit form
async function saveChanges(e) {
  e.preventDefault()

  try {
    const orderNumber = Number.parseInt(editOrderInput.value)
    const title = editTitleInput.value.trim()
    const genre = editGenreInput.value.trim()
    const mediaType = editMediaTypeInput.value

    // Validate inputs
    if (!title || !genre) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const releaseYear = Number.parseInt(editReleaseYearInput.value) || new Date().getFullYear()
    const rating = Number.parseFloat(editRatingInput.value) || 0

    if (rating < 0 || rating > 10) {
      showToast("Rating must be between 0 and 10", "error")
      return
    }

    // Update the media item
    const updatedMedia = {
      title,
      genre,
      release_year: releaseYear,
      rating,
      poster_url: editPosterImage.style.display === "block" ? editPosterImage.src : null,
    }

    if (mediaType === "series") {
      const endYear = Number.parseInt(editEndYearInput.value) || releaseYear

      if (endYear < releaseYear) {
        showToast("End year must be greater than or equal to release year", "error")
        return
      }

      updatedMedia.end_year = endYear
    }

    console.log("Updating media:", { mediaType, orderNumber, updatedMedia })

    // Save to database
    showLoading()
    const success = await updateMedia(mediaType, orderNumber, updatedMedia)
    hideLoading()

    if (success) {
      showToast(`${mediaType} updated successfully!`, "success")
      closeModal()
      await searchMedia()
    } else {
      showToast("Failed to update media", "error")
    }
  } catch (error) {
    hideLoading()
    showToast("Error updating media: " + error.message, "error")
    console.error("Error in saveChanges:", error)
  }
}

// Delete selected media
async function deleteSelected() {
  const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]:checked')

  if (checkboxes.length === 0) {
    showToast("Please select at least one item to delete", "info")
    return
  }

  if (!confirm(`Are you sure you want to delete ${checkboxes.length} item(s)?`)) {
    return
  }

  try {
    let allSuccess = true

    for (const checkbox of checkboxes) {
      const row = checkbox.closest("tr")
      const cells = row.cells
      const orderNumber = Number.parseInt(cells[1].textContent)
      const mediaType = cells[6].textContent.toLowerCase()

      const success = await deleteMedia(mediaType, orderNumber)
      if (!success) {
        allSuccess = false
      }
    }

    if (allSuccess) {
      showToast("Selected items deleted successfully!", "success")
      await searchMedia()
    } else {
      showToast("Some items could not be deleted", "error")
    }
  } catch (error) {
    showToast("Error deleting items: " + error.message, "error")
  }
}

// Show toast notification
function showToast(message, type = "info") {
  toastMessage.textContent = message

  // Set icon based on type
  toastIcon.className = "fas"
  if (type === "success") {
    toastIcon.classList.add("fa-check-circle", "success")
  } else if (type === "error") {
    toastIcon.classList.add("fa-exclamation-circle", "error")
  } else {
    toastIcon.classList.add("fa-info-circle", "info")
  }

  // Show toast
  toast.classList.add("show")

  // Hide toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 5000)
}

// Show loading spinner
function showLoading() {
  loadingSpinner.style.display = "flex"
}

// Hide loading spinner
function hideLoading() {
  loadingSpinner.style.display = "none"
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", init)
