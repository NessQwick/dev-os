Architecture decision records (ADRs) live in `06 Writing/Decisions/` as `ADR-NNNN Title.md` with `type: adr`, `adr_number`, `status` (proposed, accepted, superseded, deprecated, rejected), `date`, `project`, and `deciders`. An accepted ADR is never rewritten: a new ADR supersedes it and names it in `supersedes`.

The Dev OS view (Docs in the rail) changes status from a dropdown and numbers new ADRs automatically. This page is the plain Markdown fallback.

## Decision log
```dataview
TABLE WITHOUT ID adr_number AS "#", file.link AS Decision, status AS Status, project AS Project, date AS Date
FROM "06 Writing/Decisions"
WHERE type = "adr"
SORT adr_number DESC
```

## Proposed, waiting for a decision
```dataview
LIST
FROM "06 Writing/Decisions"
WHERE type = "adr" AND status = "proposed"
SORT date ASC
```

## Tech notes and postmortems
```dataview
TABLE WITHOUT ID file.link AS Doc, type AS Type, status AS Status, project AS Project
FROM "06 Writing"
WHERE type = "tech-note" OR type = "postmortem"
SORT file.mtime DESC
```

## Releases
```dataview
TABLE WITHOUT ID file.link AS Release, version AS Version, project AS Project, date AS Date, status AS Status
FROM "06 Writing/Releases"
WHERE type = "release"
SORT date DESC
```

## Tables (Bases)
Editable tables over the same notes: `00 Dashboards/Bases/Decisions and docs.base` and `Releases.base`.

![[Decisions and docs.base]]

![[Releases.base]]
