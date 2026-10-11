export const ART_WIDTH = 14;
export const ART_HEIGHT = 5;

const EYES = {
  happy: '^w^',
  ok: 'o.o',
  hungry: 'O~O',
  sad: ';_;',
  grumpy: '>_<',
  sleeping: '-.-',
};

const SPECIES_ART = {
  cat: {
    color: 'warning',
    face: (eyes) => `=${eyes}=`,
    frames: [
      [
        String.raw`  /\_/\       `,
        String.raw` ( @@@ )      `,
        String.raw`  > ^ <    )  `,
        String.raw` /     \  (   `,
        String.raw`(_|_ _|_)_/   `,
      ],
      [
        String.raw`  /\_/\       `,
        String.raw` ( @@@ )      `,
        String.raw`  > ^ <  (    `,
        String.raw` /     \  )   `,
        String.raw`(_|_ _|_)_\   `,
      ],
    ],
    happy: 'purrs and kneads the keyboard.',
    sleeping: 'is curled up in a warm loop. zZz',
  },
  dog: {
    color: 'suggestion',
    face: (eyes) => `U${eyes}U`,
    frames: [
      [
        String.raw` __      __   `,
        String.raw`/  \____/  \  `,
        String.raw`\_|  @@@  |_/ `,
        String.raw`  |  (_)  | / `,
        String.raw`  '-------'/  `,
      ],
      [
        String.raw` __      __   `,
        String.raw`/  \____/  \  `,
        String.raw`\_|  @@@  |_/ `,
        String.raw`  |  (_)  | \ `,
        String.raw`  '-------'\  `,
      ],
    ],
    happy: 'wags so hard the whole terminal shakes.',
    sleeping: 'is snoring on the rug. zZz',
  },
  blob: {
    color: 'merged',
    face: (eyes) => `(${eyes})`,
    frames: [
      [
        String.raw`              `,
        String.raw`    .---.     `,
        String.raw`   ( @@@ )    `,
        String.raw`  (       )   `,
        String.raw`   '-----'    `,
      ],
      [
        String.raw`     .-.      `,
        String.raw`   .'   '.    `,
        String.raw`   ( @@@ )    `,
        String.raw`   (     )    `,
        String.raw`    '---'     `,
      ],
    ],
    happy: 'jiggles with pure joy.',
    sleeping: 'has melted into a sleepy puddle. zZz',
  },
  dragon: {
    color: 'success',
    face: (eyes) => `<${eyes}>`,
    frames: [
      [
        String.raw`    __/\__    `,
        String.raw` /\( @@@ )/\  `,
        String.raw` \ \ \/\/ / / `,
        String.raw`    /    \__~ `,
        String.raw`   ^^    ^^   `,
      ],
      [
        String.raw` /\_ /\ _/\   `,
        String.raw` \ ( @@@ ) /  `,
        String.raw`   \ \/\/ /   `,
        String.raw`    /    \__~ `,
        String.raw`   ^^    ^^   `,
      ],
    ],
    happy: 'puffs a happy little smoke ring.',
    sleeping: 'snores tiny sparks. zZz',
  },
};

const MOOD_COPY = {
  ok: 'is hanging out, watching you code.',
  hungry: "'s tummy rumbles. Got a task?",
  sad: 'looks a little down. Errors happen.',
  grumpy: 'is grumpy and wants some attention.',
};

const SNORE = ['z ', ' Z'];

export function colorOf(species) {
  return SPECIES_ART[species]?.color ?? 'text';
}

export function faceOf(species, mood) {
  return SPECIES_ART[species].face(EYES[mood] ?? EYES.ok);
}

export function artFrame(species, mood, frameIndex) {
  const art = SPECIES_ART[species];
  const index = ((frameIndex % art.frames.length) + art.frames.length) % art.frames.length;
  const eyes = EYES[mood] ?? EYES.ok;
  const lines = art.frames[index].map((line) => line.replace('@@@', eyes).padEnd(ART_WIDTH));
  if (mood === 'sleeping') {
    lines[0] = lines[0].slice(0, ART_WIDTH - 2) + SNORE[index % SNORE.length];
  }
  return lines;
}

export function moodLine(name, species, mood) {
  const art = SPECIES_ART[species];
  const copy = art[mood] ?? MOOD_COPY[mood] ?? MOOD_COPY.ok;
  return copy.startsWith("'") ? `${name}${copy}` : `${name} ${copy}`;
}
