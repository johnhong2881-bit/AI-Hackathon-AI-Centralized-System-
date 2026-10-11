'use client';

import { useState } from 'react';
import { useMockupStore } from '@/store/useMockupStore';
import { MEM, LVN, DN, RJ_OPTS } from '@/lib/mock/mockPlanPilot';
import { av, lv, pri, SI } from './MockupScreens';

// ===== Member Drawer =====
export function MemberDrawer() {
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  const memberHours = useMockupStore(s => s.memberHours);
  const setMemberHours = useMockupStore(s => s.setMemberHours);
  const addToast = useMockupStore(s => s.addToast);
  const total = memberHours.reduce((a, b) => a + b, 0);

  const adjustHour = (i: number, delta: number) => {
    const next = [...memberHours];
    next[i] = Math.max(0, Math.min(24, next[i] + delta));
    setMemberHours(next);
  };
  const setHour = (i: number, val: number) => {
    const v = isNaN(val) ? 0 : Math.max(0, Math.min(24, val));
    const next = [...memberHours];
    next[i] = v;
    setMemberHours(next);
  };

  return (
    <aside className="drw" id="drMember" style={{ position: 'fixed', display: 'flex' }}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="h2">Add team member</div>
          <div className="sm mut">Skills and availability decide which tasks they get.</div>
        </div>
        <button className="icb" onClick={closeOverlay}><i className="ti ti-x" /></button>
      </div>
      <div className="bd">
        <div className="mb16">
          <label className="fl">Member name</label>
          <input className="inp" defaultValue="Alice Tan" placeholder="e.g. Alice Tan" />
        </div>
        <div className="mb16">
          <label className="fl">Skills and level</label>
          <div className="col g8">
            {MEM[0].sk.map((s, i) => (
              <div key={i} className="row g8">
                <span className="sk" style={{ padding: '6px 10px', fontSize: 13 }}>{s[0]}</span>
                <span className="sp" />
                <select className="inp" style={{ padding: '5px 26px 5px 10px' }} defaultValue={LVN[s[1]]}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
                <button className="icb"><i className="ti ti-x" /></button>
              </div>
            ))}
          </div>
          <div className="row wrap g6 mt12">
            <span className="xs mut">Suggested:</span>
            {['Programming', 'UI/UX Design', 'Data Analysis', 'Testing', 'Presentation'].map(s => (
              <button key={s} className="btn btn-sm" style={{ borderStyle: 'dashed' }}>+ {s}</button>
            ))}
          </div>
          <div className="row g8 mt8"><input className="inp" placeholder="Add a custom skill and press Enter" /></div>
        </div>
        <div>
          <div className="row mb8">
            <label className="fl" style={{ margin: 0 }}>Weekly availability</label>
            <span className="sp" />
            <button className="btn btn-sm" onClick={() => { const next = [...memberHours]; for (let i = 1; i <= 4; i++) next[i] = next[0]; setMemberHours(next); }}><i className="ti ti-copy" /> Copy Monday to weekdays</button>
            <button className="btn btn-sm" onClick={() => { const next = [...memberHours]; next[5] = 0; next[6] = 0; setMemberHours(next); }}>Weekends off</button>
          </div>
          {memberHours.map((h, i) => (
            <div key={i} className="day">
              <span className={h ? '' : 'mut3'}>{DN[i]}</span>
              <label className="sw">
                <input type="checkbox" checked={h > 0} onChange={e => setHour(i, e.target.checked ? Math.max(1, h) : 0)} />
                <span />
              </label>
              <div className="row g8">
                <div className={`num ${h > 24 || h < 0 ? 'bad' : ''}`}>
                  <button onClick={() => adjustHour(i, -1)}>−</button>
                  <input type="number" min={0} max={24} value={h} onChange={e => setHour(i, +e.target.value)} />
                  <button onClick={() => adjustHour(i, 1)}>+</button>
                </div>
                <span className="xs mut3">hours</span>
              </div>
            </div>
          ))}
          <div className="row mt12 alert al-blue"><i className="ti ti-clock" /><div style={{ flex: 1 }}><b>Total weekly availability: {total} hours</b></div></div>
          {total === 0 && <div className="err mt8"><i className="ti ti-alert-triangle" />This member has 0 available hours and can't be assigned work.</div>}
        </div>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); addToast('Member saved'); }}>Save member</button>
      </div>
    </aside>
  );
}

// ===== Task Drawer =====
export function TaskDrawer() {
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  const openOverlay = useMockupStore(s => s.openOverlay);
  const taskAccepted = useMockupStore(s => s.taskAccepted);
  const setTaskAccepted = useMockupStore(s => s.setTaskAccepted);
  const taskLocked = useMockupStore(s => s.taskLocked);
  const setTaskLocked = useMockupStore(s => s.setTaskLocked);
  const addToast = useMockupStore(s => s.addToast);
  const role = useMockupStore(s => s.role);

  return (
    <aside className="drw" id="drTask" style={{ position: 'fixed', display: 'flex' }}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="row wrap g6 mb8">
            <span className="pri pri-H"><i className="ti ti-chevrons-up" />High</span>
            <span className="badge b-dg"><i className="ti ti-flag" /> Mandatory</span>
            <span className="badge"><i className="ti ti-progress" /> In progress</span>
            {taskLocked && <span className="badge b-wn"><i className="ti ti-lock" /> Locked</span>}
          </div>
          <div className="h2">Requirements Analysis</div>
          <div className="sm mut mt4">Write functional and non-functional requirements with clear descriptions.</div>
        </div>
        <button className="icb" onClick={closeOverlay}><i className="ti ti-x" /></button>
      </div>
      <div className="bd">
        <div className="g2r mb16" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card flat"><div className="xs mut">Estimated hours</div><div className="h2">10 h</div><div className="xs mut">7 h remaining</div></div>
          <div className="card flat"><div className="xs mut">Target date</div><div className="h2">Wed 14 Oct</div><div className="xs mut">after "Gather requirements"</div></div>
        </div>
        <div className="sec"><div className="eyebrow mb8">Rubric</div>
          <div className="row g8"><span className="crit">C2</span> Requirements Analysis · 4 marks <span className="badge b-dg">Mandatory</span></div>
          <div className="hint">Related requirements: functional, non-functional, clear descriptions.</div>
        </div>
        <div className="sec"><div className="eyebrow mb8">Dependencies</div>
          <div className="row g8 sm"><i className="ti ti-circle-check" style={{ color: '#18a67a' }} /> Analyze assignment brief <span className="mut3">done</span></div>
          <div className="row g8 sm mt4"><i className="ti ti-progress" style={{ color: 'var(--blue)' }} /> Gather requirements <span className="mut3">in progress</span></div>
        </div>
        <div className="sec"><div className="eyebrow mb8">Assigned members</div>
          <div className="card flat mb8" style={{ padding: 14 }}>
            <div className="row"><span className="av av0">AT</span><div style={{ flex: 1 }}><div className="b">Alice Tan</div><div className="xs mut">Allocated 6 h · Remaining <b>3 h</b></div></div><span className="badge b-blue"><i className="ti ti-progress" /> In progress</span><span className="badge b-ok"><i className="ti ti-check" /> Accepted</span></div>
          </div>
          <div className="card flat" style={{ padding: 14 }}>
            <div className="row"><span className="av av1">BL</span><div style={{ flex: 1 }}><div className="b">Bob Lee</div><div className="xs mut">Allocated 4 h · Remaining <b>4 h</b></div></div><span className="badge"><i className="ti ti-circle" /> To do</span>
              {taskAccepted ? <span className="badge b-ok"><i className="ti ti-check" /> Accepted</span> : <span className="badge b-wn"><i className="ti ti-clock" /> Awaiting</span>}
            </div>
            {!taskAccepted && role === 'mem' && (
              <div className="row g8 mt12 mem-only">
                <button className="btn btn-p btn-sm" onClick={() => { setTaskAccepted(true); addToast('You accepted "Requirements Analysis"'); }}><i className="ti ti-check" /> Accept</button>
                <button className="btn btn-sm btn-d" onClick={() => openOverlay('mdReject')}><i className="ti ti-x" /> Reject</button>
              </div>
            )}
          </div>
          <div className="alert al-blue sm mt12"><i className="ti ti-info-circle" /><div>This task becomes <b>Done</b> only when both members finish. The leader can override.</div></div>
        </div>
        {role === 'lead' && (
          <div className="sec lead-only"><div className="eyebrow mb8">Leader controls</div>
            <div className="row wrap g8">
              <select className="inp"><option>Priority: High</option><option>Priority: Medium</option><option>Priority: Low</option></select>
              <button className="btn"><i className="ti ti-arrows-exchange" /> Reassign</button>
              <button className="btn"><i className="ti ti-clock-edit" /> Edit hours</button>
              <button className="btn" onClick={() => { setTaskLocked(!taskLocked); addToast(taskLocked ? 'Task unlocked' : 'Task locked. AI changes now need your approval.', 'ti-lock'); }}>{taskLocked ? <><i className="ti ti-lock-open" /> Unlock task</> : <><i className="ti ti-lock" /> Lock task</>}</button>
              <button className="btn" onClick={() => openOverlay('mdOverride')}><i className="ti ti-checks" /> Override as done</button>
            </div>
          </div>
        )}
      </div>
      <div className="ft"><button className="btn" onClick={closeOverlay}>Close</button></div>
    </aside>
  );
}

// ===== Reject Modal =====
export function RejectModal() {
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  const addToast = useMockupStore(s => s.addToast);
  const [selected, setSelected] = useState(0);
  return (
    <div className="mdl" id="mdReject" style={{ position: 'fixed' }}>
      <div className="bd">
        <div className="h2 mb8">Reject this task?</div>
        <p className="sm mut mb12">Tell your leader why. The AI will suggest who could take it.</p>
        <div className="col g8">
          {RJ_OPTS.map((r, i) => (
            <label key={i} className="row g8 card flat" style={{ padding: '10px 14px', cursor: 'pointer' }}>
              <input type="radio" name="rj" className="ck" checked={selected === i} onChange={() => setSelected(i)} />{r}
            </label>
          ))}
        </div>
        <textarea className="inp mt12" placeholder="Optional: add a short explanation" />
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-d" onClick={() => { closeOverlay(); addToast('Rejected. Your leader will see a reassignment suggestion.', 'ti-user-x'); }}>Reject task</button>
      </div>
    </div>
  );
}

// ===== Override Modal =====
export function OverrideModal() {
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  const addToast = useMockupStore(s => s.addToast);
  return (
    <div className="mdl" id="mdOverride" style={{ position: 'fixed' }}>
      <div className="bd">
        <div className="h2 mb8">Mark this task as done?</div>
        <p className="sm mut">Bob still has 4 h remaining. Overriding marks the whole task Done and recalculates the schedule. Predicted completion moves <b>Fri 6 Nov → Thu 5 Nov</b>.</p>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); addToast('Task overridden as done. Schedule recalculated.'); }}>Override and recalculate</button>
      </div>
    </div>
  );
}

// ===== Edit Modal =====
export function EditModal() {
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  const addToast = useMockupStore(s => s.addToast);
  return (
    <div className="mdl" id="mdEdit" style={{ position: 'fixed' }}>
      <div className="bd">
        <div className="h2 mb12">Edit project</div>
        <div className="mb12"><label className="fl">Project name</label><input className="inp" defaultValue="Software Requirements Specification" /></div>
        <div className="row g12">
          <div style={{ flex: 1 }}><label className="fl">Deadline</label><input className="inp" type="date" defaultValue="2026-10-30" /></div>
          <div style={{ flex: 1 }}><label className="fl">Time</label><input className="inp" type="time" defaultValue="17:00" /></div>
        </div>
        <div className="alert al-wn sm mt12"><i className="ti ti-alert-triangle" /><div>Changing the deadline recalculates the schedule and risk.</div></div>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={() => { closeOverlay(); addToast('Project saved and recalculated'); }}>Save and recalculate</button>
      </div>
    </div>
  );
}

// ===== Toast Container =====
export function ToastContainer() {
  const toasts = useMockupStore(s => s.toasts);
  return (
    <div className="toast" id="toast">
      {toasts.map(t => (
        <div key={t.id}><i className={`ti ${t.icon}`} />{t.text}</div>
      ))}
    </div>
  );
}

// ===== Overlay =====
export function Overlay() {
  const overlay = useMockupStore(s => s.overlay);
  const closeOverlay = useMockupStore(s => s.closeOverlay);
  if (!overlay) return null;
  return (
    <>
      <div className="ov" onClick={closeOverlay} />
      {overlay === 'drMember' && <MemberDrawer />}
      {overlay === 'drTask' && <TaskDrawer />}
      {overlay === 'mdReject' && <RejectModal />}
      {overlay === 'mdOverride' && <OverrideModal />}
      {overlay === 'mdEdit' && <EditModal />}
    </>
  );
}
