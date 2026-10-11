export const SPECIES = ['cat', 'dog', 'blob', 'dragon'];
export const MOODS = ['happy', 'ok', 'hungry', 'sad', 'grumpy', 'sleeping'];
export const SLEEP_AFTER_MS = 30 * 60000;

const NAMES = ['Mochi', 'Pixel', 'Bean', 'Noodle', 'Biscuit', 'Ziggy', 'Pip', 'Tofu', 'Waffles', 'Byte', 'Nugget', 'Sprout'];
const HOUR = 3600000;
const AWAKE_PER_HOUR = { hunger: -8, happiness: -5, energy: -6 };
const ASLEEP_PER_HOUR = { hunger: -3, happiness: -1, energy: 25 };
const SAD_FOR_MS = 3 * 60000;
const HAPPY_FOR_MS = 5 * 60000;
const TESTS_COOLDOWN_MS = 60000;
const XP_ANSWER = 5;
const XP_TESTS = 40;

const clamp = (value) => Math.max(0, Math.min(100, value));
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

export function hatch(now, random = Math.random) {
  return {
    species: pick(SPECIES, random),
    name: pick(NAMES, random),
    hunger: 80,
    happiness: 80,
    energy: 100,
    xp: 0,
    bornAt: now,
    updatedAt: now,
    lastActiveAt: now,
    lastTestsAt: 0,
    flash: null,
  };
}

export function normalizePet(value) {
  if (!value || typeof value !== 'object' || !SPECIES.includes(value.species)) return null;
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const bornAt = num(value.bornAt, 0);
  return {
    species: value.species,
    name: typeof value.name === 'string' && value.name ? value.name : 'Pet',
    hunger: clamp(num(value.hunger, 50)),
    happiness: clamp(num(value.happiness, 50)),
    energy: clamp(num(value.energy, 50)),
    xp: Math.max(0, num(value.xp, 0)),
    bornAt,
    updatedAt: num(value.updatedAt, bornAt),
    lastActiveAt: num(value.lastActiveAt, bornAt),
    lastTestsAt: num(value.lastTestsAt, 0),
    flash: value.flash && MOODS.includes(value.flash.mood) ? { mood: value.flash.mood, until: num(value.flash.until, 0) } : null,
  };
}

function drift(pet, rates, ms) {
  if (ms <= 0) return pet;
  const hours = ms / HOUR;
  return {
    ...pet,
    hunger: clamp(pet.hunger + rates.hunger * hours),
    happiness: clamp(pet.happiness + rates.happiness * hours),
    energy: clamp(pet.energy + rates.energy * hours),
  };
}

export function decay(pet, now) {
  const from = pet.updatedAt;
  if (!(now > from)) return pet;
  const sleepStart = pet.lastActiveAt + SLEEP_AFTER_MS;
  const awakeMs = Math.max(0, Math.min(now, sleepStart) - from);
  const asleepMs = Math.max(0, now - Math.max(from, sleepStart));
  return { ...drift(drift(pet, AWAKE_PER_HOUR, awakeMs), ASLEEP_PER_HOUR, asleepMs), updatedAt: now };
}

function bump(pet, changes) {
  return {
    ...pet,
    hunger: clamp(pet.hunger + (changes.hunger ?? 0)),
    happiness: clamp(pet.happiness + (changes.happiness ?? 0)),
    energy: clamp(pet.energy + (changes.energy ?? 0)),
    xp: pet.xp + (changes.xp ?? 0),
  };
}

export function applyEvent(pet, event, now) {
  const current = { ...decay(pet, now), lastActiveAt: Math.max(pet.lastActiveAt, now) };
  switch (event.type) {
    case 'answer':
      return bump(current, { hunger: 15, happiness: 2, energy: -2, xp: XP_ANSWER });
    case 'toolError':
      return { ...bump(current, { happiness: -8 }), flash: { mood: 'sad', until: now + SAD_FOR_MS } };
    case 'testsPassed':
      if (now - current.lastTestsAt < TESTS_COOLDOWN_MS) return current;
      return { ...bump(current, { happiness: 20, xp: XP_TESTS }), lastTestsAt: now, flash: { mood: 'happy', until: now + HAPPY_FOR_MS } };
    case 'rename':
      return { ...current, name: event.name };
    default:
      return current;
  }
}

export function isAsleep(pet, now) {
  return now - pet.lastActiveAt >= SLEEP_AFTER_MS;
}

export function moodOf(pet, now) {
  if (isAsleep(pet, now)) return 'sleeping';
  const p = decay(pet, now);
  if (p.flash && now < p.flash.until) return p.flash.mood;
  if (Math.min(p.hunger, p.happiness, p.energy) < 15) return 'grumpy';
  if (p.hunger < 35) return 'hungry';
  if (p.happiness < 35) return 'sad';
  if (Math.min(p.hunger, p.happiness, p.energy) >= 70) return 'happy';
  return 'ok';
}

export function hintOf(pet) {
  const needs = [
    { value: pet.hunger, low: 30, hint: 'feed me a task' },
    { value: pet.happiness, low: 30, hint: 'pass some tests?' },
    { value: pet.energy, low: 20, hint: 'needs a nap' },
  ].filter((need) => need.value < need.low);
  needs.sort((a, b) => a.value - b.value);
  return needs[0]?.hint ?? '';
}

const xpForLevel = (level) => 25 * level * (level - 1);

export function levelOf(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function levelProgress(xp) {
  const level = levelOf(xp);
  const start = xpForLevel(level);
  return { level, into: xp - start, need: xpForLevel(level + 1) - start };
}

export function ageLabel(bornAt, now) {
  const ms = Math.max(0, now - bornAt);
  if (ms < HOUR) return `${Math.floor(ms / 60000)} min`;
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)} h`;
  const days = Math.floor(ms / (24 * HOUR));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16)
    .trim();
}
