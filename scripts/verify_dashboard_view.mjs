// Real browser DOM, synthetic vault only. No personal notes or providers.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<html><body style="margin:0;font:14px Arial;background:#17191c;color:#ddd"><div id="root" style="height:100vh;overflow:auto"></div><div role="note" style="position:fixed;bottom:0;z-index:9999;background:#10242d;padding:4px 8px;font-size:10px;pointer-events:none">SYNTHETIC FIXTURE · No live vault or provider data</div></body></html>');
  await page.addStyleTag({ content: ':root{--background-primary:#17191c;--background-secondary:#202328;--text-normal:#ddd;--text-muted:#a5abb3;--text-faint:#777;--background-modifier-border:#393d44;--interactive-accent:#ff906b;--font-interface:Arial;--font-text:Arial}button,input,select{font:inherit;color:inherit;background:#252a31;border:1px solid #454c55}button{cursor:pointer}' + fs.readFileSync('.obsidian/plugins/life-os-app/styles.css','utf8') });
  await page.evaluate(async (source) => {
    HTMLElement.prototype.empty=function(){this.replaceChildren();};
    HTMLElement.prototype.addClass=function(...names){this.classList.add(...names);};
    HTMLElement.prototype.setText=function(text){this.textContent=text;};
    HTMLElement.prototype.createEl=function(tag,options={}){const el=document.createElement(tag);if(options.cls)el.className=options.cls;if(options.text)el.textContent=options.text;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);this.appendChild(el);return el;};
    HTMLElement.prototype.createDiv=function(options){return this.createEl('div',options);};
    HTMLElement.prototype.createSpan=function(options){return this.createEl('span',options);};
    const now='2026-09-09';
    function moment(value=now){const date=new Date(`${value}T12:00:00Z`);return {clone:()=>moment(date.toISOString().slice(0,10)),subtract(n){date.setUTCDate(date.getUTCDate()-n);return this;},format(f){const iso=date.toISOString().slice(0,10);return ({'YYYY-MM-DD':iso,'YYYY-MM':iso.slice(0,7),'gggg-[W]ww':'2026-W37','YYYY-[Q]Q':'2026-Q3','[Week] ww':'Week 37','D MMM':`${date.getUTCDate()} Sep`,'ddd':['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()]})[f]||iso;}};}
    moment.localeData=()=>({firstDayOfWeek:()=>1});
    class TFile{constructor(path){this.path=path;this.basename=path.split('/').pop().replace(/\.md$/,'');this.extension='md';}}
    class Component{constructor(){this.disposers=[];}registerDomEvent(el,event,fn,options){el.addEventListener(event,fn,options);this.disposers.push(()=>el.removeEventListener(event,fn,options));}registerEvent(){}addChild(child){child.onload?.();}removeChild(child){child.onunload?.();child.disposers.forEach(fn=>fn());}}
    class Modal{constructor(app){this.app=app;this.contentEl=document.createElement('div');this.contentEl.className='modal-fixture';this.contentEl.style.cssText='position:fixed;inset:40px;z-index:99;background:#202328;padding:20px;overflow:auto';}open(){document.body.appendChild(this.contentEl);this.onOpen();window.lastModal=this;}close(){this.onClose?.();this.contentEl.remove();}}
    class ItemView extends Component{constructor(leaf){super();this.app=leaf.app;this.contentEl=document.querySelector('#root');}}
    const files=new Map(), metadata=new Map(), contents=new Map();
    const add=(path,data={},body='')=>{files.set(path,new TFile(path));metadata.set(path,{frontmatter:data,listItems:body.split('\n').flatMap((line,i)=>{const m=line.match(/^- \[(.)\]/);return m?[{task:m[1],position:{start:{line:i}}}]:[];})});contents.set(path,body);};
    add('Meta/Dev OS Config.md',{questions:[{key:'dq_focus',text:'Did I focus on what matters?'}],habits:['habit_walk','habit_read']});
    add('00 Dashboards/Setup.md',{status:'open'});
    for(const name of ['Assistant','Task Dashboard','Projects Dashboard','Personal Dashboard','Boards'])add(`00 Dashboards/${name}.md`);
    for(let i=0;i<20;i++){const d=new Date('2026-09-09T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);add(`01 Journal/Daily/${d.toISOString().slice(0,10)}.md`,{dq_focus:4+i%7,habit_walk:i%3!==0,habit_read:i%2===0});}
    add('02 Retreats/2026-Q3 Personal Retreat.md',{wheel_health:7,wheel_work:6,wheel_relationships:8});
    add('08 Tasks/Tasks.md',{},'- [ ] Resolve fixture overdue task 📅 2026-09-08\n- [ ] Pick a focus ⏫');
    add('05 People/Synthetic person.md',{type:'person'},'- [ ] Discuss fixture #p/synthetic-person #discuss');
    add('07 Library/Book Notes/Synthetic book.md',{type:'book'});
    add('07 Library/Book Notes/Finished book.md',{type:'book',status:'completed'});
    add('07 Library/Book Notes/Sample book.md',{type:'book',status:'reading',tags:['example']});
    add('07 Library/Source.md',{type:'source',cover:'https://example.invalid/cover.png'});
    add('06 Writing/Articles/Article Board.md',{'kanban-plugin':'board'},'## Ideas\n## Drafting');
    add('04 Projects/Sprints/Synthetic project Sprint 1.md',{type:'sprint',project:'[[Synthetic project]]',number:1,start:'2026-09-07',end:'2026-09-18',goal:'Fixture goal',status:'active'});
    add('06 Writing/Releases/Synthetic project 1.0.md',{type:'release',version:'1.0',project:'[[Synthetic project]]',date:'2026-09-30',status:'planned'},'# Synthetic project 1.0\n\n## Release notes\nold');
    add('04 Projects/Synthetic project.md',{type:'project',status:'active',priority:'high',started:'2026-08-20',due:'2026-10-01',milestones:['2026-09-20 Beta'],stakeholders:['[[Synthetic person]]']},'## Tasks\n- [ ] Review synthetic plan #project/synthetic-project 📅 2026-09-09\n- [ ] Draft outline #project/synthetic-project ⏳ 2026-09-10\n- [/] Build the fixture #project/synthetic-project #sprint/synthetic-project-sprint-1 #release/synthetic-project-1-0 🆔 fix001\n- [ ] Wait on vendor #project/synthetic-project #sprint/synthetic-project-sprint-1 #blocked ⛔ fix001\n- [x] Agree scope #project/synthetic-project #sprint/synthetic-project-sprint-1 #release/synthetic-project-1-0 #fix ✅ 2026-09-08\n- [ ] Review the contract #project/synthetic-project #p/synthetic-person ➕ 2026-09-01\n- [ ] Waiting on nothing #project/synthetic-project ⛔ nope');
    add('10 Meetings/2026-09-08 Synthetic kickoff.md',{type:'meeting',kind:'meeting',date:'2026-09-08',project:'[[Synthetic project]]',attendees:['[[Synthetic person]]']},'# Kickoff\n## Decisions\n- Use the fixture database\n## Action items\n- [ ] Send fixture notes #project/synthetic-project 📅 2026-09-11');
    add('06 Writing/Decisions/ADR-0001 Fixture decision.md',{type:'adr',adr_number:1,status:'proposed',date:'2026-09-08',project:'[[Synthetic project]]'});
    add('07 Library/Clippings/Fixture clip.md',{type:'clipping',status:'inbox',source:'https://example.invalid/clip',site:'example.invalid',clipped:'2026-09-09'});
    window.opened=[];window.commands=[];
    const plugins={'agent-client':{settings:{autoAllowPermissions:false}},'obsidian-local-rest-api':{settings:{}}};
    window.writes=[];
    const reindex=(path)=>{const body=contents.get(path)||'';metadata.get(path).listItems=body.split('\n').flatMap((line,i)=>{const m=line.match(/^- \[(.)\]/);return m?[{task:m[1],position:{start:{line:i}}}]:[];});};
    const app={vault:{getMarkdownFiles:()=>[...files.values()],getFiles:()=>[...files.values()],getAbstractFileByPath:p=>files.get(p),cachedRead:async f=>contents.get(f.path)||'',read:async f=>contents.get(f.path)||'',on(){},
      process:async(f,fn)=>{const next=fn(contents.get(f.path)||'');contents.set(f.path,next);reindex(f.path);window.writes.push(['process',f.path]);return next;},
      create:async(p,c)=>{const fm={};for(const line of (c.match(/^---\n([\s\S]*?)\n---/)?.[1]||'').split('\n')){const m=line.match(/^(\w+): (.+)$/);if(m)fm[m[1]]=m[2].startsWith('"')?JSON.parse(m[2]):m[2];}add(p,fm,c);window.writes.push(['create',p]);return files.get(p);},createFolder:async()=>{}},
      fileManager:{processFrontMatter:async(f,fn)=>{fn(metadata.get(f.path).frontmatter);window.writes.push(['frontmatter',f.path]);},renameFile:async(f,t)=>{window.writes.push(['rename',f.path,t]);for(const store of [metadata,contents])if(store.has(f.path)){store.set(t,store.get(f.path));store.delete(f.path);}files.delete(f.path);files.set(t,new TFile(t));},trashFile:async(f)=>{window.writes.push(['trash',f.path]);files.delete(f.path);}},metadataCache:{getFileCache:f=>metadata.get(f.path),on(){}},plugins:{getPlugin:id=>plugins[id]},workspace:{getLeaf:()=>({openFile:async(f,o)=>window.opened.push({path:f.path,options:o})}),revealLeaf:async()=>{}},commands:{commands:{}}};
    const module={exports:{}};
    const View=new Function('require','module',`${source};return LifeOSHomeView;`)(()=>({Component,ItemView,TFile,Plugin:class{},PluginSettingTab:class{},Setting:class{},Modal,Notice:class{},moment,setIcon(){}}),module);
    const plugin={runCommand:(id)=>{window.commands.push(id);return true;},openCapture(){window.commands.push('capture');},activateView(){}};
    window.view=new View({app},plugin);await window.view.onOpen();
  }, fs.readFileSync('.obsidian/plugins/life-os-app/main.js','utf8'));
  assert.equal(await page.getByRole('note').count(),1);
  assert.equal(await page.locator('.life-os-analytics').count(),0);
  assert.equal(await page.locator('.life-os-brain-preview canvas').count(),1);
  assert.equal(await page.locator('.life-os-brain-preview canvas').getAttribute('tabindex'),'-1');
  assert.equal(await page.locator('.life-os-brain-preview .life-os-brain-note').count(),0);
  assert.ok(await page.locator('.life-os-task-row').count() <= 3);
  await page.locator('.life-os-task-row').first().click();
  assert.ok(await page.evaluate(()=>window.opened.at(-1)?.options?.eState?.line >= 0));
  for(const screen of ['home','today','sprint','projects','meetings','docs','inbox','roadmap','waiting','config','plan','review','focus','people','library','ai']){
    await page.evaluate((s)=>{window.view.activeScreen=s;window.view.render();},screen);
    assert.ok(await page.locator('.life-os-shell').innerText());
    await page.screenshot({path:`/tmp/life-os-${screen}-candidate.png`,fullPage:true});
    if(screen==='home'){
      assert.equal(await page.locator('.life-os-shell > .life-os-summary, .life-os-shell > .life-os-ai-panel').count(),0);
      assert.ok(await page.evaluate(()=>{
        const children=[...document.querySelector('.life-os-shell').children];
        return children.slice(1).every((child,i)=>child.getBoundingClientRect().top-children[i].getBoundingClientRect().bottom>=19);
      }));
      await page.evaluate(()=>{const root=document.querySelector('#root');root.scrollTop=root.scrollHeight;});
      await page.screenshot({path:'/tmp/life-os-home-lower-candidate.png'});
      await page.evaluate(()=>document.querySelector('#root').scrollTop=0);
    }
    if(screen==='today'){
      assert.equal(await page.locator('.life-os-standup').count(),1);
      assert.ok((await page.locator('.life-os-standup-column.is-alert').innerText()).includes('Wait on vendor'));
    }
    if(screen==='projects'){
      assert.ok((await page.locator('.life-os-project-card .life-os-record-metrics').first().textContent()).includes('7 open · 1 done'),await page.locator('.life-os-project-card .life-os-record-metrics').first().textContent());
      await page.locator('.life-os-project-card-open').first().click();
      assert.equal(await page.locator('.life-os-project-page').count(),1);
      assert.equal(await page.locator('.life-os-nav-button[aria-current="page"]').innerText(),'Projects');
      await page.screenshot({path:'/tmp/life-os-project-overview.png',fullPage:true});
      await page.getByRole('tab',{name:/^Tasks/}).click();
      await page.getByLabel('Task description',{exact:true}).fill('Fixture task from the page');
      await page.getByLabel('Due',{exact:true}).fill('2026-09-20');
      await page.locator('.life-os-task-form').getByRole('button',{name:'Add task'}).click();
      await page.waitForFunction(()=>document.querySelector('.life-os-tab-panel')?.innerText.includes('Fixture task from the page'));
      await page.screenshot({path:'/tmp/life-os-project-tasks.png',fullPage:true});
      await page.getByRole('checkbox',{name:/Complete: Review synthetic plan/}).click();
      await page.waitForFunction(()=>window.writes.length>=2);
      await page.getByRole('tab',{name:/^Meetings/}).click();
      await page.getByRole('button',{name:'New meeting minutes'}).click();
      await page.getByLabel('Title',{exact:true}).fill('Fixture review');
      await page.getByRole('button',{name:'Synthetic person',exact:true}).click();
      await page.getByLabel('Decision 1',{exact:true}).fill('Keep the fixture small');
      await page.getByLabel('Action item 1',{exact:true}).fill('Write the follow-up');
      await page.screenshot({path:'/tmp/life-os-project-composer.png',fullPage:true});
      await page.getByRole('button',{name:'Save minutes'}).click();
      await page.waitForFunction(()=>window.writes.some(w=>w[0]==='create'));
      assert.ok(await page.evaluate(()=>window.writes.find(w=>w[0]==='create')[1]==='10 Meetings/2026-09-09 Fixture review.md'));
      await page.waitForSelector('.life-os-meeting-card.is-open');
      await page.screenshot({path:'/tmp/life-os-project-meetings.png',fullPage:true});
      await page.evaluate(()=>{window.view.activeScreen='projects';window.view.render();});
    }
    if(screen==='sprint'){
      assert.equal(await page.locator('.life-os-board-column').count(),3);
      assert.equal(await page.locator('.life-os-board-column.is-doing .life-os-board-card').count(),1);
      await page.locator('.life-os-board-column.is-todo .life-os-board-card').first().getByRole('button',{name:'Start'}).click();
      await page.waitForFunction(()=>document.querySelectorAll('.life-os-board-column.is-doing .life-os-board-card').length===2);
      await page.screenshot({path:'/tmp/life-os-sprint-board.png',fullPage:true});
    }
    if(screen==='inbox'){
      assert.equal(await page.locator('.life-os-clip-card').count(),1);
      await page.getByRole('button',{name:'Read'}).click();
      await page.waitForFunction(()=>window.writes.some(w=>w[0]==='frontmatter'&&w[1].includes('Clippings')));
      assert.equal(await page.locator('.life-os-clip-card').count(),0);
    }
    if(screen==='config'){
      assert.equal(await page.getByRole('button',{name:'Save configuration'}).isDisabled(),true);
      await page.getByLabel('Meetings folder',{exact:true}).fill('Work/Meetings');
      await page.getByLabel('Meetings folder',{exact:true}).press('Tab');
      await page.waitForFunction(()=>document.querySelector('.life-os-config-changes')?.innerText.includes('Folder Meetings'));
      await page.getByRole('button',{name:'Run check'}).click();
      await page.waitForSelector('.life-os-health-item');
      assert.ok((await page.locator('.life-os-health-list').first().innerText()).length>0);
      await page.screenshot({path:'/tmp/life-os-config.png',fullPage:true});
      await page.getByRole('button',{name:'Save configuration'}).click();
      await page.waitForFunction(()=>window.writes.some(w=>w[0]==='frontmatter'&&w[1]==='Meta/Dev OS Config.md'));
    }
    if(screen==='roadmap'){
      assert.ok(await page.locator('.life-os-roadmap-bar').count()>=1);
      assert.equal(await page.locator('.life-os-roadmap-marker.is-milestone').count(),1);
      assert.equal(await page.locator('.life-os-roadmap-marker.is-release').count(),1);
      await page.screenshot({path:'/tmp/life-os-roadmap.png',fullPage:true});
      await page.getByRole('button',{name:'12 months',exact:true}).click();
      assert.equal(await page.locator('.life-os-roadmap-month').count(),12);
    }
    if(screen==='waiting'){
      assert.ok((await page.locator('.life-os-waiting-person').innerText()).includes('Review the contract'));
      assert.ok((await page.locator('.life-os-dependency').innerText()).includes('Build the fixture'));
      await page.screenshot({path:'/tmp/life-os-waiting.png',fullPage:true});
      await page.getByRole('button',{name:/^Edit: Review the contract/}).first().click();
      await page.getByLabel('Task',{exact:true}).fill('Review the vendor contract');
      await page.getByLabel('Due',{exact:true}).fill('2026-09-25');
      await page.screenshot({path:'/tmp/life-os-task-editor.png'});
      await page.locator('.modal-fixture').getByRole('button',{name:'Save'}).click();
      await page.waitForFunction(()=>!document.querySelector('.modal-fixture'));
      await page.waitForFunction(()=>document.querySelector('.life-os-waiting-person')?.innerText.includes('Review the vendor contract'));
    }
    if(screen==='docs'){
      await page.locator('.life-os-release-card .life-os-meeting-head').first().click();
      assert.ok((await page.locator('.life-os-release-preview').innerText()).includes('### Fixed\n- Agree scope'));
      await page.getByRole('button',{name:'Write to note',exact:true}).click();
      await page.waitForFunction(()=>window.writes.some(w=>w[0]==='process'&&w[1].includes('Releases')));
      assert.ok((await page.locator('.life-os-doc-table').innerText()).includes('ADR-0001 Fixture decision'));
      await page.locator('.life-os-doc-table summary[aria-label="Actions for ADR-0001 Fixture decision"]').click();
      await page.locator('.life-os-doc-table .life-os-item-actions-menu').getByRole('button',{name:'Delete',exact:true}).click();
      assert.ok((await page.locator('.modal-fixture').textContent()).includes('Type "ADR-0001 Fixture decision" to confirm'));
      await page.locator('.modal-fixture').getByRole('button',{name:'Delete',exact:true}).click();
      assert.ok((await page.locator('.modal-fixture').innerText()).includes('Required'));
      await page.locator('.modal-fixture').getByRole('button',{name:'Cancel',exact:true}).click();
      assert.ok(await page.evaluate(()=>!window.writes.some(w=>w[0]==='trash')));
      await page.screenshot({path:'/tmp/life-os-docs.png',fullPage:true});
    }
    if(screen==='people'){
      await page.locator('.life-os-discussion-queue button').first().click();
      assert.equal(await page.evaluate(()=>window.opened.at(-1).path),'05 People/Synthetic person.md');
    }
    if(screen==='focus'){
      assert.ok(await page.locator('.life-os-workload-segment').count()>0);
      await page.getByRole('button',{name:'Overdue · 1',exact:true}).click();
      assert.equal(await page.locator('.life-os-task-row').count(),1);
      assert.ok((await page.locator('.life-os-task-row').innerText()).includes('overdue'));
      await page.getByRole('button',{name:/^All ·/}).click();
    }
    if(screen==='library'){
      assert.equal(await page.locator('.life-os-record-card').count(),4);
      assert.equal(await page.locator('.life-os-book-fallback').count(),4);
      assert.equal(await page.locator('img[src^="https:"]').count(),0);
      await page.getByLabel('Library type',{exact:true}).selectOption('source');
      assert.equal(await page.locator('.life-os-record-card').count(),1);
      await page.getByLabel('Library type',{exact:true}).selectOption('all');
      await page.getByLabel('Library status',{exact:true}).selectOption('completed');
      assert.equal(await page.locator('.life-os-record-card').count(),1);
      assert.ok((await page.locator('.life-os-record-card').innerText()).includes('Finished book'));
    }
    if(screen==='ai'){
      assert.ok((await page.locator('.life-os-connection-map').innerText()).includes('not tested here'));
    }
    if(screen==='plan'){
      assert.equal(await page.locator('.life-os-calendar-day').count(),42);
      await page.getByRole('button',{name:'2026-09-09: Open daily note',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.opened.at(-1)?.path),'01 Journal/Daily/2026-09-09.md');
      await page.getByRole('button',{name:'Next month',exact:true}).click();
      assert.ok((await page.locator('.life-os-calendar h2').innerText()).includes('October'));
      await page.getByRole('button',{name:'This month',exact:true}).click();
    }
    if(screen==='review'){
      await page.getByRole('button',{name:'7 days',exact:true}).click();
      assert.equal(await page.locator('.life-os-effort-column').count(),7);
      await page.locator('.life-os-effort-column[role="button"]').first().press('Enter');
      assert.ok(await page.evaluate(()=>window.opened.at(-1)?.path.startsWith('01 Journal/Daily/')));
      await page.getByText('Read daily values',{exact:true}).click();
      assert.equal(await page.locator('.life-os-chart-table tbody tr').count(),7);
      await page.getByRole('button',{name:/Open scored retreat/}).click();
      assert.ok(await page.evaluate(()=>window.opened.at(-1)?.path.startsWith('02 Retreats/')));
    }
  }
  await page.evaluate(()=>{window.view.activeScreen='home';window.view.render();window.previousPreview=window.view.previewBrain;});
  await page.locator('.life-os-display-options summary').click();
  await page.getByRole('button',{name:'Hide optional visuals',exact:true}).click();
  assert.equal(await page.locator('.life-os-brain-preview').count(),0);
  assert.ok(await page.evaluate(()=>window.previousPreview.ctx===null));
  await page.locator('.life-os-display-options summary').click();
  await page.getByLabel('Items per list',{exact:true}).selectOption('3');
  assert.equal(await page.evaluate(()=>window.view.itemLimit),3);
  await page.locator('.life-os-display-options summary').click();
  await page.getByRole('button',{name:'Restore view defaults',exact:true}).click();
  assert.equal(await page.locator('.life-os-brain-preview canvas').count(),1);
  await page.getByRole('button',{name:/Explore Brain/}).click();
  assert.equal(await page.locator('.life-os-brain-embedded canvas').count(),1);
  await page.getByRole('button',{name:'Home',exact:true}).click();
  for(const width of [900,620,390]){
    await page.setViewportSize({width,height:900});
    for (const screen of ['home','today','sprint','projects','meetings','docs','inbox','roadmap','waiting','config','plan','review','focus','people','library','ai','project']) {
      await page.evaluate(s=>{window.view.activeScreen=s;window.view.activeProjectPath='04 Projects/Synthetic project.md';window.view.render();},screen);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${screen} document overflow at ${width}`);
      if(width===390&&['project','sprint','today','roadmap','config'].includes(screen))await page.screenshot({path:`/tmp/life-os-${screen}-390.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  // Project description, archive, unarchive, and rename from the project page.
  const projectFm=()=>page.evaluate(()=>window.view.getFrontmatter(window.view.app.vault.getAbstractFileByPath(window.view.activeProjectPath)));
  await page.evaluate(()=>{window.view.activeScreen='project';window.view.activeProjectPath='04 Projects/Synthetic project.md';window.view.render();});
  await page.getByLabel('Project description',{exact:true}).fill('Fixture project for the browser check');
  await page.getByLabel('Project description',{exact:true}).press('Tab');
  await page.waitForFunction(()=>window.writes.some(w=>w[0]==='frontmatter'&&w[1]==='04 Projects/Synthetic project.md'));
  assert.equal((await projectFm()).description,'Fixture project for the browser check');
  await page.locator('.life-os-project-header summary[aria-label="Actions for Synthetic project"]').click();
  await page.screenshot({path:'/tmp/life-os-project-actions.png'});
  await page.locator('.life-os-project-header .life-os-item-actions-menu').getByRole('button',{name:'Archive',exact:true}).click();
  await page.locator('.modal-fixture').getByRole('button',{name:'Archive',exact:true}).click();
  await page.waitForSelector('.life-os-archived-banner');
  assert.equal((await projectFm()).archived,true);
  await page.screenshot({path:'/tmp/life-os-project-archived.png',fullPage:true});
  await page.evaluate(()=>{window.view.activeScreen='projects';window.view.render();});
  assert.equal(await page.locator('.life-os-project-card').count(),0);
  await page.getByRole('button',{name:'Archived',exact:true}).click();
  assert.equal(await page.locator('.life-os-project-card').count(),1);
  assert.ok((await page.locator('.life-os-project-card').innerText()).includes('Fixture project for the browser check'));
  await page.locator('.life-os-project-card-open').click();
  await page.locator('.life-os-archived-banner').getByRole('button',{name:'Unarchive'}).click();
  await page.locator('.modal-fixture').getByRole('button',{name:'Unarchive',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.life-os-archived-banner'));
  assert.equal((await projectFm()).archived,undefined);
  await page.locator('.life-os-project-header summary').click();
  await page.locator('.life-os-project-header .life-os-item-actions-menu').getByRole('button',{name:'Rename',exact:true}).click();
  await page.getByLabel('New title',{exact:true}).fill('Fixture platform');
  await page.locator('.modal-fixture').getByRole('button',{name:'Rename',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.life-os-project-headline h1')?.innerText==='Fixture platform');
  assert.ok(await page.evaluate(()=>window.view.activeProjectPath==='04 Projects/Fixture platform.md'&&window.writes.some(w=>w[0]==='rename'&&w[2]==='04 Projects/Sprints/Fixture platform Sprint 1.md')));
  assert.equal(await page.locator('.life-os-project-headline .life-os-eyebrow').textContent(),'#project/fixture-platform');
  await page.getByRole('tab',{name:/^Tasks/}).click();
  assert.ok((await page.locator('.life-os-tab-panel').innerText()).includes('Build the fixture'));
  await page.evaluate(()=>{window.view.projectFilter='open';window.view.activeScreen='home';window.view.render();});
  await page.locator('.life-os-display-options summary').click();
  await page.getByRole('button',{name:'Use compact spacing',exact:true}).click();
  assert.equal(await page.locator('.life-os-app-frame.is-compact').count(),1);
  for(let pass=0;pass<3;pass++){
    await page.getByRole('button',{name:'Brain',exact:true}).click();
    assert.equal(await page.locator('.life-os-rail').count(),1);
    assert.equal(await page.locator('.life-os-brain-embedded canvas').count(),1);
    assert.equal(await page.locator('.life-os-nav-button[aria-current="page"]').innerText(),'Brain');
    await page.evaluate(()=>{window.previousBrain=window.view.embeddedBrain;window.view.render();});
    assert.ok(await page.evaluate(()=>window.previousBrain===window.view.embeddedBrain));
    const canvas=page.locator('.life-os-brain-embedded canvas');
    await canvas.press('ArrowRight');
    assert.ok(await page.evaluate(()=>window.view.embeddedBrain.yaw>0.28));
    if(pass===0)await page.screenshot({path:'/tmp/life-os-brain-sidebar.png',fullPage:true});
    await page.getByRole('button',{name:'Home',exact:true}).click();
    assert.equal(await page.locator('.life-os-brain-embedded').count(),0);
    assert.ok(await page.evaluate(()=>window.previousBrain.ctx===null && window.view.embeddedBrain===null));
  }
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>{window.view.activeScreen='home';window.view.render();});
  await page.locator('.life-os-display-options summary').click();
  await page.getByRole('button',{name:"Hide this module's visual",exact:true}).click();
  assert.equal(await page.locator('.life-os-brain-preview').count(),0);
  await page.evaluate(()=>{window.view.activeScreen='ai';window.view.render();});
  assert.equal(await page.locator('.life-os-ai-diagram').count(),1);
  await page.evaluate(()=>{
    const theme={'--background-primary':'#faf9f6','--background-secondary':'#f0eeea','--text-normal':'#24272b','--text-muted':'#535962','--text-faint':'#686d74','--background-modifier-border':'#cbc7c0'};
    for(const [key,value] of Object.entries(theme))document.documentElement.style.setProperty(key,value);
    window.view.activeScreen='home';window.view.visualOptions={};window.view.render();
  });
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/life-os-home-light-candidate.png'});
  await page.evaluate(()=>window.view.onClose());
  console.log('Dashboard browser checks passed: sixteen modules, Configure save and health check, project page tasks and minutes composer, sprint moves, inbox triage, roadmap bars and markers, waiting groups, task editor, release notes, project description, archive, unarchive and rename, Home spacing, preview/full Brain navigation, workload groups, project counts, discussion links, board previews, Library filters and remote-cover rejection, AI branches, per-module controls, narrow widths and light-theme smoke check. Synthetic fixture only.');
}finally{await browser.close();}
