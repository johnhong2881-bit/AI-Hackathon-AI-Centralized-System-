// TaskFlow AI — scheduling and rescue reference (not used by the mockup UI).
// Run:  node scheduler-reference.js
// It builds the sample project, prints the risk status, then runs the rescue search.
// Does NOT include weakness penalties in matching. See FEATURES_AND_LOGIC.md section 3.8.

const TODAY = new Date(2026, 9, 12);          // Monday, day 0. Replace with the real date.
const PR = { H: 0, M: 1, L: 2 };
const LV = { Beginner: 1, Intermediate: 2, Advanced: 3 };

const clone = o => JSON.parse(JSON.stringify(o));
const dayDate = n => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; };
const fmtDay = n => dayDate(n).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const deadlineDay = p => { const [y, m, d] = p.date.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - TODAY) / 864e5); };
const capacity = (m, d) => { const a = m.av[((d % 7) + 7) % 7]; return a && a.on ? a.h : 0; };

const live = S => S.tasks.filter(t => !t.removed);
const active = t => t.as.filter(a => a.acc !== 'rejected');

// Task status is derived from assignments (section 3.5).
function taskStatus(t) {
  if (t.ov) return 'done';
  const a = active(t);
  if (!a.length) return 'todo';
  if (a.every(x => x.st === 'done')) return 'done';
  if (a.some(x => x.st !== 'todo')) return 'prog';
  return 'todo';
}

// Best strength level a member has for the skills a task needs. 0 = no match.
function skillFit(m, t) {
  let best = 0;
  m.skills.forEach(s => { if (t.skills.includes(s.n)) best = Math.max(best, LV[s.l] || 1); });
  return best;
}

// Day-by-day scheduler (section 3.3).
function schedule(S) {
  const members = Object.fromEntries(S.members.map(m => [m.id, m]));
  const used = {}; S.members.forEach(m => { used[m.id] = {}; });
  const tasks = live(S), byId = Object.fromEntries(tasks.map(t => [t.id, t]));
  const pending = new Set(tasks.map(t => t.id)), out = {};
  for (let guard = 0; pending.size && guard < 500; guard++) {
    const ready = tasks
      .filter(t => pending.has(t.id) && t.dep.every(d => !byId[d] || !pending.has(d)))
      .sort((a, b) => PR[a.pri] - PR[b.pri] || a.id - b.id);
    if (!ready.length) { pending.forEach(id => { out[id] = { s: 0, e: 999, cycle: true }; }); break; }   // dependency cycle
    const t = ready[0]; pending.delete(t.id);
    if (taskStatus(t) === 'done') { out[t.id] = { s: -1, e: -1, done: true }; continue; }
    const work = t.as.filter(a => a.acc !== 'rejected' && a.st !== 'done' && a.rem > 0);
    const depEnd = Math.max(-1, ...t.dep.filter(d => byId[d]).map(d => out[d].e));
    const start = Math.max(0, depEnd + 1);
    if (depEnd >= 999 || !active(t).length) { out[t.id] = { s: start, e: 999, blocked: true }; continue; }
    let end = -1, first = 999;
    for (const a of work) {
      let rem = a.rem, day = start, last = -1, firstDay = -1;
      for (let g = 0; rem > 0.001 && g < 200; g++, day++) {
        const free = capacity(members[a.m], day) - (used[a.m][day] || 0);
        if (free > 0) { const take = Math.min(free, rem); used[a.m][day] = (used[a.m][day] || 0) + take; rem -= take; if (firstDay < 0) firstDay = day; last = day; }
      }
      if (rem > 0.001) last = 999;
      end = Math.max(end, last); first = Math.min(first, firstDay < 0 ? start : firstDay);
    }
    out[t.id] = { s: first === 999 ? start : first, e: end < 0 ? start : end };
  }
  return out;
}

// Risk status (section 3.4). Never set this by hand.
function assess(S) {
  const map = schedule(S), dd = deadlineDay(S.project);
  const open = live(S).filter(t => taskStatus(t) !== 'done');
  const pred = open.length ? Math.max(...open.map(t => map[t.id].e)) : -1;
  const status = !open.length ? 'Complete' : dd < 0 ? 'Overdue' : pred > dd ? 'At Risk' : 'On Track';
  const perMember = S.members.map(m => {
    const load = live(S).reduce((s, t) => s + active(t).filter(a => a.m === m.id && a.st !== 'done').reduce((q, a) => q + a.rem, 0), 0);
    let cap = 0; for (let d = 0; d <= Math.max(dd, 0); d++) cap += capacity(m, d);
    return { id: m.id, load, cap, over: load > cap + 0.001 };
  });
  return { map, dd, pred, delay: pred >= 999 ? 999 : Math.max(0, pred - dd), status, perMember, open,
           delayed: open.filter(t => map[t.id].e > dd) };
}

// Critical path: follow the latest-ending unfinished dependency back from the last task.
function criticalPath(S, A) {
  if (!A.open.length) return [];
  const byId = Object.fromEntries(S.tasks.map(t => [t.id, t]));
  let t = A.open.slice().sort((a, b) => A.map[b.id].e - A.map[a.id].e || b.id - a.id)[0];
  const chain = [t.id];
  for (let i = 0; i < 20; i++) {
    const deps = t.dep.map(d => byId[d]).filter(d => d && !d.removed && A.map[d.id] && !A.map[d.id].done);
    if (!deps.length) break;
    t = deps.sort((a, b) => A.map[b.id].e - A.map[a.id].e)[0]; chain.unshift(t.id);
  }
  return chain;
}

// Does this change need the leader's approval? (section 3.9)
const needsApproval = (t, a) => !!(t.locked || a.acc === 'accepted' || a.st !== 'todo');

function applyOp(S, op) {
  const t = S.tasks.find(x => x.id === op.taskId);
  if (op.type === 'move') {
    const from = t.as.find(a => a.m === op.from && a.acc !== 'rejected'); if (!from) return;
    from.rem -= op.hours; from.alloc = Math.max(0, from.alloc - op.hours);
    if (from.rem <= 0.001) { if (from.alloc <= 0.001 && from.st === 'todo') t.as = t.as.filter(a => a !== from); else { from.rem = 0; from.st = 'done'; } }
    const to = t.as.find(a => a.m === op.to && a.acc !== 'rejected');
    if (to) { to.alloc += op.hours; to.rem += op.hours; if (to.st === 'done') to.st = 'prog'; }
    else t.as.push({ m: op.to, alloc: op.hours, rem: op.hours, st: 'todo', acc: 'pending' });
  } else if (op.type === 'relax') {                       // let a task start earlier by dropping some dependencies
    t.dep = op.deps.slice();
    Object.entries(op.push || {}).forEach(([id, add]) => { const x = S.tasks.find(y => y.id == id); add.forEach(d => { if (!x.dep.includes(d)) x.dep.push(d); }); });
  } else if (op.type === 'reduce') {                      // reduce scope: only for Low priority, always needs approval
    let left = op.hours;
    t.as.forEach(a => { if (a.acc === 'rejected' || left <= 0) return; const cut = Math.min(a.rem, left); a.rem -= cut; a.alloc = Math.max(0, a.alloc - cut); left -= cut; });
  }
}

function candidates(S, rule, A) {
  const out = [], per = Object.fromEntries(A.perMember.map(p => [p.id, p]));
  live(S).forEach(t => {
    if (taskStatus(t) === 'done') return;                                   // never touch done work
    active(t).forEach(a => {
      if (a.rem < 1 || a.st === 'done') return;
      const approval = needsApproval(t, a);
      if (approval && !rule.allowApproval) return;
      S.members.forEach(m => {
        if (m.id === a.m) return;
        const fit = skillFit(m, t); if (!fit) return;                        // add the weakness penalty here
        if (Math.max(0, per[m.id].cap - per[m.id].load) < 1) return;
        [...new Set([Math.ceil(a.rem / 2), a.rem])].forEach(hours => {
          if (hours >= 1) out.push({ type: 'move', taskId: t.id, from: a.m, to: m.id, hours, approval, fit });
        });
      });
    });
    if (rule.relax && t.relax) out.push({ type: 'relax', taskId: t.id, deps: t.relax.deps, push: t.relax.push, approval: true, fit: 0 });
    if (rule.reduce && t.pri === 'L' && !t.mand && active(t).reduce((s, a) => s + a.rem, 0) >= 3)
      out.push({ type: 'reduce', taskId: t.id, hours: 3, approval: true, fit: 0 });
  });
  return out;
}

const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

// Up to 3 attempts, each starting from the original plan (section 3.9).
function planRescue(S0) {
  const base = assess(S0);
  if (base.status !== 'At Risk' && base.status !== 'Overdue') return { needed: false, base };
  const rules = [
    { n: 1, label: 'Reallocate work that has not started', allowApproval: false, relax: false, reduce: false },
    { n: 2, label: 'Rebalance accepted work and re-order dependencies', allowApproval: true, relax: true, reduce: false },
    { n: 3, label: 'Reduce low-priority scope', allowApproval: true, relax: true, reduce: true }
  ];
  const attempts = [];
  for (const rule of rules) {
    let S = clone(S0), cur = assess(S); const ops = [];
    for (let step = 0; step < 8 && cur.pred > cur.dd - 1; step++) {       // aim for one day of buffer
      let best = null;
      for (const c of candidates(S, rule, cur)) {
        const S2 = clone(S); applyOp(S2, c); const A = assess(S2);
        const score = [A.pred, c.type === 'move' ? 0 : 1, c.approval ? 1 : 0, -(c.fit || 0), A.perMember.filter(p => p.over).length, c.hours || 0];
        if (!best || cmp(score, best.score) < 0) best = { c, A, score, S2 };
      }
      const overNow = cur.perMember.filter(p => p.over).length;
      if (!best || (best.A.pred >= cur.pred && best.A.perMember.filter(p => p.over).length >= overNow)) break;   // no improvement
      best.c.before = cur.pred; best.c.after = best.A.pred; ops.push(best.c); S = best.S2; cur = best.A;
    }
    const valid = cur.pred <= cur.dd;                                      // decided by the scheduler, never by the AI
    attempts.push({ ...rule, ops, result: cur, valid });
    if (valid) break;
  }
  return { needed: true, base, attempts };
}

// ------------------------------ sample data ------------------------------
const days = a => a.map(h => ({ on: h > 0, h }));
const members = [
  { id: 'm1', name: 'Alice', skills: [{ n: 'Research', l: 'Advanced' }, { n: 'Academic Writing', l: 'Intermediate' }, { n: 'Documentation', l: 'Intermediate' }], av: days([2, 3, 0, 2, 4, 5, 3]) },
  { id: 'm2', name: 'Bob', skills: [{ n: 'Documentation', l: 'Advanced' }, { n: 'Testing', l: 'Intermediate' }, { n: 'Academic Writing', l: 'Intermediate' }], av: days([1, 1, 2, 1, 2, 3, 3]) },
  { id: 'm3', name: 'Chloe', skills: [{ n: 'UI/UX Design', l: 'Advanced' }, { n: 'Presentation', l: 'Advanced' }, { n: 'Research', l: 'Beginner' }], av: days([2, 2, 2, 2, 2, 3, 3]) },
  { id: 'm4', name: 'David', skills: [{ n: 'Programming', l: 'Advanced' }, { n: 'Data Analysis', l: 'Intermediate' }, { n: 'Testing', l: 'Advanced' }], av: days([3, 3, 3, 3, 3, 2, 2]) }
];
// [id, title, priority, depends_on, required_skills, mandatory, [[memberIndex, allocated, remaining, status, accept]], relax?]
const T = [
  [1, 'Analyze brief and rubric', 'H', [], ['Research'], true, [[0, 3, 0, 'done', 'accepted']]],
  [2, 'Gather requirements', 'H', [1], ['Research'], true, [[0, 3, 2, 'prog', 'accepted'], [2, 3, 3, 'todo', 'accepted']]],
  [3, 'Requirements Analysis', 'H', [2], ['Research', 'Academic Writing'], true, [[0, 6, 3, 'prog', 'accepted'], [1, 4, 4, 'todo', 'pending']]],
  [4, 'Write introduction and scope', 'M', [1], ['Academic Writing'], true, [[0, 4, 4, 'todo', 'accepted']]],
  [5, 'Draw use case diagrams', 'H', [3], ['Programming'], true, [[3, 8, 8, 'todo', 'accepted']]],
  [6, 'Class and sequence diagrams', 'H', [5], ['Programming'], true, [[3, 10, 10, 'todo', 'pending']]],
  [7, 'Design system architecture', 'H', [3], ['Programming', 'UI/UX Design'], true, [[3, 8, 8, 'todo', 'pending']]],
  [8, 'UI wireframes and prototype', 'M', [3], ['UI/UX Design'], true, [[2, 8, 8, 'todo', 'accepted']]],
  [9, 'Test plan and test cases', 'M', [3, 5], ['Testing'], true, [[1, 8, 8, 'todo', 'pending']]],
  [10, 'Quality and risk plan', 'L', [9], ['Testing', 'Documentation'], true, [[1, 4, 4, 'todo', 'pending']]],
  [11, 'Compile SRS document', 'M', [3, 4, 6, 7], ['Documentation', 'Academic Writing'], false, [[0, 10, 10, 'todo', 'pending']], { deps: [3, 4], push: { 12: [6, 7] } }],
  [12, 'Referencing and formatting', 'L', [11], ['Documentation'], false, [[0, 4, 4, 'todo', 'pending']]],
  [13, 'Prepare presentation slides', 'M', [3, 6, 7], ['Presentation', 'UI/UX Design'], false, [[2, 6, 6, 'todo', 'pending']]],
  [14, 'Rehearse and finalize presentation', 'L', [13, 12], ['Presentation'], false, [[2, 2, 2, 'todo', 'pending'], [0, 2, 2, 'todo', 'pending']]],
  [15, 'Final review and submission check', 'H', [12, 10, 14], ['Documentation'], true, [[0, 3, 3, 'todo', 'pending']]]
];
const sample = {
  project: { name: 'Software Requirements Specification', date: '2026-10-30' },
  members,
  tasks: T.map(r => ({
    id: r[0], title: r[1], pri: r[2], dep: r[3], skills: r[4], mand: r[5], locked: false, relax: r[7] || null,
    as: r[6].map(a => ({ m: members[a[0]].id, alloc: a[1], rem: a[2], st: a[3], acc: a[4] }))
  }))
};

module.exports = { schedule, assess, criticalPath, planRescue, taskStatus, skillFit, needsApproval, applyOp, sample };

if (require.main === module) {
  const A = assess(sample);
  console.log(`Status: ${A.status}. Deadline ${fmtDay(A.dd)}, predicted ${fmtDay(A.pred)}, delay ${A.delay} days.`);
  console.log('Critical path (task ids):', criticalPath(sample, A).join(' -> '));
  console.log('Per member (remaining h / available h):', A.perMember.map(p => `${p.id} ${p.load}/${p.cap}${p.over ? ' OVER' : ''}`).join(', '));
  const R = planRescue(sample);
  R.attempts.forEach(a => {
    console.log(`\nAttempt ${a.n}: ${a.label}`);
    a.ops.forEach(o => console.log(`  - ${o.type} task ${o.taskId}${o.type === 'move' ? ` ${o.from}->${o.to} ${o.hours}h` : ''}  approval=${o.approval}  end ${fmtDay(o.before)} -> ${fmtDay(o.after)}`));
    console.log(`  Result: ${a.valid ? 'VALID' : 'still late'}, predicted ${fmtDay(a.result.pred)}`);
  });
}
