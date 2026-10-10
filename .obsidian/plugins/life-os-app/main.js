const {
  Component,
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  moment,
  setIcon,
} = require("obsidian");

const VIEW_TYPE = "life-os-home";

const DEFAULT_FOLDERS = Object.freeze({
  daily: "01 Journal/Daily",
  weekly: "01 Journal/Weekly",
  quarterly: "01 Journal/Quarterly",
  retreats: "02 Retreats",
  projects: "04 Projects",
  sprints: "04 Projects/Sprints",
  meetings: "10 Meetings",
  decisions: "06 Writing/Decisions",
  docs: "06 Writing",
  clippings: "07 Library/Clippings",
  releases: "06 Writing/Releases",
});

const TASK_STATUS_TYPES = Object.freeze({
  " ": "open",
  "/": "open",
  x: "closed",
  X: "closed",
  "-": "closed",
});

function normalizeFolder(value, fallback) {
  const normalized = String(value || fallback)
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return normalized || fallback;
}

function ratingState(value) {
  if (value === undefined || value === null || value === "") {
    return { state: "missing", value: null };
  }
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 10
  ) {
    return { state: "recorded", value };
  }
  return { state: "invalid", value: null };
}

function habitState(value) {
  if (value === undefined || value === null || value === "") {
    return "missing";
  }
  if (value === true) {
    return "done";
  }
  if (value === false) {
    return "unchecked";
  }
  return "invalid";
}

const DEFAULT_SETTINGS = Object.freeze({
  showPersonal: false,
  includeSamples: false,
  showVisuals: true,
  compactLayout: false,
  itemLimit: 6,
  defaultProject: "",
  me: "",
  taskHeading: "## Tasks",
  projectTabs: {},
  meetingDrafts: {},
});

// The config was "Meta/Compass Config.md" before Dev OS 1.1; older vaults still work.
const CONFIG_PATHS = ["Meta/Dev OS Config.md", "Meta/Compass Config.md"];

function configFile(app) {
  for (const path of CONFIG_PATHS) {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) return file;
  }
  return null;
}

const TASK_LINE = /^(\s*(?:[-+*]|\d+[.)])\s+\[)([^\]])(\]\s*)(.*)$/u;

function slugify(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeFileName(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|#^[\]]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function linkTarget(value) {
  return String(value || "")
    .trim()
    .replace(/^!?\[\[/, "")
    .replace(/\]\]$/, "")
    .split("|")[0]
    .split("#")[0]
    .split("/")
    .pop()
    .replace(/\.md$/i, "")
    .trim();
}

function linkList(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.map(linkTarget).filter(Boolean);
}

function wikiLink(title) {
  return `[[${title}]]`;
}

function isoAddDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromIso) || !/^\d{4}-\d{2}-\d{2}$/.test(toIso)) return null;
  return Math.round((new Date(`${toIso}T12:00:00Z`) - new Date(`${fromIso}T12:00:00Z`)) / 86400000);
}

function isoDate(value) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

// Turns one Markdown task line into a new line. Returns null when the line is
// not a task, so callers never rewrite prose.
function setTaskStatusText(line, symbol, today) {
  const match = String(line).match(TASK_LINE);
  if (!match) return null;
  let body = match[4].replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "");
  if (symbol === "x") body = `${body.trimEnd()} ✅ ${today}`;
  return `${match[1]}${symbol}${match[3]}${body}`;
}

function toggleTaskText(line, today) {
  const match = String(line).match(TASK_LINE);
  if (!match) return null;
  const closed = match[2] === "x" || match[2] === "X";
  return setTaskStatusText(line, closed ? " " : "x", today);
}

function setTaskDueText(line, due) {
  const match = String(line).match(TASK_LINE);
  if (!match) return null;
  let body = match[4].replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/gu, "").trimEnd();
  if (due) {
    const done = body.match(/\s*✅\s*\d{4}-\d{2}-\d{2}/u);
    body = done ? `${body.slice(0, done.index)} 📅 ${due}${body.slice(done.index)}` : `${body} 📅 ${due}`;
  }
  return `${match[1]}${match[2]}${match[3]}${body}`;
}

function buildTaskLine({ text, project = "", sprint = "", owner = "", due = "", scheduled = "", high = false, blocked = false, created = "" }) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = [`- [ ] ${clean}`];
  if (project && !clean.includes(`#project/${project}`)) parts.push(`#project/${project}`);
  if (sprint && !clean.includes(`#sprint/${sprint}`)) parts.push(`#sprint/${sprint}`);
  if (owner && !clean.includes(`#p/${owner}`)) parts.push(`#p/${owner}`);
  if (blocked && !/(^|\s)#blocked(\s|$)/.test(clean)) parts.push("#blocked");
  if (high) parts.push("⏫");
  if (scheduled) parts.push(`⏳ ${scheduled}`);
  if (due) parts.push(`📅 ${due}`);
  if (created) parts.push(`➕ ${created}`);
  return parts.join(" ");
}

// Inserts text at the end of the section that starts with `heading`, before
// the trailing blank lines and before the next heading of the same or a
// higher level. A missing heading is appended at the end of the note.
function insertUnderHeading(content, heading, text, alternatives = []) {
  const lines = String(content).split("\n");
  const fenced = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    fenced.push(inFence);
  }
  const level = (line) => line.match(/^(#{1,6})\s/)?.[1].length || 0;
  const wanted = [heading, ...alternatives].map((item) => item.trim());
  let start = -1;
  for (const candidate of wanted) {
    start = lines.findIndex((line, index) => !fenced[index] && line.trim() === candidate);
    if (start !== -1) break;
  }
  if (start === -1) {
    const trimmed = String(content).replace(/\s+$/, "");
    return `${trimmed}${trimmed ? "\n\n" : ""}${heading}\n${text}\n`;
  }
  const ownLevel = level(lines[start]);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const next = level(lines[index]);
    if (!fenced[index] && next && next <= ownLevel) { end = index; break; }
  }
  let insertAt = end;
  while (insertAt > start + 1 && lines[insertAt - 1].trim() === "") insertAt -= 1;
  // Drop a lone placeholder bullet such as "- " or "- [ ] " left by a template.
  if (insertAt > start + 1 && /^\s*-\s*(\[ \]\s*)?$/.test(lines[insertAt - 1])) {
    lines.splice(insertAt - 1, 1);
    insertAt -= 1;
    end -= 1;
  }
  const blankAfter = insertAt === end && end < lines.length ? [""] : [];
  lines.splice(insertAt, 0, ...String(text).split("\n"), ...blankAfter);
  return lines.join("\n");
}

function extractSection(content, heading) {
  const lines = String(content || "").split("\n");
  const start = lines.findIndex((line) => line.trim().toLowerCase() === heading.toLowerCase());
  if (start === -1) return [];
  const own = lines[start].match(/^(#{1,6})\s/)?.[1].length || 2;
  const out = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const level = lines[index].match(/^(#{1,6})\s/)?.[1].length || 0;
    if (level && level <= own) break;
    const bullet = lines[index].match(/^\s*[-*+]\s+(?!\[.\])(.*\S)/);
    if (bullet) out.push(bullet[1].trim());
  }
  return out;
}

function nextAdrNumber(values) {
  const numbers = values
    .map((value) => Number.parseInt(String(value).replace(/^\D+/, ""), 10))
    .filter((value) => Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function formatAdrNumber(number) {
  return `ADR-${String(number).padStart(4, "0")}`;
}

function buildStandupText({ yesterday = [], today = [], blockers = [] }) {
  const block = (label, items) =>
    items.length ? [`- ${label}:`, ...items.map((item) => `  - ${item}`)] : [`- ${label}: none`];
  return [...block("Yesterday", yesterday), ...block("Today", today), ...block("Blockers", blockers)].join("\n");
}

function yamlScalar(value) {
  const text = String(value ?? "");
  if (text === "") return "";
  return /^[A-Za-z0-9][\w .,/@()+-]*$/.test(text) && !/\s$/.test(text) ? text : JSON.stringify(text);
}

function frontmatterBlock(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      if (!value.length) lines.push(`${key}: []`);
      else lines.push(`${key}:`, ...value.map((item) => `  - ${yamlScalar(item)}`));
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else {
      const scalar = yamlScalar(value);
      lines.push(scalar ? `${key}: ${scalar}` : `${key}: `);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function buildProjectNote({ title, status = "active", priority = "normal", due = "", repo = "", stakeholders = [], today, quarter }) {
  const slug = slugify(title);
  return `${frontmatterBlock({
    type: "project", status, priority, area: "", repo, quarter, started: today, due,
    current_sprint: "", people: [], stakeholders: stakeholders.map(wikiLink), tags: ["project"],
  })}
Tag tasks anywhere in the vault with \`#project/${slug}\` and they roll up here.

## Outcome
What "done" looks like:
-

## Next actions
\`\`\`tasks
not done
tags include #project/${slug}
sort by due
\`\`\`

## Tasks
- [ ] First step #project/${slug}

## Notes


## Log
- ${today} Created.

## Done
\`\`\`tasks
done
tags include #project/${slug}
sort by done reverse
limit 20
\`\`\`
`;
}

function buildSprintNote({ title, project = "", number = 1, start, end, goal = "", status = "planned" }) {
  const slug = slugify(title);
  return `${frontmatterBlock({
    type: "sprint", project: project ? wikiLink(project) : "", number: Number(number) || 1,
    start, end, goal, status, tags: ["sprint"],
  })}
Sprint tag: \`#sprint/${slug}\`. Add it to any task to pull the task into this sprint. In progress is \`- [/]\`, blocked is \`#blocked\`.

## Goal
${goal}

## Board
\`\`\`tasks
tags include #sprint/${slug}
group by status.type
sort by priority
\`\`\`

## Review
- What shipped:
- What slipped:

## Retro
- Keep:
- Change:
- Try:
`;
}

function buildMeetingNote({ title, kind = "meeting", date, time = "", project = "", projectSlug = "", attendees = [], agenda = "", notes = "", decisions = [], actions = [], today }) {
  const bullets = (text) => String(text || "").split("\n").map((line) => line.trim()).filter(Boolean)
    .map((line) => (/^[-*+]\s/.test(line) ? line : `- ${line}`));
  const agendaLines = bullets(agenda);
  const noteLines = bullets(notes);
  const decisionLines = decisions.map((item) => String(item || "").trim()).filter(Boolean).map((item) => `- ${item}`);
  const actionLines = actions
    .map((action) => buildTaskLine({ text: action.text, project: projectSlug, owner: action.owner, due: action.due, created: today }))
    .filter(Boolean);
  return `${frontmatterBlock({
    type: "meeting", kind, date, time, project: project ? wikiLink(project) : "",
    attendees: attendees.map((name) => (name.startsWith("[[") ? name : wikiLink(name))), tags: ["meeting"],
  })}
# ${title}

## Agenda
${(agendaLines.length ? agendaLines : ["- "]).join("\n")}

## Notes
${noteLines.join("\n")}

## Decisions
${(decisionLines.length ? decisionLines : ["- "]).join("\n")}

## Action items
${actionLines.join("\n")}
`;
}

function buildAdrNote({ title, number, status = "proposed", date, project = "", deciders = [], context = "", decision = "" }) {
  return `${frontmatterBlock({
    type: "adr", adr_number: Number(number), status, date, project: project ? wikiLink(project) : "",
    deciders: deciders.map(wikiLink), supersedes: "", tags: ["adr"],
  })}
# ${formatAdrNumber(number)} ${title}

## Context
${context || "What is the issue that motivates this decision?"}

## Decision
${decision || "What is the change that we are proposing or have agreed to?"}

## Options considered
1.

## Consequences
What becomes easier or harder because of this change?

## Follow-up
- [ ]
`;
}

function buildDocNote({ type, title, project = "", today, topic = "", severity = "sev3" }) {
  const projectLink = project ? wikiLink(project) : "";
  if (type === "postmortem") {
    return `${frontmatterBlock({ type, status: "draft", project: projectLink, incident_date: today, severity, tags: ["postmortem"] })}
# ${title}

Blameless: describe systems and decisions, not people.

## Summary


## Impact


## Timeline
-

## Root cause


## What went well


## What went wrong


## Action items
- [ ]
`;
  }
  return `${frontmatterBlock({ type: "tech-note", status: "draft", project: projectLink, topic, created: today, sources: [], tags: ["tech-note"] })}
# ${title}

## Summary


## Details


## References
-
`;
}

// Task metadata fields in Obsidian Tasks emoji format, in the order they are
// written back. Values are captured with the emoji so unknown text survives.
const TASK_FIELDS = [
  ["recurrence", /\s*🔁[^📅⏳➕✅❌🛫⛔🆔#]*/u],
  ["start", /\s*🛫\s*\d{4}-\d{2}-\d{2}/u],
  ["scheduled", /\s*⏳\s*\d{4}-\d{2}-\d{2}/u],
  ["due", /\s*📅\s*\d{4}-\d{2}-\d{2}/u],
  ["id", /\s*🆔\s*[\w-]+/u],
  ["dependsOn", /\s*⛔\s*[\w-]+(?:\s*,\s*[\w-]+)*/u],
  ["created", /\s*➕\s*\d{4}-\d{2}-\d{2}/u],
  ["done", /\s*✅\s*\d{4}-\d{2}-\d{2}/u],
  ["cancelled", /\s*❌\s*\d{4}-\d{2}-\d{2}/u],
];
const PRIORITY_MARKS = /\s*[🔺⏫🔼🔽⏬]/gu;

function splitTaskBody(body) {
  let rest = String(body);
  const fields = {};
  for (const [key, pattern] of TASK_FIELDS) {
    const match = rest.match(pattern);
    if (match) {
      fields[key] = match[0].trim();
      rest = rest.replace(pattern, "");
    }
  }
  const priority = (rest.match(PRIORITY_MARKS) || []).map((mark) => mark.trim())[0] || "";
  rest = rest.replace(PRIORITY_MARKS, "");
  // Obsidian tags start with a letter or underscore, so "#123" stays in the text.
  const tags = [...rest.matchAll(/(?:^|\s)(#[A-Za-z_][^\s#]*)/gu)].map((match) => match[1]);
  const text = rest.replace(/(?:^|\s)#[A-Za-z_][^\s#]*/gu, " ").replace(/\s+/g, " ").trim();
  return { text, tags, priority, fields };
}

// Changes chosen parts of one task line and keeps everything else: other
// tags, recurrence, created and done dates. Returns null for non-task lines.
// patch keys: text, due, scheduled, high, blocked, sprint, owner, release,
// id, dependsOn (array of ids). An empty string clears a value.
function editTaskLine(line, patch) {
  const match = String(line).match(TASK_LINE);
  if (!match) return null;
  const parts = splitTaskBody(match[4]);
  let { text, tags, priority } = parts;
  const fields = { ...parts.fields };
  if (patch.text !== undefined) {
    const clean = String(patch.text).replace(/\s+/g, " ").trim();
    if (clean) text = clean;
  }
  const setTag = (prefix, value) => {
    tags = tags.filter((tag) => !tag.toLowerCase().startsWith(`#${prefix}/`));
    if (value) tags.push(`#${prefix}/${value}`);
  };
  if (patch.sprint !== undefined) setTag("sprint", patch.sprint);
  if (patch.owner !== undefined) setTag("p", patch.owner);
  if (patch.release !== undefined) setTag("release", patch.release);
  if (patch.blocked !== undefined) {
    tags = tags.filter((tag) => tag.toLowerCase() !== "#blocked");
    if (patch.blocked) tags.push("#blocked");
  }
  if (patch.high !== undefined) priority = patch.high ? "⏫" : priority === "⏫" || priority === "🔺" ? "" : priority;
  const setDate = (key, emoji) => {
    if (patch[key] === undefined) return;
    if (patch[key]) fields[key] = `${emoji} ${patch[key]}`;
    else delete fields[key];
  };
  setDate("due", "📅");
  setDate("scheduled", "⏳");
  if (patch.id !== undefined) {
    if (patch.id) fields.id = `🆔 ${patch.id}`;
    else delete fields.id;
  }
  if (patch.dependsOn !== undefined) {
    const ids = [...new Set(patch.dependsOn.filter(Boolean))];
    if (ids.length) fields.dependsOn = `⛔ ${ids.join(",")}`;
    else delete fields.dependsOn;
  }
  const ordered = TASK_FIELDS.map(([key]) => fields[key]).filter(Boolean);
  const body = [text, ...tags, priority, ...ordered].filter(Boolean).join(" ");
  return `${match[1]}${match[2]}${match[3]}${body}`;
}

function newTaskId(existing = new Set()) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const id = Math.random().toString(36).slice(2, 8);
    if (!existing.has(id)) return id;
  }
  return `t${Date.now().toString(36)}`;
}

function parseMilestones(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item) => {
      if (item && typeof item === "object") return { date: isoDate(item.date), name: String(item.name || item.title || "").trim(), raw: item };
      const text = String(item || "").trim();
      const match = text.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/);
      return match ? { date: match[1], name: match[2].trim() || "Milestone", raw: item } : null;
    })
    .filter((item) => item && item.date)
    .sort((left, right) => left.date.localeCompare(right.date));
}

const RELEASE_SECTIONS = [
  ["Security", ["security"]],
  ["Removed", ["remove", "removed", "deprecate", "deprecated"]],
  ["Fixed", ["fix", "bug", "bugfix", "hotfix"]],
  ["Changed", ["change", "changed", "refactor", "perf", "improvement"]],
  ["Added", []],
];

// Builds Markdown release notes from task objects (display text, tags in
// text, doneDate) and decision titles. Sections follow Keep a Changelog.
function buildReleaseNotes({ version, date = "", done = [], open = [], decisions = [], level = 2 }) {
  const h = "#".repeat(level);
  const sub = "#".repeat(level + 1);
  const sectionOf = (task) => {
    const tags = (String(task.text || "").match(/#[\w/-]+/g) || []).map((tag) => tag.slice(1).toLowerCase());
    for (const [name, keys] of RELEASE_SECTIONS) if (keys.some((key) => tags.includes(key))) return name;
    return "Added";
  };
  const lines = [`${h} ${version}${date ? ` (${date})` : ""}`];
  for (const [name] of RELEASE_SECTIONS) {
    const items = done.filter((task) => sectionOf(task) === name);
    if (!items.length) continue;
    lines.push("", `${sub} ${name}`, ...items.map((task) => `- ${task.display || task.text}`));
  }
  if (!done.length) lines.push("", "No completed work is tagged for this release yet.");
  if (decisions.length) lines.push("", `${sub} Decisions`, ...decisions.map((title) => `- [[${title}]]`));
  if (open.length) lines.push("", `${sub} Not done`, ...open.map((task) => `- ${task.display || task.text}`));
  return lines.join("\n");
}

function buildReleaseNote({ title, version, project = "", date = "", status = "planned" }) {
  const slug = slugify(title);
  return `${frontmatterBlock({ type: "release", version, project: project ? wikiLink(project) : "", date, status, tags: ["release"] })}
# ${title}

Release tag: \`#release/${slug}\`. Add it to tasks that ship in this release. Tag a task \`#fix\`, \`#change\`, \`#security\`, or \`#remove\` to file it under that heading; everything else is Added.

## Scope
\`\`\`tasks
tags include #release/${slug}
group by status.type
\`\`\`

## Release notes
Generated by Dev OS (Docs, Releases, Write to note). Edit freely after generating.

## Rollout
- [ ]
`;
}

function buildFollowUpText(person, tasks) {
  const lines = tasks.map((task) => `- ${task.display || task.text}${task.due ? ` (due ${task.due})` : ""}`);
  return [`Hi ${person}, a quick check on these:`, ...lines, "Anything blocking you?"].join("\n");
}

const CAPTURE_ACTIONS = [
  {
    icon: "notebook-pen",
    label: "Journal",
    description: "Append a journal entry to today.",
    command: "quickadd:choice:lifeos-journal",
  },
  {
    icon: "trophy",
    label: "Log a win",
    description: "Record something worth remembering.",
    command: "quickadd:choice:lifeos-win",
  },
  {
    icon: "heart",
    label: "Gratitude",
    description: "Capture what you appreciate.",
    command: "quickadd:choice:lifeos-gratitude",
  },
  {
    icon: "check-square",
    label: "Add a task",
    description: "Send a task to the master inbox.",
    command: "quickadd:choice:lifeos-task",
  },
];

const CAPTURE_MENU_ACTIONS = [
  ...CAPTURE_ACTIONS,
  {
    icon: "lightbulb",
    label: "Project idea",
    description: "Add an idea to the Projects board.",
    command: "quickadd:choice:lifeos-project-idea",
  },
  {
    icon: "newspaper",
    label: "Article idea",
    description: "Add an idea to the article backlog.",
    command: "quickadd:choice:lifeos-article-idea",
  },
  {
    icon: "folder-plus",
    label: "New project",
    description: "Create a canonical project note from its template.",
    command: "quickadd:choice:lifeos-new-project",
  },
  {
    icon: "user-plus",
    label: "New person",
    description: "Create a private relationship note from its template.",
    command: "quickadd:choice:lifeos-new-person",
  },
  {
    icon: "file-pen-line",
    label: "New article",
    description: "Create an article draft from its template.",
    command: "quickadd:choice:lifeos-new-article",
  },
  {
    icon: "book-plus",
    label: "New book note",
    description: "Create a book note in the local library.",
    command: "quickadd:choice:lifeos-new-book",
  },
  {
    icon: "book-open-check",
    label: "New study note",
    description: "Create a reading study note from its template.",
    command: "quickadd:choice:lifeos-new-study-note",
  },
];

const PERIOD_ACTIONS = [
  {
    icon: "calendar-days",
    label: "Today",
    description: "Open or create today’s note.",
    command: "quickadd:choice:lifeos-daily",
  },
  {
    icon: "calendar-range",
    label: "This week",
    description: "Open or create this week’s review.",
    command: "quickadd:choice:lifeos-weekly",
  },
  {
    icon: "compass",
    label: "This quarter",
    description: "Open the current quarterly note.",
    command: "quickadd:choice:lifeos-quarterly",
  },
  {
    icon: "tent-tree",
    label: "Retreat",
    description: "Open the current personal retreat.",
    command: "quickadd:choice:lifeos-retreat",
  },
];

const NAV_ITEMS = [
  { id: "home", icon: "home", label: "Home" },
  { id: "today", icon: "sun", label: "Today" },
  { id: "sprint", icon: "kanban", label: "Sprint" },
  { id: "projects", icon: "folder-kanban", label: "Projects" },
  { id: "roadmap", icon: "gantt-chart", label: "Roadmap" },
  { id: "meetings", icon: "messages-square", label: "Meetings" },
  { id: "docs", icon: "milestone", label: "Docs" },
  { id: "inbox", icon: "inbox", label: "Inbox" },
  { id: "focus", icon: "list-checks", label: "Tasks" },
  { id: "waiting", icon: "hourglass", label: "Waiting" },
  { id: "people", icon: "users", label: "People" },
  { id: "library", icon: "library", label: "Library" },
  { id: "brain", icon: "brain", label: "Brain" },
  { id: "ai", icon: "sparkles", label: "AI" },
  { id: "plan", icon: "calendar-range", label: "Plan", personal: true },
  { id: "review", icon: "line-chart", label: "Review", personal: true },
];

const MODULES = {
  today: {
    eyebrow: "Daily operating system",
    title: "Today",
    description: "Standup, what is due, and what is blocked. Tick tasks off here; the note changes with you.",
    actions: [
      PERIOD_ACTIONS[0],
      {
        icon: "list-checks",
        label: "Task dashboard",
        description: "Every Tasks query in one note.",
        path: "00 Dashboards/Task Dashboard.md",
      },
    ],
  },
  sprint: {
    eyebrow: "Iteration",
    title: "Sprint",
    description: "Move work between To do, In progress, and Done. Each move rewrites one task line.",
    actions: [
      {
        icon: "layout-dashboard",
        label: "Sprint dashboard",
        description: "Tasks queries for every sprint.",
        path: "00 Dashboards/Sprint Dashboard.md",
      },
    ],
  },
  projects: {
    eyebrow: "Outcomes with context",
    title: "Projects",
    description: "Status, priority, progress, and the next action for every project. Open one for its full page.",
    actions: [
      {
        icon: "layout-dashboard",
        label: "Projects dashboard",
        description: "Review all active projects.",
        path: "00 Dashboards/Projects Dashboard.md",
      },
      {
        icon: "columns-3",
        label: "Projects board",
        description: "Move ideas and projects through the pipeline.",
        path: "04 Projects/Projects Board.md",
      },
    ],
  },
  project: {
    eyebrow: "Project",
    title: "Project",
    description: "",
    actions: [],
  },
  roadmap: {
    eyebrow: "Across projects",
    title: "Roadmap",
    description: "When each project runs, where its sprints fall, and which milestones and releases are coming.",
    actions: [],
  },
  waiting: {
    eyebrow: "Follow-ups",
    title: "Waiting on",
    description: "Everything that is in someone else's hands or waits on other work, oldest first.",
    actions: [],
  },
  meetings: {
    eyebrow: "Conversations with outcomes",
    title: "Meetings",
    description: "Minutes, decisions, and action items, linked to the project they move.",
    actions: [],
  },
  docs: {
    eyebrow: "Decisions and knowledge",
    title: "Docs",
    description: "Architecture decisions, tech notes, and postmortems in one place.",
    actions: [
      {
        icon: "layout-dashboard",
        label: "Decision log",
        description: "Dataview table of every ADR.",
        path: "00 Dashboards/Decisions.md",
      },
    ],
  },
  inbox: {
    eyebrow: "Web Clipper",
    title: "Inbox",
    description: "Everything you clipped from the web, waiting to be filed.",
    actions: [],
  },
  plan: {
    eyebrow: "Connected time horizons",
    title: "Plan",
    description:
      "Keep today, this week, and this quarter connected to the same direction.",
    actions: [
      ...PERIOD_ACTIONS,
      {
        icon: "clock-3",
        label: "Ideal week",
        description: "Check whether the plan has a place in time.",
        path: "03 Planning/Ideal Week.md",
      },
    ],
  },
  focus: {
    eyebrow: "Attention, not noise",
    title: "Tasks",
    description:
      "Every open task in the vault, grouped by urgency. Tick, reschedule, or open at the source line.",
    actions: [
      {
        icon: "list-checks",
        label: "Task dashboard",
        description: "Review due, scheduled, priority, and discuss tasks.",
        path: "00 Dashboards/Task Dashboard.md",
      },
    ],
  },
  review: {
    eyebrow: "Evidence over memory",
    title: "Review",
    description:
      "Look back across days and quarters before deciding what should change next.",
    actions: [
      {
        icon: "line-chart",
        label: "Daily questions",
        description: "Review effort scores and trends.",
        path: "00 Dashboards/Daily Questions.md",
      },
      {
        icon: "activity",
        label: "Habit canvas",
        description: "Review streaks, gaps, and completion.",
        path: "00 Dashboards/Habit Canvas.md",
      },
      PERIOD_ACTIONS[1],
      PERIOD_ACTIONS[2],
      PERIOD_ACTIONS[3],
      {
        icon: "compass",
        label: "Whole-life review",
        description: "Open the personal dashboard and life wheel.",
        path: "00 Dashboards/Personal Dashboard.md",
      },
    ],
  },
  people: {
    eyebrow: "Teammates and stakeholders",
    title: "People",
    description:
      "Follow-ups, one-on-ones, and discussion items, kept with the person.",
    actions: [
      {
        icon: "user-plus",
        label: "New person",
        description: "Create a person note from its template.",
        command: "quickadd:choice:lifeos-new-person",
      },
      {
        icon: "messages-square",
        label: "Discuss queue",
        description: "Open tasks grouped by person and discussion context.",
        path: "00 Dashboards/Task Dashboard.md",
      },
    ],
  },
  library: {
    eyebrow: "Knowledge in context",
    title: "Library",
    description:
      "Books, clippings, and sources close to the work they inform.",
    actions: [
      {
        icon: "book-plus",
        label: "New book note",
        description: "Create a canonical book note.",
        command: "quickadd:choice:lifeos-new-book",
      },
      {
        icon: "search",
        label: "Search the library",
        description: "Search books, sources, and connected notes.",
        command: "global-search:open",
      },
    ],
  },
  ai: {
    eyebrow: "Managed intelligence",
    title: "AI",
    description:
      "Ask, review, and draft with the vault as context while every change stays visible.",
    actions: [
      {
        icon: "sparkles",
        label: "Open assistant",
        description: "Use the complete prompt library.",
        path: "00 Dashboards/Assistant.md",
      },
      {
        icon: "list-checks",
        label: "Task triage",
        description: "Open the task dashboard and its AI workflow.",
        path: "00 Dashboards/Task Dashboard.md",
      },
      {
        icon: "shield-check",
        label: "Setup and permissions",
        description: "Review AI, MCP, and backup readiness.",
        path: "00 Dashboards/Setup.md",
      },
    ],
  },
};

// The only code in Dev OS that changes vault files. Every method runs because
// of one explicit click or submit in the view, edits one file, and refuses to
// write when the target line or file no longer matches what was shown.
class LifeOSWriter {
  constructor(app) {
    this.app = app;
  }

  today() {
    return moment().format("YYYY-MM-DD");
  }

  file(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error(`Dev OS could not find ${path}.`);
    return file;
  }

  async updateTaskLine(task, transform) {
    const file = this.file(task.path);
    let outcome = "stale";
    await this.app.vault.process(file, (data) => {
      const newline = data.includes("\r\n") ? "\r\n" : "\n";
      const lines = data.split(/\r?\n/);
      const index = task.line - 1;
      if (index < 0 || index >= lines.length || lines[index] !== task.raw) return data;
      const next = transform(lines[index]);
      if (next === null || next === undefined) return data;
      lines[index] = next;
      outcome = "written";
      return lines.join(newline);
    });
    if (outcome !== "written") {
      throw new Error("This task changed since Dev OS read it. Refreshed; try again.");
    }
    return true;
  }

  toggleTask(task) {
    return this.updateTaskLine(task, (line) => toggleTaskText(line, this.today()));
  }

  setTaskStatus(task, symbol) {
    return this.updateTaskLine(task, (line) => setTaskStatusText(line, symbol, this.today()));
  }

  setTaskDue(task, due) {
    return this.updateTaskLine(task, (line) => setTaskDueText(line, due));
  }

  editTask(task, patch) {
    return this.updateTaskLine(task, (line) => editTaskLine(line, patch));
  }

  // Rewrites many task lines, one file at a time. Lines that changed since
  // they were read are skipped and counted, never guessed at.
  async updateTaskLines(tasks, transform) {
    const byPath = new Map();
    for (const task of tasks) {
      if (!byPath.has(task.path)) byPath.set(task.path, []);
      byPath.get(task.path).push(task);
    }
    let written = 0;
    let stale = 0;
    for (const [path, items] of byPath) {
      const file = this.file(path);
      await this.app.vault.process(file, (data) => {
        const newline = data.includes("\r\n") ? "\r\n" : "\n";
        const lines = data.split(/\r?\n/);
        for (const task of items) {
          const index = task.line - 1;
          const next = index >= 0 && index < lines.length && lines[index] === task.raw ? transform(lines[index], task) : null;
          if (next === null || next === undefined) { stale += 1; continue; }
          lines[index] = next;
          written += 1;
        }
        return lines.join(newline);
      });
    }
    return { written, stale };
  }

  // Replaces the body of one section that Dev OS generates (for example
  // "## Release notes"). The heading itself and other sections stay.
  async replaceSection(path, heading, text) {
    const file = this.file(path);
    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const start = lines.findIndex((line) => line.trim() === heading.trim());
      if (start === -1) return insertUnderHeading(data, heading, text);
      const own = lines[start].match(/^(#{1,6})\s/)?.[1].length || 2;
      let end = lines.length;
      for (let index = start + 1; index < lines.length; index += 1) {
        const level = lines[index].match(/^(#{1,6})\s/)?.[1].length || 0;
        if (level && level <= own) { end = index; break; }
      }
      const after = end < lines.length ? [""] : [];
      lines.splice(start + 1, end - start - 1, ...String(text).split("\n"), ...after);
      return lines.join("\n");
    });
    return file;
  }

  async appendUnderHeading(path, heading, text, alternatives = []) {
    const file = this.file(path);
    await this.app.vault.process(file, (data) => insertUnderHeading(data, heading, text, alternatives));
    return file;
  }

  async setFrontmatter(path, patch) {
    const file = this.file(path);
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete frontmatter[key];
        else frontmatter[key] = value;
      }
    });
    return file;
  }

  async ensureFolder(folder) {
    if (!folder || this.app.vault.getAbstractFileByPath(folder)) return;
    const parts = folder.split("/");
    for (let index = 1; index <= parts.length; index += 1) {
      const partial = parts.slice(0, index).join("/");
      if (!this.app.vault.getAbstractFileByPath(partial)) await this.app.vault.createFolder(partial);
    }
  }

  async createNote(folder, name, content) {
    const fileName = safeFileName(name);
    if (!fileName) throw new Error("A title is required.");
    const path = `${folder}/${fileName}.md`;
    if (this.app.vault.getAbstractFileByPath(path)) throw new Error(`${path} already exists. Nothing was overwritten.`);
    await this.ensureFolder(folder);
    return this.app.vault.create(path, content);
  }

  async moveFile(path, folder) {
    const file = this.file(path);
    const target = `${folder}/${file.name || path.split("/").pop()}`;
    if (this.app.vault.getAbstractFileByPath(target)) throw new Error(`${target} already exists. Nothing was moved.`);
    await this.ensureFolder(folder);
    await this.app.fileManager.renameFile(file, target);
    return target;
  }
}

// Small form dialog used by every "New ..." action. Fields are plain inputs;
// the submit handler decides what to write.
class LifeOSFormModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
    this.values = {};
  }

  onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("life-os-form-modal");
    root.createEl("h2", { text: this.options.title });
    if (this.options.description) root.createEl("p", { text: this.options.description });
    const form = root.createDiv({ cls: "life-os-form" });
    for (const field of this.options.fields) {
      this.values[field.key] = field.value ?? (field.type === "checkbox" ? false : "");
      const row = form.createEl("label", { cls: `life-os-field${field.wide ? " is-wide" : ""}` });
      row.createSpan({ cls: "life-os-field-label", text: field.label });
      let input;
      if (field.type === "select") {
        input = row.createEl("select", { attr: { "aria-label": field.label } });
        for (const option of field.options || []) {
          input.createEl("option", { text: option.label ?? option.value, attr: { value: option.value } });
        }
      } else if (field.type === "textarea") {
        input = row.createEl("textarea", { attr: { "aria-label": field.label, rows: "3", placeholder: field.placeholder || "" } });
      } else {
        input = row.createEl("input", { attr: { "aria-label": field.label, type: field.type || "text", placeholder: field.placeholder || "" } });
      }
      if (field.type === "checkbox") input.checked = Boolean(this.values[field.key]);
      else input.value = String(this.values[field.key]);
      const sync = () => { this.values[field.key] = field.type === "checkbox" ? input.checked : input.value; };
      input.addEventListener(field.type === "checkbox" || field.type === "select" ? "change" : "input", sync);
      if (field.type !== "textarea") {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") { event.preventDefault?.(); sync(); void this.submit(); }
        });
      }
      if (field.hint) row.createEl("small", { cls: "life-os-field-hint", text: field.hint });
    }
    this.errorEl = root.createDiv({ cls: "life-os-form-error" });
    const actions = root.createDiv({ cls: "life-os-form-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.type = "button";
    cancel.addEventListener("click", () => this.close());
    const submit = actions.createEl("button", { cls: "mod-cta", text: this.options.submitLabel || "Create" });
    submit.type = "button";
    submit.addEventListener("click", () => void this.submit());
  }

  async submit() {
    const missing = this.options.fields.filter((field) => field.required && !String(this.values[field.key] || "").trim());
    if (missing.length) {
      this.errorEl.textContent = `Required: ${missing.map((field) => field.label).join(", ")}.`;
      return;
    }
    try {
      const done = await this.options.onSubmit({ ...this.values });
      if (done !== false) this.close();
    } catch (error) {
      this.errorEl.textContent = error?.message || "Could not save.";
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// Read-only lookups shared by the view, the capture dialog, and the forms.
class LifeOSData {
  constructor(app, settings = () => DEFAULT_SETTINGS) {
    this.app = app;
    this.settings = settings;
  }

  frontmatter(file) {
    return file instanceof TFile ? this.app.metadataCache.getFileCache(file)?.frontmatter || {} : {};
  }

  config() {
    return this.frontmatter(configFile(this.app));
  }

  folders(config = this.config()) {
    return {
      daily: normalizeFolder(config.daily_folder, DEFAULT_FOLDERS.daily),
      weekly: normalizeFolder(config.weekly_folder, DEFAULT_FOLDERS.weekly),
      quarterly: normalizeFolder(config.quarterly_folder, DEFAULT_FOLDERS.quarterly),
      retreats: normalizeFolder(config.retreat_folder, DEFAULT_FOLDERS.retreats),
      projects: normalizeFolder(config.projects_folder, DEFAULT_FOLDERS.projects),
      sprints: normalizeFolder(config.sprints_folder, DEFAULT_FOLDERS.sprints),
      meetings: normalizeFolder(config.meetings_folder, DEFAULT_FOLDERS.meetings),
      decisions: normalizeFolder(config.decisions_folder, DEFAULT_FOLDERS.decisions),
      docs: normalizeFolder(config.docs_folder, DEFAULT_FOLDERS.docs),
      clippings: normalizeFolder(config.clippings_folder, DEFAULT_FOLDERS.clippings),
      releases: normalizeFolder(config.releases_folder, DEFAULT_FOLDERS.releases),
    };
  }

  isExample(data) {
    const tags = Array.isArray(data.tags) ? data.tags : String(data.tags || "").split(/[\s,]+/);
    return data.example === true || tags.some((tag) => String(tag).replace(/^#/, "") === "example");
  }

  title(file) {
    return file.basename || file.path.split("/").pop().replace(/\.md$/i, "");
  }

  typed(type, folder, { includeClosed = true } = {}) {
    const samples = Boolean(this.settings().includeSamples);
    return this.app.vault
      .getMarkdownFiles()
      .filter((file) => !folder || file.path.startsWith(`${folder}/`))
      .filter((file) => {
        const data = this.frontmatter(file);
        if ((Array.isArray(type) ? !type.includes(data.type) : data.type !== type)) return false;
        if (!samples && this.isExample(data)) return false;
        if (!includeClosed && ["done", "complete", "completed", "archived", "closed", "cancelled"].includes(String(data.status || "").toLowerCase())) return false;
        return true;
      })
      .sort((left, right) => this.title(left).localeCompare(this.title(right)));
  }

  projects(options) { return this.typed("project", this.folders().projects, options); }
  people() { return this.typed("person", "05 People"); }
  sprints() { return this.typed("sprint", this.folders().sprints); }
  meetings() { return this.typed("meeting", this.folders().meetings); }
  docs() { return this.typed(["adr", "tech-note", "postmortem"], this.folders().docs); }
  releases() { return this.typed("release", this.folders().releases); }
  clippings() { return this.typed("clipping", this.folders().clippings); }

  linksTo(value, file) {
    const title = this.title(file);
    return linkList(value).some((target) => target === title);
  }

  forProject(files, project, key = "project") {
    return files.filter((file) => this.linksTo(this.frontmatter(file)[key], project));
  }

  adrNumbers() {
    const all = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(`${this.folders().decisions}/`));
    return all.flatMap((file) => {
      const data = this.frontmatter(file);
      const fromName = this.title(file).match(/ADR-(\d+)/i)?.[1];
      return [data.adr_number, fromName].filter((value) => value !== undefined && value !== null && value !== "");
    });
  }

  fileByTitle(title, files) {
    return files.find((file) => this.title(file) === title) || null;
  }
}

function projectOptions(data, { blank = "No project" } = {}) {
  return [{ value: "", label: blank }, ...data.projects({ includeClosed: false }).map((file) => ({ value: data.title(file), label: data.title(file) }))];
}

function personOptions(data, blank = "Nobody") {
  return [{ value: "", label: blank }, ...data.people().map((file) => ({ value: slugify(data.title(file)), label: data.title(file) }))];
}

// Opens a "New ..." form and writes the note through the writer. `preset`
// prefills fields; `done(file)` runs after a successful write.
function openCreateForm(plugin, kind, preset = {}, done = () => {}) {
  const app = plugin.app;
  const data = plugin.data;
  const writer = plugin.writer;
  const folders = data.folders();
  const today = moment().format("YYYY-MM-DD");
  const projects = projectOptions(data);
  const finish = (file, label) => {
    new Notice(`${label} created.`);
    done(file);
    return true;
  };
  const forms = {
    project: {
      title: "New project",
      fields: [
        { key: "title", label: "Project name", required: true, value: preset.title || "" },
        { key: "status", label: "Status", type: "select", value: "active", options: ["idea", "active", "on-hold", "done"].map((value) => ({ value })) },
        { key: "priority", label: "Priority", type: "select", value: "normal", options: ["low", "normal", "high"].map((value) => ({ value })) },
        { key: "due", label: "Target date", type: "date" },
        { key: "repo", label: "Repository URL", placeholder: "https://..." },
      ],
      submit: async (values) => {
        const content = buildProjectNote({ ...values, today, quarter: moment().format("YYYY-[Q]Q") });
        return finish(await writer.createNote(folders.projects, values.title, content), "Project");
      },
    },
    sprint: {
      title: "New sprint",
      fields: [
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
        { key: "number", label: "Sprint number", type: "number", value: preset.number || "1" },
        { key: "start", label: "Start", type: "date", value: preset.start || today, required: true },
        { key: "end", label: "End", type: "date", value: preset.end || isoAddDays(today, 13), required: true },
        { key: "goal", label: "Sprint goal", wide: true, value: preset.goal || "" },
        { key: "status", label: "Status", type: "select", value: preset.status || "planned", options: ["planned", "active"].map((value) => ({ value })) },
      ],
      submit: async (values) => {
        const title = `${values.project || "Team"} Sprint ${values.number || 1}`;
        const file = await writer.createNote(folders.sprints, title, buildSprintNote({ ...values, title: safeFileName(title) }));
        if (values.project && values.status === "active") {
          const project = data.fileByTitle(values.project, data.projects());
          if (project) await writer.setFrontmatter(project.path, { current_sprint: wikiLink(data.title(file)) });
        }
        return finish(file, "Sprint");
      },
    },
    meeting: {
      title: "New meeting minutes",
      description: "Creates a meeting note. Use the project page for the full minutes composer.",
      fields: [
        { key: "title", label: "Title", required: true, value: preset.title || "" },
        { key: "date", label: "Date", type: "date", value: preset.date || today, required: true },
        { key: "kind", label: "Kind", type: "select", value: "meeting", options: MEETING_KINDS.map((value) => ({ value })) },
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
        { key: "agenda", label: "Agenda", type: "textarea", wide: true },
      ],
      submit: async (values) => {
        const content = buildMeetingNote({ ...values, projectSlug: slugify(values.project), today });
        return finish(await writer.createNote(folders.meetings, `${values.date} ${values.title}`, content), "Meeting");
      },
    },
    adr: {
      title: "New decision record",
      description: `Numbered automatically as ${formatAdrNumber(nextAdrNumber(data.adrNumbers()))}.`,
      fields: [
        { key: "title", label: "Decision", required: true, value: preset.title || "" },
        { key: "status", label: "Status", type: "select", value: preset.status || "proposed", options: ADR_STATUSES.map((value) => ({ value })) },
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
        { key: "context", label: "Context", type: "textarea", wide: true, value: preset.context || "" },
        { key: "decision", label: "Decision text", type: "textarea", wide: true, value: preset.decision || "" },
      ],
      submit: async (values) => {
        const number = nextAdrNumber(data.adrNumbers());
        const content = buildAdrNote({ ...values, number, date: today });
        return finish(await writer.createNote(folders.decisions, `${formatAdrNumber(number)} ${values.title}`, content), "Decision record");
      },
    },
    release: {
      title: "New release",
      description: "Tag tasks with the release tag shown in the new note; Docs, Releases generates the notes.",
      fields: [
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
        { key: "version", label: "Version", required: true, placeholder: "1.4.0", value: preset.version || "" },
        { key: "date", label: "Target date", type: "date", value: preset.date || "" },
      ],
      submit: async (values) => {
        const title = safeFileName(`${values.project || "Release"} ${values.version}`);
        return finish(await writer.createNote(folders.releases, title, buildReleaseNote({ ...values, title })), "Release");
      },
    },
    "tech-note": {
      title: "New tech note",
      fields: [
        { key: "title", label: "Title", required: true },
        { key: "topic", label: "Topic" },
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
      ],
      submit: async (values) => finish(await writer.createNote(`${folders.docs}/Tech Notes`, values.title, buildDocNote({ ...values, type: "tech-note", today })), "Tech note"),
    },
    postmortem: {
      title: "New postmortem",
      fields: [
        { key: "title", label: "Incident", required: true },
        { key: "severity", label: "Severity", type: "select", value: "sev3", options: ["sev1", "sev2", "sev3", "sev4"].map((value) => ({ value })) },
        { key: "project", label: "Project", type: "select", options: projects, value: preset.project || "" },
      ],
      submit: async (values) => finish(await writer.createNote(`${folders.docs}/Postmortems`, values.title, buildDocNote({ ...values, type: "postmortem", today })), "Postmortem"),
    },
  };
  const form = forms[kind];
  if (!form) return null;
  const modal = new LifeOSFormModal(app, { title: form.title, description: form.description, fields: form.fields, submitLabel: "Create", onSubmit: form.submit });
  modal.open();
  return modal;
}

const MEETING_KINDS = ["meeting", "standup", "one-on-one", "review", "retro", "planning"];
const ADR_STATUSES = ["proposed", "accepted", "superseded", "deprecated", "rejected"];
const PROJECT_STATUSES = ["idea", "active", "on-hold", "done"];
const PRIORITIES = ["low", "normal", "high"];

const CREATE_ACTIONS = [
  { kind: "project", icon: "folder-plus", label: "Project", description: "Outcome, status, repo, and a task section." },
  { kind: "sprint", icon: "timer", label: "Sprint", description: "Dates, goal, and a sprint tag for tasks." },
  { kind: "meeting", icon: "messages-square", label: "Meeting minutes", description: "Agenda, notes, decisions, action items." },
  { kind: "adr", icon: "milestone", label: "Decision (ADR)", description: "Numbered architecture decision record." },
  { kind: "release", icon: "package", label: "Release", description: "Version, date, and generated release notes." },
  { kind: "tech-note", icon: "file-code-2", label: "Tech note", description: "How-to, snippet, or reference." },
  { kind: "postmortem", icon: "siren", label: "Postmortem", description: "Blameless incident review." },
];

class LifeOSCaptureModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("life-os-capture-modal");
    root.createEl("h2", { text: "Capture" });
    root.createEl("p", { text: "Add a task, start a note, or run a capture. Dev OS writes only when you press a button." });

    const data = this.plugin.data;
    const quick = root.createDiv({ cls: "life-os-capture-section" });
    quick.createEl("h3", { text: "Quick task" });
    const form = quick.createDiv({ cls: "life-os-quick-task" });
    const text = form.createEl("input", { attr: { type: "text", placeholder: "What needs doing?", "aria-label": "Task" } });
    const target = form.createEl("select", { attr: { "aria-label": "Task destination" } });
    target.createEl("option", { text: "Inbox (Tasks.md)", attr: { value: "" } });
    for (const project of data.projects({ includeClosed: false })) {
      target.createEl("option", { text: data.title(project), attr: { value: project.path } });
    }
    target.value = data.projects().find((file) => data.title(file) === this.plugin.settings?.defaultProject)?.path || "";
    const due = form.createEl("input", { attr: { type: "date", "aria-label": "Due date" } });
    const highLabel = form.createEl("label", { cls: "life-os-inline-check", text: "High" });
    const high = highLabel.createEl("input", { attr: { type: "checkbox", "aria-label": "High priority" } });
    const add = form.createEl("button", { cls: "mod-cta", text: "Add task" });
    add.type = "button";
    const submit = async () => {
      const ok = await this.plugin.addTask({ text: text.value, projectPath: target.value, due: due.value, high: high.checked });
      if (ok) { text.value = ""; due.value = ""; high.checked = false; }
    };
    add.addEventListener("click", () => void submit());
    text.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault?.(); void submit(); } });

    const create = root.createDiv({ cls: "life-os-capture-section" });
    create.createEl("h3", { text: "Create" });
    const createGrid = create.createDiv({ cls: "life-os-capture-grid" });
    for (const action of CREATE_ACTIONS) {
      this.addChoice(createGrid, action, () => { this.close(); openCreateForm(this.plugin, action.kind, {}, (file) => this.plugin.afterCreate(file)); });
    }

    const more = root.createDiv({ cls: "life-os-capture-section" });
    more.createEl("h3", { text: "More captures" });
    const moreGrid = more.createDiv({ cls: "life-os-capture-grid" });
    for (const action of CAPTURE_MENU_ACTIONS.filter((item) => item.command !== "quickadd:choice:lifeos-task")) {
      this.addChoice(moreGrid, action, () => { this.close(); this.plugin.runCommand(action.command, action.label); });
    }
  }

  addChoice(grid, action, onClick) {
    const button = grid.createEl("button", { cls: "life-os-capture-choice" });
    button.type = "button";
    const icon = button.createSpan();
    setIcon(icon, action.icon);
    const copy = button.createSpan();
    copy.createEl("strong", { text: action.label });
    copy.createEl("small", { text: action.description });
    button.addEventListener("click", onClick);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class LifeOSHomeView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.activeScreen = "home";
    this.taskSnapshot = null;
    this.refreshSequence = 0;
    this.refreshTimer = null;
    this.analyticsDays = 30;
    const settings = { ...DEFAULT_SETTINGS, ...(plugin?.settings || {}) };
    this.includeExamples = Boolean(settings.includeSamples);
    this.showVisuals = settings.showVisuals !== false;
    this.visualOptions = {};
    this.itemLimit = [3, 6, 12].includes(settings.itemLimit) ? settings.itemLimit : 6;
    this.focusGroup = "all";
    this.libraryStatus = "all";
    this.compactLayout = Boolean(settings.compactLayout);
    this.activeProjectPath = null;
    this.data = new LifeOSData(this.app, () => this.settingsSnapshot());
    this.writer = plugin?.writer || new LifeOSWriter(this.app);
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Dev OS";
  }

  getIcon() {
    return "compass";
  }

  async onOpen() {
    const refresh = () => this.queueRefresh();
    this.registerEvent(this.app.metadataCache.on("changed", refresh));
    this.registerEvent(this.app.vault.on("create", refresh));
    this.registerEvent(this.app.vault.on("modify", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    await this.refreshLiveData();
  }

  async onClose() {
    this.saveDrafts();
    this.refreshSequence += 1;
    this.closeBrain();
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.contentEl.empty();
  }

  queueRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshLiveData();
    }, 120);
  }

  async refreshLiveData() {
    const sequence = ++this.refreshSequence;
    this.render();
    const taskSnapshot = await this.loadTaskSnapshot();
    if (sequence !== this.refreshSequence) {
      return;
    }
    this.taskSnapshot = taskSnapshot;
    if (this.isEditing()) {
      // Keep the field the person is typing in; render once they leave it.
      this.deferRender();
      return;
    }
    this.render();
  }

  isEditing() {
    const active = globalThis.document?.activeElement;
    if (!active || !this.contentEl.contains?.(active)) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && active.type !== "checkbox" && !this.forceRender;
  }

  deferRender() {
    const active = globalThis.document?.activeElement;
    if (!active || active.dataset?.devOsDeferred) return;
    active.dataset.devOsDeferred = "1";
    active.addEventListener("blur", () => { delete active.dataset.devOsDeferred; this.render(); }, { once: true });
  }

  render(force = false) {
    if (!force && this.activeScreen === "brain" && this.embeddedBrain) return;
    this.closeBrain();
    const root = this.contentEl;
    root.empty();
    root.addClass("life-os-home");

    const frame = root.createDiv({ cls: this.compactLayout ? "life-os-app-frame is-compact" : "life-os-app-frame" });
    this.renderRail(frame);

    const main = frame.createEl("main", { cls: "life-os-main" });
    this.renderTopbar(main);

    if (this.activeScreen === "brain") {
      const host = main.createDiv({ cls: "life-os-brain-embedded" });
      this.embeddedBrain = new LifeOSBrainRenderer(this.app, host);
      this.addChild(this.embeddedBrain);
      return;
    }
    const shell = main.createDiv({ cls: "life-os-shell" });
    if (this.activeScreen === "home") {
      this.renderDevHome(shell);
    } else if (this.activeScreen === "project") {
      this.renderProjectPage(shell);
    } else {
      this.renderModule(shell);
    }
  }

  closeBrain() {
    if (this.embeddedBrain) this.removeChild(this.embeddedBrain);
    if (this.previewBrain) {
      this.previewGeometry = this.previewBrain.brainGeometry;
      this.removeChild(this.previewBrain);
    }
    this.previewBrain = null;
    this.embeddedBrain = null;
  }

  isExample(data) {
    const tags = Array.isArray(data.tags) ? data.tags : String(data.tags || "").split(/[\s,]+/);
    return data.example === true || tags.some((tag) => String(tag).replace(/^#/, "") === "example");
  }

  getAnalytics() {
    const config = this.getConfigFrontmatter();
    const paths = this.getConfiguredFolders(config);
    const folder = paths.daily;
    const today = moment().format("YYYY-MM-DD");
    const end = new Date(`${today}T12:00:00Z`);
    const days = Array.from({ length: this.analyticsDays }, (_, i) => {
      const date = new Date(end);
      date.setUTCDate(date.getUTCDate() - this.analyticsDays + 1 + i);
      return { date: date.toISOString().slice(0, 10), data: null, score: null };
    });
    const byDate = new Map(days.map((day) => [day.date, day]));
    const habits = new Set(this.getHabitKeys(config));
    let samples = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(`${folder}/`)) continue;
      const date = file.path.slice(folder.length + 1).replace(/\.md$/, "");
      const day = byDate.get(date);
      if (!day) continue;
      const data = this.getFrontmatter(file);
      if (this.isExample(data)) {
        samples += 1;
        if (!this.includeExamples) continue;
      }
      day.data = data;
      const scores = Object.entries(data)
        .filter(([key, value]) =>
          key.startsWith(config.dq_prefix || "dq_") &&
          ratingState(value).state === "recorded"
        )
        .map(([, value]) => value);
      day.score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      Object.keys(data).filter((key) => key.startsWith(config.habit_prefix || "habit_")).forEach((key) => habits.add(key));
    }
    const scored = days.filter((day) => day.score !== null);
    const average = scored.length ? scored.reduce((sum, day) => sum + day.score, 0) / scored.length : null;
    const retreatFolder = paths.retreats;
    const retreats = this.app.vault.getMarkdownFiles()
      .filter((file) => file.path.startsWith(`${retreatFolder}/`))
      .filter((file) => this.includeExamples || !this.isExample(this.getFrontmatter(file)))
      .sort((a, b) => b.path.localeCompare(a.path));
    const retreat = retreats.find((file) => Object.entries(this.getFrontmatter(file)).some(([key, value]) =>
      key.startsWith(config.wheel_prefix || "wheel_") && ratingState(value).state === "recorded"));
    const wheel = retreat ? Object.entries(this.getFrontmatter(retreat)).filter(([key, value]) =>
      key.startsWith(config.wheel_prefix || "wheel_") && ratingState(value).state === "recorded") : [];
    return { days, habits: [...habits], samples, average, scored: scored.length, wheel, retreat };
  }

  renderAnalytics(parent) {
    const model = this.getAnalytics();
    const section = parent.createEl("section", { cls: "life-os-analytics" });
    const heading = section.createDiv({ cls: "life-os-analytics-heading" });
    const copy = heading.createDiv();
    copy.createEl("h2", { text: "Your life, in view" });
    copy.createEl("p", { text: this.includeExamples
      ? "Sample notes included. These charts may contain demonstration data."
      : "Recorded effort and habits. Blank days mean no data, not zero." });
    const controls = heading.createDiv({ cls: "life-os-chart-controls" });
    for (const count of [7, 30, 90]) {
      const button = controls.createEl("button", {
        text: `${count} days`, attr: { "aria-pressed": String(this.analyticsDays === count) },
      });
      button.type = "button";
      button.addEventListener("click", () => { this.analyticsDays = count; this.render(); });
    }
    const sample = controls.createEl("button", {
      text: this.includeExamples ? "Samples on" : "Include samples",
      attr: { "aria-pressed": String(this.includeExamples) },
    });
    sample.type = "button";
    sample.addEventListener("click", () => { this.includeExamples = !this.includeExamples; this.render(); });

    const grid = section.createDiv({ cls: "life-os-chart-grid" });
    const effort = grid.createDiv({ cls: "life-os-chart-card life-os-effort-chart" });
    effort.createEl("h3", { text: "Daily effort" });
    effort.createEl("strong", { cls: "life-os-chart-number", text: model.average === null ? "No scores yet" : `${model.average.toFixed(1)} / 10` });
    effort.createEl("p", { text: `${model.scored} scored days · mean of recorded daily questions` });
    const plot = effort.createDiv({ cls: "life-os-effort-plot", attr: { role: "list", "aria-label": "Daily effort scores" } });
    for (const day of model.days) {
      const label = `${day.date}: ${day.score === null ? "No score recorded" : `${day.score.toFixed(1)} out of 10`}`;
      const column = plot.createDiv({ cls: "life-os-effort-column", attr: { role: "listitem", "aria-label": label, title: label } });
      column.createDiv({ cls: day.score === null ? "life-os-effort-bar is-missing" : "life-os-effort-bar",
        attr: { style: `height:${day.score === null ? 2 : day.score * 10}%` } });
      if (day.data) {
        column.setAttribute("role", "button");
        column.setAttribute("tabindex", "0");
        const open = () => void this.openPath(`${this.getConfiguredFolders().daily}/${day.date}.md`);
        this.registerDomEvent(column, "click", open);
        this.registerDomEvent(column, "keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
      }
    }
    const axis = effort.createDiv({ cls: "life-os-chart-axis" });
    axis.createSpan({ text: model.days[0].date });
    axis.createSpan({ text: model.days[model.days.length - 1].date });
    const details = effort.createEl("details", { cls: "life-os-chart-details" });
    details.createEl("summary", { text: "Read daily values" });
    const table = details.createEl("table", { cls: "life-os-chart-table" });
    const header = table.createEl("thead").createEl("tr");
    header.createEl("th", { text: "Date", attr: { scope: "col" } });
    header.createEl("th", { text: "Effort (1 to 10)", attr: { scope: "col" } });
    const body = table.createEl("tbody");
    for (const day of model.days) {
      const row = body.createEl("tr");
      row.createEl("th", { text: day.date, attr: { scope: "row" } });
      row.createEl("td", { text: day.score === null ? "Not recorded" : day.score.toFixed(1) });
    }

    const wheel = grid.createDiv({ cls: "life-os-chart-card" });
    wheel.createEl("h3", { text: "Life areas" });
    wheel.createEl("p", { text: model.retreat ? `Latest scored retreat: ${this.getFileTitle(model.retreat)}` : "Your next retreat will bring this view to life." });
    for (const [key, value] of model.wheel) {
      const row = wheel.createDiv({ cls: "life-os-wheel-row" });
      row.createSpan({ text: this.formatPropertyLabel(key) });
      const track = row.createDiv({ cls: "life-os-wheel-track", attr: { role: "meter", "aria-label": this.formatPropertyLabel(key), "aria-valuemin": "0", "aria-valuemax": "10", "aria-valuenow": String(value) } });
      track.createDiv({ cls: "life-os-wheel-fill", attr: { style: `width:${value * 10}%` } });
      row.createSpan({ text: `${value}/10` });
    }
    if (!model.wheel.length) wheel.createDiv({ cls: "life-os-live-empty", text: "No life-area scores recorded. Open Retreat from Plan to add your own." });
    if (model.retreat) this.addButton(wheel, { icon: "book-open", label: "Open scored retreat", description: "See the source of these life-area scores.", onClick: () => this.openPath(model.retreat.path) });

    const habits = grid.createDiv({ cls: "life-os-chart-card life-os-habit-chart" });
    habits.createEl("h3", { text: "Habit rhythm" });
    habits.createEl("p", { text: "Filled: done · muted: unchecked · outlined: no record. Hover a day for details." });
    const matrix = habits.createDiv({ cls: "life-os-habit-matrix" });
    for (const key of model.habits) {
      const row = matrix.createDiv({ cls: "life-os-habit-row" });
      row.createSpan({ text: this.formatPropertyLabel(key) });
      const cells = row.createDiv({ cls: "life-os-habit-cells" });
      let done = 0, recorded = 0;
      for (const day of model.days) {
        const value = day.data?.[key];
        if (typeof value === "boolean") recorded += 1;
        if (value === true) done += 1;
        const label = `${day.date}, ${this.formatPropertyLabel(key)}: ${value === true ? "Done" : value === false ? "Unchecked" : "No record"}`;
        cells.createSpan({ cls: `life-os-habit-cell ${value === true ? "is-done" : value === false ? "is-open" : "is-missing"}`,
          attr: { title: label, "aria-label": label, role: "img" } });
      }
      row.createSpan({ text: recorded ? `${done}/${recorded}` : "No data" });
    }
    if (!model.habits.length) habits.createDiv({ cls: "life-os-live-empty", text: "Add your habits in Configure to begin." });
  }

  renderRail(parent) {
    const rail = parent.createEl("aside", {
      cls: "life-os-rail",
      attr: { "aria-label": "Dev OS navigation" },
    });

    const brand = rail.createEl("button", {
      cls: "life-os-rail-brand",
      attr: { "aria-label": "Open Dev OS home" },
    });
    brand.type = "button";
    const mark = brand.createSpan();
    setIcon(mark, "compass");
    brand.createSpan({ text: "DEV OS" });
    brand.addEventListener("click", () => {
      this.activeScreen = "home";
      this.render();
    });

    const nav = rail.createEl("nav", { cls: "life-os-nav" });
    const current = this.activeScreen === "project" ? "projects" : this.activeScreen;
    for (const item of NAV_ITEMS) {
      if (item.personal && !this.showPersonal() && current !== item.id) continue;
      const badge = item.id === "inbox" ? this.inboxClips().length : 0;
      const button = nav.createEl("button", {
        cls:
          current === item.id
            ? "life-os-nav-button is-active"
            : "life-os-nav-button",
        attr: {
          "aria-current":
            current === item.id ? "page" : "false",
          title: item.label,
        },
      });
      button.type = "button";
      const icon = button.createSpan();
      setIcon(icon, item.icon);
      button.createSpan({ text: item.label });
      if (badge) button.createSpan({ cls: "life-os-nav-badge", text: String(badge), attr: { "aria-label": `${badge} waiting` } });
      button.addEventListener("click", () => {
        this.activeScreen = item.id;
        this.render();
      });
    }

    const local = rail.createDiv({ cls: "life-os-rail-foot" });
    const localIcon = local.createSpan();
    setIcon(localIcon, "hard-drive");
    local.createSpan({ text: "Local vault" });
  }

  renderTopbar(parent) {
    const topbar = parent.createEl("header", { cls: "life-os-topbar" });
    const context = topbar.createDiv({ cls: "life-os-topbar-context" });
    context.createSpan({ text: "Dev OS" });
    context.createEl("strong", { text: this.getScreenTitle() });

    const actions = topbar.createDiv({ cls: "life-os-topbar-actions" });
    this.addTopbarButton(actions, "search", "Search", () => {
      this.runCommand("global-search:open", "Search");
    });
    this.addTopbarButton(actions, "settings-2", "Configure", () => {
      void this.openPath(configFile(this.app)?.path || CONFIG_PATHS[0]);
    });
    const display = actions.createEl("details", { cls: "life-os-display-options" });
    display.createEl("summary", { text: "View" });
    const options = display.createDiv();
    options.createEl("p", { text: "Display preferences, saved with the plugin. No notes change." });
    const density = options.createEl("button", { text: this.compactLayout ? "Use comfortable spacing" : "Use compact spacing" });
    density.type = "button";
    this.registerDomEvent(density, "click", () => { this.compactLayout = !this.compactLayout; this.persistViewSettings(); this.render(true); });
    const visuals = options.createEl("button", { text: this.showVisuals ? "Hide optional visuals" : "Show optional visuals" });
    visuals.type = "button";
    this.registerDomEvent(visuals, "click", () => { this.showVisuals = !this.showVisuals; this.persistViewSettings(); this.render(true); });
    const samples = options.createEl("button", { text: this.includeExamples ? "Hide sample data" : "Show sample data" });
    samples.type = "button";
    this.registerDomEvent(samples, "click", () => { this.includeExamples = !this.includeExamples; this.persistViewSettings(); void this.refreshLiveData(); });
    const personal = options.createEl("button", { text: this.showPersonal() ? "Hide personal modules" : "Show personal modules" });
    personal.type = "button";
    this.registerDomEvent(personal, "click", () => {
      if (this.plugin?.settings) {
        this.plugin.settings.showPersonal = !this.showPersonal();
        void this.plugin.saveSettings?.();
      }
      this.render(true);
    });
    if (["home", "today", "focus", "projects", "people", "library", "ai"].includes(this.activeScreen)) {
      const local = options.createEl("button", { text: this.visualOptions[this.activeScreen] === false ? "Show this module's visual" : "Hide this module's visual" });
      local.type = "button";
      this.registerDomEvent(local, "click", () => { this.visualOptions[this.activeScreen] = this.visualOptions[this.activeScreen] === false; this.render(true); });
    }
    const label = options.createEl("label", { text: "Items per list " });
    const limit = label.createEl("select", { attr: { "aria-label": "Items per list" } });
    for (const count of [3, 6, 12]) limit.createEl("option", { text: String(count), attr: { value: String(count) } });
    limit.value = String(this.itemLimit);
    this.registerDomEvent(limit, "change", () => { this.itemLimit = Number(limit.value); this.persistViewSettings(); this.render(true); });
    const reset = options.createEl("button", { text: "Restore view defaults" });
    reset.type = "button";
    this.registerDomEvent(reset, "click", () => { this.showVisuals = true; this.visualOptions = {}; this.itemLimit = 6; this.compactLayout = false; this.focusGroup = "all"; this.libraryStatus = "all"; this.libraryType = "all"; this.persistViewSettings(); this.render(true); });
    this.addTopbarButton(actions, "plus", "Capture", () => {
      this.plugin.openCapture();
    }, true);
  }

  visualEnabled() { return this.showVisuals && this.visualOptions[this.activeScreen] !== false; }

  addTopbarButton(parent, iconName, label, onClick, primary = false) {
    const button = parent.createEl("button", {
      attr: { "aria-label": label, title: label },
      cls: primary
        ? "life-os-topbar-button is-primary"
        : "life-os-topbar-button",
    });
    button.type = "button";
    const icon = button.createSpan();
    setIcon(icon, iconName);
    button.createSpan({ text: label });
    button.addEventListener("click", onClick);
  }

  getScreenTitle() {
    if (this.activeScreen === "project") return "Project";
    return NAV_ITEMS.find((item) => item.id === this.activeScreen)?.label || "Home";
  }

  renderModule(shell) {
    const module = MODULES[this.activeScreen];
    if (!module) {
      this.activeScreen = "home";
      this.render();
      return;
    }

    const header = shell.createEl("header", { cls: "life-os-module-header" });
    header.createSpan({ cls: "life-os-eyebrow", text: module.eyebrow });
    header.createEl("h1", { text: module.title });
    header.createEl("p", { text: module.description });

    if (this.activeScreen === "today") {
      this.renderStandup(shell);
      this.renderQuickAdd(shell);
      this.renderTaskLive(shell, { limit: this.itemLimit, attention: true });
      if (this.showPersonal()) this.renderTodayLive(shell);
    } else {
      this.renderModuleLive(shell);
    }

    if (this.activeScreen === "ai") this.renderSystemSummary(shell);
    if (!module.actions.length) return;
    this.renderActionSection(
      shell,
      "Shortcuts",
      "Dashboards and captures backed by the same Markdown notes.",
      module.actions,
      (action) => {
        if (action.command) {
          this.runCommand(action.command, action.label);
        } else {
          this.openPath(action.path);
        }
      }
    );

    if (this.activeScreen === "ai") {
      const note = shell.createEl("section", { cls: "life-os-principle" });
      const icon = note.createSpan();
      setIcon(icon, "shield-check");
      const copy = note.createDiv();
      copy.createEl("strong", { text: "AI-managed, human-authorized" });
      copy.createEl("p", {
        text:
          "Dev OS can retrieve, summarize, and draft. Review context before sending. Human approval is the operating policy, not a guarantee enforced across every connected tool.",
      });
    }
  }

  renderTodayLive(parent) {
    const data = this.getTodayData();
    const section = parent.createEl("section", { cls: "life-os-today-live" });
    const heading = section.createDiv({ cls: "life-os-today-heading" });
    const copy = heading.createDiv();
    copy.createEl("h2", { text: "Today at a glance" });
    copy.createEl("p", {
      text: "A private view of today’s properties. Journal text stays out of this screen.",
    });

    if (!data.exists) {
      heading.createSpan({ cls: "life-os-progress-chip", text: "Not started" });
      const empty = section.createDiv({ cls: "life-os-today-empty" });
      const icon = empty.createSpan();
      setIcon(icon, "sunrise");
      const emptyCopy = empty.createDiv();
      emptyCopy.createEl("strong", { text: "Create today’s note" });
      emptyCopy.createEl("p", {
        text: "Life OS will use your configured questions and habits.",
      });
      this.addButton(empty, {
        icon: "plus",
        label: "Start today",
        description: "Create or open today’s daily note.",
        primary: true,
        onClick: () =>
          this.runCommand("quickadd:choice:lifeos-daily", "Today’s note"),
      });
      return;
    }

    const completed = data.questionRecorded + data.habitRecorded;
    const total = data.questions.length + data.habits.length;
    if (this.visualEnabled() && total) {
      const meter = section.createEl("progress", { cls: "life-os-checkin-meter", attr: { max: String(total), value: String(completed), "aria-label": `${completed} of ${total} check-in properties recorded, not a completion score` } });
      meter.textContent = `${completed}/${total} recorded`;
    }
    heading.createSpan({
      cls: "life-os-progress-chip is-active",
      text: total ? `${completed} of ${total} checked in` : "Ready",
    });

    const grid = section.createDiv({ cls: "life-os-today-grid" });
    this.renderTodayList(
      grid,
      "Daily questions",
      "Rate effort from 1 to 10.",
      data.questions,
      "line-chart"
    );
    this.renderTodayList(
      grid,
      "Habits",
      "A signal, never a judgment.",
      data.habits,
      "activity"
    );

    const actions = section.createDiv({ cls: "life-os-today-actions" });
    this.addButton(actions, {
      icon: "file-text",
      label: "Open daily note",
      description: "See the complete context for today.",
      onClick: () => this.openPath(data.path),
    });
    this.addButton(actions, {
      icon: "message-circle-question",
      label: "Daily questions",
      description: "Run the guided evening check-in.",
      primary: true,
      onClick: () =>
        this.runCommand(
          "templater-obsidian:Templates/Daily Questions Prompt.md",
          "Daily questions"
        ),
    });
  }

  renderTodayList(parent, title, description, rows, iconName) {
    const card = parent.createDiv({ cls: "life-os-today-card" });
    const heading = card.createDiv({ cls: "life-os-today-card-heading" });
    const icon = heading.createSpan();
    setIcon(icon, iconName);
    const copy = heading.createDiv();
    copy.createEl("h3", { text: title });
    copy.createEl("p", { text: description });

    const list = card.createDiv({ cls: "life-os-today-list" });
    for (const row of rows) {
      const item = list.createDiv({ cls: "life-os-today-row" });
      item.createSpan({ text: row.label });
      item.createSpan({
        cls: row.complete
          ? "life-os-today-value is-complete"
          : "life-os-today-value",
        text: row.display,
      });
    }
  }

  getTodayData() {
    const config = this.getConfigFrontmatter();
    const paths = this.getConfiguredFolders(config);
    const todayPath = `${paths.daily}/${moment().format("YYYY-MM-DD")}.md`;
    const todayFile = this.app.vault.getAbstractFileByPath(todayPath);
    const today = this.getFrontmatter(todayFile);
    const questionConfig = Array.isArray(config.questions) ? config.questions : [];
    const habitConfig = Array.isArray(config.habits) ? config.habits : [];

    const questions = questionConfig
      .map((question) => {
        const key = String(question?.key || question || "");
        const result = ratingState(today[key]);
        const recorded = result.state === "recorded";
        return {
          key,
          label:
            String(question?.text || "").trim() || this.formatPropertyLabel(key),
          state: result.state,
          recorded,
          complete: recorded,
          display: recorded
            ? `${result.value}/10`
            : result.state === "invalid"
              ? "Invalid value"
              : "Not rated",
        };
      })
      .filter((question) => question.key);
    const habits = habitConfig
      .map((habit) => String(habit || ""))
      .filter(Boolean)
      .map((key) => {
        const state = habitState(today[key]);
        return {
          key,
          label: this.formatPropertyLabel(key),
          state,
          recorded: state === "done" || state === "unchecked",
          complete: state === "done",
          display:
            state === "done"
              ? "Done"
              : state === "unchecked"
                ? "Unchecked"
                : state === "invalid"
                  ? "Invalid value"
                  : "Not recorded",
        };
      });

    return {
      exists: todayFile instanceof TFile,
      path: todayPath,
      questions,
      habits,
      questionRecorded: questions.filter((question) => question.recorded).length,
      habitRecorded: habits.filter((habit) => habit.recorded).length,
      habitDone: habits.filter((habit) => habit.complete).length,
    };
  }

  formatPropertyLabel(key) {
    return String(key)
      .replace(/^(dq|habit|wheel)_/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  renderModuleLive(parent) {
    if (this.activeScreen === "focus") {
      if (this.visualEnabled()) this.renderFocusGroups(parent);
      this.renderTaskLive(parent, { limit: this.itemLimit, group: this.visualEnabled() ? this.focusGroup : "all" });
    }

    if (this.activeScreen === "plan") {
      this.renderCalendar(parent);
      this.renderPlanLive(parent);
      return;
    }

    if (this.activeScreen === "review") {
      this.renderAnalytics(parent);
      this.renderReviewLive(parent);
      return;
    }

    const screens = {
      sprint: () => this.renderSprintScreen(parent),
      projects: () => this.renderProjectsScreen(parent),
      meetings: () => this.renderMeetingsScreen(parent),
      docs: () => this.renderDocsScreen(parent),
      inbox: () => this.renderInboxScreen(parent),
      roadmap: () => this.renderRoadmapScreen(parent),
      waiting: () => this.renderWaitingScreen(parent),
    };
    if (screens[this.activeScreen]) {
      screens[this.activeScreen]();
      return;
    }

    if (this.activeScreen === "ai") {
      this.renderAiLive(parent);
      return;
    }

    const collections = {
      focus: {
        title: "Active commitments",
        description: "Projects currently asking for attention.",
        types: ["project"],
        icon: "crosshair",
        empty: "No active projects yet.",
      },
      projects: {
        title: "Project pulse",
        description: "Active project notes from your canonical project folder.",
        types: ["project"],
        icon: "folder-kanban",
        empty: "No active project notes yet.",
      },
      people: {
        title: "People directory",
        description: "Relationship notes, kept local and opened in place.",
        types: ["person"],
        icon: "users",
        empty: "No people notes yet.",
      },
      library: {
        title: "Library shelf",
        description: "Typed library notes, including finished books and sources. Samples excluded.",
        types: ["book"],
        icon: "library",
        empty: "No typed library notes yet. Add a book or source with a type property.",
      },
    };
    const collection = collections[this.activeScreen];
    if (collection) {
      this.renderCollectionLive(parent, collection);
    }
  }

  renderPlanLive(parent) {
    const paths = this.getConfiguredFolders();
    const horizons = [
      {
        icon: "sun",
        label: "Today",
        period: moment().format("D MMM"),
        path: `${paths.daily}/${moment().format("YYYY-MM-DD")}.md`,
        command: "quickadd:choice:lifeos-daily",
      },
      {
        icon: "calendar-range",
        label: "This week",
        period: moment().format("[Week] ww"),
        path: `${paths.weekly}/${moment().format("gggg-[W]ww")}.md`,
        command: "quickadd:choice:lifeos-weekly",
      },
      {
        icon: "compass",
        label: "This quarter",
        period: moment().format("YYYY-[Q]Q"),
        path: `${paths.quarterly}/${moment().format("YYYY-[Q]Q")}.md`,
        command: "quickadd:choice:lifeos-quarterly",
      },
      {
        icon: "tent-tree",
        label: "Retreat",
        period: moment().format("YYYY-[Q]Q"),
        path: `${paths.retreats}/${moment().format("YYYY-[Q]Q")} Personal Retreat.md`,
        command: "quickadd:choice:lifeos-retreat",
      },
    ];
    const section = parent.createEl("section", { cls: "life-os-plan-live" });
    this.renderLiveHeading(
      section,
      "Connected horizons",
      "Each layer is ready when its canonical note exists.",
      `${horizons.filter((item) => this.fileExists(item.path)).length} of ${horizons.length} notes created`
    );
    const grid = section.createDiv({ cls: "life-os-horizon-grid" });
    for (const horizon of horizons) {
      const ready = this.fileExists(horizon.path);
      const button = grid.createEl("button", { cls: "life-os-horizon-card" });
      button.type = "button";
      const icon = button.createSpan({ cls: "life-os-horizon-icon" });
      setIcon(icon, horizon.icon);
      const copy = button.createDiv();
      copy.createEl("strong", { text: horizon.label });
      copy.createSpan({ text: horizon.period });
      button.createSpan({
        cls: ready ? "life-os-record-status is-ready" : "life-os-record-status",
        text: ready ? "Open note" : "Create note",
      });
      this.registerDomEvent(button, "click", () => {
        if (ready) {
          void this.openPath(horizon.path);
        } else {
          this.runCommand(horizon.command, horizon.label);
        }
      });
    }
  }

  renderCalendar(parent) {
    const today = moment().format("YYYY-MM-DD");
    const base = new Date(`${today}T12:00:00Z`);
    const month = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + (this.calendarOffset || 0), 1, 12));
    const section = parent.createEl("section", { cls: "life-os-calendar" });
    const toolbar = section.createDiv({ cls: "life-os-calendar-toolbar" });
    toolbar.createEl("h2", { text: month.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }) });
    for (const [label, delta] of [["Previous month", -1], ["This month", 0], ["Next month", 1]]) {
      const button = toolbar.createEl("button", { text: label });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.calendarOffset = delta ? (this.calendarOffset || 0) + delta : 0; this.render(); });
    }
    const grid = section.createDiv({ cls: "life-os-calendar-grid" });
    const firstDay = moment.localeData?.().firstDayOfWeek?.() ?? 1;
    for (let i = 0; i < 7; i++) grid.createDiv({ cls: "life-os-calendar-weekday", text: new Date(Date.UTC(2026, 0, 4 + (firstDay + i) % 7)).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }) });
    const offset = (month.getUTCDay() - firstDay + 7) % 7;
    const folder = this.getConfiguredFolders().daily;
    for (let i = 0; i < 42; i++) {
      const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1 - offset + i, 12));
      const iso = date.toISOString().slice(0, 10);
      const path = `${folder}/${iso}.md`;
      const exists = this.fileExists(path);
      const button = grid.createEl("button", { cls: `life-os-calendar-day${exists ? " is-present" : ""}${date.getUTCMonth() !== month.getUTCMonth() ? " is-outside" : ""}`, text: String(date.getUTCDate()), attr: { "aria-label": `${iso}: ${exists ? "Open daily note" : iso === today ? "Create today's note" : "No daily note"}`, ...(iso === today ? { "aria-current": "date" } : {}) } });
      button.type = "button";
      button.disabled = !exists && iso !== today;
      this.registerDomEvent(button, "click", () => exists ? void this.openPath(path) : this.runCommand("quickadd:choice:lifeos-daily", "Today’s note"));
    }
    section.createEl("p", { cls: "life-os-calendar-help", text: "Highlighted days have notes. Open an existing day, or create today. Other empty days are disabled. No entries are generated automatically." });
  }

  renderReviewLive(parent) {
    const config = this.getConfigFrontmatter();
    const paths = this.getConfiguredFolders(config);
    const questionKeys = this.getQuestionKeys(config);
    const habitKeys = this.getHabitKeys(config);
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = moment().clone().subtract(offset, "days");
      const path = `${paths.daily}/${day.format("YYYY-MM-DD")}.md`;
      const file = this.app.vault.getAbstractFileByPath(path);
      const raw = this.getFrontmatter(file);
      const excluded = !this.includeExamples && this.isExample(raw);
      const data = excluded ? {} : raw;
      const metrics = this.summarizeDailyProperties(data, questionKeys, habitKeys);
      days.push({
        label: day.format("ddd"),
        exists: file instanceof TFile && !excluded,
        recorded: metrics.recorded,
        habitsDone: metrics.habitsDone,
        total: questionKeys.length + habitKeys.length,
      });
    }
    const activeDays = days.filter((day) => day.exists).length;
    const section = parent.createEl("section", { cls: "life-os-review-live" });
    this.renderLiveHeading(
      section,
      "Seven-day signal",
      "Property coverage only. Your journal words remain private.",
      `${activeDays} daily notes`
    );
    const grid = section.createDiv({ cls: "life-os-week-grid" });
    for (const day of days) {
      const card = grid.createDiv({
        cls: day.exists ? "life-os-day-card is-present" : "life-os-day-card",
      });
      card.createEl("strong", { text: day.label });
      card.createSpan({
        text: day.exists ? `${day.recorded}/${day.total} recorded` : "No note",
      });
      const meter = card.createDiv({ cls: "life-os-day-meter" });
      const ratio = day.total ? day.recorded / day.total : 0;
      meter.createDiv({
        cls: "life-os-day-meter-fill",
        attr: { style: `width: ${Math.round(ratio * 100)}%` },
      });
    }
  }

  renderAiLive(parent) {
    const agentSettings = this.pluginSettings("agent-client");
    const restSettings = this.pluginSettings("obsidian-local-rest-api");
    const agentLoaded = this.pluginLoaded("agent-client");
    const restLoaded = this.pluginLoaded("obsidian-local-rest-api");
    const permissionSetting =
      typeof agentSettings.autoAllowPermissions === "boolean"
        ? agentSettings.autoAllowPermissions
        : null;
    const sessionCount = Array.isArray(agentSettings.savedSessions)
      ? agentSettings.savedSessions.length
      : 0;
    const agentConfigured = agentLoaded && Boolean(agentSettings.defaultAgentId);
    const restConfigured = restLoaded && Boolean(restSettings.apiKey);
    const prompts = this.app.vault
      .getMarkdownFiles()
      .filter((file) => file.path.startsWith("Prompts/")).length;
    const checks = [
      {
        icon: "bot",
        label: "Agent Client",
        ready: agentConfigured,
        state: agentConfigured ? "Configured" : agentLoaded ? "Installed" : "Unavailable",
        detail: agentConfigured
          ? `${sessionCount} local ${sessionCount === 1 ? "session" : "sessions"}`
          : "In-vault assistant interface",
      },
      {
        icon: "plug-zap",
        label: "Local MCP bridge",
        ready: restConfigured,
        state: restConfigured ? "Configured" : restLoaded ? "Installed" : "Unavailable",
        detail: restConfigured ? "Local server key present" : "Local tool connection",
      },
      {
        icon: "library",
        label: "Prompt library",
        ready: prompts > 0,
        state: prompts > 0 ? "Available" : "Unavailable",
        detail: `${prompts} governed workflows`,
      },
      {
        icon: "shield-check",
        label: "Permission policy",
        ready: agentLoaded && permissionSetting === false,
        state: !agentLoaded
          ? "Unavailable"
          : permissionSetting === false
            ? "Manual prompts"
            : permissionSetting === true
              ? "Auto-allow on"
              : "Unknown",
        detail:
          permissionSetting === false
            ? "Client setting is off. This reports policy, not enforcement."
            : permissionSetting === true
              ? "Client may auto-approve requests. This reports policy, not enforcement."
              : "Permission setting was not observable. No enforcement claim.",
      },
    ];
    const ready = checks.filter((check) => check.ready).length;
    const section = parent.createEl("section", { cls: "life-os-ai-live" });
    this.renderLiveHeading(
      section,
      "AI control center",
      "Capability status is local. Installed does not mean authenticated or connected.",
      `${ready} of ${checks.length} available`
    );
    if (this.visualEnabled()) {
      const flow = section.createEl("section", { cls: "life-os-connection-map", attr: { "aria-label": "AI integration map" } });
      flow.createEl("h3", { text: "How the parts connect" });
      const diagram = flow.createDiv({ cls: "life-os-ai-diagram" });
      diagram.createDiv({ cls: "life-os-ai-node", text: "Life OS · local dashboard" });
      diagram.createDiv({ cls: "life-os-ai-connector", text: "Selected context →" });
      const hub = diagram.createDiv({ cls: "life-os-ai-node", text: `Agent Client · ${agentConfigured ? "configured" : agentLoaded ? "loaded, configuration needed" : "unavailable"}` });
      hub.createDiv({ text: "Two separate integration paths ↓" });
      const branches = diagram.createDiv({ cls: "life-os-ai-branches" });
      branches.createDiv({ cls: "life-os-ai-node", text: "Provider · authentication not tested here" });
      branches.createDiv({ cls: "life-os-ai-node", text: `Optional local tools via MCP · ${restConfigured ? "key present, connection not tested" : "not configured"}` });
      flow.createEl("p", { text: "Integration overview, not a live traffic trace. This screen makes no provider requests. Review selected context and permissions before sending." });
    }
    const grid = section.createDiv({ cls: "life-os-ai-check-grid" });
    for (const check of checks) {
      const card = grid.createDiv({
        cls: check.ready ? "life-os-ai-check is-ready" : "life-os-ai-check",
      });
      const icon = card.createSpan();
      setIcon(icon, check.icon);
      const copy = card.createDiv();
      copy.createEl("strong", { text: check.label });
      copy.createSpan({ text: check.detail });
      card.createSpan({
        cls: "life-os-ai-state",
        text: check.state,
      });
    }
  }

  renderCollectionLive(parent, options) {
    const records = this.app.vault
      .getMarkdownFiles()
      .filter((file) => this.isDomainRecord(file))
      .filter((file) => this.activeScreen === "library" ? Boolean(this.getFrontmatter(file).type) : options.types.includes(String(this.getFrontmatter(file).type || "")))
      .filter((file) => this.activeScreen !== "library" || (file.path.startsWith("07 Library/") && !this.isExample(this.getFrontmatter(file))))
      .filter((file) => {
        const status = String(this.getFrontmatter(file).status || "").toLowerCase();
        return this.activeScreen === "library" || !["done", "complete", "completed", "archived"].includes(status);
      })
      .sort(
        (left, right) =>
          (right.stat?.mtime || 0) - (left.stat?.mtime || 0)
      );
    const section = parent.createEl("section", { cls: "life-os-collection-live" });
    this.renderLiveHeading(
      section,
      options.title,
      options.description,
      `${records.length} ${records.length === 1 ? "note" : "notes"}`
    );
    if (!records.length) {
      section.createDiv({ cls: "life-os-live-empty", text: options.empty });
      return;
    }
    let visible = records;
    if (this.activeScreen === "library") {
      const typeLabel = section.createEl("label", { text: "Type " });
      const typeSelect = typeLabel.createEl("select", { attr: { "aria-label": "Library type" } });
      const types = [...new Set(records.map(file => String(this.getFrontmatter(file).type)))].sort();
      if (!types.includes(this.libraryType)) this.libraryType = "all";
      for (const type of ["all", ...types]) typeSelect.createEl("option", { text: type === "all" ? "All types" : type, attr: { value: type } });
      typeSelect.value = this.libraryType;
      this.registerDomEvent(typeSelect, "change", () => { this.libraryType = typeSelect.value; this.render(); });
      const label = section.createEl("label", { text: "Library status " });
      const select = label.createEl("select", { attr: { "aria-label": "Library status" } });
      const statuses = [...new Set(records.map(file => String(this.getFrontmatter(file).status || "Not set")))].sort();
      for (const value of ["all", ...statuses]) select.createEl("option", { text: value === "all" ? "All statuses" : value, attr: { value } });
      if (!statuses.includes(this.libraryStatus)) this.libraryStatus = "all";
      select.value = this.libraryStatus;
      this.registerDomEvent(select, "change", () => { this.libraryStatus = select.value; this.render(); });
      visible = records.filter(file => (this.libraryStatus === "all" || String(this.getFrontmatter(file).status || "Not set") === this.libraryStatus) && (this.libraryType === "all" || String(this.getFrontmatter(file).type) === this.libraryType));
    }
    section.createEl("p", { text: `Showing ${Math.min(visible.length, this.itemLimit)} of ${visible.length} matching notes.` });
    const grid = section.createDiv({ cls: "life-os-record-grid" });
    for (const file of visible.slice(0, this.itemLimit)) {
      const data = this.getFrontmatter(file);
      const button = grid.createEl("button", { cls: "life-os-record-card" });
      button.type = "button";
      if (this.activeScreen === "library" && this.visualEnabled()) {
        button.addClass("life-os-shelf-card");
        const cover = String(data.cover || "").replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0];
        const imageFile = !/^(?:[a-z]+:|\/)/i.test(cover) && /\.(?:png|jpe?g|webp|gif)$/i.test(cover) ? this.app.metadataCache.getFirstLinkpathDest?.(cover, file.path) : null;
        if (imageFile instanceof TFile && this.app.vault.getResourcePath) button.createEl("img", { cls: "life-os-book-cover", attr: { src: this.app.vault.getResourcePath(imageFile), alt: "", loading: "lazy" } });
        else button.createDiv({ cls: "life-os-book-cover life-os-book-fallback", text: String(data.type || "Note").toUpperCase() });
      }
      const icon = button.createSpan({ cls: "life-os-record-icon" });
      setIcon(icon, options.icon);
      const copy = button.createDiv();
      copy.createEl("strong", { text: this.getFileTitle(file) });
      copy.createSpan({ text: String(data.status || "Status not set") });
      if (this.visualEnabled() && ["projects", "people"].includes(this.activeScreen)) {
        const tasks = this.tasksForRecord(file, this.activeScreen === "projects" ? "project" : "p");
        copy.createSpan({ cls: "life-os-record-metrics", attr: { title: "Counts use explicit routing tags, not inferred ownership." }, text: !this.taskSnapshot || this.taskSnapshot.error ? "Task index unavailable" : `${tasks.length} tagged open · ${tasks.filter(task => task.overdue).length} overdue${this.taskSnapshot.state === "partial" ? " · partial index" : ""}` });
      }
      const arrow = button.createSpan({ cls: "life-os-record-arrow" });
      setIcon(arrow, "arrow-up-right");
      this.registerDomEvent(button, "click", () => void this.openPath(file.path));
    }
    if (this.visualEnabled() && this.activeScreen === "people") {
      const discussion = section.createDiv({ cls: "life-os-discussion-queue" });
      discussion.createEl("h3", { text: "Open conversations" });
      const entries = visible.flatMap(file => this.tasksForRecord(file, "p").filter(task => task.discuss).map(task => ({ file, task })));
      discussion.createEl("p", { text: this.taskSnapshot && !this.taskSnapshot.error ? `${entries.length} indexed person-discussion links${this.taskSnapshot.state === "partial" ? " · partial index" : ""}. Explicit person tags only.` : "Task index unavailable." });
      for (const {file, task} of entries.slice(0, this.itemLimit)) {
        const button = discussion.createEl("button", { text: `${this.getFileTitle(file)} · ${task.text}` });
        button.type = "button";
        this.registerDomEvent(button, "click", () => void this.openPath(task.path, task.line));
      }
    }
  }

  tasksForRecord(file, prefix) {
    const tag = `#${prefix}/${slugify(this.getFileTitle(file))}`;
    return (this.taskSnapshot?.tasks || []).filter(task => task.text.split(/\s+/).includes(tag));
  }

  renderLiveHeading(parent, title, description, status) {
    const heading = parent.createDiv({ cls: "life-os-live-heading" });
    const copy = heading.createDiv();
    copy.createEl("h2", { text: title });
    copy.createEl("p", { text: description });
    heading.createSpan({ cls: "life-os-progress-chip is-active", text: status });
  }

  getFrontmatter(file) {
    return file instanceof TFile
      ? this.app.metadataCache.getFileCache(file)?.frontmatter || {}
      : {};
  }

  getConfigFrontmatter() {
    return this.getFrontmatter(configFile(this.app));
  }

  getConfiguredFolders(config = this.getConfigFrontmatter()) {
    return this.data.folders(config);
  }

  summarizeDailyProperties(data, questionKeys, habitKeys) {
    const questionsRecorded = questionKeys.filter(
      (key) => ratingState(data[key]).state === "recorded"
    ).length;
    const habitStates = habitKeys.map((key) => habitState(data[key]));
    const habitsRecorded = habitStates.filter(
      (state) => state === "done" || state === "unchecked"
    ).length;
    return {
      questionsRecorded,
      habitsRecorded,
      habitsDone: habitStates.filter((state) => state === "done").length,
      recorded: questionsRecorded + habitsRecorded,
    };
  }

  getQuestionKeys(config) {
    const questions = Array.isArray(config.questions) ? config.questions : [];
    return questions
      .map((question) => String(question?.key || question || ""))
      .filter(Boolean);
  }

  getHabitKeys(config) {
    return (Array.isArray(config.habits) ? config.habits : [])
      .map((habit) => String(habit || ""))
      .filter(Boolean);
  }

  countType(files, type) {
    return files.filter(
      (file) => this.isDomainRecord(file) && String(this.getFrontmatter(file).type || "") === type
    ).length;
  }

  isDomainRecord(file) {
    const folders = this.getConfiguredFolders();
    return [`${folders.projects}/`, `${folders.meetings}/`, "05 People/", "06 Writing/", "07 Library/"]
      .some((folder) => file.path.startsWith(folder)) &&
      (this.includeExamples || !this.isExample(this.getFrontmatter(file)));
  }

  fileExists(path) {
    return this.app.vault.getAbstractFileByPath(path) instanceof TFile;
  }

  getFileTitle(file) {
    return file.basename || file.path.split("/").pop().replace(/\.md$/i, "");
  }

  resolveTaskStatus(symbol) {
    const normalized = symbol === "" ? " " : String(symbol || "");
    return TASK_STATUS_TYPES[normalized] || "unknown";
  }

  parseTaskLine(line, statusSymbol, file, lineNumber, today) {
    const match = line.match(/^\s*(?:[-+*]|\d+[.)])\s+\[([^\]])\]\s*(.*)$/u);
    if (!match || match[1] !== statusSymbol) {
      return null;
    }
    const raw = match[2].trim();
    const due = raw.match(/📅\s*(\d{4}-\d{2}-\d{2})/)?.[1] || "";
    const scheduled = raw.match(/⏳\s*(\d{4}-\d{2}-\d{2})/)?.[1] || "";
    const overdue = Boolean(due && due < today);
    const dueToday = due === today;
    const scheduledToday = scheduled === today;
    const high = raw.includes("⏫") || raw.includes("🔺");
    const discuss = /(^|\s)#discuss(?:\s|$)/.test(raw);
    const text = raw
      .replace(/\s*[🛫⏳📅✅❌➕]\s*\d{4}-\d{2}-\d{2}/gu, "")
      .replace(/\s*🆔\s*[\w-]+/gu, "")
      .replace(/\s*⛔\s*[\w-]+(?:\s*,\s*[\w-]+)*/gu, "")
      .replace(/\s*[🔺⏫🔼🔽⏬]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    const tagged = (prefix) => [...raw.matchAll(new RegExp(`(?:^|\\s)#${prefix}/([\\w-]+)`, "gu"))].map((item) => item[1].toLowerCase());
    const closed = this.resolveTaskStatus(statusSymbol) === "closed";
    const display = text
      .replace(/(^|\s)#(?:project|sprint|release|p)\/[\w-]+/gu, "")
      .replace(/(^|\s)#blocked(?=\s|$)/gu, "")
      .replace(/\s+/g, " ")
      .trim() || text;
    return {
      text,
      display,
      raw: line,
      status: statusSymbol,
      closed,
      inProgress: statusSymbol === "/",
      due,
      scheduled,
      overdue: overdue && !closed,
      dueToday,
      scheduledToday,
      high,
      discuss,
      blocked: /(^|\s)#blocked(?:\s|$)/.test(raw),
      projects: tagged("project"),
      sprints: tagged("sprint"),
      owners: tagged("p"),
      releases: tagged("release"),
      id: raw.match(/🆔\s*([\w-]+)/u)?.[1] || "",
      dependsOn: (raw.match(/⛔\s*([\w-]+(?:\s*,\s*[\w-]+)*)/u)?.[1] || "").split(",").map((item) => item.trim()).filter(Boolean),
      createdDate: raw.match(/➕\s*(\d{4}-\d{2}-\d{2})/u)?.[1] || "",
      doneDate: raw.match(/✅\s*(\d{4}-\d{2}-\d{2})/)?.[1] || "",
      path: file.path,
      line: lineNumber,
    };
  }

  async loadTaskSnapshot() {
    const paths = this.getConfiguredFolders();
    const sources = [
      "08 Tasks/Tasks.md",
      `${paths.projects}/`,
      `${paths.meetings}/`,
      "05 People/",
      "06 Writing/",
      `${paths.docs}/`,
    ];
    const files = this.app.vault
      .getMarkdownFiles()
      .filter((file) =>
        sources.some((source) =>
          source.endsWith("/") ? file.path.startsWith(source) : file.path === source
        )
      );
    const today = moment().format("YYYY-MM-DD");
    const tasks = [];
    const closedTasks = [];
    const sections = {};
    const exampleFiles = this.includeExamples ? [] : files.filter((file) => this.isExample(this.getFrontmatter(file)));
    const indexFiles = this.includeExamples ? files : files.filter((file) => !this.isExample(this.getFrontmatter(file)));

    try {
      const contents = await Promise.all(
        indexFiles.map(async (file) => {
          const cache = this.app.metadataCache.getFileCache(file);
          if (!cache) {
            return {
              file,
              content: "",
              listItems: [],
              error: "Metadata unavailable",
              errorType: "metadata",
            };
          }
          try {
            return {
              file,
              content: await this.app.vault.cachedRead(file),
              listItems: Array.isArray(cache.listItems) ? cache.listItems : [],
              error: "",
              errorType: "",
            };
          } catch (error) {
            return {
              file,
              content: "",
              listItems: [],
              error: error?.message || "Unreadable file",
              errorType: "read",
            };
          }
        })
      );
      let unresolvedStatuses = 0;
      let malformedItems = 0;
      for (const { file, content, listItems, error } of contents) {
        if (error) {
          continue;
        }
        const lines = content.split(/\r?\n/);
        if (file.path.startsWith(`${paths.meetings}/`)) {
          sections[file.path] = { decisions: extractSection(content, "## Decisions").filter((item) => item !== "") };
        }
        for (const item of listItems) {
          if (typeof item.task !== "string") {
            continue;
          }
          const lineIndex = item.position?.start?.line;
          if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) {
            malformedItems += 1;
            continue;
          }
          const symbol = item.task === "" ? " " : item.task;
          const status = this.resolveTaskStatus(symbol);
          if (status === "unknown") {
            unresolvedStatuses += 1;
            continue;
          }
          if (status !== "open" && symbol !== "x" && symbol !== "X") {
            continue;
          }
          const task = this.parseTaskLine(
            lines[lineIndex],
            symbol,
            file,
            lineIndex + 1,
            today
          );
          if (!task) {
            malformedItems += 1;
            continue;
          }
          (task.closed ? closedTasks : tasks).push(task);
        }
      }
      tasks.sort((left, right) => {
        const rank = (task) =>
          task.overdue
            ? 0
            : task.dueToday || task.scheduledToday
              ? 1
              : task.high
                ? 2
                : task.due || task.scheduled
                  ? 3
                  : 4;
        const sortDate = (task) => task.due || task.scheduled || "9999-99-99";
        return (
          rank(left) - rank(right) ||
          sortDate(left).localeCompare(sortDate(right)) ||
          left.path.localeCompare(right.path) ||
          left.line - right.line ||
          left.text.localeCompare(right.text)
        );
      });
      const skipped = contents.filter((item) => item.error).length;
      closedTasks.sort((left, right) => right.doneDate.localeCompare(left.doneDate) || left.path.localeCompare(right.path) || left.line - right.line);
      return {
        tasks,
        closedTasks,
        sections,
        error: "",
        state: skipped || unresolvedStatuses || malformedItems ? "partial" : "ready",
        skipped,
        missingMetadata: contents.filter((item) => item.errorType === "metadata").length,
        unresolvedStatuses,
        malformedItems,
        examplesExcluded: exampleFiles.length,
        candidateFiles: files.length,
      };
    } catch (error) {
      return {
        tasks: [],
        closedTasks: [],
        sections: {},
        error: error?.message || "Task index unavailable",
        state: "unavailable",
        skipped: files.length,
        missingMetadata: 0,
        unresolvedStatuses: 0,
        malformedItems: 0,
        examplesExcluded: exampleFiles.length,
        candidateFiles: files.length,
      };
    }
  }

  taskGroup(task) {
    if (task.overdue) return "overdue";
    if (task.dueToday || task.scheduledToday) return "today";
    const today = moment().format("YYYY-MM-DD");
    if ((task.due && task.due > today) || (task.scheduled && task.scheduled > today)) return "upcoming";
    return "unscheduled";
  }

  renderFocusGroups(parent) {
    const section = parent.createDiv({ cls: "life-os-focus-groups" });
    section.createEl("h2", { text: "Where your attention goes" });
    section.createEl("p", { text: "One group per indexed open task. Past scheduled dates without a current due date fall under Other. Partial indexing may omit tasks." });
    for (const [id, label] of [["all", "All"], ["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["unscheduled", "Unscheduled / other"]]) {
      const count = this.taskSnapshot?.tasks.filter(task => id === "all" || this.taskGroup(task) === id).length;
      const button = section.createEl("button", { text: `${label} · ${count ?? "Loading"}`, attr: { "aria-pressed": String(this.focusGroup === id) } });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.focusGroup = id; this.render(); });
    }
    const total = this.taskSnapshot?.tasks.length || 0;
    if (total) {
      const bar = section.createDiv({ cls: "life-os-workload-bar", attr: { "aria-label": "Distribution of indexed open tasks" } });
      for (const [id, label] of [["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["unscheduled", "Unscheduled / other"]]) {
        const count = this.taskSnapshot.tasks.filter(task => this.taskGroup(task) === id).length;
        if (!count) continue;
        const segment = bar.createEl("button", { cls: `life-os-workload-segment is-${id}`, attr: { style: `flex:${count}`, "aria-label": `${label}: ${count} of ${total}`, title: `${label}: ${count} of ${total}` } });
        segment.type = "button";
        this.registerDomEvent(segment, "click", () => { this.focusGroup = id; this.render(); });
      }
    }
  }

  renderTaskLive(parent, { limit = 7, attention = false, group = "all" } = {}) {
    const snapshot = this.taskSnapshot;
    const section = parent.createEl("section", { cls: "life-os-task-live" });
    const coverage = snapshot
      ? [
          `${snapshot.tasks.length} open`,
          snapshot.skipped - snapshot.missingMetadata > 0
            ? `${snapshot.skipped - snapshot.missingMetadata} unreadable`
            : "",
          snapshot.missingMetadata
            ? `${snapshot.missingMetadata} metadata pending`
            : "",
          snapshot.unresolvedStatuses
            ? `${snapshot.unresolvedStatuses} unresolved status`
            : "",
          snapshot.examplesExcluded
            ? `${snapshot.examplesExcluded} sample excluded`
            : "",
        ]
          .filter(Boolean)
          .join(", ")
      : "Loading";
    this.renderLiveHeading(
      section,
      attention ? "Needs attention" : "Commitment feed",
      attention ? "Overdue, due today, scheduled today, or high priority. Tick to complete; click the text to open it at its source." : "Open tasks from the inbox, projects, meetings, people, and docs.",
      coverage
    );

    if (!snapshot) {
      section.createDiv({ cls: "life-os-live-empty", text: "Loading local tasks..." });
      return;
    }
    if (snapshot.error) {
      section.createDiv({ cls: "life-os-live-empty", text: snapshot.error });
      return;
    }
    if (!snapshot.tasks.length) {
      section.createDiv({
        cls: "life-os-live-empty",
        text:
          snapshot.state === "partial"
            ? "No open tasks indexed. Some task data could not be classified."
            : "No open tasks found.",
      });
      return;
    }

    const selected = attention ? snapshot.tasks.filter(task => task.overdue || task.dueToday || task.scheduledToday || task.high) : snapshot.tasks.filter(task => group === "all" || this.taskGroup(task) === group);
    if (!selected.length) section.createDiv({ cls: "life-os-live-empty", text: attention ? "Nothing urgent in the indexed tasks. Other open tasks remain available below." : "No indexed tasks in this group." });
    this.renderTaskList(section, selected.slice(0, limit), { context: true, dueControl: !attention, statusControl: !attention });
    this.addButton(section, {
      icon: "list-checks",
      label: "All tasks",
      description: !selected.length ? `View all ${snapshot.tasks.length} indexed open tasks.` : `Showing ${Math.min(selected.length, limit)} of ${selected.length} matching tasks.`,
      onClick: () => (this.activeScreen === "focus" ? this.openPath("00 Dashboards/Task Dashboard.md") : this.go("focus")),
    });
  }

  getTaskContext(task) {
    if (task.closed) {
      return task.doneDate ? `Done ${task.doneDate}` : "Done";
    }
    if (task.overdue) {
      return `Overdue · ${task.due}`;
    }
    if (task.dueToday) {
      return "Due today";
    }
    if (task.scheduledToday) {
      return "Scheduled today";
    }
    if (task.due) {
      return `Due ${task.due}`;
    }
    if (task.scheduled) {
      return `Scheduled ${task.scheduled}`;
    }
    return this.getFileTitle({ path: task.path });
  }

  renderSystemSummary(parent) {
    const stats = this.getSystemStats();
    const section = parent.createEl("section", { cls: "life-os-summary" });
    section.createEl("h2", { text: "Live system" });
    const grid = section.createDiv({ cls: "life-os-stat-grid" });

    for (const stat of stats) {
      const card = grid.createDiv({ cls: "life-os-stat" });
      const icon = card.createSpan({ cls: "life-os-stat-icon" });
      setIcon(icon, stat.icon);
      const copy = card.createDiv();
      copy.createEl("strong", { text: String(stat.value) });
      copy.createSpan({ text: stat.label });
    }
  }

  renderSetupBanner(parent) {
    const setupPath = "00 Dashboards/Setup.md";
    const setupFile = this.app.vault.getAbstractFileByPath(setupPath);
    const status = String(this.getFrontmatter(setupFile).status || "open").toLowerCase();
    if (status === "done" || status === "complete" || status === "completed") {
      return;
    }

    const banner = parent.createEl("section", { cls: "life-os-setup-banner" });
    const icon = banner.createSpan({ cls: "life-os-setup-icon" });
    setIcon(icon, "route");
    const copy = banner.createDiv();
    copy.createEl("strong", { text: "Finish your Dev OS setup" });
    copy.createEl("p", {
      text: "Complete the guided checklist before depending on automations or AI connections.",
    });
    this.addButton(banner, {
      icon: "arrow-right",
      label: "Continue setup",
      description: "Review the checklist.",
      onClick: () => this.openPath(setupPath),
    });
  }

  getSystemStats() {
    const paths = this.getConfiguredFolders();
    const files = this.app.vault.getMarkdownFiles().filter((file) => this.isDomainRecord(file));
    const frontmatter = (file) =>
      this.app.metadataCache.getFileCache(file)?.frontmatter || {};
    const typeCount = (types) =>
      files.filter((file) => types.includes(String(frontmatter(file).type || ""))).length;

    const activeProjects = files.filter((file) => {
      const data = frontmatter(file);
      const status = String(data.status || "").toLowerCase();
      return (
        data.type === "project" &&
        !["done", "complete", "completed", "archived"].includes(status)
      );
    }).length;

    const todayPath = `${paths.daily}/${moment().format("YYYY-MM-DD")}.md`;
    const weekPath = `${paths.weekly}/${moment().format("gggg-[W]ww")}.md`;
    const aiReady =
      this.pluginLoaded("agent-client") &&
      this.pluginLoaded("obsidian-local-rest-api");

    return [
      {
        icon: "calendar-check",
        value: this.app.vault.getAbstractFileByPath(todayPath) ? "Ready" : "Not created",
        label: "Today",
      },
      {
        icon: "calendar-range",
        value: this.app.vault.getAbstractFileByPath(weekPath) ? "Ready" : "Not created",
        label: "This week",
      },
      { icon: "folder-kanban", value: activeProjects, label: "Active projects" },
      { icon: "users", value: typeCount(["person"]), label: "People" },
      {
        icon: "milestone",
        value: typeCount(["adr", "tech-note", "postmortem"]),
        label: "Decisions and docs",
      },
      {
        icon: "sparkles",
        value: aiReady ? "Loaded" : "Unavailable",
        label: "AI tools",
      },
    ];
  }

  renderActionSection(parent, title, description, actions, onSelect) {
    const section = parent.createEl("section", {
      cls: "life-os-section",
    });

    const heading = section.createDiv({ cls: "life-os-section-heading" });
    heading.createEl("h2", { text: title });
    heading.createEl("p", { text: description });

    const grid = section.createDiv({ cls: "life-os-grid" });

    for (const action of actions) {
      this.addButton(grid, {
        icon: action.icon,
        label: action.label,
        description: action.description,
        onClick: () => onSelect(action),
      });
    }
  }

  addButton(parent, options) {
    const button = parent.createEl("button", {
      cls: options.primary
        ? "life-os-action is-primary"
        : "life-os-action",
    });

    button.type = "button";

    const icon = button.createSpan({ cls: "life-os-action-icon" });
    setIcon(icon, options.icon);

    const copy = button.createSpan({ cls: "life-os-action-copy" });
    copy.createSpan({
      cls: "life-os-action-label",
      text: options.label,
    });
    copy.createSpan({
      cls: "life-os-action-description",
      text: options.description,
    });

    this.registerDomEvent(button, "click", () => {
      void options.onClick();
    });

    return button;
  }

  addStatus(parent, iconName, label, active) {
    const chip = parent.createSpan({
      cls: active
        ? "life-os-status is-active"
        : "life-os-status is-inactive",
    });

    const icon = chip.createSpan();
    setIcon(icon, iconName);
    chip.createSpan({ text: label });
  }

  runCommand(commandId, label) {
    return this.plugin.runCommand(commandId, label);
  }

  async openPath(path, line = null) {
    if (path === `${DEFAULT_FOLDERS.projects}/Projects Board.md`) {
      path = `${this.getConfiguredFolders().projects}/Projects Board.md`;
    }
    const file = this.app.vault.getAbstractFileByPath(path);

    if (!(file instanceof TFile)) {
      new Notice(`Dev OS could not find ${path}.`);
      return;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file, Number.isInteger(line) && line > 0 ? { eState: { line: line - 1 } } : {});
    const editor = leaf.view?.editor;
    if (editor && Number.isInteger(line) && line > 0) {
      const position = { line: line - 1, ch: 0 };
      editor.setCursor(position);
      editor.scrollIntoView?.({ from: position, to: position }, true);
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  // ---------------------------------------------------------------------------
  // Dev OS: shared interaction helpers

  settingsSnapshot() {
    return { ...DEFAULT_SETTINGS, ...(this.plugin?.settings || {}), includeSamples: this.includeExamples };
  }

  persistViewSettings() {
    const settings = this.plugin?.settings;
    if (!settings) return;
    Object.assign(settings, {
      includeSamples: this.includeExamples,
      showVisuals: this.showVisuals,
      compactLayout: this.compactLayout,
      itemLimit: this.itemLimit,
    });
    void this.plugin.saveSettings?.();
  }

  showPersonal() {
    return Boolean(this.settingsSnapshot().showPersonal);
  }

  today() {
    return moment().format("YYYY-MM-DD");
  }

  async runWrite(action, message) {
    let ok = false;
    try {
      await action();
      ok = true;
      if (message) new Notice(message);
    } catch (error) {
      new Notice(error?.message || "Dev OS could not save that change.");
    }
    this.forceRender = true;
    try {
      await this.refreshLiveData();
    } finally {
      this.forceRender = false;
    }
    return ok;
  }

  go(screen, extra = {}) {
    Object.assign(this, extra);
    this.activeScreen = screen;
    this.render();
  }

  openProject(path) {
    this.go("project", { activeProjectPath: path });
  }

  allTasks() {
    const snapshot = this.taskSnapshot;
    return snapshot ? [...snapshot.tasks, ...(snapshot.closedTasks || [])] : [];
  }

  tasksForProject(file) {
    const slug = slugify(this.getFileTitle(file));
    return this.allTasks().filter((task) => task.path === file.path || (task.projects || []).includes(slug));
  }

  tasksForSprint(file) {
    const slug = slugify(this.getFileTitle(file));
    return this.allTasks().filter((task) => (task.sprints || []).includes(slug));
  }

  projectProgress(tasks) {
    const done = tasks.filter((task) => task.closed).length;
    return { done, total: tasks.length, open: tasks.length - done, overdue: tasks.filter((task) => !task.closed && task.overdue).length, ratio: tasks.length ? done / tasks.length : 0 };
  }

  activeSprints() {
    return this.data.sprints()
      .filter((file) => String(this.getFrontmatter(file).status || "").toLowerCase() === "active")
      .sort((left, right) => String(this.getFrontmatter(right).start || "").localeCompare(String(this.getFrontmatter(left).start || "")));
  }

  addMeter(parent, ratio, label) {
    const meter = parent.createDiv({ cls: "life-os-meter", attr: { role: "meter", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(ratio * 100)) } });
    meter.createDiv({ cls: "life-os-meter-fill", attr: { style: `width:${Math.round(ratio * 100)}%` } });
    return meter;
  }

  addChip(parent, text, cls = "") {
    return parent.createSpan({ cls: `life-os-chip${cls ? ` ${cls}` : ""}`, text });
  }

  addSmallButton(parent, label, onClick, { icon = "", primary = false, title = "" } = {}) {
    const button = parent.createEl("button", { cls: primary ? "life-os-small-button is-primary" : "life-os-small-button", attr: title ? { title, "aria-label": title } : {} });
    button.type = "button";
    if (icon) setIcon(button.createSpan(), icon);
    if (label) button.createSpan({ text: label });
    this.registerDomEvent(button, "click", () => void onClick());
    return button;
  }

  addSelect(parent, label, options, value, onChange, cls = "life-os-select") {
    const select = parent.createEl("select", { cls, attr: { "aria-label": label } });
    for (const option of options) {
      const item = typeof option === "string" ? { value: option, label: option } : option;
      select.createEl("option", { text: item.label ?? item.value, attr: { value: item.value } });
    }
    select.value = value ?? "";
    this.registerDomEvent(select, "change", () => void onChange(select.value));
    return select;
  }

  externalLink(parent, url, text) {
    if (!/^https?:\/\//i.test(String(url || ""))) return null;
    return parent.createEl("a", { cls: "life-os-external", text: text || url, attr: { href: url, target: "_blank", rel: "noopener noreferrer" } });
  }

  renderTaskRow(list, task, { context = true, statusControl = false, dueControl = false } = {}) {
    const state = task.closed ? " is-done" : task.overdue ? " is-overdue" : task.dueToday || task.scheduledToday ? " is-today" : "";
    const row = list.createDiv({ cls: `life-os-task-row is-interactive${state}` });
    const check = row.createEl("input", { cls: "life-os-task-check", attr: { type: "checkbox", "aria-label": `${task.closed ? "Reopen" : "Complete"}: ${task.display || task.text}` } });
    check.checked = Boolean(task.closed);
    this.registerDomEvent(check, "change", () => void this.runWrite(() => this.writer.toggleTask(task), task.closed ? "Task reopened." : "Task completed."));
    const open = row.createEl("button", { cls: "life-os-task-open", attr: { title: "Open at its source line" } });
    open.type = "button";
    open.createEl("strong", { text: task.display || task.text });
    if (context) open.createSpan({ text: this.getTaskContext(task) });
    this.registerDomEvent(open, "click", () => void this.openPath(task.path, task.line));
    const meta = row.createDiv({ cls: "life-os-task-meta" });
    if (task.blocked && !task.closed) meta.createSpan({ cls: "life-os-task-badge is-blocked", text: "Blocked" });
    if (task.inProgress) meta.createSpan({ cls: "life-os-task-badge is-progress", text: "In progress" });
    if (task.high && !task.closed) meta.createSpan({ cls: "life-os-task-priority", text: "High" });
    const waits = task.closed ? [] : this.openDependencies(task);
    if (waits.length) meta.createSpan({ cls: "life-os-task-badge is-waiting", text: `Waits on ${waits.length}`, attr: { title: `Waits on: ${waits.map((dep) => dep.display).join("; ")}` } });
    if (task.owners?.length) meta.createSpan({ cls: "life-os-task-owner", text: `@${task.owners.join(" @")}` });
    if (dueControl && !task.closed) {
      const due = meta.createEl("input", { cls: "life-os-task-due", attr: { type: "date", "aria-label": `Due date: ${task.display || task.text}` } });
      due.value = task.due || "";
      this.registerDomEvent(due, "change", () => void this.runWrite(() => this.writer.setTaskDue(task, due.value), due.value ? `Due ${due.value}.` : "Due date cleared."));
    }
    if (statusControl && !task.closed) {
      const next = task.inProgress ? "x" : "/";
      this.addSmallButton(meta, task.inProgress ? "Done" : "Start", () => this.runWrite(() => this.writer.setTaskStatus(task, next), task.inProgress ? "Task completed." : "Task started."), { icon: task.inProgress ? "check" : "play" });
    }
    this.addSmallButton(meta, "", () => this.openTaskEditor(task), { icon: "pencil", title: `Edit: ${task.display || task.text}` });
    return row;
  }

  renderTaskList(parent, tasks, options = {}) {
    const list = parent.createDiv({ cls: "life-os-task-list" });
    for (const task of tasks) this.renderTaskRow(list, task, options);
    return list;
  }

  // ---------------------------------------------------------------------------
  // Home

  renderDevHome(shell) {
    const hero = shell.createEl("header", { cls: "life-os-hero" });
    const identity = hero.createDiv({ cls: "life-os-identity" });
    const mark = identity.createSpan({ cls: "life-os-mark" });
    setIcon(mark, "compass");
    const words = identity.createDiv();
    words.createEl("h1", { text: "DEV OS" });
    words.createEl("p", { text: "Plan the work. Ship the work. Remember why." });
    hero.createDiv({ cls: "life-os-date", text: moment().format("dddd, D MMMM YYYY") });
    const status = hero.createDiv({ cls: "life-os-status-row" });
    this.addStatus(status, "shield-check", "Local-first", true);
    const aiReady = this.pluginLoaded("agent-client") && this.pluginLoaded("obsidian-local-rest-api");
    this.addStatus(status, "sparkles", aiReady ? "AI tools loaded" : "AI unavailable", aiReady);
    if (this.includeExamples) this.addStatus(status, "flask-conical", "Sample data shown", true);
    const heroActions = hero.createDiv({ cls: "life-os-hero-actions" });
    this.addButton(heroActions, { icon: "sun", label: "Today and standup", description: "Your tasks, blockers, and standup draft.", primary: true, onClick: () => this.go("today") });
    this.addButton(heroActions, { icon: "sparkles", label: "Ask Dev OS", description: "Open the governed AI workspace.", onClick: () => this.openPath("00 Dashboards/Assistant.md") });

    this.renderSetupBanner(shell);
    const overview = shell.createDiv({ cls: "life-os-home-overview" });
    const now = overview.createEl("section", { cls: "life-os-home-now" });
    now.createEl("h2", { text: "My work" });
    this.renderTaskLive(now, { limit: 5, attention: true });
    if (this.visualEnabled()) {
      const card = overview.createEl("section", { cls: "life-os-brain-card" });
      card.createEl("h2", { text: "Your connected notes" });
      const host = card.createDiv({ cls: "life-os-brain-preview" });
      this.previewBrain = new LifeOSBrainRenderer(this.app, host, true);
      this.previewBrain.brainGeometry = this.previewGeometry;
      this.addChild(this.previewBrain);
      this.addButton(card, { icon: "brain", label: "Explore Brain", description: "Open the full graph in this dashboard.", onClick: () => this.go("brain") });
    }

    const cards = shell.createDiv({ cls: "life-os-home-cards" });
    this.renderSprintCard(cards);
    this.renderMeetingsCard(cards);
    this.renderInboxCard(cards);
    this.renderProjectsCard(cards);
    this.renderQuickAdd(shell);

    if (this.showPersonal()) {
      this.renderPlanLive(shell);
      const signals = shell.createEl("section", { cls: "life-os-signals" });
      const model = this.getAnalytics();
      signals.createEl("h2", { text: "Recorded signals" });
      signals.createEl("p", { text: `${model.scored} scored days in ${this.analyticsDays} days · ${model.average === null ? "No effort scores yet" : `${model.average.toFixed(1)} / 10 mean daily effort`}. Missing days are not zero.${this.includeExamples ? " Samples included." : " Samples excluded."}` });
      this.addButton(signals, { icon: "chart-line", label: "Explore Review", description: "Effort, habit rhythm, and life areas.", onClick: () => this.go("review") });
    }
  }

  homeCard(parent, icon, title, action) {
    const card = parent.createEl("section", { cls: "life-os-home-card" });
    const heading = card.createDiv({ cls: "life-os-home-card-heading" });
    setIcon(heading.createSpan({ cls: "life-os-record-icon" }), icon);
    heading.createEl("h3", { text: title });
    if (action) this.addSmallButton(heading, action.label, action.onClick, { icon: "arrow-right" });
    return card;
  }

  renderSprintCard(parent) {
    const card = this.homeCard(parent, "timer", "Active sprint", { label: "Sprint", onClick: () => this.go("sprint") });
    const sprint = this.activeSprints()[0];
    if (!sprint) {
      card.createEl("p", { text: "No active sprint." });
      this.addSmallButton(card, "Plan a sprint", () => this.openForm("sprint"), { icon: "plus" });
      return;
    }
    const data = this.getFrontmatter(sprint);
    const progress = this.projectProgress(this.tasksForSprint(sprint));
    card.createEl("strong", { text: this.getFileTitle(sprint) });
    card.createEl("p", { text: data.goal ? String(data.goal) : "No goal written yet." });
    this.addMeter(card, progress.ratio, "Sprint progress");
    const left = daysBetween(this.today(), isoDate(data.end));
    card.createEl("small", { text: `${progress.done} of ${progress.total} done${left === null ? "" : ` · ${left >= 0 ? `${left} days left` : `${-left} days over`}`}` });
  }

  renderMeetingsCard(parent) {
    const card = this.homeCard(parent, "messages-square", "Meetings today", { label: "Meetings", onClick: () => this.go("meetings") });
    const today = this.data.meetings().filter((file) => isoDate(this.getFrontmatter(file).date) === this.today());
    if (!today.length) card.createEl("p", { text: "Nothing on record for today." });
    for (const file of today.slice(0, 3)) {
      const button = card.createEl("button", { cls: "life-os-link-row", text: this.getFileTitle(file) });
      button.type = "button";
      this.registerDomEvent(button, "click", () => void this.openPath(file.path));
    }
    const actions = this.allTasks().filter((task) => !task.closed && task.path.startsWith(`${this.data.folders().meetings}/`));
    card.createEl("small", { text: `${actions.length} open action ${actions.length === 1 ? "item" : "items"} across meetings` });
  }

  renderInboxCard(parent) {
    const card = this.homeCard(parent, "inbox", "Clipped inbox", { label: "Inbox", onClick: () => this.go("inbox") });
    const clips = this.inboxClips();
    card.createEl("strong", { cls: "life-os-big-number", text: String(clips.length) });
    card.createEl("p", { text: clips.length ? "Web clips waiting for triage." : "Nothing waiting. Clip a page with Obsidian Web Clipper." });
  }

  renderProjectsCard(parent) {
    const card = this.homeCard(parent, "folder-kanban", "Projects", { label: "All", onClick: () => this.go("projects") });
    const projects = this.data.projects({ includeClosed: false });
    if (!projects.length) {
      card.createEl("p", { text: "No active projects yet." });
      this.addSmallButton(card, "New project", () => this.openForm("project"), { icon: "plus" });
      return;
    }
    for (const file of projects.slice(0, 4)) {
      const progress = this.projectProgress(this.tasksForProject(file));
      const row = card.createEl("button", { cls: "life-os-project-mini" });
      row.type = "button";
      row.createSpan({ text: this.getFileTitle(file) });
      this.addMeter(row, progress.ratio, `${this.getFileTitle(file)} progress`);
      this.registerDomEvent(row, "click", () => this.openProject(file.path));
    }
  }

  renderQuickAdd(parent, { projectPath = "", heading = "Quick add" } = {}) {
    const section = parent.createEl("section", { cls: "life-os-quick-add" });
    section.createEl("h2", { text: heading });
    const row = section.createDiv({ cls: "life-os-form-row" });
    const text = row.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: "Add a task and press Enter", "aria-label": "New task" } });
    let target = projectPath;
    if (!projectPath) {
      const options = [{ value: "", label: "Inbox" }, ...this.data.projects({ includeClosed: false }).map((file) => ({ value: file.path, label: this.getFileTitle(file) }))];
      const preferred = this.data.projects().find((file) => this.getFileTitle(file) === this.settingsSnapshot().defaultProject);
      target = preferred?.path || "";
      this.addSelect(row, "Task destination", options, target, (value) => { target = value; });
    }
    const due = row.createEl("input", { cls: "life-os-input", attr: { type: "date", "aria-label": "Due date" } });
    const submit = async () => {
      const ok = await this.plugin.addTask?.({ text: text.value, projectPath: target, due: due.value }, this);
      if (ok) { text.value = ""; due.value = ""; }
    };
    this.addSmallButton(row, "Add", submit, { icon: "plus", primary: true });
    this.registerDomEvent(text, "keydown", (event) => { if (event.key === "Enter") { event.preventDefault?.(); void submit(); } });
  }

  openForm(kind, preset = {}) {
    return openCreateForm(this.formHost(), kind, preset, (file) => this.afterCreate(file, kind));
  }

  async afterCreate(file, kind) {
    await this.refreshLiveData();
    if (kind === "project" && file?.path) this.openProject(file.path);
  }

  // ---------------------------------------------------------------------------
  // Today: standup and task list

  renderStandup(parent) {
    const model = this.getStandupModel();
    const section = parent.createEl("section", { cls: "life-os-standup" });
    this.renderLiveHeading(section, "Standup", "Drafted from task metadata: done since your last working day, what is due or in progress, and what is blocked.", this.taskSnapshot ? `${model.today.length} today · ${model.blockers.length} blocked` : "Loading");
    const grid = section.createDiv({ cls: "life-os-standup-grid" });
    for (const [title, items, empty] of [
      ["Yesterday", model.yesterday, "Nothing completed since the last working day."],
      ["Today", model.today, "Nothing due, scheduled, or in progress."],
      ["Blockers", model.blockers, "No #blocked tasks."],
    ]) {
      const column = grid.createDiv({ cls: `life-os-standup-column${title === "Blockers" && items.length ? " is-alert" : ""}` });
      column.createEl("h3", { text: title });
      if (!items.length) column.createEl("p", { text: empty });
      else this.renderTaskList(column, items.slice(0, this.itemLimit), { context: true });
    }
    const actions = section.createDiv({ cls: "life-os-form-actions" });
    const text = buildStandupText({
      yesterday: model.yesterday.map((task) => task.display),
      today: model.today.map((task) => task.display),
      blockers: model.blockers.map((task) => task.display),
    });
    this.addSmallButton(actions, "Copy standup", async () => {
      try {
        await globalThis.navigator?.clipboard?.writeText(text);
        new Notice("Standup copied.");
      } catch (error) {
        new Notice("Clipboard unavailable.");
      }
    }, { icon: "copy" });
    this.addSmallButton(actions, "Write to daily note", () => this.writeStandup(text), { icon: "file-pen-line", primary: true });
  }

  getStandupModel() {
    const today = this.today();
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const since = isoAddDays(today, weekday === 1 ? -3 : weekday === 0 ? -2 : -1);
    const all = this.allTasks();
    return {
      yesterday: all.filter((task) => task.closed && task.doneDate && task.doneDate >= since && task.doneDate < today),
      today: all.filter((task) => !task.closed && !task.blocked && (task.inProgress || task.overdue || task.dueToday || task.scheduledToday)),
      blockers: all.filter((task) => !task.closed && task.blocked),
    };
  }

  async writeStandup(text) {
    const path = `${this.getConfiguredFolders().daily}/${this.today()}.md`;
    if (!this.fileExists(path)) {
      new Notice("Create today's note first, then write the standup.");
      this.runCommand("quickadd:choice:lifeos-daily", "Today's note");
      return false;
    }
    return this.runWrite(() => this.writer.appendUnderHeading(path, "## Standup", text), "Standup written to today's note.");
  }

  // ---------------------------------------------------------------------------
  // Projects

  renderProjectsScreen(parent) {
    const projects = this.data.projects();
    const section = parent.createEl("section", { cls: "life-os-collection-live" });
    this.renderLiveHeading(section, "Projects", "Status and priority change here and write to the note's properties. Open a card for the full project page.", `${projects.length} ${projects.length === 1 ? "project" : "projects"}`);
    const toolbar = section.createDiv({ cls: "life-os-toolbar" });
    const filter = this.projectFilter || "open";
    for (const [id, label] of [["open", "Open"], ["active", "Active"], ["on-hold", "On hold"], ["idea", "Ideas"], ["done", "Done"], ["all", "All"]]) {
      const button = toolbar.createEl("button", { cls: "life-os-filter", text: label, attr: { "aria-pressed": String(filter === id) } });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.projectFilter = id; this.render(); });
    }
    this.addSmallButton(toolbar, "New project", () => this.openForm("project"), { icon: "plus", primary: true });
    const visible = projects.filter((file) => {
      const status = String(this.getFrontmatter(file).status || "active").toLowerCase();
      if (filter === "all") return true;
      if (filter === "open") return !["done", "archived", "cancelled"].includes(status);
      return status === filter;
    });
    if (!visible.length) {
      section.createDiv({ cls: "life-os-live-empty", text: projects.length ? "No projects match this filter." : "No projects yet. Create one, or show sample data from the View menu." });
      return;
    }
    const grid = section.createDiv({ cls: "life-os-project-grid" });
    for (const file of visible) {
      const data = this.getFrontmatter(file);
      const progress = this.projectProgress(this.tasksForProject(file));
      const card = grid.createDiv({ cls: `life-os-project-card is-${slugify(data.priority || "normal")}` });
      const open = card.createEl("button", { cls: "life-os-project-card-open" });
      open.type = "button";
      setIcon(open.createSpan({ cls: "life-os-record-icon" }), "folder-kanban");
      const copy = open.createDiv();
      copy.createEl("strong", { text: this.getFileTitle(file) });
      copy.createSpan({ cls: "life-os-record-metrics", text: !this.taskSnapshot ? "Loading tasks" : `${progress.open} open · ${progress.done} done${progress.overdue ? ` · ${progress.overdue} overdue` : ""}` });
      this.registerDomEvent(open, "click", () => this.openProject(file.path));
      this.addMeter(card, progress.ratio, `${this.getFileTitle(file)} progress`);
      const controls = card.createDiv({ cls: "life-os-project-controls" });
      this.addSelect(controls, `Status of ${this.getFileTitle(file)}`, PROJECT_STATUSES, String(data.status || "active"), (value) => this.runWrite(() => this.writer.setFrontmatter(file.path, { status: value }), `Status set to ${value}.`));
      this.addSelect(controls, `Priority of ${this.getFileTitle(file)}`, PRIORITIES, String(data.priority || "normal"), (value) => this.runWrite(() => this.writer.setFrontmatter(file.path, { priority: value }), `Priority set to ${value}.`));
      if (isoDate(data.due)) this.addChip(controls, `Due ${isoDate(data.due)}`, isoDate(data.due) < this.today() ? "is-alert" : "");
    }
  }

  renderProjectPage(shell) {
    const file = this.app.vault.getAbstractFileByPath(this.activeProjectPath || "");
    if (!(file instanceof TFile)) {
      this.activeScreen = "projects";
      this.render();
      return;
    }
    const data = this.getFrontmatter(file);
    const title = this.getFileTitle(file);
    const slug = slugify(title);
    const tasks = this.tasksForProject(file);
    const progress = this.projectProgress(tasks);
    const page = shell.createDiv({ cls: "life-os-project-page" });

    const crumbs = page.createDiv({ cls: "life-os-breadcrumb" });
    this.addSmallButton(crumbs, "Projects", () => this.go("projects"), { icon: "arrow-left" });
    crumbs.createSpan({ text: "/" });
    crumbs.createSpan({ text: title });

    const header = page.createEl("header", { cls: "life-os-project-header" });
    const headline = header.createDiv({ cls: "life-os-project-headline" });
    headline.createSpan({ cls: "life-os-eyebrow", text: `#project/${slug}` });
    headline.createEl("h1", { text: title });
    const fields = header.createDiv({ cls: "life-os-project-fields" });
    const field = (label) => {
      const wrap = fields.createEl("label", { cls: "life-os-field" });
      wrap.createSpan({ cls: "life-os-field-label", text: label });
      return wrap;
    };
    this.addSelect(field("Status"), "Project status", PROJECT_STATUSES, String(data.status || "active"), (value) => this.runWrite(() => this.writer.setFrontmatter(file.path, { status: value }), `Status set to ${value}.`));
    this.addSelect(field("Priority"), "Project priority", PRIORITIES, String(data.priority || "normal"), (value) => this.runWrite(() => this.writer.setFrontmatter(file.path, { priority: value }), `Priority set to ${value}.`));
    const due = field("Target date").createEl("input", { cls: "life-os-input", attr: { type: "date", "aria-label": "Project target date" } });
    due.value = isoDate(data.due);
    this.registerDomEvent(due, "change", () => void this.runWrite(() => this.writer.setFrontmatter(file.path, { due: due.value || "" }), "Target date saved."));
    const repo = field("Repository").createEl("input", { cls: "life-os-input", attr: { type: "url", placeholder: "https://...", "aria-label": "Repository URL" } });
    repo.value = String(data.repo || "");
    this.registerDomEvent(repo, "change", () => void this.runWrite(() => this.writer.setFrontmatter(file.path, { repo: repo.value.trim() }), "Repository saved."));

    const stats = header.createDiv({ cls: "life-os-project-stats" });
    const left = daysBetween(this.today(), isoDate(data.due));
    for (const [value, label] of [
      [`${Math.round(progress.ratio * 100)}%`, `${progress.done} of ${progress.total} tasks done`],
      [String(progress.open), "open tasks"],
      [String(progress.overdue), "overdue"],
      [left === null ? "No date" : left >= 0 ? `${left}d` : `${-left}d late`, "to target"],
    ]) {
      const stat = stats.createDiv({ cls: "life-os-project-stat" });
      stat.createEl("strong", { text: value });
      stat.createSpan({ text: label });
    }
    this.addMeter(header, progress.ratio, "Project progress");

    const people = header.createDiv({ cls: "life-os-people-row" });
    people.createSpan({ cls: "life-os-field-label", text: "Stakeholders" });
    const stakeholders = linkList(data.stakeholders);
    for (const name of stakeholders) {
      const chip = people.createSpan({ cls: "life-os-chip is-person" });
      chip.createSpan({ text: name });
      const remove = chip.createEl("button", { cls: "life-os-chip-remove", text: "×", attr: { "aria-label": `Remove ${name}` } });
      remove.type = "button";
      this.registerDomEvent(remove, "click", () => void this.runWrite(() => this.writer.setFrontmatter(file.path, { stakeholders: stakeholders.filter((item) => item !== name).map(wikiLink) }), `${name} removed.`));
    }
    const candidates = this.data.people().map((person) => this.getFileTitle(person)).filter((name) => !stakeholders.includes(name));
    if (candidates.length) {
      this.addSelect(people, "Add stakeholder", [{ value: "", label: "+ Add person" }, ...candidates], "", (value) => {
        if (!value) return;
        return this.runWrite(() => this.writer.setFrontmatter(file.path, { stakeholders: [...stakeholders, value].map(wikiLink) }), `${value} added.`);
      });
    }
    const links = header.createDiv({ cls: "life-os-form-actions" });
    this.externalLink(links, data.repo, "Open repository");
    this.addSmallButton(links, "Open note", () => this.openPath(file.path), { icon: "file-text" });

    const tabs = page.createDiv({ cls: "life-os-tabs", attr: { role: "tablist" } });
    const tab = this.projectTab(file.path);
    const meetings = this.data.forProject(this.data.meetings(), file).sort((a, b) => String(this.getFrontmatter(b).date || "").localeCompare(String(this.getFrontmatter(a).date || "")));
    const docs = [...this.data.forProject(this.data.docs(), file), ...this.data.forProject(this.data.releases(), file)];
    const clips = this.data.forProject(this.data.clippings(), file);
    for (const [id, label, count] of [["overview", "Overview", null], ["tasks", "Tasks", progress.open], ["meetings", "Meetings", meetings.length], ["docs", "Docs", docs.length], ["clips", "Clips", clips.length]]) {
      const button = tabs.createEl("button", { cls: "life-os-tab", text: count === null ? label : `${label} · ${count}`, attr: { role: "tab", "aria-selected": String(tab === id) } });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.setProjectTab(file.path, id); this.render(); });
    }
    const panel = page.createDiv({ cls: "life-os-tab-panel" });
    const context = { file, data, title, slug, tasks, meetings, docs, clips };
    if (tab === "tasks") this.renderProjectTasks(panel, context);
    else if (tab === "meetings") this.renderProjectMeetings(panel, context);
    else if (tab === "docs") this.renderProjectDocs(panel, context);
    else if (tab === "clips") this.renderProjectClips(panel, context);
    else this.renderProjectOverview(panel, context);
  }

  projectTab(path) {
    return this.settingsSnapshot().projectTabs?.[path] || (this.projectTabs || {})[path] || "overview";
  }

  setProjectTab(path, tab) {
    this.projectTabs = { ...(this.projectTabs || {}), [path]: tab };
    if (this.plugin?.settings) {
      this.plugin.settings.projectTabs = { ...(this.plugin.settings.projectTabs || {}), [path]: tab };
      void this.plugin.saveSettings?.();
    }
  }

  renderProjectOverview(panel, { file, data, tasks, meetings, docs }) {
    const grid = panel.createDiv({ cls: "life-os-overview-grid" });
    const next = grid.createEl("section", { cls: "life-os-panel-card" });
    next.createEl("h3", { text: "Next up" });
    const open = tasks.filter((task) => !task.closed);
    if (!open.length) next.createEl("p", { text: "No open tasks. Add one in the Tasks tab." });
    else this.renderTaskList(next, open.slice(0, 5), { context: true });
    this.addSmallButton(next, "All tasks", () => { this.setProjectTab(file.path, "tasks"); this.render(); }, { icon: "list-checks" });

    const sprintCard = grid.createEl("section", { cls: "life-os-panel-card" });
    sprintCard.createEl("h3", { text: "Sprint" });
    const sprints = this.data.forProject(this.data.sprints(), file);
    const current = this.data.fileByTitle(linkTarget(data.current_sprint), this.data.sprints()) || sprints.find((sprint) => String(this.getFrontmatter(sprint).status) === "active");
    if (current) {
      const sprintData = this.getFrontmatter(current);
      const sprintProgress = this.projectProgress(this.tasksForSprint(current));
      sprintCard.createEl("strong", { text: this.getFileTitle(current) });
      sprintCard.createEl("p", { text: String(sprintData.goal || "No goal written yet.") });
      this.addMeter(sprintCard, sprintProgress.ratio, "Sprint progress");
      sprintCard.createEl("small", { text: `${sprintProgress.done} of ${sprintProgress.total} done · ends ${isoDate(sprintData.end) || "unknown"}` });
      this.addSmallButton(sprintCard, "Open sprint board", () => this.go("sprint", { activeSprintPath: current.path }), { icon: "kanban" });
    } else {
      sprintCard.createEl("p", { text: "No active sprint for this project." });
      this.addSmallButton(sprintCard, "Plan a sprint", () => this.openForm("sprint", { project: this.getFileTitle(file), number: String(sprints.length + 1), status: "active" }), { icon: "plus" });
    }

    const meetingCard = grid.createEl("section", { cls: "life-os-panel-card" });
    meetingCard.createEl("h3", { text: "Last meeting" });
    const last = meetings[0];
    if (last) {
      meetingCard.createEl("strong", { text: this.getFileTitle(last) });
      const actions = this.allTasks().filter((task) => task.path === last.path && !task.closed);
      meetingCard.createEl("p", { text: `${isoDate(this.getFrontmatter(last).date)} · ${actions.length} open action ${actions.length === 1 ? "item" : "items"}` });
      if (actions.length) this.renderTaskList(meetingCard, actions.slice(0, 3), { context: false });
    } else meetingCard.createEl("p", { text: "No meeting minutes yet." });
    this.addSmallButton(meetingCard, "Write minutes", () => { this.setProjectTab(file.path, "meetings"); this.composerOpen = true; this.render(); }, { icon: "plus", primary: true });

    const decisionCard = grid.createEl("section", { cls: "life-os-panel-card" });
    decisionCard.createEl("h3", { text: "Latest decision" });
    const adrs = docs.filter((doc) => this.getFrontmatter(doc).type === "adr").sort((a, b) => String(this.getFrontmatter(b).date || "").localeCompare(String(this.getFrontmatter(a).date || "")));
    if (adrs[0]) {
      const button = decisionCard.createEl("button", { cls: "life-os-link-row", text: this.getFileTitle(adrs[0]) });
      button.type = "button";
      this.registerDomEvent(button, "click", () => void this.openPath(adrs[0].path));
      this.addChip(decisionCard, String(this.getFrontmatter(adrs[0]).status || "proposed"), `is-${slugify(this.getFrontmatter(adrs[0]).status || "proposed")}`);
    } else decisionCard.createEl("p", { text: "No decision records yet." });
    this.addSmallButton(decisionCard, "New ADR", () => this.openForm("adr", { project: this.getFileTitle(file) }), { icon: "plus" });
    this.renderMilestones(grid, file, data);
  }

  renderProjectTasks(panel, { file, slug, tasks }) {
    const form = panel.createEl("section", { cls: "life-os-task-form" });
    form.createEl("h3", { text: "Add a task" });
    const draft = (this.taskDrafts ||= {})[file.path] ||= { text: "", due: "", scheduled: "", high: false, sprint: "", owner: "", blocked: false };
    const row = form.createDiv({ cls: "life-os-form-row" });
    const text = row.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: "Describe the task", "aria-label": "Task description" } });
    text.value = draft.text;
    this.registerDomEvent(text, "input", () => { draft.text = text.value; });
    const options = form.createDiv({ cls: "life-os-form-row" });
    const dated = (label, key) => {
      const wrap = options.createEl("label", { cls: "life-os-field" });
      wrap.createSpan({ cls: "life-os-field-label", text: label });
      const input = wrap.createEl("input", { cls: "life-os-input", attr: { type: "date", "aria-label": label } });
      input.value = draft[key];
      this.registerDomEvent(input, "change", () => { draft[key] = input.value; });
    };
    dated("Due", "due");
    dated("Scheduled", "scheduled");
    const sprintField = options.createEl("label", { cls: "life-os-field" });
    sprintField.createSpan({ cls: "life-os-field-label", text: "Sprint" });
    const sprints = this.data.forProject(this.data.sprints(), file).filter((sprint) => String(this.getFrontmatter(sprint).status || "") !== "closed");
    this.addSelect(sprintField, "Sprint", [{ value: "", label: "Backlog" }, ...sprints.map((sprint) => ({ value: slugify(this.getFileTitle(sprint)), label: this.getFileTitle(sprint) }))], draft.sprint, (value) => { draft.sprint = value; });
    const ownerField = options.createEl("label", { cls: "life-os-field" });
    ownerField.createSpan({ cls: "life-os-field-label", text: "Owner" });
    this.addSelect(ownerField, "Owner", personOptions(this.data, "Me"), draft.owner, (value) => { draft.owner = value; });
    const releases = this.data.forProject(this.data.releases(), file).filter((release) => String(this.getFrontmatter(release).status || "") !== "released");
    if (releases.length) {
      const releaseField = options.createEl("label", { cls: "life-os-field" });
      releaseField.createSpan({ cls: "life-os-field-label", text: "Release" });
      this.addSelect(releaseField, "Release", [{ value: "", label: "None" }, ...releases.map((release) => ({ value: slugify(this.getFileTitle(release)), label: this.getFileTitle(release) }))], draft.release || "", (value) => { draft.release = value; });
    }
    const flags = options.createDiv({ cls: "life-os-flags" });
    for (const [key, label] of [["high", "High priority"], ["blocked", "Blocked"]]) {
      const wrap = flags.createEl("label", { cls: "life-os-inline-check", text: label });
      const box = wrap.createEl("input", { attr: { type: "checkbox", "aria-label": label } });
      box.checked = Boolean(draft[key]);
      this.registerDomEvent(box, "change", () => { draft[key] = box.checked; });
    }
    const submit = async () => {
      draft.text = text.value;
      let line = buildTaskLine({ ...draft, project: slug, created: this.today() });
      if (line && draft.release) line = editTaskLine(line, { release: draft.release });
      if (!line) { new Notice("Write the task first."); return; }
      const heading = this.settingsSnapshot().taskHeading || "## Tasks";
      const ok = await this.runWrite(() => this.writer.appendUnderHeading(file.path, heading, line, ["## Tasks", "## Inline tasks"]), "Task added.");
      if (ok) Object.assign(draft, { text: "", due: "", scheduled: "", high: false, blocked: false, release: "" });
    };
    this.addSmallButton(row, "Add task", submit, { icon: "plus", primary: true });
    this.registerDomEvent(text, "keydown", (event) => { if (event.key === "Enter") { event.preventDefault?.(); void submit(); } });

    const filter = this.projectTaskFilter || "open";
    const toolbar = panel.createDiv({ cls: "life-os-toolbar" });
    const groups = {
      all: tasks,
      open: tasks.filter((task) => !task.closed),
      progress: tasks.filter((task) => task.inProgress),
      blocked: tasks.filter((task) => !task.closed && task.blocked),
      done: tasks.filter((task) => task.closed),
    };
    for (const [id, label] of [["open", "Open"], ["progress", "In progress"], ["blocked", "Blocked"], ["done", "Done"], ["all", "All"]]) {
      const button = toolbar.createEl("button", { cls: "life-os-filter", text: `${label} · ${groups[id].length}`, attr: { "aria-pressed": String(filter === id) } });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.projectTaskFilter = id; this.render(); });
    }
    const visible = groups[filter] || groups.open;
    if (!this.taskSnapshot) { panel.createDiv({ cls: "life-os-live-empty", text: "Loading tasks..." }); return; }
    if (!visible.length) { panel.createDiv({ cls: "life-os-live-empty", text: "No tasks in this view." }); return; }
    const bySprint = new Map();
    for (const task of visible) {
      const key = task.sprints?.[0] || "";
      if (!bySprint.has(key)) bySprint.set(key, []);
      bySprint.get(key).push(task);
    }
    const sprintTitles = new Map(this.data.sprints().map((sprint) => [slugify(this.getFileTitle(sprint)), this.getFileTitle(sprint)]));
    for (const [key, items] of [...bySprint.entries()].sort(([a], [b]) => (a ? 0 : 1) - (b ? 0 : 1) || a.localeCompare(b))) {
      const group = panel.createDiv({ cls: "life-os-task-group" });
      group.createEl("h4", { text: key ? sprintTitles.get(key) || `Sprint ${key}` : "Backlog" });
      this.renderTaskList(group, items, { context: true, statusControl: true, dueControl: true });
    }
  }

  meetingDraft(key) {
    const store = this.plugin?.settings ? (this.plugin.settings.meetingDrafts ||= {}) : (this.localDrafts ||= {});
    if (!store[key]) {
      store[key] = { title: "", date: this.today(), time: "", kind: "meeting", attendees: [], others: "", agenda: "", notes: "", decisions: [""], actions: [{ text: "", owner: "", due: "" }] };
    }
    return store[key];
  }

  saveDrafts() {
    if (this.plugin?.settings) void this.plugin.saveSettings?.();
  }

  renderProjectMeetings(panel, { file, title, slug, meetings }) {
    const toolbar = panel.createDiv({ cls: "life-os-toolbar" });
    this.addSmallButton(toolbar, this.composerOpen ? "Hide composer" : "New meeting minutes", () => { this.composerOpen = !this.composerOpen; this.render(); }, { icon: this.composerOpen ? "x" : "plus", primary: !this.composerOpen });
    if (this.composerOpen) this.renderMeetingComposer(panel, { key: file.path, project: title, projectSlug: slug });
    if (!meetings.length) {
      panel.createDiv({ cls: "life-os-live-empty", text: "No meeting minutes linked to this project yet." });
      return;
    }
    const timeline = panel.createDiv({ cls: "life-os-timeline" });
    for (const meeting of meetings) this.renderMeetingCard(timeline, meeting);
  }

  renderMeetingComposer(parent, { key, project = "", projectSlug = "" }) {
    const draft = this.meetingDraft(key);
    const box = parent.createEl("section", { cls: "life-os-composer" });
    box.createEl("h3", { text: "Meeting minutes" });
    const input = (wrap, label, prop, type = "text", placeholder = "") => {
      const field = wrap.createEl("label", { cls: "life-os-field" });
      field.createSpan({ cls: "life-os-field-label", text: label });
      const element = field.createEl("input", { cls: "life-os-input", attr: { type, placeholder, "aria-label": label } });
      element.value = draft[prop] || "";
      this.registerDomEvent(element, type === "date" || type === "time" ? "change" : "input", () => { draft[prop] = element.value; });
      return element;
    };
    const top = box.createDiv({ cls: "life-os-form-row" });
    const titleInput = input(top, "Title", "title", "text", "Weekly sync");
    titleInput.addClass("is-grow");
    input(top, "Date", "date", "date");
    input(top, "Time", "time", "time");
    const kindField = top.createEl("label", { cls: "life-os-field" });
    kindField.createSpan({ cls: "life-os-field-label", text: "Kind" });
    this.addSelect(kindField, "Meeting kind", MEETING_KINDS, draft.kind, (value) => { draft.kind = value; });
    let projectChoice = project;
    if (!project) {
      const projectField = top.createEl("label", { cls: "life-os-field" });
      projectField.createSpan({ cls: "life-os-field-label", text: "Project" });
      projectChoice = draft.project || "";
      this.addSelect(projectField, "Meeting project", projectOptions(this.data), projectChoice, (value) => { draft.project = value; projectChoice = value; });
    }

    const attendees = box.createDiv({ cls: "life-os-people-row" });
    attendees.createSpan({ cls: "life-os-field-label", text: "Attendees" });
    for (const person of this.data.people()) {
      const name = this.getFileTitle(person);
      const selected = draft.attendees.includes(name);
      const chip = attendees.createEl("button", { cls: "life-os-chip is-person is-toggle", text: name, attr: { "aria-pressed": String(selected) } });
      chip.type = "button";
      this.registerDomEvent(chip, "click", () => {
        draft.attendees = selected ? draft.attendees.filter((item) => item !== name) : [...draft.attendees, name];
        this.render();
      });
    }
    const others = attendees.createEl("input", { cls: "life-os-input", attr: { type: "text", placeholder: "Others, comma separated", "aria-label": "Other attendees" } });
    others.value = draft.others || "";
    this.registerDomEvent(others, "input", () => { draft.others = others.value; });

    const areas = box.createDiv({ cls: "life-os-composer-grid" });
    for (const [prop, label, placeholder] of [["agenda", "Agenda", "One item per line"], ["notes", "Notes", "What was said, one point per line"]]) {
      const field = areas.createEl("label", { cls: "life-os-field is-wide" });
      field.createSpan({ cls: "life-os-field-label", text: label });
      const area = field.createEl("textarea", { cls: "life-os-textarea", attr: { rows: "4", placeholder, "aria-label": label } });
      area.value = draft[prop] || "";
      this.registerDomEvent(area, "input", () => { draft[prop] = area.value; });
    }

    const decisions = box.createDiv({ cls: "life-os-composer-list" });
    decisions.createEl("h4", { text: "Decisions" });
    draft.decisions.forEach((value, index) => {
      const row = decisions.createDiv({ cls: "life-os-form-row" });
      const element = row.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: "We decided to...", "aria-label": `Decision ${index + 1}` } });
      element.value = value;
      this.registerDomEvent(element, "input", () => { draft.decisions[index] = element.value; });
      this.addSmallButton(row, "", () => { draft.decisions.splice(index, 1); if (!draft.decisions.length) draft.decisions.push(""); this.render(); }, { icon: "trash-2", title: `Remove decision ${index + 1}` });
    });
    this.addSmallButton(decisions, "Decision", () => { draft.decisions.push(""); this.render(); }, { icon: "plus" });

    const actions = box.createDiv({ cls: "life-os-composer-list" });
    actions.createEl("h4", { text: "Action items" });
    const owners = personOptions(this.data, "Owner");
    draft.actions.forEach((action, index) => {
      const row = actions.createDiv({ cls: "life-os-form-row" });
      const element = row.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: "Who does what", "aria-label": `Action item ${index + 1}` } });
      element.value = action.text;
      this.registerDomEvent(element, "input", () => { action.text = element.value; });
      this.addSelect(row, `Owner of action item ${index + 1}`, owners, action.owner, (value) => { action.owner = value; });
      const due = row.createEl("input", { cls: "life-os-input", attr: { type: "date", "aria-label": `Due date of action item ${index + 1}` } });
      due.value = action.due || "";
      this.registerDomEvent(due, "change", () => { action.due = due.value; });
      this.addSmallButton(row, "", () => { draft.actions.splice(index, 1); if (!draft.actions.length) draft.actions.push({ text: "", owner: "", due: "" }); this.render(); }, { icon: "trash-2", title: `Remove action item ${index + 1}` });
    });
    this.addSmallButton(actions, "Action item", () => { draft.actions.push({ text: "", owner: "", due: "" }); this.render(); }, { icon: "plus" });

    const footer = box.createDiv({ cls: "life-os-form-actions" });
    footer.createSpan({ cls: "life-os-form-hint", text: `Saves to ${this.data.folders().meetings}/${draft.date || "date"} ${draft.title || "title"}.md. Action items become tasks${project || projectChoice ? ` tagged #project/${projectSlug || slugify(projectChoice)}` : ""}.` });
    this.addSmallButton(footer, "Discard draft", () => { this.discardMeetingDraft(key); this.render(); }, { icon: "x" });
    this.addSmallButton(footer, "Save minutes", () => this.saveMeetingDraft(key, { project: project || projectChoice }), { icon: "save", primary: true });
  }

  discardMeetingDraft(key) {
    const store = this.plugin?.settings ? this.plugin.settings.meetingDrafts || {} : this.localDrafts || {};
    delete store[key];
    this.saveDrafts();
  }

  async saveMeetingDraft(key, { project = "" } = {}) {
    const draft = this.meetingDraft(key);
    if (!draft.title.trim()) { new Notice("Give the meeting a title."); return false; }
    if (!isoDate(draft.date)) { new Notice("Pick a meeting date."); return false; }
    const attendees = [...draft.attendees, ...String(draft.others || "").split(",").map((item) => item.trim()).filter(Boolean)];
    const content = buildMeetingNote({
      title: draft.title.trim(), kind: draft.kind, date: draft.date, time: draft.time,
      project, projectSlug: slugify(project), attendees, agenda: draft.agenda, notes: draft.notes,
      decisions: draft.decisions, actions: draft.actions.filter((action) => action.text.trim()), today: this.today(),
    });
    let created = null;
    const ok = await this.runWrite(async () => {
      created = await this.writer.createNote(this.data.folders().meetings, `${draft.date} ${draft.title.trim()}`, content);
    }, "Meeting minutes saved.");
    if (ok) {
      this.discardMeetingDraft(key);
      this.composerOpen = false;
      if (created?.path) (this.expandedMeetings ||= new Set()).add(created.path);
      this.render();
    }
    return ok;
  }

  renderMeetingCard(parent, meeting) {
    const data = this.getFrontmatter(meeting);
    const expanded = (this.expandedMeetings ||= new Set()).has(meeting.path);
    const actions = this.allTasks().filter((task) => task.path === meeting.path);
    const card = parent.createDiv({ cls: `life-os-meeting-card${expanded ? " is-open" : ""}` });
    const head = card.createEl("button", { cls: "life-os-meeting-head", attr: { "aria-expanded": String(expanded) } });
    head.type = "button";
    head.createSpan({ cls: "life-os-meeting-date", text: isoDate(data.date) || "No date" });
    head.createEl("strong", { text: this.getFileTitle(meeting).replace(/^\d{4}-\d{2}-\d{2}\s+/, "") });
    head.createSpan({ cls: "life-os-chip", text: String(data.kind || "meeting") });
    head.createSpan({ cls: "life-os-record-metrics", text: `${actions.filter((task) => !task.closed).length} open actions` });
    this.registerDomEvent(head, "click", () => {
      if (expanded) this.expandedMeetings.delete(meeting.path);
      else this.expandedMeetings.add(meeting.path);
      this.render();
    });
    if (!expanded) return;
    const body = card.createDiv({ cls: "life-os-meeting-body" });
    const attendees = linkList(data.attendees);
    if (attendees.length) {
      const row = body.createDiv({ cls: "life-os-people-row" });
      row.createSpan({ cls: "life-os-field-label", text: "Attendees" });
      for (const name of attendees) this.addChip(row, name, "is-person");
    }
    const decisions = this.taskSnapshot?.sections?.[meeting.path]?.decisions || [];
    const decisionBox = body.createDiv({ cls: "life-os-composer-list" });
    decisionBox.createEl("h4", { text: "Decisions" });
    if (!decisions.length) decisionBox.createEl("p", { text: "No decisions recorded." });
    for (const decision of decisions) {
      const row = decisionBox.createDiv({ cls: "life-os-decision-row" });
      row.createSpan({ text: decision });
      this.addSmallButton(row, "ADR", () => this.openForm("adr", { title: decision.replace(/\[\[|\]\]/g, "").slice(0, 80), project: linkTarget(data.project), context: `From [[${this.getFileTitle(meeting)}]].`, decision }), { icon: "milestone", title: "Promote to a decision record" });
    }
    const actionBox = body.createDiv({ cls: "life-os-composer-list" });
    actionBox.createEl("h4", { text: "Action items" });
    if (!actions.length) actionBox.createEl("p", { text: "No action items." });
    else this.renderTaskList(actionBox, actions, { context: true });
    const note = body.createDiv({ cls: "life-os-form-row" });
    const area = note.createEl("textarea", { cls: "life-os-textarea is-grow", attr: { rows: "2", placeholder: "Add a note to these minutes", "aria-label": `Add a note to ${this.getFileTitle(meeting)}` } });
    const drafts = (this.noteDrafts ||= {});
    area.value = drafts[meeting.path] || "";
    this.registerDomEvent(area, "input", () => { drafts[meeting.path] = area.value; });
    this.addSmallButton(note, "Append", async () => {
      const lines = String(area.value || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => (line.startsWith("- ") ? line : `- ${line}`));
      if (!lines.length) return;
      const ok = await this.runWrite(() => this.writer.appendUnderHeading(meeting.path, "## Notes", lines.join("\n")), "Note added to the minutes.");
      if (ok) { delete drafts[meeting.path]; this.render(); }
    }, { icon: "plus", primary: true });
    this.addSmallButton(note, "Open", () => this.openPath(meeting.path), { icon: "file-text" });
  }

  renderProjectDocs(panel, { file, docs }) {
    const toolbar = panel.createDiv({ cls: "life-os-toolbar" });
    const title = this.getFileTitle(file);
    this.addSmallButton(toolbar, "New ADR", () => this.openForm("adr", { project: title }), { icon: "milestone", primary: true });
    this.addSmallButton(toolbar, "New tech note", () => this.openForm("tech-note", { project: title }), { icon: "file-code-2" });
    this.addSmallButton(toolbar, "New postmortem", () => this.openForm("postmortem", { project: title }), { icon: "siren" });
    this.addSmallButton(toolbar, "New release", () => this.openForm("release", { project: title }), { icon: "package" });
    if (!docs.length) { panel.createDiv({ cls: "life-os-live-empty", text: "No decision records, tech notes, or postmortems for this project." }); return; }
    this.renderDocTable(panel, docs);
  }

  renderProjectClips(panel, { file, clips }) {
    if (clips.length) this.renderClipList(panel, clips);
    else panel.createDiv({ cls: "life-os-live-empty", text: "No clippings assigned to this project." });
    const unassigned = this.inboxClips().filter((clip) => !linkTarget(this.getFrontmatter(clip).project));
    if (!unassigned.length) return;
    const assign = panel.createDiv({ cls: "life-os-form-row" });
    assign.createSpan({ cls: "life-os-field-label", text: "Assign from Inbox" });
    this.addSelect(assign, "Assign a clip to this project", [{ value: "", label: "Choose a clip" }, ...unassigned.map((clip) => ({ value: clip.path, label: this.getFileTitle(clip) }))], "", (value) => {
      if (!value) return;
      return this.runWrite(() => this.writer.setFrontmatter(value, { project: wikiLink(this.getFileTitle(file)) }), "Clip assigned.");
    });
  }

  // ---------------------------------------------------------------------------
  // Sprint board

  renderSprintScreen(parent) {
    const sprints = this.data.sprints().sort((a, b) => {
      const rank = (file) => ({ active: 0, planned: 1 })[String(this.getFrontmatter(file).status || "").toLowerCase()] ?? 2;
      return rank(a) - rank(b) || String(this.getFrontmatter(b).start || "").localeCompare(String(this.getFrontmatter(a).start || ""));
    });
    const section = parent.createEl("section", { cls: "life-os-sprint-live" });
    const sprint = sprints.find((file) => file.path === this.activeSprintPath) || sprints[0];
    const toolbar = section.createDiv({ cls: "life-os-toolbar" });
    if (sprints.length) {
      this.addSelect(toolbar, "Sprint", sprints.map((file) => ({ value: file.path, label: `${this.getFileTitle(file)} · ${this.getFrontmatter(file).status || "planned"}` })), sprint.path, (value) => { this.activeSprintPath = value; this.render(); });
    }
    this.addSmallButton(toolbar, "New sprint", () => this.openForm("sprint"), { icon: "plus", primary: !sprints.length });
    if (!sprint) {
      this.renderLiveHeading(section, "Sprint board", "Tasks tagged #sprint/<slug> appear here in three columns.", "No sprints");
      section.createDiv({ cls: "life-os-live-empty", text: "No sprints yet. Create one, then tag tasks with its sprint tag." });
      return;
    }
    const data = this.getFrontmatter(sprint);
    const slug = slugify(this.getFileTitle(sprint));
    const tasks = this.tasksForSprint(sprint);
    const progress = this.projectProgress(tasks);
    const left = daysBetween(this.today(), isoDate(data.end));
    this.renderLiveHeading(section, this.getFileTitle(sprint), `${data.goal ? `Goal: ${data.goal}. ` : ""}${isoDate(data.start) || "?"} to ${isoDate(data.end) || "?"}${left === null ? "" : left >= 0 ? ` · ${left} days left` : ` · ended ${-left} days ago`}. Tag: #sprint/${slug}`, `${progress.done} of ${progress.total} done`);
    this.addMeter(section, progress.ratio, "Sprint progress");
    const status = String(data.status || "planned").toLowerCase();
    const controls = section.createDiv({ cls: "life-os-form-actions" });
    if (status === "planned") this.addSmallButton(controls, "Start sprint", () => this.runWrite(() => this.writer.setFrontmatter(sprint.path, { status: "active" }), "Sprint started."), { icon: "play", primary: true });
    if (status === "active") this.addSmallButton(controls, "Close sprint", () => this.closeSprint(sprint), { icon: "flag" });
    const project = this.data.fileByTitle(linkTarget(data.project), this.data.projects());
    if (project) this.addSmallButton(controls, linkTarget(data.project), () => this.openProject(project.path), { icon: "folder-kanban" });
    this.addSmallButton(controls, "Open note", () => this.openPath(sprint.path), { icon: "file-text" });

    const add = section.createDiv({ cls: "life-os-form-row" });
    const text = add.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: project ? `Add a task to this sprint in ${this.getFileTitle(project)}` : "Add a task to this sprint", "aria-label": "New sprint task" } });
    const submit = async () => {
      const line = buildTaskLine({ text: text.value, project: project ? slugify(this.getFileTitle(project)) : "", sprint: slug, created: this.today() });
      if (!line) return;
      const target = project ? project.path : "08 Tasks/Tasks.md";
      const heading = project ? this.settingsSnapshot().taskHeading || "## Tasks" : "## Inbox";
      const ok = await this.runWrite(() => this.writer.appendUnderHeading(target, heading, line, project ? ["## Tasks", "## Inline tasks"] : []), "Task added to the sprint.");
      if (ok) text.value = "";
    };
    this.addSmallButton(add, "Add", submit, { icon: "plus", primary: true });
    this.registerDomEvent(text, "keydown", (event) => { if (event.key === "Enter") { event.preventDefault?.(); void submit(); } });

    const board = section.createDiv({ cls: "life-os-board" });
    for (const [id, label, items] of [
      ["todo", "To do", tasks.filter((task) => !task.closed && !task.inProgress)],
      ["doing", "In progress", tasks.filter((task) => task.inProgress)],
      ["done", "Done", tasks.filter((task) => task.closed)],
    ]) {
      const column = board.createDiv({ cls: `life-os-board-column is-${id}` });
      const heading = column.createDiv({ cls: "life-os-board-heading" });
      heading.createEl("h3", { text: label });
      this.addChip(heading, String(items.length));
      if (!items.length) column.createDiv({ cls: "life-os-live-empty", text: id === "doing" ? "Start a task to move it here." : "Empty" });
      for (const task of items) {
        const card = column.createDiv({ cls: `life-os-board-card${task.blocked && !task.closed ? " is-blocked" : ""}` });
        const open = card.createEl("button", { cls: "life-os-task-open" });
        open.type = "button";
        open.createEl("strong", { text: task.display });
        open.createSpan({ text: this.getTaskContext(task) });
        this.registerDomEvent(open, "click", () => void this.openPath(task.path, task.line));
        const meta = card.createDiv({ cls: "life-os-task-meta" });
        if (task.blocked && !task.closed) meta.createSpan({ cls: "life-os-task-badge is-blocked", text: "Blocked" });
        if (task.high && !task.closed) meta.createSpan({ cls: "life-os-task-priority", text: "High" });
        const waits = task.closed ? [] : this.openDependencies(task);
        if (waits.length) meta.createSpan({ cls: "life-os-task-badge is-waiting", text: `Waits on ${waits.length}`, attr: { title: waits.map((dep) => dep.display).join("; ") } });
        if (task.owners?.length) meta.createSpan({ cls: "life-os-task-owner", text: `@${task.owners[0]}` });
        this.addSmallButton(meta, "", () => this.openTaskEditor(task), { icon: "pencil", title: `Edit: ${task.display}` });
        const moves = id === "todo" ? [["/", "Start", "play"], ["x", "Done", "check"]] : id === "doing" ? [[" ", "Back", "undo-2"], ["x", "Done", "check"]] : [[" ", "Reopen", "rotate-ccw"]];
        for (const [symbol, text, icon] of moves) {
          this.addSmallButton(meta, text, () => this.runWrite(() => this.writer.setTaskStatus(task, symbol), `${text}: ${task.display}`), { icon, primary: symbol === "x" });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Meetings

  renderMeetingsScreen(parent) {
    const section = parent.createEl("section", { cls: "life-os-meetings-live" });
    const meetings = this.data.meetings().sort((a, b) => String(this.getFrontmatter(b).date || "").localeCompare(String(this.getFrontmatter(a).date || "")));
    const openActions = this.allTasks().filter((task) => !task.closed && task.path.startsWith(`${this.data.folders().meetings}/`));
    this.renderLiveHeading(section, "Meeting minutes", "Write minutes here; decisions and action items stay linked to their project.", `${meetings.length} meetings · ${openActions.length} open actions`);
    const toolbar = section.createDiv({ cls: "life-os-toolbar" });
    this.addSmallButton(toolbar, this.composerOpen ? "Hide composer" : "New meeting minutes", () => { this.composerOpen = !this.composerOpen; this.render(); }, { icon: this.composerOpen ? "x" : "plus", primary: !this.composerOpen });
    if (this.composerOpen) this.renderMeetingComposer(section, { key: "global" });
    if (openActions.length) {
      const box = section.createDiv({ cls: "life-os-panel-card" });
      box.createEl("h3", { text: "Open action items" });
      this.renderTaskList(box, openActions.slice(0, this.itemLimit * 2), { context: true, dueControl: true });
    }
    if (!meetings.length) {
      section.createDiv({ cls: "life-os-live-empty", text: "No meeting notes yet." });
      return;
    }
    const today = this.today();
    for (const [label, items] of [["Upcoming", meetings.filter((file) => isoDate(this.getFrontmatter(file).date) > today).reverse()], ["Today", meetings.filter((file) => isoDate(this.getFrontmatter(file).date) === today)], ["Recent", meetings.filter((file) => { const date = isoDate(this.getFrontmatter(file).date); return !date || date < today; })]]) {
      if (!items.length) continue;
      section.createEl("h3", { cls: "life-os-subheading", text: label });
      const timeline = section.createDiv({ cls: "life-os-timeline" });
      for (const meeting of items.slice(0, label === "Recent" ? this.itemLimit * 2 : undefined)) this.renderMeetingCard(timeline, meeting);
    }
  }

  // ---------------------------------------------------------------------------
  // Docs: decisions, tech notes, postmortems

  renderDocsScreen(parent) {
    const section = parent.createEl("section", { cls: "life-os-docs-live" });
    const docs = this.data.docs();
    const type = this.docType || "all";
    const status = this.docStatus || "all";
    const project = this.docProject || "all";
    this.renderLiveHeading(section, "Decisions and docs", "Architecture decision records, tech notes, and postmortems. Status changes write to the note's properties.", `${docs.length} docs`);
    const toolbar = section.createDiv({ cls: "life-os-toolbar" });
    this.addSelect(toolbar, "Doc type", [{ value: "all", label: "All types" }, { value: "adr", label: "Decisions (ADR)" }, { value: "tech-note", label: "Tech notes" }, { value: "postmortem", label: "Postmortems" }, { value: "release", label: "Releases" }], type, (value) => { this.docType = value; this.render(); });
    const statuses = [...new Set(docs.map((file) => String(this.getFrontmatter(file).status || "draft")))].sort();
    this.addSelect(toolbar, "Doc status", [{ value: "all", label: "All statuses" }, ...statuses], status, (value) => { this.docStatus = value; this.render(); });
    const projects = [...new Set(docs.map((file) => linkTarget(this.getFrontmatter(file).project)).filter(Boolean))].sort();
    this.addSelect(toolbar, "Doc project", [{ value: "all", label: "All projects" }, ...projects], project, (value) => { this.docProject = value; this.render(); });
    this.addSmallButton(toolbar, "New ADR", () => this.openForm("adr"), { icon: "milestone", primary: true });
    this.addSmallButton(toolbar, "Tech note", () => this.openForm("tech-note"), { icon: "file-code-2" });
    this.addSmallButton(toolbar, "Postmortem", () => this.openForm("postmortem"), { icon: "siren" });
    const visible = docs.filter((file) => {
      const data = this.getFrontmatter(file);
      return (type === "all" || data.type === type) && (status === "all" || String(data.status || "draft") === status) && (project === "all" || linkTarget(data.project) === project);
    });
    if (type === "all" || type === "release") this.renderReleases(section);
    if (type === "release") return;
    if (!visible.length) { section.createDiv({ cls: "life-os-live-empty", text: docs.length ? "No docs match these filters." : "No decision records or tech notes yet." }); }
    else this.renderDocTable(section, visible);
    this.addSmallButton(section, "Article board", () => this.openPath("06 Writing/Articles/Article Board.md"), { icon: "newspaper" });
  }

  renderDocTable(parent, docs) {
    const table = parent.createDiv({ cls: "life-os-doc-table", attr: { role: "table" } });
    const header = table.createDiv({ cls: "life-os-doc-row is-header", attr: { role: "row" } });
    for (const label of ["Doc", "Type", "Status", "Project", "Date"]) header.createSpan({ text: label, attr: { role: "columnheader" } });
    const sorted = [...docs].sort((a, b) => {
      const date = (file) => isoDate(this.getFrontmatter(file).date || this.getFrontmatter(file).created || this.getFrontmatter(file).incident_date);
      return date(b).localeCompare(date(a)) || this.getFileTitle(a).localeCompare(this.getFileTitle(b));
    });
    for (const file of sorted) {
      const data = this.getFrontmatter(file);
      const row = table.createDiv({ cls: "life-os-doc-row", attr: { role: "row" } });
      const open = row.createEl("button", { cls: "life-os-doc-title", text: this.getFileTitle(file), attr: { role: "cell" } });
      open.type = "button";
      this.registerDomEvent(open, "click", () => void this.openPath(file.path));
      row.createSpan({ cls: "life-os-chip", text: { adr: "ADR", "tech-note": "Tech note", postmortem: "Postmortem", release: "Release" }[data.type] || String(data.type), attr: { role: "cell" } });
      const statuses = data.type === "adr" ? ADR_STATUSES : data.type === "postmortem" ? ["draft", "in-review", "published"] : data.type === "release" ? ["planned", "released", "cancelled"] : ["draft", "published", "archived"];
      const current = String(data.status || statuses[0]);
      this.addSelect(row, `Status of ${this.getFileTitle(file)}`, statuses.includes(current) ? statuses : [current, ...statuses], current, (value) => this.runWrite(() => this.writer.setFrontmatter(file.path, { status: value }), `Status set to ${value}.`), `life-os-select is-${slugify(current)}`);
      row.createSpan({ text: linkTarget(data.project) || "None", attr: { role: "cell" } });
      row.createSpan({ text: isoDate(data.date || data.created || data.incident_date) || "", attr: { role: "cell" } });
    }
  }

  // ---------------------------------------------------------------------------
  // Inbox: Obsidian Web Clipper triage

  inboxClips() {
    return this.data.clippings().filter((file) => {
      const status = String(this.getFrontmatter(file).status || "inbox").toLowerCase();
      return status === "inbox" || status === "new" || status === "unread";
    }).sort((a, b) => String(this.getFrontmatter(b).clipped || "").localeCompare(String(this.getFrontmatter(a).clipped || "")));
  }

  renderInboxScreen(parent) {
    const section = parent.createEl("section", { cls: "life-os-inbox-live" });
    const clips = this.inboxClips();
    const all = this.data.clippings();
    this.renderLiveHeading(section, "Clipped inbox", `Pages saved by Obsidian Web Clipper into ${this.data.folders().clippings}. Assign each one to a project, keep it as a tech note, or archive it.`, `${clips.length} waiting · ${all.length - clips.length} triaged`);
    if (!clips.length) section.createDiv({ cls: "life-os-live-empty", text: "Inbox zero. New clips with status: inbox appear here." });
    else this.renderClipList(section, clips);
    this.renderClipperSetup(parent);
  }

  renderClipList(parent, clips) {
    const list = parent.createDiv({ cls: "life-os-clip-list" });
    const projects = projectOptions(this.data, { blank: "Assign project" });
    for (const clip of clips) {
      const data = this.getFrontmatter(clip);
      const card = list.createDiv({ cls: "life-os-clip-card" });
      const head = card.createDiv({ cls: "life-os-clip-head" });
      const open = head.createEl("button", { cls: "life-os-doc-title", text: String(data.title || this.getFileTitle(clip)) });
      open.type = "button";
      this.registerDomEvent(open, "click", () => void this.openPath(clip.path));
      const meta = card.createDiv({ cls: "life-os-clip-meta" });
      const site = String(data.site || "").trim() || (String(data.source || "").match(/^https?:\/\/([^/]+)/i)?.[1] ?? "");
      if (site) this.addChip(meta, site);
      if (isoDate(data.clipped)) meta.createSpan({ text: `Clipped ${isoDate(data.clipped)}` });
      this.externalLink(meta, data.source, "Source");
      const tags = (Array.isArray(data.tags) ? data.tags : []).filter((tag) => !["clipping", "example"].includes(String(tag)));
      for (const tag of tags.slice(0, 4)) this.addChip(meta, `#${tag}`);
      const actions = card.createDiv({ cls: "life-os-form-actions" });
      this.addSelect(actions, `Project for ${this.getFileTitle(clip)}`, projects, linkTarget(data.project), (value) => this.runWrite(() => this.writer.setFrontmatter(clip.path, { project: value ? wikiLink(value) : "" }), value ? `Assigned to ${value}.` : "Project cleared."));
      const status = String(data.status || "inbox").toLowerCase();
      if (status === "inbox" || status === "new" || status === "unread") {
        this.addSmallButton(actions, "Read", () => this.runWrite(() => this.writer.setFrontmatter(clip.path, { status: "read" }), "Marked as read."), { icon: "check" });
        this.addSmallButton(actions, "Archive", () => this.runWrite(() => this.writer.setFrontmatter(clip.path, { status: "archived" }), "Archived."), { icon: "archive" });
      }
      this.addSmallButton(actions, "Keep as tech note", () => this.promoteClip(clip), { icon: "file-code-2" });
    }
  }

  async promoteClip(clip) {
    const folder = `${this.data.folders().docs}/Tech Notes`;
    let target = null;
    const ok = await this.runWrite(async () => {
      await this.writer.setFrontmatter(clip.path, { type: "tech-note", status: "draft" });
      target = await this.writer.moveFile(clip.path, folder);
    }, "Saved as a tech note.");
    if (ok && target) void this.openPath(target);
  }

  renderClipperSetup(parent) {
    const section = parent.createEl("section", { cls: "life-os-clipper-setup" });
    const files = (this.app.vault.getFiles?.() || []).filter((file) => file.path.startsWith("Meta/Web Clipper/") && file.path.endsWith(".json"));
    const folder = this.data.folders().clippings;
    this.renderLiveHeading(section, "Web Clipper setup", "Install Obsidian Web Clipper in your browser, then import these templates in its settings (Templates, Import). Each one saves into the clippings folder with status: inbox.", this.app.vault.getAbstractFileByPath(folder) ? "Folder ready" : "Folder missing");
    if (!files.length) {
      section.createDiv({ cls: "life-os-live-empty", text: "No templates found in Meta/Web Clipper/." });
      return;
    }
    const grid = section.createDiv({ cls: "life-os-clipper-grid" });
    for (const file of files) {
      const card = grid.createDiv({ cls: "life-os-panel-card" });
      card.createEl("strong", { text: (file.basename || file.path.split("/").pop()).replace(/\.json$/, "") });
      this.addSmallButton(card, "Copy JSON", async () => {
        try {
          await globalThis.navigator?.clipboard?.writeText(await this.app.vault.read(file));
          new Notice("Template copied. Paste it in Web Clipper settings, Templates, Import.");
        } catch (error) {
          new Notice("Could not copy the template.");
        }
      }, { icon: "copy" });
    }
    this.addSmallButton(section, "Web Clipper guide", () => this.openPath("Guide/24 Web Clipper.md"), { icon: "book-open" });
  }

  // ---------------------------------------------------------------------------
  // Task editor and dependencies

  formHost() {
    // Forms need app, data, and writer; the plugin provides them, the view
    // can stand in when it runs without one (tests, embedded previews).
    return this.plugin?.data && this.plugin?.writer ? this.plugin : { app: this.app, data: this.data, writer: this.writer, settings: this.settingsSnapshot() };
  }

  tasksById() {
    const map = new Map();
    for (const task of this.allTasks()) if (task.id) map.set(task.id, task);
    return map;
  }

  openDependencies(task, byId = this.tasksById()) {
    return (task.dependsOn || []).map((id) => byId.get(id)).filter((dep) => dep && !dep.closed);
  }

  openTaskEditor(task) {
    const byId = this.tasksById();
    const projectSlug = task.projects?.[0] || "";
    const project = projectSlug ? this.data.projects().find((file) => slugify(this.getFileTitle(file)) === projectSlug) : null;
    const sprints = (project ? this.data.forProject(this.data.sprints(), project) : this.data.sprints())
      .filter((file) => String(this.getFrontmatter(file).status || "") !== "closed" || slugify(this.getFileTitle(file)) === task.sprints?.[0]);
    const releases = (project ? this.data.forProject(this.data.releases(), project) : this.data.releases())
      .filter((file) => String(this.getFrontmatter(file).status || "") !== "released" || slugify(this.getFileTitle(file)) === task.releases?.[0]);
    const candidates = this.allTasks()
      .filter((other) => !other.closed && !(other.path === task.path && other.line === task.line))
      .filter((other) => !projectSlug || (other.projects || []).includes(projectSlug) || other.path === task.path)
      .slice(0, 200);
    const current = (task.dependsOn || []).map((id) => byId.get(id)?.display || id);
    const fields = [
      { key: "text", label: "Task", wide: true, required: true, value: task.display || task.text },
      { key: "due", label: "Due", type: "date", value: task.due || "" },
      { key: "scheduled", label: "Scheduled", type: "date", value: task.scheduled || "" },
      { key: "sprint", label: "Sprint", type: "select", value: task.sprints?.[0] || "", options: [{ value: "", label: "Backlog" }, ...sprints.map((file) => ({ value: slugify(this.getFileTitle(file)), label: this.getFileTitle(file) }))] },
      { key: "owner", label: "Owner", type: "select", value: task.owners?.[0] || "", options: personOptions(this.data, "Me") },
      { key: "release", label: "Release", type: "select", value: task.releases?.[0] || "", options: [{ value: "", label: "None" }, ...releases.map((file) => ({ value: slugify(this.getFileTitle(file)), label: this.getFileTitle(file) }))] },
      { key: "high", label: "High priority", type: "checkbox", value: Boolean(task.high) },
      { key: "blocked", label: "Blocked", type: "checkbox", value: Boolean(task.blocked) },
      { key: "waitsOn", label: "Waits on", type: "select", wide: true, value: "", hint: current.length ? `Currently waits on: ${current.join("; ")}` : "Pick a task this one cannot start before.", options: [{ value: "", label: "No new dependency" }, ...candidates.map((other) => ({ value: `${other.path}::${other.line}`, label: `${other.display}${other.path !== task.path ? ` (${this.getFileTitle({ path: other.path })})` : ""}` }))] },
    ];
    if (current.length) fields.push({ key: "clearDeps", label: "Remove current dependencies", type: "checkbox", value: false });
    const modal = new LifeOSFormModal(this.app, {
      title: "Edit task",
      description: `${this.getFileTitle({ path: task.path })}, line ${task.line}. Other tags, recurrence, and dates stay as they are.`,
      fields,
      submitLabel: "Save",
      onSubmit: async (values) => {
        const target = values.waitsOn ? candidates.find((other) => `${other.path}::${other.line}` === values.waitsOn) : null;
        let dependsOn = values.clearDeps ? [] : [...(task.dependsOn || [])];
        if (target) {
          let id = target.id;
          if (!id) {
            id = newTaskId(new Set(byId.keys()));
            await this.writer.editTask(target, { id });
          }
          dependsOn = [...dependsOn, id];
        }
        const patch = {
          text: values.text, due: values.due, scheduled: values.scheduled, sprint: values.sprint,
          owner: values.owner, release: values.release, high: values.high, blocked: values.blocked,
        };
        if (target || values.clearDeps) patch.dependsOn = dependsOn;
        // A dependency write may have shifted nothing, but re-read when the
        // target sits in the same file so the stale check uses fresh text.
        if (target && target.path === task.path) {
          await this.refreshLiveData();
          const fresh = this.allTasks().find((item) => item.path === task.path && item.line === task.line);
          if (fresh) task = fresh;
        }
        await this.writer.editTask(task, patch);
        new Notice("Task saved.");
        await this.refreshLiveData();
        return true;
      },
    });
    modal.open();
    return modal;
  }

  // ---------------------------------------------------------------------------
  // Sprint close with carry-over

  closeSprint(sprint) {
    const data = this.getFrontmatter(sprint);
    const open = this.tasksForSprint(sprint).filter((task) => !task.closed);
    if (!open.length) return this.runWrite(() => this.writer.setFrontmatter(sprint.path, { status: "closed" }), "Sprint closed.");
    const project = linkTarget(data.project);
    const siblings = (project ? this.data.sprints().filter((file) => linkTarget(this.getFrontmatter(file).project) === project) : this.data.sprints())
      .filter((file) => file.path !== sprint.path && ["planned", "active"].includes(String(this.getFrontmatter(file).status || "planned")));
    const numbers = this.data.sprints().filter((file) => linkTarget(this.getFrontmatter(file).project) === project).map((file) => Number(this.getFrontmatter(file).number) || 0);
    const nextNumber = Math.max(Number(data.number) || 0, ...numbers) + 1;
    const length = Math.max(1, daysBetween(isoDate(data.start), isoDate(data.end)) ?? 13);
    const nextStart = isoDate(data.end) ? isoAddDays(isoDate(data.end), 1) : this.today();
    const nextTitle = safeFileName(`${project || "Team"} Sprint ${nextNumber}`);
    const modal = new LifeOSFormModal(this.app, {
      title: `Close ${this.getFileTitle(sprint)}`,
      description: `${open.length} open ${open.length === 1 ? "task is" : "tasks are"} still tagged #sprint/${slugify(this.getFileTitle(sprint))}. Choose where they go; done tasks keep their tag as history.`,
      fields: [
        { key: "target", label: "Move open tasks to", type: "select", wide: true, value: siblings[0] ? siblings[0].path : "__new__", options: [
          ...siblings.map((file) => ({ value: file.path, label: `${this.getFileTitle(file)} (${this.getFrontmatter(file).status || "planned"})` })),
          { value: "__new__", label: `New sprint: ${nextTitle} (${nextStart} to ${isoAddDays(nextStart, length)})` },
          { value: "__backlog__", label: "Backlog (remove the sprint tag)" },
          { value: "__keep__", label: "Leave them tagged to this sprint" },
        ] },
        { key: "goal", label: "Goal for a new sprint", wide: true, value: "" },
        { key: "activate", label: "Make the target sprint active", type: "checkbox", value: true },
      ],
      submitLabel: "Close sprint",
      onSubmit: async (values) => {
        let targetSlug = null;
        let targetPath = null;
        if (values.target === "__new__") {
          const file = await this.writer.createNote(this.data.folders().sprints, nextTitle, buildSprintNote({
            title: nextTitle, project, number: nextNumber, start: nextStart, end: isoAddDays(nextStart, length),
            goal: values.goal, status: values.activate ? "active" : "planned",
          }));
          targetSlug = slugify(nextTitle);
          targetPath = file?.path || `${this.data.folders().sprints}/${nextTitle}.md`;
        } else if (values.target === "__backlog__") {
          targetSlug = "";
        } else if (values.target !== "__keep__") {
          targetPath = values.target;
          targetSlug = slugify(this.getFileTitle({ path: values.target }));
        }
        let moved = { written: 0, stale: 0 };
        if (targetSlug !== null) moved = await this.writer.updateTaskLines(open, (line) => editTaskLine(line, { sprint: targetSlug }));
        await this.writer.setFrontmatter(sprint.path, { status: "closed" });
        if (targetPath && values.activate) {
          if (values.target !== "__new__") await this.writer.setFrontmatter(targetPath, { status: "active" });
          const projectFile = project ? this.data.fileByTitle(project, this.data.projects()) : null;
          if (projectFile) await this.writer.setFrontmatter(projectFile.path, { current_sprint: wikiLink(this.getFileTitle({ path: targetPath })) });
          this.activeSprintPath = targetPath;
        }
        new Notice(`Sprint closed. ${moved.written} moved${moved.stale ? `, ${moved.stale} skipped because they changed` : ""}.`);
        await this.refreshLiveData();
        return true;
      },
    });
    modal.open();
    return modal;
  }

  // ---------------------------------------------------------------------------
  // Waiting on: delegated work, dependencies, blockers

  mySlug() {
    return slugify(this.settingsSnapshot().me || "");
  }

  renderWaitingScreen(parent) {
    const section = parent.createEl("section", { cls: "life-os-waiting-live" });
    const open = this.allTasks().filter((task) => !task.closed);
    const me = this.mySlug();
    const byId = this.tasksById();
    const delegated = open.filter((task) => (task.owners || []).some((owner) => owner !== me));
    const waitingOnDeps = open.filter((task) => this.openDependencies(task, byId).length);
    const blocked = open.filter((task) => task.blocked);
    this.renderLiveHeading(section, "Waiting on", `Work owned by someone else (#p/<person>${me ? `, excluding you, #p/${me}` : ""}), tasks waiting on other tasks (⛔), and #blocked items. Ages count from the ➕ created date.`, `${delegated.length} delegated · ${waitingOnDeps.length} dependent · ${blocked.length} blocked`);
    if (!this.taskSnapshot) { section.createDiv({ cls: "life-os-live-empty", text: "Loading tasks..." }); return; }
    if (!me) section.createEl("p", { cls: "life-os-form-hint", text: "Tip: set Your person note in Settings, Dev OS, so tasks tagged with you are not listed as delegated." });

    section.createEl("h3", { cls: "life-os-subheading", text: "Delegated, by person" });
    if (!delegated.length) section.createDiv({ cls: "life-os-live-empty", text: "Nothing delegated. Give a task an owner from the task editor or the project page." });
    const people = new Map(this.data.people().map((file) => [slugify(this.getFileTitle(file)), file]));
    const groups = new Map();
    for (const task of delegated) {
      for (const owner of task.owners.filter((item) => item !== me)) {
        if (!groups.has(owner)) groups.set(owner, []);
        groups.get(owner).push(task);
      }
    }
    const age = (task) => (task.createdDate ? daysBetween(task.createdDate, this.today()) : null);
    const grid = section.createDiv({ cls: "life-os-waiting-grid" });
    for (const [owner, tasks] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const person = people.get(owner);
      const name = person ? this.getFileTitle(person) : owner;
      const oldest = Math.max(...tasks.map((task) => age(task) ?? 0));
      const card = grid.createDiv({ cls: "life-os-panel-card life-os-waiting-person" });
      const head = card.createDiv({ cls: "life-os-home-card-heading" });
      setIcon(head.createSpan({ cls: "life-os-record-icon" }), "user");
      head.createEl("h3", { text: name });
      this.addChip(head, `${tasks.length} open${oldest ? ` · oldest ${oldest}d` : ""}`, tasks.some((task) => task.overdue) ? "is-alert" : "");
      for (const task of tasks.sort((a, b) => (age(b) ?? 0) - (age(a) ?? 0))) {
        const row = this.renderTaskRow(card, task, { context: true });
        const days = age(task);
        if (days !== null) row.createSpan({ cls: "life-os-task-age", text: `${days}d` });
      }
      const actions = card.createDiv({ cls: "life-os-form-actions" });
      this.addSmallButton(actions, "Copy follow-up", async () => {
        try {
          await globalThis.navigator?.clipboard?.writeText(buildFollowUpText(name.split(" ")[0], tasks));
          new Notice("Follow-up copied.");
        } catch (error) {
          new Notice("Clipboard unavailable.");
        }
      }, { icon: "copy" });
      if (person) this.addSmallButton(actions, "Open person", () => this.openPath(person.path), { icon: "file-text" });
    }

    section.createEl("h3", { cls: "life-os-subheading", text: "Waiting on other tasks" });
    if (!waitingOnDeps.length) section.createDiv({ cls: "life-os-live-empty", text: "No task waits on an open task. Add a dependency from the task editor (Waits on)." });
    for (const task of waitingOnDeps) {
      const box = section.createDiv({ cls: "life-os-dependency" });
      this.renderTaskRow(box, task, { context: true });
      const chain = box.createDiv({ cls: "life-os-dependency-chain" });
      chain.createSpan({ cls: "life-os-field-label", text: "Waits on" });
      for (const dep of this.openDependencies(task, byId)) {
        const button = chain.createEl("button", { cls: "life-os-link-row", text: `${dep.display}${dep.owners?.length ? ` · #p/${dep.owners[0]}` : ""}${dep.due ? ` · due ${dep.due}` : ""}` });
        button.type = "button";
        this.registerDomEvent(button, "click", () => void this.openPath(dep.path, dep.line));
      }
    }

    section.createEl("h3", { cls: "life-os-subheading", text: "Blocked" });
    if (!blocked.length) section.createDiv({ cls: "life-os-live-empty", text: "Nothing is tagged #blocked." });
    else this.renderTaskList(section, blocked, { context: true });
  }

  // ---------------------------------------------------------------------------
  // Roadmap

  roadmapWindow() {
    const months = this.roadmapMonths || 6;
    const today = new Date(`${this.today()}T12:00:00Z`);
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + (this.roadmapOffset || 0) - (months >= 6 ? 1 : 0), 1, 12));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1, 12));
    const iso = (date) => date.toISOString().slice(0, 10);
    return { start: iso(start), end: iso(end), months, span: daysBetween(iso(start), iso(end)) };
  }

  roadmapPercent(window, date) {
    return Math.max(0, Math.min(100, (daysBetween(window.start, date) / window.span) * 100));
  }

  renderRoadmapScreen(parent) {
    const section = parent.createEl("section", { cls: "life-os-roadmap-live" });
    const window = this.roadmapWindow();
    const includeDone = Boolean(this.roadmapDone);
    const projects = this.data.projects().filter((file) => includeDone || !["done", "archived", "cancelled"].includes(String(this.getFrontmatter(file).status || "").toLowerCase()));
    const scheduled = [];
    const unscheduled = [];
    for (const file of projects) {
      const data = this.getFrontmatter(file);
      const start = isoDate(data.started || data.start);
      const due = isoDate(data.due);
      (start || due ? scheduled : unscheduled).push({ file, data, start: start || due, end: due || start });
    }
    scheduled.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    this.renderLiveHeading(section, "Roadmap", "Projects from started to due, sprints under them, milestones (◆) and releases (▲). Click a bar to open the project page; dates change there.", `${window.start} to ${isoAddDays(window.end, -1)}`);
    const toolbar = section.createDiv({ cls: "life-os-toolbar" });
    this.addSmallButton(toolbar, "", () => { this.roadmapOffset = (this.roadmapOffset || 0) - Math.max(1, Math.floor(window.months / 2)); this.render(); }, { icon: "chevron-left", title: "Earlier" });
    this.addSmallButton(toolbar, "Today", () => { this.roadmapOffset = 0; this.render(); }, { icon: "calendar" });
    this.addSmallButton(toolbar, "", () => { this.roadmapOffset = (this.roadmapOffset || 0) + Math.max(1, Math.floor(window.months / 2)); this.render(); }, { icon: "chevron-right", title: "Later" });
    for (const months of [3, 6, 12]) {
      const button = toolbar.createEl("button", { cls: "life-os-filter", text: `${months} months`, attr: { "aria-pressed": String(window.months === months) } });
      button.type = "button";
      this.registerDomEvent(button, "click", () => { this.roadmapMonths = months; this.render(); });
    }
    const done = toolbar.createEl("button", { cls: "life-os-filter", text: includeDone ? "Hide done" : "Show done", attr: { "aria-pressed": String(includeDone) } });
    done.type = "button";
    this.registerDomEvent(done, "click", () => { this.roadmapDone = !includeDone; this.render(); });

    const chart = section.createDiv({ cls: "life-os-roadmap", attr: { role: "img", "aria-label": `Roadmap of ${scheduled.length} scheduled projects` } });
    const scale = chart.createDiv({ cls: "life-os-roadmap-row is-scale" });
    scale.createDiv({ cls: "life-os-roadmap-label" });
    const scaleTrack = scale.createDiv({ cls: "life-os-roadmap-track" });
    for (let index = 0; index < window.months; index += 1) {
      const startDate = new Date(`${window.start}T12:00:00Z`);
      const month = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1, 12));
      const iso = month.toISOString().slice(0, 10);
      scaleTrack.createSpan({ cls: "life-os-roadmap-month", text: month.toLocaleDateString(undefined, { month: "short", year: window.months > 6 || month.getUTCMonth() === 0 ? "2-digit" : undefined, timeZone: "UTC" }), attr: { style: `left:${this.roadmapPercent(window, iso)}%` } });
    }
    const today = this.today();
    const showToday = today >= window.start && today < window.end;
    const sprints = this.data.sprints();
    const releases = this.data.releases();
    if (!scheduled.length) chart.createDiv({ cls: "life-os-live-empty", text: "No project has a started or due date yet." });
    for (const item of scheduled) {
      const row = chart.createDiv({ cls: "life-os-roadmap-row" });
      const label = row.createEl("button", { cls: "life-os-roadmap-label", text: this.getFileTitle(item.file), attr: { title: `${item.start} to ${item.end}` } });
      label.type = "button";
      this.registerDomEvent(label, "click", () => this.openProject(item.file.path));
      const track = row.createDiv({ cls: "life-os-roadmap-track" });
      if (showToday) track.createDiv({ cls: "life-os-roadmap-today", attr: { style: `left:${this.roadmapPercent(window, today)}%` } });
      const visible = item.end >= window.start && item.start < window.end;
      if (visible) {
        const left = this.roadmapPercent(window, item.start);
        const right = this.roadmapPercent(window, isoAddDays(item.end, 1));
        const status = slugify(item.data.status || "active");
        const late = item.end < today && !["done", "archived"].includes(status);
        const progress = this.projectProgress(this.tasksForProject(item.file));
        const bar = track.createEl("button", { cls: `life-os-roadmap-bar is-${status}${late ? " is-late" : ""}`, attr: { style: `left:${left}%;width:${Math.max(0.8, right - left)}%`, title: `${this.getFileTitle(item.file)}: ${item.start} to ${item.end}, ${Math.round(progress.ratio * 100)}% of tasks done${late ? ", past due" : ""}` } });
        bar.type = "button";
        bar.createDiv({ cls: "life-os-roadmap-progress", attr: { style: `width:${Math.round(progress.ratio * 100)}%` } });
        bar.createSpan({ text: `${Math.round(progress.ratio * 100)}%` });
        this.registerDomEvent(bar, "click", () => this.openProject(item.file.path));
      } else {
        track.createSpan({ cls: "life-os-roadmap-outside", text: item.end < window.start ? `Ended ${item.end}` : `Starts ${item.start}` });
      }
      for (const sprint of this.data.forProject(sprints, item.file)) {
        const data = this.getFrontmatter(sprint);
        const start = isoDate(data.start);
        const end = isoDate(data.end) || start;
        if (!start || end < window.start || start >= window.end) continue;
        const left = this.roadmapPercent(window, start);
        const right = this.roadmapPercent(window, isoAddDays(end, 1));
        track.createDiv({ cls: `life-os-roadmap-sprint is-${slugify(data.status || "planned")}`, attr: { style: `left:${left}%;width:${Math.max(0.5, right - left)}%`, title: `${this.getFileTitle(sprint)}: ${start} to ${end}` } });
      }
      for (const milestone of parseMilestones(item.data.milestones)) {
        if (milestone.date < window.start || milestone.date >= window.end) continue;
        track.createSpan({ cls: `life-os-roadmap-marker is-milestone${milestone.date < today ? " is-past" : ""}`, text: "◆", attr: { style: `left:${this.roadmapPercent(window, milestone.date)}%`, title: `${milestone.date} ${milestone.name}` } });
      }
      for (const release of this.data.forProject(releases, item.file)) {
        const data = this.getFrontmatter(release);
        const date = isoDate(data.date);
        if (!date || date < window.start || date >= window.end) continue;
        const marker = track.createEl("button", { cls: `life-os-roadmap-marker is-release is-${slugify(data.status || "planned")}`, text: "▲", attr: { style: `left:${this.roadmapPercent(window, date)}%`, title: `${date} ${this.getFileTitle(release)} (${data.status || "planned"})` } });
        marker.type = "button";
        this.registerDomEvent(marker, "click", () => { this.go("docs", { docType: "release", expandedRelease: release.path }); });
      }
    }
    const legend = section.createDiv({ cls: "life-os-roadmap-legend" });
    for (const [cls, text] of [["is-active", "Active"], ["is-idea", "Idea"], ["is-on-hold", "On hold"], ["is-late", "Past due"]]) {
      const item = legend.createSpan();
      item.createSpan({ cls: `life-os-roadmap-swatch ${cls}` });
      item.createSpan({ text });
    }
    legend.createSpan({ text: "◆ milestone · ▲ release · thin bars: sprints" });
    if (unscheduled.length) {
      section.createEl("h3", { cls: "life-os-subheading", text: "Not on the roadmap yet" });
      const list = section.createDiv({ cls: "life-os-form-actions" });
      for (const item of unscheduled) this.addSmallButton(list, this.getFileTitle(item.file), () => this.openProject(item.file.path), { icon: "calendar-plus", title: `Set dates for ${this.getFileTitle(item.file)}` });
    }
  }

  renderMilestones(parent, file, data) {
    const card = parent.createEl("section", { cls: "life-os-panel-card" });
    card.createEl("h3", { text: "Milestones" });
    const milestones = parseMilestones(data.milestones);
    if (!milestones.length) card.createEl("p", { text: "No milestones. They show as ◆ on the roadmap." });
    for (const milestone of milestones) {
      const row = card.createDiv({ cls: "life-os-decision-row" });
      row.createSpan({ text: `${milestone.date} · ${milestone.name}` });
      this.addSmallButton(row, "", () => this.runWrite(() => this.writer.setFrontmatter(file.path, {
        milestones: milestones.filter((item) => item !== milestone).map((item) => item.raw),
      }), "Milestone removed."), { icon: "x", title: `Remove ${milestone.name}` });
    }
    const form = card.createDiv({ cls: "life-os-form-row" });
    const date = form.createEl("input", { cls: "life-os-input", attr: { type: "date", "aria-label": "Milestone date" } });
    const name = form.createEl("input", { cls: "life-os-input is-grow", attr: { type: "text", placeholder: "Beta to customers", "aria-label": "Milestone name" } });
    this.addSmallButton(form, "Add", () => {
      if (!isoDate(date.value) || !name.value.trim()) { new Notice("A milestone needs a date and a name."); return; }
      return this.runWrite(() => this.writer.setFrontmatter(file.path, {
        milestones: [...milestones.map((item) => item.raw), `${date.value} ${name.value.trim()}`],
      }), "Milestone added.");
    }, { icon: "plus", primary: true });
  }

  // ---------------------------------------------------------------------------
  // Releases

  releaseModel(file) {
    const data = this.getFrontmatter(file);
    const slug = slugify(this.getFileTitle(file));
    const tasks = this.allTasks().filter((task) => (task.releases || []).includes(slug));
    const date = isoDate(data.date);
    const project = this.data.fileByTitle(linkTarget(data.project), this.data.projects());
    const earlier = this.data.releases()
      .filter((other) => other.path !== file.path && linkTarget(this.getFrontmatter(other).project) === linkTarget(data.project))
      .map((other) => isoDate(this.getFrontmatter(other).date))
      .filter((other) => other && (!date || other < date))
      .sort();
    const since = earlier[earlier.length - 1] || "";
    const decisions = project
      ? this.data.forProject(this.data.docs(), project)
        .filter((doc) => this.getFrontmatter(doc).type === "adr" && String(this.getFrontmatter(doc).status || "") === "accepted")
        .filter((doc) => { const adrDate = isoDate(this.getFrontmatter(doc).date); return adrDate && adrDate > since && (!date || adrDate <= date); })
        .map((doc) => this.getFileTitle(doc))
      : [];
    const done = tasks.filter((task) => task.closed);
    const open = tasks.filter((task) => !task.closed);
    const version = String(data.version || this.getFileTitle(file));
    return { data, slug, tasks, done, open, decisions, version, date, project, notes: buildReleaseNotes({ version, date, done, open, decisions }) };
  }

  renderReleases(parent) {
    const releases = this.data.releases().sort((a, b) => (isoDate(this.getFrontmatter(b).date) || "9999").localeCompare(isoDate(this.getFrontmatter(a).date) || "9999"));
    const section = parent.createEl("section", { cls: "life-os-releases" });
    const head = section.createDiv({ cls: "life-os-live-heading" });
    const copy = head.createDiv();
    copy.createEl("h2", { text: "Releases" });
    copy.createEl("p", { text: "Tag tasks #release/<release-note-slug>. Notes group done tasks by #fix, #change, #security, #remove (else Added) and add accepted ADRs since the previous release." });
    this.addSmallButton(head, "New release", () => this.openForm("release"), { icon: "package", primary: true });
    if (!releases.length) { section.createDiv({ cls: "life-os-live-empty", text: "No release notes yet." }); return; }
    for (const file of releases) {
      const model = this.releaseModel(file);
      const expanded = this.expandedRelease === file.path;
      const card = section.createDiv({ cls: `life-os-release-card${expanded ? " is-open" : ""}` });
      const header = card.createEl("button", { cls: "life-os-meeting-head", attr: { "aria-expanded": String(expanded) } });
      header.type = "button";
      header.createSpan({ cls: "life-os-meeting-date", text: model.date || "No date" });
      header.createEl("strong", { text: this.getFileTitle(file) });
      header.createSpan({ cls: `life-os-chip is-${slugify(model.data.status || "planned")}`, text: String(model.data.status || "planned") });
      header.createSpan({ cls: "life-os-record-metrics", text: `${model.done.length} of ${model.tasks.length} done` });
      this.registerDomEvent(header, "click", () => { this.expandedRelease = expanded ? null : file.path; this.render(); });
      if (!expanded) continue;
      const body = card.createDiv({ cls: "life-os-meeting-body" });
      this.addMeter(body, model.tasks.length ? model.done.length / model.tasks.length : 0, `${this.getFileTitle(file)} progress`);
      body.createEl("pre", { cls: "life-os-release-preview", text: model.notes });
      const actions = body.createDiv({ cls: "life-os-form-actions" });
      this.addSmallButton(actions, "Copy", async () => {
        try {
          await globalThis.navigator?.clipboard?.writeText(model.notes);
          new Notice("Release notes copied.");
        } catch (error) {
          new Notice("Clipboard unavailable.");
        }
      }, { icon: "copy" });
      this.addSmallButton(actions, "Write to note", () => this.runWrite(() => this.writer.replaceSection(file.path, "## Release notes", buildReleaseNotes({ ...model, level: 3 })), "Release notes written."), { icon: "file-pen-line" });
      if (String(model.data.status || "planned") !== "released") {
        this.addSmallButton(actions, "Mark released", () => this.runWrite(() => this.writer.setFrontmatter(file.path, { status: "released", date: model.date || this.today() }), "Release marked as released."), { icon: "rocket", primary: true });
      }
      this.addSmallButton(actions, "Open note", () => this.openPath(file.path), { icon: "file-text" });
      if (model.open.length) {
        body.createEl("h4", { text: "Still open" });
        this.renderTaskList(body, model.open, { context: true });
      }
    }
  }

  pluginLoaded(id) {
    return Boolean(this.app.plugins?.getPlugin?.(id));
  }

  pluginSettings(id) {
    return this.app.plugins?.getPlugin?.(id)?.settings || {};
  }
}

// Original Canvas renderer inspired by SEO OS's brain-shaped knowledge map.
// Positions are decorative; every displayed edge comes from resolved vault links.
class LifeOSBrainRenderer extends Component {
  constructor(app, contentEl, compact = false) {
    super();
    this.app = app;
    this.contentEl = contentEl;
    this.compact = compact;
    this.panX = 0;
    this.panY = 0;
    this.yaw = 0.28;
    this.pitch = -0.12;
    this.labelMode = compact ? "off" : "auto";
    this.zoom = 1;
    this.query = "";
    this.region = "all";
    this.selected = null;
    this.hovered = null;
    this.nodes = [];
    this.edges = [];
    this.projected = [];
    this.regions = [
      { id: "direction", name: "Direction & projects", color: "#ff906b" },
      { id: "memory", name: "Journal & reflection", color: "#c095e8" },
      { id: "people", name: "People", color: "#e5b96a" },
      { id: "knowledge", name: "Knowledge & ideas", color: "#6fbdd8" },
      { id: "practice", name: "Tasks & systems", color: "#82c3a5" },
    ];
  }
  getViewType() { return "life-os-brain"; }
  getDisplayText() { return "Life OS Brain"; }
  getIcon() { return "brain"; }
  async onOpen() {
    const root = this.contentEl;
    root.empty(); root.addClass("life-os-brain");
    const header = root.createDiv({ cls: "life-os-brain-header" });
    const title = header.createDiv();
    title.createEl("h2", { text: "Your connected brain" });
    this.summary = title.createEl("p", { text: "Reading vault links…", attr: { "aria-live": "polite" } });
    const controls = header.createDiv({ cls: "life-os-brain-controls" });
    const search = controls.createEl("input", { attr: { type: "search", placeholder: "Find a note…", "aria-label": "Search brain notes" } });
    this.registerDomEvent(search, "input", () => { this.query = search.value.toLowerCase(); this.update(); });
    const reset = controls.createEl("button", { text: "Reset view" });
    this.registerDomEvent(reset, "click", () => { this.panX = 0; this.panY = 0; this.yaw = 0.28; this.pitch = -0.12; this.zoom = 1; this.clearHover(); });
    const labels = controls.createEl("select", { attr: { "aria-label": "Note labels" } });
    for (const [value, text] of [["auto", "Labels: Auto"], ["all", "Labels: All"], ["off", "Labels: Hover only"]]) labels.createEl("option", { text, attr: { value } });
    this.registerDomEvent(labels, "change", () => { this.labelMode = labels.value; this.draw(); });
    const standard = controls.createEl("button", { text: "Standard graph" });
    this.registerDomEvent(standard, "click", () => {
      if (!this.app.commands.executeCommandById("graph:open")) new Notice("Enable Obsidian's Graph view core plugin first.");
    });
    this.filters = root.createDiv({ cls: "life-os-brain-filters", attr: { "aria-label": "Brain regions" } });
    for (const region of [{ id: "all", name: "All regions", color: "#c4cecc" }, ...this.regions]) {
      const button = this.filters.createEl("button", { text: region.name, attr: { "aria-pressed": String(region.id === this.region), style: `--region-color:${region.color}` } });
      this.registerDomEvent(button, "click", () => {
        this.region = region.id;
        [...this.filters.children].forEach((child) => child.setAttribute("aria-pressed", String(child === button)));
        this.update();
      });
    }
    const body = root.createDiv({ cls: "life-os-brain-body" });
    this.stage = body.createDiv({ cls: "life-os-brain-stage" });
    this.canvas = this.stage.createEl("canvas", { attr: { tabindex: "0", "aria-label": "3D brain graph. Drag to rotate, Shift-drag to pan, scroll to zoom. Arrow keys rotate. Browse notes in the adjacent list." } });
    this.caption = this.stage.createDiv({ cls: "life-os-brain-caption", text: "Drag to rotate · Shift-drag to pan · Scroll to zoom" });
    this.tooltip = this.stage.createDiv({ cls: "life-os-brain-tooltip", attr: { role: "tooltip" } });
    this.tooltip.hidden = true;
    this.panel = body.createEl("aside", { cls: "life-os-brain-panel", attr: { "aria-label": "Notes and connections" } });
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) this.caption.setText("Canvas is unavailable. Browse and open notes in the list.");
    let drag = null;
    this.registerDomEvent(this.canvas, "pointerdown", (event) => {
      this.clearHover();
      drag = { x: event.clientX, y: event.clientY, distance: 0 };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.registerDomEvent(this.canvas, "pointermove", (event) => {
      if (!drag) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const hit = this.hitTest(x, y);
        const changed = this.hovered !== (hit?.node.path || null);
        this.hovered = hit?.node.path || null;
        this.tooltip.empty();
        this.tooltip.hidden = !hit;
        if (hit) {
          this.tooltip.createEl("strong", { text: hit.node.title });
          this.tooltip.createDiv({ text: hit.node.path });
          this.tooltip.createDiv({ text: `${this.regions.find((r) => r.id === hit.node.region).name} · ${hit.node.degree} connections${hit.node.sample ? " · Sample note" : ""}` });
          this.tooltip.createDiv({ text: "Click to explore linked notes" });
          this.tooltip.style.left = `${Math.max(8, Math.min(x + 16, rect.width - this.tooltip.offsetWidth - 8))}px`;
          this.tooltip.style.top = `${Math.max(8, Math.min(y + 16, rect.height - this.tooltip.offsetHeight - 8))}px`;
        }
        this.canvas.style.cursor = hit ? "pointer" : "grab";
        if (changed) this.draw();
        return;
      }
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      drag.distance += Math.abs(dx) + Math.abs(dy);
      if (event.shiftKey) { this.panX += dx; this.panY += dy; }
      else { this.yaw += dx * 0.007; this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch + dy * 0.007)); }
      drag.x = event.clientX; drag.y = event.clientY;
      this.draw();
    });
    this.registerDomEvent(this.canvas, "pointerup", (event) => {
      if (drag && drag.distance < 6) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const hit = this.hitTest(x, y);
        this.selected = hit?.node.path || null;
        this.update();
      }
      drag = null;
    });
    this.registerDomEvent(this.canvas, "pointercancel", () => { drag = null; });
    this.registerDomEvent(this.canvas, "pointerleave", () => this.clearHover());
    this.registerDomEvent(this.canvas, "wheel", (event) => {
      event.preventDefault();
      this.clearHover();
      this.zoom = Math.max(0.55, Math.min(2.5, this.zoom * Math.exp(-event.deltaY * 0.001)));
      this.draw();
    }, { passive: false });
    this.registerDomEvent(this.canvas, "keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Escape"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") this.yaw -= 0.1;
      if (event.key === "ArrowRight") this.yaw += 0.1;
      if (event.key === "ArrowUp") this.pitch = Math.max(-1.4, this.pitch - 0.1);
      if (event.key === "ArrowDown") this.pitch = Math.min(1.4, this.pitch + 0.1);
      if (["+", "="].includes(event.key)) this.zoom = Math.min(2.5, this.zoom + 0.1);
      if (event.key === "-") this.zoom = Math.max(0.55, this.zoom - 0.1);
      if (event.key === "Escape") this.selected = null;
      this.update();
    });
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.stage);
    const refresh = () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.refresh(), 150);
    };
    this.registerEvent(this.app.metadataCache.on("resolved", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("create", refresh));
    this.refresh();
    if (this.compact) {
      this.canvas.setAttribute("tabindex", "-1");
      this.canvas.setAttribute("aria-label", "Preview of connected notes. Use Explore Brain for interactive navigation.");
    }
  }
  regionFor(path) {
    if (/^(03 Planning|04 Projects)\//.test(path)) return "direction";
    if (/^(01 Journal|02 Retreats)\//.test(path)) return "memory";
    if (path.startsWith("05 People/")) return "people";
    if (/^(06 Writing|07 Library|09 Reading|wiki|inbox)\//.test(path)) return "knowledge";
    return "practice";
  }
  clearHover() {
    this.hovered = null;
    if (this.tooltip) this.tooltip.hidden = true;
    this.draw();
  }
  hitTest(x, y) {
    const connected = new Set(this.selected ? this.edges.filter(([a, b]) => a === this.selected || b === this.selected).flat() : []);
    return [...this.projected].reverse().filter((p) => this.selected ? p.node.path === this.selected || connected.has(p.node.path) : this.matches(p.node))
      .map((p) => ({ ...p, distance: Math.hypot(p.x - x, p.y - y) }))
      .filter((p) => p.distance < 10).sort((a, b) => a.distance - b.distance || b.depth - a.depth)[0];
  }
  // Low-resolution 3D volume derived from the original folded brain contour.
  // Cached independently of graph hover so labels never rebuild the surface.
  buildBrainGeometry() {
    if (this.brainGeometry) return this.brainGeometry;
    const sample = (d, count, closed = false) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      const length = path.getTotalLength();
      return Array.from({ length: count }, (_, i) => {
        const p = path.getPointAtLength(length * i / (closed ? count : count - 1));
        return [p.x / 180, -p.y / 180];
      });
    };
    const contour = sample("M -8 -151 C -8 -177 -43 -183 -59 -162 C -82 -180 -113 -159 -113 -140 C -140 -143 -159 -122 -155 -99 C -183 -92 -190 -62 -176 -43 C -199 -21 -188 12 -174 22 C -191 46 -176 73 -155 76 C -160 102 -136 123 -115 118 C -103 147 -74 153 -55 137 C -34 155 -8 135 -8 113 Z", 80, true);
    const grooves = ["M -59 -162 C -43 -145 -69 -130 -56 -112 C -46 -98 -22 -115 -8 -99","M -113 -140 C -92 -145 -77 -129 -85 -109 C -96 -89 -118 -111 -126 -91 C -132 -76 -117 -60 -98 -68","M -155 -99 C -137 -93 -151 -63 -135 -48 C -119 -34 -99 -49 -86 -31 C -75 -15 -90 2 -111 -3","M -176 -43 C -159 -50 -141 -28 -150 -10 C -161 7 -151 25 -132 27 C -109 28 -112 51 -93 55","M -174 22 C -160 31 -175 57 -155 76 C -141 87 -125 67 -112 80 C -99 94 -116 106 -115 118","M -8 -61 C -28 -78 -53 -67 -49 -48 C -44 -28 -65 -21 -62 -3 C -59 15 -32 13 -24 31 C -15 46 -31 65 -8 76","M -55 -112 C -77 -97 -61 -77 -73 -63","M -132 27 C -126 6 -142 -8 -128 -24","M -93 55 C -68 40 -53 61 -61 80 C -69 101 -91 99 -83 119 C -78 133 -63 125 -55 137","M -8 113 C -26 100 -27 79 -45 83"].map((d) => sample(d, 28));
    const faces = [], lines = [];
    for (const side of [1, -1]) {
      const rings = [];
      for (let r = 0; r <= 12; r++) {
        const angle = -Math.PI / 2 + r / 12 * Math.PI;
        rings.push(contour.map(([x, y]) => [
          side * (-0.50 + (x + 0.50) * Math.cos(angle)),
          0.03 + (y - 0.03) * Math.cos(angle),
          Math.sin(angle) * 1.05,
        ]));
      }
      for (let r = 0; r < 12; r++) for (let i = 0; i < contour.length; i++) {
        const next = (i+1) % contour.length;
        faces.push([rings[r][i], rings[r][next], rings[r+1][next], rings[r+1][i]]);
      }
      lines.push({ points: [...rings[6], rings[6][0]], alpha: 0.28 });
      for (const zside of [-1, 1]) for (const groove of grooves) {
        lines.push({ points: groove.map(([x, y]) => {
          const angle = Math.atan2(y-0.03, x+0.5);
          const distance = Math.hypot(x+0.5,y-0.03);
          const boundary = contour.reduce((best,p) => {
            const delta = Math.atan2(p[1]-0.03,p[0]+0.5)-angle;
            const error = Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
            return error < best.error ? { error, radius: Math.hypot(p[0]+0.5,p[1]-0.03) } : best;
          }, { error: Infinity, radius: 1 });
          const ratio = Math.min(1, distance / boundary.radius);
          return [x*side,y,zside*1.05*Math.sqrt(1-ratio*ratio)];
        }), alpha: zside === 1 ? 0.23 : 0.09 });
      }
    }
    // Rounded stem, also a volume, not a flat overlay.
    for (let i = 0; i < 16; i++) {
      const a = i/16*Math.PI*2, b = (i+1)/16*Math.PI*2;
      faces.push([[Math.cos(a)*0.10,-0.72,Math.sin(a)*0.10-0.25],
        [Math.cos(b)*0.10,-0.72,Math.sin(b)*0.10-0.25],
        [Math.cos(b)*0.07,-1.12,Math.sin(b)*0.07-0.15],
        [Math.cos(a)*0.07,-1.12,Math.sin(a)*0.07-0.15]]);
    }
    return this.brainGeometry = { faces, lines };
  }
  drawSurface(ctx, width, height) {
    const key = [width,height,this.yaw,this.pitch,this.panX,this.panY,this.zoom,window.devicePixelRatio].join(":");
    if (key !== this.surfaceKey) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = this.surfaceCanvas || (this.surfaceCanvas = document.createElement("canvas"));
      canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr);
      const layer = canvas.getContext("2d");
      layer.setTransform(dpr,0,0,dpr,0,0);
      const geometry = this.buildBrainGeometry();
      const faces = geometry.faces.map((face) => face.map((p) => this.project(p,width,height)));
      faces.sort((a,b) => a.reduce((s,p)=>s+p.depth,0)-b.reduce((s,p)=>s+p.depth,0));
      layer.fillStyle = "rgba(240,160,135,0.055)";
      for (const face of faces) {
        layer.beginPath(); face.forEach((p,i)=> i ? layer.lineTo(p.x,p.y) : layer.moveTo(p.x,p.y));
        layer.closePath(); layer.fill();
      }
      layer.lineWidth = 1.1; layer.lineJoin = "round"; layer.lineCap = "round";
      for (const line of geometry.lines) {
        layer.beginPath();
        line.points.forEach((v,i) => { const p=this.project(v,width,height); if(i) layer.lineTo(p.x,p.y); else layer.moveTo(p.x,p.y); });
        layer.strokeStyle = `rgba(240,160,145,${line.alpha})`; layer.stroke();
      }
      this.surfaceKey = key;
    }
    ctx.drawImage(this.surfaceCanvas, 0, 0, width, height);
  }
  pointFor(path, region) {
    let hash = 0;
    for (const char of path) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
    const random = () => { hash = (Math.imul(hash, 1664525) + 1013904223) | 0; return (hash >>> 0) / 4294967296; };
    const side = random() < 0.5 ? -1 : 1;
    const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.72;
    let y = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
    if (region === "direction") z = 0.35 + random() * 0.45;
    if (region === "memory") y = 0.2 + random() * 0.55;
    if (region === "people") { y = -0.3 - random() * 0.35; z *= 0.65; }
    if (region === "knowledge") z = -0.3 - random() * 0.5;
    let x = (random() * 2 - 1) * 0.82;
    y = (y - 0.08) / 0.82; z /= 1.12;
    const radius3 = Math.hypot(x, y, z);
    if (radius3 > 0.85) { const factor = 0.85 / radius3; x *= factor; y *= factor; z *= factor; }
    return [side * 0.46 + x * 0.45, 0.08 + y * 0.82, z * 1.12];
  }
  refresh() {
    const all = this.app.vault.getMarkdownFiles().filter((file) =>
      !/^(build|Templates|scripts|Guide|Meta)\//i.test(file.path) && !file.path.startsWith("."));
    const files = all.sort((a, b) => a.path.localeCompare(b.path)).slice(0, this.compact ? 300 : 2000);
    this.total = all.length;
    this.nodes = files.map((file) => {
      const region = this.regionFor(file.path);
      const data = this.app.metadataCache.getFileCache(file)?.frontmatter || {};
      const tags = Array.isArray(data.tags) ? data.tags : String(data.tags || "").split(/[ ,]+/);
      return { path: file.path, title: file.basename || file.path.split("/").pop().replace(/\.md$/, ""), region,
        sample: data.example === true || tags.some((tag) => String(tag).replace(/^#/, "") === "example"),
        point: this.pointFor(file.path, region), degree: 0 };
    });
    const lookup = new Map(this.nodes.map((node) => [node.path, node]));
    const seen = new Set(); this.edges = [];
    for (const [source, targets] of Object.entries(this.app.metadataCache.resolvedLinks || {})) {
      if (!lookup.has(source)) continue;
      for (const target of Object.keys(targets)) {
        if (!lookup.has(target) || source === target) continue;
        const key = JSON.stringify([source, target].sort());
        if (seen.has(key)) continue;
        seen.add(key); this.edges.push([source, target]);
        lookup.get(source).degree++; lookup.get(target).degree++;
      }
    }
    if (!lookup.has(this.selected)) this.selected = null;
    this.update();
  }
  matches(node) { return (this.region === "all" || node.region === this.region) && node.path.toLowerCase().includes(this.query); }
  async openNote(node) {
    const file = this.app.vault.getAbstractFileByPath(node.path);
    if (!(file instanceof TFile)) { new Notice("This note is no longer available."); return; }
    const leaf = this.app.workspace.getLeaf("tab"); await leaf.openFile(file); await this.app.workspace.revealLeaf(leaf);
  }
  update() {
    if (!this.panel) return;
    this.hovered = null;
    if (this.tooltip) this.tooltip.hidden = true;
    const visible = this.nodes.filter((node) => this.matches(node));
    const paths = new Set(visible.map((node) => node.path));
    const edgeCount = this.edges.filter(([a, b]) => paths.has(a) && paths.has(b)).length;
    this.summary.setText(`${visible.length} notes · ${edgeCount} links · ${visible.filter((node) => node.sample).length} sample notes${this.total > this.nodes.length ? ` · showing ${this.nodes.length} of ${this.total}` : ""}`);
    if (this.compact) { this.draw(); return; }
    this.panel.empty();
    const selected = this.nodes.find((node) => node.path === this.selected);
    if (selected) {
      this.panel.createEl("h3", { text: selected.title });
      this.panel.createEl("p", { text: `${selected.path}${selected.sample ? " · Sample note" : ""}` });
      const open = this.panel.createEl("button", { text: "Open note", cls: "life-os-brain-open" });
      open.addEventListener("click", () => void this.openNote(selected));
    }
    const connected = new Set(this.edges.flatMap(([a, b]) => a === this.selected ? [b] : b === this.selected ? [a] : []));
    const list = selected ? this.nodes.filter((node) => connected.has(node.path)) : visible;
    this.panel.createEl("h3", { text: selected ? `Connected notes (${list.length})` : `Browse notes (${visible.length})` });
    if (!list.length) this.panel.createEl("p", { text: selected ? "No linked notes yet. Add a wikilink in this note to connect it." : "No matching notes." });
    for (const node of [...list].sort((a, b) => b.degree - a.degree || a.path.localeCompare(b.path)).slice(0, 60)) {
      const button = this.panel.createEl("button", { cls: "life-os-brain-note", attr: { title: node.path } });
      button.createSpan({ text: node.title });
      button.createEl("small", { text: `${node.degree} links${node.sample ? " · Sample" : ""}` });
      button.addEventListener("click", () => { this.selected = node.path; this.update(); });
    }
    if (list.length > 60) this.panel.createEl("p", { text: "Showing the 60 most connected notes. Search to narrow the list." });
    if (selected) {
      const clear = this.panel.createEl("button", { text: "Clear selection" });
      clear.addEventListener("click", () => { this.selected = null; this.update(); });
    }
    this.draw();
  }
  project(point, width, height) {
    const [x, y, z] = point;
    const rx = x * Math.cos(this.yaw) + z * Math.sin(this.yaw);
    const rz = z * Math.cos(this.yaw) - x * Math.sin(this.yaw);
    const ry = y * Math.cos(this.pitch) - rz * Math.sin(this.pitch);
    const depth = y * Math.sin(this.pitch) + rz * Math.cos(this.pitch);
    const scale = Math.min(width, height) * 0.31 * this.zoom * 4.5 / (4.5 - depth);
    return { x: width / 2 + this.panX + rx * scale, y: height / 2 + this.panY - ry * scale, depth, scale };
  }
  draw() {
    const ctx = this.ctx;
    if (!ctx || !this.stage) return;
    const width = this.stage.clientWidth, height = this.stage.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    if (!this.compact) {
      const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width, height) * 0.6);
      glow.addColorStop(0, "#173135"); glow.addColorStop(1, "#0c1118"); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    }
    this.drawSurface(ctx, width, height);
    this.projected = this.nodes.map((node) => ({ ...this.project(node.point, width, height), node })).sort((a, b) => a.depth - b.depth);
    const lookup = new Map(this.projected.map((point) => [point.node.path, point]));
    const focus = this.hovered || this.selected;
    const edges = focus ? this.edges.filter(([a, b]) => a === focus || b === focus) : this.edges;
    const connected = new Set(focus ? edges.flat() : []);
    for (const [a, b] of edges.slice(0, 10000)) {
      const source = lookup.get(a), target = lookup.get(b);
      if (!this.selected && (!this.matches(source.node) || !this.matches(target.node))) continue;
      ctx.beginPath(); ctx.moveTo(source.x, source.y); ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = focus ? "rgba(255,203,159,0.9)" : "rgba(156,193,204,0.15)";
      ctx.lineWidth = focus ? 1.5 : 0.6; ctx.stroke();
    }
    for (const point of this.projected) {
      const active = (focus ? connected.has(point.node.path) || point.node.path === focus : true) && (this.selected || this.matches(point.node)), selected = point.node.path === focus;
      const color = this.regions.find((region) => region.id === point.node.region).color;
      const radius = selected ? 7 : 2.5 + Math.min(3, Math.sqrt(point.node.degree) * 0.5);
      ctx.globalAlpha = active ? Math.max(0.45, 0.7 + point.depth * 0.2) : 0.05;
      ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.drawLabels(ctx, width, height, focus, connected);
    this.caption.setText(edges.length > 10000 ? "10,000 links drawn. Select a note to isolate its connections." : "Drag to rotate · Shift-drag to pan · Scroll to zoom · Hover or click a note");
  }
  drawLabels(ctx, width, height, focus, connected) {
    const occupied = [];
    this.visibleLabels = [];
    const candidates = this.projected.filter((p) => (this.selected || this.matches(p.node)) && (!focus || p.node.path === focus || connected.has(p.node.path)))
      .sort((a,b) => Number(b.node.path === focus)-Number(a.node.path === focus) || b.node.degree-a.node.degree || b.depth-a.depth);
    ctx.font = "12px sans-serif";
    for (const p of candidates) {
      if (this.labelMode === "off" && p.node.path !== focus) continue;
      const title = p.node.title.length > 36 ? p.node.title.slice(0,35)+"…" : p.node.title;
      const w = ctx.measureText(title).width + 8;
      const box = { x: p.x+9, y: p.y-17, w, h: 18 };
      if (box.x < 0 || box.y < 0 || box.x+w > width || box.y+18 > height-35) continue;
      if (this.labelMode === "auto" && occupied.some((r) => box.x < r.x+r.w && box.x+w > r.x && box.y < r.y+r.h && box.y+18 > r.y)) continue;
      occupied.push(box); this.visibleLabels.push(p.node.path);
      ctx.fillStyle = "rgba(12,17,24,0.78)"; ctx.fillRect(box.x,box.y,w,18);
      ctx.fillStyle = p.node.path === focus ? "#fff1e4" : "#bac9d0";
      ctx.fillText(title,box.x+4,box.y+13);
    }
  }
  async onClose() {
    clearTimeout(this.timer); this.observer?.disconnect(); this.contentEl.empty(); this.ctx = null; this.panel = null; this.surfaceCanvas = null; this.brainGeometry = null;
  }
  onload() { void this.onOpen(); }
  onunload() { void this.onClose(); }
}

// Retain compatibility with already-open standalone Brain tabs.
class LifeOSBrainView extends ItemView {
  async onOpen() {
    this.renderer = new LifeOSBrainRenderer(this.app, this.contentEl);
    this.addChild(this.renderer);
  }
  getViewType() { return "life-os-brain"; }
  getDisplayText() { return "Life OS Brain"; }
  getIcon() { return "brain"; }
  async onClose() { if (this.renderer) this.removeChild(this.renderer); this.renderer = null; }
}

class LifeOSSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Dev OS" });
    containerEl.createEl("p", { text: "Preferences for the Dev OS view. Folders and daily questions live in Meta/Dev OS Config.md." });
    const settings = this.plugin.settings;
    const save = async () => {
      await this.plugin.saveSettings();
      this.plugin.refreshViews();
    };
    new Setting(containerEl)
      .setName("Show personal modules")
      .setDesc("Adds Plan and Review (journal, daily questions, habits, retreats) to the rail and Today.")
      .addToggle((toggle) => toggle.setValue(Boolean(settings.showPersonal)).onChange(async (value) => { settings.showPersonal = value; await save(); }));
    new Setting(containerEl)
      .setName("Show sample data")
      .setDesc("Includes notes tagged example in lists, boards, and counts.")
      .addToggle((toggle) => toggle.setValue(Boolean(settings.includeSamples)).onChange(async (value) => { settings.includeSamples = value; await save(); }));
    new Setting(containerEl)
      .setName("Default project")
      .setDesc("Preselected in Quick add and Capture. Use the project note's title.")
      .addText((text) => text.setPlaceholder("Billing API").setValue(settings.defaultProject || "").onChange(async (value) => { settings.defaultProject = value.trim(); await save(); }));
    new Setting(containerEl)
      .setName("Your person note")
      .setDesc("Title of your own note in 05 People. Tasks tagged with you count as yours, not as delegated, on the Waiting screen.")
      .addText((text) => text.setPlaceholder("Jane Doe").setValue(settings.me || "").onChange(async (value) => { settings.me = value.trim(); await save(); }));
    new Setting(containerEl)
      .setName("Project task heading")
      .setDesc("Tasks added from a project page go under this heading. Missing headings are created at the end of the note.")
      .addText((text) => text.setPlaceholder("## Tasks").setValue(settings.taskHeading || "## Tasks").onChange(async (value) => {
        const heading = value.trim();
        settings.taskHeading = /^#{1,6} \S/.test(heading) ? heading : "## Tasks";
        await save();
      }));
    new Setting(containerEl)
      .setName("Discard meeting drafts")
      .setDesc(`${Object.keys(settings.meetingDrafts || {}).length} unsaved meeting minutes drafts are kept in plugin data.`)
      .addButton((button) => button.setButtonText("Discard").onClick(async () => { settings.meetingDrafts = {}; await save(); this.display(); }));
  }
}

module.exports = class LifeOSPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.writer = new LifeOSWriter(this.app);
    this.data = new LifeOSData(this.app, () => ({ ...DEFAULT_SETTINGS, ...this.settings }));
    this.registerView("life-os-brain", (leaf) => new LifeOSBrainView(leaf));
    this.registerView(
      VIEW_TYPE,
      (leaf) => new LifeOSHomeView(leaf, this)
    );
    if (typeof this.addSettingTab === "function") this.addSettingTab(new LifeOSSettingTab(this.app, this));

    this.addRibbonIcon("compass", "Open Dev OS", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-home",
      name: "Open Dev OS home",
      callback: () => this.activateView("home"),
    });

    this.addCommand({
      id: "open-capture",
      name: "Open Dev OS capture",
      callback: () => this.openCapture(),
    });

    this.addCommand({
      id: "open-configuration",
      name: "Open Dev OS configuration",
      callback: () => this.app.workspace.openLinkText((configFile(this.app)?.path || CONFIG_PATHS[0]).replace(/\.md$/, ""), "", true),
    });

    for (const item of NAV_ITEMS.filter((item) => item.id !== "home")) {
      this.addCommand({
        id: `open-${item.id}`,
        name: `Open Dev OS ${item.label}`,
        callback: () => this.activateView(item.id),
      });
    }

    for (const action of CREATE_ACTIONS) {
      this.addCommand({
        id: `new-${action.kind}`,
        name: `New ${action.label.toLowerCase()}`,
        callback: () => openCreateForm(this, action.kind, {}, (file) => this.afterCreate(file)),
      });
    }

    this.app.workspace.onLayoutReady(() => {
      void this.activateView();
    });
  }

  async loadSettings() {
    const stored = typeof this.loadData === "function" ? await this.loadData() : null;
    this.settings = { ...DEFAULT_SETTINGS, projectTabs: {}, meetingDrafts: {}, ...(stored || {}) };
  }

  async saveSettings() {
    if (typeof this.saveData === "function") await this.saveData(this.settings);
  }

  homeViews() {
    return this.app.workspace.getLeavesOfType(VIEW_TYPE)
      .map((leaf) => leaf.view)
      .filter((view) => view instanceof LifeOSHomeView);
  }

  refreshViews() {
    for (const view of this.homeViews()) {
      view.includeExamples = Boolean(this.settings.includeSamples);
      void view.refreshLiveData();
    }
  }

  async afterCreate(file) {
    for (const view of this.homeViews()) await view.refreshLiveData();
    if (file instanceof TFile && String(this.data.frontmatter(file).type) === "project") {
      await this.activateView("project", { activeProjectPath: file.path });
    }
  }

  // Adds one task line to the inbox or a project note. Returns true on success.
  async addTask({ text, projectPath = "", due = "", high = false }, view = null) {
    const project = projectPath ? this.app.vault.getAbstractFileByPath(projectPath) : null;
    const slug = project instanceof TFile ? slugify(project.basename || this.data.title(project)) : "";
    const line = buildTaskLine({ text, project: slug, due, high, created: moment().format("YYYY-MM-DD") });
    if (!line) {
      new Notice("Write the task first.");
      return false;
    }
    try {
      if (project instanceof TFile) {
        const heading = this.settings?.taskHeading || "## Tasks";
        await this.writer.appendUnderHeading(project.path, heading, line, ["## Tasks", "## Inline tasks"]);
      } else {
        await this.writer.appendUnderHeading("08 Tasks/Tasks.md", "## Inbox", line);
      }
      new Notice(project instanceof TFile ? `Task added to ${this.data.title(project)}.` : "Task added to the inbox.");
    } catch (error) {
      new Notice(error?.message || "Dev OS could not add the task.");
      return false;
    }
    const views = view ? [view] : this.homeViews();
    for (const item of views) {
      item.forceRender = true;
      try { await item.refreshLiveData(); } finally { item.forceRender = false; }
    }
    return true;
  }

  async activateView(screen = "home", state = {}) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];

    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE,
        active: true,
      });
    }

    if (leaf.view instanceof LifeOSHomeView) {
      Object.assign(leaf.view, state);
      leaf.view.activeScreen = screen;
      leaf.view.render();
    }

    await this.app.workspace.revealLeaf(leaf);
  }

  openCapture() {
    new LifeOSCaptureModal(this.app, this).open();
  }

  runCommand(commandId, label) {
    const ran = this.app.commands.executeCommandById(commandId);

    if (!ran) {
      new Notice(
        `${label} is unavailable. Check that its supporting plugin is enabled.`
      );
    }

    return ran;
  }

  onunload() {
    this.app.workspace.detachLeavesOfType("life-os-brain");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
};
