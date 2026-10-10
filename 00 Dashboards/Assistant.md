Use a configured agent inside the vault through Agent Client. The workflows ask the agent to follow `AGENTS.md`; that is a policy, not a technical guarantee that every client will request approval. Check that automatic approvals are off in the client you use. Setup: [[14 Agent Client and Claude Code]]. Without the plugin, read a note in `Prompts/` and copy its Prompt section into your chosen agent ([[20 Prompt Library]]).

## Before you send

The buttons below prepare a prompt with automatic sending disabled. Review it in the composer before sending. This embedded chat is configured to use the hosting Assistant note as context, not to guarantee inclusion of whichever other note you last viewed.

- Check the selected agent, mentioned notes, attachments, and linked-note expansion settings.
- A provider-backed conversation can send your prompt and included or subsequently retrieved notes to that provider. Journal and relationship notes can contain sensitive personal information.
- For a broad review, first ask for the proposed note paths and date range. Approve the context you want read before continuing.
- Approving a context selection is not approval to edit, install, spend, or publish.
- A configured agent or local API key is not proof of authentication, a working connection, or a successfully tested workflow.

The first-party Dev OS dashboard does not make provider calls. These controls hand off to Agent Client; its settings, external clients, and the chosen agent determine actual behavior.

## Daily
```agent
type: button
text: "Start my day"
prompt: "Read Prompts/01 Morning Start.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Coach me through tonight's questions"
prompt: "Read Prompts/02 End of Day Coaching.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "What matters today"
prompt: "Read Prompts/14 What Matters Today.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

```agent
type: button
text: "Draft my standup"
prompt: "Read Prompts/18 Standup Draft.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

## Weekly and quarterly
```agent
type: button
text: "Review this week"
prompt: "Read Prompts/03 Weekly Review.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Prepare my retreat"
prompt: "Read Prompts/04 Retreat Prep.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Facilitate this retreat"
prompt: "Read Prompts/05 Retreat Facilitation.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Trends in my questions and habits"
prompt: "Read Prompts/13 Trend Analysis.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

## Work
```agent
type: button
text: "Triage my inbox"
prompt: "Read Prompts/06 Task Triage.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Prep this meeting"
prompt: "Read Prompts/07 Meeting Prep.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Kick off this project"
prompt: "Read Prompts/08 Project Kickoff.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Groom my boards"
prompt: "Read Prompts/09 Board Grooming.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

```agent
type: button
text: "Review this sprint"
prompt: "Read Prompts/17 Sprint Review.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

## Docs and research
```agent
type: button
text: "Work on this doc"
prompt: "Read Prompts/10 Docs and ADR Drafting.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "SEO pre-publish audit"
prompt: "Read Prompts/11 SEO Pre-publish Audit.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "File this page in the wiki"
prompt: "Read Prompts/12 Research Capture.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

## System
```agent
type: button
text: "Vault health check"
prompt: "Read Prompts/15 Vault Health Check.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```
```agent
type: button
text: "Help me set up this vault"
prompt: "Read Prompts/16 Onboarding Assistant.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies)."
viewType: embed
autoSend: false
```

## Chat
```agent-client
type: chat
agent: claude-code-acp
height: 600px
id: lifeos-assistant
persist: true
noteContext: hosting
```
