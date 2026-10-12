---
type: person
role: Technician
company: MU2 IE
email: jan.ondruska@mail.schaeffler.com
meets: 
supervisor: "[[Martin Fajkus]]"
tags:
  - person
---
Tag: `#p/jan-ondru-ka`

Capture "remember to talk to them about X" as a task with `#discuss #p/jan-ondru-ka` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/jan-ondru-ka
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/jan-ondru-ka
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
