/*
  Startup splash: play, hold, part at the waterline, leave.

  Lifecycle, and why each step exists:

    boot     the veil covers the window from the first paint and the seam is lit
             on it, so the gap reads as water rather than as a window that never
             painted. The film fades in only once it has a frame to show.
    play     the film runs. Its black background is screened away; the veil under
             it is what gives that light something to land on.
    reveal   the two veil halves part along the waterline and the film fades, so
             the app is uncovered from the middle of the frame outward.
    done     the layer is removed. Its own opacity goes to zero first so the
             removal can never be seen as a pop.

  Exit is guaranteed: `forceExitMs` is a ceiling that fires whether or not the
  film ever reports an end, so a stalled video can never pin the window shut.
  Only `newWindowOnly` (sessionStorage, per window) can skip playback, and it
  only ever means "this window is reloading".
*/
(() => {
  try {
  const root = document.getElementById("dsh-startup-splash");
  if (root === null) return;

  const video = root.querySelector(".dsh-splash__film");
  // The route is a constant of this plugin, so it is spelled here rather than
  // read back from DATA: the asset then iterates with a page reload alone.
  const BEACON = "/api/appearance-library/v1/startup/beacon";
  const STORE_KEY = "dsh-startup-splash:booted";
  const timers = new Set();
  let settled = false;
  let filmDone = false;

  /** Where this page reports from: the desktop fences everything but its own renderer. */
  function beacon(event, data) {
    if (DATA.debug !== true) return;
    try {
      const payload = encodeURIComponent(JSON.stringify({ t: Math.round(performance.now()), ...data }));
      fetch(`${BEACON}?event=${encodeURIComponent(event)}&data=${payload}`, {
        method: "GET",
        keepalive: true,
        cache: "no-store",
      }).catch(() => {});
    } catch {
      /* reporting must never affect playback */
    }
  }

  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, Math.max(0, ms));
    timers.add(id);
    return id;
  }

  function phase(name) {
    root.dataset.phase = name;
  }

  function clearTimers() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  /** Tear the layer down. Idempotent: the first caller decides the reason. */
  function finish(reason) {
    if (settled) return;
    settled = true;
    clearTimers();
    fadeSound(DATA.audio === undefined ? 150 : DATA.audio.fadeMs);
    phase("done");
    beacon("left", { reason, session: sessionMs() });
    setTimeout(() => {
      root.remove();
    }, 240);
  }

  /** Part the veil. Idempotent, and always followed by `finish`. */
  function reveal(reason) {
    if (settled) return;
    if (root.dataset.phase === "reveal") return;
    clearTimers();
    phase("reveal");
    beacon("reveal", { reason, session: sessionMs(), filmTime: round(video?.currentTime), filmEnded: filmDone });
    later(() => finish(reason), DATA.revealMs + 80);
    // From here the film is a fade behind an opaque veil: stop decoding it.
    later(() => {
      try {
        video.pause();
      } catch {
        /* a paused element is not a failure */
      }
    }, 320);
  }

  function round(value) {
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  }

  function sessionMs() {
    return Math.round(performance.now());
  }

  /* ── skip: a reload is not a launch ─────────────────────────────────────── */

  let reloaded = false;
  try {
    reloaded = window.sessionStorage.getItem(STORE_KEY) === "1";
    window.sessionStorage.setItem(STORE_KEY, "1");
  } catch {
    reloaded = false;
  }

  if (DATA.newWindowOnly === true && reloaded) {
    phase("skipped");
    beacon("skipped", { reason: "reload" });
    setTimeout(() => root.remove(), 140);
    return;
  }

  /* ── once per window: wire the veil and the waterline ───────────────────── */

  root.style.setProperty("--dsl-veil", String(DATA.veilAlpha));
  root.style.setProperty("--dsl-reveal", `${DATA.revealMs}ms`);

  /**
   * Map the film's own waterline onto the viewport.
   *
   * The film is `object-fit: cover`, so its frame is scaled to fill and cropped
   * on the overflow axis. The seam is drawn in viewport coordinates, which means
   * it has to be projected through that same scale, otherwise it drifts away from
   * the ripple in the picture as the window changes shape.
   */
  function placeWaterline() {
    let y = DATA.waterline;
    const width = root.clientWidth;
    const height = root.clientHeight;
    const frameWidth = video?.videoWidth ?? 0;
    const frameHeight = video?.videoHeight ?? 0;
    if (width > 0 && height > 0 && frameWidth > 0 && frameHeight > 0) {
      const scale = Math.max(width / frameWidth, height / frameHeight);
      const drawnHeight = frameHeight * scale;
      const offsetY = (height - drawnHeight) / 2;
      y = (offsetY + DATA.waterline * drawnHeight) / height;
    }
    root.style.setProperty("--dsl-waterline", `${(y * 100).toFixed(3)}%`);
    return round(y);
  }

  if (video === null) {
    finish("no-film");
    return;
  }

  video.muted = DATA.muted !== false;
  video.volume = Math.max(0, Math.min(1, DATA.volume));

  /* ── soundtrack of its own ──────────────────────────────────────────────── */

  /**
   * The imported soundtrack, when there is one.
   *
   * The host mutes the film in that case (`DATA.muted` is true), so this element
   * is the only sound. It follows the film's speed to stay in step, and the
   * layer, not the video, decides when it stops: `finish()` fades it over
   * `fadeMs` so the tail does not play into an open window.
   */
  let sound = null;
  let soundFade = null;

  function startSound() {
    const spec = DATA.audio;
    if (spec === undefined || spec === null || typeof spec.url !== "string") return;
    const level = Number(spec.volume);
    try {
      sound = new Audio(spec.url);
      sound.preload = "auto";
      sound.volume = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 1;
      const rate = Number(DATA.rate);
      if (Number.isFinite(rate) && rate > 0) {
        sound.playbackRate = Math.min(4, Math.max(0.25, rate));
      }
      const start = () => {
        if (sound === null) return;
        const started = sound.play();
        if (started !== undefined && typeof started.catch === "function") {
          started.catch((error) => {
            beacon("sound-blocked", { message: String((error && error.name) || error) });
            sound = null;
          });
        }
      };
      /* A soundtrack that should land on the breach waits its turn; the wait is
         cancelled by `finish()` through `sound === null`. */
      if (spec.startMs > 0) later(start, spec.startMs);
      else start();
    } catch (error) {
      beacon("sound-threw", { message: String(error) });
      sound = null;
    }
  }

  /** Ramp the soundtrack down instead of cutting it under the opening window. */
  function fadeSound(ms) {
    if (sound === null) return;
    const node = sound;
    sound = null;
    if (DATA.audio !== undefined && DATA.audio.overrun === true) {
      /* The panel asked for the soundtrack to finish: hand it to the window so
         the layer's removal cannot take it down, and stop when it ends. */
      window.__dshSplashSound = node;
      node.addEventListener("ended", () => {
        if (window.__dshSplashSound === node) window.__dshSplashSound = null;
      });
      return;
    }
    const fade = Math.max(0, Number(ms) || 0);
    if (fade === 0) {
      try {
        node.pause();
      } catch {
        /* a stopped element is not a failure */
      }
      return;
    }
    const from = node.volume;
    const steps = Math.max(1, Math.round(fade / 25));
    let step = 0;
    if (soundFade !== null) clearInterval(soundFade);
    soundFade = setInterval(() => {
      step += 1;
      try {
        node.volume = Math.max(0, from * (1 - step / steps));
      } catch {
        /* volume is advisory */
      }
      if (step >= steps) {
        clearInterval(soundFade);
        soundFade = null;
        try {
          node.pause();
        } catch {
          /* already gone */
        }
      }
    }, 25);
  }

  // The markup ships `preload="none"`: a reload that skips the splash must not
  // pull 13 MB over the wire before the script can decide. Taking the film up is
  // the decision, made further down once every listener is attached: a `load()`
  // here can decode the first frame before `loadeddata` is wired to receive it.
  video.preload = "auto";

  let seam = placeWaterline();
  video.addEventListener(
    "loadedmetadata",
    () => {
      seam = placeWaterline();
      beacon("metadata", { w: video.videoWidth, h: video.videoHeight, duration: round(video.duration), seam });
    },
    { once: true },
  );
  video.addEventListener(
    "loadeddata",
    () => {
      beacon("first-frame", { filmTime: round(video.currentTime), w: video.videoWidth, h: video.videoHeight });
    },
    { once: true },
  );
  window.addEventListener("resize", () => {
    seam = placeWaterline();
  });

  /* ── playback ───────────────────────────────────────────────────────────── */

  function markFilmDone(how) {
    if (filmDone || settled) return;
    filmDone = true;
    beacon("film-end", { how, filmTime: round(video.currentTime), duration: round(video.duration) });
    later(() => reveal("film-end"), DATA.holdMs);
  }

  /**
   * The last second, sampled on a clock rather than on `timeupdate`.
   *
   * Two things happen out here, and both are late by nature. `timeupdate` fires
   * about four times a second, so anything asked of it lands somewhere in a
   * quarter-second window, usually on the wrong side of it.
   *
   * One second out, the line is handed over: the film is fading its own seam into
   * its fade-out, so the veil's seam starts rising to meet it. That is a CSS
   * transition keyed off `data-tail`, not a timer of ours.
   *
   * At the last frame, the veil parts. The film fades itself to pure black on its
   * final frame, so parting a quarter-second earlier (as this once did) would drop
   * a picture that is still half lit and turn the settling water into a cut.
   * `ended` covers the same instant; this exists because a timer is more precise
   * than the event, which fires a beat late.
   */
  function watchTail() {
    if (settled || filmDone) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (root.dataset.tail !== "1" && video.currentTime >= duration - 1) {
      root.dataset.tail = "1";
      beacon("tail", { filmTime: round(video.currentTime) });
    }
    if (video.currentTime >= duration - 0.04) {
      markFilmDone("tail");
      return;
    }
    later(watchTail, 80);
  }

  video.addEventListener("playing", () => {
    if (settled) return;
    phase("play");
    beacon("playing", { muted: video.muted, volume: round(video.volume), seam, session: sessionMs() });
    watchTail();
  });

  video.addEventListener("ended", () => markFilmDone("ended"));
  video.addEventListener("timeupdate", () => {
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    if (video.currentTime >= duration - 0.05) markFilmDone("timeupdate");
  });
  video.addEventListener("error", () => {
    beacon("film-error", { code: video.error === null ? null : video.error.code });
    reveal("film-error");
  });
  video.addEventListener("stalled", () => beacon("stalled", { filmTime: round(video.currentTime) }));

  // Nothing above paints the film, so it can be taken up whenever: its first
  // decoded frame is the first frame, with no fade to race against.
  if (typeof video.load === "function") video.load();

  phase("boot");
  beacon("mount", {
    seam,
    viewport: [root.clientWidth, root.clientHeight],
    veil: root.style.getPropertyValue("--dsl-veil"),
    revealMs: DATA.revealMs,
    forceExitMs: DATA.forceExitMs,
  });

  /** Take the film up, at the configured speed, with the configured sound. */
  function begin() {
    const rate = Number(DATA.rate);
    if (Number.isFinite(rate) && rate > 0) {
      try {
        video.playbackRate = Math.min(4, Math.max(0.25, rate));
      } catch {
        /* an unsupported speed is not a reason to skip the film */
      }
    }
    startSound();
    try {
      const started = video.play();
      if (started === undefined || typeof started.catch !== "function") return;
      started.catch((error) => {
        const name = String((error && error.name) || error);
        beacon("autoplay-blocked", { message: name, muted: video.muted });
        // A renderer only refuses a film that has sound. Keep the picture and drop
        // the audio: a silent launch still reads as a launch, while a refused one
        // is a flash of half-built shell.
        if (video.muted === false && name === "NotAllowedError") {
          video.muted = true;
          try {
            const retry = video.play();
            if (retry !== undefined && typeof retry.catch === "function") {
              retry.catch(() => reveal("autoplay-blocked"));
            }
            return;
          } catch {
            /* fall through to the reveal */
          }
        }
        reveal("autoplay-blocked");
      });
    } catch (error) {
      beacon("autoplay-threw", { message: String(error) });
      reveal("autoplay-threw");
    }
  }

  /** Honour `acPowerOnly` before taking the film up. */
  function respectPowerRule() {
    if (DATA.acPowerOnly !== true || typeof navigator.getBattery !== "function") {
      begin();
      return;
    }
    navigator.getBattery().then(
      (status) => {
        if (status && status.charging === false) {
          beacon("skipped", { reason: "battery" });
          reveal("battery");
          return;
        }
        begin();
      },
      () => begin(),
    );
  }

  respectPowerRule();

  // The ceiling. Whatever the film does, the window opens.
  /* The panel's "launch length" owns the timeline: the split starts on the
     clock, so a target shorter than the film cuts it rather than overrunning. */
  later(() => reveal("clock"), Math.max(300, Number(DATA.revealAtMs) || 0));

  const ceiling = Math.max(DATA.forceExitMs, DATA.debugHoldMs + DATA.revealMs);
  later(() => reveal("ceiling"), ceiling);

  // A window that is not visible cannot be showing an animation: give it up.
  if (document.visibilityState === "hidden") reveal("hidden");
  } catch (error) {
    // Never leave a veil the reader cannot lift: any failure takes the overlay away.
    const node = document.getElementById("dsh-startup-splash");
    if (node !== null) node.remove();
    console.error("[startup-splash]", error);
  }
})();
