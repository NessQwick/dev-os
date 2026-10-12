---
type: person
role: Manager
company: Country
email: lukas.rosulek@mail.schaeffler.com
meets:
supervisor: "[[Fernando Viturtia Caurcel]]"
tags:
  - person
---
Tag: `#p/luk-ros-lek`

Capture "remember to talk to them about X" as a task with `#discuss #p/luk-ros-lek` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/luk-ros-lek
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/luk-ros-lek
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
