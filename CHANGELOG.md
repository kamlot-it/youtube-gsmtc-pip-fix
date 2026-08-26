# Changelog

## 0.1.0 - 2026-08-26

- Initial public release.
- Re-arms `navigator.mediaSession` after entering and leaving Picture-in-Picture.
- Retries the re-arm sequence several times to cover asynchronous Chrome/YouTube state changes.
- Keeps playback and position state aligned with the active YouTube video.
- Supports YouTube and injects on YouTube Music.
