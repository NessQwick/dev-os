---
type: person
role: Software Developer
company: IT TRU
email: lukas.netreba@mail.schaeffler.com
meets: 
supervisor: "[[Aleš Vancl]]"
tags:
  - person
---
Tag: `#p/luk-net-eba`

Capture "remember to talk to them about X" as a task with `#discuss #p/luk-net-eba` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/luk-net-eba
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/luk-net-eba
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
