---
type: person
role: Team Leader
company: MU1
email: tomas.petrvaldsky@mail.schaeffler.com
meets: 
supervisor: 
tags:
  - person
---
Tag: `#p/tom-pet-valdsk`

Capture "remember to talk to them about X" as a task with `#discuss #p/tom-pet-valdsk` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/tom-pet-valdsk
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/tom-pet-valdsk
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
