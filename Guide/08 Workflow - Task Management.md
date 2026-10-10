# Workflow: Tasks, projects, sprints, and meetings

"Every task is one click away from the context that explains why it exists." Tasks are plain Markdown lines in the notes they belong to; the Dev OS view and the Tasks plugin read them from wherever they live.

## Pieces
| Piece | Here |
| --- | --- |
| Inline tasks | any `- [ ]` line anywhere; emoji format: 📅 due, ⏳ scheduled, 🔁 recurring, ⏫ high, ➕ created, ✅ done |
| In progress | `- [/]`, set by Start on the sprint board or the project page |
| Inbox | `08 Tasks/Tasks.md`, `## Inbox`; Dev OS quick add or QuickAdd **Add task** |
| Project | `#project/<slug>`; tasks added on the project page land under its `## Tasks` heading |
| Sprint | `#sprint/<slug>` where the slug is the sprint note's title; sprint notes live in `04 Projects/Sprints` |
| Owner or person | `#p/<slug>`; the person note and its **To discuss** query collect them (`#discuss`) |
| Blocker | `#blocked`; shows on Today's standup and as a red badge on boards and lists |
| Meeting action items | tasks under `## Action items` in `10 Meetings/*.md`, tagged with the project and owner |
| Dashboards | Dev OS Home, Today, Sprint, and Tasks screens; `00 Dashboards/Task Dashboard.md` and `Sprint Dashboard.md` without the plugin |

Slug = note title lowercased, non-alphanumerics to `-`. Project, Sprint, and Person notes print their exact tag at the top.

## A working week
1. **Plan:** create a sprint from the Sprint screen or the project page (number, dates, goal). Tag tasks into it from the project page's add form (Sprint select) or by adding `#sprint/<slug>` by hand.
2. **Daily:** open Today. The standup lists what you finished since the last working day, what is due or in progress, and what is blocked. Copy it into chat or write it to `## Standup` in the daily note. Keep a running `## Work log` there if you like; Prompt 18 uses it.
3. **During the day:** tick tasks off wherever they appear; move sprint cards with Start and Done; add tasks with quick add or on the project page.
4. **Meetings:** open the project, Meetings tab, New meeting minutes. Agenda, notes, decisions, action items with owners and due dates. Save once; the action items are tasks from that moment. Before a one-on-one, run Prompt 07 from the person's note.
5. **End of sprint:** run Prompt 17 on the sprint note, write the review and retro, close the sprint, and retag unfinished tasks into the next one.

## Execution model
The dashboards recommend; you decide. Pick what you will do today and protect time for it. A task without a date is normal; dates are for things that are actually due.

## When this is the wrong system
Shared team tracking with assignment, notifications, and SLAs belongs in your team's tracker (Jira, Linear, GitHub Projects). Clip the issue with the Web Clipper ([[24 Web Clipper]]) and keep your own notes, decisions, and follow-ups here.

## QuickAdd choices (recreate by hand if the seeded config is rejected)
| Name | Capture to or create | Format or template | Insert after |
| --- | --- | --- | --- |
| 📝 Journal entry, 🏆 Log a win, 🙏 Gratitude | `01 Journal/Daily/{{DATE:YYYY-MM-DD}}.md` | `- {{VALUE}}` | `## Journal`, `## Wins`, `## Gratitude` |
| ✅ Add task | `08 Tasks/Tasks.md` | `- [ ] {{VALUE}} ➕ {{DATE:YYYY-MM-DD}}` | `## Inbox` |
| 📰 Article idea | `06 Writing/Articles/Article Board.md` | `- [ ] {{VALUE}}` | `## Ideas` |
| 💡 Project idea | `04 Projects/Projects Board.md` | `- [ ] {{VALUE}}` | `## Ideas` |
| 📅 Open today's note, 🗓️ this week's, 🧭 this quarter's, 🏕️ New personal retreat | periodic folders | the matching template | |
| 📁 New project, 👤 New person | `04 Projects/`, `05 People/` | `Templates/Project.md`, `Templates/Person.md` | |
| 🏃 New sprint | `04 Projects/Sprints/` | `Templates/Sprint.md` | |
| 🗣️ New meeting minutes | `10 Meetings/` | `Templates/Meeting.md` | |
| 🧭 New decision record (ADR), 🛠️ New tech note, 🚨 New postmortem | `06 Writing/Decisions`, `Tech Notes`, `Postmortems` | `Templates/ADR.md`, `Tech Note.md`, `Postmortem.md` | |
| 📰 New article, 📚 New book note, 📖 New study note | `06 Writing/Articles`, `07 Library/Book Notes`, `09 Reading/Study Notes` | matching templates | |

Template choices prompt for the title and never overwrite an existing note. The Dev OS forms create the same note types with the fields filled in.
