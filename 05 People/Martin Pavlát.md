---
type: person
role: Head of Department
company: Industry 4.0
email: martin.pavlat@mail.schaeffler.com
meets:
tags:
  - person
supervisor: "[[David Čáň]]"
---
Tag: `#p/martin-pavl-t`

Capture "remember to talk to them about X" as a task with `#discuss #p/martin-pavl-t` anywhere in the vault. Open this note before the meeting.

```agent
type: button
text: "Prep this meeting"
prompt: "Read Prompts/07 Meeting Prep.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: right-pane
```

## To discuss
```tasks
not done
tags include #discuss
tags include #p/martin-pavl-t
sort by created
```

## Open tasks involving them
```tasks
not done
tags include #p/martin-pavl-t
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
- 2026-10-11 
