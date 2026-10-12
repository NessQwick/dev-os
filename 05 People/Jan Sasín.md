---
type: person
role: Technician
company: MU2 IE
email: jan.sasin@mail.schaeffler.com
meets: 
supervisor: "[[Martin Fajkus]]"
tags:
  - person
---
Tag: `#p/jan-sas-n`

Capture "remember to talk to them about X" as a task with `#discuss #p/jan-sas-n` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/jan-sas-n
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/jan-sas-n
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
