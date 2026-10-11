import { ART_WIDTH, artFrame, colorOf, faceOf, moodLine } from './art.js';
import { ageLabel, levelProgress } from './pet.js';

const LABEL_WIDTH = 10;

export function statBar(value, width) {
  const ratio = Math.max(0, Math.min(100, value)) / 100;
  const filled = value > 0 ? Math.max(1, Math.round(ratio * width)) : 0;
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function moodLabel(mood) {
  return mood === 'sleeping' ? 'sleeping zZz' : mood;
}

export function bandSegments(pet, mood, hint, columns) {
  const segments = [
    { text: faceOf(pet.species, mood), color: colorOf(pet.species), bold: true },
    { text: ` ${pet.name}`, bold: true },
    { text: ` · ${moodLabel(mood)}`, dimColor: true },
  ];
  if (hint) segments.push({ text: ` · ${hint}`, color: 'warning' });
  return fit(segments, Math.max(0, columns));
}

function fit(segments, columns) {
  const out = [];
  let left = columns;
  for (const segment of segments) {
    if (left <= 0) break;
    if (segment.text.length <= left) {
      out.push(segment);
      left -= segment.text.length;
      continue;
    }
    out.push({ ...segment, text: left > 1 ? `${segment.text.slice(0, left - 1)}…` : segment.text.slice(0, left) });
    break;
  }
  return out;
}

export function drawBand({ Box, Text }, segments) {
  return Box({
    key: 'pet-band', flexDirection: 'row',
    children: segments.map((segment) => Text({
      wrap: 'truncate',
      ...(segment.color && { color: segment.color }),
      ...(segment.bold && { bold: true }),
      ...(segment.dimColor && { dimColor: true }),
      children: [segment.text],
    })),
  });
}

function statLine(label, value, width) {
  return `${label.padEnd(LABEL_WIDTH)}${statBar(value, width)} ${String(Math.round(value)).padStart(3)}`;
}

export function drawPane({ Box, Text }, { pet, mood, frame, now, columns }) {
  const row = (key, props) => Box({ key, children: [Text(props)] });
  const width = Math.max(20, (columns ?? 60) - 2);
  const isWide = width >= ART_WIDTH + 2 + LABEL_WIDTH + 16;
  const barWidth = Math.max(6, Math.min(20, (isWide ? width - ART_WIDTH - 2 : width) - LABEL_WIDTH - 4));
  const color = colorOf(pet.species);
  const progress = levelProgress(pet.xp);

  const art = Box({
    key: 'pet-art', flexDirection: 'column', width: ART_WIDTH, flexShrink: 0,
    children: artFrame(pet.species, mood, frame).map((line) => Text({ color, children: [line] })),
  });
  const stats = Box({
    flexDirection: 'column', ...(isWide ? { marginLeft: 2 } : { marginTop: 1 }),
    children: [
      row('pet-stat-hunger', { children: [statLine('food', pet.hunger, barWidth)] }),
      row('pet-stat-happiness', { children: [statLine('happiness', pet.happiness, barWidth)] }),
      row('pet-stat-energy', { children: [statLine('energy', pet.energy, barWidth)] }),
      row('pet-level', {
        color,
        children: [`${`level ${progress.level}`.padEnd(LABEL_WIDTH)}${statBar((progress.into / progress.need) * 100, barWidth)} ${progress.into}/${progress.need} xp`],
      }),
      row('pet-age', { dimColor: true, children: [`${'age'.padEnd(LABEL_WIDTH)}${ageLabel(pet.bornAt, now)}`] }),
    ],
  });

  return Box({
    key: 'pet-pane', flexDirection: 'column', paddingX: 1,
    children: [
      Box({
        key: 'pet-header', flexDirection: 'row',
        children: [
          Text({ bold: true, color, children: [pet.name] }),
          Text({ dimColor: true, children: [` the ${pet.species} · level ${progress.level} · ${moodLabel(mood)}`] }),
        ],
      }),
      Box({ flexDirection: isWide ? 'row' : 'column', marginTop: 1, children: [art, stats] }),
      Box({ key: 'pet-mood', marginTop: 1, children: [Text({ italic: true, children: [moodLine(pet.name, pet.species, mood)] })] }),
      row('pet-footer', { dimColor: true, children: ['/pet name <name> · Esc closes'] }),
    ],
  });
}
