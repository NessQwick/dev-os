---
type: person
role: Key User
company: WRC
email:
meets:
tags:
  - person
supervisor: "[[František Palacký]]"
---
Tag: `#p/petr-b-ezina`

Capture "remember to talk to them about X" as a task with `#discuss #p/petr-b-ezina` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/petr-b-ezina
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/petr-b-ezina
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
