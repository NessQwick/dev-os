Sprints are notes in `04 Projects/Sprints/` with `type: sprint`, a `project` link, `start`, `end`, `goal`, and `status` (planned, active, closed). A task joins a sprint with the tag `#sprint/<sprint-note-slug>`. In progress is `- [/]`, blocked is `#blocked`.

The Dev OS view (Sprint in the rail) shows the same data as a board you can move cards on, plus All sprints and Across sprints tabs that replace this page. This page is the plain Markdown fallback.

## Sprints
```dataview
TABLE WITHOUT ID file.link AS Sprint, project AS Project, status AS Status, start AS Start, end AS End, goal AS Goal
FROM "04 Projects/Sprints"
WHERE type = "sprint"
SORT choice(status = "active", 0, choice(status = "planned", 1, 2)) ASC, start DESC
```

## In progress
```tasks
status.type is IN_PROGRESS
path does not include wiki/
group by tags
```

## Blocked
```tasks
not done
tags include #blocked
path does not include wiki/
group by filename
```

## Done in the last 14 days
```tasks
done after 14 days ago
tags include #sprint/
group by tags
sort by done reverse
```
