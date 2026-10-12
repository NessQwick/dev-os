---
type: person
role: Energy
company: Facility Management
email: tomas.horsky@mail.schaeffler.com
meets: 
supervisor: "[[Radim Gřuňděl]]"
tags:
  - person
---
Tag: `#p/tom-horsk`

Capture "remember to talk to them about X" as a task with `#discuss #p/tom-horsk` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/tom-horsk
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/tom-horsk
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
