import { test, expect, describe } from 'claude-code/testing';
import {
  SLEEP_AFTER_MS, applyEvent, ageLabel, cleanName, decay, hatch, hintOf, levelOf, levelProgress, moodOf,
} from './pet.js';

const HOUR = 3600000;
const T0 = new Date(2026, 9, 11, 9, 0).getTime();
const seq = (...values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

describe('hatch', () => {
  test('species and name come from the random source', async () => {
    const pet = hatch(T0, seq(0.99, 0));
    expect(pet.species).toBe('dragon');
    expect(pet.name.length > 0).toBe(true);
    expect(hatch(T0, seq(0, 0)).species).toBe('cat');
    expect(hatch(T0, seq(0.3, 0)).species).toBe('dog');
    expect(hatch(T0, seq(0.6, 0)).species).toBe('blob');
  });

  test('starts with healthy stats at level 1', async () => {
    const pet = hatch(T0, seq(0, 0));
    expect(pet.hunger).toBe(80);
    expect(pet.happiness).toBe(80);
    expect(pet.energy).toBe(100);
    expect(pet.xp).toBe(0);
    expect(levelOf(pet.xp)).toBe(1);
    expect(pet.bornAt).toBe(T0);
    expect(pet.lastActiveAt).toBe(T0);
  });
});

describe('decay', () => {
  const pet = { ...hatch(T0, seq(0, 0)), hunger: 80, happiness: 80, energy: 80 };

  test('awake time drains every stat', async () => {
    const later = decay(pet, T0 + 20 * 60000);
    expect(later.hunger < 80).toBe(true);
    expect(later.happiness < 80).toBe(true);
    expect(later.energy < 80).toBe(true);
  });

  test('sleep refills energy after 30 idle minutes', async () => {
    const later = decay(pet, T0 + 3 * HOUR);
    expect(later.energy > 80).toBe(true);
    expect(later.hunger < 80).toBe(true);
  });

  test('stats stay inside 0..100 and the pet never dies', async () => {
    const later = decay(pet, T0 + 1000 * HOUR);
    expect(later.hunger).toBe(0);
    expect(later.happiness).toBe(0);
    expect(later.energy).toBe(100);
    expect(moodOf(later, T0 + 1000 * HOUR)).toBe('sleeping');
  });

  test('is pure and splits cleanly', async () => {
    const once = decay(pet, T0 + 2 * HOUR);
    const twice = decay(decay(pet, T0 + HOUR), T0 + 2 * HOUR);
    expect(Math.abs(once.hunger - twice.hunger) < 1e-9).toBe(true);
    expect(Math.abs(once.energy - twice.energy) < 1e-9).toBe(true);
    expect(pet.hunger).toBe(80);
  });

  test('time going backwards changes nothing', async () => {
    expect(decay(pet, T0 - HOUR).hunger).toBe(80);
  });
});

describe('events', () => {
  const base = { ...hatch(T0, seq(0, 0)), hunger: 50, happiness: 50, energy: 50 };

  test('an answer feeds and gives small xp', async () => {
    const after = applyEvent(base, { type: 'answer' }, T0);
    expect(after.hunger > 50).toBe(true);
    expect(after.xp).toBe(5);
  });

  test('an errored tool makes it sad for a while', async () => {
    const after = applyEvent(base, { type: 'toolError' }, T0);
    expect(after.happiness < 50).toBe(true);
    expect(moodOf(after, T0 + 60000)).toBe('sad');
    expect(moodOf(after, T0 + 10 * 60000)).not.toBe('sad');
  });

  test('passing tests make it happy with big xp, once a minute', async () => {
    const after = applyEvent(base, { type: 'testsPassed' }, T0);
    expect(after.happiness > 50).toBe(true);
    expect(after.xp).toBe(40);
    expect(moodOf(after, T0 + 1000)).toBe('happy');
    expect(applyEvent(after, { type: 'testsPassed' }, T0 + 30000).xp).toBe(40);
    expect(applyEvent(after, { type: 'testsPassed' }, T0 + 61000).xp).toBe(80);
  });

  test('activity wakes it', async () => {
    const asleep = { ...base, lastActiveAt: T0 - HOUR };
    expect(moodOf(asleep, T0)).toBe('sleeping');
    expect(moodOf(applyEvent(asleep, { type: 'activity' }, T0), T0)).not.toBe('sleeping');
  });

  test('rename', async () => {
    expect(applyEvent(base, { type: 'rename', name: 'Pip' }, T0).name).toBe('Pip');
  });
});

describe('mood and hints', () => {
  const pet = (s: any) => ({ ...hatch(T0, seq(0, 0)), ...s });
  test('mood from stats', async () => {
    expect(moodOf(pet({ hunger: 90, happiness: 90, energy: 90 }), T0)).toBe('happy');
    expect(moodOf(pet({ hunger: 60, happiness: 50, energy: 60 }), T0)).toBe('ok');
    expect(moodOf(pet({ hunger: 25, happiness: 60, energy: 60 }), T0)).toBe('hungry');
    expect(moodOf(pet({ hunger: 60, happiness: 25, energy: 60 }), T0)).toBe('sad');
    expect(moodOf(pet({ hunger: 10, happiness: 60, energy: 60 }), T0)).toBe('grumpy');
    expect(moodOf(pet({ hunger: 60, happiness: 60, energy: 10 }), T0)).toBe('grumpy');
    expect(moodOf(pet({ lastActiveAt: T0 - SLEEP_AFTER_MS }), T0)).toBe('sleeping');
  });

  test('hint names the lowest need', async () => {
    expect(hintOf(pet({ hunger: 20, happiness: 90, energy: 90 }))).toBe('feed me a task');
    expect(hintOf(pet({ hunger: 90, happiness: 20, energy: 90 }))).toBe('pass some tests?');
    expect(hintOf(pet({ hunger: 90, happiness: 90, energy: 10 }))).toBe('needs a nap');
    expect(hintOf(pet({ hunger: 90, happiness: 90, energy: 90 }))).toBe('');
  });
});

describe('levels', () => {
  test('curve: each level needs 50 more xp than the last', async () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(49)).toBe(1);
    expect(levelOf(50)).toBe(2);
    expect(levelOf(149)).toBe(2);
    expect(levelOf(150)).toBe(3);
    expect(levelOf(300)).toBe(4);
  });

  test('progress inside a level', async () => {
    expect(levelProgress(75)).toEqual({ level: 2, into: 25, need: 100 });
  });
});

describe('labels', () => {
  test('age', async () => {
    expect(ageLabel(T0, T0 + 5 * 60000)).toBe('5 min');
    expect(ageLabel(T0, T0 + 3 * HOUR)).toBe('3 h');
    expect(ageLabel(T0, T0 + 24 * HOUR)).toBe('1 day');
    expect(ageLabel(T0, T0 + 50 * 24 * HOUR)).toBe('50 days');
  });

  test('names are cleaned', async () => {
    expect(cleanName('  Sir   Pounce ')).toBe('Sir Pounce');
    expect(cleanName('a\u0007b')).toBe('ab');
    expect(cleanName('x'.repeat(40)).length).toBe(16);
    expect(cleanName('   ')).toBe('');
  });
});
