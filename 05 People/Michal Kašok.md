---
type: person
role: Specialist
company: Facility Management
email: michal.kasok@mail.schaeffler.com
meets: 
supervisor: "[[Radim Gřuňděl]]"
tags:
  - person
---
Tag: `#p/michal-ka-ok`

Capture "remember to talk to them about X" as a task with `#discuss #p/michal-ka-ok` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/michal-ka-ok
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/michal-ka-ok
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
