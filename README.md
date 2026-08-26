# YouTube GSMTC PiP Fix

A small Chrome extension that works around a media-control issue observed when YouTube enters or leaves Picture-in-Picture mode on Windows.

In the affected scenario, YouTube can continue playing normally while Windows media controls stop seeing the Chrome media session. This also breaks tools that rely on Windows Global System Media Transport Controls (GSMTC), for example media-control extensions for PowerToys Command Palette.

This extension listens for Picture-in-Picture transitions and re-publishes the page's `navigator.mediaSession` state without intentionally pausing or restarting playback.

## Tested scenario

Confirmed working with:

- Google Chrome on Windows 11
- YouTube
- Picture-in-Picture
- PowerToys Command Palette with a media-controls extension that consumes Windows GSMTC sessions

The manifest also injects the workaround on YouTube Music, but that path has not been verified separately.

## The problem

A typical failure looks like this:

1. Start a YouTube video in Chrome.
2. Windows media controls / PowerToys can control it.
3. Enter Picture-in-Picture.
4. The video keeps playing, but the Chrome media session may disappear from Windows media controls.
5. Leaving Picture-in-Picture does not necessarily restore it.

A known manual workaround is to start another media session in Chrome, which can cause Chrome to publish the media session again. This extension automates a lighter version of that recovery by refreshing the Media Session state around PiP transitions.

## Installation

This extension is not published in the Chrome Web Store. Load it as an unpacked extension:

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository directory containing `manifest.json`.
6. Refresh any already-open YouTube tabs.

### Chrome setting

Make sure hardware media key handling is enabled:

```text
chrome://flags/#hardware-media-key-handling
```

Set **Hardware Media Key Handling** to **Enabled**, then relaunch Chrome.

## How it works

The extension runs directly in the YouTube page context and watches the active `<video>` element.

When it detects:

- `enterpictureinpicture`
- `leavepictureinpicture`

it performs several short re-arm attempts. Each attempt temporarily clears the page's Media Session publication state and then restores:

- `MediaSession.metadata`
- `MediaSession.playbackState`
- `MediaSession.setPositionState()`

This asks Chromium to publish the media session again to Windows without intentionally issuing `pause()` or `play()` on the video element.

It also keeps playback and position state synchronized after play, pause, seek, and playback-rate changes.

## Privacy and permissions

The extension:

- requests no extension permissions
- has no background service worker
- contains no network-request code
- stores no user data
- sends no telemetry

It only runs on:

```text
https://www.youtube.com/*
https://music.youtube.com/*
```

## Diagnostics

Open YouTube DevTools with `F12`, select **Console**, and filter for:

```text
[YT GSMTC PiP Fix]
```

Expected messages include:

```text
Loaded
Attached to video element
MediaSession re-armed: enter PiP
MediaSession re-armed: leave PiP
```

## Limitations

This is a workaround for observed Chrome behavior, not an upstream Chromium fix.

The extension can refresh the page-level Media Session API, but it cannot directly verify whether Windows has successfully registered the resulting GSMTC session.

YouTube or Chromium changes may require adjustments in future versions.

## Files

```text
manifest.json
youtube-gsmtc-fix.js
README.md
LICENSE
CHANGELOG.md
```

## License

MIT. See [LICENSE](LICENSE).
