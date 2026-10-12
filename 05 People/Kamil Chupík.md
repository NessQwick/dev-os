---
type: person
role: Team Leader
company: MES
email: kamil.chupik@mail.schaeffler.com
meets: 
supervisor: "[[David Čáň]]"
tags:
  - person
---
Tag: `#p/kamil-chup-k`

Capture "remember to talk to them about X" as a task with `#discuss #p/kamil-chup-k` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/kamil-chup-k
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/kamil-chup-k
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
