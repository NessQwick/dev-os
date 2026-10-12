# Dev OS Application

Dev OS is the interactive dashboard above the vault (plugin id `life-os-app`, kept for compatibility with existing hotkeys). You work in it: add tasks, move sprint cards, write meeting minutes, change project and decision status, triage web clippings. Markdown and frontmatter remain the only data. There is no second database and no cloud dependency.

## Open it

Dev OS opens automatically after Obsidian loads the vault. Use `Ctrl/Cmd+Shift+L`, the compass ribbon icon, or **Dev OS: Open Dev OS home**. `Ctrl/Cmd+Shift+C` opens Capture. Every screen has an **Open Dev OS ...** command, and every note type has a **New ...** command (project, sprint, meeting minutes, decision, tech note, postmortem, release, person). If the view is missing after an upgrade, run **Reload app without saving** once.

## Screens

| Screen | Purpose | Data it reads | What it can write |
| --- | --- | --- | --- |
| Home | Attention tasks, active sprint, today's meetings, clip inbox count, projects, quick add | tasks, sprints, meetings, clippings | task lines |
| Today | Standup (done since the last working day, due or in progress, `#blocked`), quick add, attention list; daily check-in when the personal layer is on | tasks, daily note | `## Standup` in today's note, task lines |
| Sprint | Tabs: Board (To do, In progress, Done; Sprint details; Close sprint moves open tasks), All sprints (cards by status with progress, start, close), Across sprints (velocity, in progress, blocked, done in 14 days) | `#sprint/<slug>` tasks, sprint notes | task status and `#sprint/` tags, sprint properties, a new sprint note, project `current_sprint` |
| Projects | Cards with status and priority selects, progress, overdue; Cards or By quarter | project notes and `#project/<slug>` tasks | project `status`, `priority` |
| Roadmap | Projects from `started` to `due` with progress, sprints, milestones (◆), releases (▲), today line | project, sprint, and release notes | nothing |
| Project page | Header, stakeholders, tabs: Overview, Tasks, Meetings, Docs, Clips | project note, its tasks, linked sprints, meetings, docs, clips | project properties, task lines, new meeting notes, meeting `## Notes`, clip `project` |
| Meetings | Minutes composer, upcoming, today, recent, open action items; Edit minutes on a saved meeting | `10 Meetings/` | new meeting notes, a meeting's properties and its Agenda, Notes, Decisions, and Action items sections, task lines |
| Docs | ADRs, tech notes, postmortems, releases with type, status, and project filters; a property panel per row; release notes | `06 Writing/`, `06 Writing/Releases/` | doc properties, new notes, a release note's `## Release notes` section |
| Inbox | Web Clipper triage and template setup | `07 Library/Clippings/`, `Meta/Web Clipper/` | clip `project`, `status`, one move to Tech Notes |
| Waiting | Delegated tasks by person (age from `➕`), tasks waiting on open tasks (`⛔`), `#blocked` | task index, `05 People/` | task lines |
| Configure | Config form with change preview; vault health check | `Meta/Dev OS Config.md`, Templater, QuickAdd, Web Clipper templates (read only), all typed notes and tasks | config note properties only |
| Tasks | Views: By urgency, Next 7 days, To discuss (by person), High without a date, Inbox, Done this week; status and due date controls | task index | task lines |
| People | Person cards with role, cadence, supervisor, and open, to-discuss, and overdue counts; search, filters, 12 per page; Cards or Org chart; discussion queue | `05 People/`, task index | person properties, new person notes |
| Person page | Properties, To discuss (add a topic), open tasks, projects together, meeting log, meetings with 1:1 minutes | person note, `#p/<slug>` tasks, projects, meetings | person properties, a `#discuss` task in `08 Tasks/Tasks.md`, `## Meeting log`, new meeting notes |
| Library, Brain, AI | Books and clips with book details (personal layer); link graph; AI readiness and the prompt library | as before, `Prompts/` | book properties |
| Plan, Review | Personal layer: horizons, calendar; effort, habit rhythm, daily questions, life areas, memento mori over 7, 30, 56, or 90 days | periodic notes, config | nothing |

Plan and Review, plus the daily check-in on Today, appear only when **Show personal modules** is on (Settings, Dev OS, or the View menu).

## The project page

- **Header:** a description (saved to the `description` property when you leave the field), status and priority selects, target date, repository URL (opens in your browser), stakeholders as chips (add from `05 People`, remove with ×), progress meter, open and overdue counts, days to target.
- **Overview:** next five tasks, the active sprint with its goal and meter, the last meeting with its open action items, the latest decision.
- **Tasks:**
  - An add form with text, due, scheduled, sprint (the project's open sprints), owner (`#p/<slug>`), high priority, and blocked.
  - New tasks go under the project's task heading (default `## Tasks`; `## Inline tasks` in older notes; created at the end of the note if missing).
  - The list filters Open, In progress, Blocked, Done, and All, and groups by sprint. Each row has a checkbox, Start/Done, and a due date picker.
  - The list includes every task tagged `#project/<slug>` anywhere in the vault, including meeting action items.
- **Meetings:**
  - The minutes composer takes title, date, time, kind (meeting, standup, one-on-one, review, retro, planning), attendees (a searchable picker: type to find a person note, or type any name and press Enter for a guest), agenda, notes, a list of decisions, and a list of action items with owner and due date.
  - **Save minutes** creates `10 Meetings/<date> <title>.md` linked to the project. Action items become tasks tagged with the project and owner.
  - The draft survives refreshes and is kept in plugin data until you save it. **Discard draft** deletes it and closes the composer.
  - **Edit minutes** on an expanded meeting reopens the composer filled from the note. **Save changes** rewrites the properties and the Agenda, Notes, Decisions, and Action items sections; other sections stay. Unchanged action items keep their exact line (done state, ids, dates); a changed one is edited in place; a removed one is dropped. Changing the title or date renames the note and updates links to it. **Cancel edit** leaves the note as it was.
  - Past meetings form a timeline. Expand one to see attendees, decisions (each with an **ADR** button that prefills a decision record), action items with checkboxes, and a box that appends a note to its `## Notes`.
- **Docs and Clips:** linked documents with status selects and New ADR, tech note, and postmortem buttons; clips assigned to the project, and a picker to assign one from the inbox.

## People and the person page

People shows a card per person note in `05 People` with role, company, meeting cadence (`meets`), and counts of open, to-discuss, and overdue tasks tagged `#p/<slug>`. Filters: All, To discuss, Meets weekly, Archived. **Search people** matches name, role, company, email, and cadence; results show 12 per page. **New person** creates a note with the same sections as `Templates/Person.md`. Role and Company or team suggest the values other people notes already use, here and on the person page.

The person page has:
- **Header:** the `#p/<slug>` tag, editable role, company or team, email (with a mail link), and meets, plus counts and the ⋯ menu.
- **To discuss:** open `#discuss #p/<slug>` tasks. The input adds `- [ ] topic #discuss #p/<slug>` under `## Inbox` in `08 Tasks/Tasks.md`.
- **Open tasks:** other open tasks tagged with the person, with status and due controls.
- **Projects together:** projects that list the person in `people` or `stakeholders`.
- **Meeting log:** the last entries of `## Meeting log`; the input appends `- YYYY-MM-DD text`.
- **Meetings:** minutes that list the person in `attendees`. **Write 1:1 minutes** opens the composer prefilled with kind one-on-one and the person as attendee.

Renaming a person rewrites `[[Name]]` links (attendees, stakeholders, deciders, supervisors) and `#p/<slug>` tags.

### Hierarchy

Each person can have a **Supervisor**, the person they report to, stored as `supervisor: "[[Name]]"` in the person note.
- **Setting it.** New person has a Supervisor field that searches people notes. On the person page, Supervisor sits next to role and company. Only existing people notes are accepted, and never the person themselves or anyone who already reports to them, so the hierarchy cannot loop.
- **Reporting line on the person page.** It shows the chain of supervisors above, the person highlighted, and their direct reports below. Click anyone to open their page. **Add direct report** opens New person with the supervisor filled in.
- **Org chart on People.** Every team from its top person down, with connectors. Teams deeper than three levels start collapsed; the badge shows how many people a collapsed branch holds. People with no supervisor and no reports are listed under "Not in a reporting line". On narrow panes the chart becomes an indented list.
- **Deleting a supervisor** offers to move their direct reports to the next supervisor up.
- **Vault health** reports supervisor links to missing notes and supervisor loops.

## Properties

Every note type has its properties in the UI. They save when you leave the field, and only changed keys are written:
- **Person:** role, company, email, meets.
- **Sprint:** project, number, start, end, goal (Sprint details on the board).
- **Meeting:** kind, date, time, project, attendees (an expanded meeting card).
- **ADR:** status, date, project, supersedes, deciders. **Tech note:** status, project, topic, sources. **Postmortem:** status, project, incident date, severity (the slider button in each Docs row).
- **Release:** version, date, project (an expanded release card).
- **Book:** status, author, year, rating, started, finished (Book details on Library, personal layer only).

The ⋯ menu also has **Properties**, a dialog with the same fields and one Save. People fields take people notes; lists such as `sources` are comma separated.

## Prompt library

The AI screen lists the notes in `Prompts/` with their purpose, when to use them, what they write, and the `risk` level, filtered by risk. **Copy instruction** copies the line the note's own button sends, for pasting into an agent chat. Dev OS never calls a model itself.

## GitHub

GitHub data in Dev OS comes from the **GitHub Link** community plugin (`github-link`, MIT). Dev OS has no network code; it writes GitHub Link's `github-query` blocks and lets Obsidian render them inside its screens. GitHub Link is not bundled. Install it from **Install GitHub Link** on the GitHub tab, or from Settings, Community plugins.
- **Tokens:**
  - Public repositories work without a token.
  - Private repositories, and "assigned to me" queries, need an account and token in GitHub Link's settings.
  - GitHub Link stores the token in plain text in `.obsidian/plugins/github-link/data.json`. This vault's `.gitignore` excludes that file and the template build drops it.
- **Project GitHub tab.** It appears when the project's Repository is a GitHub URL (`https://github.com/owner/repo`, `owner/repo`, or `.git` forms).
  - Open or all **Pull requests** and **Issues**, as GitHub Link tables.
  - **Branches** and **Compare** open GitHub, because GitHub Link does not list branches.
  - **Tasks linked to GitHub** lists the project's tasks that carry an issue or PR URL.
- **Task from an issue.** Each issue row gets a **Task** button that opens New task with the issue title and URL filled in. Issues that already have a task show **Linked**. **Task from GitHub URL** works for any issue or PR.
- **Tasks.**
  - An issue or PR URL in a task's text is its link.
  - Task rows hide the URL and show a chip such as **PR #12** that opens GitHub.
  - The task panel's **GitHub** section shows the linked items (as live GitHub Link tags when the plugin is on), unlinks them, and takes a pasted URL.
  - New task has a GitHub URL field.

Without GitHub Link the tab shows the setup card and plain links to the repository's pull requests, issues, and branches.

## Bases tables

`00 Dashboards/Bases/` holds Obsidian Bases tables over the same notes: Projects (Open, All, Archived), People, Meetings, Decisions and docs, Releases, and Clip inbox. They filter by `type`, so custom folders from Configure still work, and leave out sample notes. Projects, People, Meetings, Docs, Releases, and Inbox show **Open as table** when the file exists. The Projects and Decisions dashboards embed them. Editing a cell in Bases writes the note's property, the same data Dev OS reads.

## Rename, archive, delete

Projects, sprints, meetings, decision records, tech notes, postmortems, releases, and clips have a **⋯** menu: on the project page header and project cards, on the sprint board controls, in an expanded meeting or release, in each row of the docs table, and on clip cards.

- **Rename:** renames the note in its folder and refuses a name that is taken.
  - It then rewrites every `[[Old title]]` link (also with an alias, a heading, a folder path, or inside a property) and, for projects, sprints, and releases, every `#project/`, `#sprint/`, or `#release/` tag with the old slug.
  - For a project it offers to rename the sprints and releases whose titles start with the project name (`Billing Sprint 3` becomes `Payments Sprint 3`).
  - Obsidian's own link updating is not needed for this.
- **Archive:** sets `archived: true`. The file stays where it is and keeps its status.
  - Archived notes leave the dashboards, task lists, pickers, and the roadmap. Their tasks are set aside too, as are tasks tagged only with archived projects or sprints.
  - The project page of an archived project still shows everything and has an **Unarchive** button.
  - Projects has an **Archived** filter. Meetings and Docs have **Show archived**. Archived sprints stay at the end of the sprint picker.
  - For a project, the dialog offers to archive its related sprints, meetings, docs, and releases too. Open sprints are closed. Clips use their own `status: archived` and are not changed.
- **Delete:** you type the exact title to confirm. The note goes to the trash set in Obsidian's settings (system trash or `.trash`), so it can be restored.
  - For a project you can also send its related sprints, meetings, docs, and releases to the trash, clear `project` on its clips, and remove `#project/<slug>` from tasks in other notes.
  - Sprints and releases offer the same tag cleanup.
  - Links to a deleted note are left as they are.
  - An accepted ADR shows a reminder that superseding it is the usual way to retire a decision.

## The task panel

Clicking a task anywhere in Dev OS (a row, a sprint card, a discussion item) opens its details in a side panel instead of the note. On narrow panes the panel covers the view; Escape or × closes it.

- **Status:** To do, In progress, Done.
- **Text, due, scheduled, high priority, blocked.**
- **Routing:** project (`#project/`), sprint (the project's open sprints), owner (`#p/`), release.
- **Waits on and Blocks:** the dependency chain both ways. Click a task to move the panel to it, × to stop waiting, or add a task this one waits on.
- **Context:** the source note (a project or person note opens its Dev OS page), created and done dates, recurrence, id, and other tags.
- **Open in note** jumps to the line.

Each change rewrites only that task line and refuses a line that changed since it was read. To go back to opening the note on click, turn off **Open tasks in the Dev OS panel** in Settings, Dev OS.

## Tasks views

**New task** opens a form (text, project, sprint, owner, due, scheduled, high priority, to discuss, blocked). The task goes under the project's task heading, or into the Inbox of `08 Tasks/Tasks.md`, and opens in the task panel. Quick add sits under it for one-line tasks.

The Tasks screen has the views of `00 Dashboards/Task Dashboard.md`, live:
- **By urgency:** overdue, today, upcoming, unscheduled, with the workload bar.
- **Next 7 days**, grouped by due date.
- **To discuss**, grouped by person.
- **High, no date.**
- **Inbox:** tasks in `08 Tasks/Tasks.md` without a date, project, or person.
- **Done this week.**

## Sprint tabs

The Sprint screen replaces `00 Dashboards/Sprint Dashboard.md`:
- **Board:** one sprint, as before.
- **All sprints:** cards grouped Active, Planned, Closed with goal, dates, project, and progress; Start, Close, and the ⋯ menu.
- **Across sprints:** a velocity row (tasks done per closed sprint, the last six), then In progress, Blocked, and Done in the last 14 days, grouped by sprint.

## Shortcuts and new notes

Shortcut cards open Dev OS screens instead of Markdown dashboards: All tasks, Triage the inbox, All sprints, Projects by quarter, Decision log, Discuss queue, Last 8 weeks. The dashboards in `00 Dashboards/` stay as the plain Markdown fallback. A note created with a Dev OS form opens in Dev OS: a project or person page, the sprint board with its details open, the meeting expanded, or the doc with its property panel open. Capture creates projects and people with Dev OS forms; the QuickAdd template choices still exist in the command palette.

## Editing a task

The task panel above is the main editor. The older dialog editor changes the text, due and scheduled dates, sprint, owner (`#p/`), release (`#release/`), high priority, and blocked, and can add a dependency (**Waits on**) or remove the current ones. Only those parts of the line change: other tags, recurrence (`🔁`), and created and done dates stay where they are, and Obsidian Tasks still reads the line.

**Dependencies** use the Tasks plugin fields:
- The task that must finish first gets `🆔 <id>`. The editor adds one if it is missing; existing ids are never changed.
- The waiting task gets `⛔ <id>`.
- While a dependency is open, the waiting task shows **Waits on N** on lists and boards and appears on the Waiting screen with its chain.

## Closing a sprint

**Close sprint** on an active sprint with open tasks asks where they go:
- **The next sprint.** It is created for you with the same length and the following dates. Optionally make it active and the project's `current_sprint`.
- **Another planned or active sprint.**
- **The backlog.** The sprint tag is removed.
- **Nowhere.** The tasks stay tagged to the old sprint.

Done tasks keep their old sprint tag as history. Lines that changed since they were read are skipped and counted, not guessed at.

## Roadmap, milestones, releases

- **Roadmap:** each project is a bar from `started` to `due`, filled to its share of done tasks. A red outline means past due and not done.
  - Sprints show as thin bars under the project; the active sprint is highlighted.
  - Milestones are ◆. Add and remove them on the project page (Overview, Milestones); they are stored as `milestones: ["YYYY-MM-DD Name"]` in the project note.
  - Releases are ▲. Clicking one opens it in Docs.
- **Releases** are notes in `06 Writing/Releases/` (`type: release`, `version`, `project`, `date`, `status` planned or released). Tasks join a release with `#release/<slug>`, set from the editor or the project page's add form.
  - The generated notes group done tasks under Security, Removed, Fixed, Changed, and Added (from `#security`, `#remove`, `#fix`, `#change`; everything else is Added).
  - They list ADRs accepted since the project's previous release and the work still open.
  - **Copy** puts them on the clipboard; **Write to note** replaces only the `## Release notes` section of the release note; **Mark released** sets status and date.

## Waiting on

The Waiting screen collects tasks owned by someone else.
- **Owners:** set **Your person note** in Settings so tasks tagged with you are not counted as delegated.
- **Grouping:** tasks are grouped by person, oldest first, with days since `➕`. **Copy follow-up** puts a short check-in message for that person on the clipboard.
- **Other lists:** below the groups come tasks waiting on open dependencies (with what they wait on) and everything tagged `#blocked`.

## Configure

**Configure** (rail, or the gear in the topbar) is a form over the properties of `Meta/Dev OS Config.md`.

**Folders.** Projects, sprints, meetings, decisions, releases, docs, clippings, and daily notes, plus weekly, quarterly, and retreats when personal modules are on.
- Each folder has an exists or missing chip and a reset to its default.
- A warning appears when the Templater folder templates, the QuickAdd new-note choices, or the Web Clipper template paths still point elsewhere. These are read only: change them in those plugins.
- Changing a folder never moves notes.

**Personal layer** (when personal modules are on):
- Daily questions as an editable list: text, order, add, remove, and the engineering preset.
- Habits and wheel areas.
- Birthdate and life expectancy.

A key such as `dq_deep_work` is created from the label once and then fixed, because daily and retreat notes store values under it. Removing an entry leaves old notes untouched.

**Boards.** The lanes that count as finished.

Nothing is written until **Save configuration**. The bar lists every change, validation errors block saving, and **Reset** discards the draft. Saving goes through `processFrontMatter`, so Obsidian may reformat the property block; the body of the note stays as it is.

## Vault health check

**Run check** on the Configure screen reads the vault and writes nothing. It reports:
- **Errors:**
  - configured folders that do not exist
  - `project` links (sprints, meetings, ADRs, releases, tech notes, postmortems, clippings) to a missing project
  - duplicate `🆔` ids and dependency cycles
  - duplicate ADR numbers
- **Warnings:**
  - plugin paths that disagree with the config
  - `#project/`, `#sprint/`, `#release/` tags with no matching note
  - `⛔` ids nobody has
  - several active sprints in one project, or an active sprint past its end date
  - a `current_sprint` that does not exist
  - an ADR `supersedes` link to a missing note
  - a released release with open tasks
- **Notes:**
  - `#p/` tags without a person note
  - a `current_sprint` that is closed
  - unknown clip statuses
  - sample notes left next to your own

Each item opens the note, at the task line where there is one.

## Write policy

- Every change goes through one class, `LifeOSWriter`, and happens only after an explicit click, Enter, or submit. The verifier fails the build if write APIs appear anywhere else in `main.js`.
- **Task lines:** the writer re-reads the file and changes the line only if it still matches what the screen showed. Otherwise it writes nothing, shows a notice, and refreshes.
- **Properties:** written with Obsidian's `processFrontMatter`, one key per action, unless a form writes several at once.
- **New notes:** created only at a path that does not exist yet. An existing note is never overwritten.
- **Moves and renames:** use Obsidian's rename. A rename from the ⋯ menu then rewrites links and tags itself; the only move is Inbox, Keep as tech note.
- **Deletion:** only from the ⋯ menu after typing the name, through Obsidian's `trashFile`, so the note can be restored. The plugin has no network, process, or raw file-system write capability. External links open in your browser.
- **Templater:** notes created from Dev OS forms already have content, so Templater folder templates do not run over them. Notes created with QuickAdd or by hand still use the templates.

## Settings

Settings, Dev OS covers:
- show personal modules
- show sample data (notes tagged `example`)
- default project for quick add
- your person note (for Waiting)
- the project task heading
- whether clicking a task opens the Dev OS panel or the note
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
- rename with link and tag rewrites, archive and unarchive, delete to the trash, and the project description
- the person page, property forms and the properties dialog, sprint details, the doc panel, the prompt library, and the Bases files
- the task panel, Tasks views, sprint tabs, projects by quarter, the Review cards, and routing after create
- editing saved minutes, the people picker, discarding drafts, People search and paging, remembered values, and New task
- GitHub: repo and link parsing, `github-query` blocks, the setup card, the rendered tab, task chips, linking and unlinking in the panel, and New task with a link
- the supervisor hierarchy: chart building, loop and missing-link detection, the person page reporting line, the org chart, New person with a supervisor, and reassigning reports on delete

`PLAYWRIGHT_MODULE=<path to playwright> node scripts/verify_dashboard_view.mjs` exercises the same flows in Chromium with a synthetic vault at 1440, 900, 620, and 390 px. Neither replaces checking the view inside Obsidian after a reload; see [[23 Native Acceptance]].

The application version is 1.8.0.
