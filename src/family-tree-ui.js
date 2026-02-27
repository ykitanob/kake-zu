/**
 * family-tree-ui.js
 * Browser-only UI layer for 家系図作成ツール (kake-zu).
 * Depends on: Person, FamilyTree classes defined inline below
 * (Browser build — no require/module.exports)
 */

/* ------------------------------------------------------------------ */
/*  Data model (browser-compatible copy of src/family-tree.js)         */
/* ------------------------------------------------------------------ */

class Person {
  constructor({ id, name, gender = 'other', birthDate = null, deathDate = null, note = '' }) {
    if (!id)   throw new Error('id is required');
    if (!name) throw new Error('name is required');
    this.id = id; this.name = name; this.gender = gender;
    this.birthDate = birthDate; this.deathDate = deathDate; this.note = note;
  }
  toJSON() {
    return { id: this.id, name: this.name, gender: this.gender,
      birthDate: this.birthDate, deathDate: this.deathDate, note: this.note };
  }
}

class FamilyTree {
  constructor() {
    this.persons = new Map();
    this.parentChildRelations = new Map();
    this.spouseRelations = new Map();
  }
  addPerson(person) {
    if (this.persons.has(person.id)) throw new Error(`Person '${person.id}' already exists`);
    this.persons.set(person.id, person);
    this.parentChildRelations.set(person.id, new Set());
    this.spouseRelations.set(person.id, new Set());
    return this;
  }
  getPerson(id) {
    const p = this.persons.get(id);
    if (!p) throw new Error(`Person '${id}' not found`);
    return p;
  }
  removePerson(id) {
    if (!this.persons.has(id)) throw new Error(`Person '${id}' not found`);
    this.persons.delete(id);
    this.parentChildRelations.delete(id);
    for (const ch of this.parentChildRelations.values()) ch.delete(id);
    this.spouseRelations.delete(id);
    for (const sp of this.spouseRelations.values()) sp.delete(id);
    return this;
  }
  addParentChild(parentId, childId) {
    if (!this.persons.has(parentId)) throw new Error(`Parent '${parentId}' not found`);
    if (!this.persons.has(childId))  throw new Error(`Child '${childId}' not found`);
    if (parentId === childId) throw new Error('A person cannot be their own parent');
    this.parentChildRelations.get(parentId).add(childId);
    return this;
  }
  addSpouse(id1, id2) {
    if (!this.persons.has(id1)) throw new Error(`Person '${id1}' not found`);
    if (!this.persons.has(id2)) throw new Error(`Person '${id2}' not found`);
    if (id1 === id2) throw new Error('A person cannot be their own spouse');
    this.spouseRelations.get(id1).add(id2);
    this.spouseRelations.get(id2).add(id1);
    return this;
  }
  getChildren(parentId)  { return [...this.parentChildRelations.get(parentId)].map(id => this.persons.get(id)); }
  getParents(childId) {
    const parents = [];
    for (const [pid, ch] of this.parentChildRelations) if (ch.has(childId)) parents.push(this.persons.get(pid));
    return parents;
  }
  getSpouses(personId) { return [...this.spouseRelations.get(personId)].map(id => this.persons.get(id)); }
  getAllPersons() { return [...this.persons.values()]; }
  toJSON() {
    const persons = [...this.persons.values()].map(p => p.toJSON());
    const parentChildRelations = [];
    for (const [pid, ch] of this.parentChildRelations)
      for (const cid of ch) parentChildRelations.push({ parentId: pid, childId: cid });
    const spouseRelations = [];
    const seen = new Set();
    for (const [pid, sp] of this.spouseRelations)
      for (const sid of sp) {
        const key = [pid, sid].sort().join(':');
        if (!seen.has(key)) { seen.add(key); spouseRelations.push({ personId1: pid, personId2: sid }); }
      }
    return { persons, parentChildRelations, spouseRelations };
  }
  static fromJSON(data) {
    const tree = new FamilyTree();
    for (const p of data.persons)             tree.addPerson(new Person(p));
    for (const r of data.parentChildRelations) tree.addParentChild(r.parentId, r.childId);
    for (const r of data.spouseRelations)      tree.addSpouse(r.personId1, r.personId2);
    return tree;
  }
}

/* ------------------------------------------------------------------ */
/*  UI state                                                            */
/* ------------------------------------------------------------------ */

let tree = new FamilyTree();
let selectedPersonId = null;
let _idCounter = 0;
const genId = () => `p${++_idCounter}_${Date.now()}`;

// Canvas pan/zoom
const canvas  = document.getElementById('tree-canvas');
const ctx     = canvas.getContext('2d');
const wrap    = document.getElementById('canvas-wrap');
let scale     = 1;
let offsetX   = 40;
let offsetY   = 40;
let isDragging = false;
let dragStart  = { x: 0, y: 0 };

/* ------------------------------------------------------------------ */
/*  Tab switching                                                        */
/* ------------------------------------------------------------------ */

document.querySelectorAll('.sidebar-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['members','relations','io'].forEach(t =>
      document.getElementById(`tab-${t}`).style.display = btn.dataset.tab === t ? '' : 'none');
  });
});

/* ------------------------------------------------------------------ */
/*  Add person                                                          */
/* ------------------------------------------------------------------ */

document.getElementById('btn-add-person').addEventListener('click', () => {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { alert('氏名を入力してください'); return; }
  try {
    const person = new Person({
      id:        genId(),
      name,
      gender:    document.getElementById('inp-gender').value,
      birthDate: document.getElementById('inp-birth').value || null,
      deathDate: document.getElementById('inp-death').value || null,
      note:      document.getElementById('inp-note').value.trim(),
    });
    tree.addPerson(person);
    // reset form
    ['inp-name','inp-birth','inp-death','inp-note'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('inp-gender').value = 'other';
    refresh();
  } catch (e) { alert(e.message); }
});

/* ------------------------------------------------------------------ */
/*  Relations                                                           */
/* ------------------------------------------------------------------ */

document.getElementById('btn-add-pc').addEventListener('click', () => {
  const parentId = document.getElementById('rel-parent').value;
  const childId  = document.getElementById('rel-child').value;
  const err = document.getElementById('rel-error');
  err.textContent = '';
  try {
    if (!parentId || !childId) throw new Error('親と子を選択してください');
    tree.addParentChild(parentId, childId);
    refresh();
  } catch (e) { err.textContent = e.message; }
});

document.getElementById('btn-add-sp').addEventListener('click', () => {
  const spouseId1 = document.getElementById('rel-sp1').value;
  const spouseId2 = document.getElementById('rel-sp2').value;
  const err = document.getElementById('rel-error');
  err.textContent = '';
  try {
    if (!spouseId1 || !spouseId2) throw new Error('二人を選択してください');
    tree.addSpouse(spouseId1, spouseId2);
    refresh();
  } catch (e) { err.textContent = e.message; }
});

/* ------------------------------------------------------------------ */
/*  Delete person                                                        */
/* ------------------------------------------------------------------ */

document.getElementById('btn-delete-person').addEventListener('click', () => {
  if (!selectedPersonId) return;
  if (!confirm(`「${tree.getPerson(selectedPersonId).name}」を削除しますか？`)) return;
  tree.removePerson(selectedPersonId);
  selectedPersonId = null;
  hideDetail();
  refresh();
});

/* ------------------------------------------------------------------ */
/*  Import / Export                                                      */
/* ------------------------------------------------------------------ */

document.getElementById('btn-export').addEventListener('click', () => {
  document.getElementById('io-export').value = JSON.stringify(tree.toJSON(), null, 2);
});

document.getElementById('btn-import').addEventListener('click', () => {
  const err = document.getElementById('io-error');
  err.textContent = '';
  try {
    const data = JSON.parse(document.getElementById('io-import').value);
    tree = FamilyTree.fromJSON(data);
    selectedPersonId = null;
    hideDetail();
    refresh();
    document.getElementById('io-import').value = '';
  } catch (e) { err.textContent = `読み込みエラー: ${e.message}`; }
});

/* ------------------------------------------------------------------ */
/*  Canvas layout                                                        */
/* ------------------------------------------------------------------ */

const NODE_W = 110;
const NODE_H = 46;
const H_GAP  = 30;
const V_GAP  = 70;

/**
 * Assign (x,y) positions to each person using a simple generation-based layout.
 * Returns a Map<id, {x,y,person}>
 */
function computeLayout() {
  const persons = tree.getAllPersons();
  if (persons.length === 0) return new Map();

  // Assign generations (BFS from roots)
  const genMap = new Map();
  const roots = persons.filter(p => tree.getParents(p.id).length === 0).map(p => p.id);
  if (roots.length === 0) {
    // fallback: treat first person as root
    roots.push(persons[0].id);
  }
  const queue = roots.map(id => ({ id, gen: 0 }));
  while (queue.length) {
    const { id, gen } = queue.shift();
    if (genMap.has(id)) continue;
    genMap.set(id, gen);
    for (const child of tree.getChildren(id)) {
      if (!genMap.has(child.id)) queue.push({ id: child.id, gen: gen + 1 });
    }
  }
  // Any unvisited person
  for (const p of persons) {
    if (!genMap.has(p.id)) genMap.set(p.id, 0);
  }

  // Group by generation
  const genGroups = new Map();
  for (const [id, gen] of genMap) {
    if (!genGroups.has(gen)) genGroups.set(gen, []);
    genGroups.get(gen).push(id);
  }

  const layout = new Map();
  const sortedGens = [...genGroups.keys()].sort((a,b) => a-b);
  sortedGens.forEach((gen, gi) => {
    const ids = genGroups.get(gen);
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    let startX = -totalW / 2;
    ids.forEach((id, xi) => {
      layout.set(id, {
        x: startX + xi * (NODE_W + H_GAP),
        y: gi * (NODE_H + V_GAP),
        person: tree.getPerson(id),
      });
    });
  });
  return layout;
}

let nodeLayout = new Map();

function drawTree() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width  = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  nodeLayout = computeLayout();
  if (nodeLayout.size === 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人物を追加すると家系図が表示されます', w/2, h/2);
    return;
  }

  ctx.save();
  ctx.translate(w/2 + offsetX, h/4 + offsetY);
  ctx.scale(scale, scale);

  // Draw spouse lines
  ctx.strokeStyle = '#e75480';
  ctx.lineWidth = 2;
  const drawnSpouses = new Set();
  for (const [id, node] of nodeLayout) {
    for (const spouse of tree.getSpouses(id)) {
      const key = [id, spouse.id].sort().join(':');
      if (drawnSpouses.has(key)) continue;
      drawnSpouses.add(key);
      const sn = nodeLayout.get(spouse.id);
      if (!sn) continue;
      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      const x1 = node.x + NODE_W, y1 = node.y + NODE_H/2;
      const x2 = sn.x, y2 = sn.y + NODE_H/2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Draw parent-child lines
  ctx.strokeStyle = '#4a3728';
  ctx.lineWidth = 1.5;
  for (const [id, node] of nodeLayout) {
    for (const child of tree.getChildren(id)) {
      const cn = nodeLayout.get(child.id);
      if (!cn) continue;
      const px = node.x + NODE_W/2, py = node.y + NODE_H;
      const cx = cn.x + NODE_W/2,  cy = cn.y;
      const my = (py + cy) / 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.bezierCurveTo(px, my, cx, my, cx, cy);
      ctx.stroke();
    }
  }

  // Draw nodes
  for (const [id, node] of nodeLayout) {
    const { x, y, person } = node;
    const isSelected = id === selectedPersonId;

    // Box
    ctx.fillStyle = isSelected ? '#4a3728' :
      (person.gender === 'male' ? '#dce8f8' :
       person.gender === 'female' ? '#fde8f0' : '#f0ede8');
    ctx.strokeStyle = isSelected ? '#4a3728' : '#aaa';
    ctx.lineWidth = isSelected ? 2 : 1;
    roundRect(ctx, x, y, NODE_W, NODE_H, 6);
    ctx.fill();
    ctx.stroke();

    // Name
    ctx.fillStyle = isSelected ? '#fff' : '#222';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(person.name, x + NODE_W/2, y + NODE_H/2 - 7, NODE_W - 8);

    // Birth year
    if (person.birthDate) {
      ctx.fillStyle = isSelected ? '#ddd' : '#888';
      ctx.font = '10px sans-serif';
      ctx.fillText(person.birthDate.slice(0,4) + '年生', x + NODE_W/2, y + NODE_H/2 + 9, NODE_W - 8);
    }
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/*  Canvas interaction                                                   */
/* ------------------------------------------------------------------ */

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  dragStart = { x: e.clientX - offsetX, y: e.clientY - offsetY };
});

canvas.addEventListener('mousemove', e => {
  if (!isDragging) return;
  offsetX = e.clientX - dragStart.x;
  offsetY = e.clientY - dragStart.y;
  drawTree();
});

canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  scale = Math.min(3, Math.max(0.3, scale * delta));
  drawTree();
}, { passive: false });

canvas.addEventListener('click', e => {
  if (isDragging) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left - canvas.width/2 - offsetX) / scale;
  const my = (e.clientY - rect.top  - canvas.height/4 - offsetY) / scale;

  let hit = null;
  for (const [id, node] of nodeLayout) {
    if (mx >= node.x && mx <= node.x + NODE_W && my >= node.y && my <= node.y + NODE_H) {
      hit = id; break;
    }
  }
  if (hit) { selectedPersonId = hit; showDetail(hit); }
  else      { selectedPersonId = null; hideDetail(); }
  drawTree();
});

document.getElementById('btn-zoom-in').addEventListener('click',  () => { scale = Math.min(3, scale * 1.2); drawTree(); });
document.getElementById('btn-zoom-out').addEventListener('click', () => { scale = Math.max(0.3, scale / 1.2); drawTree(); });
document.getElementById('btn-fit').addEventListener('click', () => { scale = 1; offsetX = 40; offsetY = 40; drawTree(); });

/* ------------------------------------------------------------------ */
/*  Detail panel                                                         */
/* ------------------------------------------------------------------ */

const genderLabel = { male: '男性', female: '女性', other: '未設定' };

function showDetail(id) {
  const p = tree.getPerson(id);
  document.getElementById('dp-name').textContent   = p.name;
  document.getElementById('dp-gender').textContent = genderLabel[p.gender] || p.gender;
  document.getElementById('dp-birth').textContent  = p.birthDate  || '—';
  document.getElementById('dp-death').textContent  = p.deathDate  || '—';
  document.getElementById('dp-parents').textContent  = tree.getParents(id).map(x => x.name).join('、') || '—';
  document.getElementById('dp-children').textContent = tree.getChildren(id).map(x => x.name).join('、') || '—';
  document.getElementById('dp-spouses').textContent  = tree.getSpouses(id).map(x => x.name).join('、') || '—';

  const noteRow = document.getElementById('dp-note-row');
  if (p.note) {
    document.getElementById('dp-note').textContent = p.note;
    noteRow.style.display = '';
  } else {
    noteRow.style.display = 'none';
  }
  document.getElementById('detail-panel').classList.add('visible');
}

function hideDetail() {
  document.getElementById('detail-panel').classList.remove('visible');
}

/* ------------------------------------------------------------------ */
/*  Refresh all UI elements                                              */
/* ------------------------------------------------------------------ */

function refresh() {
  refreshPersonList();
  refreshRelationSelects();
  drawTree();
  saveToStorage();
}

function refreshPersonList() {
  const list = document.getElementById('person-list');
  const persons = tree.getAllPersons();
  if (persons.length === 0) {
    list.innerHTML = '<div class="empty-state">まだ人物がいません</div>';
    return;
  }
  list.innerHTML = persons.map(p => `
    <div class="person-item ${p.id === selectedPersonId ? 'selected' : ''}" data-id="${p.id}">
      <span class="person-dot dot-${p.gender}"></span>
      <span class="person-name">${esc(p.name)}</span>
      ${p.birthDate ? `<span class="person-dates">${p.birthDate.slice(0,4)}</span>` : ''}
    </div>`).join('');

  list.querySelectorAll('.person-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedPersonId = el.dataset.id;
      showDetail(selectedPersonId);
      drawTree();
      refreshPersonList();
    });
  });
}

function refreshRelationSelects() {
  const persons = tree.getAllPersons();
  const options = `<option value="">--- 選択 ---</option>` +
    persons.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  ['rel-parent','rel-child','rel-sp1','rel-sp2'].forEach(id =>
    document.getElementById(id).innerHTML = options);
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ------------------------------------------------------------------ */
/*  LocalStorage persistence                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'kake-zu-data';

function saveToStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tree.toJSON())); } catch (_) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { tree = FamilyTree.fromJSON(JSON.parse(raw)); }
  } catch (_) { tree = new FamilyTree(); }
}

/* ------------------------------------------------------------------ */
/*  Responsive canvas resize                                             */
/* ------------------------------------------------------------------ */

const resizeObserver = new ResizeObserver(() => drawTree());
resizeObserver.observe(wrap);

/* ------------------------------------------------------------------ */
/*  Init                                                                 */
/* ------------------------------------------------------------------ */

loadFromStorage();
refresh();
