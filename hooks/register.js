import { COMMAND, FRAME_MS, HELP_TEXT, PANE_ID as PET_PANE_ID, parsePetArgs } from './commands.js';
import { bandSegments, drawBand, drawPane } from './draw.js';
import { applyEvent, decay, hintOf, moodOf, normalizePet } from './pet.js';
import { PET_KEY, noticesOf, updatePet } from './pet-store.js';
import { bashOutputOf, looksLikePassingTests } from './testpass.js';

let ticker = null;

export function register(on) {
  on('session.start', async ($, e, next) => {
    const result = await next(e);
    try {
      await $.command.register(COMMAND);
      const now = await $.clock.now();
      const change = await updatePet({ get: (k) => $.store.get(k), set: (k, v) => $.store.set(k, v) }, now, (p) => applyEvent(p, { type: 'activity' }, now));
      for (const text of noticesOf(change)) $.ui.toast(text, { timeoutMs: 6000 });
      $.ui.invalidate('ui.render');
    } catch {
      // The pet is best effort; never block a session.
    }
    return result;
  }).catch(($, e, next) => next(e));

  on('prompt.submit', async ($, e, next) => {
    const result = await next(e);
    if (e.origin.kind === 'composer') {
      try {
        const now = await $.clock.now();
        await updatePet({ get: (k) => $.store.get(k), set: (k, v) => $.store.set(k, v) }, now, (p) => applyEvent(p, { type: 'activity' }, now));
        $.ui.invalidate('ui.render');
      } catch {
      }    }
    return result;
  }).catch(($, e, next) => next(e));

  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    try {
      if (e.reason === 'answer' && e.agentId === undefined) {
        const now = await $.clock.now();
        const change = await updatePet({ get: (k) => $.store.get(k), set: (k, v) => $.store.set(k, v) }, now, (p) => applyEvent(p, { type: 'answer' }, now));
        for (const text of noticesOf(change)) $.ui.toast(text, { timeoutMs: 6000 });
        $.ui.invalidate('ui.render');
      }
    } catch {
      // best effort
    }    return result;
  }).catch(($, e, next) => next(e));

  on('tool.call', async ($, e, next) => {
    const result = await next(e);
    try {
      if (result && !result.deny) {
        const type = result.isError ? 'toolError'
          : e.tool === 'Bash' && looksLikePassingTests(bashOutputOf(result)) ? 'testsPassed'
          : 'activity';
        const now = await $.clock.now();
        const change = await updatePet({ get: (k) => $.store.get(k), set: (k, v) => $.store.set(k, v) }, now, (p) => applyEvent(p, { type }, now));
        for (const text of noticesOf(change)) $.ui.toast(text, { timeoutMs: 6000 });
        if (type !== 'activity') $.ui.invalidate('ui.render');
      }
    } catch {
      // best effort
    }
    return result;
  }).catch(($, e, next) => next(e));

  on('command.run', { command: 'pet' }, async ($, e, next) => {
    const args = parsePetArgs(e.args);
    if (args.action === 'help') return { text: HELP_TEXT };
    const now = await $.clock.now();
    const io = { get: (k) => $.store.get(k), set: (k, v) => $.store.set(k, v) };

    if (args.action === 'rename') {
      const change = await updatePet(io, now, (p) => applyEvent(p, { type: 'rename', name: args.name }, now));
      $.ui.invalidate('ui.render');
      return { text: `Your ${change.after.species} is now called ${change.after.name}.` };
    }

    const change = await updatePet(io, now, (p) => applyEvent(p, { type: 'activity' }, now));
    for (const text of noticesOf(change)) $.ui.toast(text, { timeoutMs: 6000 });
    await $.ui.open({ id: PET_PANE_ID, title: change.after.name, focus: true, closeOnEscape: true, rows: 14 });
    if (!ticker) {
      ticker = $.clock.every(FRAME_MS, async () => {
        try {
          const isOpen = (await $.ui.panes()).some((pane) => pane.id === PET_PANE_ID);
          if (isOpen) {
            $.ui.invalidate('ui.render');
            return;
          }
        } catch {
          // fall through and stop
        }
        ticker?.cancel();
        ticker = null;
      });
    }
    $.ui.invalidate('ui.render');
    return {};
  }).catch(() => ({ text: '/pet hit an error. Try again.' }));

  on('ui.close', async ($, e, next) => {
    const result = await next(e);
    if (e.id === PET_PANE_ID && ticker) {
      ticker.cancel();
      ticker = null;
    }
    return result;
  }).catch(($, e, next) => next(e));

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) return next(e);
    try {
      const stored = normalizePet(await $.store.get(PET_KEY));
      if (!stored) return next(e);
      const now = await $.clock.now();
      const pet = decay(stored, now);
      return drawBand($.ui.resolve(e), bandSegments(pet, moodOf(stored, now), hintOf(pet), e.props.bodyColumns ?? 80));
    } catch {
      return next(e);
    }
  });

  on('ui.render', { component: 'Pane', requestId: 'pet' }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e);
    try {
      const stored = normalizePet(await $.store.get(PET_KEY));
      if (!stored) return next(e);
      const now = await $.clock.now();
      return drawPane($.ui.resolve(e), {
        pet: decay(stored, now),
        mood: moodOf(stored, now),
        frame: Math.floor(now / FRAME_MS) % 2,
        now,
        columns: e.props.bodyColumns,
      });
    } catch {
      return next(e);
    }
  });
}
