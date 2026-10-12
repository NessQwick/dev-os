---
type: person
role: Leader
company: Central SCM
email:
meets:
tags:
  - person
supervisor: "[[Otakar Fišer]]"
---
Tag: `#p/du-an-strako`

Capture "remember to talk to them about X" as a task with `#discuss #p/du-an-strako` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/du-an-strako
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/du-an-strako
tags do not include #discuss
sort by due
```

## Projects together
```dataview
LIST
FROM "04 Projects"
WHERE contains(people, this.file.link) AND status != "done"
```

## Notes


## Meeting log
- 2026-10-11 Created.
