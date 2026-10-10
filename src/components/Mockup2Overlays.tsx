'use client';

import { useState } from 'react';
import { useMockupStore2 } from '@/store/useMockupStore2';
import { SUGG, LVN, DN, RJ_OPTS } from '@/lib/mock/mockTaskflow2';

// ===== Overlay Wrapper =====
export function Mockup2Overlays() {
  const overlay = useMockupStore2(s => s.overlay);
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const toasts = useMockupStore2(s => s.toasts);

  if (!overlay && toasts.length === 0) return null;

  return (
    <>
      {overlay && (
        <>
          <div className="ov" onClick={closeOverlay} />
          {overlay === 'drMember' && <MemberDrawer />}
          {overlay === 'drTask' && <TaskDrawer />}
          {(overlay === 'mdReject' || overlay === 'mdOverride' || overlay === 'mdEdit' || overlay === 'mdSave') && (
            <div className="mdl" onClick={e => e.stopPropagation()}>
              {overlay === 'mdReject' && <RejectModal />}
              {overlay === 'mdSave' && <SaveModal />}
              {overlay === 'mdOverride' && <OverrideModal />}
              {overlay === 'mdEdit' && <EditModal />}
            </div>
          )}
        </>
      )}
      {toasts.length > 0 && (
        <div className="toast">
          {toasts.map(t => (
            <div key={t.id}>
              <i className={`ti ${t.icon}`} />{t.text}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ===== Member Drawer =====
function MemberDrawer() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const addToast = useMockupStore2(s => s.addToast);
  const [name, setName] = useState('Alice Tan');
  const [skills, setSkills] = useState<[string, number][]>([['Research', 3], ['Academic Writing', 2]]);
  const [weaknesses, setWeaknesses] = useState<string[]>(['Programming', 'Testing']);
  const [hours, setHours] = useState<number[]>([2, 3, 0, 2, 4, 5, 3]);

  const total = hours.reduce((a, b) => a + b, 0);
  const used = [...skills.map(s => s[0]), ...weaknesses];
  const free = SUGG.filter(s => !used.includes(s));

  const addStrength = (s: string) => {
    if (skills.some(x => x[0].toLowerCase() === s.toLowerCase())) return;
    setWeaknesses(prev => prev.filter(w => w.toLowerCase() !== s.toLowerCase()));
    setSkills(prev => [...prev, [s, 2]]);
  };
  const removeStrength = (i: number) => setSkills(prev => prev.filter((_, j) => j !== i));
  const setLevel = (i: number, lvl: number) => setSkills(prev => prev.map((s, j) => j === i ? [s[0], lvl] : s));

  const addWeakness = (w: string) => {
    if (weaknesses.some(x => x.toLowerCase() === w.toLowerCase())) return;
    setSkills(prev => prev.filter(s => s[0].toLowerCase() !== w.toLowerCase()));
    setWeaknesses(prev => [...prev, w]);
  };
  const removeWeakness = (i: number) => setWeaknesses(prev => prev.filter((_, j) => j !== i));

  const adjustHour = (i: number, d: number) => setHours(prev => prev.map((h, j) => j === i ? Math.max(0, Math.min(24, h + d)) : h));
  const setHour = (i: number, v: number) => setHours(prev => prev.map((h, j) => j === i ? (isNaN(v) ? 0 : Math.max(0, Math.min(24, v))) : h));

  const handleSave = () => {
    if (!name.trim()) { addToast('Enter the member\'s name first', 'ti-alert-circle'); return; }
    if (skills.length === 0) { addToast('Add at least one strength', 'ti-alert-circle'); return; }
    if (weaknesses.length === 0) { addToast('Add at least one weakness', 'ti-alert-circle'); return; }
    addToast(`${name} saved`, 'ti-user-check');
    closeOverlay();
  };

  return (
    <aside className="drw" onClick={e => e.stopPropagation()}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="h2">Edit team member</div>
          <div className="sm mut">Strengths, weaknesses and availability decide which tasks they get.</div>
        </div>
        <button className="icb" onClick={closeOverlay} title="Close"><i className="ti ti-x" /></button>
      </div>
      <div className="bd">
        <div className="mb16">
          <label className="fl">Member name <span className="mut3">(required)</span></label>
          <input className="inp" value={name} placeholder="e.g. Alice Tan" onChange={e => setName(e.target.value)} />
        </div>
        <div className="mb16">
          <label className="fl">Strengths <span style={{ color: 'var(--dg)', fontWeight: 500 }}>Required &middot; at least 1</span></label>
          <div className="hint" style={{ margin: '-2px 0 8px' }}>What this member does well. Pick a level for each.</div>
          <div className="col g8">
            {skills.length === 0 && <div className="xs mut3">No strengths yet</div>}
            {skills.map((s, i) => (
              <div key={i} className="row g8">
                <span className="sk" style={{ padding: '6px 10px', fontSize: 13 }}>{s[0]}</span>
                <span className="sp" />
                <select className="inp" style={{ padding: '5px 26px 5px 10px' }} value={s[1]} onChange={e => setLevel(i, LVN.indexOf(e.target.value))}>
                  {LVN.slice(1).map(l => <option key={l}>{l}</option>)}
                </select>
                <button className="icb" onClick={() => removeStrength(i)} title="Remove"><i className="ti ti-x" /></button>
              </div>
            ))}
          </div>
          <div className="row wrap g6 mt12">
            <span className="xs mut">Add:</span>
            {free.slice(0, 6).map(s => (
              <button key={s} className="btn btn-sm" style={{ borderStyle: 'dashed' }} onClick={() => addStrength(s)}>+ {s}</button>
            ))}
          </div>
          <div className="row g8 mt8">
            <input className="inp" placeholder="Add another strength and press Enter"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { addStrength(v); (e.target as HTMLInputElement).value = ''; } } }} />
          </div>
        </div>
        <div className="mb16">
          <label className="fl">Weaknesses <span style={{ color: 'var(--dg)', fontWeight: 500 }}>Required &middot; at least 1</span></label>
          <div className="hint" style={{ margin: '-2px 0 8px' }}>What this member struggles with. The AI avoids giving them these tasks.</div>
          <div className="row wrap g6">
            {weaknesses.length === 0 && <div className="xs mut3">No weaknesses yet</div>}
            {weaknesses.map((w, i) => (
              <span key={i} className="sk sk-w" style={{ padding: '5px 9px', fontSize: 13 }}>
                <i className="ti ti-arrow-down-right" />{w}
                <button className="icb" style={{ width: 18, height: 18, marginLeft: 2 }} onClick={() => removeWeakness(i)} title="Remove"><i className="ti ti-x" /></button>
              </span>
            ))}
          </div>
          <div className="row wrap g6 mt12">
            <span className="xs mut">Add:</span>
            {free.slice(0, 6).map(s => (
              <button key={s} className="btn btn-sm" style={{ borderStyle: 'dashed' }} onClick={() => addWeakness(s)}>+ {s}</button>
            ))}
          </div>
          <div className="row g8 mt8">
            <input className="inp" placeholder="Add another weakness and press Enter"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { addWeakness(v); (e.target as HTMLInputElement).value = ''; } } }} />
          </div>
        </div>
        <div>
          <div className="row mb8">
            <label className="fl" style={{ margin: 0 }}>Weekly availability</label>
            <span className="sp" />
            <button className="btn btn-sm" onClick={() => setHours(prev => [prev[0], prev[0], prev[0], prev[0], prev[0], prev[5], prev[6]])}><i className="ti ti-copy" /> Copy Monday to weekdays</button>
            <button className="btn btn-sm" onClick={() => setHours(prev => prev.map((h, i) => i >= 5 ? 0 : h))}>Weekends off</button>
          </div>
          {DN.map((d, i) => (
            <div key={i} className="day">
              <span className={hours[i] ? '' : 'mut3'}>{d}</span>
              <label className="sw">
                <input type="checkbox" checked={hours[i] > 0} onChange={e => setHour(i, e.target.checked ? Math.max(1, hours[i]) : 0)} />
                <span />
              </label>
              <div className="row g8">
                <div className={`num ${hours[i] > 24 || hours[i] < 0 ? 'bad' : ''}`}>
                  <button onClick={() => adjustHour(i, -1)}>&#x2212;</button>
                  <input type="number" min={0} max={24} value={hours[i]} onChange={e => setHour(i, +e.target.value)} />
                  <button onClick={() => adjustHour(i, 1)}>+</button>
                </div>
                <span className="xs mut3">hours</span>
              </div>
            </div>
          ))}
          <div className="row mt12 alert al-blue">
            <i className="ti ti-clock" />
            <div style={{ flex: 1 }}><b>Total weekly availability: {total} hours</b></div>
          </div>
          {total === 0 && (
            <div className="err mt8"><i className="ti ti-alert-triangle" />This member has 0 available hours and can&apos;t be assigned work.</div>
          )}
        </div>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={handleSave}>Save member</button>
      </div>
    </aside>
  );
}

// ===== Task Drawer =====
function TaskDrawer() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const addToast = useMockupStore2(s => s.addToast);
  const role = useMockupStore2(s => s.role);
  const taskEditMode = useMockupStore2(s => s.taskEditMode);
  const setTaskEditMode = useMockupStore2(s => s.setTaskEditMode);
  const taskAccepted = useMockupStore2(s => s.taskAccepted);
  const setTaskAccepted = useMockupStore2(s => s.setTaskAccepted);
  const taskLocked = useMockupStore2(s => s.taskLocked);
  const setTaskLocked = useMockupStore2(s => s.setTaskLocked);

  return (
    <aside className="drw" onClick={e => e.stopPropagation()}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="row wrap g6 mb8">
            <span className="pri pri-H"><i className="ti ti-chevrons-up" />High</span>
            <span className="badge"><i className="ti ti-progress" /> In progress</span>
            {taskLocked && <span className="badge b-wn"><i className="ti ti-lock" /> Locked</span>}
          </div>
          <div className="h2">Requirements Analysis</div>
          <div className="sm mut mt4">Write functional and non-functional requirements with clear descriptions.</div>
        </div>
        <button className="icb" onClick={closeOverlay} title="Close"><i className="ti ti-x" /></button>
      </div>
      <div className="bd">
        {!taskEditMode ? (
          <div>
            <div className="g2r mb16" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card flat">
                <div className="xs mut">Estimated hours</div>
                <div className="h2">10 h</div>
                <div className="xs mut">7 h remaining</div>
              </div>
              <div className="card flat">
                <div className="xs mut">Target date</div>
                <div className="h2">Wed 14 Oct</div>
                <div className="xs mut">after &ldquo;Gather requirements&rdquo;</div>
              </div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Why this priority</div>
              <div className="alert al-blue sm" style={{ padding: '10px 14px' }}>
                <i className="ti ti-sparkles" />
                <div><b>High:</b> carries 4 of 30 marks, 3 tasks depend on it, and it is due in 2 days.</div>
              </div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Dependencies</div>
              <div className="row g8 sm"><i className="ti ti-circle-check" style={{ color: '#18a67a' }} /> Analyze assignment brief <span className="mut3">done</span></div>
              <div className="row g8 sm mt4"><i className="ti ti-progress" style={{ color: 'var(--blue)' }} /> Gather requirements <span className="mut3">in progress</span></div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Assigned members</div>
              <div className="card flat mb8" style={{ padding: 14 }}>
                <div className="row">
                  <span className={`av av0`}>AT</span>
                  <div style={{ flex: 1 }}><div className="b">Alice Tan</div><div className="xs mut">Allocated 6 h &middot; Remaining <b>3 h</b></div></div>
                  <span className="badge b-blue"><i className="ti ti-progress" /> In progress</span>
                  <span className="badge b-ok"><i className="ti ti-check" /> Accepted</span>
                </div>
              </div>
              <div className="card flat" style={{ padding: 14 }}>
                <div className="row">
                  <span className={`av av1`}>BL</span>
                  <div style={{ flex: 1 }}><div className="b">Bob Lee</div><div className="xs mut">Allocated 4 h &middot; Remaining <b>4 h</b></div></div>
                  <span className="badge"><i className="ti ti-circle" /> To do</span>
                  <span className={`badge ${taskAccepted ? 'b-ok' : 'b-wn'}`}>
                    <i className={`ti ${taskAccepted ? 'ti-check' : 'ti-clock'}`} /> {taskAccepted ? 'Accepted' : 'Awaiting'}
                  </span>
                </div>
                {!taskAccepted && role === 'mem' && (
                  <div className="row g8 mt12 mem-only">
                    <button className="btn btn-p btn-sm" onClick={() => { setTaskAccepted(true); addToast('You accepted "Requirements Analysis"'); }}>
                      <i className="ti ti-check" /> Accept
                    </button>
                    <button className="btn btn-sm btn-d" onClick={() => openOverlay('mdReject')}>
                      <i className="ti ti-x" /> Reject
                    </button>
                  </div>
                )}
              </div>
              <div className="alert al-blue sm mt12">
                <i className="ti ti-info-circle" />
                <div>This task becomes <b>Done</b> only when both members finish. The leader can override.</div>
              </div>
            </div>
            <div className="sec lead-only">
              <div className="eyebrow mb8">Leader controls</div>
              <div className="row wrap g8">
                <button className="btn btn-p" onClick={() => setTaskEditMode(true)}><i className="ti ti-pencil" /> Edit task</button>
                <button className="btn" onClick={() => { setTaskLocked(!taskLocked); addToast(taskLocked ? 'Task unlocked' : 'Task locked. AI changes now need your approval.', 'ti-lock'); }}>
                  <i className={`ti ${taskLocked ? 'ti-lock-open' : 'ti-lock'}`} /> {taskLocked ? 'Unlock task' : 'Lock task'}
                </button>
                <button className="btn" onClick={() => openOverlay('mdOverride')}><i className="ti ti-checks" /> Override as done</button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="alert al-blue sm mb16">
              <i className="ti ti-info-circle" />
              <div>Changing priority, hours or members recalculates the schedule. You&apos;ll see the new forecast before it&apos;s saved.</div>
            </div>
            <div className="mb16">
              <label className="fl">Task title</label>
              <input className="inp" defaultValue="Requirements Analysis" />
            </div>
            <div className="mb16">
              <label className="fl">Description</label>
              <textarea className="inp" defaultValue="Write functional and non-functional requirements with clear descriptions." />
            </div>
            <div className="row g12 mb16">
              <div style={{ flex: 1 }}>
                <label className="fl">Priority</label>
                <select className="inp" style={{ width: '100%' }} defaultValue="High">
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="fl">Target date</label>
                <input className="inp" type="date" defaultValue="2026-10-14" />
              </div>
            </div>
            <div className="mb16">
              <label className="fl">Assigned members and hours</label>
              <div className="card flat mb8" style={{ padding: 12 }}>
                <div className="row g12 wrap">
                  <span className="av av0">AT</span>
                  <div style={{ flex: 1, minWidth: 90 }} className="b">Alice Tan</div>
                  <label className="xs mut">Allocated <input className="inp" type="number" defaultValue={6} style={{ width: 68, padding: '6px 8px' }} /></label>
                  <label className="xs mut">Remaining <input className="inp" type="number" defaultValue={3} style={{ width: 68, padding: '6px 8px' }} /></label>
                  <button className="icb" title="Remove from task"><i className="ti ti-x" /></button>
                </div>
              </div>
              <div className="card flat mb8" style={{ padding: 12 }}>
                <div className="row g12 wrap">
                  <span className="av av1">BL</span>
                  <div style={{ flex: 1, minWidth: 90 }} className="b">Bob Lee</div>
                  <label className="xs mut">Allocated <input className="inp" type="number" defaultValue={4} style={{ width: 68, padding: '6px 8px' }} /></label>
                  <label className="xs mut">Remaining <input className="inp" type="number" defaultValue={4} style={{ width: 68, padding: '6px 8px' }} /></label>
                  <button className="icb" title="Remove from task"><i className="ti ti-x" /></button>
                </div>
              </div>
              <select className="inp"><option>+ Add member</option><option>Chloe Ng &middot; 23 h spare</option><option>David Chen &middot; 27 h spare</option></select>
              <div className="hint">Total: 10 h across 2 members.</div>
            </div>
            <label className="row g8" style={{ cursor: 'pointer' }}>
              <span className="sw"><input type="checkbox" checked={taskLocked} onChange={e => setTaskLocked(e.target.checked)} /><span /></span>
              <span>Lock this task so AI can&apos;t change it without approval</span>
            </label>
          </div>
        )}
      </div>
      <div className="ft">
        {!taskEditMode ? (
          <button className="btn" onClick={closeOverlay}>Close</button>
        ) : (
          <>
            <button className="btn" onClick={() => setTaskEditMode(false)}>Cancel</button>
            <button className="btn btn-p" onClick={() => openOverlay('mdSave')}>Save changes</button>
          </>
        )}
      </div>
    </aside>
  );
}

// ===== Reject Modal =====
function RejectModal() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const addToast = useMockupStore2(s => s.addToast);
  const [selected, setSelected] = useState(0);

  return (
    <>
      <div className="bd">
        <div className="h2 mb8">Reject this task?</div>
        <p className="sm mut mb12">Tell your leader why. The AI will suggest who could take it.</p>
        <div className="col g8">
          {RJ_OPTS.map((r, i) => (
            <label key={i} className="row g8 card flat" style={{ padding: '10px 14px', cursor: 'pointer' }}>
              <input type="radio" name="rj" className="ck" checked={selected === i} onChange={() => setSelected(i)} />
              {r}
            </label>
          ))}
        </div>
        <textarea className="inp mt12" placeholder="Optional: add a short explanation" />
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-d" onClick={() => { closeOverlay(); addToast('Rejected. Your leader will see a reassignment suggestion.', 'ti-user-x'); }}>
          Reject task
        </button>
      </div>
    </>
  );
}

// ===== Save Modal =====
function SaveModal() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const setTaskEditMode = useMockupStore2(s => s.setTaskEditMode);
  const addToast = useMockupStore2(s => s.addToast);

  return (
    <>
      <div className="bd">
        <div className="h2 mb8">Save changes to this task?</div>
        <p className="sm mut">Allocated hours change from 10 h to 12 h. The predicted completion moves <b>Fri 6 Nov &rarr; Sat 7 Nov</b> (+1 day). Bob will be asked to accept the new estimate.</p>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); setTaskEditMode(false); addToast('Task updated. Forecast recalculated.'); }}>
          Save and recalculate
        </button>
      </div>
    </>
  );
}

// ===== Override Modal =====
function OverrideModal() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const addToast = useMockupStore2(s => s.addToast);

  return (
    <>
      <div className="bd">
        <div className="h2 mb8">Mark this task as done?</div>
        <p className="sm mut">Bob still has 4 h remaining. Overriding marks the whole task Done and recalculates the schedule. Predicted completion moves <b>Fri 6 Nov &rarr; Thu 5 Nov</b>.</p>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); addToast('Task overridden as done. Forecast recalculated.'); }}>
          Override and recalculate
        </button>
      </div>
    </>
  );
}

// ===== Edit Project Modal =====
function EditModal() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const addToast = useMockupStore2(s => s.addToast);

  return (
    <>
      <div className="bd">
        <div className="h2 mb12">Edit project</div>
        <div className="mb12">
          <label className="fl">Project name</label>
          <input className="inp" defaultValue="Software Requirements Specification" />
        </div>
        <div className="row g12">
          <div style={{ flex: 1 }}>
            <label className="fl">Deadline</label>
            <input className="inp" type="date" defaultValue="2026-10-30" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="fl">Time</label>
            <input className="inp" type="time" defaultValue="17:00" />
          </div>
        </div>
        <div className="alert al-wn sm mt12">
          <i className="ti ti-alert-triangle" />
          <div>Changing the deadline recalculates the schedule and risk.</div>
        </div>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); addToast('Project updated. Schedule recalculated.'); }}>
          Save and recalculate
        </button>
      </div>
    </>
  );
}
