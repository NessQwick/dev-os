---
type: project
status: active
priority: normal
description: 
area: 
repo: 
quarter: <% tp.date.now("YYYY-[Q]Q") %>
started: <% tp.date.now("YYYY-MM-DD") %>
due: 
current_sprint: 
people: []
stakeholders: []
tags:
  - project
---
Tag tasks anywhere in the vault with `#project/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>` and they roll up here. Open the Dev OS project page (Projects in the Dev OS view) to add tasks and meeting minutes without leaving the dashboard.

```agent
type: button
text: "Kick off this project"
prompt: "Read Prompts/08 Project Kickoff.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: right-pane
```

## Outcome
What "done" looks like:
- 

## Next actions
```tasks
not done
tags include #project/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>
sort by due
```

## Tasks
- [ ] First step #project/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>

## Notes


## Log
- <% tp.date.now("YYYY-MM-DD") %> Created.

## Done
```tasks
done
tags include #project/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>
sort by done reverse
limit 20
```
