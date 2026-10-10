# Dev OS Application

Dev OS is the interactive dashboard above the vault (plugin id `life-os-app`, kept for compatibility with existing hotkeys). You work in it: add tasks, move sprint cards, write meeting minutes, change project and decision status, triage web clippings. Markdown and frontmatter remain the only data. There is no second database and no cloud dependency.

## Open it

Dev OS opens automatically after Obsidian loads the vault. Use `Ctrl/Cmd+Shift+L`, the compass ribbon icon, or **Dev OS: Open Dev OS home**. `Ctrl/Cmd+Shift+C` opens Capture. Every screen has an **Open Dev OS ...** command, and every note type has a **New ...** command (project, sprint, meeting minutes, decision, tech note, postmortem). If the view is missing after an upgrade, run **Reload app without saving** once.

## Screens

| Screen | Purpose | Data it reads | What it can write |
| --- | --- | --- | --- |
| Home | Attention tasks, active sprint, today's meetings, clip inbox count, projects, quick add | tasks, sprints, meetings, clippings | task lines |
| Today | Standup (done since the last working day, due or in progress, `#blocked`), quick add, attention list; daily check-in when the personal layer is on | tasks, daily note | `## Standup` in today's note, task lines |
| Sprint | Board for one sprint: To do, In progress, Done | `#sprint/<slug>` tasks, sprint notes | task status, sprint `status` |
| Projects | Cards with status and priority selects, progress, overdue | project notes and `#project/<slug>` tasks | project `status`, `priority` |
| Project page | Header, stakeholders, tabs: Overview, Tasks, Meetings, Docs, Clips | project note, its tasks, linked sprints, meetings, docs, clips | project properties, task lines, new meeting notes, meeting `## Notes`, clip `project` |
| Meetings | Minutes composer, upcoming, today, recent, open action items | `10 Meetings/` | new meeting notes, task lines |
| Docs | ADRs, tech notes, postmortems with type, status, and project filters | `06 Writing/` | doc `status`, new notes |
| Inbox | Web Clipper triage and template setup | `07 Library/Clippings/`, `Meta/Web Clipper/` | clip `project`, `status`, one move to Tech Notes |
| Tasks | Every open task grouped by urgency, with status and due date controls | task index | task lines |
| People, Library, Brain, AI | Person notes and discussion queue; books and clips; link graph; AI readiness | as before | task lines (People) |
| Plan, Review | Personal layer: horizons, calendar, effort and habit charts, life areas | periodic notes | nothing |

Plan and Review, plus the daily check-in on Today, appear only when **Show personal modules** is on (Settings, Dev OS, or the View menu).

## The project page

- **Header:** status and priority selects, target date, repository URL (opens in your browser), stakeholders as chips (add from `05 People`, remove with ×), progress meter, open and overdue counts, days to target.
- **Overview:** next five tasks, the active sprint with its goal and meter, the last meeting with its open action items, the latest decision.
- **Tasks:**
  - An add form with text, due, scheduled, sprint (the project's open sprints), owner (`#p/<slug>`), high priority, and blocked.
  - New tasks go under the project's task heading (default `## Tasks`; `## Inline tasks` in older notes; created at the end of the note if missing).
  - The list filters Open, In progress, Blocked, Done, and All, and groups by sprint. Each row has a checkbox, Start/Done, and a due date picker.
  - The list includes every task tagged `#project/<slug>` anywhere in the vault, including meeting action items.
- **Meetings:**
  - The minutes composer takes title, date, time, kind (meeting, standup, one-on-one, review, retro, planning), attendees (people chips plus free text), agenda, notes, a list of decisions, and a list of action items with owner and due date.
  - **Save minutes** creates `10 Meetings/<date> <title>.md` linked to the project. Action items become tasks tagged with the project and owner.
  - The draft survives refreshes and is kept in plugin data until you save or discard it.
  - Past meetings form a timeline. Expand one to see attendees, decisions (each with an **ADR** button that prefills a decision record), action items with checkboxes, and a box that appends a note to its `## Notes`.
- **Docs and Clips:** linked documents with status selects and New ADR, tech note, and postmortem buttons; clips assigned to the project, and a picker to assign one from the inbox.

## Write policy

- Every change goes through one class, `LifeOSWriter`, and happens only after an explicit click, Enter, or submit. The verifier fails the build if write APIs appear anywhere else in `main.js`.
- **Task lines:** the writer re-reads the file and changes the line only if it still matches what the screen showed. Otherwise it writes nothing, shows a notice, and refreshes.
- **Properties:** written with Obsidian's `processFrontMatter`, one key per action, unless a form writes several at once.
- **New notes:** created only at a path that does not exist yet. An existing note is never overwritten.
- **Moves:** use Obsidian's rename so links update. The only move is Inbox, Keep as tech note.
- **No deletion:** the plugin deletes nothing and has no network, process, or raw file-system write capability. External links open in your browser.
- **Templater:** notes created from Dev OS forms already have content, so Templater folder templates do not run over them. Notes created with QuickAdd or by hand still use the templates.

## Settings

Settings, Dev OS covers:
- show personal modules
- show sample data (notes tagged `example`)
- default project for quick add
- the project task heading
- discard saved meeting drafts

The View menu adds density, optional visuals, items per list, and both toggles. View preferences persist with the plugin.

## Brain graph

Choose Brain in the rail. Notes sit in five colored regions inside a rotatable brain shape; connections come only from resolved links. Drag to rotate, scroll to zoom, or use the arrow keys and plus/minus. Search or filter by region, select a node, then open it or browse its links. Standard graph opens Obsidian's Graph view. Templates, Guide, Meta, scripts, and build copies are omitted; at most 2,000 notes and 10,000 links are drawn.

## Architecture

`.obsidian/plugins/life-os-app/main.js` holds these pieces:

| Piece | What it does |
| --- | --- |
| Pure helpers | Task-line edits, section insertion, note builders |
| `LifeOSWriter` | Performs every write |
| `LifeOSData` | Read-only lookups for projects, people, sprints, meetings, docs, clippings |
| Form and Capture dialogs | The New ... forms and Capture |
| Dashboard view | Every screen above |
| Brain renderer | The link graph |
| Settings tab | The preferences listed under Settings |

`styles.css` owns the visual system (accent `--life-os-accent`, container queries for narrow panes). Folders come from `Meta/Dev OS Config.md` (`projects_folder`, `sprints_folder`, `meetings_folder`, `decisions_folder`, `docs_folder`, `clippings_folder`).

Dev OS composes the existing tools rather than replacing them:

- QuickAdd and Templater still create periodic notes and anything you create outside the view.
- Tasks, Dataview, and Kanban still render their queries and boards.
- `00 Dashboards/Sprint Dashboard.md` and `Decisions.md` show the same data without the plugin.
- Agent Client and Local REST API provide the governed AI path.

Disable the plugin and every note still reads correctly.

## Verification

Run `node scripts/verify_life_os_app.mjs .` for static contracts and a mock runtime of every screen. It covers:
- the write-only-in-the-writer rule
- task-line helpers and stale-line refusal
- the project page task form and minutes composer
- inbox filtering

`PLAYWRIGHT_MODULE=<path to playwright> node scripts/verify_dashboard_view.mjs` exercises the same flows in Chromium with a synthetic vault at 1440, 900, 620, and 390 px. Neither replaces checking the view inside Obsidian after a reload; see [[23 Native Acceptance]].

The application version is 1.0.0.
