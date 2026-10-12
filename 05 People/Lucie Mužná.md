---
type: person
role: "Vrátnice"
company: Facility Management
email: lucie.muzna-ext@mail.schaeffler.com
meets: 
supervisor: "[[Lubomír Rohal]]"
tags:
  - person
---
Tag: `#p/lucie-mu-n`

Capture "remember to talk to them about X" as a task with `#discuss #p/lucie-mu-n` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/lucie-mu-n
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/lucie-mu-n
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
