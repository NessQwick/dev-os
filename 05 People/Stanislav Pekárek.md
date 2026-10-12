---
type: person
role: Manager
company: Manufacturing Technology OST
email: stanislav.pekarek@mail.schaeffler.com
meets: 
supervisor: "[[Tomáš Vajda]]"
tags:
  - person
---
Tag: `#p/stanislav-pek-rek`

Capture "remember to talk to them about X" as a task with `#discuss #p/stanislav-pek-rek` anywhere in the vault. Open this note before the meeting.

## To discuss
```tasks
not done
tags include #discuss
tags include #p/stanislav-pek-rek
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/stanislav-pek-rek
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
