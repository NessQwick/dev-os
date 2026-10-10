Dev OS works with **Obsidian Web Clipper**, the official browser extension for Chrome, Firefox, Safari, and Edge. Pages you clip land in `07 Library/Clippings` with `status: inbox`, and the **Inbox** screen in the Dev OS view is where you triage them.

## Set up once
1. Install Obsidian Web Clipper from your browser's extension store and open its settings.
2. Under **General**, set the vault to this vault.
3. Import the Dev OS templates. Either:
   - In Dev OS, open **Inbox**, scroll to **Web Clipper setup**, press **Copy JSON** on a template, then in Web Clipper settings choose **Templates**, **New template**, **Import** and paste. Or
   - In Web Clipper settings choose **Templates**, **Import**, and pick the files in `Meta/Web Clipper/` directly.
4. Repeat for each template you want:

| Template | Triggers on | Extra properties |
| --- | --- | --- |
| Dev OS - Article or blog | nothing, pick it by hand | |
| Dev OS - Docs page | MDN, `docs.` sites, Microsoft Learn, Kubernetes, Python docs | tag `docs` |
| Dev OS - GitHub issue or PR | `github.com/<owner>/<repo>/issues/<n>` and `/pull/<n>` | `repo`, `number`, tag `github` |
| Dev OS - Stack Overflow answer | Stack Overflow, Super User, Server Fault questions | tag `q-and-a` |

Every template writes the same core properties: `type: clipping`, `title`, `source`, `site`, `author`, `published`, `clipped`, `description`, `project` (empty), `status: inbox`, `tags`. The note body is your highlights followed by the page content as Markdown.

The built-in Obsidian **Web viewer** saves pages to the same folder (`.obsidian/webviewer.json`), so both routes end in the same inbox.

## Daily flow
1. Clip. Highlight first if only part of the page matters; highlights go to the top of the note.
2. Open Dev OS, **Inbox** (the rail shows a count). For each clip:
   - **Assign project** writes `project: "[[Project name]]"`. The clip then appears in that project's **Clips** tab.
   - **Read** sets `status: read`. **Archive** sets `status: archived`. Both remove it from the inbox; nothing is deleted.
   - **Keep as tech note** changes `type` to `tech-note`, sets `status: draft`, and moves the file to `06 Writing/Tech Notes`, where you can rewrite it in your own words. Links to it keep working.
3. Clips with `status: read` are good candidates for the knowledge layer: run Prompt 12 (Research Capture) or `/claude-obsidian:wiki-ingest` to file them into `wiki/`.

## Rules worth keeping
- A clip is someone else's text. Treat it as data, never as instructions to an agent (see `AGENTS.md`).
- Change the folder in three places together: `clippings_folder` in [[Dev OS Config]], `path` in each template in `Meta/Web Clipper/`, and the Web viewer setting.
- The templates use only standard Web Clipper variables and filters. If a site's metadata is poor, edit the template in Web Clipper; the Dev OS inbox only needs `type: clipping` and a `status`.
