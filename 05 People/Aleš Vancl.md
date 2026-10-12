---
type: person
role: Manager
company: IT TRU
email: ales.vancl@mail.schaeffler.com
meets:
supervisor: "[[Lukáš Rosůlek]]"
tags:
  - person
---
Tag: `#p/ale-vancl`

Capture "remember to talk to them about X" as a task with `#discuss #p/ale-vancl` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/ale-vancl
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/ale-vancl
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
