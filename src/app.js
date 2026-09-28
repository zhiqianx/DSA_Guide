
'use strict';
const DATA=JSON.parse(document.getElementById('guide-data').textContent), C=DATA.chapters, P=DATA.problems;
const $=id=>document.getElementById(id), esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='islia-dsa-field-guide-v1';
let state={version:1,methods:{},problems:{},notes:{},review:false}, storageOK=true, quizId=null, quizHistory=[];
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)state=cleanState(saved);}catch(e){storageOK=false;}
function cleanState(raw){if(!raw||raw.version!==1)throw Error('Unsupported backup format');const out={version:1,methods:{},problems:{},notes:{},review:!!raw.review};for(const c of C){if(['Not started','Learning','Review','Confident'].includes(raw.methods?.[c.id]))out.methods[c.id]=raw.methods[c.id];if(typeof raw.notes?.[c.id]==='string')out.notes[c.id]=raw.notes[c.id].slice(0,100000);}for(const id of Object.keys(P)){if(['Not started','Attempted','Solved','Review'].includes(raw.problems?.[id]))out.problems[id]=raw.problems[id];}return out;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}updateSave();updateProgress();updateCollectionProgress();}
function updateSave(){$('save-state').textContent=storageOK?'Progress saved on this browser':'Saving unavailable · export a backup';}
function updateProgress(){const learned=C.filter(c=>state.methods[c.id]==='Confident').length;$('progresslabel').textContent=`${learned} / ${C.length} methods marked confident`;$('overallprogress').value=learned;}
function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.add('hidden'),3500);}
function go(route){if(location.hash.slice(1)===route){render();}else{location.hash=route;}}
function opts(values,selected){return values.map(x=>`<option${x===selected?' selected':''}>${esc(x)}</option>`).join('');}
function methodStatus(c){return `<label class="small">Method progress <select class="status-select" data-method="${c.id}" aria-label="Progress for ${esc(c.title)}">${opts(['Not started','Learning','Review','Confident'],state.methods[c.id]||'Not started')}</select></label>`;}
function problemStatus(p){return `<select class="status-select" data-problem="${p.id}" aria-label="Progress for ${esc(p.title)}">${opts(['Not started','Attempted','Solved','Review'],state.problems[p.id]||'Not started')}</select>`;}
function code(text){return `<div class="codewrap"><button class="copy" type="button">Copy</button><pre><code>${esc(text)}</code></pre></div>`;}
function detail(label,body,cls=''){return `<details class="${cls}"><summary>${esc(label)}</summary><div class="reveal">${body}</div></details>`;}
function tag(text){return `<span class="tag ${text==='Core'?'core':text==='Hard'?'hard':''}">${esc(text)}</span>`;}
function nav(){const query=$('navsearch').value.toLowerCase().trim(),priority=$('priority').value,status=$('navstatus').value;let last='',html='',count=0;const route=location.hash.slice(1);for(const c of C){const hay=[c.title,c.group,c.intro,...c.clues,...c.problems.map(id=>P[id].title+' '+id)].join(' ').toLowerCase();if(query&&!hay.includes(query)||priority&&c.priority!==priority||status&&(state.methods[c.id]||'Not started')!==status)continue;count++;if(last!==c.group){html+=`<div class="navgroup">${esc(c.group)}</div>`;last=c.group;}html+=`<a class="navlink ${route==='method-'+c.id?'active':''}" href="#method-${c.id}" ${route==='method-'+c.id?'aria-current="page"':''}><span class="navnum">${c.id.padStart(2,'0')}</span><span>${esc(c.title)}</span>${state.methods[c.id]==='Confident'?'<span class="navdot" aria-label="Confident">✓</span>':''}</a>`;}$('methodnav').innerHTML=html||'<p class="empty">No matching methods. Try a problem title or clear the filters.</p>';updateProgress();}
function hero(kicker,title,description){return `<div class="hero"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div>`;}
function home(){return `${hero('Your Java interview companion','Recognize the pattern.\nExplain the reasoning.','Learn each method from its first principles: understand the idea, derive the steps, follow worked Java examples, then practice explaining the reasoning yourself.')}<div class="tags">${tag('30 methods')}${tag('60 worked examples')}${tag(Object.keys(P).length+' distinct problems')}${tag('Java 8+ syntax')}${tag('Works offline')}</div>
<div class="grid" style="margin-top:25px"><section class="card"><p class="section-label">A useful study loop</p><h3>Understand → trace → practice</h3><ol><li>Read the intuition and define the invariant or state.</li><li>Follow the step-by-step method and two worked examples.</li><li>Trace the Java code and explain its time and space costs.</li><li>Attempt the practice problems before revealing help.</li><li>Use mixed practice to choose methods without topic clues.</li></ol><a class="btn primary" href="#method-1">Begin with hash maps →</a></section><section class="card"><p class="section-label">Built for deliberate practice</p><h3>Learn first. Then test yourself.</h3><p>Every method has a full lesson with visible reasoning, dry-run tables, and Java implementations. Practice hints, solutions, and complexity stay behind independent reveal controls so you can test your understanding.</p><p class="small muted">Progress and notes are saved in this browser when local storage is available. Download and open this file in a regular browser for the full experience. Moving the file or switching browsers may create a different storage location; use a backup to transfer your work.</p><button class="btn" data-action="export">Export progress & notes</button> <button class="btn" data-action="import">Import backup</button></section></div>
<h2>Three complete study plans</h2><p class="muted">Study by method or follow a complete list. Overlapping problems share one solution and one progress record.</p>${coverageCards()}<p class="small muted">${PLAN_UNION.size} distinct problems across the three lists, plus ${Object.keys(P).length-PLAN_UNION.size} extra practice problems. Membership verified September 28, 2026.</p>
<h2>A sensible first pass</h2><p class="muted">Priority labels are study recommendations, not measured company-specific interview frequencies. Learn the core patterns first, then add extensions as you encounter them.</p><div class="roadmap">${['1','2','3','4','6','10','12','15','16','18','22','23','24','28'].map(id=>`<a href="#method-${id}">${esc(C[+id-1].title)}</a>`).join('')}</div>
<h2>Explore all 30 methods</h2><div class="grid">${C.map(c=>`<a class="card topic-card" href="#method-${c.id}"><div class="number">${c.id.padStart(2,'0')}</div><h3>${esc(c.title)}</h3><p>${esc(c.clues[0])}</p><div class="tags">${tag(c.priority)}${tag(c.problems.length+' problems')}</div></a>`).join('')}</div>
<p class="footnote">Problems can appear in more than one chapter when comparing approaches is useful. Progress is shared across those appearances. All summaries and teaching explanations are written for this guide; the linked LeetCode pages contain the original full statements and constraints. There is no embedded code runner.</p>`;}
function problemCard(id) {
  const p = P[id];
  return `<article class="problem" id="problem-${p.id}">
    <div class="problemheader"><div><h3><a href="${p.url}" target="_blank" rel="noopener noreferrer">${esc(p.title)} ↗</a></h3><div class="tags">${tag('LC '+p.id)}${tag(p.diff)}${collectionTags(p.id)}</div></div>${problemStatus(p)}</div>
    <p>${esc(p.prompt)}</p><div class="example">${esc(p.example)}</div>
    <div class="hintrow">${detail('Hint 1 · gentle nudge',`<p>${esc(p.hints[0])}</p>`,'hint')}${detail('Hint 2 · approach clue',`<p>${esc(p.hints[1])}</p>`,'hint')}</div>
    ${detail('Show Java solution',`<p>${esc(p.approach)}</p>${javaContext(p)}${code(p.code)}`,'solution')}
    ${detail('Check time & space complexity',`<p>${esc(p.cost)}</p>`,'cost')}
  </article>`;
}

function javaContext(p) {
  return `<p class="small muted">${p.code.startsWith('class ')
    ? 'Use this named class with import java.util.*;'
    : 'Place these methods/fields inside class Solution and add import java.util.*;'} TreeNode and ListNode are supplied by LeetCode; see Reference for definitions.</p>${p.supportCode ? `<h4>Local helper type</h4><p class="small muted">LeetCode supplies this problem’s Node type. Use this definition only when running locally.</p>${code(p.supportCode)}` : ''}`;
}

function paragraphs(items) {
  return items.map(text => `<p>${esc(text)}</p>`).join('');
}

function traceTable(trace) {
  return `<div class="tablewrap"><table>
    <caption>${esc(trace.caption)}</caption>
    <thead><tr>${trace.headers.map(text => `<th scope="col">${esc(text)}</th>`).join('')}</tr></thead>
    <tbody>${trace.rows.map(row => `<tr>${row.map(text => `<td>${esc(text)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function teachingExample(example, index) {
  const p = P[example.id];
  return `<article class="problem worked" id="worked-${p.id}">
    <div class="problemheader"><div><p class="eyebrow">Worked example ${index + 1}</p>
      <h3><a href="${p.url}" target="_blank" rel="noopener noreferrer">${esc(p.title)} ↗</a></h3>
      <div class="tags">${tag('LC '+p.id)}${tag(p.diff)}${collectionTags(p.id)}</div></div>${problemStatus(p)}</div>
    <p>${esc(p.prompt)}</p><div class="example">${esc(p.example)}</div>
    <h4 style="margin-top:22px">Start with a baseline</h4><p>${esc(example.baseline)}</p>
    <h4>Derive the approach</h4>${paragraphs(example.reasoning)}
    <h4>Walk through the state</h4>${traceTable(example.trace)}
    <h4 style="margin-top:22px">Java implementation</h4>${javaContext(p)}${code(p.code)}
    <h4>Read the key decisions</h4><ul>${example.codeNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>
    <h4>Time & space</h4><p>${esc(p.cost)}</p>
    <div class="callout"><p><strong>What to remember:</strong> ${esc(example.takeaway)}</p></div>
  </article>`;
}

function chapter(c) {
  const lesson = DATA.lessons[c.id];
  const taught = new Set(lesson.examples.map(example => example.id));
  const practiceIds = c.problems.filter(id => !taught.has(id));
  const cards = pairs => pairs.map(([title, body]) => `<section class="card"><h3>${esc(title)}</h3><p>${esc(body)}</p></section>`).join('');
  const steps = lesson.steps.map(([title, body]) => `<li><strong>${esc(title)}.</strong> ${esc(body)}</li>`).join('');
  return `<div class="${state.review?'read-mode':''}">
    <div class="hero"><p class="eyebrow">Method ${c.id.padStart(2,'0')} / 30 · ${esc(c.group)}</p>
      <div class="chapterline"><h1>${esc(c.title)}</h1>${methodStatus(c)}</div>
      <p style="margin-top:20px">${esc(c.intro)}</p>
      <div class="tags">${tag(c.priority)}<button class="btn" data-action="review" aria-pressed="${state.review}">${state.review?'Show full lesson':'Quick review mode'}</button><button class="btn" data-action="close">Hide practice answers</button></div>
      <div class="toolbar lesson-expanded" aria-label="Lesson sections">${[['idea','The idea'],['steps','The steps'],['examples','Worked examples'],['practice','Practice']].map(([id,label]) => `<button class="btn" data-section="lesson-${id}">${label}</button>`).join('')}</div>
    </div>
    <div class="grid"><section class="card"><p class="section-label">Recognition clues</p><h3>What to look for</h3><ul>${c.clues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="card"><p class="section-label">Choose deliberately</p><h3>When to reconsider</h3><p>${esc(c.avoid)}</p></section></div>
    <section class="lesson-expanded"><h2 id="lesson-idea" tabindex="-1">1. Understand the idea</h2>${paragraphs(lesson.intuition)}</section>
    <div class="callout"><h3>The invariant / state definition</h3><p>${esc(c.invariant)}</p></div>
    <section class="lesson-expanded"><h2 id="lesson-steps" tabindex="-1">2. Build the method, step by step</h2><ol class="trace">${steps}</ol></section>
    <h2>${state.review?'Reusable structure':'3. Reusable structure'}</h2>
    <p class="small muted">This template is a sketch: supply the decisions named by its placeholders. The worked examples below provide concrete implementations.</p>${code(c.template)}<p>${esc(c.adapt)}</p>
    <div class="lesson-expanded">
      <h2>4. Recognize the main patterns</h2><div class="grid">${cards(lesson.patterns)}</div>
      ${lesson.progression ? `<h2>From recursion to an efficient DP</h2><p>The same stair-counting question connects all four versions. Read them in order before studying the full examples.</p>${lesson.progression.map(stage=>`<section class="problem"><h3>${esc(stage.title)}</h3><p>${esc(stage.body)}</p>${code(stage.code)}</section>`).join('')}` : ''}
      <h2 id="lesson-examples" tabindex="-1">5. Learn from worked examples</h2>
      <p class="muted">Read the reasoning, trace the state, and connect each code decision to the idea. These teaching examples are fully visible; the practice answers below stay hidden until you reveal them.</p>
      ${lesson.examples.map(teachingExample).join('')}
      <h2>6. Analyze and improve</h2><p>${esc(lesson.optimization)}</p>
      <div class="tablewrap"><table><caption>Cost of the implementations shown above</caption><thead><tr><th scope="col">Problem</th><th scope="col">Time, space, and assumptions</th></tr></thead><tbody>${lesson.examples.map(example=>`<tr><td>${esc(P[example.id].title)}</td><td>${esc(P[example.id].cost)}</td></tr>`).join('')}</tbody></table></div>
      <h2>7. Catch common mistakes</h2><div class="grid">${cards(lesson.pitfalls)}</div>
      <h2>8. Explain it in an interview</h2><p>Use this reasoning as a starting point, then ground it in the problem’s actual constraints and a small example.</p><div class="callout"><p>${esc(lesson.interview)}</p></div><p><strong>Before you finish:</strong> ${esc(c.edges)}</p>
      <h2 id="lesson-practice" tabindex="-1">9. Practice on your own</h2><p class="muted">State the invariant, predict the approach, and estimate complexity before opening an answer. Each hint, solution, and complexity explanation reveals independently.</p>
      ${c.practiceNote?`<div class="callout"><h3>Extensions & comparisons</h3><p>${esc(c.practiceNote)}</p></div>`:''}<p class="small muted">${practiceIds.length} practice problems · choose help only when you need it.</p>
      ${practiceIds.map(id=>problemCard(id)).join('')}
      <p><a class="btn" href="#practice?topic=${c.id}">Filter the problem bank to this topic →</a></p>
    </div>
    ${state.review?`<h2>Practice when you’re ready</h2><p>Quick review keeps the clues, invariant, template, and summary in view. Switch to the full lesson for ${lesson.examples.length} worked examples and ${practiceIds.length} practice ${practiceIds.length===1?'problem':'problems'}.</p>`:''}
    <div class="callout"><h3>The idea to take with you</h3><p>${esc(lesson.summary)}</p></div>
    <h2>Your notes</h2><label class="sr-only" for="notes-${c.id}">Personal notes for ${esc(c.title)}</label><textarea class="notes" id="notes-${c.id}" data-note="${c.id}" placeholder="What clue did I miss? What must stay true? Which boundary case should I revisit?">${esc(state.notes[c.id]||'')}</textarea><p class="note-message">Saved as you type when browser storage is available. Export a backup from Start here or Reference.</p>
    <div class="footerlinks">${+c.id>1?`<a href="#method-${+c.id-1}">← ${esc(C[+c.id-2].title)}</a>`:'<a href="#home">← Start here</a>'}${+c.id<30?`<a href="#method-${+c.id+1}">${esc(C[+c.id].title)} →</a>`:'<a href="#quiz">Try mixed practice →</a>'}</div>
  </div>`;
}
const COLLECTIONS = DATA.collections;
const COLLECTION_IDS = Object.fromEntries(Object.entries(COLLECTIONS).map(([key, collection]) => [key, new Set(collection.problemIds)]));
const PLAN_UNION = new Set(Object.values(COLLECTIONS).flatMap(collection => collection.problemIds));

function collectionTags(id) {
  const memberships = Object.entries(COLLECTIONS).filter(([key]) => COLLECTION_IDS[key].has(id));
  return memberships.length ? memberships.map(([, collection]) => tag(collection.shortName)).join('') : tag('Extra practice');
}

function coverageCards() {
  return `<div class="grid coverage-grid">${Object.entries(COLLECTIONS).map(([key, collection]) => {
    const included = collection.problemIds.filter(id => P[id]).length;
    const solved = collection.problemIds.filter(id => state.problems[id] === 'Solved').length;
    return `<section class="card" data-coverage="${key}">
      <p class="section-label">${included} / ${collection.expectedCount} included</p>
      <h3>${esc(collection.name)}</h3>
      <p class="small" data-collection-solved="${key}">${solved} / ${collection.expectedCount} solved</p>
      <progress data-collection-progress="${key}" value="${solved}" max="${collection.expectedCount}" aria-label="${esc(collection.name)} solved"></progress>
      <div class="toolbar"><a class="btn" href="#practice?list=${key}">Study this list →</a><a class="small" href="${collection.url}" target="_blank" rel="noopener noreferrer">Original list ↗</a></div>
    </section>`;
  }).join('')}</div>`;
}

function updateCollectionProgress() {
  for (const [key, collection] of Object.entries(COLLECTIONS)) {
    const solved = collection.problemIds.filter(id => state.problems[id] === 'Solved').length;
    document.querySelectorAll(`[data-collection-solved="${key}"]`).forEach(element => element.textContent = `${solved} / ${collection.expectedCount} solved`);
    document.querySelectorAll(`[data-collection-progress="${key}"]`).forEach(element => element.value = solved);
  }
}

function practiceParams() {
  return new URLSearchParams(location.hash.split('?')[1] || '');
}

function syncPracticeHash() {
  const params = new URLSearchParams();
  for (const [parameter, id] of [['list','problemcollection'],['topic','problemtopic'],['difficulty','problemdiff'],['status','problemstatus'],['q','problemsearch']]) {
    if ($(id)?.value) params.set(parameter, $(id).value);
  }
  const query = params.toString();
  // Replace the current address without rerendering or losing keyboard focus.
  try { history.replaceState(null, '', '#practice' + (query ? '?' + query : '')); } catch { /* Filtering still works where history access is restricted. */ }
}

function practice() {
  const params = practiceParams();
  const option = (value, label, selected) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
  return `${hero(Object.keys(P).length+' distinct problems · shared progress','Practice without spoilers.','Cover all three study plans, or focus on one topic. Hints, Java solutions, and complexity reveal independently; a problem shared by several lists only needs one progress record.')}
    ${coverageCards()}
    <p class="small muted">The three plans share ${PLAN_UNION.size} distinct problems. ${Object.keys(P).length - PLAN_UNION.size} additional problems extend the same methods. Membership verified September 28, 2026; study lists may change over time.</p>
    <div class="toolbar">
      <input type="search" id="problemsearch" aria-label="Search problems" placeholder="Search title, number, or prompt…" value="${esc(params.get('q') || '')}">
      <select id="problemcollection" aria-label="Study list">${option('','All study lists',params.get('list'))}${Object.entries(COLLECTIONS).map(([key,c])=>option(key,c.shortName,params.get('list'))).join('')}${option('extras','Extra practice',params.get('list'))}</select>
      <select id="problemdiff" aria-label="Problem difficulty">${option('','All difficulties',params.get('difficulty'))}${['Easy','Medium','Hard'].map(value=>option(value,value,params.get('difficulty'))).join('')}</select>
      <select id="problemtopic" aria-label="Problem topic">${option('','All methods',params.get('topic'))}${C.map(c=>option(c.id,c.title,params.get('topic'))).join('')}</select>
      <select id="problemstatus" aria-label="Problem progress">${option('','All progress',params.get('status'))}${['Not started','Attempted','Solved','Review'].map(value=>option(value,value,params.get('status'))).join('')}</select>
      <button class="btn" data-action="resetfilters">Clear filters</button>
    </div>
    <p id="problemcount" class="small muted" aria-live="polite"></p><div id="problemlist" class="practice-list"></div>`;
}

function renderProblems() {
  const query = $('problemsearch').value.toLowerCase().trim();
  const diff = $('problemdiff').value, topic = $('problemtopic').value;
  const status = $('problemstatus').value, collection = $('problemcollection').value;
  const items = Object.values(P).filter(p =>
    (!query || (p.id+' '+p.title+' '+p.prompt).toLowerCase().includes(query)) &&
    (!diff || p.diff === diff) &&
    (!topic || C.find(c=>c.id === topic)?.problems.includes(p.id)) &&
    (!status || (state.problems[p.id] || 'Not started') === status) &&
    (!collection || (collection === 'extras' ? !PLAN_UNION.has(p.id) : COLLECTION_IDS[collection]?.has(p.id)))
  );
  const solved = items.filter(p => state.problems[p.id] === 'Solved').length;
  $('problemcount').textContent = `${items.length} of ${Object.keys(P).length} problems · ${solved} matching problems marked solved`;
  $('problemlist').innerHTML = items.length ? items.map(p=>problemCard(p.id)).join('') : '<div class="empty">No problems match. Try clearing a filter.</div>';
  updateCollectionProgress();
}

function newQuiz(){let candidates=Object.keys(P).filter(id=>!quizHistory.includes(id));if(!candidates.length){quizHistory=[];candidates=Object.keys(P);}quizId=candidates[Math.floor(Math.random()*candidates.length)];quizHistory.push(quizId);}
function quiz(){if(!quizId)newQuiz();const p=P[quizId];return `${hero('Mixed recognition practice','Choose before you peek.','The problem title and method label are hidden. Identify the deciding property, choose an approach, and explain why it fits before revealing the guide’s solution.')}<section class="card"><div class="tags">${tag(p.diff)}${tag('Prompt '+quizHistory.length)}</div><p class="quizprompt" style="margin-top:22px">${esc(p.prompt)}</p><label for="quizchoice">Which approach would you try?</label><select class="quizselect" id="quizchoice"><option value="">Make your prediction…</option>${C.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select><label for="quizreason" class="small">What property makes it appropriate? What alternative would you reject?</label><textarea id="quizreason" class="notes" placeholder="For example: the input is sorted, so a comparison eliminates an endpoint…"></textarea><p class="small muted">This scratch answer is for the current prompt only. Save lasting observations in a method’s notes.</p><div class="toolbar"><button class="btn primary" data-action="revealquiz">Reveal approach</button><button class="btn" data-action="nextquiz">Next prompt →</button></div><div id="quizanswer" class="quizresult"></div></section>`;}
function revealQuiz(){const p=P[quizId],topics=C.filter(c=>c.problems.includes(quizId)),chosen=$('quizchoice').value;$('quizanswer').innerHTML=`<div class="callout"><h3>${esc(p.title)}</h3><p><strong>Featured in:</strong> ${topics.map(c=>`<a href="#method-${c.id}">${esc(c.title)}</a>`).join(' · ')}</p>${chosen?`<p><strong>Your prediction:</strong> ${esc(C[+chosen-1].title)}.</p>`:''}<p>${esc(p.approach)}</p><p class="small">More than one approach can be correct. Compare your proof, assumptions, and operation count rather than treating the chapter label as the only possible answer.</p></div>${detail('Check complexity after estimating it',`<p>${esc(p.cost)}</p>`,'cost')}${detail('Show Java solution',`${javaContext(p)}${code(p.code)}`,'solution')}<a class="btn" href="${p.url}" target="_blank" rel="noopener noreferrer">Open original problem ↗</a>`;}
function compare(){const rows=[['Two pointers vs sliding window','A sorted pair search eliminates endpoints; a window maintains every element in a contiguous range.','Two Sum II vs Longest Substring Without Repeating Characters','2','3'],['Sliding window vs prefix sums','A safe shrink rule supports a window. Exact sums with negative numbers favor prefix differences plus a map.','Minimum Size Subarray Sum vs Subarray Sum Equals K','3','4'],['DFS vs BFS','Both traverse connectivity. BFS guarantees fewest edges when all moves cost the same; DFS naturally combines subtree returns.','Maximum Depth vs Minimum Depth; Islands vs Rotting Oranges','15','18'],['BFS vs Dijkstra','Equal-cost edges permit a FIFO queue. Nonnegative unequal weights need ordered tentative distances.','Rotting Oranges vs Network Delay Time','18','21'],['Heap vs monotonic deque','Heap supports general repeated best-item selection. Deque needs an arrival/expiration order and a dominance proof.','Top K Frequent vs Sliding Window Maximum','22','14'],['Backtracking vs DP','Enumerate actual choices with backtracking. Merge repeated states for a count, feasibility, or optimum with DP.','Combination Sum vs Coin Change','23','26'],['Greedy vs DP','A greedy choice needs a dominance/exchange proof. If a local choice can destroy a valid future, retain multiple states.','Jump Game vs Word Break','28','24'],['Topological sort vs union-find','Topological sort respects directed dependencies. DSU tracks undirected connectivity as edges are added.','Course Schedule vs Redundant Connection','19','20'],['Interval merge vs interval scheduling','Union coverage sorts by start. Keeping the most compatible intervals sorts by finish.','Merge Intervals vs Non-overlapping Intervals','8','28'],['0/1 vs unlimited knapsack','Downward sums prevent reusing the current item. Upward sums allow it. Loop nesting also distinguishes combinations from ordered sequences.','Partition Equal Subset Sum vs Coin Change II','26','26'],['Monotonic stack vs plain stack','Both are LIFO. A monotonic stack also maintains value order to resolve nearest greater/smaller relationships.','Daily Temperatures vs Valid Parentheses','13','12'],['Tree vs graph recursion','A rooted child-only tree has no cycles. A general graph needs visitation state; a path enumeration task must undo local visits.','Maximum Depth vs Number of Islands vs Word Search','15','23']];return `${hero('Deciding properties','Similar surface. Different reasoning.','Use the constraints and the information you must preserve to distinguish approaches. Keywords are a starting point, not a proof.')}<div class="grid">${rows.map(r=>`<section class="card"><h3>${esc(r[0])}</h3><p>${esc(r[1])}</p><p class="small muted">${esc(r[2])}</p><div class="inline-links"><a href="#method-${r[3]}">Review first method</a><a href="#method-${r[4]}">Review second method</a></div></section>`).join('')}</div><h2>Three questions before choosing</h2><ol><li>What structure is guaranteed: sortedness, contiguity, positivity, acyclicity, or equal edge costs?</li><li>What must be returned: existence, count, optimum, actual path, or every possible answer?</li><li>What information can I safely discard—and why can it never affect a later answer?</li></ol>`;}
function reference(){return `${hero('Keep this nearby','Interview & Java reference','A compact reference for explaining your thinking, analyzing the real implementation cost, and avoiding common Java mistakes.')}<div class="grid"><section class="card"><h3>A complete interview answer</h3><ol><li>Restate the input, goal, and output.</li><li>Clarify size limits, duplicates, order, mutation, and failure cases.</li><li>Walk through a small example.</li><li>Give a baseline and name its repeated work.</li><li>Choose a method and state its invariant or DP meaning.</li><li>Explain the steps before writing code.</li><li>Argue correctness, then analyze costs.</li><li>Implement clearly and dry-run edge cases.</li></ol></section><section class="card"><h3>Correctness proof toolbox</h3><ul><li><strong>Loop invariant:</strong> true initially, preserved by each update, and implies the result at termination.</li><li><strong>Induction:</strong> correct smaller subproblems imply a correct parent answer.</li><li><strong>Exchange:</strong> replace an optimal solution’s first choice with the greedy choice without making it worse.</li><li><strong>Dominance:</strong> a discarded candidate can never beat a retained one on any future extension.</li><li><strong>Exhaustive cases:</strong> transitions cover all legal final choices without unintended double-counting.</li></ul></section></div>
<h2>Complexity: count the work, not the indentation</h2><div class="tablewrap"><table><thead><tr><th>Situation</th><th>How to reason</th></tr></thead><tbody><tr><td>Two nested loops</td><td>Ask how often each index moves in total. A window’s left/right pointers each advance at most n times: total O(n), not O(n²).</td></tr><tr><td>Stack/deque pop loops</td><td>Each item enters and leaves at most once. Charge each pop to its earlier push: O(n) total operations.</td></tr><tr><td>Recursion</td><td>Time counts all calls; stack space counts maximum simultaneously active depth. DFS on a tree is O(n) time, O(h) stack.</td></tr><tr><td>DP</td><td>Count distinct states × work per transition evaluation. Include substring creation, hashing, and copying instead of assuming they are free.</td></tr><tr><td>Graphs</td><td>Adjacency lists support O(V+E) traversal. Scanning an adjacency matrix takes O(V²), even for a sparse graph.</td></tr><tr><td>Output-sensitive work</td><td>Listing all subsets needs O(n2^n) space/time to materialize their elements. Separate output memory from auxiliary workspace.</td></tr><tr><td>Hash tables</td><td>Say expected/amortized O(1) operations under appropriate hashing assumptions. A string key still requires O(length) initial hashing.</td></tr><tr><td>Binary search on answer</td><td>O(log range) checks × cost per feasibility check. Searching a numeric range is not automatically O(log n).</td></tr></tbody></table></div>
<h2>Java collections you will actually use</h2><div class="tablewrap"><table><thead><tr><th>Tool</th><th>Basic operations</th><th>Cost / caution</th></tr></thead><tbody><tr><td>HashMap / HashSet</td><td><code>getOrDefault</code>, <code>put</code>, <code>containsKey</code>, <code>add</code>, <code>contains</code></td><td>Expected constant-time basic lookup/update with suitable hashing; no sorted iteration order.</td></tr><tr><td>ArrayList</td><td><code>get(i)</code>, <code>add(x)</code>, <code>remove(size()-1)</code></td><td>O(1) indexing, amortized O(1) append; inserting/removing in the middle shifts O(n) elements.</td></tr><tr><td>ArrayDeque as stack</td><td><code>push</code>, <code>pop</code>, <code>peek</code></td><td>O(1) amortized endpoint operations. No null elements. Prefer it to legacy Stack.</td></tr><tr><td>ArrayDeque as queue</td><td><code>offer</code>, <code>poll</code>, <code>peek</code></td><td>FIFO. For a deque use explicit First/Last operations to make direction clear.</td></tr><tr><td>PriorityQueue</td><td><code>offer</code>, <code>poll</code>, <code>peek</code></td><td>O(log n) insertion/removal of root; O(1) peek; O(n) contains/remove(Object). Default is a min-heap.</td></tr><tr><td>TreeMap / TreeSet</td><td>Sorted keys, floor/ceiling queries</td><td>O(log n) basic search/update; useful for ordered events and neighboring keys.</td></tr><tr><td>String / StringBuilder</td><td><code>charAt</code>, <code>substring</code>, <code>append</code></td><td>Modern Java substring copies characters; repeated string concatenation in a loop can be quadratic. Builder append is amortized efficient.</td></tr></tbody></table></div>
${detail('Common Java syntax, explained',code(`import java.util.*;

Map<Integer, Integer> count = new HashMap<>();
count.put(x, count.getOrDefault(x, 0) + 1);
// Read the old frequency, defaulting to zero, then add one.

Map<String, List<String>> groups = new HashMap<>();
groups.computeIfAbsent(key, k -> new ArrayList<>()).add(word);
// Create a list only if key is absent, then append to that list.

TreeMap<Integer, Integer> events = new TreeMap<>();
events.merge(position, delta, Integer::sum);
// Absent key: store delta. Existing key: add delta to its value.

PriorityQueue<Integer> minHeap = new PriorityQueue<>();
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
// Compare safely; a[0] - b[0] could overflow.

List<Integer> copy = new ArrayList<>(path);
// Independent list contents; required before saving a backtracking path.
long sum = (long) a + b;
// Cast BEFORE arithmetic. Casting (a + b) afterward is too late.`))}
${detail('Node definitions & how to run the examples',`<p>Most solutions provide methods and helper fields to paste inside <code>class Solution</code>. Named design classes such as Trie and MinStack are used directly. Add <code>import java.util.*;</code>. LeetCode supplies node definitions; a local test can use these minimal forms.</p>${code(`class ListNode {
    int val;
    ListNode next;
    ListNode(int val) { this.val = val; }
}
class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}`)}<p>Templates are explanatory sketches and may contain placeholders. Problem solutions are concrete implementations under the stated constraints. The guide does not execute Java.</p>`)}
<h2>Useful extensions</h2>
${detail('Memoization vs bottom-up DP',`<p>Memoization starts from the question and recursively computes only states reached, storing each answer. Bottom-up begins with base cases and fills states in dependency order. Both need the same correct state definition and transitions.</p><p>For a boolean problem, a plain false-filled cache cannot distinguish “not computed” from “computed false.” Use <code>Boolean[]</code> with null as unknown or a separate visited array. Recursive Word Break can memoize the start index; its future depends only on the remaining suffix.</p><p>Space compression is a later step: first write a correct full-state recurrence. Keep an entry only as long as a future transition needs it.</p>`)}
${detail('State-machine DP: stock trading with a fee',`<p>“Which day am I on?” is not enough state when future legal actions depend on whether a share is held. Keep <code>cash</code> and <code>hold</code>, representing the best value after a day in each inventory state.</p><p><code>nextCash=max(cash, hold+price-fee)</code>; <code>nextHold=max(hold, cash-price)</code>. Use the previous day’s values for both transitions. The four actions are rest while not holding, sell, rest while holding, and buy.</p><a href="#method-24">See the complete Stock with Transaction Fee solution in 1D DP →</a>`)}
${detail('LIS in O(n log n): minimal tails',`<p><code>tails[len-1]</code> is the smallest ending value found for an increasing subsequence of length len. A smaller ending value leaves more room for future extensions. Replace the first tail >= x; append if none exists. Equal values replace rather than extend because the subsequence is strictly increasing.</p>${code(`public int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];
    int size = 0;
    for (int x : nums) {
        int left = 0, right = size;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (tails[mid] < x) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        tails[left] = x;
        if (left == size) size++;
    }
    return size;
}`)}<p>O(n log n) time and O(n) space. The tails array is a collection of best endpoints; its current entries do not necessarily form a subsequence of the input. Store predecessor indices to reconstruct one.</p>`)}
${detail('Backtracking with constraints: board word search',`<p>Visited state belongs to a single candidate path. Mark a cell before recursion and restore it afterward so a different start or branch may reuse it. A permanent global visited set would incorrectly forbid valid paths.</p><p>For many dictionary words, a trie can prune paths whose prefixes match no word; this combines two methods rather than replacing either.</p><a href="#method-23">See the complete Word Search solution →</a>`)}
<h2>Before you say “done”</h2><ul class="checklist"><li>Empty input (if allowed), one element, all equal, duplicates, and no answer.</li><li>Correct inclusive/exclusive boundaries and index conventions.</li><li>Maximum sums/products and comparator arithmetic use safe types.</li><li>Visited timing, mutation, and backtracking restoration are intentional.</li><li>Counts and outputs use the required order; sets/maps may not preserve it.</li><li>Time includes copying/hashing; space includes the call stack.</li></ul>
<h2>Keep your work</h2><p>Notes and progress stay on this browser, not inside the downloaded HTML itself. Export a JSON backup before moving the file, clearing browser data, or switching devices. Import replaces this guide’s saved notes and progress after confirmation.</p><div class="toolbar"><button class="btn primary" data-action="export">Export progress & notes</button><button class="btn" data-action="import">Import backup</button></div>
<h2>Sources & scope</h2><p class="small muted">Study recommendations are editorial, not a statistical frequency ranking. The guide covers all problems in the Hot 100, Top Interview 150, and NeetCode 150 rosters checked below, with overlapping problems counted once. LeetCode’s official China-site study-plan data supplied the Hot 100 and Interview 150 membership snapshots; NeetCode’s published problem data supplied its roster. Problem titles link to original LeetCode statements; summaries, reasoning, and solutions here are independently written. Access policies and problem metadata can change. List membership verified September 28, 2026.</p><ul class="source-list">${Object.values(COLLECTIONS).map(c=>`<li><a target="_blank" rel="noopener noreferrer" href="${c.url}">${esc(c.name)} — ${c.expectedCount} / ${c.expectedCount} included</a></li>`).join('')}<li><a target="_blank" rel="noopener noreferrer" href="https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/HashMap.html">Oracle Java 17: HashMap</a></li><li><a target="_blank" rel="noopener noreferrer" href="https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/ArrayDeque.html">Oracle Java 17: ArrayDeque</a></li><li><a target="_blank" rel="noopener noreferrer" href="https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/PriorityQueue.html">Oracle Java: PriorityQueue operation costs</a></li></ul><p class="footnote">The practice extensions include matrix simulation, integer arithmetic, KMP, minimum spanning trees, Euler trails, and interval DP. Segment/Fenwick trees and network flow remain outside this guide. Some linked originals require a LeetCode subscription; the guide’s independently written study material works offline. All interactive features work without external scripts, fonts, or network requests. External problem/documentation links need internet access.</p>`;}
function render(){let route=location.hash.slice(1).split('?')[0]||'home';if(route==='main')return;const c=route.startsWith('method-')?C.find(x=>x.id===route.slice(7)):null;let html=c?chapter(c):route==='practice'?practice():route==='quiz'?quiz():route==='reference'?reference():route==='compare'?compare():home();$('main').innerHTML=html;if(route==='practice')renderProblems();nav();document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));$('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');window.scrollTo(0,0);document.title=(c?c.title:route==='home'?'DSA Field Guide':route[0].toUpperCase()+route.slice(1))+' · Java Interview Handbook';updateSave();}
document.addEventListener('click',async event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.section){const section=$(b.dataset.section);if(section){section.scrollIntoView({block:'start'});section.focus({preventScroll:true});}}if(b.dataset.route)go(b.dataset.route);if(b.id==='menu'){const open=$('sidebar').classList.toggle('open');b.setAttribute('aria-expanded',String(open));}if(b.classList.contains('copy')){const text=b.parentElement.querySelector('code').textContent;try{await navigator.clipboard.writeText(text);toast('Code copied');}catch(e){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'Code copied':'Select the code and copy it manually');}}const action=b.dataset.action;if(action==='resetfilters'){for(const id of ['problemsearch','problemcollection','problemdiff','problemtopic','problemstatus'])$(id).value='';syncPracticeHash();renderProblems();}if(action==='review'){state.review=!state.review;save();render();}if(action==='close')document.querySelectorAll('#main details[open]').forEach(d=>d.open=false);if(action==='nextquiz'){newQuiz();render();}if(action==='revealquiz')revealQuiz();if(action==='export'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dsa-study-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported');}if(action==='import')$('importfile').click();});
document.addEventListener('change',event=>{const e=event.target;if(e.dataset.method){state.methods[e.dataset.method]=e.value;save();nav();}if(e.dataset.problem){state.problems[e.dataset.problem]=e.value;save();document.querySelectorAll(`[data-problem="${e.dataset.problem}"]`).forEach(x=>x.value=e.value);if($('problemcount'))renderProblems();}if(['priority','navstatus'].includes(e.id))nav();if(['problemcollection','problemdiff','problemtopic','problemstatus'].includes(e.id)){syncPracticeHash();renderProblems();}});
document.addEventListener('input',event=>{const e=event.target;if(e.dataset.note){state.notes[e.dataset.note]=e.value;save();}if(e.id==='navsearch')nav();if(e.id==='problemsearch'){syncPracticeHash();renderProblems();}});
$('importfile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Backup is too large');const restored=cleanState(JSON.parse(await file.text()));if(confirm('Replace this guide’s current progress and notes with this backup?')){state=restored;save();render();toast('Backup restored');}}catch(e){toast('Could not import: '+e.message);}event.target.value='';});
window.addEventListener('hashchange',render);render();
