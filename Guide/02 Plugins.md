## Core plugins of the original workflows
| Plugin | ID (community) | Used for | Where configured |
| --- | --- | --- | --- |
| **QuickAdd** | `quickadd` | Capture journal entries, wins, gratitude to the daily note; tasks to the master list; ideas to the Kanban backlogs (4:40, 17:51) | `.obsidian/plugins/quickadd/data.json` (8 capture choices, all registered as commands) |
| **Periodic Notes** | `periodic-notes` | Daily, weekly, quarterly notes with their own templates and folders | `.obsidian/plugins/periodic-notes/data.json` |
| **Obsidian Tasks** | `obsidian-tasks-plugin` | Inline tasks, `tasks` query blocks on dashboards, people, projects, and the Bible reading callout | `.obsidian/plugins/obsidian-tasks-plugin/data.json` |
| **Dataview** (DataviewJS) | `dataview` | Habit dashboard, daily questions widget, wheel of life, projects dashboard (10:47, 18:49) | `.obsidian/plugins/dataview/data.json`, JS enabled |
| **Kanban** | `obsidian-kanban` | One board per writing type | Boards in `06 Writing/*/… Board.md` |
| **Bases** (core, Obsidian 1.9+) | built-in | Editable tables in `00 Dashboards/Bases/` (Projects, People, Meetings, Decisions and docs, Releases, Clip inbox), embedded in the Projects and Decisions dashboards and opened from Dev OS with **Open as table**; optionally Mike's "on this day" query | `00 Dashboards/Bases/*.base`. "On this day" stays a DataviewJS block so the daily note works on any version; a Bases equivalent is in the guide below |

## Added for this vault
| Plugin | ID | Used for | Guide |
| --- | --- | --- | --- |
| **Agent Client** 0.12.1 | `agent-client` | Claude Code inside Obsidian; buttons and embedded chat on the dashboards | [[14 Agent Client and Claude Code]] |
| **SEO** 0.5.6 | `seo` | audit notes in `06 Writing` before publishing | [[16 SEO, Web Viewer, and Vault Lens]] |
| **Omnisearch** 1.30.1 | `omnisearch` | better in-vault search; search provider for the Vault Lens browser extension | [[17 Search Providers]] |
| **Local REST API** 5.1.0 | `obsidian-local-rest-api` | provider for Vault Lens note preview and editing from the browser; general local API | [[17 Search Providers]] |
| **Web viewer** (core) | `webviewer` | browse and clip inside Obsidian | [[16 SEO, Web Viewer, and Vault Lens]] |

## Optional, not bundled
| Plugin | ID | Used for | Guide |
| --- | --- | --- | --- |
| **GitHub Link** (MIT, nathonius/obsidian-github-link) | `github-link` | Pull requests, issues, and live link tags on the Dev OS project GitHub tab and in the task panel. Install from Community plugins. Public repos need no token; for private repos add an account and token in its settings. The token is stored in plain text in its `data.json`, which `.gitignore` excludes. | [[21 Life OS Application]] |

## Added to make the template work
| Plugin | ID | Why |
| --- | --- | --- |
| **Templater** | `templater-obsidian` | Mike says "template files"; Periodic Notes needs a template engine for the date math in the weekly/quarterly notes, and the Daily Questions Prompt (writing 1 to 10 answers into properties, his "custom shortcut" at 4:29) is a Templater script. Folder templates auto-apply Project, Person, Retreat, and writing templates. |

## First-party application
| Plugin | ID | Why |
| --- | --- | --- |
| **Dev OS** | `life-os-app` | The interactive dashboard: project page with tasks and meeting minutes, sprint board, docs, Web Clipper inbox, standup, capture forms, settings tab. It reads and writes the same Markdown and properties as the dashboards (one writer class, explicit clicks only) and does not create a second database. See [[21 Life OS Application]]. |

Links: QuickAdd https://github.com/chhoumann/quickadd · Periodic Notes https://github.com/liamcain/obsidian-periodic-notes · Tasks https://github.com/obsidian-tasks-group/obsidian-tasks · Dataview https://github.com/blacksmithgu/obsidian-dataview · Kanban https://github.com/mgmeyers/obsidian-kanban · Templater https://github.com/SilentVoid13/Templater

## First open checklist
All ten community plugins and the first-party Dev OS plugin are **already installed** in `.obsidian/plugins/` and listed as enabled in `community-plugins.json`.

1. Settings → Community plugins → **Turn off Restricted mode** (Obsidian asks this once per vault; it is not stored in the vault files). If the plugins do not light up immediately, run the command **Reload app without saving**. Life OS opens automatically when the vault layout is ready. You can reopen it later with the compass ribbon icon or **Life OS: Open Life OS home**.
2. Settings → Appearance → CSS snippets → make sure `lifeos` is on (custom callouts: `reading`, `intention`, `memento`, `theme`).
3. Templater: confirm **Trigger Templater on new file creation** and **Folder templates** are on.
4. Periodic Notes: confirm daily `YYYY-MM-DD` → `01 Journal/Daily`, weekly `gggg-[W]ww` → `01 Journal/Weekly`, quarterly `YYYY-[Q]Q` → `01 Journal/Quarterly`, each with its template. The core Daily Notes plugin is off. Note creation goes through the QuickAdd template commands (hotkeys below), which run Templater on the new note; Periodic Notes and the Calendar are used to navigate. If a note opened from a link is empty or shows `<%` code, press `Alt+E` (Templater: Insert template) and pick the template.
5. QuickAdd: confirm the twenty choices show and each has the lightning-bolt "command" toggle on. Eight capture into existing notes, four open periodic notes, and eight create Project, Person, creative, book, or study notes from their canonical templates.
6. Dataview: **Enable JavaScript queries** is on (pre-set).
7. Open `00 Dashboards/Personal Dashboard.md`. If a widget says "No … found", that is the empty-state message, not an error.

## Hotkeys (pre-seeded in `.obsidian/hotkeys.json`)
| Keys | Action |
| --- | --- |
| Ctrl/Cmd+Shift+L | Open the Dev OS application |
| Ctrl/Cmd+Shift+C | Open universal Capture |
| Ctrl/Cmd+Shift+D | Create or open today's daily note (QuickAdd runs the template through Templater) |
| Ctrl/Cmd+Alt+W | Create or open this week's note |
| Ctrl/Cmd+Alt+Q | Create or open this quarter's note |
| Ctrl/Cmd+Shift+J | Journal entry (timestamped, into today's note) |
| Ctrl/Cmd+Shift+W | Log a win |
| Ctrl/Cmd+Shift+G | Gratitude |
| Ctrl/Cmd+Shift+T | Add task to the master list |
| Ctrl/Cmd+Shift+Q | Daily Questions Prompt (run with today's note open) |

Change them in Settings → Hotkeys. They take effect after a reload.

To update a plugin later use Settings → Community plugins → Check for updates, as usual.

## QuickAdd capture choices (recreate by hand if the seeded config is rejected)
| Name | Capture to | Format | Insert after |
| --- | --- | --- | --- |
| 📝 Journal entry | `01 Journal/Daily/{{DATE:YYYY-MM-DD}}.md` (create with Daily Note template) | `- {{DATE:HH:mm}} {{VALUE}}` | `## Journal` |
| 🏆 Log a win | same | `- {{VALUE}}` | `## Wins` |
| 🙏 Gratitude | same | `- {{VALUE}}` | `## Gratitude` |
| ✅ Add task | `08 Tasks/Tasks.md` | `- [ ] {{VALUE}} ➕ {{DATE:YYYY-MM-DD}}` | `## Inbox` |
| 📰 Article idea | `06 Writing/Articles/Article Board.md` | `- [ ] {{VALUE}}` | `## Ideas` |
| 💡 Project idea | `04 Projects/Projects Board.md` | `- [ ] {{VALUE}}` | `## Ideas` |
| 📅 Open today's note, 🗓️ this week's, 🧭 this quarter's, 🏕️ New personal retreat | Template choices: create the note from the template in the right folder with the date name, run Templater, open it (or just open it if it exists) | | |
| 📁 New project | `04 Projects/{{VALUE}}.md` from `Templates/Project.md` | Prompt for the project name, create and open the note; an existing note is never overwritten | |
| 👤 New person | `05 People/{{VALUE}}.md` from `Templates/Person.md` | Prompt for the person's name, create and open the note; an existing note is never overwritten | |
| 🏃 New sprint, 🗣️ New meeting minutes, 🧭 New decision record (ADR), 🛠️ New tech note, 🚨 New postmortem | `04 Projects/Sprints`, `10 Meetings`, `06 Writing/Decisions`, `06 Writing/Tech Notes`, `06 Writing/Postmortems` from the matching template | Prompt for the title, create and open the note; an existing note is never overwritten | |
| 📰 New article | `06 Writing/Articles/{{VALUE}}.md` from `Templates/Article.md` | Prompt for the title, create and open the draft; an existing note is never overwritten | |
| 📚 New book note | `07 Library/Book Notes/{{VALUE}}.md` from `Templates/Book Note.md` | Prompt for the title, create and open the book note; an existing note is never overwritten | |
| 📖 New study note | `09 Reading/Study Notes/{{VALUE}}.md` from `Templates/Study Note.md` | Prompt for the title, create and open the study note; an existing note is never overwritten | |

The dashboard's capture buttons find these choices by name at click time, so you can rename ids freely.

## "On this day" with Bases (optional swap)
Create `Meta/On This Day.base` and embed it in the daily template with `![[On This Day.base]]`:
```yaml
filters:
  and:
    - file.inFolder("01 Journal/Daily")
    - file.name != this.file.name
    - file.name.endsWith(this.file.name.slice(4))
views:
  - type: table
    name: On this day
    order:
      - file.name
    sort:
      - property: file.name
        direction: DESC
```
Bases formula syntax is still evolving; verify against https://help.obsidian.md/bases/functions on your Obsidian version.
