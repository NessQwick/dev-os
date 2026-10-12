---
type: person
role: Technician
company: MU2 IE
email: jan.jiricek@mail.schaeffler.com
meets: 
supervisor: "[[Martin Fajkus]]"
tags:
  - person
---
Tag: `#p/jan-ji-ek`

Capture "remember to talk to them about X" as a task with `#discuss #p/jan-ji-ek` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/jan-ji-ek
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/jan-ji-ek
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
