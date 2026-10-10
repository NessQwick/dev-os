This vault is **Dev OS**: an Obsidian workspace for developers and IT project managers, built on the Compass template. Projects, sprints, tasks, meeting minutes, decisions, docs, and web clippings live as plain Markdown; the Dev OS view (plugin `life-os-app`) is the interactive dashboard on top. See `CREDITS.md` for where the original personal workflows came from.

New here? Open [[Setup]] first. It has the status checklist. Then open the Dev OS view (Ctrl/Cmd+Shift+L) and use **View, Show sample data** to look around the example project. This page is the map.

## Work
| Workflow | Where it lives | Guide |
| --- | --- | --- |
| Tasks, projects, sprints | `08 Tasks/Tasks.md`, `04 Projects`, `04 Projects/Sprints`, Task and Sprint dashboards | [[08 Workflow - Task Management]] |
| Meetings and standups | `10 Meetings`, the daily note's `## Standup` and `## Work log` | [[08 Workflow - Task Management]] |
| Decisions and docs | `06 Writing/Decisions`, `Tech Notes`, `Postmortems`, `Articles` | [[09 Workflow - Writing]] |
| Web clipping | `07 Library/Clippings`, `Meta/Web Clipper/` | [[24 Web Clipper]] |
| Dev OS application | the interactive dashboard: project page, sprint board, minutes composer, inbox | [[21 Life OS Application]] |

## Supporting layers
| Layer | Where it lives | Guide |
| --- | --- | --- |
| Kanban boards | `04 Projects/Projects Board.md`, `06 Writing/Articles/Article Board.md`, `00 Dashboards/Boards.md` | [[13 Kanban Boards]] |
| AI in the vault | `AGENTS.md`, `Prompts/`, `00 Dashboards/Assistant.md` | [[14 Agent Client and Claude Code]], [[20 Prompt Library]] |
| Knowledge layer (claude-obsidian) | `wiki/`, `inbox/`, `wiki/routing-map.md` | [[15 claude-obsidian]] |
| Research and publishing | Web viewer, SEO, Vault Lens | [[16 SEO, Web Viewer, and Vault Lens]], [[17 Search Providers]] |
| Obsidian MCP bridge | Local REST API `/mcp`, `.mcp.example.json` | [[19 Obsidian MCP Bridge]] |

## Personal layer (optional, hidden in the Dev OS view by default)
| # | Workflow | Where it lives | Guide |
| --- | --- | --- | --- |
| 1 | Journaling with Daily Questions | `01 Journal/Daily`, `Templates/Daily Questions Prompt.md`, questions in `Meta/Dev OS Config.md` | [[03 Workflow - Journaling and Daily Questions]] |
| 2 | Quarterly personal retreat | `02 Retreats`, `Templates/Personal Retreat.md` | [[04 Workflow - Personal Retreat]] |
| 3 | Multi-scale planning | `01 Journal/{Daily,Weekly,Quarterly}`, `03 Planning` | [[05 Workflow - Multi-Scale Planning]] |
| 4 | Habit tracking | `habit_*` properties in the daily note, `00 Dashboards/Habit Canvas.md` | [[06 Workflow - Habit Tracking]] |
| 5 | Daily reading (Bible as the worked example) | `09 Reading` | [[07 Workflow - Daily Reading]] |
| + | Personal dashboard | `00 Dashboards/Personal Dashboard.md`, `Meta/views/*.js` | [[10 Personal Dashboard]] |

Turn it on in **Settings, Dev OS, Show personal modules** (or the View menu). Nothing in it is deleted when hidden.

Read next: [[01 Principles]] (the ideas behind it), [[02 Plugins]] (what is installed and the first-open checklist), [[11 Build Order]] (why one layer at a time), [[12 Resources and Links]].

## Layering rule
Start with one project: create it, add its tasks on the project page, and write minutes for its next meeting. Add a sprint when the work has a cadence, ADRs when decisions start getting relitigated, and the Web Clipper when research piles up. [[Setup]] keeps the order honest.

## Maintainers
Releases are built with `scripts/build_template.py` and gated by `scripts/verify_template.py`; see `scripts/RELEASE.md`.
