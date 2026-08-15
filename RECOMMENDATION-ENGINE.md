# For You

The new **For You** view is backed by `/api/recommendations` and includes:

- Continue the story — new seasons and released franchise continuations.
- Watch from your vault — saved but unwatched titles ranked against watch history.
- New releases for you — recent released titles not yet in the vault, newest years first.
- Because you watched — related titles, spin-offs and strong personalized picks.

Recommendation snapshots are cached locally so repeat visits open instantly. Refreshing the section asks the backend for a fresh build.

For series, **Seasons Watched** is now editable separately from **Seasons**. This lets the recommendation engine understand exactly how far the user has watched even when new seasons are released later.
