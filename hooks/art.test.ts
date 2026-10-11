import { test, expect, describe } from 'claude-code/testing';
import { ART_WIDTH, ART_HEIGHT, artFrame, colorOf, faceOf, moodLine } from './art.js';
import { SPECIES, MOODS } from './pet.js';

describe('art', () => {
  test('every species has 2+ frames of one fixed size', async () => {
    for (const species of SPECIES) {
      for (const mood of MOODS) {
        const a = artFrame(species, mood, 0);
        const b = artFrame(species, mood, 1);
        expect(a.join('\n')).not.toBe(b.join('\n'));
        for (const frame of [a, b]) {
          expect(frame.length).toBe(ART_HEIGHT);
          for (const line of frame) expect(line.length).toBe(ART_WIDTH);
        }
      }
    }
  });

  test('frames loop', async () => {
    expect(artFrame('cat', 'ok', 2)).toEqual(artFrame('cat', 'ok', 0));
  });

  test('moods change the face', async () => {
    for (const species of SPECIES) {
      const faces = new Set(MOODS.map((mood) => faceOf(species, mood)));
      expect(faces.size).toBe(MOODS.length);
      const widths = new Set(MOODS.map((mood) => faceOf(species, mood).length));
      expect(widths.size).toBe(1);
      expect(artFrame(species, 'happy', 0).join('')).not.toBe(artFrame(species, 'sad', 0).join(''));
    }
  });

  test('each species has its own color', async () => {
    expect(new Set(SPECIES.map(colorOf)).size).toBe(SPECIES.length);
  });

  test('mood copy names the pet', async () => {
    for (const species of SPECIES) {
      for (const mood of MOODS) expect(moodLine('Pip', species, mood)).toContain('Pip');
    }
    expect(moodLine('Pip', 'cat', 'happy')).toContain('purr');
  });
});
