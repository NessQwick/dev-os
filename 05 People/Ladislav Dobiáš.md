---
type: person
role: Manager
company: Quality
email:
meets:
tags:
  - person
supervisor: "[[Michal Mildorf]]"
---
Tag: `#p/ladislav-dobi`

Capture "remember to talk to them about X" as a task with `#discuss #p/ladislav-dobi` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/ladislav-dobi
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/ladislav-dobi
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
