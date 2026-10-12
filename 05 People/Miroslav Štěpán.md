---
type: person
role: Team Leader
company: SCM Packaging
email: miroslav.stepan@mail.schaeffler.com
meets: 
supervisor: "[[Jiří Havran]]"
tags:
  - person
---
Tag: `#p/miroslav-t-p-n`

Capture "remember to talk to them about X" as a task with `#discuss #p/miroslav-t-p-n` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/miroslav-t-p-n
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/miroslav-t-p-n
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
