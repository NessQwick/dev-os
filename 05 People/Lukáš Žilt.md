---
type: person
role: Manager
company: MU2
email: lukas.zilt@mail.schaeffler.com
meets: 
supervisor: "[[Michal Mildorf]]"
tags:
  - person
---
Tag: `#p/luk-ilt`

Capture "remember to talk to them about X" as a task with `#discuss #p/luk-ilt` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/luk-ilt
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/luk-ilt
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
