---
type: person
role: Head of Department
company: SCM Packaging
email: jiri.havran@mail.schaeffler.com
meets: 
supervisor: "[[Otakar Fišer]]"
tags:
  - person
---
Tag: `#p/ji-havran`

Capture "remember to talk to them about X" as a task with `#discuss #p/ji-havran` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/ji-havran
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/ji-havran
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
