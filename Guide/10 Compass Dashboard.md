Everything is DataviewJS reading properties; nothing on the page is typed by hand.

## Widgets and where they read from
| Widget | View | Reads |
| --- | --- | --- |
| Wheel of life from this quarter's retreat | `Meta/views/wheel.js` | `wheel_*` numbers in `02 Retreats/YYYY-QN Personal Retreat.md`, found by today's date |
| Combined daily questions, toggles, time-frame dropdown | `Meta/views/dailyquestions.js` | every `dq_*` number in the daily notes |
| Habits: current streak, best streak, longest break, completion %, total, recent days | `Meta/views/habits.js` | every `habit_*` checkbox in the daily notes |
| Life theme | embed | `03 Planning/Life Theme.md#Theme` |
| Memento mori | `Meta/views/memento.js` | `birthdate`, `life_expectancy` in `Meta/Compass Config.md` |
| Quick links to capture and to the planning notes | `Meta/views/quicklinks.js` | QuickAdd command ids, today's date |

Also: `Projects Dashboard.md` (his projects dashboard, 19:03), `Daily Questions.md` (his journaling dashboards, 18:54), `Habit Canvas.md`, `Task Dashboard.md`.

## Using a view anywhere
```dataviewjs
await dv.view("Meta/views/habits", { days: 28 });
await dv.view("Meta/views/dailyquestions", { from: "2026-07-01", to: "2026-09-30" });
await dv.view("Meta/views/wheel", { page: "02 Retreats/2026-Q2 Personal Retreat" });
await dv.view("Meta/views/week", { week: "2026-W35" });
```

## Configuration
`Meta/Compass Config.md` holds folders, prefixes, birthdate, life expectancy. Views fall back to sensible defaults if the config is missing.

## Extending
Mike built his with Claude's help. To add a widget: copy `Meta/views/habits.js`, keep the first four lines (config, folder, prefix), change what it collects and renders, and call it with `dv.view`. Views cannot import each other, so each is self-contained.
