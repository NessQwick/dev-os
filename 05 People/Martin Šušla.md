---
type: person
role: Specialist
company: Purchasing
email: 
meets: 
tags:
  - person
---
Tag: `#p/martin-u-la`

Capture "remember to talk to them about X" as a task with `#discuss #p/martin-u-la` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/martin-u-la
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/martin-u-la
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
