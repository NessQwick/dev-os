---
type: sprint
project: 
number: 1
start: <% tp.date.now("YYYY-MM-DD") %>
end: <% tp.date.now("YYYY-MM-DD", 13) %>
goal: 
status: planned
tags:
  - sprint
---
Sprint tag: `#sprint/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>`. Add it to any task to pull the task into this sprint. In progress is `- [/]`, blocked is `#blocked`.

```agent
type: button
text: "Review this sprint"
prompt: "Read Prompts/17 Sprint Review.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: right-pane
```

## Goal


## Board
```tasks
tags include #sprint/<% tp.file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") %>
group by status.type
sort by priority
```

## Review
- What shipped:
- What slipped:

## Retro
- Keep:
- Change:
- Try:
