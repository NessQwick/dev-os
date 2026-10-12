---
type: person
role: Manager
company: Plant OST
email: tomas.vajda@mail.schaeffler.com
meets: 
supervisor: "[[Lukáš Rosůlek]]"
tags:
  - person
---
Tag: `#p/tom-vajda`

Capture "remember to talk to them about X" as a task with `#discuss #p/tom-vajda` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/tom-vajda
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/tom-vajda
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
