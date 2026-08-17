import { clamp, deriveNpcState, updateAfterProgress, calculateRoughness } from './logic.js';

const $ = (selector) => document.querySelector(selector);
const svg = $('#scene');
const handle = $('#blind-handle');
const touchTarget = handle.querySelector('.touch-target');
const fabric = $('#blind-fabric');
const cord = $('#handle-cord');
const tunnel = $('#tunnel-dark');
const sunRay = $('#sun-ray');
const grandmother = $('#grandmother');
const child = $('#child');
const restart = $('#restart');
const liveStatus = $('#live-status');

const refs = {
  grandmaHead: $('.grandma-head'), grandmaShoulders: $('.grandma-shoulders'),
  grandmaEyes: $('.grandma-eyes'), grandmaBrow: $('.grandma-brow'), grandmaMouth: $('.grandma-mouth'),
  shadeHand: $('.shade-hand'), helpShadow: $('.help-shadow'), childHead: $('.child-head'),
  childBody: $('.child-body'), childHand: $('.child-hand'), childPupils: [...document.querySelectorAll('.child-pupil')],
  childMouth: $('.child-mouth'), bird: $('#bird')
};

const topY = 137;
const bottomY = 415;
const state = {
  target: 0.03, display: 0.03, sunlight: 0, after: 0, lastTime: performance.now(),
  dragging: false, dragOffset: 0, samples: [], roughUntil: 0, idleSince: performance.now(),
  grandmaTapUntil: 0, childTapUntil: 0, audio: null, lastMoveSound: 0, introTimers: []
};

function svgPoint(event) {
  const point = new DOMPoint(event.clientX, event.clientY);
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function resizeTouchTarget() {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(rect.width / 390, rect.height / 844);
  if (!scale) return;
  const minSvgSize = 48 / scale;
  const width = Math.max(98, minSvgSize);
  const height = Math.max(76, minSvgSize);
  touchTarget.setAttribute('x', String(195 - width / 2));
  touchTarget.setAttribute('y', String(164 - height / 2));
  touchTarget.setAttribute('width', String(width));
  touchTarget.setAttribute('height', String(height));
}
resizeTouchTarget();
window.addEventListener('resize', resizeTouchTarget);

function ensureAudio() {
  if (state.audio) return state.audio;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  state.audio = new AudioContext();
  const hum = state.audio.createOscillator();
  const humGain = state.audio.createGain();
  hum.type = 'sine'; hum.frequency.value = 52; humGain.gain.value = 0.008;
  hum.connect(humGain).connect(state.audio.destination); hum.start();
  return state.audio;
}

function tone(frequency, duration, gain = 0.025, type = 'sine') {
  const audio = ensureAudio();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(gain, audio.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function grabSound() { tone(178, 0.07, 0.035, 'triangle'); }
function flapSound() { tone(92, 0.18, 0.055, 'sawtooth'); }
function moveSound(delta) {
  const now = performance.now();
  if (Math.abs(delta) <= 0.016 || now - state.lastMoveSound < 55) return;
  state.lastMoveSound = now;
  tone(250 + Math.abs(delta) * 600, 0.035, 0.007, 'triangle');
}

function setBlindFromY(y) {
  const next = clamp((y - topY) / (bottomY - topY));
  moveSound(next - state.target);
  state.target = next;
  state.idleSince = performance.now();
  state.samples.push({ time: performance.now(), position: next });
  state.samples = state.samples.slice(-40);
  if (calculateRoughness(state.samples) > 1.42 && performance.now() > state.roughUntil) {
    state.roughUntil = performance.now() + 1050;
    flapSound();
  }
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const y = topY + state.target * (bottomY - topY);
  state.dragOffset = svgPoint(event).y - y;
  state.dragging = true;
  state.samples = [{ time: performance.now(), position: state.target }];
  handle.classList.add('grabbed');
  handle.setPointerCapture?.(event.pointerId);
  grabSound();
  navigator.vibrate?.(8);
  event.preventDefault();
}

function drag(event) {
  if (!state.dragging) return;
  setBlindFromY(svgPoint(event).y - state.dragOffset);
  event.preventDefault();
}

function endDrag(event) {
  if (!state.dragging) return;
  state.dragging = false;
  handle.classList.remove('grabbed');
  handle.releasePointerCapture?.(event.pointerId);
  event.preventDefault();
}

handle.addEventListener('pointerdown', startDrag);
handle.addEventListener('pointermove', drag);
handle.addEventListener('pointerup', endDrag);
handle.addEventListener('pointercancel', endDrag);
handle.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  state.target = clamp(state.target + (event.key === 'ArrowDown' ? 0.06 : -0.06));
  state.idleSince = performance.now();
  event.preventDefault();
});

function tapPerson(person) {
  const now = performance.now();
  ensureAudio();
  if (person === 'grandmother') state.grandmaTapUntil = now + 850;
  else state.childTapUntil = now + 850;
  tone(person === 'grandmother' ? 320 : 440, 0.08, 0.018, 'sine');
  state.idleSince = now;
}
grandmother.addEventListener('pointerdown', (event) => { tapPerson('grandmother'); event.preventDefault(); });
child.addEventListener('pointerdown', (event) => { tapPerson('child'); event.preventDefault(); });
for (const [element, name] of [[grandmother, 'grandmother'], [child, 'child']]) {
  element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') tapPerson(name); });
}

function clearIntroTimers() {
  state.introTimers.forEach((timer) => window.clearTimeout(timer));
  state.introTimers = [];
}

function resetScene() {
  clearIntroTimers();
  state.target = 0.03; state.display = 0.03; state.after = 0; state.sunlight = 0;
  state.samples = []; state.roughUntil = 0; state.idleSince = performance.now();
  tunnel.getAnimations().forEach((animation) => animation.cancel());
  tunnel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'forwards' });
  state.introTimers.push(window.setTimeout(() => {
    tunnel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1800, fill: 'forwards', easing: 'ease-out' });
  }, 1300));
  state.introTimers.push(window.setTimeout(() => { state.sunlight = 1; }, 1700));
}
restart.addEventListener('pointerdown', (event) => { resetScene(); tone(210, .08, .018); event.preventDefault(); });
restart.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') resetScene(); });

function renderBlind(position, now) {
  const y = topY + position * (bottomY - topY);
  const sway = now < state.roughUntil ? Math.sin(now * 0.065) * 7 : 0;
  fabric.setAttribute('d', `M36 113H354V${y} Q195 ${y + 9 + Math.abs(sway)} 36 ${y}Z`);
  cord.setAttribute('d', `M195 ${y}V${y + 16}`);
  handle.setAttribute('transform', `translate(${sway} ${y - topY}) scale(1 ${state.dragging ? 0.94 : 1})`);
  handle.setAttribute('aria-valuenow', String(Math.round(position * 100)));
}

function renderNpcs(npc, now, idleSeconds) {
  const glare = npc.glare;
  const blocked = npc.blockedView;
  const rough = now < state.roughUntil;
  const grandmaTap = now < state.grandmaTapUntil;
  const childTap = now < state.childTapUntil;
  const after = state.after;
  refs.grandmaHead.style.transform = `translate(${grandmaTap || rough ? 7 : glare * -5}px, ${after * 3}px) rotate(${grandmaTap || rough ? 5 : glare * -5 + after * 2}deg)`;
  refs.grandmaShoulders.style.transform = `translateY(${(1 - glare) * 6 + after * 3}px)`;
  refs.grandmaEyes.style.transform = `scaleY(${0.42 + (1 - glare) * 0.58 - after * 0.18})`;
  refs.grandmaBrow.style.transform = `translateX(${glare * 1.8}px) scaleX(${1 - glare * 0.09})`;
  refs.grandmaMouth.setAttribute('d', after > .45 ? 'M107 518q11 7 21 0' : 'M107 520q11 3 21-1');
  refs.shadeHand.style.opacity = String(clamp(glare * 1.35));
  refs.shadeHand.style.transform = `translateY(${(1 - glare) * 35}px) rotate(${(1 - glare) * -10}deg)`;
  const helping = idleSeconds > 7.5 && glare > .48;
  refs.helpShadow.style.opacity = helping ? String(clamp((idleSeconds - 7.5) / 1.3)) : '0';
  refs.childHead.style.transform = `translate(${blocked * 8 + (childTap ? 7 : 0)}px, ${-blocked * 13 + (rough ? 2 : 0)}px) rotate(${blocked * 7 + (childTap ? 5 : 0)}deg)`;
  refs.childBody.style.transform = `translate(${blocked * 6 + (childTap ? 5 : 0)}px, ${-blocked * 9}px)`;
  refs.childHand.style.transform = `translate(${blocked * 8}px, ${-blocked * 7}px)`;
  refs.childPupils.forEach((pupil) => pupil.setAttribute('transform', `translate(${2.5 - blocked * 5} ${-blocked * 1.5})`));
  refs.childMouth.setAttribute('d', blocked > .65 ? 'M260 554q10-3 20 1' : after > .58 ? 'M259 549q11 10 22 0' : 'M260 552q10 6 20-2');
  refs.bird.style.opacity = String(clamp(after * 1.6));
  if (rough) {
    refs.grandmaHead.style.transform = 'translate(7px, 0) rotate(5deg)';
    refs.childHead.style.transform = 'translate(-6px, 0) rotate(-5deg)';
  }
}

function tick(now) {
  const delta = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;
  const responsiveness = state.dragging ? 0.48 : 0.2;
  state.display += (state.target - state.display) * (1 - Math.exp(-delta / responsiveness));
  if (state.dragging) state.display += (state.target - state.display) * .58;
  const npc = deriveNpcState(state.display, state.sunlight);
  state.after = updateAfterProgress(state.after, state.sunlight > 0.8 ? npc.sharedComfort : 0, delta);
  const idleSeconds = (now - state.idleSince) / 1000;
  renderBlind(state.display, now);
  renderNpcs(npc, now, idleSeconds);
  sunRay.style.opacity = String(state.sunlight * (1 - npc.shade * .74));
  tunnel.style.pointerEvents = 'none';
  window.requestAnimationFrame(tick);
}

resetScene();
window.requestAnimationFrame(tick);

window.__SASSHITE_DEBUG__ = { state, deriveNpcState, resetScene };
