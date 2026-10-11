import { test, expect, mock, describe } from 'claude-code/testing';

const NOW = new Date(2026, 9, 11, 9, 0).getTime();
const MIN = 60000;
const SESSION = { surface: 'terminal', isInteractive: true, cwd: '/work' };
const BAND = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} };
const PANE = { title: 'Pet', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} };
const PRESENTATION = { isFullscreen: false, columns: 100 };

const seeded = (changes: Record<string, unknown> = {}) => ({
  species: 'cat', name: 'Mochi', hunger: 60, happiness: 60, energy: 80, xp: 0,
  bornAt: NOW - 2 * 24 * 60 * MIN, updatedAt: NOW, lastActiveAt: NOW, lastTestsAt: 0, flash: null, ...changes,
});

function world(on: any, stored: Record<string, unknown> = {}) {
  const opened: any[] = [];
  const registered: any[] = [];
  const toasts: string[] = [];
  const closes: any[] = [];
  let invalidations = 0;
  let toolResult: any = { result: { stdout: '', stderr: '', interrupted: false }, text: '' };
  const clock = mock.clock(on, { now: NOW });
  const store: Record<string, unknown> = { ...stored };
  on('store.get', ($: any, e: any) => ({ value: store[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(store[e.key])) }));
  on('store.set', ($: any, e: any) => { store[e.key] = JSON.parse(JSON.stringify(e.value)); return { value: undefined }; });
  on('store.delete', ($: any, e: any) => { delete store[e.key]; return { value: undefined }; });
  on('store.keys', () => ({ value: Object.keys(store) }));
  on('session.start', ($: any, e: any) => ({ cwd: e.cwd }));
  on('command.register', ($: any, e: any) => { registered.push(e); return { value: { command: e.name } }; });
  on('prompt.submit', ($: any, e: any) => ({ text: e.text }));
  on('turn.complete', ($: any, e: any) => ({ text: e.answer }));
  on('tool.call', () => toolResult);
  on('ui.open', ($: any, e: any) => { opened.push(e); openPanes.push(e.id); return { value: { isPlaced: true } }; });
  on('ui.close', ($: any, e: any) => { closes.push(e); return { value: undefined }; });
  on('ui.invalidate', () => { invalidations += 1; return { value: undefined }; });
  on('ui.toast', ($: any, e: any) => { toasts.push(e.text); return { value: undefined }; });
  on('ui.render', ($: any, e: any) => { const { Box } = $.ui.resolve(e); return Box({ key: 'engine' }); });
  let openPanes: string[] = [];
  on('ui.panes', () => ({ value: openPanes.map((id) => ({ id, title: id, isShown: true, isFocused: true, isPlaced: true })) }));
  return {
    opened, registered, toasts, closes, clock, store,
    invalidations: () => invalidations,
    setTool: (r: any) => { toolResult = r; },
    closeAll: () => { openPanes = []; },
  };
}

const answer = (reason = 'answer') => ({ answer: 'done', durationMs: 1, isAborted: reason === 'aborted', turnId: 't1', reason });
const bash = (stdout: string) => ({ result: { stdout, stderr: '', interrupted: false }, text: stdout });
const cmd = ($: any, args: string) => $.command.run({ command: 'pet', args, origin: { kind: 'composer' }, presentation: PRESENTATION });
const bandText = async ($: any, props: any = BAND) => {
  const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'AbovePrompt', props });
  return (await ui.find({ key: 'pet-band' }))?.text;
};

describe('pet wiring', () => {
  test('first start registers /pet and hatches an egg', async ($: any, on: any) => {
    const w = world(on);
    await $.session.start(SESSION);
    expect(w.registered.map((r) => r.name)).toContain('pet');
    const pet = w.store.pet as any;
    expect(['cat', 'dog', 'blob', 'dragon']).toContain(pet.species);
    expect(w.toasts.join(' ')).toContain('hatched');
  });

  test('a known pet is not hatched again', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    await $.session.start(SESSION);
    expect((w.store.pet as any).name).toBe('Mochi');
    expect(w.toasts.join(' ')).not.toContain('hatched');
  });

  test('an answered turn feeds it and gives xp; an aborted one does not', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    await $.turn.complete(answer('aborted'));
    expect((w.store.pet as any).xp).toBe(0);
    await $.turn.complete(answer());
    expect((w.store.pet as any).hunger > 60).toBe(true);
    expect((w.store.pet as any).xp).toBe(5);
  });

  test('an errored tool makes it sad', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    w.setTool({ isError: true, result: 'boom', text: 'boom' });
    await $.tool.call({ tool: 'Read', file_path: '/nope' });
    expect((w.store.pet as any).happiness < 60).toBe(true);
    expect(await bandText($)).toContain('sad');
  });

  test('passing tests in Bash: happy and big xp', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    w.setTool(bash('Tests:  12 passed, 12 total'));
    await $.tool.call({ tool: 'Bash', command: 'npm test' });
    expect((w.store.pet as any).xp).toBe(40);
    expect(await bandText($)).toContain('happy');
  });

  test('failing tests in Bash give nothing', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    w.setTool(bash('0 passed, 3 failed'));
    await $.tool.call({ tool: 'Bash', command: 'npm test' });
    expect((w.store.pet as any).xp).toBe(0);
  });

  test('level up shows a toast', async ($: any, on: any) => {
    const w = world(on, { pet: seeded({ xp: 48 }) });
    await $.turn.complete(answer());
    expect(w.toasts.join(' ')).toContain('level 2');
  });

  test('/pet name renames it', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    const out = await cmd($, 'name   Sir Pounce ');
    expect((w.store.pet as any).name).toBe('Sir Pounce');
    expect(out.text).toContain('Sir Pounce');
    expect((await cmd($, 'name')).text).toContain('/pet name <name>');
    expect((w.store.pet as any).name).toBe('Sir Pounce');
  });

  test('/pet opens the pane and animates until it closes', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    await cmd($, '');
    expect(w.opened[0].id).toBe('pet');
    const before = w.invalidations();
    await w.clock.advance(5000);
    expect(w.invalidations() > before).toBe(true);
    w.closeAll();
    await w.clock.advance(1000);
    const after = w.invalidations();
    await w.clock.advance(5000);
    expect(w.invalidations()).toBe(after);
  });

  test('pane draws art, bars, level and age', async ($: any, on: any) => {
    world(on, { pet: seeded({ xp: 75 }) });
    const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: PANE });
    expect((await ui.find({ key: 'pet-header' }))?.text).toContain('Mochi the cat');
    expect((await ui.find({ key: 'pet-art' }))?.text).toContain('/\\_/\\');
    expect((await ui.find({ key: 'pet-stat-hunger' }))?.text).toContain('████');
    expect((await ui.find({ key: 'pet-stat-hunger' }))?.text).toContain('░');
    expect((await ui.find({ key: 'pet-level' }))?.text).toContain('level 2');
    expect((await ui.find({ key: 'pet-level' }))?.text).toContain('25/100 xp');
    expect((await ui.find({ key: 'pet-age' }))?.text).toContain('2 days');
  });

  test('narrow pane stacks and still draws', async ($: any, on: any) => {
    world(on, { pet: seeded() });
    const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'Pane', requestId: 'pet', props: { ...PANE, bodyColumns: 30 } });
    expect((await ui.find({ key: 'pet-stat-energy' }))?.text).toContain('energy');
  });

  test('band: face, name and mood on one row', async ($: any, on: any) => {
    world(on, { pet: seeded({ hunger: 90, happiness: 90, energy: 90 }) });
    const text = await bandText($);
    expect(text).toContain('=^w^=');
    expect(text).toContain('Mochi');
    expect(text).toContain('happy');
  });

  test('band: hint when hungry', async ($: any, on: any) => {
    world(on, { pet: seeded({ hunger: 20 }) });
    expect(await bandText($)).toContain('feed me a task');
  });

  test('band: sleeps after 30 idle minutes, decay drawn without writing', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    await w.clock.advance(31 * MIN);
    expect(await bandText($)).toContain('sleeping');
    expect((w.store.pet as any).updatedAt).toBe(NOW);
  });

  test('band yields to a survey', async ($: any, on: any) => {
    world(on, { pet: seeded() });
    const ui = await $.ui.mount({ plugin: 'pet', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, hasSurvey: true } });
    expect(await ui.find({ key: 'pet-band' })).toBe(undefined);
    expect(await ui.find({ key: 'engine' })).toBeDefined();
  });

  test('a prompt wakes it', async ($: any, on: any) => {
    const w = world(on, { pet: seeded() });
    await w.clock.advance(60 * MIN);
    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } });
    expect(await bandText($)).not.toContain('sleeping');
  });


  test('other surfaces get the engine drawing', async ($: any, on: any) => {
    world(on, { pet: seeded() });
    const ui = await $.ui.mount({ plugin: 'pet', surface: 'desktop', component: 'AbovePrompt', props: BAND });
    expect(await ui.find({ key: 'pet-band' })).toBe(undefined);
    expect(await ui.find({ key: 'engine' })).toBeDefined();
  });
});
