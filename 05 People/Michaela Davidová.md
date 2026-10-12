---
type: person
role: Team Leader
company: HR
email: michaela.davidova@mail.schaeffler.com
meets:
supervisor: "[[Iveta Nakoukalová]]"
tags:
  - person
---
Tag: `#p/michaela-davidov`

Capture "remember to talk to them about X" as a task with `#discuss #p/michaela-davidov` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/michaela-davidov
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/michaela-davidov
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
