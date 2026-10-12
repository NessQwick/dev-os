---
type: person
role: Manager
company: IT
email: maciej.musial@mail.schaeffler.com
meets: 
supervisor: "[[Michal Mildorf]]"
tags:
  - person
---
Tag: `#p/maciej-musial`

Capture "remember to talk to them about X" as a task with `#discuss #p/maciej-musial` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/maciej-musial
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/maciej-musial
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
