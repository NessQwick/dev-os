# Workflow 1: Journaling with Daily Questions

"If I had to pick just one workflow to use in Obsidian for the rest of my life, this is the one."

## The idea
Marshall Goldsmith, *Triggers* ([[Triggers (Marshall Goldsmith)]]). Ask "Did I do my best to ___?" and answer on a 1 to 10 scale. Grade the **effort**, never the outcome.

The template ships Goldsmith's six universal questions (set clear goals, make progress, find meaning, be happy, build positive relationships, be fully engaged). An engineering preset (deep work, unblocking others, shipping, learning, communicating, rest) is a paste-in option in [[Dev OS Config]].

## How it is built here
- **Properties**: one `dq_*` number property per question, generated into every new daily note from the `questions` list in [[Dev OS Config]]. Numbers 1 to 10.
- **End-of-day shortcut** (Mike uses a custom shortcut, 4:29): `Templates/Daily Questions Prompt.md`. Open the daily note, run the template. It asks each question, then yes/no for each `habit_*` checkbox, and writes everything to the properties. Nothing is inserted into the body.
- **Capture** (Mike uses a QuickAdd macro, 4:40): three QuickAdd commands append to `## Journal` (timestamped), `## Wins`, `## Gratitude` in today's note, creating it from the template if needed.
- **On this day**: DataviewJS block at the bottom of the daily note embeds the `## Journal` section from the same date in every previous year.
- **Dashboard**: `00 Dashboards/Daily Questions.md` and the widget on the Personal dashboard (lines, averages, toggles, time frame).
- **With an agent**: [[02 End of Day Coaching]] asks the same questions as a coach and writes the scores; [[01 Morning Start]] surfaces yesterday and "on this day".

## Change the questions
1. Open [[Dev OS Config]] and edit the `questions` list (key with the `dq_` prefix, plus the wording).
2. Done. New daily notes carry the new properties, the end-of-day prompt asks them in that order, and the dashboards discover whatever `dq_*` exists. Existing notes keep their old keys.

## Practices
- Answer every night, in the note you already opened this morning. The consistency is the mechanism.
- Write the marker. One honest line under `## Journal` is enough; future-you finds it under "On this day".
- Keep the scale honest. A 10 is "I did my best", not "it went great".
