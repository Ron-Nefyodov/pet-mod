import { cleanName } from './pet.js';

export const PANE_ID = 'pet';
export const FRAME_MS = 800;

export const COMMAND = {
  name: 'pet',
  description: 'Visit your terminal pet',
  argumentHint: '[name <name>]',
};

export const HELP_TEXT = 'Usage: /pet opens your pet · /pet name <name> renames it';

export function parsePetArgs(args) {
  const text = String(args ?? '').trim();
  if (text === '') return { action: 'open' };
  const match = /^name(?:\s+([\s\S]*))?$/i.exec(text);
  if (match) {
    const name = cleanName(match[1]);
    return name ? { action: 'rename', name } : { action: 'help' };
  }
  return { action: 'help' };
}
