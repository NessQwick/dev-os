---
type: person
role: Administrator
company: IT OST
email: ladislav.janek@mail.schaeffler.com
meets: 
supervisor: "[[Maciej Musial]]"
tags:
  - person
---
Tag: `#p/ladislav-janek`

Capture "remember to talk to them about X" as a task with `#discuss #p/ladislav-janek` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/ladislav-janek
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/ladislav-janek
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
