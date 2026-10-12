---
type: person
role: Head of Department
company: MU2 IE
email: vojtech.vanhara@mail.schaeffler.com
meets: 
supervisor: "[[Lukáš Žilt]]"
tags:
  - person
---
Tag: `#p/vojt-ch-va-hara`

Capture "remember to talk to them about X" as a task with `#discuss #p/vojt-ch-va-hara` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/vojt-ch-va-hara
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/vojt-ch-va-hara
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
