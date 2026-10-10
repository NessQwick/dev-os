---
birthdate:
life_expectancy: 80
daily_folder: 01 Journal/Daily
weekly_folder: 01 Journal/Weekly
quarterly_folder: 01 Journal/Quarterly
retreat_folder: 02 Retreats
projects_folder: 04 Projects
sprints_folder: 04 Projects/Sprints
meetings_folder: 10 Meetings
decisions_folder: 06 Writing/Decisions
docs_folder: 06 Writing
clippings_folder: 07 Library/Clippings
releases_folder: 06 Writing/Releases
dq_prefix: dq_
habit_prefix: habit_
wheel_prefix: wheel_
board_done_lanes: Done,Published,Archive
questions:
  - key: dq_goals
    text: Did I do my best to set clear goals today?
  - key: dq_progress
    text: Did I do my best to make progress toward my goals?
  - key: dq_meaning
    text: Did I do my best to find meaning?
  - key: dq_happy
    text: Did I do my best to be happy?
  - key: dq_relationships
    text: Did I do my best to build positive relationships?
  - key: dq_engaged
    text: Did I do my best to be fully engaged?
habits:
  - habit_journal
  - habit_exercise
  - habit_reading
wheel_areas:
  - wheel_health
  - wheel_relationships
  - wheel_family
  - wheel_career
  - wheel_finances
  - wheel_growth
  - wheel_fun
  - wheel_meaning
---
# Dev OS Config

The single place the system reads its settings from. Every dashboard widget in `Meta/views/` starts with `dv.page("Meta/Dev OS Config")`, and the daily, retreat, and questions templates read the lists below when a new note is created. Change things here; nothing else needs to move.

## Dev OS folders
| Property | Used by | Default |
| --- | --- | --- |
| `projects_folder` | Projects screen, project page, task index | `04 Projects` |
| `sprints_folder` | Sprint screen, project page | `04 Projects/Sprints` |
| `meetings_folder` | Meetings screen, meeting minutes composer | `10 Meetings` |
| `decisions_folder` | Docs screen, New ADR | `06 Writing/Decisions` |
| `docs_folder` | Docs screen (tech notes, postmortems) | `06 Writing` |
| `clippings_folder` | Inbox screen, Web Clipper templates | `07 Library/Clippings` |
| `releases_folder` | Docs, Releases; Roadmap release markers | `06 Writing/Releases` |

Change a folder here and in the Templater folder templates together. Web Clipper templates in `Meta/Web Clipper/` carry their own `path`; edit it there too.

## Personal
| Property | Used by | Notes |
| --- | --- | --- |
| `birthdate` | Memento Mori widget | ISO date, `YYYY-MM-DD`. Empty until you set it. |
| `life_expectancy` | Memento Mori widget | years |

## Daily questions (`questions`)
"Did I do my best to ..." rated 1 to 10, from Marshall Goldsmith's *Triggers*. Effort, not results. The six shipped are Goldsmith's universal set. Edit the text, rename keys (keep the `dq_` prefix, lowercase, no spaces), add or remove entries. New daily notes pick the list up automatically; the end-of-day prompt asks them in this order; dashboards discover whatever `dq_*` exists.

Preset for engineering work, paste over the list if you prefer it:
```yaml
questions:
  - {key: dq_deep_work, text: Did I do my best to protect deep work?}
  - {key: dq_unblock, text: Did I do my best to unblock others?}
  - {key: dq_ship, text: Did I do my best to ship something small?}
  - {key: dq_learn, text: Did I do my best to learn something?}
  - {key: dq_communicate, text: Did I do my best to communicate clearly?}
  - {key: dq_rest, text: Did I do my best to rest and recover?}
```

## Habits (`habits`)
Checkbox properties added to every new daily note. Keep 3 to 5 per season. Prefix `habit_`.

## Wheel of life (`wheel_areas`)
Number properties (1 to 10) added to every new personal retreat note. Rename freely with the `wheel_` prefix; the radar chart labels itself from the key.

## Folders and prefixes
| Property | Used by |
| --- | --- |
| `daily_folder`, `weekly_folder`, `quarterly_folder`, `retreat_folder`, `projects_folder` | widgets and quick links; must match the Periodic Notes settings |
| `dq_prefix`, `habit_prefix`, `wheel_prefix` | property discovery |
| `board_done_lanes` | Kanban lanes that count as finished on the Boards dashboard |

Not in English? Rename the keys (`dq_aprender`) and translate the `text` values; every chart labels itself from the key. The Guide stays in English.
