# Workflow: Decisions and docs

Engineering writing has a short half-life unless it sits next to the work. Decisions, how-tos, incident reviews, and public articles live in `06 Writing/`, each linked to its project with a `project` property, so the project page's **Docs** tab and the Dev OS **Docs** screen find them.

## Types
| Type | Folder | Template | Status values | Create from |
| --- | --- | --- | --- | --- |
| Decision record (ADR) | `06 Writing/Decisions` | `Templates/ADR.md` | proposed, accepted, superseded, deprecated, rejected | Docs, New ADR (auto-numbered `ADR-NNNN`); a decision in meeting minutes, ADR button |
| Tech note | `06 Writing/Tech Notes` | `Templates/Tech Note.md` | draft, published, archived | Docs, Tech note; Inbox, Keep as tech note |
| Postmortem | `06 Writing/Postmortems` | `Templates/Postmortem.md` | draft, in-review, published | Docs, Postmortem |
| Article | `06 Writing/Articles` | `Templates/Article.md` | your own; the Article Board tracks the pipeline | QuickAdd **New article** |
| Book note | `07 Library/Book Notes` | `Templates/Book Note.md` | reading, finished | QuickAdd **New book note** |

## Decisions
- One decision per ADR. Context, the decision in active voice ("We will ..."), the options that lost and why, and consequences including operational cost.
- Change an ADR's status from the Docs screen dropdown. Once accepted, the body is history: a change of mind is a new ADR that names the old one in `supersedes`, and the old one moves to superseded.
- Minutes first, ADR second: decisions recorded in `## Decisions` of a meeting note show an **ADR** button on the project page, which prefills the form with the decision and a link back to the meeting.

## Postmortems
Blameless. Build the timeline from evidence (meeting notes, task done dates, clipped status pages) and turn every action item into a task tagged `#project/<slug>` with an owner `#p/<slug>`, so it shows up on the project page and in standups until it is done.

## Drafting with an agent
[[10 Docs and ADR Drafting]] gathers evidence from the project, meetings, ADRs, and clippings, then drafts section by section with your approval. It refuses to rewrite an accepted ADR.

## Practices
- Give every quote in a book note or clip a block id (`^quote-1`) when you capture it; embed it with `![[Note#^quote-1]]`.
- Keep `project` set on every doc; unlinked docs only appear on the Docs screen.
- Export articles at the end only; the draft stays in Obsidian.
