---
type: person
role: Leader
company: TPM & Spare Parts
email:
meets:
tags:
  - person
supervisor: "[[David Čáň]]"
---
Tag: `#p/vladim-r-astn`

Capture "remember to talk to them about X" as a task with `#discuss #p/vladim-r-astn` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/vladim-r-astn
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/vladim-r-astn
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
