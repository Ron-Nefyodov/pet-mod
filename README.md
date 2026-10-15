# Pet

A tiny terminal pet that lives on your coding sessions.

## Why

Long sessions get dull. A pet makes your progress visible: it is happy when
your tests pass and sad when a tool fails, so you notice both at a glance.

- **Reacts to real work.** It watches answers, tool errors and passing test runs.
- **Out of the way.** One line above the prompt. `/pet` for the big view.
- **Never dies.** Leave for a week; it just gets grumpy.
- **Private.** It lives in the mod's local store. No network calls.

## Use

Your pet hatches on first start: a cat, dog, blob or dragon. It lives in one
line above your prompt.

- **Fed** when Claude answers. **Sad** when a tool fails.
- **Happy** (and big xp) when your tests pass.
- **Sleeps** after 30 idle minutes.
- Levels up as you work. It never dies — it just gets grumpy.

| Command | What |
|---------|------|
| `/pet` | Big view: art, food / happiness / energy bars, level, age |
| `/pet name <name>` | Name your pet |

## Install

    /plugin marketplace add Ron-Nefyodov/pet-mod
    /plugin install pet@pet

Or try it locally: `claude --plugin-dir .`

## Develop

    npm test            # claude plugin test .
    claude plugin validate .
