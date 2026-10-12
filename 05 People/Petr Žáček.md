---
type: person
role: Technician
company: MU2 IE
email: petr.zacek@mail.schaeffler.com
meets: 
supervisor: "[[Martin Fajkus]]"
tags:
  - person
---
Tag: `#p/petr-ek`

Capture "remember to talk to them about X" as a task with `#discuss #p/petr-ek` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/petr-ek
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/petr-ek
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
