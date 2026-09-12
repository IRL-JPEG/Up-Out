/* Illustrated glass-lift motion. Story state and audio belong to journey.js. */
(function (root) {
  'use strict';
  if (root.LiftMotion) return;
  const app = document.getElementById('app');
  const panel = document.getElementById('panelWrap');
  const overlay = document.getElementById('overlay');
  const doors = document.getElementById('doors');
  const transit = document.getElementById('transit');
  const world = document.getElementById('world');
  if (!app || !panel || !doors || !transit || !world) throw new Error('The lift is missing its stage.');
  const leaves = [doors.querySelector('.door.l'), doors.querySelector('.door.r')];
  if (leaves.some(leaf => !leaf)) throw new Error('The lift needs both glass doors.');

  const glass = `<svg viewBox="0 0 216 768" preserveAspectRatio="none" aria-hidden="true" focusable="false" class="lift-door-glass"><defs><linearGradient id="LIFT_GLASS" x1="0" x2="1"><stop stop-color="#d3e7e7" stop-opacity=".35"/><stop offset=".48" stop-color="#f8fffa" stop-opacity=".08"/><stop offset="1" stop-color="#b5cad0" stop-opacity=".3"/></linearGradient><linearGradient id="LIFT_METAL" x1="0" x2="1"><stop stop-color="#9cafa9"/><stop offset=".35" stop-color="#e8e9d9"/><stop offset=".68" stop-color="#c0c8bb"/><stop offset="1" stop-color="#768c8e"/></linearGradient></defs><path d="M6 3L212 5 211 765 4 767Z" fill="url(#LIFT_GLASS)" stroke="#3c4845" stroke-width="1.8"/><path d="M7 13L200 14 199 753 8 755Z" fill="none" stroke="#f7fff3" stroke-width="3" opacity=".65"/><path d="M11 18L191 21 193 747 11 747" fill="none" stroke="#537572" stroke-width="1" opacity=".62"/><path d="M194 2L213 4 213 766 192 767Z" fill="url(#LIFT_METAL)" stroke="#35433e" stroke-width="2"/><path d="M202 12L201 753" stroke="#fffdef" stroke-width="2.5" opacity=".85"/><path d="M207 9Q203 223 207 453L205 759" fill="none" stroke="#687d7a" stroke-width="1"/><path d="M2 108L192 107 192 123 3 126Z M3 637L194 634 194 650 3 653Z" fill="url(#LIFT_METAL)" stroke="#536460" stroke-width="1.3"/><path d="M21 184L120 83 147 82 21 215Z M36 338L160 211 165 218 38 356Z M53 678L149 580 165 580 58 696Z" fill="#fffef5" opacity=".4"/><path d="M28 251L139 138M26 264L109 181M70 700L153 615" fill="none" stroke="#fbfff6" stroke-width="2" opacity=".58"/><path d="M21 59Q82 20 140 58T182 36L181 103 19 104Z M15 473Q71 438 122 477T182 453L181 505Q115 535 72 509T17 533Z" fill="#a4c3c6" opacity=".13"/><path d="M174 316Q168 316 168 325L168 431Q168 440 175 440L187 440 187 432 179 431 179 325 187 324 187 316Z" fill="#c5ad77" stroke="#4b493e" stroke-width="1.8"/><path d="M173 325L173 429" stroke="#fff6ca" stroke-width="2"/><g fill="#f5edcf" stroke="#42534e" stroke-width="1.2"><circle cx="202" cy="34" r="3.3"/><circle cx="202" cy="116" r="3.3"/><circle cx="201" cy="644" r="3.3"/><circle cx="201" cy="736" r="3.3"/></g><path d="M201 32L203 35M201 114L203 117M199 642L202 646M199 734L202 738" stroke="#58635b" stroke-width="1"/></svg>`;
  leaves.forEach((leaf, index) => {
    const name = index ? 'right' : 'left';
    leaf.insertAdjacentHTML('beforeend', glass.replaceAll('LIFT_GLASS', `lift-glass-${name}`).replaceAll('LIFT_METAL', `lift-metal-${name}`));
  });

  const shaftTile = `<svg viewBox="0 0 432 768" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 0H432V768H0Z" fill="#e9e8da"/><path d="M16 0Q84 36 58 121T87 261L33 335 0 292V0Z M432 142Q351 99 368 243T339 438L432 487Z M132 484Q215 416 311 485L328 628 249 734 98 651Z" fill="#bccdc6" opacity=".46"/><path d="M91 0L151 0 165 196 112 297 83 221Z M354 485L431 463 432 728 367 692Z" fill="#f0d7ab" opacity=".44"/><path d="M41 0L40 768M53 0L54 768M377 0L378 768M391 0L390 768" fill="none" stroke="#879a95" stroke-width="6"/><path d="M38 0L40 768M56 0L55 768M374 0L376 768M394 0L391 768" fill="none" stroke="#3e514f" stroke-width="1.8"/><path d="M39 3L50 0 51 768 42 768Z M379 0L390 0 388 768 379 768Z" fill="#dce3d7" opacity=".65"/><path d="M8 159L424 150 424 176 8 187Z M8 543L424 534 424 560 8 571Z" fill="#a2b6b2" stroke="#3c4f4b" stroke-width="2"/><path d="M14 165L419 157M13 550L419 541" fill="none" stroke="#eef0df" stroke-width="3"/><path d="M57 188L373 532M374 179L57 544" fill="none" stroke="#526966" stroke-width="3" opacity=".44"/><path d="M64 74Q213 51 365 70L363 117Q225 93 67 121Z M75 388Q207 371 361 382L359 426Q209 412 76 438Z M71 669Q210 651 363 664L362 701Q209 689 71 715Z" fill="#e2caa1" opacity=".6"/><g fill="#ebeedf" stroke="#475c56" stroke-width="1.4"><circle cx="46" cy="170" r="5"/><circle cx="385" cy="161" r="5"/><circle cx="46" cy="554" r="5"/><circle cx="385" cy="545" r="5"/></g><path d="M83 0Q90 43 79 83L84 158M352 176Q343 238 352 286L348 535M86 570Q97 626 88 666L92 768" fill="none" stroke="#b49d75" stroke-width="5"/><path d="M82 0Q89 44 79 83L83 158M351 177Q342 238 351 287L347 535" fill="none" stroke="#53665c" stroke-width="1"/><path d="M110 233L192 232 194 306 111 307Z" fill="#c3d7d4" stroke="#7d918a" stroke-width="1.4"/><path d="M121 243L182 242 182 293 122 295Z" fill="#edf1e7"/><path d="M124 285L164 246M142 291L179 256" stroke="#b7d0cc" stroke-width="5" opacity=".58"/></svg>`;
  const travel = document.createElement('div'); travel.id = 'liftTravel'; travel.setAttribute('aria-hidden', 'true');
  travel.innerHTML = `<div class="lift-shaft-strip">${shaftTile}${shaftTile}</div><div class="lift-shaft-shade"></div>`;
  app.append(travel);
  const strip = travel.querySelector('.lift-shaft-strip');
  const frame = document.createElement('div'); frame.id = 'liftCabinFrame'; frame.setAttribute('aria-hidden', 'true');
  frame.innerHTML = `<svg viewBox="0 0 432 768" preserveAspectRatio="none" focusable="false"><path d="M0 0H432L416 22 19 23Z M0 0L19 23 17 744 0 768Z M432 0L416 22 416 744 432 768Z" fill="#c4d2ca" stroke="#3d4d48" stroke-width="2"/><path d="M3 5L19 18H413L429 4M7 14L14 24 12 742M425 14L421 25 421 742" fill="none" stroke="#f6f3df" stroke-width="3"/><path d="M0 768L17 744 416 744 432 768Z" fill="#dcc69b" stroke="#3f4a42" stroke-width="2"/><path d="M18 750L415 750M11 761L423 760" stroke="#f9edca" stroke-width="3"/><path d="M20 739L414 740" fill="none" stroke="#728983" stroke-width="3"/><path d="M21 26Q214 20 412 25M17 31L15 734M416 30L418 735" fill="none" stroke="#596e64" stroke-width="1.2"/><g fill="#f5e6bb" stroke="#59685b" stroke-width="1.1"><circle cx="34" cy="754" r="3"/><circle cx="92" cy="754" r="3"/><circle cx="151" cy="754" r="3"/><circle cx="211" cy="754" r="3"/><circle cx="271" cy="754" r="3"/><circle cx="331" cy="754" r="3"/><circle cx="393" cy="754" r="3"/></g></svg>`;
  // Fixed, subtle edge grain keeps the ink irregular without shimmering in motion.
  frame.querySelector('svg').insertAdjacentHTML('afterbegin', '<defs><filter id="lift-ink-grain" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".065" numOctaves="2" seed="7" result="paper"/><feDisplacementMap in="SourceGraphic" in2="paper" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>');
  app.append(frame);
  app.classList.add('lift-motion-ready'); app.dataset.liftPhase = 'idle';

  let epoch = 0, externalCleanup = null, currentController = null;
  const motions = new Set();
  const reduced = () => root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const abortError = () => new DOMException('Lift journey cancelled', 'AbortError');
  const phase = name => { app.dataset.liftPhase = name; };
  const clearLegacy = () => { panel.classList.remove('approach', 'transit', 'arrive'); transit.classList.remove('on'); document.getElementById('dial')?.classList.remove('shake'); };
  function cancelMotions(freeze = true) {
    for (const record of motions) {
      if (freeze && record.element.isConnected) for (const property of record.properties) record.element.style[property] = getComputedStyle(record.element)[property];
      record.animation.cancel();
    }
    motions.clear();
  }
  function start(signal) {
    externalCleanup?.(); externalCleanup = null;
    currentController?.abort(); cancelMotions(true);
    const controller = new AbortController(), token = ++epoch;
    currentController = controller;
    const abort = () => {
      controller.abort();
      if (token === epoch) { cancelMotions(true); phase('paused'); }
    };
    if (signal?.aborted) { abort(); throw abortError(); }
    signal?.addEventListener('abort', abort, { once: true });
    externalCleanup = () => signal?.removeEventListener('abort', abort);
    return { signal: controller.signal, check() { if (controller.signal.aborted || token !== epoch) throw abortError(); } };
  }
  function animate(element, frames, options, operation) {
    operation.check();
    const last = frames[frames.length - 1];
    const properties = Object.keys(last).filter(key => !['offset', 'easing', 'composite'].includes(key));
    if (!element.animate || !options.duration) {
      for (const property of properties) element.style[property] = last[property];
      return Promise.resolve();
    }
    const animation = element.animate(frames, { ...options, fill: 'both' });
    const record = { animation, element, properties }; motions.add(record);
    return animation.finished.then(() => {
      operation.check();
      for (const property of properties) element.style[property] = last[property];
    }).finally(() => { motions.delete(record); animation.cancel(); });
  }
  function startTravel() {
    if (reduced() || !strip.animate) return;
    const animation = strip.animate([{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }], { duration: 2150, iterations: Infinity, easing: 'linear' });
    animation.finished.catch(() => {});
    motions.add({ animation, element: strip, properties: ['transform'] });
  }
  function setDoors(closed) { doors.classList.toggle('closed', closed); }
  const glide = 'cubic-bezier(.3,.76,.18,1)';

  async function depart({ signal } = {}) {
    const op = start(signal), fast = reduced(); clearLegacy(); phase('departing');
    panel.style.visibility = 'visible'; panel.style.opacity = '1'; panel.style.transform = 'none';
    travel.style.opacity = '0'; transit.style.opacity = '0'; frame.style.opacity = '1'; strip.style.transform = 'translateY(-50%)';
    leaves[0].style.transform = 'translateX(-105%)'; leaves[1].style.transform = 'translateX(105%)'; setDoors(true);
    overlay?.classList.remove('on'); startTravel();
    await Promise.all([
      animate(panel, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(3%) scale(.92)', opacity: .65, offset: .6 }, { transform: 'translateY(4%) scale(.87)', opacity: 0 }], { duration: fast ? 180 : 1250, easing: glide }, op),
      animate(travel, [{ opacity: 0 }, { opacity: 1 }], { duration: fast ? 150 : 800, delay: fast ? 0 : 250, easing: 'ease-in' }, op),
      ...leaves.map((leaf, i) => animate(leaf, [{ transform: `translateX(${i ? 105 : -105}%)` }, { transform: 'translateX(0)' }], { duration: fast ? 180 : 1050, delay: fast ? 0 : 100, easing: 'cubic-bezier(.38,.03,.32,1)' }, op)),
      animate(transit, [{ opacity: 0 }, { opacity: 1 }], { duration: fast ? 100 : 400, delay: fast ? 0 : 650 }, op),
    ]);
    op.check(); panel.style.visibility = 'hidden'; world.classList.remove('on'); phase('travelling');
  }

  async function arrive({ signal } = {}) {
    const op = start(signal), fast = reduced(); clearLegacy(); phase('arriving');
    world.classList.add('on'); panel.style.visibility = 'hidden'; panel.style.opacity = '0'; setDoors(false);
    await Promise.all([
      animate(travel, [{ opacity: Number(getComputedStyle(travel).opacity) }, { opacity: 0 }], { duration: fast ? 90 : 300, delay: fast ? 0 : 70, easing: 'ease-out' }, op),
      animate(transit, [{ opacity: Number(getComputedStyle(transit).opacity) }, { opacity: 0 }], { duration: fast ? 90 : 220 }, op),
      ...leaves.map((leaf, i) => animate(leaf, [{ transform: getComputedStyle(leaf).transform }, { transform: `translateX(${i ? 105 : -105}%)` }], { duration: fast ? 200 : 1120, delay: fast ? 0 : 100, easing: glide }, op)),
    ]);
    op.check(); phase('room');
  }

  async function returnToPanel({ signal } = {}) {
    const op = start(signal), fast = reduced(), covered = Number(getComputedStyle(travel).opacity); clearLegacy(); phase('returning');
    frame.style.opacity = '1'; transit.style.opacity = '0'; setDoors(true);
    await Promise.all([
      ...leaves.map(leaf => animate(leaf, [{ transform: getComputedStyle(leaf).transform }, { transform: 'translateX(0)' }], { duration: fast ? 100 : 650, easing: 'cubic-bezier(.4,0,.35,1)' }, op)),
      animate(travel, [{ opacity: covered }, { opacity: 1 }], { duration: fast ? 100 : 480, delay: fast ? 0 : 170, easing: 'ease-in' }, op),
    ]);
    op.check(); world.classList.remove('on'); panel.style.visibility = 'visible'; panel.style.opacity = '0'; panel.style.transform = 'translateY(4%) scale(.9)'; setDoors(false);
    await Promise.all([
      animate(panel, [{ transform: 'translateY(4%) scale(.9)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], { duration: fast ? 140 : 850, easing: glide }, op),
      animate(travel, [{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 100 : 450, easing: 'ease-out' }, op),
      ...leaves.map((leaf, i) => animate(leaf, [{ transform: 'translateX(0)' }, { transform: `translateX(${i ? 105 : -105}%)` }], { duration: fast ? 140 : 750, delay: fast ? 0 : 100, easing: glide }, op)),
    ]);
    op.check(); idle();
  }

  function idle() {
    externalCleanup?.(); externalCleanup = null; cancelMotions(false); currentController = null;
    clearLegacy(); phase('idle'); panel.style.visibility = 'visible'; panel.style.opacity = '1'; panel.style.transform = 'none';
    travel.style.opacity = '0'; transit.style.opacity = '0'; strip.style.transform = 'translateY(-50%)';
    world.classList.remove('on'); setDoors(true); leaves.forEach(leaf => { leaf.style.transform = 'translateX(0)'; });
    overlay?.classList.add('on');
  }
  function reset() { externalCleanup?.(); externalCleanup = null; ++epoch; currentController?.abort(); cancelMotions(false); idle(); }
  root.LiftMotion = Object.freeze({ depart, arrive, returnToPanel, reset });
})(window);
