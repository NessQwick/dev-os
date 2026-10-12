---
type: person
role: Specialist
company: Industry 4.0
email:
meets:
tags:
  - person
supervisor: "[[Martin Pavlát]]"
---
Tag: `#p/t-p-n-hol-k`

Capture "remember to talk to them about X" as a task with `#discuss #p/t-p-n-hol-k` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/t-p-n-hol-k
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/t-p-n-hol-k
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
- 2026-10-11 Created.
