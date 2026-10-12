#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || ".");
const pluginDir = path.join(root, ".obsidian/plugins/life-os-app");
const mainPath = path.join(pluginDir, "main.js");
const cssPath = path.join(pluginDir, "styles.css");
const manifestPath = path.join(pluginDir, "manifest.json");
const communityPath = path.join(root, ".obsidian/community-plugins.json");
const quickAddPath = path.join(root, ".obsidian/plugins/quickadd/data.json");
const noticesPath = path.join(root, "THIRD_PARTY_NOTICES.md");
const setupViewPath = path.join(root, "Meta/views/setup.js");
const hotkeysPath = path.join(root, ".obsidian/hotkeys.json");

const results = [];
const check = (name, condition, detail = "") => {
  results.push({ name, ok: Boolean(condition), detail });
};
const read = (file) => fs.readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(read(file));

for (const file of [mainPath, cssPath, manifestPath, communityPath, quickAddPath, noticesPath, setupViewPath, hotkeysPath]) {
  check(`present: ${path.relative(root, file)}`, fs.existsSync(file));
}

if (results.some((result) => !result.ok)) {
  finish();
}

const source = read(mainPath);
const css = read(cssPath);
const manifest = readJson(manifestPath);
const community = readJson(communityPath);
const quickAdd = readJson(quickAddPath);
const notices = read(noticesPath);
const setupView = read(setupViewPath);
const hotkeys = readJson(hotkeysPath);

check("manifest id", manifest.id === "life-os-app", String(manifest.id));
check("manifest is mobile-capable", manifest.isDesktopOnly === false);
check("plugin enabled", community.includes("life-os-app"));
check(
  "notice version matches manifest",
  notices.includes(`| life-os-app | ${manifest.version} |`),
  manifest.version
);
check(
  "Setup verifies the Dev OS application",
  setupView.includes('["life-os-app", "Dev OS"]') &&
    setupView.includes('findCommand("life-os-app:open-home")')
);
check(
  "canonical Projects folder restored",
  fs.existsSync(path.join(root, "04 Projects/Projects Board.md")) &&
    !fs.existsSync(path.join(root, "05 People/04 Projects/Projects Board.md"))
);
check(
  "primary Life OS hotkeys configured",
  Array.isArray(hotkeys["life-os-app:open-home"]) &&
    Array.isArray(hotkeys["life-os-app:open-capture"])
);

try {
  new vm.Script(source, { filename: mainPath });
  check("JavaScript parses", true);
} catch (error) {
  check("JavaScript parses", false, error.message);
}

const configuredCommands = new Set(
  (quickAdd.choices || []).map((choice) => `quickadd:choice:${choice.id}`)
);
const referencedCommands = new Set(
  [...source.matchAll(/quickadd:choice:[a-z0-9-]+/g)].map((match) => match[0])
);
const missingCommands = [...referencedCommands].filter(
  (command) => !configuredCommands.has(command)
);
const quickAddById = new Map(
  (quickAdd.choices || []).map((choice) => [choice.id, choice])
);
const recordChoiceContracts = [
  ["lifeos-new-project", "Templates/Project.md", "04 Projects"],
  ["lifeos-new-person", "Templates/Person.md", "05 People"],
  ["lifeos-new-sprint", "Templates/Sprint.md", "04 Projects/Sprints"],
  ["lifeos-new-meeting", "Templates/Meeting.md", "10 Meetings"],
  ["lifeos-new-adr", "Templates/ADR.md", "06 Writing/Decisions"],
  ["lifeos-new-tech-note", "Templates/Tech Note.md", "06 Writing/Tech Notes"],
  ["lifeos-new-postmortem", "Templates/Postmortem.md", "06 Writing/Postmortems"],
  ["lifeos-new-release", "Templates/Release.md", "06 Writing/Releases"],
  ["lifeos-new-article", "Templates/Article.md", "06 Writing/Articles"],
  ["lifeos-new-book", "Templates/Book Note.md", "07 Library/Book Notes"],
  ["lifeos-new-study-note", "Templates/Study Note.md", "09 Reading/Study Notes"],
];
const invalidRecordChoices = recordChoiceContracts.filter(
  ([id, templatePath, folder]) => {
    const choice = quickAddById.get(id);
    return !(
      choice?.type === "Template" &&
      choice.command === true &&
      choice.templatePath === templatePath &&
      choice.folder?.folders?.includes(folder) &&
      choice.fileNameFormat?.format?.includes("{{VALUE:") &&
      choice.fileExistsMode === "Nothing"
    );
  }
);
check(
  "record creation input contracts",
  invalidRecordChoices.length === 0,
  invalidRecordChoices.map(([id]) => id).join(", ")
);
check(
  "QuickAdd commands resolve",
  missingCommands.length === 0,
  missingCommands.join(", ")
);

const referencedPaths = new Set(
  [...source.matchAll(/(?:path:\s*|openPath\()"([^"]+\.md)"/g)].map(
    (match) => match[1]
  )
);
const missingPaths = [...referencedPaths].filter(
  (file) => !fs.existsSync(path.join(root, file))
);
check("dashboard paths resolve", missingPaths.length === 0, missingPaths.join(", "));

const classNames = new Set(
  [...source.matchAll(/life-os-[a-z0-9-]+/g)].map((match) => match[0])
);
const missingStyles = [...classNames].filter(
  (className) => !css.includes(`.${className}`)
);
check("application classes are styled", missingStyles.length === 0, missingStyles.join(", "));

const prohibitedCapabilities = [
  "fetch",
  "requestUrl",
  "XMLHttpRequest",
  "WebSocket",
  "child_process",
  "vault.modify",
  "vault.delete",
  "vault.trash",
  "adapter.write",
  "adapter.remove",
];
const capabilityHits = prohibitedCapabilities.filter((term) => source.includes(term));
check(
  "no network, process, delete, or raw adapter capability",
  capabilityHits.length === 0,
  capabilityHits.join(", ")
);
// Writes are allowed only inside the LifeOSWriter class, so every change to a
// note goes through one reviewed, line-checked path.
const writerStart = source.indexOf("class LifeOSWriter {");
const writerEnd = source.indexOf("\nclass ", writerStart + 1);
const writerBlock = writerStart === -1 ? "" : source.slice(writerStart, writerEnd);
const outsideWriter = writerStart === -1 ? source : source.slice(0, writerStart) + source.slice(writerEnd);
const writeApis = ["vault.create", "vault.process", "vault.append", "processFrontMatter", "renameFile", "trashFile", "createFolder"];
const leakedWrites = writeApis.filter((term) => outsideWriter.includes(term));
check("vault writes live only in LifeOSWriter", writerBlock && leakedWrites.length === 0, leakedWrites.join(", "));
check("writer guards task lines against stale content", writerBlock.includes("lines[index] !== task.raw"));
check("writer never overwrites an existing note", writerBlock.includes("already exists. Nothing was overwritten.") && writerBlock.includes("already exists. Nothing was renamed."));
check("deletes go to the trash through the file manager", writerBlock.includes("fileManager.trashFile") && !source.includes("vault.delete") && !source.includes("vault.trash("));

class FakeElement {
  constructor(tag = "div", options = {}) {
    this.tag = tag;
    this.options = options;
    this.children = [];
    this.handlers = {};
  }

  empty() {
    this.children = [];
  }

  addClass(name) { this.options.cls = `${this.options.cls || ""} ${name}`.trim(); }
  setAttribute(name, value) { this.options.attr = { ...this.options.attr, [name]: value }; }

  toHTML() {
    const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const attrs = { ...this.options.attr, ...(this.options.cls ? { class: this.options.cls } : {}) };
    return `<${this.tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${escape(value)}"`).join(" ")}>${escape(this.options.text || "")}${this.children.map((child) => child.toHTML()).join("")}</${this.tag}>`;
  }

  createDiv(options = {}) {
    return this.createEl("div", options);
  }

  createSpan(options = {}) {
    return this.createEl("span", options);
  }

  createEl(tag, options = {}) {
    const child = new FakeElement(tag, options);
    this.children.push(child);
    return child;
  }

  addEventListener(name, handler) {
    this.handlers[name] = handler;
  }
}

class Component {
  // Child rendering is exercised in the real-browser fixture, not this DOM stub.
  addChild(child) { (this.children ||= new Set()).add(child); }
  removeChild(child) { this.children?.delete(child); }
  registerDomEvent(element, name, handler) {
    element.addEventListener(name, handler);
  }

  registerEvent(event) {
    return event;
  }
}

class ItemView extends Component {
  constructor(leaf) {
    super();
    this.leaf = leaf;
    this.app = leaf.app;
    this.contentEl = new FakeElement();
  }
}

class Modal extends Component {
  constructor(app) {
    super();
    this.app = app;
    this.contentEl = new FakeElement();
    Modal.lastOpened = this;
  }

  open() {
    this.onOpen();
  }

  close() {
    this.onClose();
  }
}

class Plugin extends Component {
  async loadData() { return Plugin.stored ?? null; }
  async saveData(data) { Plugin.saved = JSON.parse(JSON.stringify(data)); }
  addSettingTab(tab) { this.settingTab = tab; }
  registerView(type, factory) {
    this.views = this.views || new Map();
    this.views.set(type, factory);
    this.viewType = type;
    this.viewFactory = factory;
  }

  addRibbonIcon(icon, name, callback) {
    this.ribbon = { icon, name, callback };
  }

  addCommand(command) {
    this.commands = this.commands || [];
    this.commands.push(command);
  }
}

class TFile {
  constructor(filePath = "") {
    this.path = filePath;
    this.name = filePath.split("/").pop();
    this.basename = this.name.replace(/\.md$/, "");
  }
}

class Notice {
  constructor(message) { Notice.messages.push(message); }
}
Notice.messages = [];

class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = new FakeElement(); }
}

class Setting {
  constructor(container) { this.container = container; }
  setName() { return this; }
  setDesc() { return this; }
  addToggle(callback) { callback({ setValue() { return this; }, onChange() { return this; } }); return this; }
  addText(callback) { callback({ setPlaceholder() { return this; }, setValue() { return this; }, onChange() { return this; } }); return this; }
  addButton(callback) { callback({ setButtonText() { return this; }, onClick() { return this; } }); return this; }
}

try {
  const moduleBox = { exports: {} };
  const sandbox = vm.createContext({});
  vm.runInContext(
    source,
    Object.assign(sandbox, {
      module: moduleBox,
      exports: moduleBox.exports,
      require(id) {
        if (id !== "obsidian") {
          throw new Error(`Unexpected dependency: ${id}`);
        }
        return {
          ItemView,
          Component,
          Modal,
          Notice,
          Plugin,
          PluginSettingTab,
          Setting,
          TFile,
          moment: () => {
            const date = new Date("2026-09-09T12:00:00Z");
            const api = {
              clone: () => {
                const cloned = new Date(date.getTime());
                return {
                  subtract(amount, unit) {
                    if (unit === "days") {
                      cloned.setUTCDate(cloned.getUTCDate() - amount);
                    }
                    return this;
                  },
                  format(format) {
                    if (format === "YYYY-MM-DD") {
                      return cloned.toISOString().slice(0, 10);
                    }
                    if (format === "ddd") {
                      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][cloned.getUTCDay()];
                    }
                    return "2026-09-09";
                  },
                };
              },
              format(format) {
                const values = {
                  "YYYY-MM-DD": "2026-09-09",
                  "gggg-[W]ww": "2026-W37",
                  "YYYY-[Q]Q": "2026-Q3",
                  "[Week] ww": "Week 37",
                  "D MMM": "9 Sep",
                };
                return values[format] || "2026-09-09";
              },
            };
            return api;
          },
          setIcon: () => {},
        };
      },
    }),
    { filename: mainPath }
  );

  const fakeFiles = [
    new TFile("04 Projects/Example.md"),
    new TFile("04 Projects/Metadata Pending.md"),
    new TFile("05 People/Person.md"),
    new TFile("06 Writing/Articles/Article.md"),
    new TFile("06 Writing/Articles/Sample.md"),
    new TFile("07 Library/Task Example.md"),
    new TFile("08 Tasks/Tasks.md"),
    new TFile("08 Tasks/Archive.md"),
  ];
  const metadata = new Map([
    ["04 Projects/Example.md", { type: "project", status: "active" }],
    ["05 People/Person.md", { type: "person" }],
    ["06 Writing/Articles/Article.md", { type: "article" }],
    ["06 Writing/Articles/Sample.md", { type: "article", tags: ["example"] }],
    ["07 Library/Task Example.md", { type: "book" }],
    [
      "Meta/Dev OS Config.md",
      {
        questions: [{ key: "dq_goals", text: "Did I set clear goals?" }],
        habits: ["habit_journal"],
      },
    ],
    ["01 Journal/Daily/2026-09-09.md", { dq_goals: 8, habit_journal: true }],
    ["00 Dashboards/Setup.md", { status: "open" }],
  ]);
  const taskItem = (task, line) => ({
    task,
    position: { start: { line } },
  });
  const listItems = new Map([
    [
      "04 Projects/Example.md",
      [
        taskItem(" ", 0),
        taskItem("x", 4),
        taskItem("/", 5),
        taskItem("?", 6),
        taskItem("-", 7),
      ],
    ],
    ["05 People/Person.md", [taskItem(" ", 0)]],
    ["06 Writing/Articles/Article.md", [taskItem(" ", 0)]],
    ["06 Writing/Articles/Sample.md", [taskItem(" ", 0)]],
    ["07 Library/Task Example.md", [taskItem(" ", 0)]],
    ["08 Tasks/Tasks.md", [taskItem(" ", 0)]],
    ["08 Tasks/Archive.md", [taskItem(" ", 0)]],
  ]);
  const fileContents = new Map([
    [
      "04 Projects/Example.md",
      [
        "- [ ] Ship the Life OS slice 📅 2026-09-09 ⏫",
        "```tasks",
        "- [ ] Fenced sample must stay out",
        "```",
        "- [x] Finished task ✅ 2026-09-08",
        "- [/] Continue the data pass ⏳ 2026-09-09",
        "- [?] Unknown custom status",
        "- [-] Cancelled task ❌ 2026-09-08",
      ].join("\n"),
    ],
    ["05 People/Person.md", "- [ ] Discuss a decision #discuss"],
    ["06 Writing/Articles/Article.md", "- [ ] Draft the article 🔺"],
    ["06 Writing/Articles/Sample.md", "- [ ] Demonstration task"],
    ["07 Library/Task Example.md", "- [ ] Out-of-scope library task"],
    ["08 Tasks/Tasks.md", "- [ ] Triage the inbox ➕ 2026-09-08"],
    ["08 Tasks/Archive.md", "- [ ] Out-of-scope task archive"],
  ]);
  const metadataUnavailable = new Set(["04 Projects/Metadata Pending.md"]);
  const pluginInstances = new Map([
    ["agent-client", { settings: { defaultAgentId: "synthetic-agent", autoAllowPermissions: false } }],
    ["obsidian-local-rest-api", { settings: {} }],
  ]);
  const requestedPaths = [];
  const writes = [];
  const absentPaths = new Set();
  const fakeLeaf = {
    app: null,
    async setViewState(state) {
      this.state = state;
    },
    async openFile(file) { this.openedFile = file; },
  };
  const fakeApp = {
    commands: { executeCommandById: () => true },
    plugins: { getPlugin: (id) => pluginInstances.get(id) || null },
    metadataCache: {
      on: () => ({ off: () => {} }),
      getFileCache: (file) =>
        metadataUnavailable.has(file.path)
          ? null
          : {
              frontmatter: metadata.get(file.path) || {},
              listItems: listItems.get(file.path) || [],
            },
    },
    vault: {
      on: () => ({ off: () => {} }),
      getMarkdownFiles: () => fakeFiles,
      cachedRead: async (file) => {
        if (file.path.startsWith("05 People/")) {
          throw new Error("simulated unreadable note");
        }
        return fileContents.get(file.path) || "";
      },
      getAbstractFileByPath: (filePath) => {
        requestedPaths.push(filePath);
        if (absentPaths.has(filePath)) return null;
        return filePath.endsWith(".md") ? new TFile(filePath) : null;
      },
      getFiles: () => fakeFiles,
      read: async (file) => fileContents.get(file.path) || "",
      process: async (file, transform) => {
        const after = transform(fileContents.get(file.path) || "");
        fileContents.set(file.path, after);
        writes.push(["process", file.path, after]);
        return after;
      },
      create: async (filePath, content) => {
        absentPaths.delete(filePath);
        fileContents.set(filePath, content);
        writes.push(["create", filePath, content]);
        const file = new TFile(filePath);
        fakeFiles.push(file);
        return file;
      },
      createFolder: async (folder) => { writes.push(["folder", folder]); },
    },
    fileManager: {
      processFrontMatter: async (file, mutate) => {
        const frontmatter = { ...(metadata.get(file.path) || {}) };
        mutate(frontmatter);
        metadata.set(file.path, frontmatter);
        writes.push(["frontmatter", file.path, frontmatter]);
      },
      renameFile: async (file, target) => {
        writes.push(["rename", file.path, target]);
        const index = fakeFiles.findIndex((item) => item.path === file.path);
        if (index === -1) return;
        fakeFiles[index] = new TFile(target);
        for (const store of [metadata, fileContents, listItems]) {
          if (store.has(file.path)) { store.set(target, store.get(file.path)); store.delete(file.path); }
        }
        absentPaths.delete(target);
        absentPaths.add(file.path);
      },
      trashFile: async (file) => {
        writes.push(["trash", file.path]);
        const index = fakeFiles.findIndex((item) => item.path === file.path);
        if (index !== -1) fakeFiles.splice(index, 1);
        absentPaths.add(file.path);
      },
    },
    workspace: {
      getLeavesOfType: () => [],
      getLeaf: () => fakeLeaf,
      onLayoutReady: (callback) => callback(),
      revealLeaf: async () => {},
      detachLeavesOfType: () => {},
    },
  };
  fakeLeaf.app = fakeApp;

  const LifeOSPlugin = moduleBox.exports;
  const plugin = new LifeOSPlugin();
  plugin.app = fakeApp;
  await plugin.onload();
  check("view registered", plugin.viewType === "life-os-home", plugin.viewType);
  check("Brain view registered", plugin.views.has("life-os-brain"));
  const commandIds = new Set((plugin.commands || []).map((command) => command.id));
  const requiredCommandIds = [
    "open-home",
    "open-capture",
    "open-configuration",
    "open-brain",
    ...[
      "today",
      "sprint",
      "projects",
      "meetings",
      "docs",
      "inbox",
      "roadmap",
      "waiting",
      "config",
      "plan",
      "focus",
      "review",
      "people",
      "library",
      "ai",
    ].map((screen) => `open-${screen}`),
    ...["project", "sprint", "meeting", "adr", "release", "tech-note", "postmortem"].map((kind) => `new-${kind}`),
  ];
  const missingAppCommands = requiredCommandIds.filter((id) => !commandIds.has(id));
  check(
    "application commands registered",
    missingAppCommands.length === 0,
    missingAppCommands.join(", ")
  );
  check("ribbon registered", plugin.ribbon?.icon === "compass", plugin.ribbon?.icon);

  const view = plugin.viewFactory(fakeLeaf);
  await view.onOpen();
  const screens = [
    "home",
    "today",
    "sprint",
    "projects",
    "meetings",
    "docs",
    "inbox",
    "roadmap",
    "waiting",
    "config",
    "plan",
    "focus",
    "review",
    "people",
    "person",
    "library",
    "ai",
  ];
  const emptyScreens = [];
  const requiredPanels = {
    today: "life-os-standup",
    sprint: "life-os-sprint-live",
    meetings: "life-os-meetings-live",
    docs: "life-os-docs-live",
    inbox: "life-os-inbox-live",
    roadmap: "life-os-roadmap-live",
    waiting: "life-os-waiting-live",
    config: "life-os-config-live",
    plan: "life-os-plan-live",
    focus: "life-os-collection-live",
    review: "life-os-review-live",
    projects: "life-os-collection-live",
    people: "life-os-collection-live",
    person: "life-os-person-page",
    library: "life-os-collection-live",
    ai: "life-os-ai-live",
  };
  const renderedPanels = new Set();
  const taskFeedsWithRows = new Set();
  let homeHasSystemSummary = false;
  let homeHasSetupBanner = false;
  let todayHasPropertyValues = false;
  const treeHasClass = (element, className) =>
    String(element.options?.cls || "")
      .split(/\s+/)
      .includes(className) ||
    element.children.some((child) => treeHasClass(child, className));
  const treeHasText = (element, value) =>
    element.options?.text === value ||
    element.children.some((child) => treeHasText(child, value));
  for (const screen of screens) {
    view.activeScreen = screen;
    view.activePersonPath = "05 People/Person.md";
    view.render();
    if (!view.contentEl.children.length) {
      emptyScreens.push(screen);
    }
    if (requiredPanels[screen] && treeHasClass(view.contentEl, requiredPanels[screen])) {
      renderedPanels.add(screen);
    }
    if (["today", "focus"].includes(screen) && treeHasClass(view.contentEl, "life-os-task-row")) {
      taskFeedsWithRows.add(screen);
    }
    if (screen === "home") {
      homeHasSystemSummary = treeHasClass(view.contentEl, "life-os-summary");
      homeHasSetupBanner = treeHasClass(view.contentEl, "life-os-setup-banner");
    }
    if (screen === "today") {
      plugin.settings.showPersonal = true;
      view.render();
      todayHasPropertyValues =
        treeHasText(view.contentEl, "8/10") && treeHasText(view.contentEl, "Done");
      plugin.settings.showPersonal = false;
    }
  }
  check("all application screens render", emptyScreens.length === 0, emptyScreens.join(", "));
  const missingPanels = Object.keys(requiredPanels).filter(
    (screen) => !renderedPanels.has(screen)
  );
  check("native live panels render", missingPanels.length === 0, missingPanels.join(", "));
  check(
    "task feed renders indexed commitments",
    taskFeedsWithRows.size === 2,
    [...taskFeedsWithRows].join(", ")
  );
  check("Home avoids duplicate system summary", !homeHasSystemSummary);
  check("Home onboarding state renders", homeHasSetupBanner);
  check("Today renders configured property values", todayHasPropertyValues);
  metadata.set("00 Dashboards/Setup.md", { status: "done" });
  view.activeScreen = "home";
  view.render();
  check(
    "completed onboarding banner hides",
    !treeHasClass(view.contentEl, "life-os-setup-banner")
  );
  metadata.set("00 Dashboards/Setup.md", { status: "open" });
  check(
    "task index degrades per file",
    view.taskSnapshot?.tasks.length === 4 &&
      view.taskSnapshot?.state === "partial" &&
      view.taskSnapshot?.skipped === 2,
    JSON.stringify({
      tasks: view.taskSnapshot?.tasks.length,
      state: view.taskSnapshot?.state,
      skipped: view.taskSnapshot?.skipped,
    })
  );
  const indexedTaskTexts = new Set(
    (view.taskSnapshot?.tasks || []).map((task) => task.text)
  );
  check(
    "task index uses structural metadata and includes Writing",
    indexedTaskTexts.has("Ship the Life OS slice") &&
      indexedTaskTexts.has("Continue the data pass") &&
      indexedTaskTexts.has("Draft the article") &&
      indexedTaskTexts.has("Triage the inbox")
  );
  check(
    "task index excludes fences, closed tasks, and non-source files",
    !indexedTaskTexts.has("Fenced sample must stay out") &&
      !indexedTaskTexts.has("Finished task") &&
      !indexedTaskTexts.has("Cancelled task") &&
      !indexedTaskTexts.has("Out-of-scope library task") &&
      !indexedTaskTexts.has("Out-of-scope task archive")
  );
  check(
    "task index reports unknown statuses without guessing",
    view.taskSnapshot?.unresolvedStatuses === 1 &&
      !indexedTaskTexts.has("Unknown custom status"),
    String(view.taskSnapshot?.unresolvedStatuses)
  );
  check(
    "task index reports metadata coverage and sample exclusions",
    view.taskSnapshot?.missingMetadata === 1 &&
      view.taskSnapshot?.examplesExcluded === 1 &&
      view.taskSnapshot?.candidateFiles === 6,
    JSON.stringify({
      missingMetadata: view.taskSnapshot?.missingMetadata,
      examplesExcluded: view.taskSnapshot?.examplesExcluded,
      candidateFiles: view.taskSnapshot?.candidateFiles,
    })
  );
  view.activeScreen = "home";
  view.render();
  check(
    "task feed exposes partial index coverage",
    treeHasText(
      view.contentEl,
      "4 open, 1 unreadable, 1 metadata pending, 1 unresolved status, 1 sample excluded"
    )
  );
  check(
    "task display strips supported Tasks metadata",
    [...indexedTaskTexts].every(
      (text) => !/[📅⏳➕🔺⏫🔼🔽⏬]/u.test(text)
    )
  );

  view.activeScreen = "ai";
  view.render();
  check(
    "permission status reports observable policy without enforcement claim",
    treeHasText(view.contentEl, "Manual prompts") &&
      treeHasText(view.contentEl, "Client setting is off. This reports policy, not enforcement.") &&
      !treeHasText(view.contentEl, "Required for every write")
  );
  pluginInstances.get("agent-client").settings.autoAllowPermissions = true;
  view.render();
  check(
    "permission status warns when auto-allow is enabled",
    treeHasText(view.contentEl, "Auto-allow on") &&
      treeHasText(view.contentEl, "Client may auto-approve requests. This reports policy, not enforcement.")
  );
  delete pluginInstances.get("agent-client").settings.autoAllowPermissions;
  view.render();
  check(
    "permission status remains unknown when setting is unobservable",
    treeHasText(view.contentEl, "Unknown") &&
      treeHasText(view.contentEl, "Permission setting was not observable. No enforcement claim.")
  );
  pluginInstances.get("agent-client").settings.autoAllowPermissions = false;

  metadata.set("Meta/Dev OS Config.md", {
    questions: [{ key: "dq_goals", text: "Did I set clear goals?" }],
    habits: ["habit_journal", "habit_exercise", "habit_reading"],
  });
  metadata.set("01 Journal/Daily/2026-09-09.md", {
    dq_goals: true,
    habit_journal: false,
    habit_reading: "yes",
  });
  const strictToday = view.getTodayData();
  check(
    "Today rejects boolean effort scores",
    strictToday.questionRecorded === 0 &&
      strictToday.questions[0]?.state === "invalid" &&
      strictToday.questions[0]?.display === "Invalid value"
  );
  check(
    "Today distinguishes unchecked, missing, and invalid habits",
    strictToday.habitRecorded === 1 &&
      strictToday.habitDone === 0 &&
      strictToday.habits.map((habit) => habit.state).join(",") ===
        "unchecked,missing,invalid" &&
      strictToday.habits.map((habit) => habit.display).join(",") ===
        "Unchecked,Not recorded,Invalid value"
  );
  const coverage = view.summarizeDailyProperties(
    {
      dq_one: 8,
      dq_two: "8",
      habit_one: false,
      habit_two: true,
      habit_three: "false",
    },
    ["dq_one", "dq_two"],
    ["habit_one", "habit_two", "habit_three"]
  );
  check(
    "daily property coverage counts recorded false separately from habits done",
    coverage.questionsRecorded === 1 &&
      coverage.habitsRecorded === 2 &&
      coverage.habitsDone === 1 &&
      coverage.recorded === 3,
    JSON.stringify(coverage)
  );
  metadata.set("Meta/Dev OS Config.md", {
    daily_folder: "/Custom/Daily/",
    weekly_folder: "Custom/Weekly/",
    quarterly_folder: "Custom/Quarterly",
    retreat_folder: "Custom/Retreats",
    projects_folder: "Custom/Projects/",
    questions: [{ key: "dq_goals", text: "Did I set clear goals?" }],
    habits: ["habit_journal"],
  });
  requestedPaths.length = 0;
  view.getTodayData();
  view.renderPlanLive(new FakeElement());
  view.renderReviewLive(new FakeElement());
  view.getSystemStats();
  await view.openPath("04 Projects/Projects Board.md");
  const configuredFolders = view.getConfiguredFolders();
  check(
    "configured folders normalize without leading or trailing slashes",
    JSON.stringify(configuredFolders) === JSON.stringify({
      daily: "Custom/Daily",
      weekly: "Custom/Weekly",
      quarterly: "Custom/Quarterly",
      retreats: "Custom/Retreats",
      projects: "Custom/Projects",
      sprints: "04 Projects/Sprints",
      meetings: "10 Meetings",
      decisions: "06 Writing/Decisions",
      docs: "06 Writing",
      clippings: "07 Library/Clippings",
      releases: "06 Writing/Releases",
    }),
    JSON.stringify(configuredFolders)
  );
  check(
    "Today, Plan, Review, and system stats use configured period paths",
    [
      "Custom/Daily/2026-09-09.md",
      "Custom/Weekly/2026-W37.md",
      "Custom/Quarterly/2026-Q3.md",
      "Custom/Retreats/2026-Q3 Personal Retreat.md",
      "Custom/Projects/Projects Board.md",
    ].every((path) => requestedPaths.includes(path)),
    requestedPaths.filter((path) => path.startsWith("Custom/")).join(", ")
  );
  check(
    "domain records use the configured projects folder",
    view.isDomainRecord(new TFile("Custom/Projects/Project.md")) &&
      !view.isDomainRecord(new TFile("04 Projects/Project.md"))
  );
  metadata.set("Meta/Dev OS Config.md", {
    questions: [{ key: "dq_goals", text: "Did I set clear goals?" }],
    habits: ["habit_journal"],
  });
  metadata.set("01 Journal/Daily/2026-09-09.md", {
    dq_goals: 8,
    habit_journal: true,
  });

  const editorCalls = [];
  const taskLeaf = {
    view: {
      editor: {
        setCursor: (position) => editorCalls.push(["cursor", position]),
        scrollIntoView: (range) => editorCalls.push(["scroll", range]),
      },
    },
    async openFile(file) { this.openedFile = file; },
  };
  const getLeaf = fakeApp.workspace.getLeaf;
  fakeApp.workspace.getLeaf = () => taskLeaf;
  await view.openPath("08 Tasks/Tasks.md", 7);
  fakeApp.workspace.getLeaf = getLeaf;
  check(
    "task navigation targets the indexed source line",
    taskLeaf.openedFile?.path === "08 Tasks/Tasks.md" &&
      editorCalls[0]?.[0] === "cursor" &&
      editorCalls[0]?.[1]?.line === 6
  );

  plugin.openCapture();
  check(
    "capture modal renders three action groups",
    (Modal.lastOpened?.contentEl.children || []).filter((child) =>
      treeHasClass(child, "life-os-capture-section")
    ).length === 3
  );
  fakeLeaf.view = view;
  fakeApp.workspace.getLeavesOfType = () => [fakeLeaf];
  await plugin.activateView("today");
  check("view activation state", fakeLeaf.state?.type === "life-os-home", fakeLeaf.state?.type);
  check("direct module activation", view.activeScreen === "today", view.activeScreen);

  fakeFiles.push(new TFile("01 Journal/Daily/2026-09-09.md"), new TFile("01 Journal/Daily/2026-09-08.md"));
  metadata.set("01 Journal/Daily/2026-09-08.md", { tags: ["example"], dq_goals: 2, habit_journal: false });
  const real = view.getAnalytics();
  check("analytics excludes sample scores and preserves missing days", real.average === 8 && real.scored === 1 && real.days.filter((day) => day.score === null).length === 29);
  view.includeExamples = true;
  check("analytics sample inclusion is explicit", view.getAnalytics().average === 5);
  metadata.set("01 Journal/Daily/2026-09-08.md", { dq_goals: true, habit_journal: false });
  check("boolean question values are not numeric scores", view.getAnalytics().scored === 1);
  view.includeExamples = false;
  check("record counters exclude templates and build copies",
    !view.isDomainRecord(new TFile("Templates/Project.md")) &&
    !view.isDomainRecord(new TFile("build/04 Projects/Project.md")));
  view.activeScreen = "home";
  view.render();
  const findText = (element, text) => element.options?.text === text ? element :
    element.children.map((child) => findText(child, text)).find(Boolean);
  check("Home hides personal analytics by default", !findText(view.contentEl, "7 days") && !findText(view.contentEl, "Explore Review"));
  plugin.settings.showPersonal = true;
  view.render();
  check("Home links personal analytics when enabled", !findText(view.contentEl, "7 days") && !!findText(view.contentEl, "Explore Review"));
  plugin.settings.showPersonal = false;
  view.activeScreen = "review";
  view.render();
  findText(view.contentEl, "7 days").handlers.click();
  check("chart range control changes aggregation window", view.getAnalytics().days.length === 7);
  findText(view.contentEl, "Include samples").handlers.click();
  check("sample control changes state", view.includeExamples === true);
  view.analyticsDays = 30;
  view.includeExamples = false;

  // Pure helpers that shape every write.
  const today = "2026-09-09";
  check("toggle completes with a done date", sandbox.toggleTaskText("- [ ] Ship it 📅 2026-09-10", today) === "- [x] Ship it 📅 2026-09-10 ✅ 2026-09-09");
  check("toggle reopens and drops the done date", sandbox.toggleTaskText("  - [x] Ship it ✅ 2026-09-08", today) === "  - [ ] Ship it");
  check("status change keeps text and sets in progress", sandbox.setTaskStatusText("- [ ] Ship it #sprint/s1", "/", today) === "- [/] Ship it #sprint/s1");
  check("non-task lines are never rewritten", sandbox.toggleTaskText("Plain prose", today) === null && sandbox.setTaskDueText("- note", "2026-09-10") === null);
  check("due date replaces the old one", sandbox.setTaskDueText("- [ ] Ship it 📅 2026-09-01 ➕ 2026-08-01", "2026-09-20") === "- [ ] Ship it ➕ 2026-08-01 📅 2026-09-20");
  check("task line carries routing tags and dates", sandbox.buildTaskLine({ text: "Write runbook", project: "billing-api", sprint: "billing-sprint-1", owner: "alex", due: "2026-09-12", high: true, blocked: true, created: today }) === "- [ ] Write runbook #project/billing-api #sprint/billing-sprint-1 #p/alex #blocked ⏫ 📅 2026-09-12 ➕ 2026-09-09");
  const inserted = sandbox.insertUnderHeading("# P\n\n## Tasks\n- [ ] One\n\n## Notes\nText", "## Tasks", "- [ ] Two");
  check("insert lands at the end of the section", inserted === "# P\n\n## Tasks\n- [ ] One\n- [ ] Two\n\n## Notes\nText", JSON.stringify(inserted));
  check("insert ignores headings inside code fences", sandbox.insertUnderHeading("```\n## Tasks\n```\n## Tasks\n- [ ] One", "## Tasks", "- [ ] Two").endsWith("## Tasks\n- [ ] One\n- [ ] Two"));
  check("insert creates a missing heading at the end", sandbox.insertUnderHeading("Body", "## Tasks", "- [ ] Two") === "Body\n\n## Tasks\n- [ ] Two\n");
  check("insert replaces an empty template bullet", sandbox.insertUnderHeading("## Notes\n- \n\n## Done", "## Notes", "- Point") === "## Notes\n- Point\n\n## Done");
  check("ADR numbers continue from the highest", sandbox.nextAdrNumber([1, "3", "ADR-0007"]) === 8 && sandbox.nextAdrNumber([]) === 1 && sandbox.formatAdrNumber(8) === "ADR-0008");
  check("standup text lists empty sections explicitly", sandbox.buildStandupText({ yesterday: ["A"], today: [], blockers: ["B"] }) === "- Yesterday:\n  - A\n- Today: none\n- Blockers:\n  - B");
  check("decisions are read from the minutes section", JSON.stringify(sandbox.extractSection("## Decisions\n- Use Postgres\n- [ ] not a decision\n## Action items\n- x", "## Decisions")) === JSON.stringify(["Use Postgres"]));
  const meetingNote = sandbox.buildMeetingNote({ title: "Kickoff", date: today, time: "10:00", project: "Billing API", projectSlug: "billing-api", attendees: ["Alex Rivera"], agenda: "Scope\nRisks", notes: "", decisions: ["Use Postgres", ""], actions: [{ text: "Share plan", owner: "alex-rivera", due: "2026-09-11" }], today });
  check("meeting note links the project and tags action items",
    meetingNote.includes('project: "[[Billing API]]"') && meetingNote.includes('time: "10:00"') && meetingNote.includes("  - \"[[Alex Rivera]]\"") &&
    meetingNote.includes("- Scope\n- Risks") && meetingNote.includes("## Decisions\n- Use Postgres\n") &&
    meetingNote.includes("- [ ] Share plan #project/billing-api #p/alex-rivera 📅 2026-09-11 ➕ 2026-09-09"), meetingNote);

  // Interactive writes go through the writer and refuse stale lines.
  writes.length = 0;
  fileContents.set("04 Projects/Example.md", "- [ ] Ship the Life OS slice 📅 2026-09-09 ⏫\n## Tasks\n- [ ] Existing #project/example");
  await view.refreshLiveData();
  const shipTask = view.taskSnapshot.tasks.find((task) => task.text === "Ship the Life OS slice");
  await view.runWrite(() => view.writer.toggleTask(shipTask), "done");
  check("checkbox completes the source line", fileContents.get("04 Projects/Example.md").startsWith("- [x] Ship the Life OS slice 📅 2026-09-09 ⏫ ✅ 2026-09-09"), fileContents.get("04 Projects/Example.md"));
  const before = fileContents.get("04 Projects/Example.md");
  Notice.messages.length = 0;
  const staleOk = await view.runWrite(() => view.writer.toggleTask({ ...shipTask, raw: "- [ ] Something else" }), "done");
  check("stale task lines are not written", !staleOk && fileContents.get("04 Projects/Example.md") === before && Notice.messages.some((message) => String(message).includes("changed since Dev OS read it")));

  // Project page: add a task and save meeting minutes from the UI.
  view.activeScreen = "project";
  view.activeProjectPath = "04 Projects/Example.md";
  view.render();
  check("project page renders tabs", treeHasClass(view.contentEl, "life-os-project-page") && treeHasClass(view.contentEl, "life-os-tabs"));
  view.setProjectTab("04 Projects/Example.md", "tasks");
  view.taskDrafts = { "04 Projects/Example.md": { text: "Write the runbook", due: "2026-09-20", scheduled: "", high: true, sprint: "", owner: "", blocked: false } };
  view.render();
  const addButton = findText(view.contentEl, "Add task");
  const findParentWithHandler = (element, text) => {
    if (element.handlers?.click && element.children.some((child) => child.options?.text === text)) return element;
    return element.children.map((child) => findParentWithHandler(child, text)).find(Boolean);
  };
  const settle = async () => { for (let i = 0; i < 30; i += 1) await new Promise((resolve) => setImmediate(resolve)); };
  findParentWithHandler(view.contentEl, "Add task")?.handlers.click();
  await settle();
  check("project page adds a task under its Tasks heading", Boolean(addButton) && fileContents.get("04 Projects/Example.md").endsWith("## Tasks\n- [ ] Existing #project/example\n- [ ] Write the runbook #project/example ⏫ 📅 2026-09-20 ➕ 2026-09-09"), fileContents.get("04 Projects/Example.md"));
  view.setProjectTab("04 Projects/Example.md", "meetings");
  view.composerOpen = true;
  const draft = view.meetingDraft("04 Projects/Example.md");
  Object.assign(draft, { title: "Sprint review", decisions: ["Ship behind a flag"], actions: [{ text: "Demo to support", owner: "", due: "2026-09-15" }] });
  view.render();
  check("meeting composer renders with its draft", treeHasClass(view.contentEl, "life-os-composer") && view.meetingDraft("04 Projects/Example.md").title === "Sprint review");
  absentPaths.add("10 Meetings/2026-09-09 Sprint review.md");
  findParentWithHandler(view.contentEl, "Save minutes")?.handlers.click();
  await settle();
  const created = writes.find((write) => write[0] === "create");
  check("meeting minutes are saved as a linked note", created?.[1] === "10 Meetings/2026-09-09 Sprint review.md" && created[2].includes('project: "[[Example]]"') && created[2].includes("- Ship behind a flag") && created[2].includes("- [ ] Demo to support #project/example 📅 2026-09-15"), JSON.stringify(created));
  check("saved minutes clear the draft", !Object.keys(plugin.settings.meetingDrafts || {}).includes("04 Projects/Example.md"));
  absentPaths.delete("10 Meetings/2026-09-09 Sprint review.md");
  const refused = await view.runWrite(() => view.writer.createNote("10 Meetings", "2026-09-09 Sprint review", "x"), "");
  check("existing notes are never overwritten", !refused);
  await view.runWrite(() => view.writer.setFrontmatter("04 Projects/Example.md", { status: "on-hold" }), "");
  check("status selects write frontmatter", metadata.get("04 Projects/Example.md").status === "on-hold");
  metadata.set("04 Projects/Example.md", { type: "project", status: "active" });

  // Inbox lists only untriaged clippings.
  fakeFiles.push(new TFile("07 Library/Clippings/New clip.md"), new TFile("07 Library/Clippings/Read clip.md"));
  metadata.set("07 Library/Clippings/New clip.md", { type: "clipping", status: "inbox", source: "https://example.invalid/a" });
  metadata.set("07 Library/Clippings/Read clip.md", { type: "clipping", status: "read" });
  check("inbox shows only untriaged clips", view.inboxClips().map((file) => file.path).join() === "07 Library/Clippings/New clip.md");
  view.activeScreen = "home";
  view.render();
  const railLabels = [];
  const collect = (element) => { if (String(element.options?.cls || "").includes("life-os-nav-button")) railLabels.push(element.options.attr?.title); element.children.forEach(collect); };
  collect(view.contentEl);
  check("personal modules are hidden by default", !railLabels.includes("Plan") && !railLabels.includes("Review") && railLabels.includes("Sprint") && railLabels.includes("Inbox"), railLabels.join(","));
  check("settings tab registered", Boolean(plugin.settingTab));

  // Editing keeps unrelated metadata and only touches the requested parts.
  check("edit keeps recurrence, created date, and other tags",
    sandbox.editTaskLine("- [ ] Ship it #project/a #sprint/s1 #p/bob ⏫ 🔁 every week 📅 2026-09-10 ➕ 2026-09-01", { text: "Ship it now", sprint: "s2", owner: "", high: false, due: "2026-09-12", blocked: true }) ===
      "- [ ] Ship it now #project/a #sprint/s2 #blocked 🔁 every week 📅 2026-09-12 ➕ 2026-09-01");
  check("edit keeps issue numbers in the text and the done date", sandbox.editTaskLine("  - [x] Fix #123 crash #fix ✅ 2026-09-08", { release: "billing-1-0" }) === "  - [x] Fix #123 crash #fix #release/billing-1-0 ✅ 2026-09-08");
  check("dependencies are written in Tasks format and deduplicated", sandbox.editTaskLine("- [ ] A", { id: "abc", dependsOn: ["x", "y", "x"] }) === "- [ ] A 🆔 abc ⛔ x,y" && sandbox.editTaskLine("- [ ] B ⛔ x,y 🆔 q", { dependsOn: [] }) === "- [ ] B 🆔 q");
  check("milestones parse from strings and objects", JSON.stringify(sandbox.parseMilestones(["2026-10-15 Release", { date: "2026-09-25", name: "Beta" }, "nonsense"]).map((item) => `${item.date} ${item.name}`)) === JSON.stringify(["2026-09-25 Beta", "2026-10-15 Release"]));
  const notes = sandbox.buildReleaseNotes({ version: "1.0.0", date: "2026-10-01", done: [{ text: "Fix crash #fix", display: "Fix crash" }, { text: "New API", display: "New API" }], open: [{ display: "Docs" }], decisions: ["ADR-0001 X"], level: 3 });
  check("release notes group by tag and list decisions and open work", notes === "### 1.0.0 (2026-10-01)\n\n#### Fixed\n- Fix crash\n\n#### Added\n- New API\n\n#### Decisions\n- [[ADR-0001 X]]\n\n#### Not done\n- Docs", notes);

  // Task editor, sprint carry-over, waiting, roadmap, releases on a small project.
  const projectPath = "04 Projects/Billing.md";
  const sprintPath = "04 Projects/Sprints/Billing Sprint 1.md";
  const releasePath = "06 Writing/Releases/Billing 1.0.md";
  for (const filePath of [projectPath, sprintPath, releasePath, "05 People/Alex.md"]) fakeFiles.push(new TFile(filePath));
  metadata.set(projectPath, { type: "project", status: "active", started: "2026-09-01", due: "2026-10-30", milestones: ["2026-09-20 Beta"] });
  metadata.set(sprintPath, { type: "sprint", project: "[[Billing]]", number: 1, start: "2026-09-07", end: "2026-09-20", status: "active" });
  metadata.set(releasePath, { type: "release", version: "1.0", project: "[[Billing]]", date: "2026-10-01", status: "planned" });
  metadata.set("05 People/Alex.md", { type: "person" });
  fileContents.set(projectPath, [
    "## Tasks",
    "- [ ] Build API #project/billing #sprint/billing-sprint-1 #release/billing-1-0 🆔 api1 ➕ 2026-09-01",
    "- [ ] Load test #project/billing #sprint/billing-sprint-1 ⛔ api1",
    "- [x] Schema #project/billing #sprint/billing-sprint-1 #release/billing-1-0 #fix ✅ 2026-09-05",
    "- [ ] Runbook #project/billing #p/alex ➕ 2026-09-02",
  ].join("\n"));
  fileContents.set(releasePath, "# Billing 1.0\n\n## Release notes\nold\n\n## Rollout\n- [ ] Flag");
  listItems.set(projectPath, [1, 2, 3, 4].map((line) => taskItem(fileContents.get(projectPath).split("\n")[line].charAt(3), line)));
  await view.refreshLiveData();
  const loadTest = view.allTasks().find((task) => task.text.startsWith("Load test"));
  check("dependencies resolve to open tasks", view.openDependencies(loadTest).map((task) => task.display).join() === "Build API");
  view.activeScreen = "waiting";
  view.render();
  check("waiting groups delegated work by person and lists dependencies", treeHasText(view.contentEl, "Alex") && treeHasText(view.contentEl, "Delegated, by person") && treeHasText(view.contentEl, "Waits on"));
  view.activeScreen = "roadmap";
  view.render();
  check("roadmap draws a bar, a milestone, and a release marker", treeHasClass(view.contentEl, "life-os-roadmap-bar") && treeHasClass(view.contentEl, "is-milestone") && treeHasClass(view.contentEl, "is-release"));
  const release = view.releaseModel(new TFile(releasePath));
  check("release model collects tagged tasks", release.done.length === 1 && release.open.length === 1 && release.notes.includes("### Fixed\n- Schema"), release.notes);
  await view.runWrite(() => view.writer.replaceSection(releasePath, "## Release notes", "### 1.0\n- Schema"), "");
  check("release notes replace only their own section", fileContents.get(releasePath) === "# Billing 1.0\n\n## Release notes\n### 1.0\n- Schema\n\n## Rollout\n- [ ] Flag", fileContents.get(releasePath));

  // Task editor through the real form modal.
  const runbook = view.allTasks().find((task) => task.text.startsWith("Runbook"));
  const editor = view.openTaskEditor(runbook);
  Object.assign(editor.values, { text: "Write the runbook", due: "2026-09-30", owner: "", sprint: "billing-sprint-1", waitsOn: `${projectPath}::3` });
  await editor.submit();
  const lines = fileContents.get(projectPath).split("\n");
  const newId = lines[2].match(/🆔 ([a-z0-9]+) ⛔ api1$/)?.[1];
  check("task editor rewrites the line with sprint, due, and a new dependency", Boolean(newId) && lines[4] === `- [ ] Write the runbook #project/billing #sprint/billing-sprint-1 📅 2026-09-30 ⛔ ${newId} ➕ 2026-09-02`, lines.join(" | "));

  // Close the sprint and move open work into a new one.
  fakeFiles.splice(0, fakeFiles.length, ...fakeFiles.filter((file) => !file.path.startsWith("04 Projects/Sprints/Billing Sprint 2")));
  absentPaths.add("04 Projects/Sprints/Billing Sprint 2.md");
  listItems.set(projectPath, [1, 2, 3, 4].map((line) => taskItem(fileContents.get(projectPath).split("\n")[line].charAt(3), line)));
  await view.refreshLiveData();
  const closer = view.closeSprint(new TFile(sprintPath));
  Object.assign(closer.values, { target: "__new__", goal: "Ship it", activate: true });
  writes.length = 0;
  await closer.submit();
  const after = fileContents.get(projectPath).split("\n");
  check("closing a sprint creates the next one and moves open tasks",
    writes.some((write) => write[0] === "create" && write[1] === "04 Projects/Sprints/Billing Sprint 2.md" && write[2].includes("start: 2026-09-21")) &&
    after[1].includes("#sprint/billing-sprint-2") && after[2].includes("#sprint/billing-sprint-2") && after[3].includes("#sprint/billing-sprint-1") &&
    metadata.get(sprintPath).status === "closed" && metadata.get(projectPath).current_sprint === "[[Billing Sprint 2]]", after.join(" | "));
  const staleBatch = await view.writer.updateTaskLines([{ path: projectPath, line: 2, raw: "- [ ] not this" }], (line) => line + " x");
  check("batch task writes skip changed lines", staleBatch.written === 0 && staleBatch.stale === 1);

  // Configure: draft, keys, patch, diff, validation, and the save flow.
  const draftFrom = sandbox.readConfigDraft({ sprints_folder: "/Work/Sprints/", questions: [{ key: "dq_goals", text: "Goals?" }, "dq_plain"], habits: ["habit_read"], board_done_lanes: "Done, Shipped", life_expectancy: 80 });
  check("config draft reads folders, questions, habits, and lanes",
    draftFrom.folders.sprints_folder === "Work/Sprints" && draftFrom.folders.projects_folder === "04 Projects" &&
    JSON.stringify(draftFrom.questions.map((item) => item.key)) === JSON.stringify(["dq_goals", "dq_plain"]) &&
    draftFrom.habits[0].key === "habit_read" && JSON.stringify(draftFrom.doneLanes) === JSON.stringify(["Done", "Shipped"]) && draftFrom.lifeExpectancy === "80");
  check("new config keys are prefixed, slugged, and unique", sandbox.configKeyFor("dq_", "Protect deep work", ["dq_protect_deep_work"]) === "dq_protect_deep_work_2" && sandbox.configKeyFor("habit_", "Run!", []) === "habit_run");
  const edited = sandbox.cloneConfigDraft(draftFrom);
  edited.folders.meetings_folder = "Work/Meetings";
  edited.questions.push({ key: "dq_ship", text: "Did I ship?", locked: false });
  const patch = sandbox.configPatch(edited);
  check("config patch writes question objects, keys, and joined lanes",
    patch.meetings_folder === "Work/Meetings" && JSON.stringify(patch.questions[2]) === JSON.stringify({ key: "dq_ship", text: "Did I ship?" }) &&
    JSON.stringify(patch.habits) === JSON.stringify(["habit_read"]) && patch.board_done_lanes === "Done,Shipped" && patch.life_expectancy === 80);
  const diff = sandbox.diffConfig(draftFrom, edited);
  check("config diff lists folder and question changes", diff.some((line) => line.startsWith("Folder Meetings")) && diff.includes("Question added: Did I ship?"), diff.join(" | "));
  edited.questions[0].text = " ";
  check("config validation blocks empty questions", sandbox.validateConfigDraft(edited).some((error) => error.includes("Question 1")));

  const configPath = "Meta/Dev OS Config.md";
  metadata.set(configPath, { questions: [{ key: "dq_goals", text: "Did I set clear goals?" }], habits: ["habit_journal"], sprints_folder: "04 Projects/Sprints" });
  view.configDraft = null;
  view.activeScreen = "config";
  plugin.settings.showPersonal = true;
  view.render();
  check("Configure renders folders and the question editor", treeHasClass(view.contentEl, "life-os-config-grid") && treeHasClass(view.contentEl, "life-os-config-item") && treeHasText(view.contentEl, "No changes."));
  const state = view.configDraftState();
  state.draft.folders.sprints_folder = "Work/Sprints";
  state.draft.questions.push({ key: "dq_unblock", text: "Did I unblock someone?", locked: false });
  view.render();
  check("Configure previews unsaved changes", treeHasText(view.contentEl, "Question added: Did I unblock someone?"));
  findParentWithHandler(view.contentEl, "Save configuration")?.handlers.click();
  await settle();
  const savedConfig = metadata.get(configPath);
  check("Save configuration writes the config properties",
    savedConfig.sprints_folder === "Work/Sprints" && savedConfig.questions.length === 2 && savedConfig.questions[0].key === "dq_goals" && savedConfig.questions[1].key === "dq_unblock" && sandbox.diffConfig(view.configDraftState().base, view.configDraftState().draft).length === 0,
    JSON.stringify(savedConfig));
  plugin.settings.showPersonal = false;
  metadata.set(configPath, { questions: [{ key: "dq_goals", text: "Did I set clear goals?" }], habits: ["habit_journal"] });

  // Health check on plain data.
  const health = sandbox.runHealthCheck({
    today: "2026-09-09",
    folders: [{ label: "Meetings", path: "10 Meetings", exists: false }],
    notes: [
      { path: "p/A.md", title: "A", type: "project", currentSprint: "Gone" },
      { path: "s/A Sprint 1.md", title: "A Sprint 1", type: "sprint", status: "active", project: "A", end: "2026-09-01" },
      { path: "s/A Sprint 2.md", title: "A Sprint 2", type: "sprint", status: "active", project: "A", end: "2026-09-30" },
      { path: "m/M.md", title: "M", type: "meeting", project: "Nope" },
      { path: "d/ADR-1.md", title: "ADR-1", type: "adr", adrNumber: 1 },
      { path: "d/ADR-1b.md", title: "ADR-1b", type: "adr", adrNumber: 1, supersedes: "Missing ADR" },
    ],
    tasks: [
      { path: "p/A.md", line: 2, display: "x", projects: ["a"], sprints: ["ghost"], id: "t1", dependsOn: ["t2"] },
      { path: "p/A.md", line: 3, display: "y", projects: ["a"], id: "t2", dependsOn: ["t1"] },
      { path: "p/A.md", line: 4, display: "z", projects: ["a"], id: "t2", dependsOn: ["none"] },
    ],
  });
  const codes = health.map((issue) => issue.code);
  check("health check finds folders, links, tags, ids, cycles, and sprint state",
    ["folder-missing", "project-link", "tag-sprint", "dep-duplicate-id", "dep-dangling", "dep-cycle", "sprint-multiple-active", "sprint-expired", "current-sprint", "adr-number-duplicate", "adr-supersedes"].every((code) => codes.includes(code)) &&
    health[0].severity === "error", codes.join(","));
  view.activeScreen = "config";
  view.render();
  findParentWithHandler(view.contentEl, "Run check")?.handlers.click();
  await settle();
  view.render();
  check("health check renders a summary", Array.isArray(view.healthReport) && treeHasClass(view.contentEl, "life-os-health-live") && !treeHasText(view.contentEl, "Not run"));

  // Rename, archive, delete, and the project description.
  const linkSample = 'See [[Billing]], [[Billing|B]], [[Billing#Goals]], ![[04 Projects/Billing]], project: "[[Billing]]", [[Billing 1.0]], [[Billingx]].';
  check("wikilink rewrite covers aliases, headings, paths, and properties but not longer names",
    sandbox.replaceWikiLinks(linkSample, "Billing", "Payments") === 'See [[Payments]], [[Payments|B]], [[Payments#Goals]], ![[04 Projects/Payments]], project: "[[Payments]]", [[Billing 1.0]], [[Billingx]].',
    sandbox.replaceWikiLinks(linkSample, "Billing", "Payments"));
  check("tag rewrite renames and removes only the exact tag",
    sandbox.replaceTag("- [ ] x #project/billing #project/billing-2 #project/billing/sub", "project", "billing", "payments") === "- [ ] x #project/payments #project/billing-2 #project/billing/sub" &&
    sandbox.replaceTag("- [ ] x #project/billing ⏫", "project", "billing", "") === "- [ ] x ⏫");
  const findByLabel = (element, label) => element.options?.attr?.["aria-label"] === label ? element :
    element.children.map((child) => findByLabel(child, label)).find(Boolean);
  const billing = () => fakeFiles.find((file) => file.path === projectPath);
  view.activeScreen = "project";
  view.activeProjectPath = projectPath;
  view.render();
  check("project page shows the actions menu and a description field", treeHasClass(view.contentEl, "life-os-item-actions") && Boolean(findByLabel(view.contentEl, "Project description")));
  const descriptionInput = findByLabel(view.contentEl, "Project description");
  descriptionInput.value = "Bill   customers monthly ";
  descriptionInput.handlers.change();
  await settle();
  check("project description saves to the note's properties", metadata.get(projectPath).description === "Bill customers monthly", JSON.stringify(metadata.get(projectPath)));
  check("new project notes carry a description", sandbox.buildProjectNote({ title: "X", description: "Line one\nline two", today, quarter: "2026-Q3" }).includes('description: "Line one line two"') || sandbox.buildProjectNote({ title: "X", description: "Line one\nline two", today, quarter: "2026-Q3" }).includes("description: Line one line two"));

  // Archive with related items, then unarchive.
  const archiver = view.openArchiveDialog(billing());
  check("archive dialog offers related items", archiver && "related" in archiver.values);
  await archiver.submit();
  await view.refreshLiveData();
  check("archiving hides the project and keeps its files",
    metadata.get(projectPath).archived === true && metadata.get(releasePath).archived === true && metadata.get(projectPath).status === "active" &&
    !view.data.projects().some((file) => file.path === projectPath) && view.data.projects({ includeArchived: true }).some((file) => file.path === projectPath) &&
    !writes.some((write) => write[0] === "trash"));
  check("archived project tasks leave task lists but stay on the project page",
    !view.allTasks().some((task) => (task.projects || []).includes("billing")) && view.tasksForProject(billing()).length > 0);
  view.projectFilter = "archived";
  view.activeScreen = "projects";
  view.render();
  check("Archived filter lists archived projects", treeHasText(view.contentEl, "Billing") && treeHasText(view.contentEl, "Archived"));
  view.projectFilter = "open";
  const unarchiver = view.openArchiveDialog(billing());
  await unarchiver.submit();
  check("unarchive removes the flag from the project and related notes", !("archived" in metadata.get(projectPath)) && !("archived" in metadata.get(releasePath)));

  // Rename with cascade to sprints and releases; links and tags follow.
  const meetingPath = "10 Meetings/2026-09-10 Billing sync.md";
  fakeFiles.push(new TFile(meetingPath));
  metadata.set(meetingPath, { type: "meeting", date: "2026-09-10" });
  fileContents.set(meetingPath, '---\nproject: "[[Billing]]"\n---\n## Action items\n- [ ] Follow up #project/billing #sprint/billing-sprint-1');
  listItems.set(meetingPath, [taskItem(" ", 4)]);
  for (const target of ["04 Projects/Payments.md", "04 Projects/Sprints/Payments Sprint 1.md", "06 Writing/Releases/Payments 1.0.md"]) absentPaths.add(target);
  await view.refreshLiveData();
  view.activeProjectPath = projectPath;
  const renamer = view.openRenameDialog(billing(), (path) => { view.activeProjectPath = path; });
  check("rename dialog offers to rename matching sprints and releases", renamer.values.cascade === true && renamer.values.title === "Billing");
  renamer.values.title = "Payments";
  await renamer.submit();
  const renamedProject = "04 Projects/Payments.md";
  check("rename moves the project, its sprint, and its release",
    ["04 Projects/Payments.md", "04 Projects/Sprints/Payments Sprint 1.md", "06 Writing/Releases/Payments 1.0.md"].every((target) => fakeFiles.some((file) => file.path === target)) &&
    view.activeProjectPath === renamedProject, fakeFiles.map((file) => file.path).join(", "));
  check("rename rewrites links and tags across the vault",
    fileContents.get(meetingPath).includes('project: "[[Payments]]"') && fileContents.get(meetingPath).includes("#project/payments #sprint/payments-sprint-1") &&
    fileContents.get(renamedProject).includes("#project/payments #sprint/payments-sprint-1") && !fileContents.get(renamedProject).includes("#project/billing"),
    fileContents.get(meetingPath));
  absentPaths.delete("04 Projects/Billing.md");
  const taken = await view.runWrite(() => view.writer.renameNote(renamedProject, "Billing"), "");
  check("rename refuses an existing target", !taken);
  absentPaths.add("04 Projects/Billing.md");

  // Delete: the name must match; related notes and tags are optional.
  metadata.set("04 Projects/Sprints/Payments Sprint 1.md", { ...metadata.get("04 Projects/Sprints/Payments Sprint 1.md"), project: "[[Payments]]" });
  metadata.set("06 Writing/Releases/Payments 1.0.md", { ...metadata.get("06 Writing/Releases/Payments 1.0.md"), project: "[[Payments]]" });
  listItems.set(renamedProject, [1, 2, 3, 4].map((line) => taskItem(fileContents.get(renamedProject).split("\n")[line].charAt(3), line)));
  await view.refreshLiveData();
  writes.length = 0;
  const deleter = view.openDeleteDialog(fakeFiles.find((file) => file.path === renamedProject));
  deleter.values.confirm = "payments";
  await deleter.submit();
  check("delete refuses a name that does not match", !writes.some((write) => write[0] === "trash") && fakeFiles.some((file) => file.path === renamedProject));
  check("delete offers related notes and tag cleanup", "related" in deleter.values && "tags" in deleter.values);
  Object.assign(deleter.values, { confirm: "Payments", related: true, tags: true });
  await deleter.submit();
  const trashed = writes.filter((write) => write[0] === "trash").map((write) => write[1]);
  check("delete moves the project and related notes to the trash",
    ["04 Projects/Payments.md", "04 Projects/Sprints/Payments Sprint 1.md", "06 Writing/Releases/Payments 1.0.md"].every((target) => trashed.includes(target)) && !trashed.includes(meetingPath), trashed.join(", "));
  check("delete removes the project tag from tasks elsewhere", fileContents.get(meetingPath).endsWith("- [ ] Follow up #sprint/payments-sprint-1"), fileContents.get(meetingPath));

  // 1.4: property forms, people, sprint details, doc panels, prompts, Bases.
  const schemas = vm.runInContext("PROPERTY_SCHEMAS", sandbox);
  check("property patch writes only changed keys as links, lists, and numbers",
    JSON.stringify(sandbox.propertyPatch(schemas.adr, { date: "2026-09-01", deciders: ["[[A]]"], project: "[[X]]" }, { date: "2026-09-01", deciders: ["A", "B", "A"], project: "Y", supersedes: "" })) === JSON.stringify({ project: "[[Y]]", deciders: ["[[A]]", "[[B]]"] }) &&
    JSON.stringify(sandbox.propertyPatch(schemas.sprint, { number: 2 }, { number: "3", goal: " Ship " })) === JSON.stringify({ number: 3, goal: "Ship" }) &&
    JSON.stringify(sandbox.propertyPatch(schemas["tech-note"], { sources: ["a"] }, { sources: "a, b" })) === JSON.stringify({ sources: ["a", "b"] }));
  const personNote = sandbox.buildPersonNote({ title: "Jordan Lee", role: "Engineer", meets: "weekly", today });
  check("new person notes carry properties and their tag", personNote.includes("type: person") && personNote.includes("role: Engineer") && personNote.includes("Tag: `#p/jordan-lee`") && personNote.includes("## Meeting log\n- 2026-09-09 Created."));
  check("prompt instruction matches the template buttons", sandbox.promptInstruction("07 Meeting Prep") === "Read Prompts/07 Meeting Prep.md with vault_read and follow its Prompt section for the note I have open (or the current period if none applies).");
  const baseViews = vm.runInContext("BASE_VIEWS", sandbox);
  const baseProblems = Object.values(baseViews).filter((rel) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) return true;
    const text = fs.readFileSync(file, "utf8");
    return !text.includes("views:") || !/type == "/.test(text) || !text.includes("- type: table");
  });
  check("Bases files exist for every Open as table button", baseProblems.length === 0, baseProblems.join(", "));

  const personPath = "05 People/Jordan Lee.md";
  const syncPath = "10 Meetings/2026-09-12 Jordan sync.md";
  const platformPath = "04 Projects/Platform.md";
  const platformSprint = "04 Projects/Sprints/Platform Sprint 1.md";
  const queuesAdr = "06 Writing/Decisions/ADR-0002 Use queues.md";
  for (const filePath of [personPath, syncPath, platformPath, platformSprint, queuesAdr]) fakeFiles.push(new TFile(filePath));
  metadata.set(personPath, { type: "person", role: "Engineer", meets: "weekly" });
  fileContents.set(personPath, "Tag\n\n## Meeting log\n- 2026-09-01 Created.");
  metadata.set(syncPath, { type: "meeting", kind: "one-on-one", date: "2026-09-12", attendees: ["[[Jordan Lee]]"] });
  fileContents.set(syncPath, '---\nattendees:\n  - "[[Jordan Lee]]"\n---\n## Action items\n- [ ] Send notes #p/jordan-lee 📅 2026-09-01');
  listItems.set(syncPath, [taskItem(" ", 5)]);
  metadata.set(platformPath, { type: "project", status: "active", stakeholders: ["[[Jordan Lee]]"] });
  metadata.set(platformSprint, { type: "sprint", project: "[[Platform]]", start: "2026-09-07", end: "2026-09-20", status: "active", goal: "Old goal" });
  metadata.set(queuesAdr, { type: "adr", status: "proposed", project: "[[Platform]]", deciders: [] });
  await view.refreshLiveData();
  view.peopleFilter = "all";
  view.activeScreen = "people";
  view.render();
  check("People shows person cards with role and counts", treeHasClass(view.contentEl, "life-os-person-card") && treeHasText(view.contentEl, "Engineer") && treeHasText(view.contentEl, "1 open · 0 to discuss · 1 overdue"));
  view.openPerson(personPath);
  check("person page shows properties, projects together, and meetings",
    treeHasClass(view.contentEl, "life-os-person-page") && treeHasClass(view.contentEl, "life-os-property-form") && treeHasText(view.contentEl, "Platform") && treeHasText(view.contentEl, "Jordan sync") && treeHasText(view.contentEl, "Meetings · 1"));
  const roleInput = findByLabel(view.contentEl, "Role of Jordan Lee");
  roleInput.value = "Staff engineer";
  roleInput.handlers.change();
  await settle();
  const meetsSelect = findByLabel(view.contentEl, "Meets of Jordan Lee");
  meetsSelect.value = "monthly";
  meetsSelect.handlers.change();
  await settle();
  check("person properties save from the page", metadata.get(personPath).role === "Staff engineer" && metadata.get(personPath).meets === "monthly", JSON.stringify(metadata.get(personPath)));
  findByLabel(view.contentEl, "New topic for Jordan Lee").value = "Review the API";
  findParentWithHandler(view.contentEl, "Add")?.handlers.click();
  await settle();
  check("a discussion topic lands in the task inbox", fileContents.get("08 Tasks/Tasks.md").includes("## Inbox\n- [ ] Review the API #discuss #p/jordan-lee ➕ 2026-09-09"), fileContents.get("08 Tasks/Tasks.md"));
  findByLabel(view.contentEl, "Log entry for Jordan Lee").value = "Talked about onboarding";
  findParentWithHandler(view.contentEl, "Log")?.handlers.click();
  await settle();
  check("meeting log entries append to the person note", fileContents.get(personPath).endsWith("- 2026-09-01 Created.\n- 2026-09-09 Talked about onboarding"), fileContents.get(personPath));
  absentPaths.add("05 People/Jordan Li.md");
  const personRename = view.openRenameDialog(fakeFiles.find((file) => file.path === personPath));
  personRename.values.title = "Jordan Li";
  await personRename.submit();
  check("renaming a person rewrites #p/ tags and attendee links",
    fileContents.get(syncPath).includes('"[[Jordan Li]]"') && fileContents.get(syncPath).includes("#p/jordan-li ") && view.activePersonPath === "05 People/Jordan Li.md", fileContents.get(syncPath));

  view.activeScreen = "sprint";
  view.activeSprintPath = platformSprint;
  view.render();
  const goalInput = findByLabel(view.contentEl, "Goal of Platform Sprint 1");
  goalInput.value = "Ship auth";
  goalInput.handlers.change();
  await settle();
  const endInput = findByLabel(view.contentEl, "End of Platform Sprint 1");
  endInput.value = "2026-09-27";
  endInput.handlers.change();
  await settle();
  check("sprint details save goal and dates", treeHasClass(view.contentEl, "life-os-sprint-details") && metadata.get(platformSprint).goal === "Ship auth" && metadata.get(platformSprint).end === "2026-09-27");

  view.expandedDocs = new Set([queuesAdr]);
  view.activeScreen = "docs";
  view.render();
  const addDecider = findByLabel(view.contentEl, "Deciders of ADR-0002 Use queues");
  addDecider.value = "Jordan Li";
  addDecider.handlers.change();
  await settle();
  check("doc property panel writes deciders as links", treeHasClass(view.contentEl, "life-os-doc-panel") && JSON.stringify(metadata.get(queuesAdr).deciders) === JSON.stringify(["[[Jordan Li]]"]), JSON.stringify(metadata.get(queuesAdr)));
  const propsDialog = view.openPropertiesDialog(fakeFiles.find((file) => file.path === queuesAdr));
  Object.assign(propsDialog.values, { project: "", status: "accepted" });
  await propsDialog.submit();
  check("properties dialog saves several changed keys", metadata.get(queuesAdr).project === "" && metadata.get(queuesAdr).status === "accepted" && JSON.stringify(metadata.get(queuesAdr).deciders) === JSON.stringify(["[[Jordan Li]]"]));

  fakeFiles.push(new TFile("Prompts/07 Meeting Prep.md"), new TFile("Prompts/15 Vault Health Check.md"));
  metadata.set("Prompts/07 Meeting Prep.md", { type: "prompt", purpose: "Prepare a meeting.", risk: "read-only", writes: "none" });
  metadata.set("Prompts/15 Vault Health Check.md", { type: "prompt", purpose: "Check the vault.", risk: "edit" });
  view.activeScreen = "ai";
  view.render();
  check("AI screen lists the prompt library", treeHasClass(view.contentEl, "life-os-prompt-card") && treeHasText(view.contentEl, "Meeting Prep") && treeHasText(view.contentEl, "2 prompts"));

  // 1.5: task panel, task views, sprint tabs, projects by quarter, review cards, routing.
  check("task edit can move a task to another project", sandbox.editTaskLine("- [ ] A #project/x #sprint/s", { project: "y" }) === "- [ ] A #sprint/s #project/y" && sandbox.editTaskLine("- [ ] A #project/x", { project: "" }) === "- [ ] A");
  const viewFixture = sandbox.taskViews([
    { text: "a", due: "2026-09-10", path: "p.md" },
    { text: "b", due: "2026-09-16", path: "p.md" },
    { text: "c", due: "2026-09-30", path: "p.md" },
    { text: "d", discuss: true, owners: ["jo"], path: "p.md" },
    { text: "e", high: true, path: "p.md" },
    { text: "f", path: "08 Tasks/Tasks.md" },
    { text: "g", path: "08 Tasks/Tasks.md", projects: ["x"] },
  ], [{ text: "h", doneDate: "2026-09-05" }, { text: "i", doneDate: "2026-08-01" }], "2026-09-09", { jo: "Jo" });
  check("task views mirror the Task Dashboard queries",
    viewFixture.next7.map((group) => group.label).join() === "2026-09-10,2026-09-16" && viewFixture.discuss[0].label === "Jo" &&
    viewFixture.high[0].tasks.map((task) => task.text).join() === "e" && viewFixture.inbox[0].tasks.map((task) => task.text).join() === "f" &&
    viewFixture.done.length === 1 && viewFixture.done[0].tasks[0].text === "h");
  const life = sandbox.mementoModel("1990-05-01", 80, "2026-09-09");
  const qstats = sandbox.questionStats([{ data: { dq_a: 8 } }, { data: { dq_a: 6, dq_b: true } }, { data: null }], [{ key: "dq_a", text: "A?" }, { key: "dq_b", text: "B?" }]);
  check("memento and question stats compute from plain data", life.age === 36 && life.years === 80 && life.weeksLived > 1800 && life.weeksLeft === life.totalWeeks - life.weeksLived && sandbox.mementoModel("", 80, "2026-09-09") === null &&
    qstats[0].average === 7 && qstats[0].answered === 2 && qstats[1].average === null);
  check("recurrence is read from the task line", sandbox.taskRecurrence("- [ ] Standup 🔁 every weekday 📅 2026-09-10") === "every weekday");

  const panelFile = "04 Projects/Platform.md";
  fileContents.set(panelFile, "## Tasks\n- [ ] Write spec #project/platform 📅 2026-09-12\n- [ ] Review spec #project/platform");
  listItems.set(panelFile, [taskItem(" ", 1), taskItem(" ", 2)]);
  plugin.settings.taskClick = "panel";
  await view.refreshLiveData();
  const findClass = (element, className) => String(element.options?.cls || "").split(/\s+/).includes(className) ? element : element.children.map((child) => findClass(child, className)).find(Boolean);
  view.activeScreen = "focus";
  view.focusView = "attention";
  view.openTaskTarget(view.allTasks().find((task) => task.display === "Write spec"));
  check("clicking a task opens the side panel", treeHasClass(view.contentEl, "life-os-task-panel") && findByLabel(view.contentEl, "Task text")?.value === "Write spec");
  const dueField = findByLabel(view.contentEl, "Task due date");
  dueField.value = "2026-09-20";
  dueField.handlers.change();
  await settle();
  check("the panel rewrites the due date and still shows the task", fileContents.get(panelFile).split("\n")[1] === "- [ ] Write spec #project/platform 📅 2026-09-20" && findByLabel(view.contentEl, "Task text")?.value === "Write spec", fileContents.get(panelFile));
  const waitSelect = findByLabel(view.contentEl, "Add a task this one waits on");
  waitSelect.value = `${panelFile}::3`;
  waitSelect.handlers.change();
  await settle();
  const panelLines = fileContents.get(panelFile).split("\n");
  const depId = panelLines[2].match(/🆔 ([a-z0-9]+)$/)?.[1];
  check("the panel adds a dependency with Tasks ids", Boolean(depId) && panelLines[1].endsWith(`⛔ ${depId}`), panelLines.join(" | "));
  const projectSelect = findByLabel(view.contentEl, "Task project");
  projectSelect.value = "";
  projectSelect.handlers.change();
  await settle();
  check("the panel moves a task out of its project", !fileContents.get(panelFile).split("\n")[1].includes("#project/"), fileContents.get(panelFile));
  findText(findClass(view.contentEl, "life-os-task-panel"), "Done").handlers.click();
  await settle();
  check("the panel status control completes the task", fileContents.get(panelFile).split("\n")[1].startsWith("- [x] Write spec") && treeHasClass(view.contentEl, "life-os-task-panel"), fileContents.get(panelFile));
  view.closeTask();
  check("closing the panel removes it", !treeHasClass(view.contentEl, "life-os-task-panel"));
  plugin.settings.taskClick = "note";
  view.openTaskTarget(view.allTasks().find((task) => task.display === "Review spec"));
  check("the setting can send task clicks to the note", !view.activeTaskKey);
  plugin.settings.taskClick = "panel";

  const reindexMock = (filePath) => listItems.set(filePath, fileContents.get(filePath).split("\n").flatMap((line, index) => { const match = line.match(/^- \[(.)\]/); return match ? [taskItem(match[1], index)] : []; }));
  reindexMock("08 Tasks/Tasks.md");
  reindexMock(panelFile);
  await view.refreshLiveData();
  view.focusView = "discuss";
  view.render();
  check("Tasks screen shows the discussion view by person", treeHasText(view.contentEl, "To discuss") && treeHasText(view.contentEl, "Jordan Li · 1"));
  view.focusView = "done";
  view.render();
  check("Tasks screen shows done this week", treeHasText(view.contentEl, "Done this week") && treeHasClass(view.contentEl, "life-os-task-row"));
  view.focusView = "attention";

  view.activeScreen = "sprint";
  view.sprintTab = "all";
  view.render();
  check("Sprint screen lists all sprints", treeHasClass(view.contentEl, "life-os-sprint-card") && treeHasText(view.contentEl, "Platform Sprint 1"));
  view.sprintTab = "across";
  view.render();
  check("Sprint screen shows work across sprints", treeHasText(view.contentEl, "Across sprints") && treeHasText(view.contentEl, "Blocked · 0"));
  view.sprintTab = "board";

  metadata.set(platformPath, { ...metadata.get(platformPath), quarter: "2026-Q3" });
  view.activeScreen = "projects";
  view.projectFilter = "all";
  view.projectView = "quarter";
  view.render();
  check("Projects group by quarter", treeHasText(view.contentEl, "2026-Q3 · 1") && treeHasClass(view.contentEl, "life-os-quarter-group"));
  view.projectView = "cards";
  view.projectFilter = "open";

  metadata.set(configPath, { ...metadata.get(configPath), birthdate: "1990-05-01", life_expectancy: 80 });
  plugin.settings.showPersonal = true;
  view.activeScreen = "review";
  view.render();
  check("Review shows daily questions and memento mori", treeHasClass(view.contentEl, "life-os-question-bars") && treeHasClass(view.contentEl, "life-os-memento") && treeHasText(view.contentEl, "8 weeks"));
  plugin.settings.showPersonal = false;

  view.activeScreen = "today";
  view.render();
  const findClickable = (element, text) => (element.handlers?.click && treeHasText(element, text) ? element : element.children.map((child) => findClickable(child, text)).find(Boolean));
  findClickable(view.contentEl, "All tasks")?.handlers.click();
  check("shortcuts open Dev OS screens, not Markdown dashboards", view.activeScreen === "focus" && !source.includes('path: "00 Dashboards/Task Dashboard.md"') && !source.includes('path: "00 Dashboards/Sprint Dashboard.md"'));
  view.activeScreen = "home";
  await view.afterCreate(new TFile(platformSprint), "sprint");
  const sprintRoute = view.activeScreen === "sprint" && view.activeSprintPath === platformSprint;
  await view.afterCreate(new TFile(queuesAdr), "adr");
  check("new notes open in their Dev OS screen", sprintRoute && view.activeScreen === "docs" && view.expandedDocs.has(queuesAdr));

  // 1.6: meeting edit, people picker, discard, active commitments, people search and paging, new task.
  const editNote = sandbox.buildMeetingNote({ title: "Planning", date: "2026-09-20", time: "", project: "Platform", projectSlug: "platform", attendees: ["Jordan Li", "Guest"], agenda: "Scope", notes: "", decisions: ["Use queues"], actions: [{ text: "Draft plan", owner: "", due: "2026-09-25" }, { text: "Book room", owner: "", due: "" }], today })
    .replace("- [ ] Draft plan #project/platform 📅 2026-09-25 ➕ 2026-09-09", "- [x] Draft plan #project/platform 📅 2026-09-25 ➕ 2026-09-09 ✅ 2026-09-10");
  const parsedMeeting = sandbox.parseMeetingNote(editNote, { date: "2026-09-20", kind: "planning", project: "[[Platform]]", attendees: ["[[Jordan Li]]", "[[Guest]]"] }, "2026-09-20 Planning", ["Jordan Li"]);
  check("saved minutes parse back into a composer draft",
    parsedMeeting.title === "Planning" && parsedMeeting.project === "Platform" && parsedMeeting.kind === "planning" && JSON.stringify(parsedMeeting.attendees) === JSON.stringify(["Jordan Li"]) && parsedMeeting.others === "Guest" &&
    parsedMeeting.agenda === "- Scope" && JSON.stringify(parsedMeeting.decisions) === JSON.stringify(["Use queues"]) &&
    parsedMeeting.actions.length === 2 && parsedMeeting.actions[0].due === "2026-09-25" && parsedMeeting.actions[0].text === "Draft plan", JSON.stringify(parsedMeeting));
  parsedMeeting.actions[1].owner = "jordan-li";
  parsedMeeting.actions.push({ text: "Send notes", owner: "", due: "" });
  parsedMeeting.decisions = ["Use queues", "Ship on Friday"];
  const sectionsOut = sandbox.meetingSectionText(parsedMeeting, "platform", "2026-09-21");
  check("editing minutes keeps unchanged action lines and edits the rest",
    sectionsOut.actions === "- [x] Draft plan #project/platform 📅 2026-09-25 ➕ 2026-09-09 ✅ 2026-09-10\n- [ ] Book room #project/platform #p/jordan-li ➕ 2026-09-09\n- [ ] Send notes #project/platform ➕ 2026-09-21" &&
    sectionsOut.decisions === "- Use queues\n- Ship on Friday" && sectionsOut.agenda === "- Scope", JSON.stringify(sectionsOut));
  check("known values list each value once, sorted", JSON.stringify(sandbox.knownValues([{ company: "Beta" }, { company: "Acme" }, { company: " Acme " }, {}], "company")) === JSON.stringify(["Acme", "Beta"]));

  const minutesPath = "10 Meetings/2026-09-20 Planning.md";
  fakeFiles.push(new TFile(minutesPath));
  metadata.set(minutesPath, { type: "meeting", kind: "planning", date: "2026-09-20", project: "[[Platform]]", attendees: ["[[Jordan Li]]"] });
  fileContents.set(minutesPath, editNote);
  view.activeScreen = "meetings";
  view.expandedMeetings = new Set([minutesPath]);
  view.render();
  findParentWithHandler(view.contentEl, "Edit minutes")?.handlers.click();
  await settle();
  check("Edit minutes opens the composer prefilled", view.editingMeeting === minutesPath && treeHasClass(view.contentEl, "is-editing") && findByLabel(view.contentEl, "Decision 1")?.value === "Use queues");
  const editDraft = view.meetingDraft(`edit:${minutesPath}`);
  editDraft.decisions[0] = "Use a queue per tenant";
  editDraft.actions[1].owner = "jordan-li";
  await view.saveMeetingEdit(`edit:${minutesPath}`);
  const editedMinutes = fileContents.get(minutesPath);
  check("saving edited minutes rewrites decisions and actions and keeps the rest",
    editedMinutes.includes("## Decisions\n- Use a queue per tenant\n") && editedMinutes.includes("- [x] Draft plan #project/platform 📅 2026-09-25 ➕ 2026-09-09 ✅ 2026-09-10") &&
    editedMinutes.includes("- [ ] Book room #project/platform #p/jordan-li ➕ 2026-09-09") && editedMinutes.includes("# Planning") && editedMinutes.includes("## Agenda\n- Scope") && !view.editingMeeting, editedMinutes);

  view.composerOpen = true;
  const freshDraft = view.meetingDraft("global");
  freshDraft.title = "Throwaway";
  view.render();
  const attendeeInput = findByLabel(view.contentEl, "Add attendee");
  attendeeInput.value = "jordan li";
  attendeeInput.handlers.change();
  findByLabel(view.contentEl, "Add attendee").value = "Guest Speaker";
  findByLabel(view.contentEl, "Add attendee").handlers.keydown({ key: "Enter", preventDefault() {} });
  check("the attendee picker adds people and free-text guests", JSON.stringify(view.meetingDraft("global").attendees) === JSON.stringify(["Jordan Li"]) && view.meetingDraft("global").others === "Guest Speaker" && !treeHasClass(view.contentEl, "is-toggle"));
  findParentWithHandler(view.contentEl, "Discard draft")?.handlers.click();
  await settle();
  const drafts = plugin.settings.meetingDrafts || {};
  check("Discard draft deletes the draft and closes the composer", !view.composerOpen && !drafts.global && !treeHasClass(view.contentEl, "life-os-composer"));

  view.activeScreen = "focus";
  view.focusView = "attention";
  view.render();
  const findCard = (element) => (String(element.options?.cls || "").includes("life-os-record-card") && treeHasText(element, "Platform") ? element : element.children.map(findCard).find(Boolean));
  findCard(view.contentEl)?.handlers.click();
  check("Active commitments opens the project page", view.activeScreen === "project" && view.activeProjectPath === platformPath);

  for (let index = 1; index <= 14; index += 1) {
    const personFile = `05 People/Person ${String(index).padStart(2, "0")}.md`;
    fakeFiles.push(new TFile(personFile));
    metadata.set(personFile, { type: "person", company: index % 2 ? "Acme" : "Beta", role: "Engineer" });
  }
  view.activeScreen = "people";
  view.peopleFilter = "all";
  view.peopleQuery = "";
  view.peoplePage = 0;
  view.render();
  const peopleTotal = view.data.people().length;
  check("People pages through long lists", treeHasClass(view.contentEl, "life-os-pager") && treeHasText(view.contentEl, `1-12 of ${peopleTotal}`));
  view.peoplePage = 1;
  view.render();
  check("People shows the next page", treeHasText(view.contentEl, `13-${peopleTotal} of ${peopleTotal}`));
  const searchBox = findByLabel(view.contentEl, "Search people");
  searchBox.value = "acme";
  searchBox.handlers.input();
  check("People search filters by metadata", !treeHasClass(view.contentEl, "life-os-pager") && treeHasText(view.contentEl, "Person 01") && !treeHasText(view.contentEl, "Person 02"));
  view.peopleQuery = "";
  view.openPerson("05 People/Person 01.md");
  const companyInput = findByLabel(view.contentEl, "Company or team of Person 01");
  check("Company or team suggests values already used", companyInput?.options.attr.list === "devos-suggest-company" && treeHasText(view.contentEl, "") !== null);

  const taskForm = view.openNewTaskForm();
  Object.assign(taskForm.values, { text: "Ship docs", discuss: true, high: true });
  await taskForm.submit();
  const taskForm2 = view.openNewTaskForm();
  Object.assign(taskForm2.values, { text: "Plan launch", project: "Platform", due: "2026-09-30" });
  await taskForm2.submit();
  check("New task writes to the inbox or the chosen project",
    fileContents.get("08 Tasks/Tasks.md").includes("- [ ] Ship docs #discuss ⏫ ➕ 2026-09-09") && fileContents.get(platformPath).includes("- [ ] Plan launch #project/platform 📅 2026-09-30 ➕ 2026-09-09"), fileContents.get(platformPath));

  // 1.7: supervisor hierarchy.
  const chartFixture = sandbox.orgChart([
    { title: "Ana", supervisor: "" }, { title: "Ben", supervisor: "[[Ana]]" }, { title: "Cy", supervisor: "[[Ana]]" },
    { title: "Dee", supervisor: "[[Ben]]" }, { title: "Eve", supervisor: "[[Ghost]]" }, { title: "Fox", supervisor: "[[Gus]]" }, { title: "Gus", supervisor: "[[Fox]]" },
  ]);
  check("org chart builds reporting lines and isolates bad links",
    JSON.stringify(chartFixture.reportsOf.get("Ana")) === JSON.stringify(["Ben", "Cy"]) && JSON.stringify(chartFixture.chain("Dee")) === JSON.stringify(["Ben", "Ana"]) &&
    JSON.stringify(chartFixture.descendants("Ana")) === JSON.stringify(["Ben", "Cy", "Dee"]) && chartFixture.missing[0].supervisor === "Ghost" &&
    chartFixture.cycles.length === 1 && chartFixture.roots.includes("Fox") && chartFixture.roots.includes("Eve") && !chartFixture.roots.includes("Dee"));
  check("new person notes and patches carry the supervisor link",
    sandbox.buildPersonNote({ title: "Dee", supervisor: "Ben", today }).includes('supervisor: "[[Ben]]"') &&
    JSON.stringify(sandbox.propertyPatch(schemas.person, { supervisor: "[[Ana]]" }, { supervisor: "Ben" })) === JSON.stringify({ supervisor: "[[Ben]]" }));
  const orgHealth = sandbox.runHealthCheck({ notes: [
    { path: "a.md", title: "A", type: "person", supervisor: "B" }, { path: "b.md", title: "B", type: "person", supervisor: "A" }, { path: "c.md", title: "C", type: "person", supervisor: "Nobody" },
  ] }).map((issue) => issue.code);
  check("health check reports supervisor loops and missing supervisors", orgHealth.includes("supervisor-cycle") && orgHealth.includes("supervisor-missing"));

  const personPathFor = (index) => `05 People/Person ${String(index).padStart(2, "0")}.md`;
  metadata.set(personPathFor(2), { ...metadata.get(personPathFor(2)), supervisor: "[[Person 01]]" });
  metadata.set(personPathFor(3), { ...metadata.get(personPathFor(3)), supervisor: "[[Person 01]]" });
  metadata.set(personPathFor(4), { ...metadata.get(personPathFor(4)), supervisor: "[[Person 02]]" });
  view.openPerson(personPathFor(2));
  check("person page shows the reporting line above and below", treeHasClass(view.contentEl, "life-os-person-org") && treeHasText(view.contentEl, "Person 01") && treeHasText(view.contentEl, "Person 04") && treeHasClass(view.contentEl, "is-current"));
  const candidates = view.supervisorOptions(fakeFiles.find((file) => file.path === personPathFor(2)));
  check("a person cannot report to themselves or their own reports", !candidates.includes("Person 02") && !candidates.includes("Person 04") && candidates.includes("Person 05"));
  const supervisorInput = findByLabel(view.contentEl, "Supervisor of Person 02");
  supervisorInput.value = "person 04";
  supervisorInput.handlers.change();
  await settle();
  check("a looping supervisor is refused", metadata.get(personPathFor(2)).supervisor === "[[Person 01]]");
  findByLabel(view.contentEl, "Supervisor of Person 02").value = "Person 05";
  findByLabel(view.contentEl, "Supervisor of Person 02").handlers.change();
  await settle();
  check("the supervisor saves as a link", metadata.get(personPathFor(2)).supervisor === "[[Person 05]]");
  view.activeScreen = "people";
  view.peopleLayout = "org";
  view.render();
  check("People shows the org chart", treeHasClass(view.contentEl, "life-os-org-tree") && treeHasText(view.contentEl, "Person 05") && treeHasText(view.contentEl, "Not in a reporting line · " + (view.org().roots.length - view.org().roots.filter((root) => (view.org().reportsOf.get(root) || []).length).length)));
  view.peopleLayout = "cards";
  const personForm = view.openForm("person", { supervisor: "Person 05" });
  Object.assign(personForm.values, { title: "Person 15", supervisor: "nobody real" });
  absentPaths.add("05 People/Person 15.md");
  await personForm.submit();
  const refusedPerson = !fakeFiles.some((file) => file.path === "05 People/Person 15.md");
  personForm.values.supervisor = "person 05";
  await personForm.submit();
  check("New person sets a supervisor from the list only", refusedPerson && fileContents.get("05 People/Person 15.md")?.includes('supervisor: "[[Person 05]]"'));
  const personDelete = view.openDeleteDialog(fakeFiles.find((file) => file.path === personPathFor(2)));
  check("deleting a supervisor offers to move their reports", personDelete.values.reassign === true);
  Object.assign(personDelete.values, { confirm: "Person 02" });
  await personDelete.submit();
  check("their reports move to the next supervisor up", metadata.get(personPathFor(4)).supervisor === "[[Person 05]]");

  if (process.env.LIFE_OS_PREVIEW) {
    // Generated visual-test artifact uses synthetic fixtures only.
    for (let i = 0; i < 30; i += 1) {
      const date = new Date("2026-09-09T12:00:00Z"); date.setUTCDate(date.getUTCDate() - i);
      const filePath = `01 Journal/Daily/${date.toISOString().slice(0, 10)}.md`;
      if (!fakeFiles.some((file) => file.path === filePath)) fakeFiles.push(new TFile(filePath));
      metadata.set(filePath, { dq_goals: 4 + i % 7, habit_journal: i % 3 !== 0, habit_reading: i % 4 !== 0, habit_exercise: i % 2 === 0 });
    }
    fakeFiles.push(new TFile("02 Retreats/2026-Q3 Personal Retreat.md"));
    metadata.set("02 Retreats/2026-Q3 Personal Retreat.md", { wheel_health: 7, wheel_relationships: 8, wheel_growth: 6, wheel_career: 7, wheel_fun: 5, wheel_meaning: 8 });
    view.activeScreen = "home"; view.render();
    fs.writeFileSync(process.env.LIFE_OS_PREVIEW, `<!doctype html><html><head><meta charset="utf-8"><title>Life OS visual test, synthetic data</title><style>
      :root { --background-primary:#202020; --background-secondary:#292929; --text-normal:#ddd; --text-muted:#aaa; --text-faint:#888; --color-green:#7aa995; --color-red:#df7777; }
      body { margin:0; background:#202020; color:#ddd; font-family:Arial,sans-serif; } button { height:30px; border-radius:18px; white-space:nowrap; padding:4px 10px; } .fixture-pane { width:100%; }
      ${css}</style></head><body><div class="fixture-pane">${view.contentEl.toHTML()}</div></body></html>`);
  }
} catch (error) {
  check("runtime smoke", false, error.stack || error.message);
}

finish();

function finish() {
  const failed = results.filter((result) => !result.ok);
  for (const result of failed) {
    console.error(`FAIL ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
  }
  console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
