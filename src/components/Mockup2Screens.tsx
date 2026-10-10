'use client';

import { useEffect, useRef, useState, type Key as ReactKey } from 'react';
import { useMockupStore2, type ScreenId } from '@/store/useMockupStore2';
import {
  AVC, MEM, LVN, DN, TABS,
  STG, TK, PGP, GT, PROJECTS, PROJECT_MEMBERS, FLOW,
  type TaskStatus, type PgpMember,
} from '@/lib/mock/mockTaskflow2';

// ===== Helpers =====
const av = (k: string, c = '', key?: ReactKey) => <span key={key} className={`av ${AVC[k] || 'av4'} ${c}`}>{k}</span>;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const lv = (n: number) => <span className="lv">{[1, 2, 3].map(i => <i key={i} className={i <= n ? 'f' : ''} />)}</span>;
const skc = (s: [string, number]) => <span className="sk">{s[0]} {lv(s[1])}</span>;
const pri = (p: string) => {
  const ic = p === 'H' ? 'chevrons-up' : p === 'M' ? 'chevron-up' : 'chevron-down';
  const label = p === 'H' ? 'High' : p === 'M' ? 'Medium' : 'Low';
  return <span className={`pri pri-${p}`}><i className={`ti ti-${ic}`} />{label}</span>;
};
const SI: Record<TaskStatus, JSX.Element> = {
  prog: <i className="ti ti-progress si prog" />,
  todo: <i className="ti ti-circle si" />,
  done: <i className="ti ti-circle-check si done" />,
};

// ===== Stepper =====
function Stepper({ step }: { step: number }) {
  const go = useMockupStore2(s => s.go);
  const labels = ['Project Details', 'Team Setup', 'Review & Generate'];
  const ids: ScreenId[] = ['create', 'team', 'review'];
  return (
    <div className="stp">
      {labels.map((x, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 && <div className={`ln ${i < step ? 'dn' : ''}`} />}
          <div
            className={`s ${i + 1 === step ? 'on' : i + 1 < step ? 'dn' : ''}`}
            onClick={i + 1 < step ? () => go(ids[i]) : undefined}
          >
            <div className="n">{i + 1 < step ? <i className="ti ti-check" /> : i + 1}</div>
            <span className="t">{x}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Workspace Header =====
function WorkspaceHeader({ tab }: { tab: string }) {
  const go = useMockupStore2(s => s.go);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const openTasks = project.tasks - project.done;

  return (
    <div data-ws={tab}>
      <div className="crumb sm mut mb8">
        <span style={{ cursor: 'pointer' }} onClick={() => go('project')}>Projects</span> / {project.name}
      </div>
      <div className="row wrap g12">
        <div>
          <div className="row g12 wrap">
            <h1 className="h1">{project.name}</h1>
            <span className={`stat s-${project.status}`}>{project.statusLabel}</span>
          </div>
          <div className="row wrap g16 sm mut mt8">
            <span><i className="ti ti-calendar" /> Due {project.due}</span>
            <span><i className="ti ti-users" /> {project.members} members</span>
            <span><i className="ti ti-list-check" /> {openTasks > 0 ? `${openTasks} open tasks` : 'All tasks done'}</span>
            <span className="badge b-ai"><i className="ti ti-sparkles" /> AI plan v1</span>
          </div>
        </div>
        <span className="sp" />
        <button className="btn" onClick={() => openOverlay('mdEdit')}><i className="ti ti-pencil" /> Edit project</button>
      </div>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t[0]} className={`tab ${t[0] === tab ? 'on' : ''}`} onClick={() => go(t[0] as ScreenId)}>
            {t[1]}{t[2] && <span className={`badge ${t[2] === '!' || t[2] === '1 gap' ? 'b-wn' : ''}`}>
              {t[2] === '!' ? <i className="ti ti-alert-triangle" /> : t[2]}
            </span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== Create Screen =====
function CreateScreen() {
  const go = useMockupStore2(s => s.go);
  const fileState = useMockupStore2(s => s.fileState);
  const setFileState = useMockupStore2(s => s.setFileState);
  const addToast = useMockupStore2(s => s.addToast);
  const [name, setName] = useState('Software Requirements Specification');
  const [uploadMode, setUploadMode] = useState<'aUp' | 'aTx'>('aUp');
  const [rubricInclude, setRubricInclude] = useState(true);

  return (
    <section className="scr page on" id="s-create" style={{ maxWidth: 900 }}>
      <Stepper step={1} />
      <div>
        <div className="card">
          <h2 className="h2">Project details</h2>
          <p className="mut sm mt4 mb16">Tell us what the assignment is. The AI reads it in the next step.</p>
          <div className="mb16">
            <label className="fl">Project name <span className="mut3">(required)</span></label>
            <input className={`inp ${!name.trim() ? 'bad' : ''}`} value={name} maxLength={100} placeholder="e.g. Software Requirements Specification"
              onChange={e => setName(e.target.value)} />
            <div className="row xs mut3 mt4">
              {!name.trim() && <span className="err"><i className="ti ti-alert-circle" />Enter a project name.</span>}
              <span className="sp" />
              <span>{name.length} / 100</span>
            </div>
          </div>
          <div className="mb16">
            <label className="fl">Project description <span className="mut3">(optional)</span></label>
            <textarea className="inp" placeholder="Briefly describe your project..." defaultValue="Group SRS for a student library management system, plus a 10-minute presentation." />
          </div>
          <div className="mb16">
            <label className="fl">Number of team members <span className="mut3">(required)</span></label>
            <div className="row g12 wrap">
              <div className="num"><button onClick={() => addToast('Mockup: team size adjusted', 'ti-info-circle')} aria-label="Fewer members">&#x2212;</button><input type="number" min={2} max={10} defaultValue={4} readOnly /><button onClick={() => addToast('Mockup: team size adjusted', 'ti-info-circle')} aria-label="More members">+</button></div>
              <span className="sm mut">members including you</span>
            </div>
            <div className="hint">You&rsquo;ll add each member&rsquo;s skills and availability in the next step. Teams of 2 to 10 are supported.</div>
          </div>
          <div className="mb16">
            <div className="row mb8">
              <label className="fl" style={{ margin: 0 }}>Assignment document</label>
              <span className="sp" />
              <div className="seg">
                <button className={uploadMode === 'aUp' ? 'on' : ''} onClick={() => setUploadMode('aUp')}>Upload PDF</button>
                <button className={uploadMode === 'aTx' ? 'on' : ''} onClick={() => setUploadMode('aTx')}>Paste text</button>
              </div>
            </div>
            {uploadMode === 'aUp' && (
              <>
                {fileState === 'ok' && (
                  <div className="file">
                    <div className="fi"><i className="ti ti-file-type-pdf" /></div>
                    <div>
                      <div className="b">SRS_Assignment_Brief.pdf</div>
                      <div className="xs mut">1.2 MB · 6 pages · text extracted <i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /></div>
                    </div>
                    <span className="sp" />
                    <button className="btn btn-sm" onClick={() => addToast('Choose a file in the real app. This is a mockup.', 'ti-info-circle')}><i className="ti ti-refresh" /> Replace</button>
                    <button className="icb" onClick={() => setFileState('empty')} title="Remove"><i className="ti ti-x" /></button>
                  </div>
                )}
                {fileState === 'empty' && (
                  <div className="dz">
                    <i className="ti ti-cloud-upload" style={{ fontSize: 30, color: 'var(--blue)' }} />
                    <div className="b mt4">Drag and drop your assignment PDF</div>
                    <div className="sm mut">or <span style={{ color: 'var(--blue)' }}>browse files</span> · PDF up to 20 MB</div>
                  </div>
                )}
                {(fileState === 'type' || fileState === 'parse') && (
                  <div className="dz bad">
                    <i className="ti ti-file-alert" style={{ fontSize: 28, color: 'var(--dg)' }} />
                    <div className="b mt4">{fileState === 'type' ? 'Only PDF files are supported' : 'We couldn\u2019t read this PDF'}</div>
                    <div className="sm mut">{fileState === 'type' ? '\u201Cnotes.docx\u201D can\u2019t be read. Export it as a PDF or paste the text instead.' : '\u201Cscan_01.pdf\u201D looks like a scanned image with no text. Paste the text instead.'}</div>
                    <div className="row g8 mt12" style={{ justifyContent: 'center' }}>
                      <button className="btn btn-sm" onClick={() => addToast('Choose a file in the real app.', 'ti-info-circle')}>Choose another file</button>
                      <button className="btn btn-sm" onClick={() => setUploadMode('aTx')}>Paste text instead</button>
                    </div>
                  </div>
                )}
                <div className="xs mut3 mt8">Mockup states:
                  <button className="lnk" onClick={() => setFileState('ok')}>uploaded</button> ·
                  <button className="lnk" onClick={() => setFileState('empty')}>no file</button> ·
                  <button className="lnk" onClick={() => setFileState('type')}>invalid type</button> ·
                  <button className="lnk" onClick={() => setFileState('parse')}>parsing error</button>
                </div>
              </>
            )}
            {uploadMode === 'aTx' && <textarea className="inp" style={{ minHeight: 130 }} placeholder="Paste the assignment brief here" />}
          </div>
          <div className="mb16">
            <label className="fl">Grading rubric</label>
            <label className="row g8" style={{ cursor: 'pointer' }}>
              <input type="checkbox" className="ck" checked={rubricInclude} onChange={e => setRubricInclude(e.target.checked)} />
              <span>My assignment document already includes the grading rubric.</span>
            </label>
            {rubricInclude ? (
              <div className="hint">Good. TaskFlow will find the rubric inside the PDF and ask you to review it.</div>
            ) : (
              <div className="mt12">
                <div className="dz" style={{ padding: 18 }}>
                  <i className="ti ti-upload" style={{ fontSize: 22, color: 'var(--blue)' }} />
                  <div className="b sm">Upload rubric PDF or paste text</div>
                </div>
                <div className="alert al-wn mt12 sm"><i className="ti ti-alert-triangle" /><div>No separate rubric provided. The AI will try to identify one in the assignment and flag it for your review.</div></div>
              </div>
            )}
          </div>
          <div className="rowt g16 wrap">
            <div style={{ flex: 1, minWidth: 160 }}><label className="fl">Deadline date</label><input className="inp" type="date" defaultValue="2026-10-30" min="2026-10-12" /></div>
            <div style={{ flex: 1, minWidth: 130 }}><label className="fl">Time</label><input className="inp" type="time" defaultValue="17:00" /></div>
            <div style={{ flex: 1, minWidth: 160 }}><label className="fl">Timezone</label><div className="inp mut sm" style={{ background: 'var(--soft)' }}><i className="ti ti-world" /> Asia/Kuala_Lumpur (GMT+8)</div></div>
          </div>
          <div className="alert al-blue mt12 sm"><i className="ti ti-calendar-event" /><div><b>Friday 30 October 2026 at 17:00</b> · 18 days from today. Past dates can&apos;t be selected.</div></div>
        </div>
      </div>
      <div className="row mt24">
        <button className="btn btn-lg" onClick={() => go('project')}><i className="ti ti-arrow-left" /> Back</button>
        <button className="btn btn-sm btn-g" onClick={() => { setName(''); addToast('Form cleared', 'ti-eraser'); }}><i className="ti ti-eraser" /> Clear form</button>
        <span className="sp" />
        <button className="btn btn-p btn-lg" onClick={() => go('team')}>Continue to Team Setup <i className="ti ti-arrow-right" /></button>
      </div>
    </section>
  );
}

// ===== Team Screen =====
function TeamScreen() {
  const go = useMockupStore2(s => s.go);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const addToast = useMockupStore2(s => s.addToast);
  const combinedHours = sum(MEM.map(m => sum(m.h)));

  return (
    <section className="scr page on" id="s-team" style={{ maxWidth: 960 }}>
      <Stepper step={2} />
      <div className="card flat mb16" style={{ padding: '16px 22px' }}>
        <div className="row wrap" style={{ gap: 28 }}>
          <div><div className="xs mut">Members</div><div className="h2">{MEM.length}</div></div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 28 }}><div className="xs mut">Combined weekly hours</div><div className="h2">{combinedHours} h</div></div>
        </div>
      </div>
      <div className="card">
        <div className="row mb8">
          <div><h2 className="h2">Team members <span className="badge b-ok">{MEM.length} / {MEM.length}</span></h2><p className="mut sm mt4">Strengths, weaknesses and weekly availability let the AI assign work fairly.</p></div>
          <span className="sp" />
          <button className="btn btn-p" onClick={() => openOverlay('drMember')}><i className="ti ti-plus" /> Add team member</button>
        </div>
        <div className="alert al-ok sm mb12"><i className="ti ti-circle-check" /><div>All {MEM.length} members are added. Team size matches your project setup.</div></div>
        {MEM.map((m, i) => (
          <div key={m.k} className="mrow" style={i === 0 ? { borderTop: 0 } : {}}>
            {av(m.k, 'l')}
            <div>
              <div className="b">{m.n} {m.lead ? <span className="badge b-blue">Leader</span> : ''}</div>
              <div className="xs mut">{sum(m.h)} h / week</div>
            </div>
            <div>
              <div className="row wrap g6"><span className="xs mut3" style={{ width: 62 }}>Strengths</span>{m.sk.map(skc)}</div>
              <div className="row wrap g6 mt4"><span className="xs mut3" style={{ width: 62 }}>Weak at</span>{m.wk.map((w, j) => <span key={j} className="sk sk-w"><i className="ti ti-arrow-down-right" />{w}</span>)}</div>
            </div>
            <div className="wk">{m.h.map((h, j) => <i key={j} style={{ height: Math.max(2, h * 5) + 'px' }} title={`${h} h`} />)}</div>
            <div className="row g4">
              <button className="icb" onClick={() => openOverlay('drMember')} title="Edit"><i className="ti ti-pencil" /></button>
              <button className="icb" onClick={() => addToast(`${m.n} removed from the team`, 'ti-user-minus')} title="Remove"><i className="ti ti-trash" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="row mt24">
        <button className="btn btn-lg" onClick={() => go('create')}><i className="ti ti-arrow-left" /> Back</button>
        <span className="sp" />
        <button className="btn btn-p btn-lg" onClick={() => go('review')}>Continue to Review <i className="ti ti-arrow-right" /></button>
      </div>
    </section>
  );
}

// ===== Review Screen =====
function ReviewScreen() {
  const go = useMockupStore2(s => s.go);
  return (
    <section className="scr page on" id="s-review" style={{ maxWidth: 960 }}>
      <Stepper step={3} />
      <div className="col g16">
        <div className="card">
          <div className="row mb12"><h2 className="h3">Project summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('create')}>Edit</button></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Name</span><b>Software Requirements Specification</b></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Description</span><span>Group SRS for a student library management system, plus a 10-minute presentation.</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Deadline</span><span><b>Fri 30 Oct 2026, 17:00</b> (Asia/Kuala_Lumpur)</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Assignment</span><span><i className="ti ti-file-type-pdf" style={{ color: 'var(--dg)' }} /> SRS_Assignment_Brief.pdf · 1.2 MB</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Team size</span><span><b>4</b> members</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Rubric source</span><span className="badge b-blue">Included in assignment PDF</span></div>
        </div>
        <div className="card">
          <div className="row mb12"><h2 className="h3">Team summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('team')}>Edit</button></div>
          {MEM.map(m => (
            <div key={m.k} className="mrow" style={{ gridTemplateColumns: '44px 1fr 1.8fr 120px' }}>
              {av(m.k, 'l')}
              <div><div className="b">{m.n}</div><div className="xs mut">{sum(m.h)} h / week</div></div>
              <div>
                <div className="row wrap g6">{m.sk.map(s => <span key={s[0]} className="sk">{s[0]} · {LVN[s[1]]}</span>)}</div>
                <div className="row wrap g6 mt4">{m.wk.map((w, j) => <span key={j} className="sk sk-w"><i className="ti ti-arrow-down-right" />{w}</span>)}</div>
              </div>
              <div className="xs mut">{m.h.map((h, i) => DN[i].slice(0, 1) + h).join(' ')}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="row mt24">
        <button className="btn btn-lg" onClick={() => go('team')}><i className="ti ti-arrow-left" /> Back</button>
        <span className="sp" />
        <button className="btn btn-ai btn-lg" onClick={() => go('analysis')}><i className="ti ti-sparkles" /> Create project and generate AI plan</button>
      </div>
      <p className="xs mut" style={{ textAlign: 'right', marginTop: 10 }}>AI will analyze your assignment, generate tasks, match team members, estimate workloads, and predict deadline risks.</p>
    </section>
  );
}

// ===== Analysis Screen =====
function AnalysisScreen() {
  const go = useMockupStore2(s => s.go);
  const [active, setActive] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setActive(0);
    intervalRef.current = setInterval(() => {
      setActive(prev => {
        if (prev >= STG.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => { if (useMockupStore2.getState().screen === 'analysis') { useMockupStore2.getState().addToast('Plan ready: 15 tasks, 96 hours'); go('overview'); } }, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const ic: Record<string, string> = { dn: 'ti-check', wn: 'ti-alert-triangle', run: 'ti-loader-2 spin', pend: 'ti-dots' };
  const cl: Record<string, string> = { dn: 'dn', wn: 'wn', run: 'run', pend: 'pend' };
  const stageStatus: Record<string, string> = { dn: 'Done', wn: 'Needs attention', run: 'Running', pend: 'Pending' };

  return (
    <section className="scr page on" id="s-analysis" style={{ maxWidth: 720 }}>
      <div className="mb16">
        <div className="eyebrow">AI planning</div>
        <h1 className="h1 mt4">Building your project plan</h1>
        <p className="mut mt4">We&apos;ll open your project as soon as it&apos;s ready.</p>
      </div>
      <div className="card">
        <div className="row mb8"><div className="h3">AI activity</div><span className="sp" /><span className="badge b-blue">{active >= STG.length ? 'Complete' : `Step ${active + 1} of ${STG.length}`}</span></div>
        {STG.map((s, i) => {
          const status = i < active ? (s[3] === 'w' ? 'wn' : 'dn') : i === active ? 'run' : 'pend';
          return (
            <div key={i} className={`stg ${cl[status]}`}>
              <div className="dot"><i className={`ti ${ic[status]}`} /></div>
              <div>
                <div className="b">{s[0]}</div>
                <div className="xs mut">{s[1]}</div>
                {i < active && s[2] && <div className="xs mt4" style={{ color: s[3] === 'w' ? 'var(--wn)' : 'var(--ink2)' }}>{s[2]}</div>}
              </div>
              <div className="xs mut3">{stageStatus[status]}</div>
            </div>
          );
        })}
      </div>
      <div className="row mt16 wrap">
        <span className="demo"><i className="ti ti-flask" /> Demo sequence · simulated, not a real AI run</span>
        <span className="sp" />
        <button className="btn btn-g btn-sm" onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); go('overview'); }}>Skip to my project</button>
      </div>
    </section>
  );
}

// ===== Overview Screen =====
function OverviewScreen() {
  const go = useMockupStore2(s => s.go);
  const expandedProgress = useMockupStore2(s => s.expandedProgress);
  const toggleProgress = useMockupStore2(s => s.toggleProgress);
  const progressSort = useMockupStore2(s => s.progressSort);
  const setProgressSort = useMockupStore2(s => s.setProgressSort);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const activeProjectId = useMockupStore2(s => s.activeProjectId);

  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const isCompleted = project.statusLabel === 'Completed';
  const isAtRisk = project.status === 'dg';

  const pgStats = (m: PgpMember) => {
    const al = sum(m[5].map(t => t[1]));
    const dn = sum(m[5].map(t => t[1] - t[2]));
    return { al, dn, left: al - dn, pc: al ? Math.round(dn / al * 100) : 0, nd: m[5].filter(t => t[3] === 'done').length };
  };

  // Filter PGP to only show members in the active project
  const projectPGP = PGP.filter(m => memberKeys.includes(m[0]));
  let rows = projectPGP.map((m, i) => ({ m, i, s: pgStats(m) }));
  if (progressSort === 'low') rows.sort((a, b) => a.s.pc - b.s.pc || a.i - b.i);

  const memberCount = projectPGP.length;

  const tt: Record<string, string[]> = {};
  rows.forEach(r => r.m[5].forEach(t => { (tt[t[0]] = tt[t[0]] || []).push(t[3]); }));
  const titles = Object.keys(tt);
  const doneT = titles.filter(k => tt[k].every(x => x === 'done')).length;
  const AL = sum(rows.map(r => r.s.al));
  const DN2 = sum(rows.map(r => r.s.dn));

  return (
    <section className="scr page wide on" id="s-overview">
      <WorkspaceHeader tab="overview" />
      {!isCompleted && (
        <div className="card mb16">
          <div className="row mb12 wrap">
            <div><div className="h3">Predicted completion</div><div className="sm mut">Calculated from task dependencies and each member&apos;s weekly availability.</div></div>
            <span className="sp" />
            <span className={`stat ${isAtRisk ? 's-dg' : 's-ok'}`}>
              {isAtRisk ? 'At Risk \u00b7 7 days late' : 'On Track \u00b7 on schedule'}
            </span>
          </div>
          {isAtRisk ? (
            <>
              <div className="dline">
                <div className="ax" /><div className="ok" style={{ left: 0, width: '70.3%' }} /><div className="lt" style={{ left: '70.3%', width: '25.9%' }} />
                <div className="mk" style={{ left: 0, top: 0, color: 'var(--ink2)' }}>Today<br />Mon 12 Oct</div>
                <div className="mk" style={{ left: '70.3%', top: 0, color: 'var(--blue6)' }}><b>Deadline</b><br />Fri 30 Oct</div>
                <div className="mk" style={{ left: '96.2%', top: 0, color: 'var(--dg)' }}><b>Predicted</b><br />Fri 6 Nov</div>
                <div className="pt" style={{ left: '96.2%', color: 'var(--dg)' }} />
              </div>
              <div className="alert al-dg mt16">
                <i className="ti ti-alert-triangle" />
                <div className="row wrap" style={{ flex: 1 }}>
                  <div><b>4 tasks finish after the deadline.</b><div className="sm mut">Compile SRS document is waiting on diagrams and architecture.</div></div>
                  <span className="sp" />
                  <button className="btn btn-ai btn-sm" onClick={() => go('defender')}><i className="ti ti-shield-bolt" /> Open AI Deadline Defender</button>
                </div>
              </div>
            </>
          ) : (
            <div className="alert al-ok mt16">
              <i className="ti ti-circle-check" />
              <div className="row wrap" style={{ flex: 1 }}>
                <div><b>On track.</b><div className="sm mut">All tasks are predicted to finish before the deadline.</div></div>
              </div>
            </div>
          )}
        </div>
      )}
      {isCompleted && (
        <div className="card mb16">
          <div className="alert al-ok">
            <i className="ti ti-circle-check" />
            <div className="row wrap" style={{ flex: 1 }}>
              <div><b>Project completed.</b><div className="sm mut">Delivered on {project.due}. All {project.tasks} tasks done.</div></div>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="row wrap g16 mb12">
          <div><div className="h3">Team progress <span className="badge">{memberCount} members</span></div><div className="sm mut">Select a member to see their tasks.</div></div>
          <span className="sp" />
          <div className="row g12 wrap">
            <div className="seg">
              <button className={progressSort === 'def' ? 'on' : ''} onClick={() => setProgressSort('def')}>Default order</button>
              <button className={progressSort === 'low' ? 'on' : ''} onClick={() => setProgressSort('low')}>Lowest progress first</button>
            </div>
            <button className="btn btn-sm" onClick={() => {
              const all = expandedProgress.size < memberCount;
              useMockupStore2.setState({ expandedProgress: all ? new Set(rows.map(r => r.i)) : new Set() });
            }}>Expand all</button>
          </div>
        </div>
        <div className="mb12">
          <div className="row xs mut mb4">
            <span><b style={{ color: 'var(--ink)' }}>{doneT} / {titles.length}</b> tasks done</span>
            <span className="sp" />
            <span><b style={{ color: 'var(--ink)' }}>{DN2}</b> of {AL} h</span>
          </div>
          {AL > 0 && <div className="bar"><i style={{ width: Math.round(DN2 / AL * 100) + '%' }} /></div>}
        </div>
        <div className="prh prhd"><span>Member</span><span>Progress</span><span className="hide-m">Tasks</span><span className="hide-m">Hours left</span><span className="hide-m">Status</span><span /></div>
        {rows.map(({ m, i, s }) => {
          const open = expandedProgress.has(i);
          const st = m[4] ? ['b-wn', <><i className="ti ti-route" /> On critical path</>] : s.dn > 0 ? ['b-ok', 'On track'] : ['', 'Not started'];
          return (
            <div key={i} className={`pr ${open ? 'open' : ''}`}>
              <div className="prh" onClick={() => toggleProgress(i)}>
                <div className="row g12" style={{ minWidth: 0 }}>{av(m[0])}
                  <div style={{ minWidth: 0 }}><div className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m[1]}</div><div className="xs mut" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m[2]}</div></div>
                </div>
                <div><div className="row xs mb4"><b className="mono">{s.pc}%</b><span className="sp" /><span className="mut mono">{s.dn} / {s.al} h</span></div><div className="bar"><i style={{ width: s.pc + '%' }} /></div></div>
                <div className="xs mut hide-m"><b style={{ color: 'var(--ink)' }}>{s.nd} / {m[5].length}</b> tasks</div>
                <div className="xs mut hide-m">{s.left} h of {m[3]} h</div>
                <div className="hide-m"><span className={`badge ${st[0]}`}>{st[1]}</span></div>
                <i className="ti ti-chevron-right chev mut3" />
              </div>
              {open && (
                <div className="prb">
                  {m[5].map((t, j) => {
                    const p = Math.round((t[1] - t[2]) / t[1] * 100);
                    return (
                      <div key={j} className="row g12" onClick={() => openOverlay('drTask')} style={{ padding: '8px 0', cursor: 'pointer' }}>
                        {SI[t[3]]}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(t[3] === 'done' ? { color: 'var(--ink3)', textDecoration: 'line-through' } : {}) }}>{t[0]}</div>
                          <div className="bar mt4" style={{ height: 4 }}><i style={{ width: p + '%' }} /></div>
                        </div>
                        {t[4] === 'p' && <span className="badge" title="Waiting for the member to accept"><i className="ti ti-clock" /></span>}
                        <span className="xs mut mono" style={{ width: 56, textAlign: 'right' }}>{t[1] - t[2]} / {t[1]} h</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ===== Tasks Screen =====
function TasksScreen() {
  const taskView = useMockupStore2(s => s.taskView);
  const setTaskView = useMockupStore2(s => s.setTaskView);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const projectTK = TK.filter(t => t[5].some((k: string) => memberKeys.includes(k)));

  return (
    <section className="scr page wide on" id="s-tasks">
      <WorkspaceHeader tab="tasks" />
      <div className="row wrap g8 mb12">
        <div className="inp row g8" style={{ width: 230, padding: '6px 12px' }}><i className="ti ti-search mut3" /><input style={{ border: 0, outline: 0, width: '100%', background: 'none' }} placeholder="Search tasks" /></div>
        <select className="inp"><option>All statuses</option><option>To do</option><option>In progress</option><option>Done</option></select>
        <select className="inp"><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select className="inp"><option>All members</option><option>Alice</option><option>Bob</option><option>Chloe</option><option>David</option></select>
        <span className="sp" />
        <div className="seg">
          <button className={taskView === 'list' ? 'on' : ''} onClick={() => setTaskView('list')}>List</button>
          <button className={taskView === 'board' ? 'on' : ''} onClick={() => setTaskView('board')}>Board</button>
        </div>
      </div>
      {projectTK.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <i className="ti ti-list-check" style={{ fontSize: 32, color: 'var(--ink3)' }} />
          <div className="mut mt8">No tasks for this project yet.</div>
        </div>
      )}
      {taskView === 'list' && projectTK.length > 0 && (
        <div className="card pad0" style={{ overflow: 'hidden' }}>
          <div className="tk hd"><span /><span>Task</span><span>Priority</span><span>Hours</span><span>Assigned</span><span>Deps</span><span>Target</span></div>
          {projectTK.map(t => (
            <div key={t[0]} className="tk" onClick={() => openOverlay('drTask')}>
              <span>{SI[t[8]]}</span>
              <div style={{ minWidth: 0 }}><div className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[1]}</div><div className="xs mut" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[2]}</div></div>
              {pri(t[3])}
              <span className="mono">{t[4]} h</span>
              <span className="stk">{t[5].map((k, ki) => av(k, 's', ki))}</span>
              <span className="xs mut"><i className="ti ti-link" /> {t[6]}</span>
              <span className={`xs ${t[9] ? '' : 'mut'}`} style={t[9] ? { color: 'var(--dg)', fontWeight: 600 } : {}}>{t[7]}{t[9] && <i className="ti ti-alert-triangle" />}</span>
            </div>
          ))}
          <div className="tk" style={{ color: 'var(--wn)', cursor: 'default' }}>
            <span><i className="ti ti-user-question" /></span>
            <div className="sm"><b>Reject example:</b> if a member rejects a task, it appears here with &ldquo;Reassign needed&rdquo; and an AI match suggestion.</div>
          </div>
        </div>
      )}
      {taskView === 'board' && projectTK.length > 0 && (
        <div className="kb">
          {([
            ['To do', 'todo'],
            ['In progress', 'prog'],
            ['Done', 'done'],
          ] as [string, TaskStatus][]).map(c => (
            <div key={c[1]} className="kc">
              <div className="row b"><span>{c[0]}</span><span className="badge">{projectTK.filter(t => t[8] === c[1]).length}</span></div>
              {projectTK.filter(t => t[8] === c[1]).slice(0, 4).map(t => (
                <div key={t[0]} className="kcard" onClick={() => openOverlay('drTask')}>
                  <div className="b sm">{t[1]}</div>
                  <div className="row mt8">{pri(t[3])}<span className="sp" /><span className="stk">{t[5].map((k: string, ki: number) => av(k, 's', ki))}</span></div>
                </div>
              ))}
              {projectTK.filter(t => t[8] === c[1]).length === 0 && <div className="xs mut3 mt12">Nothing here yet.</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ===== Timeline Screen =====
function TimelineScreen() {
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const projectGT = GT.filter(g => memberKeys.includes(g[1]));
  const N = 27, W = 100 / N;

  return (
    <section className="scr page wide on" id="s-timeline">
      <WorkspaceHeader tab="timeline" />
      {projectGT.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <i className="ti ti-gantt" style={{ fontSize: 32, color: 'var(--ink3)' }} />
          <div className="mut mt8">No schedule data for this project yet.</div>
        </div>
      ) : (
        <div className="card">
          <div className="row mb12 wrap">
            <div className="h3">Schedule</div>
            <span className="sp" />
            <span className="row g12 xs mut">
              <span><i className="ti ti-square-filled" style={{ color: 'var(--blue)' }} /> Planned</span>
              <span><i className="ti ti-square-filled" style={{ color: '#e0483c' }} /> Ends after deadline</span>
              <span><i className="ti ti-square-filled" style={{ color: '#18a67a' }} /> Done</span>
            </span>
          </div>
          <div className="gnt">
            <div style={{ minWidth: 860 }}>
              <div className="gr" style={{ gridTemplateColumns: '230px 1fr', borderTop: 0, background: 'var(--soft)', minHeight: 34 }}>
                <div className="xs mut3 b" style={{ padding: '0 14px' }}>TASK</div>
                <div style={{ position: 'relative', height: 34 }}>
                  {[0, 7, 14, 21].map(d => <span key={d} className="xs mut" style={{ position: 'absolute', left: `${d * W}%`, top: 8, paddingLeft: 4 }}>{['12 Oct', '19 Oct', '26 Oct', '2 Nov'][d / 7]}</span>)}
                </div>
              </div>
              {projectGT.map((g, i) => (
                <div key={i} className="gr" style={{ gridTemplateColumns: '230px 1fr' }}>
                  <div className="sm" style={{ padding: '0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g[0]}</div>
                  <div style={{ position: 'relative', height: 40 }}>
                    {[7, 14, 21].map(d => <i key={d} style={{ position: 'absolute', left: `${d * W}%`, top: 0, bottom: 0, borderLeft: '1px solid var(--line)' }} />)}
                    <div style={{ position: 'absolute', left: `${19 * W}%`, top: 0, bottom: 0, borderLeft: '2px solid var(--blue)' }} />
                    <div style={{ position: 'absolute', left: `${26 * W}%`, top: 0, bottom: 0, borderLeft: '2px dashed #e0483c' }} />
                    <div className={`gbar ${g[4] || ''}`} style={{ left: `${g[2] * W}%`, width: `${(g[3] - g[2] + 1) * W}%` }}>{g[1]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="row wrap g16 xs mut mt12">
            <span><i className="ti ti-minus" style={{ color: 'var(--blue)' }} /> Deadline Fri 30 Oct</span>
            <span><i className="ti ti-minus" style={{ color: '#e0483c' }} /> Predicted completion Fri 6 Nov</span>
            <span className="badge b-wn"><i className="ti ti-link" /> Blocked/delayed: 4 tasks wait on the diagram &rarr; compile chain</span>
          </div>
        </div>
      )}
    </section>
  );
}

// ===== Project Screen =====
function ProjectScreen() {
  const go = useMockupStore2(s => s.go);
  const setActiveProject = useMockupStore2(s => s.setActiveProject);
  const addToast = useMockupStore2(s => s.addToast);

  return (
    <section className="scr page on" id="s-project">
      {/* Hero */}
      <div className="hero">
        <h1>Plan smarter. <em>Rescue your deadline.</em></h1>
        <p className="mut mt8">AI-powered project manager that decomposes assignments, matches skills, and defends deadlines.</p>
        <button className="btn btn-ai btn-lg mt24" onClick={() => go('create')}>
          <i className="ti ti-plus" /> Create new project
        </button>
      </div>

      {/* How it works */}
      <div className="flow mt24">
        {FLOW.map((f, i) => (
          <div key={i}>
            <div className="ic"><i className={`ti ${f.icon}`} /></div>
            <div className="b">{f.title}</div>
            <div className="sm mut mt4">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="mt24">
        <div className="row mb12">
          <div className="h3">Recent projects</div>
          <span className="sp" />
          <span className="xs mut">{PROJECTS.length} projects</span>
        </div>
        <div className="gp2">
          {PROJECTS.map((p, i) => (
            <div
              key={i}
              className="stc"
              style={{ cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
              onClick={() => { setActiveProject(p.id); go('overview'); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.boxShadow = 'var(--sh)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div className="row mb8">
                <span className={`stat s-${p.status}`}>{p.statusLabel}</span>
                <span className="sp" />
                <span className="xs mut"><i className="ti ti-calendar" /> {p.due}</span>
              </div>
              <div className="t"><i className="ti ti-folder" style={{ color: 'var(--blue)' }} /> {p.name}</div>
              <div className="sm mut mt4">{p.desc}</div>
              <div className="row g16 mt12">
                <span className="xs mut"><i className="ti ti-users" /> {p.members} members</span>
                <span className="xs mut"><i className="ti ti-list-check" /> {p.done}/{p.tasks} tasks done</span>
                {p.done < p.tasks && (
                  <span className="sp" />
                )}
                {p.done < p.tasks && (
                  <div className="bar" style={{ flex: 1, maxWidth: 100 }}><i style={{ width: Math.round(p.done / p.tasks * 100) + '%' }} /></div>
                )}
              </div>
              {p.statusLabel === 'Completed' && (
                <button
                  className="btn btn-sm btn-ai mt12"
                  style={{ width: '100%' }}
                  onClick={(e) => { e.stopPropagation(); addToast('Contribution report generated', 'ti-file-export'); }}
                >
                  <i className="ti ti-download" /> Generate Contribution
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== Export all screens + helpers =====
export {
  ProjectScreen, CreateScreen, TeamScreen, ReviewScreen, AnalysisScreen,
  OverviewScreen, TasksScreen, TimelineScreen, WorkspaceHeader,
};
export { av, lv, skc, pri, SI, sum };
