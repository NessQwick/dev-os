# Native acceptance record

This separates reproducible development evidence from native acceptance. A local candidate has passed automated packaging and disposable extraction checks, but native acceptance is not complete. Run the remaining checks against a fresh, sanitized candidate in an isolated Obsidian profile. Do not use real personal notes or provider credentials for the basic acceptance pass.

## Identify the candidate

- Template version: 1.1.0 candidate
- Dev OS plugin (`life-os-app`) version: 1.6.0
- Archive SHA256: use the exact candidate's external `.sha256` sidecar; not embedded here to avoid self-referential hashes
- Operating system and Obsidian version: not recorded
- Test date and reviewer: not recorded
- Result: automated development checks passed; native acceptance incomplete

## Required checks

| Check | Expected behavior | Result |
| --- | --- | --- |
| Extraction | No unsafe paths, symlinks, or unexpected files; manifest matches | Automated candidate restore passed; rerun for the exact delivered ZIP |
| Cold start | Restricted-mode decision is explicit; Home opens after plugins load | Not tested |
| Reload twice | No duplicate views or stale listeners | Not tested |
| Home and Today | Accurate empty states; samples do not enter live commitments | Not tested |
| Capture | Existing QuickAdd routes work; same-name notes are not overwritten | Not tested |
| Task navigation | Clicking a task opens its exact source line without changing it | Not tested |
| Calendar | Existing notes open; missing non-today dates are not created | Not tested |
| Review | Chart values reconcile with fixture properties and source-day links | Not tested |
| Brain | 3D rotation, pan, zoom, labels, search, filters, hover, and note opening work | Not tested |
| Keyboard | Navigation and chart details work without a mouse | Not tested |
| Layout | Narrow panes, 200 percent zoom, light and dark themes remain usable | Not tested |
| Privacy | No shipped keys or sessions; prompt buttons do not auto-send | Not tested |
| Bridge | Listener and loopback configuration are checked locally without exposing keys | Not tested |
| Backup restore | Restore a fixture vault and verify notes and settings | Not tested |

## Separate optional checks

Provider authentication, an actual AI request, external calendar integration, and mobile-specific functionality require separate authorization and evidence. Leave them not tested if they were not exercised. A desktop browser fixture does not prove mobile or native behavior.

## Evidence rules

Bind screenshots and results to the exact candidate checksum. Label synthetic fixtures visibly. Record failures and skipped checks. A passing static, mock-runtime, or browser test does not mark this record complete.

## Development checks, 2026-10-12 (Dev OS 1.6.0)

Dev OS application 1.6.0 passed 177 static and mock-runtime checks. New coverage:
- parsing saved minutes back into a draft
- section rebuilding that keeps unchanged action lines
- known values
- the edit, save, discard, and attendee picker flows
- Active commitments opening the project page
- People paging and search, and company suggestions
- New task for the inbox and for a project

The browser fixture added:
- discard, then reopen empty
- picker entries for a person and a guest
- editing a saved meeting's decision and action
- People search keeping focus
- New task opening the panel

Native check still required: the `<datalist>` suggestions in Obsidian's Electron and on mobile.

## Development checks, 2026-10-11 (Dev OS 1.5.0)

Dev OS application 1.5.0 passed 164 static and mock-runtime checks. New coverage:
- task views, memento and question stats, recurrence parsing, and moving a task between projects
- the task panel: open, due date, dependency, project, status, close, and the setting that sends clicks to the note
- Tasks views, sprint tabs, projects by quarter, and the Review cards
- shortcuts that open screens, and routing after create

The browser fixture opened the panel from a task row, a waiting card, and the discussion queue. It also covered status and text edits, Escape, overflow at 900 and 390 px with the panel open, the Tasks views, the sprint tabs, By quarter, and the Review cards.

Native check still required: the panel's sticky and fixed positioning inside an Obsidian pane, including a narrow split pane.

## Development checks, 2026-10-11 (Dev OS 1.4.0)

Dev OS application 1.4.0 passed 145 static and mock-runtime checks, adding the property patch helper, new person notes, the person page (properties, discussion topic, meeting log, person rename with `#p/` rewrites), sprint details, the doc property panel and properties dialog, the prompt library, and the presence and shape of every Bases file. The browser fixture added the People cards, the person page, sprint details, the doc panel, the prompt library, and the Open as table button. Native checks still required: open each `00 Dashboards/Bases/*.base` file in Obsidian and confirm the filters (`type ==`, `!file.hasTag("example")`, `archived != true`) and views load, and that the embeds render on the Projects and Decisions dashboards.

## Development checks, 2026-10-11 (Dev OS 1.3.0)

Dev OS application 1.3.0 passed 131 static and mock-runtime checks, adding wikilink and tag rewrites, rename with cascade to sprints and releases, archive and unarchive with related notes, archived task filtering, delete through the trash with name confirmation and tag cleanup, and the project description. The browser fixture added the description field, archive, the Archived filter, unarchive, rename, and the delete confirmation. Native checks still required: that `trashFile` follows the vault's trash setting, and that a rename from the ⋯ menu leaves no stale links when Obsidian's own "Automatically update internal links" is also on.

## Development checks, 2026-10-10 (Dev OS 1.2.0)

Dev OS application 1.2.0 passed 112 static and mock-runtime checks, adding config draft reading, key generation, patch and diff, validation, the Configure save flow, and the vault health check (folders, links, tags, ids, cycles, sprint state). The browser fixture passed sixteen modules including a Configure save and a health check run. Native check still required: how Obsidian formats the config property block after a save from Configure.

## Development checks, 2026-10-10 (Dev OS 1.1.0)

Dev OS application 1.1.0 passed 102 static and mock-runtime checks. New coverage:
- task-line editing that preserves recurrence and dates
- Tasks-format dependencies
- sprint close with carry-over into a newly created sprint
- batch writes that skip changed lines
- release notes grouping and section replacement
- roadmap bars and markers
- the waiting view

The dashboard browser fixture passed fifteen modules: roadmap, waiting, the task editor modal, and release note writing at 1440 px, plus narrow-width checks.

Still required natively:
- the Tasks plugin reads edited lines and dependencies
- release notes written into a real note
- roadmap readability with many projects

## Development checks, 2026-10-10 (Dev OS 1.0.0)

Dev OS application 1.0.0 passed 89 static and mock-runtime checks, including writes confined to the writer class, stale task-line refusal, project page task and meeting minutes flows, and inbox filtering. The Assistant contract verifier passed 18 workflows. The dashboard browser fixture passed thirteen modules, the project page (add task, complete task, minutes composer and save), sprint card moves, inbox triage, narrow widths at 900, 620, and 390 px, and a light-theme smoke check. Native acceptance of the new write paths inside Obsidian (Tasks plugin rendering of edited lines, Templater not overwriting notes created with content, Web Clipper import) is still required.

## Development checks, 2026-09-09 (Life OS 0.20.0)

Life OS application 0.20.0 passed 59 static and mock-runtime checks. The Assistant contract verifier passed 16 explicit non-auto-send workflows and context disclosure checks. Eleven synthetic temporary-directory release-safety tests passed. The dashboard browser fixture passed all ten dashboard modules, Home spacing, task-source navigation, month navigation, charts, library filters, workload and discussion summaries, per-module visual controls, narrow document widths, and a light-theme smoke check.

The Brain browser regression fixture passed graph filtering, search, hover, selection, note opening, keyboard controls, zoom, reset, and cleanup. Its latest synthetic rotation CPU timing was median 5.4 ms and p95 6.2 ms. This measures neither native Obsidian frame latency nor mobile performance.

A sanitized local candidate passed 165 template checks. Its ZIP sidecar and embedded file hashes were checked after extraction into a disposable directory. No personal vault was overwritten or restored. The archive remains a development candidate, not an accepted public release. No provider request or publication was performed. Screenshots use synthetic records, with a visible fixture label and stubbed icons.

## User-reported testing

The owner reports having tested and checked the system. That is useful user-reported evidence, but the exact platform, tested artifact, workflow coverage, and results were not specified. Do not infer that every native checklist item passed. Record those details during the next native acceptance run.
