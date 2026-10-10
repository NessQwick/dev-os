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
