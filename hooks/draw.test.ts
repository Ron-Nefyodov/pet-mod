import { test, expect, describe } from 'claude-code/testing';
import { bandSegments, statBar } from './draw.js';

const textOf = (segments: any[]) => segments.map((s) => s.text).join('');

describe('band', () => {
  const pet = { name: 'Mochi', species: 'cat' };

  test('face, name and mood on one line', async () => {
    const text = textOf(bandSegments(pet, 'happy', '', 80));
    expect(text).toContain('=^w^=');
    expect(text).toContain('Mochi');
    expect(text).toContain('happy');
    expect(text).not.toContain('\n');
  });

  test('hint shows when a need is low', async () => {
    expect(textOf(bandSegments(pet, 'hungry', 'feed me a task', 80))).toContain('feed me a task');
  });

  test('sleeping says zZz', async () => {
    expect(textOf(bandSegments(pet, 'sleeping', '', 80))).toContain('zZz');
  });

  test('never wider than the band', async () => {
    for (const columns of [8, 12, 20, 30]) {
      expect(textOf(bandSegments(pet, 'hungry', 'feed me a task', columns)).length <= columns).toBe(true);
    }
  });
});

describe('statBar', () => {
  test('blocks fill by value', async () => {
    expect(statBar(100, 10)).toBe('██████████');
    expect(statBar(0, 10)).toBe('░░░░░░░░░░');
    expect(statBar(50, 10)).toBe('█████░░░░░');
    expect(statBar(54.9, 10)).toBe('█████░░░░░');
    expect(statBar(3, 10)).toBe('█░░░░░░░░░');
  });
});
