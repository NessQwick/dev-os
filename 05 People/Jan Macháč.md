---
type: person
role: Fleet manager
company: Facility Management
email: jan.machac@mail.schaeffler.com
meets: 
supervisor: "[[Radim Gřuňděl]]"
tags:
  - person
---
Tag: `#p/jan-mach`

Capture "remember to talk to them about X" as a task with `#discuss #p/jan-mach` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/jan-mach
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/jan-mach
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
