---
status: open
setup_claude_login: false
setup_mcp_registered: false
setup_vault_lens: false
setup_backup: false
setup_web_clipper: false
tags:
  - setup
---
Dev OS: projects, sprints, meeting minutes, decisions, and web clippings in one vault, with an interactive dashboard on top. Add one layer at a time. The optional personal layer (journal, daily questions, habits, retreats) comes from the Compass template, based on Mike Schmitz's public workflows; not affiliated with Practical PKM.

## Step A: turn plugins on (do this first)
When you opened this folder, Obsidian showed a box about **Restricted mode**. Click **Turn off**. If you closed it: Settings → Community plugins → **Turn off Restricted mode**. You will see ten community plugins plus the first-party Dev OS plugin, already installed. Then press Ctrl/Cmd+P and run **Reload app without saving**. Dev OS opens automatically after reload (Ctrl/Cmd+Shift+L).

**If the box below shows code instead of a checklist, Step A is not done yet.**

## Setup status
```dataviewjs
await dv.view("Meta/views/setup");
```
Five items are self-declared because no script can see them (your Claude login, the MCP registration, the browser extensions, a backup): tick them in this note's properties when done.

## Today (20 minutes)
1. Step A above.
2. In Dev OS open **View, Show sample data** and click through Home, the example project page, Sprint, Meetings, Docs, and Inbox. Hide samples again.
3. **Projects, New project** for the project you are working on now. On its page: add five real tasks in the Tasks tab, set the target date and repository.
4. Before your next meeting on it: **Meetings, New meeting minutes**. Fill decisions and action items as they happen; save at the end.

## This week
- Every morning open **Today**: read the standup, copy it into your team chat, tick tasks off during the day.
- Create a sprint if your team works in iterations, and tag this week's tasks into it from the project page.
- Install Obsidian Web Clipper and import the templates ([[24 Web Clipper]]); tick `setup_web_clipper`. Triage the **Inbox** once a day.

## This month
- Day 8: delete the notes tagged `example` (the [[16 Onboarding Assistant]] can do it one file at a time, or use search `tag:#example`).
- Day 10: write your first ADR when a decision gets discussed twice ([[09 Workflow - Writing]]).
- Day 14: optional, AI in the vault: [[14 Agent Client and Claude Code]], then press **Help me set up this vault** below. Try Prompt 18 (standup) and Prompt 17 (sprint review).
- Optional personal layer: turn on **Show personal modules** in Settings, Dev OS, then follow [[03 Workflow - Journaling and Daily Questions]]. Set `birthdate` in [[Dev OS Config]]. Decide the reading module: fill [[Reading Plan]] or delete `09 Reading`.

## With an assistant
```agent
type: button
text: "Help me set up this vault"
prompt: "Read Prompts/16 Onboarding Assistant.md with vault_read and follow its Prompt section from step 0."
viewType: right-pane
```

## Not in English?
Rename the keys in [[Dev OS Config]] (`dq_aprender`) and translate the question text there; every chart labels itself from the key. The Guide stays in English.

## When you are done
Set this note's `status` property to `done`. The checklist hides itself. Reopen it any time by setting it back to `open`.
