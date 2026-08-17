export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function deriveNpcState(blindPosition, sunlight = 1) {
  const blind = clamp(blindPosition);
  const sun = clamp(sunlight);
  const shade = smoothstep(0.18, 0.57, blind);
  const glare = clamp(sun * (1 - shade));
  const grandmotherComfort = clamp(1 - glare);
  const blockedView = smoothstep(0.5, 0.94, blind);
  const childComfort = clamp(1 - blockedView);
  const sharedComfort = Math.min(grandmotherComfort, childComfort);
  return { blind, shade, glare, grandmotherComfort, blockedView, childComfort, sharedComfort };
}

export function updateAfterProgress(progress, sharedComfort, deltaSeconds) {
  const dt = clamp(deltaSeconds, 0, 0.1);
  if (sharedComfort > 0.67) return clamp(progress + dt / 1.35);
  if (sharedComfort < 0.54) return clamp(progress - dt / 0.35);
  return progress;
}

export function calculateRoughness(samples, windowMs = 1200) {
  if (samples.length < 3) return 0;
  const cutoff = samples.at(-1).time - windowMs;
  const recent = samples.filter((sample) => sample.time >= cutoff);
  let distance = 0;
  let reversals = 0;
  let lastDirection = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const difference = recent[index].position - recent[index - 1].position;
    distance += Math.abs(difference);
    const direction = Math.sign(difference);
    if (direction && lastDirection && direction !== lastDirection) reversals += 1;
    if (direction) lastDirection = direction;
  }
  return distance + reversals * 0.22;
}
