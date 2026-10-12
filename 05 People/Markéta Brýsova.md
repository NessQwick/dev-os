---
type: person
role: Customer System Support
company: CQM
email: marketa.brysova@mail.schaeffler.com
meets:
tags:
  - person
supervisor: "[[František Palacký]]"
---
Tag: `#p/mark-ta-br-sova`

Capture "remember to talk to them about X" as a task with `#discuss #p/mark-ta-br-sova` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/mark-ta-br-sova
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/mark-ta-br-sova
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
