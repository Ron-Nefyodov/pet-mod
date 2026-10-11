import { hatch, levelOf, normalizePet } from './pet.js';

export const PET_KEY = 'pet';

let chain = Promise.resolve();

// Serializes read-modify-write so parallel tool calls lose no update.
export function updatePet(io, now, change, random = Math.random) {
  const run = chain.then(async () => {
    const stored = normalizePet(await io.get(PET_KEY));
    const before = stored ?? hatch(now, random);
    const after = change(before);
    await io.set(PET_KEY, after);
    return { before, after, hatched: !stored };
  });
  chain = run.catch(() => undefined);
  return run;
}

export function noticesOf({ before, after, hatched }) {
  const notices = [];
  if (hatched) notices.push(`An egg hatched! Meet ${after.name} the ${after.species}. Say hi with /pet`);
  const level = levelOf(after.xp);
  if (level > levelOf(before.xp)) notices.push(`★ ${after.name} reached level ${level}!`);
  return notices;
}
