'use client';

import { useEffect, useRef, useState, type Key as ReactKey } from 'react';
import { useMockupStore, type ScreenId } from '@/store/useMockupStore';
import {
  AVC, MEM, LVN, DN, SCR, GRP, TABS,
  STG, RUB, LOAD, TK, RD, WL, GT, ACT, STS, LOGS, DST, RJ_OPTS,
  type StageStatus, type TaskStatus,
} from '@/lib/mock/mockPlanPilot';

// ===== Helpers =====
const av = (k: string, c = '', key?: ReactKey) => <span key={key} className={`av ${AVC[k] || ''} ${c}`}>{k}</span>;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const lv = (n: number) => <span className="lv">{[1, 2, 3].map(i => <i key={i} className={i <= n ? 'f' : ''} />)}</span>;
const skc = (s: [string, number]) => <span className="sk">{s[0]} {lv(s[1])}</span>;
const pri = (p: string) => {
  const ic = p === 'H' ? 'chevrons-up' : p === 'M' ? 'chevron-up' : 'chevron-down';
  const label = p === 'H' ? 'High' : p === 'M' ? 'Medium' : 'Low';
  return <span className={`pri pri-${p}`}><i className={`ti ti-${ic}`} />{label}</span>;
};
const SI: Record<string, JSX.Element> = {
  prog: <i className="ti ti-progress si prog" />,
  todo: <i className="ti ti-circle si" />,
  done: <i className="ti ti-circle-check si done" />,
};

// ===== Stepper =====
function Stepper({ step }: { step: number }) {
  const labels = ['Project Details', 'Team Setup', 'Review & Generate'];
  const ids: ScreenId[] = ['create', 'team', 'review'];
  return (
    <div className="stp">
      {labels.map((x, i) => (
        <div key={i} style={{ display: 'contents' }}>
          {i > 0 && <div className={`ln ${i < step ? 'dn' : ''}`} />}
          <div
            className={`s ${i + 1 === step ? 'on' : i + 1 < step ? 'dn' : ''}`}
            onClick={i + 1 < step ? () => useMockupStore.getState().go(ids[i]) : undefined}
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
  const go = useMockupStore(s => s.go);
  const openOverlay = useMockupStore(s => s.openOverlay);
  return (
    <div data-ws={tab}>
      <div className="crumb sm mut mb8">Projects / Software Requirements Specification</div>
      <div className="row wrap g12">
        <div>
          <div className="row g12 wrap">
            <h1 className="h1">Software Requirements Specification</h1>
            <span className="stat s-dg">At Risk</span>
          </div>
          <div className="row wrap g16 sm mut mt8">
            <span><i className="ti ti-calendar" /> Due Fri 30 Oct, 17:00</span>
            <span><i className="ti ti-users" /> 4 members</span>
            <span><i className="ti ti-list-check" /> 14 open tasks</span>
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
  const go = useMockupStore(s => s.go);
  const fileState = useMockupStore(s => s.fileState);
  const setFileState = useMockupStore(s => s.setFileState);
  const rubricInclude = useMockupStore(s => s.rubricInclude);
  const setRubricInclude = useMockupStore(s => s.setRubricInclude);
  const addToast = useMockupStore(s => s.addToast);
  const [name, setName] = useState('Software Requirements Specification');
  const [uploadMode, setUploadMode] = useState<'aUp' | 'aTx'>('aUp');

  return (
    <section className="scr page on" id="s-create">
      <Stepper step={1} />
      <div className="g2r">
        <div className="card">
          <h2 className="h2">Project details</h2>
          <p className="mut sm mt4 mb16">Tell us what the assignment is. The AI reads it in the next step.</p>
          <div className="mb16">
            <label className="fl">Project name <span className="mut3">(required)</span></label>
            <input className="inp" value={name} maxLength={100} placeholder="e.g. Software Requirements Specification"
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
                    <div className="b mt4">{fileState === 'type' ? 'Only PDF files are supported' : 'We couldn\'t read this PDF'}</div>
                    <div className="sm mut">{fileState === 'type' ? '"notes.docx" can\'t be read. Export it as a PDF or paste the text instead.' : '"scan_01.pdf" looks like a scanned image with no text. Paste the text instead.'}</div>
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
              <div className="hint">Good. PlanPilot will find the rubric inside the PDF and ask you to review it.</div>
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
          <div className="alert al-blue mt12 sm"><i className="ti ti-calendar-event" /><div><b>Friday 30 October 2026 at 17:00</b> · 18 days from today. Past dates can't be selected.</div></div>
        </div>
        <aside className="col g16">
          <div className="card flat">
            <div className="eyebrow mb8">Team size</div>
            <div className="row"><span className="h1">4</span><span className="mut sm">members<br />counted from Team Setup</span></div>
            <div className="hint">No need to enter this twice.</div>
          </div>
          <div className="card flat" style={{ background: 'var(--blue1)', borderColor: 'var(--blue2)' }}>
            <div className="row b mb8"><i className="ti ti-sparkles" style={{ color: 'var(--blue)' }} />What the AI will do</div>
            <div className="sm mut" style={{ lineHeight: 1.8 }}>Read the brief and rubric · Break it into tasks · Rank by marks, dependencies and time · Match tasks to skills · Predict deadline risk</div>
          </div>
        </aside>
      </div>
      <div className="row mt24">
        <button className="btn btn-sm btn-g" onClick={() => { setName(''); addToast('Form cleared', 'ti-eraser'); }}><i className="ti ti-eraser" /> Clear form</button>
        <span className="sp" />
        <button className="btn btn-p btn-lg" onClick={() => go('team')}>Continue to Team Setup <i className="ti ti-arrow-right" /></button>
      </div>
    </section>
  );
}

// ===== Team Screen =====
function TeamScreen() {
  const go = useMockupStore(s => s.go);
  const openOverlay = useMockupStore(s => s.openOverlay);
  const teamSkills: Record<string, number> = {};
  MEM.forEach(m => m.sk.forEach(s => { teamSkills[s[0]] = (teamSkills[s[0]] || 0) + 1; }));
  return (
    <section className="scr page on" id="s-team">
      <Stepper step={2} />
      <div className="g2r">
        <div className="card">
          <div className="row mb8">
            <div><h2 className="h2">Team members <span className="badge b-blue">4</span></h2><p className="mut sm mt4">Skills and weekly availability let the AI assign work fairly.</p></div>
            <span className="sp" />
            <button className="btn btn-p" onClick={() => openOverlay('drMember')}><i className="ti ti-plus" /> Add team member</button>
          </div>
          {MEM.map((m, i) => (
            <div key={m.k} className="mrow" style={i === 0 ? { borderTop: 0 } : {}}>
              {av(m.k, 'l')}
              <div>
                <div className="b">{m.n} {m.lead ? <span className="badge b-blue">Leader</span> : ''}</div>
                <div className="xs mut">{sum(m.h)} h / week</div>
              </div>
              <div className="row wrap g6">{m.sk.map(skc)}</div>
              <div className="wk">{m.h.map((h, j) => <i key={j} style={{ height: Math.max(2, h * 5) + 'px' }} title={`${h} h`} />)}</div>
              <div className="row g4">
                <button className="icb" onClick={() => openOverlay('drMember')} title="Edit"><i className="ti ti-pencil" /></button>
                <button className="icb" title="Remove"><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))}
        </div>
        <aside className="col g16">
          <div className="card flat">
            <div className="h3 mb12">Team overview</div>
            <div className="g3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div><div className="xs mut">Members</div><div className="h2">4</div></div>
              <div style={{ paddingLeft: 16 }}><div className="xs mut">Combined weekly hours</div><div className="h2">67 h</div></div>
            </div>
            <div className="sec mt12"><div className="xs mut mb8">Skills across the team</div>
              <div className="row wrap g6">{Object.entries(teamSkills).map(([n, c]) => <span key={n} className="sk">{n} <em>×{c}</em></span>)}</div>
            </div>
            <div className="sec"><div className="xs mut mb8">Potential missing skills</div>
              <div className="alert al-wn sm"><i className="ti ti-alert-triangle" /><div><b>Data Analysis</b> is covered by one member at Intermediate level. Consider a backup.</div></div>
            </div>
          </div>
          <div className="alert al-wn sm"><i className="ti ti-user-exclamation" /><div><b>Example warning:</b> a member with 0 available hours is flagged here before you continue.</div></div>
        </aside>
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
  const go = useMockupStore(s => s.go);
  return (
    <section className="scr page on" id="s-review">
      <Stepper step={3} />
      <div className="g2r">
        <div className="col g16">
          <div className="card">
            <div className="row mb12"><h2 className="h3">Project summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('create')}>Edit</button></div>
            <div className="rd"><span className="mut" style={{ width: 120 }}>Name</span><b>Software Requirements Specification</b></div>
            <div className="rd"><span className="mut" style={{ width: 120 }}>Description</span><span>Group SRS for a student library management system, plus a 10-minute presentation.</span></div>
            <div className="rd"><span className="mut" style={{ width: 120 }}>Deadline</span><span><b>Fri 30 Oct 2026, 17:00</b> (Asia/Kuala_Lumpur)</span></div>
            <div className="rd"><span className="mut" style={{ width: 120 }}>Assignment</span><span><i className="ti ti-file-type-pdf" style={{ color: 'var(--dg)' }} /> SRS_Assignment_Brief.pdf · 1.2 MB</span></div>
            <div className="rd"><span className="mut" style={{ width: 120 }}>Rubric source</span><span className="badge b-blue">Included in assignment PDF</span></div>
          </div>
          <div className="card">
            <div className="row mb12"><h2 className="h3">Team summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('team')}>Edit</button></div>
            {MEM.map(m => (
              <div key={m.k} className="mrow" style={{ gridTemplateColumns: '44px 1fr 1.6fr 120px' }}>
                {av(m.k, 'l')}
                <div><div className="b">{m.n}</div><div className="xs mut">{sum(m.h)} h / week</div></div>
                <div className="row wrap g6">{m.sk.map(s => <span key={s[0]} className="sk">{s[0]} · {LVN[s[1]]}</span>)}</div>
                <div className="xs mut">{m.h.map((h, i) => DN[i].slice(0, 1) + h).join(' ')}</div>
              </div>
            ))}
          </div>
        </div>
        <aside className="col g16">
          <div className="card">
            <div className="h3 mb8">Before we generate</div>
            <div className="chk"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /><span>Project name is present</span></div>
            <div className="chk"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /><span>Assignment content provided</span></div>
            <div className="chk"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /><span>Deadline is valid and in the future</span></div>
            <div className="chk"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /><span>4 members, each with a name and availability</span></div>
            <div className="chk"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /><span>No duplicate members</span></div>
            <div className="chk"><i className="ti ti-alert-triangle" style={{ color: 'var(--wn)' }} /><span>Rubric will be extracted from the assignment. You can review it after analysis. <button className="lnk">Upload one instead</button></span></div>
          </div>
          <button className="btn btn-ai btn-lg" style={{ width: '100%' }} onClick={() => go('analysis')}><i className="ti ti-sparkles" /> Create project and generate AI plan</button>
          <p className="xs mut" style={{ textAlign: 'center' }}>AI will analyze your assignment, generate tasks, match team members, estimate workloads, and predict deadline risks.</p>
        </aside>
      </div>
      <div className="row mt24"><button className="btn btn-lg" onClick={() => go('team')}><i className="ti ti-arrow-left" /> Back</button></div>
    </section>
  );
}

// ===== Analysis Screen =====
function AnalysisScreen() {
  const go = useMockupStore(s => s.go);
  const analysisMode = useMockupStore(s => s.analysisMode);
  const setAnalysisMode = useMockupStore(s => s.setAnalysisMode);
  const [resolved, setResolved] = useState<Set<number>>(new Set());

  const stages = STG.map(s => [...s] as [string, string, StageStatus, string]);
  if (analysisMode === 'fail') { stages[1][2] = 'f'; stages[1][3] = 'Couldn\'t read the rubric table on page 4'; for (let i = 2; i < 9; i++) stages[i][2] = 'p'; }
  const ic: Record<StageStatus, string> = { d: 'ti-check', w: 'ti-alert-triangle', r: 'ti-loader-2 spin', p: 'ti-dots', f: 'ti-x' };
  const cl: Record<StageStatus, string> = { d: 'dn', w: 'wn', r: 'run', p: 'pend', f: 'fl' };
  const stageStatus: Record<StageStatus, string> = { d: 'Done', w: 'Needs attention', r: 'Running', p: 'Pending', f: 'Failed' };

  return (
    <section className="scr page wide on" id="s-analysis">
      <div className="row wrap mb16">
        <div><div className="eyebrow">AI planning</div><h1 className="h1 mt4">Building your project plan</h1></div>
        <span className="sp" />
        <span className="demo"><i className="ti ti-flask" /> Demo sequence · simulated, not a real AI run</span>
      </div>
      <div className="g2r" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)' }}>
        <div className="card">
          <div className="row mb8"><div className="h3">AI activity</div><span className="sp" /><span className="badge b-blue"><i className="ti ti-loader-2 spin" /> Step 8 of 9</span></div>
          {stages.map((s, i) => (
            <div key={i} className={`stg ${cl[s[2]]}`}>
              <div className="dot"><i className={`ti ${ic[s[2]]}`} /></div>
              <div>
                <div className="b">{s[0]}</div>
                <div className="xs mut">{s[1]}</div>
                {s[3] && <div className="xs mt4" style={{ color: s[2] === 'w' ? 'var(--wn)' : s[2] === 'f' ? 'var(--dg)' : 'var(--ink2)' }}>{s[3]}</div>}
                {s[2] === 'f' && <div className="row g8 mt8"><button className="btn btn-sm">Retry</button><button className="btn btn-sm">Add rubric manually</button></div>}
              </div>
              <div className="xs mut3">{stageStatus[s[2]]}</div>
            </div>
          ))}
          <div className="xs mut3 mt8">Mockup states:
            <button className="lnk" onClick={() => setAnalysisMode('default')}>running</button> ·
            <button className="lnk" onClick={() => setAnalysisMode('fail')}>failed</button> ·
            <button className="lnk" onClick={() => setAnalysisMode('norub')}>no rubric found</button>
          </div>
        </div>
        <div className="col g16">
          <div className="card">
            <div className="row mb8">
              <div><div className="h3">Review extracted rubric</div><div className="sm mut">Correct anything the AI misread before the plan is final.</div></div>
              <span className="sp" /><span className="badge b-ok">30 marks total</span>
            </div>
            <div className={`alert ${analysisMode === 'norub' ? 'al-dg' : 'al-wn'} sm mb12`}>
              <i className={`ti ${analysisMode === 'norub' ? 'ti-target-off' : 'ti-alert-triangle'}`} />
              <div>{analysisMode === 'norub' ? <><b>No structured rubric found.</b> The AI wrote starter criteria from the assignment text. Review them carefully before continuing.</> : <><b>3 items need your attention.</b> Confirm the assumptions below.</>}</div>
            </div>
            {RUB.map((r, i) => (
              <div key={i} className="row g8" style={{ padding: i ? '8px 0' : '0', borderTop: i ? '1px solid var(--line)' : '0' }}>
                <input className="inp" style={{ flex: 1 }} defaultValue={r[0]} />
                <input className="inp" type="number" style={{ width: 70 }} defaultValue={r[1]} />
                <label className="row g6 xs mut"><span className="sw"><input type="checkbox" defaultChecked={!!r[2]} /><span /></span>Mandatory</label>
                <button className="icb"><i className="ti ti-trash" /></button>
              </div>
            ))}
            <button className="btn btn-sm mt8"><i className="ti ti-plus" /> Add criterion</button>
          </div>
          <div className="card">
            <div className="h3 mb8">Unclear or missing information</div>
            {[
              { icon: 'ti-help-circle', color: 'var(--wn)', title: 'Peer review is mentioned but no marks are given.', sub: 'PlanPilot assumed Presentation = 5 marks.', btn: 'Confirm' },
              { icon: 'ti-help-circle', color: 'var(--wn)', title: 'Late penalty is not stated.', sub: 'No late-penalty planning will be added.', btn: 'Confirm' },
              { icon: 'ti-info-circle', color: 'var(--blue)', title: 'Rubric found on page 4 of the assignment PDF.', sub: 'Source: your uploaded document.', btn: 'Looks right' },
            ].map((item, i) => (
              <div key={i} className="chk">
                <i className={`ti ${item.icon}`} style={{ color: item.color }} />
                <div style={{ flex: 1 }}>
                  <div>{item.title}</div>
                  <div className="xs mut">{item.sub}</div>
                </div>
                {resolved.has(i) ? <span className="badge b-ok"><i className="ti ti-check" /> Confirmed</span> :
                  <button className="btn btn-sm" onClick={() => setResolved(new Set([...resolved, i]))}>{item.btn}</button>}
                <button className="btn btn-sm btn-g">Edit</button>
              </div>
            ))}
          </div>
          <div className="row">
            <button className="btn btn-lg" onClick={() => go('review')}><i className="ti ti-arrow-left" /> Edit project</button>
            <span className="sp" />
            <button className="btn btn-p btn-lg" onClick={() => go('overview')}>Looks right · open workspace <i className="ti ti-arrow-right" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Overview Screen =====
function OverviewScreen() {
  const go = useMockupStore(s => s.go);
  return (
    <section className="scr page wide on" id="s-overview">
      <WorkspaceHeader tab="overview" />
      <div className="g2r">
        <div className="col g16">
          <div className="card">
            <div className="row mb12">
              <div><div className="h3">Predicted completion</div><div className="sm mut">Calculated from task dependencies and each member's weekly availability.</div></div>
              <span className="sp" /><span className="stat s-dg">At Risk · 7 days late</span>
            </div>
            <div className="dline">
              <div className="ax" /><div className="ok" style={{ left: 0, width: '70.3%' }} /><div className="lt" style={{ left: '70.3%', width: '25.9%' }} />
              <div className="mk" style={{ left: 0, top: 0, color: 'var(--ink2)' }}>Today<br />Mon 12 Oct</div>
              <div className="mk" style={{ left: '70.3%', top: 0, color: 'var(--blue6)' }}><b>Deadline</b><br />Fri 30 Oct</div>
              <div className="mk" style={{ left: '96.2%', top: 0, color: 'var(--dg)' }}><b>Predicted</b><br />Fri 6 Nov</div>
              <div className="pt" style={{ left: '96.2%', color: 'var(--dg)' }} />
            </div>
            <div className="row mt16">
              <div className="alert al-dg" style={{ flex: 1 }}>
                <i className="ti ti-alert-triangle" />
                <div className="row wrap" style={{ flex: 1 }}>
                  <div><b>4 tasks finish after the deadline.</b><div className="sm mut">Compile SRS document is waiting on diagrams and architecture.</div></div>
                  <span className="sp" />
                  <button className="btn btn-ai btn-sm" onClick={() => go('defender')}><i className="ti ti-shield-bolt" /> Open AI Deadline Defender</button>
                </div>
              </div>
            </div>
          </div>
          <div className="card"><div className="g3">
            <div><div className="eyebrow mb8">Progress</div><div className="row"><span className="h1">1</span><span className="mut">/ 15 tasks · 7%</span></div><div className="bar mt8"><i style={{ width: '7%' }} /></div><div className="xs mut mt8">3 h of 96 h done · 2 tasks in progress</div></div>
            <div><div className="eyebrow mb8">Team workload</div>
              <div className="col g8">{LOAD.map(l => (
                <div key={l[0]} className="row g8">{av(l[0], 's')}<div style={{ flex: 1 }}><div className="bar"><i style={{ width: (l[1] / l[2] * 100) + '%' }} /></div></div><span className="xs mut mono" style={{ width: 62, textAlign: 'right' }}>{l[1]} / {l[2]} h</span></div>
              ))}</div>
            </div>
            <div><div className="eyebrow mb8">Rubric coverage</div>
              <div className="sm">Planned <b>94%</b></div><div className="bar mt4"><i style={{ width: '94%' }} /></div>
              <div className="sm mt8">Completed <b>7%</b></div><div className="bar ok mt4"><i style={{ width: '7%' }} /></div>
              <div className="xs mt8" style={{ color: 'var(--wn)' }}><i className="ti ti-alert-triangle" /> 1 gap: Testing — traceability matrix</div>
            </div>
          </div></div>
        </div>
        <aside className="col g16">
          <div className="card flat"><div className="h3 mb8">Needs attention</div>
            <div className="chk"><i className="ti ti-shield-bolt" style={{ color: 'var(--dg)' }} /><div style={{ flex: 1 }}><div className="b">Deadline at risk</div><div className="xs mut">AI has recovery options ready.</div></div><button className="lnk sm" onClick={() => go('defender')}>Open</button></div>
            <div className="chk"><i className="ti ti-target-off" style={{ color: 'var(--wn)' }} /><div style={{ flex: 1 }}><div className="b">Rubric coverage gap</div><div className="xs mut">No task covers the traceability matrix.</div></div><button className="lnk sm" onClick={() => go('rubric')}>Fix</button></div>
            <div className="chk"><i className="ti ti-user-question" style={{ color: 'var(--wn)' }} /><div style={{ flex: 1 }}><div className="b">8 assignments await acceptance</div><div className="xs mut">Members can accept or reject.</div></div><button className="lnk sm" onClick={() => go('tasks')}>View</button></div>
          </div>
          <div className="card flat"><div className="h3 mb8">Up next</div>
            {TK.slice(0, 4).map((t, i) => (
              <div key={i} className="row g8" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : '0' }}>
                {SI[t[9]]}
                <div style={{ flex: 1, minWidth: 0 }} className="sm">{t[1]}<div className="xs mut">{t[8]}</div></div>
                {pri(t[3])}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

// ===== Tasks Screen =====
function TasksScreen() {
  const taskView = useMockupStore(s => s.taskView);
  const setTaskView = useMockupStore(s => s.setTaskView);
  const openOverlay = useMockupStore(s => s.openOverlay);
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
      {taskView === 'list' && (
        <div className="card pad0" style={{ overflow: 'hidden' }}>
          <div className="tk hd"><span /><span>Task</span><span>Priority</span><span>Hours</span><span>Assigned</span><span>Rubric</span><span>Deps</span><span>Target</span></div>
          {TK.map(t => (
            <div key={t[0]} className="tk" onClick={() => openOverlay('drTask')}>
              <span>{SI[t[9]]}</span>
              <div style={{ minWidth: 0 }}><div className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[1]}</div><div className="xs mut" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[2]}</div></div>
              {pri(t[3])}
              <span className="mono">{t[4]} h</span>
              <span className="stk">{t[5].map((k, ki) => av(k, 's', ki))}</span>
              <span className="row g4">{t[6].map(c => <span key={c} className="crit">{c}</span>)}</span>
              <span className="xs mut"><i className="ti ti-link" /> {t[7]}</span>
              <span className={`xs ${t[10] ? '' : 'mut'}`} style={t[10] ? { color: 'var(--dg)', fontWeight: 600 } : {}}>{t[8]}{t[10] && <i className="ti ti-alert-triangle" />}</span>
            </div>
          ))}
          <div className="tk" style={{ color: 'var(--wn)', cursor: 'default' }}>
            <span><i className="ti ti-user-question" /></span>
            <div className="sm"><b>Reject example:</b> if a member rejects a task, it appears here with "Reassign needed" and an AI match suggestion.</div>
          </div>
        </div>
      )}
      {taskView === 'board' && (
        <div className="kb">
          {([
            ['To do', 'todo'],
            ['In progress', 'prog'],
            ['Done', 'done'],
          ] as [string, string][]).map(c => (
            <div key={c[1]} className="kc">
              <div className="row b"><span>{c[0]}</span><span className="badge">{TK.filter(t => t[9] === (c[1] as TaskStatus)).length}</span></div>
              {TK.filter(t => t[9] === (c[1] as TaskStatus)).slice(0, 4).map(t => (
                <div key={t[0]} className="kcard" onClick={() => openOverlay('drTask')}>
                  <div className="b sm">{t[1]}</div>
                  <div className="row mt8">{pri(t[3])}<span className="sp" /><span className="stk">{t[5].map((k: string, ki: number) => av(k, 's', ki))}</span></div>
                </div>
              ))}
              {TK.filter(t => t[9] === (c[1] as TaskStatus)).length === 0 && <div className="xs mut3 mt12">Nothing here yet.</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ===== Rubric Screen =====
function RubricScreen() {
  const openAccordions = useMockupStore(s => s.openAccordions);
  const toggleAccordion = useMockupStore(s => s.toggleAccordion);
  const addToast = useMockupStore(s => s.addToast);
  return (
    <section className="scr page wide on" id="s-rubric">
      <WorkspaceHeader tab="rubric" />
      <div className="alert al-blue sm mb16"><i className="ti ti-info-circle" /><div>Planned coverage means tasks exist for each requirement. Completed coverage means those tasks are done. <b>Neither predicts your marks</b>. Review the actual deliverable against the Good level.</div></div>
      {RD.map((r, i) => {
        const gap = r[4] === 'Gap';
        const pl = gap ? 67 : 100;
        const cp = r[0] === 'C1' ? 25 : 0;
        const open = openAccordions.has(i);
        return (
          <div key={i} className={`acc ${open ? 'open' : ''}`}>
            <div className="ah" onClick={() => toggleAccordion(i)}>
              <div>
                <div className="row g8 wrap">
                  <span className="crit">{r[0]}</span><span className="b">{r[1]}</span>
                  {r[3] ? <span className="badge b-dg">Mandatory</span> : <span className="badge">Optional</span>}
                  {gap && <span className="badge b-wn"><i className="ti ti-alert-triangle" /> Coverage gap</span>}
                </div>
                <div className="xs mut mt4">{r[2]} marks · {Math.round(r[2] / 30 * 100)}% of total</div>
              </div>
              <div className="sm"><div className="xs mut">Weight</div><div className="bar"><i style={{ width: (r[2] / 6 * 100) + '%' }} /></div></div>
              <div>
                <div className="row xs g8"><span className="mut" style={{ width: 62 }}>Planned</span><div className="bar" style={{ flex: 1 }}><i style={{ width: pl + '%' }} /></div><span className="mono">{pl}%</span></div>
                <div className="row xs g8 mt4"><span className="mut" style={{ width: 62 }}>Completed</span><div className="bar ok" style={{ flex: 1 }}><i style={{ width: cp + '%' }} /></div><span className="mono">{cp}%</span></div>
              </div>
              <i className="ti ti-chevron-right chev mut3" />
            </div>
            {open && r[6] && (
              <div className="ab">
                <div className="g2r mt12" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  <div className="lvl lv-g"><div className="b mb8"><i className="ti ti-star" /> Good level</div>
                    {r[6].map((q: any, j: number) => (
                      <div key={j} className="rd" style={{ padding: '3px 0' }}>
                        <i className={`ti ${q[1] ? 'ti-circle-check' : 'ti-alert-triangle'}`} style={{ color: q[1] ? 'var(--ok)' : 'var(--wn)' }} />
                        <span>{q[0]}{!q[1] && <b style={{ color: 'var(--wn)' }}> — no task</b>}</span>
                      </div>
                    ))}
                  </div>
                  <div className="lvl lv-a"><div className="b mb8">Average level</div><div className="sm">{(r[7] as string[]).map((t: string, j: number) => <span key={j}>{j > 0 && <br />}{t}</span>)}</div></div>
                  <div className="lvl lv-p"><div className="b mb8">Poor level</div><div className="sm">{(r[8] as string[]).map((t: string, j: number) => <span key={j}>{j > 0 && <br />}{t}</span>)}</div></div>
                </div>
                <div className="sec mt12"><div className="eyebrow mb8">Related tasks</div>
                  <div className="row wrap g6">{(r[9] || []).map((t: string) => <span key={t} className="badge b-blue"><i className="ti ti-link" />{t}</span>)}</div>
                </div>
                {gap && <div className="alert al-wn mt8"><i className="ti ti-target-off" /><div style={{ flex: 1 }}><b>Coverage Gap Detected</b><div className="sm">Nothing in the plan produces a traceability matrix, a Good-level requirement for a mandatory criterion.</div></div><button className="btn btn-sm lead-only" onClick={() => addToast('Added "Traceability matrix" (3 h, suggested for David). Schedule recalculated.')}><i className="ti ti-plus" /> Add suggested task</button></div>}
                <div className="xs mut mt12"><i className="ti ti-info-circle" /> Completing the tasks doesn't prove the Good level. Check the deliverable against these requirements.</div>
              </div>
            )}
            {open && !r[6] && <div className="ab"><div className="sm mut mt12">Expand to see Good, Average and Poor level requirements and mapped tasks.</div></div>}
          </div>
        );
      })}
    </section>
  );
}

// ===== Timeline Screen =====
function TimelineScreen() {
  return (
    <section className="scr page wide on" id="s-timeline">
      <WorkspaceHeader tab="timeline" />
      <div className="card mb16">
        <div className="row mb12"><div className="h3">Team workload</div><span className="sp" /><span className="xs mut">Remaining hours vs hours available until the deadline</span></div>
        {WL.map(w => (
          <div key={w[0]} className="row g12" style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
            {av(w[0], 'l')}
            <div style={{ width: 190 }}><div className="b">{w[1]}</div><div className="xs mut">{w[2]} · {w[3]} h/wk</div></div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div className="row xs mut mb4"><span>{w[4]} h remaining</span><span className="sp" /><span>{w[5]} h available</span></div>
              <div className="bar"><i style={{ width: (w[4] / w[5] * 100) + '%' }} /></div>
            </div>
            <div className="row wrap g4 hide-m" style={{ width: 230 }}>{w[6].map(t => <span key={t} className="badge">{t}</span>)}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="row mb12 wrap"><div className="h3">Schedule</div><span className="sp" /><span className="row g12 xs mut">
          <span><i className="ti ti-square-filled" style={{ color: 'var(--blue)' }} /> Planned</span>
          <span><i className="ti ti-square-filled" style={{ color: '#e0483c' }} /> Ends after deadline</span>
          <span><i className="ti ti-square-filled" style={{ color: '#18a67a' }} /> Done</span>
        </span></div>
        <GanttChart />
      </div>
    </section>
  );
}

function GanttChart() {
  const N = 27, W = 100 / N;
  return (
    <div className="gnt">
      <div style={{ minWidth: 860 }}>
        <div className="gr" style={{ gridTemplateColumns: '230px 1fr', borderTop: 0, background: 'var(--soft)', minHeight: 34 }}>
          <div className="xs mut3 b" style={{ padding: '0 14px' }}>TASK</div>
          <div style={{ position: 'relative', height: 34 }}>
            {[0, 7, 14, 21].map(d => <span key={d} className="xs mut" style={{ position: 'absolute', left: `${d * W}%`, top: 8, paddingLeft: 4 }}>{['12 Oct', '19 Oct', '26 Oct', '2 Nov'][d / 7]}</span>)}
          </div>
        </div>
        {GT.map((g, i) => (
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
  );
}

// ===== Activity Screen =====
function ActivityScreen() {
  return (
    <section className="scr page wide on" id="s-activity">
      <WorkspaceHeader tab="activity" />
      <div className="row mb12 wrap">
        <div className="seg"><button className="on">All</button><button>AI</button><button>Leader</button><button>Members</button></div>
        <span className="sp" /><span className="demo"><i className="ti ti-flask" /> Sample history</span>
      </div>
      <div className="card">
        {ACT.map((a, i) => (
          <div key={i} className="act" style={i === 0 ? { borderTop: 0 } : {}}>
            <div className={`ai ${a[2]}`}><i className={`ti ${a[1]}`} /></div>
            <div><div><b>{a[0]}</b> · {a[3]}</div>{a[4] && <div className="xs mut mt4">{a[4]}</div>}</div>
            <div className="col" style={{ alignItems: 'flex-end' }}>
              <span className={`badge ${a[2]}`}>{a[5]}</span>
              <span className="xs mut3 mt4">{a[6]}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===== States Screen =====
function StatesScreen() {
  return (
    <section className="scr page wide on" id="s-states">
      <div className="mb16"><div className="eyebrow">Design system</div><h1 className="h1 mt4">Key UI states</h1><p className="mut mt4">Every state has a clear message and a next action.</p></div>
      <div className="gp2">
        {STS.map((s, i) => (
          <div key={i} className="stc">
            <div className="t"><span className={`badge ${s[4]}`} style={{ width: 30, height: 30, justifyContent: 'center', borderRadius: 9, padding: 0 }}><i className={`ti ${s[0]}`} /></span>{s[1]}</div>
            <div className="sm mut">{s[2]}</div>
            <button className="btn btn-sm mt12">{s[3]}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ===== Export all screens + helpers =====
export {
  CreateScreen, TeamScreen, ReviewScreen, AnalysisScreen,
  OverviewScreen, TasksScreen, RubricScreen, TimelineScreen,
  ActivityScreen, StatesScreen, WorkspaceHeader,
};
export { av, lv, skc, pri, SI, sum };
