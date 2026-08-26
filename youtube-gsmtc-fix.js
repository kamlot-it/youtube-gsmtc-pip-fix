(() => {
  'use strict';

  if (window.__YT_GSMTC_PIP_FIX_LOADED__) return;
  window.__YT_GSMTC_PIP_FIX_LOADED__ = true;

  const TAG = '[YT GSMTC PiP Fix]';
  const REARM_DELAYS = [0, 80, 250, 800];
  let generation = 0;
  let lastVideo = null;

  function log(...args) {
    console.debug(TAG, ...args);
  }

  function getVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;

    const active = videos
      .filter(v => !v.ended && v.readyState >= 1)
      .sort((a, b) => {
        const aScore = (a.paused ? 0 : 1000000) + (a.clientWidth * a.clientHeight);
        const bScore = (b.paused ? 0 : 1000000) + (b.clientWidth * b.clientHeight);
        return bScore - aScore;
      });

    return active[0] || videos[0] || null;
  }

  function buildFallbackMetadata() {
    try {
      const title =
        document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() ||
        document.querySelector('meta[name="title"]')?.content?.trim() ||
        document.title.replace(/\s*-\s*YouTube\s*$/i, '').trim() ||
        'YouTube';

      const artist =
        document.querySelector('ytd-watch-metadata ytd-channel-name a')?.textContent?.trim() ||
        document.querySelector('#owner #channel-name a')?.textContent?.trim() ||
        '';

      const artworkUrl = document.querySelector('meta[property="og:image"]')?.content || '';
      const artwork = artworkUrl ? [{ src: artworkUrl }] : [];

      return new MediaMetadata({
        title,
        artist,
        album: 'YouTube',
        artwork
      });
    } catch (e) {
      log('Could not build fallback metadata:', e);
      return null;
    }
  }

  function updatePositionState(video) {
    try {
      if (!navigator.mediaSession?.setPositionState) return;
      const duration = Number(video.duration);
      const position = Number(video.currentTime);
      const rate = Number(video.playbackRate) || 1;

      if (Number.isFinite(duration) && duration > 0 && Number.isFinite(position)) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: rate,
          position: Math.min(Math.max(position, 0), duration)
        });
      }
    } catch (e) {
      // Live streams and some YouTube states can reject position updates. Ignore them.
    }
  }

  function rearmOnce(reason, token) {
    if (token !== generation) return;
    if (!('mediaSession' in navigator)) return;

    const video = getVideo();
    if (!video) return;

    const session = navigator.mediaSession;
    const targetState = (!video.paused && !video.ended) ? 'playing' : 'paused';

    try {
      const previousMetadata = session.metadata;

      // Chrome occasionally drops the Windows GSMTC registration when YouTube
      // moves a video into/out of PiP. Toggling the Media Session state and
      // metadata asks Chromium to publish the session again without touching
      // the actual playback element.
      session.playbackState = 'none';
      session.metadata = null;

      setTimeout(() => {
        if (token !== generation) return;
        const currentVideo = getVideo();
        if (!currentVideo) return;

        try {
          session.metadata = previousMetadata || buildFallbackMetadata();
          session.playbackState = (!currentVideo.paused && !currentVideo.ended) ? 'playing' : 'paused';
          updatePositionState(currentVideo);
          log('MediaSession re-armed:', reason, targetState);
        } catch (e) {
          log('Re-arm restore failed:', e);
        }
      }, 20);
    } catch (e) {
      log('Re-arm failed:', e);
    }
  }

  function scheduleRearm(reason) {
    generation += 1;
    const token = generation;
    for (const delay of REARM_DELAYS) {
      setTimeout(() => rearmOnce(reason, token), delay);
    }
  }

  function attachToVideo(video) {
    if (!video || video.__YT_GSMTC_PIP_FIX_ATTACHED__) return;
    video.__YT_GSMTC_PIP_FIX_ATTACHED__ = true;
    lastVideo = video;

    video.addEventListener('enterpictureinpicture', () => scheduleRearm('enter PiP'));
    video.addEventListener('leavepictureinpicture', () => scheduleRearm('leave PiP'));

    // Keep the published playback state aligned with the real video after a PiP transition.
    video.addEventListener('play', () => {
      try {
        navigator.mediaSession.playbackState = 'playing';
        updatePositionState(video);
      } catch (_) {}
    });

    video.addEventListener('pause', () => {
      try {
        navigator.mediaSession.playbackState = 'paused';
        updatePositionState(video);
      } catch (_) {}
    });

    video.addEventListener('ratechange', () => updatePositionState(video));
    video.addEventListener('seeked', () => updatePositionState(video));

    log('Attached to video element');
  }

  function scanForVideo() {
    const video = getVideo();
    if (video) attachToVideo(video);
  }

  const observer = new MutationObserver(scanForVideo);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && lastVideo) scheduleRearm('tab visible');
  });

  window.addEventListener('pageshow', () => scheduleRearm('pageshow'));
  window.addEventListener('yt-navigate-finish', () => {
    scanForVideo();
    scheduleRearm('YouTube navigation');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForVideo, { once: true });
  } else {
    scanForVideo();
  }

  log('Loaded');
})();
