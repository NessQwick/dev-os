---
type: person
role: Manager
company: Plant
email: michal.mildorf@mail.schaeffler.com
meets:
tags:
  - person
supervisor: "[[Lukáš Rosůlek]]"
---
Tag: `#p/michal-mildorf`

Capture "remember to talk to them about X" as a task with `#discuss #p/michal-mildorf` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/michal-mildorf
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/michal-mildorf
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
- 2026-10-12 Created.
