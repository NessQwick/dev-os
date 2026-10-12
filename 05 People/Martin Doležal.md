---
type: person
role: Business Partner
company: HR
email: martin.dolezal@mail.schaeffler.com
meets:
supervisor: "[[Iveta Nakoukalová]]"
tags:
  - person
---
Tag: `#p/martin-dole-al`

Capture "remember to talk to them about X" as a task with `#discuss #p/martin-dole-al` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/martin-dole-al
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/martin-dole-al
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
