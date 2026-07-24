/**
 * ItChats logo micro-animation controller.
 *
 * Requirements:
 * - The logo SVG must be INLINE in the DOM (not <img src="...">), with:
 *   #itchats-mascot
 *   #itchats-left-eye
 *   #itchats-right-eye
 *   #itchats-star
 *
 * Usage:
 *   const logo = document.querySelector('#itchats-logo');
 *   const animation = createItChatsLogoAnimation(logo);
 *   animation.start();
 *
 * Optional interactions:
 *   logo.addEventListener('click', () => animation.jump());
 */

export function createItChatsLogoAnimation(svg, options = {}) {
  if (!(svg instanceof SVGElement)) {
    throw new TypeError('createItChatsLogoAnimation expects an inline SVGElement.');
  }

  const mascot = svg.querySelector('#itchats-mascot');
  const leftEye = svg.querySelector('#itchats-left-eye');
  const rightEye = svg.querySelector('#itchats-right-eye');
  const star = svg.querySelector('#itchats-star');

  const missing = [
    ['#itchats-mascot', mascot],
    ['#itchats-left-eye', leftEye],
    ['#itchats-right-eye', rightEye],
    ['#itchats-star', star],
  ].filter(([, el]) => !el).map(([selector]) => selector);

  if (missing.length) {
    throw new Error(`ItChats SVG is missing required animation target(s): ${missing.join(', ')}`);
  }

  const settings = {
    idleBlinkMinMs: 2600,
    idleBlinkMaxMs: 6200,
    winkChance: 0.22,
    idleJumpMinMs: 9000,
    idleJumpMaxMs: 17000,
    idleStarMinMs: 3200,
    idleStarMaxMs: 7200,
    jumpHeight: 42,
    ...options,
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  let running = false;
  let destroyed = false;
  let jumpAnimation = null;

  // WAAPI transforms on SVG elements need these hints for consistent browsers.
  for (const el of [mascot, leftEye, rightEye, star]) {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = 'center';
  }

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function schedule(fn, delay) {
    if (!running || destroyed || reduceMotion.matches) return null;
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (running && !destroyed && !reduceMotion.matches) fn();
    }, delay);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
  }

  function eyeCloseKeyframes() {
    return [
      { transform: 'scaleY(1)', offset: 0 },
      { transform: 'scaleY(0.10)', offset: 0.42 },
      { transform: 'scaleY(0.10)', offset: 0.58 },
      { transform: 'scaleY(1)', offset: 1 },
    ];
  }

  function blink({ wink = false, eye = null } = {}) {
    if (destroyed) return Promise.resolve();

    // Reduced motion gets a tiny opacity blink instead of geometric movement.
    if (reduceMotion.matches) {
      const targets = wink ? [eye || rightEye] : [leftEye, rightEye];
      const animations = targets.map((el) => el.animate(
        [{ opacity: 1 }, { opacity: 0.72 }, { opacity: 1 }],
        { duration: 140, easing: 'ease-out' },
      ));
      return Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
    }

    const targets = wink ? [eye || rightEye] : [leftEye, rightEye];
    const duration = wink ? 235 : 170;
    const animations = targets.map((el) => el.animate(eyeCloseKeyframes(), {
      duration,
      easing: 'cubic-bezier(.35,0,.2,1)',
      fill: 'none',
    }));

    return Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
  }

  function wink(side = Math.random() < 0.5 ? 'left' : 'right') {
    return blink({ wink: true, eye: side === 'left' ? leftEye : rightEye });
  }

  function jump() {
    if (destroyed) return Promise.resolve();
    if (jumpAnimation) jumpAnimation.cancel();

    if (reduceMotion.matches) {
      jumpAnimation = mascot.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.025)' },
          { transform: 'scale(1)' },
        ],
        { duration: 220, easing: 'ease-out' },
      );
      return jumpAnimation.finished.catch(() => undefined);
    }

    const h = settings.jumpHeight;
    jumpAnimation = mascot.animate(
      [
        // anticipation / squash
        { transform: 'translateY(0) scaleX(1) scaleY(1)', offset: 0 },
        { transform: 'translateY(5px) scaleX(1.045) scaleY(.955)', offset: 0.12 },
        // lift / stretch
        { transform: `translateY(${-h}px) scaleX(.975) scaleY(1.035)`, offset: 0.38 },
        // apex
        { transform: `translateY(${-h - 3}px) scaleX(.99) scaleY(1.015)`, offset: 0.50 },
        // fall
        { transform: 'translateY(-8px) scaleX(1.01) scaleY(.99)', offset: 0.74 },
        // landing squash
        { transform: 'translateY(4px) scaleX(1.04) scaleY(.96)', offset: 0.84 },
        // tiny rebound
        { transform: 'translateY(-3px) scaleX(.995) scaleY(1.008)', offset: 0.93 },
        { transform: 'translateY(0) scaleX(1) scaleY(1)', offset: 1 },
      ],
      {
        duration: 720,
        easing: 'cubic-bezier(.22,.72,.24,1)',
        fill: 'none',
      },
    );

    // A jump feels much more alive if the eyes react around take-off.
    schedule(() => blink(), 85);

    return jumpAnimation.finished.catch(() => undefined);
  }

  function shine() {
    if (destroyed) return Promise.resolve();

    // Two animations: geometry + visual brightness. Keeping glow restrained
    // prevents the transparent icon from looking washed out on dark backgrounds.
    const transformAnimation = star.animate(
      [
        { transform: 'rotate(0deg) scale(1)', offset: 0 },
        { transform: 'rotate(-7deg) scale(.94)', offset: 0.18 },
        { transform: 'rotate(7deg) scale(1.24)', offset: 0.46 },
        { transform: 'rotate(1deg) scale(1.08)', offset: 0.66 },
        { transform: 'rotate(0deg) scale(1)', offset: 1 },
      ],
      {
        duration: reduceMotion.matches ? 260 : 680,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'none',
      },
    );

    const visualAnimation = star.animate(
      [
        { opacity: 1, filter: 'brightness(1) drop-shadow(0 0 0px rgba(255,114,239,0))' },
        { opacity: 1, filter: 'brightness(1.7) drop-shadow(0 0 18px rgba(255,140,245,.95))', offset: 0.48 },
        { opacity: 1, filter: 'brightness(1.05) drop-shadow(0 0 3px rgba(255,114,239,.25))' },
      ],
      {
        duration: reduceMotion.matches ? 260 : 680,
        easing: 'ease-out',
        fill: 'none',
      },
    );

    return Promise.all([
      transformAnimation.finished.catch(() => undefined),
      visualAnimation.finished.catch(() => undefined),
    ]);
  }

  function scheduleBlinkLoop() {
    schedule(async () => {
      if (Math.random() < settings.winkChance) {
        await wink();
      } else {
        await blink();
        // Natural occasional double-blink.
        if (Math.random() < 0.18) {
          schedule(() => blink(), randomBetween(110, 190));
        }
      }
      scheduleBlinkLoop();
    }, randomBetween(settings.idleBlinkMinMs, settings.idleBlinkMaxMs));
  }

  function scheduleJumpLoop() {
    schedule(async () => {
      await jump();
      scheduleJumpLoop();
    }, randomBetween(settings.idleJumpMinMs, settings.idleJumpMaxMs));
  }

  function scheduleStarLoop() {
    schedule(async () => {
      await shine();
      scheduleStarLoop();
    }, randomBetween(settings.idleStarMinMs, settings.idleStarMaxMs));
  }

  function start() {
    if (destroyed || running) return;
    running = true;

    // A tiny entrance beat; intentionally not a large bounce on every mount.
    if (!reduceMotion.matches) {
      mascot.animate(
        [
          { opacity: 0, transform: 'translateY(10px) scale(.94)' },
          { opacity: 1, transform: 'translateY(0) scale(1.02)', offset: 0.72 },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        { duration: 560, easing: 'cubic-bezier(.22,.8,.22,1)' },
      );
    }

    scheduleBlinkLoop();
    scheduleJumpLoop();
    scheduleStarLoop();
  }

  function stop() {
    running = false;
    clearTimers();
    if (jumpAnimation) jumpAnimation.cancel();
  }

  function destroy() {
    stop();
    destroyed = true;
    svg.onclick = null;
    svg.onpointerenter = null;
  }

  function onMotionPreferenceChange() {
    clearTimers();
    if (running && !reduceMotion.matches) {
      scheduleBlinkLoop();
      scheduleJumpLoop();
      scheduleStarLoop();
    }
  }

  reduceMotion.addEventListener?.('change', onMotionPreferenceChange);

  return {
    start,
    stop,
    destroy,
    blink,
    wink,
    jump,
    shine,
  };
}

/**
 * Convenience helper for an SVG file. It fetches the SVG and injects it inline,
 * because elements inside <img src="logo.svg"> cannot be animated individually.
 */
export async function mountItChatsLogo(container, svgUrl, options = {}) {
  if (!(container instanceof Element)) {
    throw new TypeError('mountItChatsLogo expects a DOM Element container.');
  }

  const response = await fetch(svgUrl, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Failed to load ItChats logo: ${response.status}`);

  const markup = await response.text();
  container.innerHTML = markup;

  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Loaded asset did not contain an SVG element.');

  svg.id ||= 'itchats-logo';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', options.ariaLabel || 'ItChats');
  svg.style.display = 'block';
  svg.style.width = options.width || '100%';
  svg.style.height = options.height || 'auto';
  svg.style.overflow = 'visible';

  const controller = createItChatsLogoAnimation(svg, options);
  controller.start();

  if (options.interactive !== false) {
    svg.style.cursor = 'pointer';
    svg.addEventListener('click', () => {
      controller.jump();
      window.setTimeout(() => controller.shine(), 190);
    });
    svg.addEventListener('pointerenter', () => controller.wink('right'));
  }

  return controller;
}
