'use client';

import { useState, useEffect } from 'react';
import { useMockupStore2 } from '@/store/useMockupStore2';
import { useTaskStore } from '@/store/useTaskStore';
import { SUGG, LVN, DN, RJ_OPTS, TK, PROJECT_MEMBERS, PROJECTS, PGP, AVC, RUBRIC_MARKS, RUBRIC_TOTAL } from '@/lib/mock/mockTaskflow2';
import type { Task, Member, Skill, TaskStatus, Priority } from '@/types/types';

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
          {(overlay === 'mdReject' || overlay === 'mdOverride' || overlay === 'mdEdit' || overlay === 'mdSave' || overlay === 'mdContrib') && (
            <div className="mdl" onClick={e => e.stopPropagation()}>
              {overlay === 'mdReject' && <RejectModal />}
              {overlay === 'mdSave' && <SaveModal />}
              {overlay === 'mdOverride' && <OverrideModal />}
              {overlay === 'mdEdit' && <EditModal />}
              {overlay === 'mdContrib' && <ContributionModal />}
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
  const editingMemberId = useMockupStore2(s => s.editingMemberId);
  const setEditingMemberId = useMockupStore2(s => s.setEditingMemberId);

  // Load existing member data if editing
  const existingMember = useTaskStore(s => s.members.find(m => m.id === editingMemberId) || null);

  const [name, setName] = useState(existingMember?.name || '');
  const [skills, setSkills] = useState<[string, number][]>(() => {
    if (existingMember) {
      const SKILL_REVERSE: Record<string, string> = {
        'research': 'Research', 'writing': 'Academic Writing', 'editing': 'Documentation',
        'management': 'Testing', 'design': 'UI/UX Design', 'coding': 'Programming',
        'analysis': 'Data Analysis', 'presentation': 'Presentation',
      };
      return existingMember.skills.map(s => {
        const label = SKILL_REVERSE[s] || s;
        const prof = existingMember.skillProficiency?.[s] || 2;
        return [label, Math.min(3, Math.max(1, prof - 1))] as [string, number];
      });
    }
    return [['Research', 3], ['Academic Writing', 2]];
  });
  const [weaknesses, setWeaknesses] = useState<string[]>(() => {
    if (existingMember) {
      const allSkills: Skill[] = ['writing', 'research', 'design', 'coding', 'presentation', 'analysis', 'editing', 'management'];
      const SKILL_REVERSE: Record<string, string> = {
        'research': 'Research', 'writing': 'Academic Writing', 'editing': 'Documentation',
        'management': 'Testing', 'design': 'UI/UX Design', 'coding': 'Programming',
        'analysis': 'Data Analysis', 'presentation': 'Presentation',
      };
      return allSkills
        .filter(s => !existingMember.skills.includes(s))
        .map(s => SKILL_REVERSE[s] || s)
        .slice(0, 2);
    }
    return ['Programming', 'Testing'];
  });
  const [hours, setHours] = useState<number[]>(() => {
    if (existingMember?.weeklyAvailability) {
      return [
        existingMember.weeklyAvailability.monday,
        existingMember.weeklyAvailability.tuesday,
        existingMember.weeklyAvailability.wednesday,
        existingMember.weeklyAvailability.thursday,
        existingMember.weeklyAvailability.friday,
        existingMember.weeklyAvailability.saturday,
        existingMember.weeklyAvailability.sunday,
      ];
    }
    return [2, 3, 0, 2, 4, 5, 3];
  });

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

    // Map UI skill names to Skill type
    const SKILL_MAP: Record<string, Skill> = {
      'Research': 'research', 'Academic Writing': 'writing', 'Documentation': 'editing',
      'Testing': 'management', 'UI/UX Design': 'design', 'Programming': 'coding',
      'Data Analysis': 'analysis', 'Presentation': 'presentation',
    };
    const ALL_SKILLS: Skill[] = ['writing', 'research', 'design', 'coding', 'presentation', 'analysis', 'editing', 'management'];

    const memberSkills: Skill[] = skills.map(s => SKILL_MAP[s[0]] || 'management');
    const skillProficiency = {} as Record<Skill, number>;
    for (const sk of ALL_SKILLS) {
      const match = skills.find(s => SKILL_MAP[s[0]] === sk);
      skillProficiency[sk] = match ? Math.min(5, match[1] + 1) : 1;
    }

    const weeklyAvailability = {
      monday: hours[0], tuesday: hours[1], wednesday: hours[2], thursday: hours[3],
      friday: hours[4], saturday: hours[5], sunday: hours[6],
    };

    const store = useTaskStore.getState();
    const existing = editingMemberId
      ? store.members.find(m => m.id === editingMemberId)
      : store.members.find(m => m.name.toLowerCase() === name.trim().toLowerCase());

    const memberData: Member = {
      id: existing?.id || `mem-${Date.now()}`,
      name: name.trim(),
      avatar: name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      skills: memberSkills,
      skillProficiency,
      availability: hours.reduce((a, b) => a + b, 0),
      weeklyAvailability,
      role: existing?.role || 'Member',
      isLeader: existing?.isLeader || false,
      currentTaskIds: existing?.currentTaskIds || [],
    };

    if (existing) {
      store.setMembers(store.members.map(m => m.id === existing.id ? memberData : m));
    } else {
      store.setMembers([...store.members, memberData]);
    }

    setEditingMemberId(null);
    addToast(`${name} saved`, 'ti-user-check');
    closeOverlay();
  };

  const handleClose = () => {
    setEditingMemberId(null);
    closeOverlay();
  };

  return (
    <aside className="drw" onClick={e => e.stopPropagation()}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="h2">{editingMemberId ? 'Edit team member' : 'Add team member'}</div>
          <div className="sm mut">Strengths, weaknesses and availability decide which tasks they get.</div>
        </div>
        <button className="icb" onClick={handleClose} title="Close"><i className="ti ti-x" /></button>
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
        <button className="btn" onClick={handleClose}>Cancel</button>
        <button className="btn btn-p" onClick={handleSave}>{editingMemberId ? 'Save member' : 'Add member'}</button>
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
  const selectedTaskId = useMockupStore2(s => s.selectedTaskId);
  const setPendingTaskEdit = useMockupStore2(s => s.setPendingTaskEdit);
  const setTaskOverride = useMockupStore2(s => s.setTaskOverride);
  const taskOverrides = useMockupStore2(s => s.taskOverrides);

  // Look up real task from store
  const plan = useTaskStore(s => s.plan);
  const members = useTaskStore(s => s.members);
  const realTask = plan?.tasks.find(t => t.id === selectedTaskId) || null;

  // Fallback: find mock task from TK when no real plan exists
  // OverviewScreen passes task title as selectedTaskId, TasksScreen passes TK ID
  const mockTaskEntry = !realTask 
    ? TK.find(t => String(t[0]) === selectedTaskId) || TK.find(t => t[1] === selectedTaskId)
    : null;
  // Normalize override key to TK ID when using mock data
  const overrideTaskId = mockTaskEntry ? String(mockTaskEntry[0]) : selectedTaskId;
  const override = overrideTaskId ? taskOverrides[overrideTaskId] : undefined;

  // Build effective task — real task, or mock task with overrides
  const task: Task | null = realTask || (mockTaskEntry ? {
    id: String(mockTaskEntry[0]),
    title: mockTaskEntry[1],
    description: mockTaskEntry[2],
    estimatedHours: override?.hours ?? mockTaskEntry[4],
    status: (override?.status || (mockTaskEntry[8] === 'prog' ? 'in-progress' : mockTaskEntry[8] === 'done' ? 'done' : 'todo')) as TaskStatus,
    priority: (mockTaskEntry[3] === 'H' ? 'high' : mockTaskEntry[3] === 'M' ? 'medium' : 'low') as Priority,
    assignedTo: mockTaskEntry[5][0] || null,
    dependencies: [],
    requiredSkills: [],
    complexity: 'medium' as const,
    relatedRubricIds: [],
    confirmed: false,
    memberAssignments: [],
    invitationStatus: 'pending' as const,
    order: mockTaskEntry[6],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Task : null);
  const assignedMembers = task && members.length > 0
    ? members.filter(m => task.assignedTo === m.id || (task.memberAssignments?.some(ma => ma.memberId === m.id)))
    : [];

  // Sync taskAccepted with real task's invitation status
  useEffect(() => {
    if (task?.invitationStatus === 'accepted') setTaskAccepted(true);
    if (task?.invitationStatus === 'rejected') setTaskAccepted(false);
  }, [task?.invitationStatus, setTaskAccepted]);

  // Edit mode controlled state
  const [editTitle, setEditTitle] = useState(task?.title || '');
  const [editDesc, setEditDesc] = useState(task?.description || '');
  const [editPriority, setEditPriority] = useState<Priority>((task?.priority as Priority) || 'medium');
  const [editDate, setEditDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (task?.order || 2));
    return d.toISOString().slice(0, 10);
  });

  // Update edit state when task changes
  useEffect(() => {
    setEditTitle(task?.title || '');
    setEditDesc(task?.description || '');
    setEditPriority(task?.priority || 'medium');
  }, [task?.id]);

  // Look up dependency tasks from plan
  const depTasks = task?.dependencies.map(depId => {
    const depTask = plan?.tasks.find(t => t.id === depId);
    return depTask ? { id: depTask.id, title: depTask.title, status: depTask.status } : null;
  }).filter(Boolean) ?? [];

  // Format target date from task order
  const targetDateStr = (() => {
    if (!task) return 'Day 2';
    const baseDate = new Date('2026-10-12');
    baseDate.setDate(baseDate.getDate() + (task.order || 2));
    return baseDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  // Local state fallback — ensures progress buttons always work even if task lookup fails
  const [localStatus, setLocalStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [localHours, setLocalHours] = useState(0);

  // Sync local state with task whenever task changes
  useEffect(() => {
    if (task) {
      const tStatus = task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in-progress' : 'todo';
      setLocalStatus(tStatus);
      setLocalHours(task.estimatedHours || 0);
    } else if (mockTaskEntry) {
      const mStatus = mockTaskEntry[8] === 'prog' ? 'in-progress' : mockTaskEntry[8] === 'done' ? 'done' : 'todo';
      setLocalStatus(override?.status as any || mStatus);
      setLocalHours(override?.hours ?? mockTaskEntry[4]);
    }
  }, [task?.id, task?.status, task?.estimatedHours, selectedTaskId]);

  // Effective values — use task from store/override, fall back to local state
  const effectiveStatus = task?.status ? (task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in-progress' : 'todo') : localStatus;
  const effectiveHours = task?.estimatedHours ?? localHours;

  // Update task status (todo / in-progress / done) in store
  const updateTaskStatus = (status: 'todo' | 'in-progress' | 'done') => {
    setLocalStatus(status); // immediate UI feedback
    // Update real plan if it exists
    if (plan && task) {
      const currentPlan = useTaskStore.getState().plan;
      if (currentPlan) {
        const updatedTasks = currentPlan.tasks.map(t =>
          t.id === task.id ? { ...t, status, updatedAt: new Date().toISOString() } : t
        );
        useTaskStore.getState().setPlan({ ...currentPlan, tasks: updatedTasks });
      }
    }
    // Also update overrides (works for both real and mock tasks)
    if (overrideTaskId) {
      setTaskOverride(overrideTaskId, { status, hours: effectiveHours });
    }
    addToast(`Status updated to "${status === 'done' ? 'Done' : status === 'in-progress' ? 'In progress' : 'To do'}"`, 'ti-circle-check');
  };

  // Update remaining hours in store
  const updateRemainingHours = (hours: number) => {
    if (hours < 0) return;
    setLocalHours(hours); // immediate UI feedback
    // Update real plan if it exists
    if (plan && task) {
      const currentPlan = useTaskStore.getState().plan;
      if (currentPlan) {
        const updatedTasks = currentPlan.tasks.map(t =>
          t.id === task.id ? { ...t, estimatedHours: hours, updatedAt: new Date().toISOString() } : t
        );
        useTaskStore.getState().setPlan({ ...currentPlan, tasks: updatedTasks });
      }
    }
    // Also update overrides
    if (overrideTaskId) {
      setTaskOverride(overrideTaskId, { status: effectiveStatus, hours });
    }
  };

  // API call helper for task invitation
  const callInvitation = async (action: 'accept' | 'reject', rejectReason?: string): Promise<boolean> => {
    if (!selectedTaskId) { addToast('No task selected', 'ti-alert-circle'); return false; }
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectReason }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const updatedTask = await res.json();
      // Update the task in the store
      const currentPlan = useTaskStore.getState().plan;
      if (currentPlan) {
        const updatedTasks = currentPlan.tasks.map(t =>
          t.id === selectedTaskId
            ? { ...t, ...updatedTask, invitationStatus: action === 'accept' ? 'accepted' as const : 'rejected' as const, confirmed: action === 'accept' }
            : t
        );
        useTaskStore.getState().setPlan({ ...currentPlan, tasks: updatedTasks });
      }
      return true;
    } catch (err) {
      addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'ti-alert-circle');
      return false;
    }
  };

  return (
    <aside className="drw" onClick={e => e.stopPropagation()}>
      <div className="hd">
        <div style={{ flex: 1 }}>
          <div className="row wrap g6 mb8">
            {(() => {
              const p = task?.priority || 'medium';
              const pChar = p === 'critical' || p === 'high' ? 'H' : p === 'medium' ? 'M' : 'L';
              const pIcon = pChar === 'H' ? 'ti-chevrons-up' : pChar === 'M' ? 'ti-chevron-up' : 'ti-chevron-down';
              const pLabel = pChar === 'H' ? 'High' : pChar === 'M' ? 'Medium' : 'Low';
              return <span className={`pri pri-${pChar}`}><i className={`ti ${pIcon}`} />{pLabel}</span>;
            })()}
            <span className="badge"><i className={`ti ${effectiveStatus === 'done' ? 'ti-circle-check' : effectiveStatus === 'in-progress' ? 'ti-progress' : 'ti-circle'}`} /> {effectiveStatus === 'done' ? 'Done' : effectiveStatus === 'in-progress' ? 'In progress' : 'To do'}</span>
            {taskLocked && <span className="badge b-wn"><i className="ti ti-lock" /> Locked</span>}
          </div>
          <div className="h2">{task?.title || 'Requirements Analysis'}</div>
          <div className="sm mut mt4">{task?.description || 'Write functional and non-functional requirements with clear descriptions.'}</div>
        </div>
        <button className="icb" onClick={closeOverlay} title="Close"><i className="ti ti-x" /></button>
      </div>
      <div className="bd">
        {!taskEditMode ? (
          <div>
            <div className="g2r mb16" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="card flat">
                <div className="xs mut">Estimated hours</div>
                <div className="h2">{effectiveHours || 10} h</div>
                <div className="xs mut">{effectiveHours || 10} h remaining</div>
              </div>
              <div className="card flat">
                <div className="xs mut">Rubric marks</div>
                <div className="h2">{mockTaskEntry ? (RUBRIC_MARKS[mockTaskEntry[0]] ?? 0) : (task ? (RUBRIC_MARKS[parseInt(task.id.replace(/\D/g, ''))] ?? 0) : 0)} <span className="xs mut">/ {RUBRIC_TOTAL}</span></div>
                <div className="xs mut">{(() => { const mk = mockTaskEntry ? (RUBRIC_MARKS[mockTaskEntry[0]] ?? 0) : (task ? (RUBRIC_MARKS[parseInt(task.id.replace(/\D/g, ''))] ?? 0) : 0); return `${Math.round(mk / RUBRIC_TOTAL * 100)}% of total`; })()}</div>
              </div>
              <div className="card flat">
                <div className="xs mut">Target date</div>
                <div className="h2">{targetDateStr}</div>
                <div className="xs mut">{depTasks.length > 0 ? `after "${depTasks[depTasks.length - 1]?.title?.slice(0, 20)}..."` : 'start of project'}</div>
              </div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Why this priority</div>
              <div className="alert al-blue sm" style={{ padding: '10px 14px' }}>
                <i className="ti ti-sparkles" />
                <div><b>{task?.priority === 'critical' || task?.priority === 'high' ? 'High' : task?.priority === 'medium' ? 'Medium' : 'Low'}:</b> {effectiveHours || 10}h of work, {depTasks.length} task{depTasks.length !== 1 ? 's' : ''} depend on it{task?.priority === 'critical' ? ', and it is on the critical path' : ''}.</div>
              </div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Dependencies</div>
              {depTasks.length > 0 ? depTasks.map((dep, i) => (
                <div key={i} className="row g8 sm" style={{ marginTop: i > 0 ? 4 : 0 }}>
                  <i className={`ti ${dep!.status === 'done' ? 'ti-circle-check' : dep!.status === 'in-progress' ? 'ti-progress' : 'ti-circle'}`} style={{ color: dep!.status === 'done' ? '#18a67a' : 'var(--blue)' }} />
                  {dep!.title}
                  <span className="mut3">{dep!.status === 'done' ? 'done' : dep!.status === 'in-progress' ? 'in progress' : 'to do'}</span>
                </div>
              )) : (
                <div className="row g8 sm"><i className="ti ti-info-circle" style={{ color: 'var(--blue)' }} /> No dependencies — this task can start immediately.</div>
              )}
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Assigned members</div>
              {assignedMembers.length > 0 ? assignedMembers.map((m, i) => (
                <div key={m.id} className="card flat mb8" style={{ padding: 14 }}>
                  <div className="row">
                    <span className={`av av${i % 4}`}>{m.avatar}</span>
                    <div style={{ flex: 1 }}><div className="b">{m.name}</div><div className="xs mut">Allocated {effectiveHours || 10}h &middot; Remaining <b>{effectiveHours || 10}h</b></div></div>
                    <span className={`badge ${m.currentTaskIds?.includes(task?.id || '') ? 'b-blue' : ''}`}>
                      <i className={`ti ${effectiveStatus === 'done' ? 'ti-circle-check' : effectiveStatus === 'in-progress' ? 'ti-progress' : 'ti-circle'}`} />
                      {effectiveStatus === 'done' ? 'Done' : effectiveStatus === 'in-progress' ? 'In progress' : 'To do'}
                    </span>
                    {i === 0 && (
                      <span className={`badge ${taskAccepted || task?.invitationStatus === 'accepted' ? 'b-ok' : 'b-wn'}`}>
                        <i className={`ti ${taskAccepted || task?.invitationStatus === 'accepted' ? 'ti-check' : 'ti-clock'}`} />
                        {taskAccepted || task?.invitationStatus === 'accepted' ? 'Accepted' : 'Awaiting'}
                      </span>
                    )}
                  </div>
                  {!taskAccepted && task?.invitationStatus !== 'accepted' && role === 'mem' && i === 0 && (
                    <div className="row g8 mt12 mem-only">
                      <button className="btn btn-p btn-sm" onClick={async () => {
                        const ok = await callInvitation('accept');
                        if (ok) { setTaskAccepted(true); addToast(`You accepted "${task?.title || 'this task'}"`); }
                      }}>
                        <i className="ti ti-check" /> Accept
                      </button>
                      <button className="btn btn-sm btn-d" onClick={() => openOverlay('mdReject')}>
                        <i className="ti ti-x" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <div className="card flat" style={{ padding: 14 }}>
                  <div className="row">
                    <span className="av av0">??</span>
                    <div style={{ flex: 1 }}><div className="b">Unassigned</div><div className="xs mut">No member assigned to this task yet.</div></div>
                    <span className="badge b-wn"><i className="ti ti-user-plus" /> Needs assignment</span>
                  </div>
                </div>
              )}
              <div className="alert al-blue sm mt12">
                <i className="ti ti-info-circle" />
                <div>{assignedMembers.length > 1 ? `This task becomes <b>Done</b> only when all ${assignedMembers.length} members finish. The leader can override.` : 'The leader can override task status at any time.'}</div>
              </div>
            </div>
            <div className="sec">
              <div className="eyebrow mb8">Progress</div>
              <div className="card flat" style={{ padding: 14 }}>
                <div className="row mb12">
                  <div style={{ flex: 1 }}>
                    <div className="xs mut mb4">Current status</div>
                    <div className="seg">
                      <button
                        className={effectiveStatus === 'todo' ? 'on' : ''}
                        onClick={() => updateTaskStatus('todo')}
                      >To do</button>
                      <button
                        className={effectiveStatus === 'in-progress' ? 'on' : ''}
                        onClick={() => updateTaskStatus('in-progress')}
                      >In progress</button>
                      <button
                        className={effectiveStatus === 'done' ? 'on' : ''}
                        onClick={() => updateTaskStatus('done')}
                      >Done</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="xs mut">Completion</label>
                  <div className="bar mt4"><i style={{ width: `${effectiveStatus === 'done' ? 100 : effectiveStatus === 'in-progress' ? 50 : 0}%` }} /></div>
                </div>
              </div>
            </div>
            <div className="sec lead-only">
              <div className="eyebrow mb8">Leader controls</div>
              <div className="row wrap g8">
                <button className="btn btn-p" onClick={() => setTaskEditMode(true)}><i className="ti ti-pencil" /> Edit task</button>
                <button className="btn" onClick={() => { setTaskLocked(!taskLocked); addToast(taskLocked ? 'Task unlocked' : 'Task locked. AI changes now need your approval.', 'ti-lock'); }}>
                  <i className={`ti ${taskLocked ? 'ti-lock-open' : 'ti-lock'}`} /> {taskLocked ? 'Unlock task' : 'Lock task'}
                </button>
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
              <input className="inp" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="mb16">
              <label className="fl">Description</label>
              <textarea className="inp" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            <div className="row g12 mb16">
              <div style={{ flex: 1 }}>
                <label className="fl">Priority</label>
                <select className="inp" style={{ width: '100%' }} value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="fl">Target date</label>
                <input className="inp" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
            </div>
            <div className="mb16">
              <label className="fl">Assigned members and hours</label>
              {assignedMembers.length > 0 ? assignedMembers.map((m, i) => (
                <div key={m.id} className="card flat mb8" style={{ padding: 12 }}>
                  <div className="row g12 wrap">
                    <span className={`av av${i % 4}`}>{m.avatar}</span>
                    <div style={{ flex: 1, minWidth: 90 }} className="b">{m.name}</div>
                    <label className="xs mut">Allocated <input className="inp" type="number" defaultValue={effectiveHours || 10} style={{ width: 68, padding: '6px 8px' }} /></label>
                    <label className="xs mut">Remaining <input className="inp" type="number" defaultValue={effectiveHours || 10} style={{ width: 68, padding: '6px 8px' }} /></label>
                    <button className="icb" title="Remove from task" onClick={() => {
                      const currentPlan = useTaskStore.getState().plan;
                      if (currentPlan && task) {
                        const updatedTasks = currentPlan.tasks.map(t =>
                          t.id === task.id ? { ...t, assignedTo: null } : t
                        );
                        useTaskStore.getState().setPlan({ ...currentPlan, tasks: updatedTasks });
                        addToast(`${m.name} removed from this task`, 'ti-user-minus');
                      }
                    }}><i className="ti ti-x" /></button>
                  </div>
                </div>
              )) : (
                <div className="card flat mb8" style={{ padding: 12 }}>
                  <div className="xs mut">No members assigned to this task.</div>
                </div>
              )}
              {members.filter(m => !assignedMembers.find(am => am.id === m.id)).length > 0 && (
                <select className="inp" defaultValue="" onChange={e => {
                  if (!e.target.value) return;
                  const currentPlan = useTaskStore.getState().plan;
                  if (currentPlan && task) {
                    const updatedTasks = currentPlan.tasks.map(t =>
                      t.id === task.id ? { ...t, assignedTo: e.target.value } : t
                    );
                    useTaskStore.getState().setPlan({ ...currentPlan, tasks: updatedTasks });
                    const member = members.find(m => m.id === e.target.value);
                    addToast(`${member?.name || 'Member'} added to this task`, 'ti-user-plus');
                  }
                  e.target.value = '';
                }}>
                  <option value="">+ Add member</option>
                  {members.filter(m => !assignedMembers.find(am => am.id === m.id)).map(m => (
                    <option key={m.id} value={m.id}>{m.name} &middot; {m.availability}h spare</option>
                  ))}
                </select>
              )}
              <div className="hint">Total: {effectiveHours || 10}h across {assignedMembers.length || 0} member{assignedMembers.length !== 1 ? 's' : ''}.</div>
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
            <button className="btn btn-p" onClick={() => {
              if (!selectedTaskId) { addToast('No task selected', 'ti-alert-circle'); return; }
              setPendingTaskEdit({
                taskId: selectedTaskId,
                title: editTitle,
                description: editDesc,
                priority: editPriority,
                targetDate: editDate,
                locked: taskLocked,
              });
              openOverlay('mdSave');
            }}>Save changes</button>
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
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReject = async () => {
    const taskId = useMockupStore2.getState().selectedTaskId;
    const reason = RJ_OPTS[selected];
    if (!taskId) { closeOverlay(); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectReason: explanation.trim() ? `${reason}: ${explanation.trim()}` : reason }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const updatedTask = await res.json();
      // Update the task in the store
      const plan = useTaskStore.getState().plan;
      if (plan) {
        const updatedTasks = plan.tasks.map(t =>
          t.id === taskId ? { ...t, ...updatedTask, invitationStatus: 'rejected' as const, rejectReason: reason } : t
        );
        useTaskStore.getState().setPlan({ ...plan, tasks: updatedTasks });
      }
      useMockupStore2.getState().setTaskAccepted(false);
      closeOverlay();
      addToast('Rejected. Your leader will see a reassignment suggestion.', 'ti-user-x');
    } catch (err) {
      addToast(`Failed: ${err instanceof Error ? err.message : String(err)}`, 'ti-alert-circle');
    } finally {
      setSubmitting(false);
    }
  };

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
        <textarea className="inp mt12" placeholder="Optional: add a short explanation" value={explanation} onChange={e => setExplanation(e.target.value)} />
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay} disabled={submitting}>Cancel</button>
        <button className="btn btn-d" onClick={handleReject} disabled={submitting}>
          {submitting ? 'Rejecting...' : 'Reject task'}
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
  const pendingTaskEdit = useMockupStore2(s => s.pendingTaskEdit);
  const setPendingTaskEdit = useMockupStore2(s => s.setPendingTaskEdit);

  const handleSave = () => {
    if (pendingTaskEdit) {
      const store = useTaskStore.getState();
      if (store.plan) {
        const updatedTasks = store.plan.tasks.map((t: Task) =>
          t.id === pendingTaskEdit.taskId
            ? {
                ...t,
                title: pendingTaskEdit.title,
                description: pendingTaskEdit.description,
                priority: pendingTaskEdit.priority as Task['priority'],
                updatedAt: new Date().toISOString(),
              }
            : t
        );
        store.setPlan({ ...store.plan, tasks: updatedTasks });
      }
      setPendingTaskEdit(null);
    }
    closeOverlay();
    setTaskEditMode(false);
    addToast('Task updated. Schedule recalculated.', 'ti-circle-check');
  };

  const hasChanges = pendingTaskEdit !== null;

  return (
    <>
      <div className="bd">
        <div className="h2 mb8">Save changes to this task?</div>
        <p className="sm mut">
          {hasChanges
            ? `Updating "${pendingTaskEdit!.title}" with new priority (${pendingTaskEdit!.priority}). The predicted completion will be recalculated based on the new estimates.`
            : 'No changes detected.'}
        </p>
      </div>
      <div className="ft">
        <button className="btn" onClick={() => { setPendingTaskEdit(null); closeOverlay(); }}>Cancel</button>
        <button className="btn btn-p" onClick={handleSave}>
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
  const selectedTaskId = useMockupStore2(s => s.selectedTaskId);

  const handleOverride = () => {
    if (selectedTaskId) {
      const store = useTaskStore.getState();
      if (store.plan) {
        const updatedTasks = store.plan.tasks.map((t: Task) =>
          t.id === selectedTaskId
            ? { ...t, status: 'done' as TaskStatus, updatedAt: new Date().toISOString() }
            : t
        );
        store.setPlan({ ...store.plan, tasks: updatedTasks });
      }
    }
    closeOverlay();
    addToast('Task overridden as done. Forecast recalculated.', 'ti-circle-check');
  };

  const task = useTaskStore.getState().plan?.tasks.find(t => t.id === selectedTaskId);
  const remainingHours = task?.estimatedHours || 0;

  return (
    <>
      <div className="bd">
        <div className="h2 mb8">Mark this task as done?</div>
        <p className="sm mut">
          {task ? `"${task.title}" still has ${remainingHours}h estimated. ` : ''}
          Overriding marks the whole task Done and recalculates the schedule. Predicted completion may move earlier.
        </p>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={handleOverride}>
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
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];

  const [projName, setProjName] = useState(project.name);
  const [deadline, setDeadline] = useState(() => {
    // Convert project.due to a date string (YYYY-MM-DD)
    // Today = Oct 11 2026; project due dates are relative
    const dueMap: Record<string, string> = {
      'srs': '2026-10-18',
      'web': '2026-11-08',
      'data': '2026-10-05',
    };
    return dueMap[project.id] || '2026-10-18';
  });
  const [time, setTime] = useState('17:00');

  const handleSave = () => {
    // In a full implementation, this would:
    // 1. Update the project name and deadline
    // 2. Trigger AI re-calculation (re-allocate tasks, re-schedule, re-assess risk)
    // For now, we update the toast to reflect what would happen
    closeOverlay();
    addToast(`Project "${projName}" updated. Schedule recalculated — AI re-allocated tasks and reassessed risks.`, 'ti-refresh');
  };

  return (
    <>
      <div className="bd">
        <div className="h2 mb12">Edit project</div>
        <div className="mb12">
          <label className="fl">Project name</label>
          <input className="inp" value={projName} onChange={e => setProjName(e.target.value)} />
        </div>
        <div className="row g12">
          <div style={{ flex: 1 }}>
            <label className="fl">Deadline</label>
            <input className="inp" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="fl">Time</label>
            <input className="inp" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="alert al-wn sm mt12">
          <i className="ti ti-alert-triangle" />
          <div>Changing the deadline triggers AI re-calculation: tasks are re-allocated to team members, the schedule is rebuilt, and risk status is reassessed.</div>
        </div>
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={handleSave}>
          <i className="ti ti-refresh" /> Save and recalculate
        </button>
      </div>
    </>
  );
}

// ===== Contribution Modal =====
function ContributionModal() {
  const closeOverlay = useMockupStore2(s => s.closeOverlay);
  const addToast = useMockupStore2(s => s.addToast);
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const taskOverrides = useMockupStore2(s => s.taskOverrides);
  const plan = useTaskStore(s => s.plan);
  const members = useTaskStore(s => s.members);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];

  // Use real plan data only if the pipeline ran for the SRS project (the analyzed one).
  // For other projects (web, data), fall back to PGP which has entries for ALL members.
  const useRealData = activeProjectId === 'srs' && plan && plan.tasks.length > 0 && members.length > 0;

  // Get project members from PGP (has entries for all projects: SRS, web, data)
  const projectMembers = PGP.filter(p => memberKeys.includes(p[0]));

  // Build per-member contribution from PGP data (or real plan for SRS)
  const memberContrib = useRealData
    ? members.map(m => {
        const memberTasks = plan?.tasks.filter(t => t.assignedTo === m.id || t.memberAssignments?.some(ma => ma.memberId === m.id)) ?? [];
        const done = memberTasks.filter(t => t.status === 'done').length;
        const total = memberTasks.length;
        const hoursDone = memberTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.estimatedHours || 0), 0);
        const hoursTotal = memberTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
        return {
          key: m.avatar, name: m.name, skills: m.skills.join(', '),
          done, total, hoursDone, hoursTotal,
          tasks: memberTasks.map(t => ({ title: t.title, totalHours: t.estimatedHours, remainingHours: t.estimatedHours, status: t.status })),
        };
      })
    : projectMembers.map(pgpm => {
        const tasks = pgpm[5].map(t => {
          // Match PGP task title to TK entry for override lookup
          const tkEntry = TK.find(tk => tk[1] === t[0]);
          const taskId = tkEntry ? String(tkEntry[0]) : t[0];
          const override = taskOverrides[taskId];
          const status = override?.status || t[3];
          const remainingHours = override?.hours ?? t[2];
          return {
            title: t[0],
            totalHours: t[1],
            remainingHours,
            status: status === 'done' ? 'done' : status === 'prog' ? 'in-progress' : 'todo',
          };
        });
        const done = tasks.filter(t => t.status === 'done').length;
        const total = tasks.length;
        const hoursDone = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.totalHours - t.remainingHours), 0);
        const hoursTotal = tasks.reduce((s, t) => s + t.totalHours, 0);
        return { key: pgpm[0], name: pgpm[1], skills: pgpm[2], done, total, hoursDone, hoursTotal, tasks };
      });

  const totalTasks = memberContrib.reduce((s, mc) => s + mc.total, 0);
  const doneTasks = memberContrib.reduce((s, mc) => s + mc.done, 0);
  const inProgressTasks = memberContrib.reduce((s, mc) => s + mc.tasks.filter((t: any) => t.status === 'in-progress').length, 0);
  const todoTasks = memberContrib.reduce((s, mc) => s + mc.tasks.filter((t: any) => t.status === 'todo').length, 0);
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  const handleGenerate = () => {
    setGenerating(true);
    // Simulate generation — in production this would call an API
    setTimeout(() => {
      const lines: string[] = [];
      lines.push('CONTRIBUTION REPORT');
      lines.push('==================');
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push(`Project: ${project.name}`);
      lines.push(`Members: ${memberContrib.length}`);
      lines.push(`Tasks: ${doneTasks}/${totalTasks} done, ${inProgressTasks} in-progress, ${todoTasks} todo`);
      lines.push('');
      lines.push('MEMBER CONTRIBUTIONS:');
      lines.push('--------------------');
      memberContrib.forEach(mc => {
        const pct = mc.total > 0 ? Math.round(mc.done / mc.total * 100) : 0;
        const hoursPct = mc.hoursTotal > 0 ? Math.round(mc.hoursDone / mc.hoursTotal * 100) : 0;
        lines.push(`\n${mc.name} (${mc.skills}):`);
        lines.push(`  Tasks: ${mc.done}/${mc.total} done (${pct}%)`);
        lines.push(`  Hours: ${mc.hoursDone}/${mc.hoursTotal}h completed (${hoursPct}%)`);
        mc.tasks.forEach((t: any) => {
          const icon = t.status === 'done' ? '[x]' : t.status === 'in-progress' ? '[~]' : '[ ]';
          lines.push(`  ${icon} ${t.title} (${t.totalHours}h)`);
        });
      });
      lines.push('');
      lines.push('SUMMARY:');
      const totalHoursDone = memberContrib.reduce((s, mc) => s + mc.hoursDone, 0);
      const totalHoursAll = memberContrib.reduce((s, mc) => s + mc.hoursTotal, 0);
      lines.push(`Total hours completed: ${totalHoursDone}/${totalHoursAll}h`);
      lines.push(`Overall completion: ${totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0}%`);
      if (!allDone) {
        lines.push(`\nNOTE: This report is INCOMPLETE. ${totalTasks - doneTasks} task(s) not yet done.`);
      }
      setReport(lines.join('\n'));
      setGenerating(false);
    }, 1500);
  };

  if (report) {
    return (
      <>
        <div className="bd">
          <div className="row mb12">
            <i className="ti ti-file-export" style={{ fontSize: 24, color: 'var(--blue)' }} />
            <div className="h2">Contribution report generated</div>
          </div>
          {!allDone && (
            <div className="alert al-wn sm mb12">
              <i className="ti ti-alert-triangle" />
              <div><b>Incomplete report.</b> {totalTasks - doneTasks} of {totalTasks} tasks are not done. This report reflects current progress only.</div>
            </div>
          )}
          <div className="card flat" style={{ padding: 14, maxHeight: 320, overflowY: 'auto' }}>
            <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0, color: 'var(--ink2)' }}>{report}</pre>
          </div>
        </div>
        <div className="ft">
          <button className="btn" onClick={closeOverlay}>Close</button>
          <button className="btn btn-p" onClick={() => {
            // Download as text file
            const blob = new Blob([report], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'contribution-report.txt';
            a.click();
            URL.revokeObjectURL(url);
            addToast('Contribution report downloaded', 'ti-download');
          }}><i className="ti ti-download" /> Download</button>
        </div>
      </>
    );
  }

  if (generating) {
    return (
      <div className="bd" style={{ textAlign: 'center', padding: 40 }}>
        <div className="spin" style={{ margin: '0 auto 12px' }} />
        <div className="sm mut">Generating contribution report...</div>
      </div>
    );
  }

  return (
    <>
      <div className="bd">
        <div className="row mb12">
          <i className="ti ti-file-export" style={{ fontSize: 24, color: 'var(--blue)' }} />
          <div className="h2">Generate contribution report</div>
        </div>
        <p className="sm mut mb12">
          Generates a per-member contribution breakdown based on task completion, hours logged, and current progress.
        </p>
        {/* Progress summary */}
        <div className="card flat mb12" style={{ padding: 14 }}>
          <div className="row mb8">
            <span className="xs mut">Task completion</span>
            <span className="sp" />
            <span className="xs"><b>{doneTasks}</b> / {totalTasks} done</span>
          </div>
          <div className="bar mb12"><i style={{ width: `${totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0}%` }} /></div>
          <div className="row g12 xs mut">
            <span><i className="ti ti-circle-check" style={{ color: '#18a67a' }} /> {doneTasks} done</span>
            <span><i className="ti ti-progress" style={{ color: 'var(--blue)' }} /> {inProgressTasks} in progress</span>
            <span><i className="ti ti-circle" style={{ color: 'var(--ink3)' }} /> {todoTasks} to do</span>
          </div>
        </div>
        {/* Warning if incomplete */}
        {!allDone && (
          <div className="alert al-wn sm mb12">
            <i className="ti ti-alert-triangle" />
            <div>
              <b>Contribution is not complete.</b>
              <div className="sm mut mt4">
                {totalTasks - doneTasks} task(s) are not yet done. The generated report will reflect current progress only — not all members&apos; contributions may be finalised.
              </div>
            </div>
          </div>
        )}
        {/* Member preview */}
        {memberContrib.length > 0 && (
          <div className="sec">
            <div className="eyebrow mb8">Members ({memberContrib.length})</div>
            {memberContrib.map((mc, i) => (
              <div key={mc.key} className="card flat mb8" style={{ padding: 10 }}>
                <div className="row g8">
                  <span className={`av ${AVC[mc.key] || 'av4'}`}>{mc.key}</span>
                  <div style={{ flex: 1 }}>
                    <div className="b sm">{mc.name}</div>
                    <div className="xs mut">{mc.done}/{mc.total} tasks &middot; {mc.hoursDone}/{mc.hoursTotal}h</div>
                  </div>
                  <span className={`badge ${mc.done === mc.total && mc.total > 0 ? 'b-ok' : mc.done > 0 ? 'b-wn' : ''}`}>
                    {mc.total > 0 ? Math.round(mc.done / mc.total * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="ft">
        <button className="btn" onClick={closeOverlay}>Cancel</button>
        <button className="btn btn-p" onClick={handleGenerate}>
          <i className="ti ti-file-export" /> {allDone ? 'Generate report' : 'Generate anyway'}
        </button>
      </div>
    </>
  );
}
