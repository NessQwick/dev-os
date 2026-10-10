# Workflow 4: Habit Tracking

"Almost embarrassingly simple."

## Data entry
Checkbox properties in the daily note, prefixed `habit_`: `habit_journal`, `habit_exercise`, `habit_read`, `habit_reading`. Check them as you go or when the Daily Questions Prompt asks at night. No app, no notifications, no streak shame.

## Dashboard (his "Habit Canvas", 10:47)
`00 Dashboards/Habit Canvas.md` and the habits widget on the Compass dashboard, both `Meta/views/habits.js`:
- discovers every `habit_*` checkbox across the daily notes,
- shows the last N days as a grid (● done, ○ missed, · no note),
- current streak, best streak, longest break, completion % (of days the habit was tracked), total completions.

## Change the habits
Edit the properties block in `Templates/Daily Note.md`. Nothing else. Track a small set "this season"; retire habits by removing the property from the template (history stays in old notes and still counts).

## Practices
- The habit lives next to the journal entry that explains the miss. Read them together at the weekly review.
- "Tracking honestly is more important than tracking perfectly."
- Do not chase the streak number. The widget shows it because it is informative, not because it is the goal.
