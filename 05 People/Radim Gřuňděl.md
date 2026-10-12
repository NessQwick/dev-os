---
type: person
role: Manager
company: Facility Management
email: radim.grundel@mail.schaeffler.com
meets: 
supervisor: "[[Michal Mildorf]]"
tags:
  - person
---
Tag: `#p/radim-g-u-d-l`

Capture "remember to talk to them about X" as a task with `#discuss #p/radim-g-u-d-l` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/radim-g-u-d-l
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/radim-g-u-d-l
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
