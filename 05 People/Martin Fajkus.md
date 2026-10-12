---
type: person
role: Team Leader
company: MU2 IE
email: martin.fajkus@mail.schaeffler.com
meets: 
supervisor: "[[Vojtěch Vaňhara]]"
tags:
  - person
---
Tag: `#p/martin-fajkus`

Capture "remember to talk to them about X" as a task with `#discuss #p/martin-fajkus` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/martin-fajkus
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/martin-fajkus
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
