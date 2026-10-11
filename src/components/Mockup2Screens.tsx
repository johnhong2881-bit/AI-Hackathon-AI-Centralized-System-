'use client';

import { useEffect, useRef, useState, type Key as ReactKey } from 'react';import { useMockupStore2, type ScreenId } from '@/store/useMockupStore2';
import { useTaskStore } from '@/store/useTaskStore';
import {
  AVC, MEM, LVN, DN, TABS,
  STG, TK, PGP, GT, PROJECTS, PROJECT_MEMBERS, FLOW, memToMembers, RUBRIC_MARKS, RUBRIC_TOTAL, RUBRIC_SECTIONS,
  getProjectTK, getProjectGT,
  type TaskStatus, type PgpMember,
} from '@/lib/mock/mockPlanPilot2';
import { mockAssignment, mockMembers, mockProgress } from '@/lib/mock';
import { calculateDeadline, generateId } from '@/lib/utils/helpers';
import type {
  Assignment,
  Member,
  RubricResult,
  PlanResult,
  SkillMatchResult,
  CriticalPathResult,
  RiskAssessment,
} from '@/types/types';

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
  const projectTasks = getProjectTK(activeProjectId);
  const doneCount = projectTasks.filter(t => t[8] === 'done').length;
  const openTasks = projectTasks.length - doneCount;

  return (
    <div data-ws={tab}>
      <div className="row mb8">
        <button className="btn btn-g btn-sm" onClick={() => go('project')}><i className="ti ti-arrow-left" /> Home</button>
        <span className="crumb sm mut" style={{ marginLeft: 8 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => go('project')}><i className="ti ti-home" /> Projects</span> / {project.name}
        </span>
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
        <div className="row g8">
          <button className="btn btn-ai" onClick={() => openOverlay('mdContrib')}><i className="ti ti-file-export" /> Generate Contribution</button>
          <button className="btn btn-p" onClick={() => openOverlay('mdPlan')}><i className="ti ti-file-text" /> Export Project Plan</button>
          <button className="btn" onClick={() => openOverlay('mdEdit')}><i className="ti ti-pencil" /> Edit project</button>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(t => {
          const badge = t[0] === 'tasks' ? String(projectTasks.length) : t[2];
          return (
            <button key={t[0]} className={`tab ${t[0] === tab ? 'on' : ''}`} onClick={() => go(t[0] as ScreenId)}>
              {t[1]}{badge && <span className={`badge ${badge === '!' || badge === '1 gap' ? 'b-wn' : ''}`}>
                {badge === '!' ? <i className="ti ti-alert-triangle" /> : badge}
              </span>}
            </button>
          );
        })}
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
  const store = useTaskStore();
  const [name, setName] = useState(store.assignment?.title || 'Software Requirements Specification');
  const [description, setDescription] = useState(store.assignment?.description || 'Group SRS for a student library management system, plus a 10-minute presentation.');
  const [teamSize, setTeamSize] = useState(store.assignment?.teamSize || 4);
  const [uploadMode, setUploadMode] = useState<'aUp' | 'aTx'>('aUp');
  const [rubricInclude, setRubricInclude] = useState(true);
  const [assignmentText, setAssignmentText] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('2026-10-30');
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; pages: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rubricMode, setRubricMode] = useState<'rUp' | 'rTx'>('rUp');
  const [rubricFile, setRubricFile] = useState<{ name: string; size: number; pages: number; type: string } | null>(null);
  const [rubricUploading, setRubricUploading] = useState(false);
  const [rubricText, setRubricText] = useState('');
  const rubricInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, target: 'assignment' | 'rubric'): Promise<{ text: string; fileName: string; fileSize: number; pageCount: number; fileType: string } | null> => {
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

    if (!isPdf && !isDocx) {
      if (target === 'assignment') {
        setFileState('type');
      }
      addToast('Only PDF or DOCX files are supported', 'ti-alert-circle');
      return null;
    }

    if (file.size > 20 * 1024 * 1024) {
      addToast('File too large. Maximum 20 MB.', 'ti-alert-circle');
      return null;
    }

    if (target === 'assignment') {
      setUploading(true);
      setFileState('empty');
    } else {
      setRubricUploading(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          if (target === 'assignment') setFileState('parse');
        } else {
          if (target === 'assignment') setFileState('parse');
          addToast(data.error || 'Failed to read file', 'ti-alert-circle');
        }
        return null;
      }

      return {
        text: data.text,
        fileName: data.fileName,
        fileSize: data.fileSize,
        pageCount: data.pageCount,
        fileType: data.fileType,
      };
    } catch (err) {
      if (target === 'assignment') setFileState('parse');
      addToast(`Upload failed: ${err instanceof Error ? err.message : String(err)}`, 'ti-alert-circle');
      return null;
    } finally {
      if (target === 'assignment') setUploading(false);
      else setRubricUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const result = await uploadFile(file, 'assignment');
    if (result) {
      setUploadedFile({ name: result.fileName, size: result.fileSize, pages: result.pageCount, type: result.fileType });
      setFileState('ok');
      setDescription(result.text.slice(0, 2000));
      addToast(`File uploaded: ${result.fileName} (${result.pageCount} pages)`, result.fileType === 'pdf' ? 'ti-file-type-pdf' : 'ti-file-type-doc');
    }
  };

  const handleRubricUpload = async (file: File) => {
    const result = await uploadFile(file, 'rubric');
    if (result) {
      setRubricFile({ name: result.fileName, size: result.fileSize, pages: result.pageCount, type: result.fileType });
      setRubricText(result.text.slice(0, 3000));
      setRubricInclude(true);
      addToast(`Rubric uploaded: ${result.fileName} (${result.pageCount} pages)`, result.fileType === 'pdf' ? 'ti-file-type-pdf' : 'ti-file-type-doc');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleRubricInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleRubricUpload(file);
    e.target.value = '';
  };

  const handleContinue = () => {
    if (!name.trim()) { addToast('Enter a project name first', 'ti-alert-circle'); return; }
    const deadlineISO = new Date(`${deadlineDate}T${deadlineTime}:00+08:00`).toISOString();
    const assignment: Assignment = {
      id: store.assignment?.id || generateId('asg'),
      title: name,
      course: name,
      deliverables: ['Project report', 'Presentation'],
      deadline: deadlineISO,
      assignmentType: 'mixed',
      teamSize,
      description,
      rubricText: rubricText.trim()
        ? rubricText
        : (uploadMode === 'aTx' && assignmentText.trim()
          ? assignmentText
          : mockAssignment.rubricText),
    };
    store.setAssignment(assignment);

    // Initialize members from MEM mock if store is empty or size changed
    if (!store.members.length || store.members.length !== teamSize) {
      const converted = memToMembers();
      store.setMembers(converted.slice(0, teamSize));
    }

    go('team');
  };

  const adjustTeamSize = (delta: number) => {
    const next = Math.max(2, Math.min(10, teamSize + delta));
    setTeamSize(next);
  };

  return (
    <section className="scr page on" id="s-create" style={{ maxWidth: 900 }}>
      <div className="row mb8">
        <button className="btn btn-g btn-sm" onClick={() => go('project')}><i className="ti ti-arrow-left" /> Home</button>
      </div>
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
            <textarea className="inp" placeholder="Briefly describe your project..." value={description}
              onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="mb16">
            <label className="fl">Number of team members <span className="mut3">(required)</span></label>
            <div className="row g12 wrap">
              <div className="num"><button onClick={() => adjustTeamSize(-1)} aria-label="Fewer members">&#x2212;</button><input type="number" min={2} max={10} value={teamSize} readOnly /><button onClick={() => adjustTeamSize(1)} aria-label="More members">+</button></div>
              <span className="sm mut">members including you</span>
            </div>
            <div className="hint">You&rsquo;ll add each member&rsquo;s skills and availability in the next step. Teams of 2 to 10 are supported.</div>
          </div>
          <div className="mb16">
            <div className="row mb8">
              <label className="fl" style={{ margin: 0 }}>Assignment document</label>
              <span className="sp" />
              <div className="seg">
                <button className={uploadMode === 'aUp' ? 'on' : ''} onClick={() => setUploadMode('aUp')}>Upload File</button>
                <button className={uploadMode === 'aTx' ? 'on' : ''} onClick={() => setUploadMode('aTx')}>Paste text</button>
              </div>
            </div>
            {uploadMode === 'aUp' && (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={handleFileInputChange} />
                {fileState === 'ok' && uploadedFile && (
                  <div className="file">
                    <div className="fi"><i className={`ti ${uploadedFile.type === 'pdf' ? 'ti-file-type-pdf' : 'ti-file-type-doc'}`} /></div>
                    <div>
                      <div className="b">{uploadedFile.name}</div>
                      <div className="xs mut">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB · {uploadedFile.pages} pages · text extracted <i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /></div>
                    </div>
                    <span className="sp" />
                    <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}><i className="ti ti-refresh" /> Replace</button>
                    <button className="icb" onClick={() => { setFileState('empty'); setUploadedFile(null); }} title="Remove"><i className="ti ti-x" /></button>
                  </div>
                )}
                {fileState === 'ok' && !uploadedFile && (
                  <div className="file">
                    <div className="fi"><i className="ti ti-file-type-pdf" /></div>
                    <div>
                      <div className="b">SRS_Assignment_Brief.pdf</div>
                      <div className="xs mut">1.2 MB · 6 pages · text extracted <i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /></div>
                    </div>
                    <span className="sp" />
                    <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}><i className="ti ti-refresh" /> Replace</button>
                    <button className="icb" onClick={() => setFileState('empty')} title="Remove"><i className="ti ti-x" /></button>
                  </div>
                )}
                {fileState === 'empty' && (
                  <div className="dz"
                    style={{ cursor: uploading ? 'wait' : 'pointer' }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }}
                  >
                    <i className={`ti ${uploading ? 'ti-loader-2 spin' : 'ti-cloud-upload'}`} style={{ fontSize: 30, color: 'var(--blue)' }} />
                    <div className="b mt4">{uploading ? 'Extracting text...' : 'Drag and drop your assignment PDF or DOCX'}</div>
                    <div className="sm mut">{uploading ? 'Please wait' : <>or <span style={{ color: 'var(--blue)' }}>browse files</span> · PDF or DOCX up to 20 MB</>}</div>
                  </div>
                )}
                {(fileState === 'type' || fileState === 'parse') && (
                  <div className="dz bad">
                    <i className="ti ti-file-alert" style={{ fontSize: 28, color: 'var(--dg)' }} />
                    <div className="b mt4">{fileState === 'type' ? 'Only PDF or DOCX files are supported' : 'We couldn\u2019t read this file'}</div>
                    <div className="sm mut">{fileState === 'type' ? 'Please export your file as a PDF or DOCX, or paste the text instead.' : 'This file may be a scanned image with no text. Paste the text instead.'}</div>
                    <div className="row g8 mt12" style={{ justifyContent: 'center' }}>
                      <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>Choose another file</button>
                      <button className="btn btn-sm" onClick={() => setUploadMode('aTx')}>Paste text instead</button>
                    </div>
                  </div>
                )}
              </>
            )}
            {uploadMode === 'aTx' && <textarea className="inp" style={{ minHeight: 130 }} placeholder="Paste the assignment brief here" value={assignmentText} onChange={e => setAssignmentText(e.target.value)} />}
          </div>
          <div className="mb16">
            <label className="fl">Grading rubric</label>
            <label className="row g8" style={{ cursor: 'pointer' }}>
              <input type="checkbox" className="ck" checked={rubricInclude} onChange={e => setRubricInclude(e.target.checked)} />
              <span>My assignment document already includes the grading rubric.</span>
            </label>
            {rubricInclude ? (
              <div className="hint">Good. PlanPilot will find the rubric inside the document and ask you to review it.</div>
            ) : (
              <div className="mt12">
                <input ref={rubricInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={handleRubricInputChange} />
                <div className="seg mb12">
                  <button className={rubricMode === 'rUp' ? 'on' : ''} onClick={() => setRubricMode('rUp')}>Upload File</button>
                  <button className={rubricMode === 'rTx' ? 'on' : ''} onClick={() => setRubricMode('rTx')}>Paste Text</button>
                </div>
                {rubricMode === 'rUp' ? (
                  <>
                    {rubricFile ? (
                      <div className="file">
                        <div className="fi"><i className={`ti ${rubricFile.type === 'pdf' ? 'ti-file-type-pdf' : 'ti-file-type-doc'}`} /></div>
                        <div>
                          <div className="b">{rubricFile.name}</div>
                          <div className="xs mut">{(rubricFile.size / 1024 / 1024).toFixed(1)} MB · {rubricFile.pages} pages · text extracted <i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /></div>
                        </div>
                        <span className="sp" />
                        <button className="btn btn-sm" onClick={() => rubricInputRef.current?.click()}><i className="ti ti-refresh" /> Replace</button>
                        <button className="icb" onClick={() => { setRubricFile(null); setRubricText(''); }} title="Remove"><i className="ti ti-x" /></button>
                      </div>
                    ) : (
                      <div className="dz"
                        style={{ padding: 18, cursor: rubricUploading ? 'wait' : 'pointer' }}
                        onClick={() => !rubricUploading && rubricInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleRubricUpload(f); }}
                      >
                        <i className={`ti ${rubricUploading ? 'ti-loader-2 spin' : 'ti-upload'}`} style={{ fontSize: 22, color: 'var(--blue)' }} />
                        <div className="b sm">{rubricUploading ? 'Extracting text...' : 'Upload rubric PDF or DOCX'}</div>
                        <div className="xs mut mt4">{rubricUploading ? 'Please wait' : 'Click to browse or drag a file · PDF or DOCX up to 20 MB'}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <textarea className="inp" style={{ minHeight: 130 }} placeholder="Paste the grading rubric here" value={rubricText} onChange={e => setRubricText(e.target.value)} />
                    {rubricText.trim() && (
                      <div className="xs mut mt4"><i className="ti ti-circle-check" style={{ color: 'var(--ok)' }} /> {rubricText.trim().split(/\s+/).length} words captured</div>
                    )}
                  </>
                )}
                <div className="alert al-wn mt12 sm"><i className="ti ti-alert-triangle" /><div>No separate rubric provided. The AI will try to identify one in the assignment and flag it for your review.</div></div>
              </div>
            )}
          </div>
          <div className="rowt g16 wrap">
            <div style={{ flex: 1, minWidth: 160 }}><label className="fl">Deadline date</label><input className="inp" type="date" value={deadlineDate} min="2026-10-12" onChange={e => setDeadlineDate(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 130 }}><label className="fl">Time</label><input className="inp" type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 160 }}><label className="fl">Timezone</label><div className="inp mut sm" style={{ background: 'var(--soft)' }}><i className="ti ti-world" /> Asia/Kuala_Lumpur (GMT+8)</div></div>
          </div>
          <div className="alert al-blue mt12 sm"><i className="ti ti-calendar-event" /><div><b>Friday 30 October 2026 at 17:00</b> · 18 days from today. Past dates can&apos;t be selected.</div></div>
        </div>
      </div>
      <div className="row mt24">
        <button className="btn btn-lg" onClick={() => go('project')}><i className="ti ti-arrow-left" /> Back</button>
        <button className="btn btn-sm btn-g" onClick={() => { setName(''); setDescription(''); addToast('Form cleared', 'ti-eraser'); }}><i className="ti ti-eraser" /> Clear form</button>
        <span className="sp" />
        <button className="btn btn-p btn-lg" onClick={handleContinue}>Continue to Team Setup <i className="ti ti-arrow-right" /></button>
      </div>
    </section>
  );
}

// ===== Team Screen =====
function TeamScreen() {
  const go = useMockupStore2(s => s.go);
  const openOverlay = useMockupStore2(s => s.openOverlay);
  const setEditingMemberId = useMockupStore2(s => s.setEditingMemberId);
  const addToast = useMockupStore2(s => s.addToast);
  const members = useTaskStore(s => s.members);
  const setMembers = useTaskStore(s => s.setMembers);
  const assignment = useTaskStore(s => s.assignment);

  // Initialize members from MEM mock if store is empty (e.g. user navigated directly)
  useEffect(() => {
    if (!members.length) {
      setMembers(memToMembers());
    }
  }, [members.length, setMembers]);

  // Use store members count, fall back to MEM for display
  const memberCount = members.length || MEM.length;
  const displayMembers = MEM.slice(0, memberCount);
  const combinedHours = sum(displayMembers.map(m => sum(m.h)));

  const handleContinue = () => {
    // Ensure assignment is set (in case user navigated directly)
    if (!assignment) {
      const fallback: Assignment = {
        id: generateId('asg'),
        title: 'Software Requirements Specification',
        course: 'Software Requirements Specification',
        deliverables: ['Project report', 'Presentation'],
        deadline: '2026-10-30T17:00:00+08:00',
        assignmentType: 'mixed',
        teamSize: memberCount,
        description: 'Group SRS for a student library management system.',
        rubricText: mockAssignment.rubricText,
      };
      useTaskStore.getState().setAssignment(fallback);
    }
    go('review');
  };

  return (
    <section className="scr page on" id="s-team" style={{ maxWidth: 960 }}>
      <Stepper step={2} />
      <div className="card flat mb16" style={{ padding: '16px 22px' }}>
        <div className="row wrap" style={{ gap: 28 }}>
          <div><div className="xs mut">Members</div><div className="h2">{memberCount}</div></div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 28 }}><div className="xs mut">Combined weekly hours</div><div className="h2">{combinedHours} h</div></div>
        </div>
      </div>
      <div className="card">
        <div className="row mb8">
          <div><h2 className="h2">Team members <span className="badge b-ok">{memberCount} / {memberCount}</span></h2><p className="mut sm mt4">Strengths, weaknesses and weekly availability let the AI assign work fairly.</p></div>
          <span className="sp" />
          <button className="btn btn-p" onClick={() => { setEditingMemberId(null); openOverlay('drMember'); }}><i className="ti ti-plus" /> Add team member</button>
        </div>
        <div className="alert al-ok sm mb12"><i className="ti ti-circle-check" /><div>All {memberCount} members are added. Team size matches your project setup.</div></div>
        {displayMembers.map((m, i) => (
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
              <button className="icb" onClick={() => {
                const storeMember = useTaskStore.getState().members.find(sm => sm.name === m.n);
                setEditingMemberId(storeMember?.id || null);
                openOverlay('drMember');
              }} title="Edit"><i className="ti ti-pencil" /></button>
              <button className="icb" onClick={() => {
                const storeMembers = useTaskStore.getState().members;
                // Find store member matching this display member by name
                const storeMember = storeMembers.find(sm => sm.name === m.n);
                if (storeMember) {
                  useTaskStore.getState().setMembers(storeMembers.filter(sm => sm.id !== storeMember.id));
                  addToast(`${m.n} removed from the team`, 'ti-user-minus');
                } else {
                  addToast(`${m.n} removed from the team`, 'ti-user-minus');
                }
              }} title="Remove"><i className="ti ti-trash" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="row mt24">
        <button className="btn btn-lg" onClick={() => go('create')}><i className="ti ti-arrow-left" /> Back</button>
        <span className="sp" />
        <button className="btn btn-p btn-lg" onClick={handleContinue}>Continue to Review <i className="ti ti-arrow-right" /></button>
      </div>
    </section>
  );
}

// ===== Review Screen =====
function ReviewScreen() {
  const go = useMockupStore2(s => s.go);
  const assignment = useTaskStore(s => s.assignment);
  const members = useTaskStore(s => s.members);
  const fileState = useMockupStore2(s => s.fileState);

  // Fallback values if store is empty (user navigated directly)
  const projName = assignment?.title || 'Software Requirements Specification';
  const projDesc = assignment?.description || 'Group SRS for a student library management system, plus a 10-minute presentation.';
  const deadlineStr = assignment?.deadline
    ? new Date(assignment.deadline).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(assignment.deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'Fri 30 Oct 2026, 17:00';
  const teamSize = members.length || assignment?.teamSize || 4;
  const hasFile = fileState === 'ok' || !assignment?.rubricText || assignment.rubricText === mockAssignment.rubricText;
  const displayMembers = MEM.slice(0, teamSize);

  return (
    <section className="scr page on" id="s-review" style={{ maxWidth: 960 }}>
      <Stepper step={3} />
      <div className="col g16">
        <div className="card">
          <div className="row mb12"><h2 className="h3">Project summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('create')}>Edit</button></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Name</span><b>{projName}</b></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Description</span><span>{projDesc}</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Deadline</span><span><b>{deadlineStr}</b> (Asia/Kuala_Lumpur)</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Assignment</span><span>{hasFile ? <><i className="ti ti-file-type-pdf" style={{ color: 'var(--dg)' }} /> SRS_Assignment_Brief.pdf · 1.2 MB</> : <><i className="ti ti-file-text" style={{ color: 'var(--blue)' }} /> Pasted text</>}</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Team size</span><span><b>{teamSize}</b> members</span></div>
          <div className="rd"><span className="mut" style={{ width: 120 }}>Rubric source</span><span className="badge b-blue">Included in assignment</span></div>
        </div>
        <div className="card">
          <div className="row mb12"><h2 className="h3">Team summary</h2><span className="sp" /><button className="lnk sm" onClick={() => go('team')}>Edit</button></div>
          {displayMembers.map(m => (
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
  const addToast = useMockupStore2(s => s.addToast);
  const pipelineRan = useMockupStore2(s => s.pipelineRan);
  const setPipelineRan = useMockupStore2(s => s.setPipelineRan);
  const setPipelineRunning = useMockupStore2(s => s.setPipelineRunning);
  const setPipelineError = useMockupStore2(s => s.setPipelineError);
  const [active, setActive] = useState(0);
  // Real detail strings from API results (replaces hardcoded STG details)
  const [details, setDetails] = useState<Record<number, string>>({});
  const [stageStatus, setStageStatus] = useState<Record<number, string>>({});
  const apiStartedRef = useRef(false);

  // API helper
  const apiCall = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    if (apiStartedRef.current) return;
    apiStartedRef.current = true;

    // If pipeline already ran, skip to overview
    if (pipelineRan) {
      go('overview');
      return;
    }

    const store = useTaskStore.getState();

    const runPipeline = async () => {
      setPipelineRunning(true);
      setPipelineError(null);

      // Use real assignment + members from the store (set by CreateScreen/TeamScreen)
      // Falls back to mock data if user navigated directly to analysis
      const assignment: Assignment = store.assignment || mockAssignment;
      const members: Member[] = store.members.length > 0 ? store.members : mockMembers;
      const deadline = calculateDeadline(assignment.deadline, assignment.id);

      store.setAssignment(assignment);
      store.setMembers(members);
      store.setDeadline(deadline);

      // Helper to advance stages with a small delay for visual effect
      const advance = (toStage: number, detailMap?: Record<number, string>, statusMap?: Record<number, string>) => {
        return new Promise<void>(resolve => {
          setActive(prev => {
            const next = toStage;
            if (detailMap) setDetails(prev => ({ ...prev, ...detailMap }));
            if (statusMap) setStageStatus(prev => ({ ...prev, ...statusMap }));
            return next;
          });
          setTimeout(resolve, 500);
        });
      };

      try {
        // === Step 1: Rubric Agent (stages 0-2) ===
        await advance(1);
        const rubric: RubricResult = await apiCall('/api/pipeline/rubric', { assignment });
        store.setRubric(rubric);
        const mandatoryCount = rubric.items.filter(i => i.mandatory).length;
        const optionalCount = rubric.items.length - mandatoryCount;
        await advance(3, {
          0: `${rubric.items.length} criteria \u00b7 ${rubric.totalMarks} marks`,
          1: `${rubric.items.length} criteria found \u00b7 ${rubric.totalMarks} total marks`,
          2: `${mandatoryCount} mandatory \u00b7 ${optionalCount} optional`,
        });

        // === Step 2: Task Agent (stages 3-4) ===
        await advance(4);
        const plan: PlanResult = await apiCall('/api/pipeline/tasks', { assignment, rubric });
        store.setPlan(plan);
        await advance(5, {
          3: `${plan.tasks.length} tasks created`,
          4: `${plan.totalEstimatedHours} estimated hours`,
        });

        // === Step 3: Skill Agent (stage 5) ===
        await advance(5);
        const skillMatch: SkillMatchResult = await apiCall('/api/pipeline/skills', { tasks: plan.tasks, members });
        store.setSkillMatch(skillMatch);
        const matchedCount = skillMatch.assignments.length;
        const unmatchedCount = skillMatch.unmatchedTaskIds.length;
        await advance(6, {
          5: `${matchedCount} of ${plan.tasks.length} tasks match a member skill${unmatchedCount > 0 ? ` \u00b7 ${unmatchedCount} unmatched` : ''}`,
        });

        // === Step 4: Critical Path (stage 6) ===
        await advance(7);
        const criticalPath: CriticalPathResult = await apiCall('/api/pipeline/critical-path', { tasks: plan.tasks, members, deadline });
        store.setCriticalPath(criticalPath);
        const delayText = criticalPath.delayDays > 0 ? ` \u00b7 ${criticalPath.delayDays} days late` : ' \u00b7 on track';
        await advance(8, {
          6: `Critical path found \u00b7 predicted Day ${criticalPath.predictedCompletionDay}${delayText}`,
        });

        // === Step 5: Risk Agent (stages 7-8) ===
        await advance(8);
        const schedulerFacts = {
          riskStatus: criticalPath.riskStatus,
          predictedCompletionDay: criticalPath.predictedCompletionDay,
          deadlineDay: criticalPath.deadlineDay,
          delayDays: criticalPath.delayDays,
          delayedTaskIds: criticalPath.delayedTaskIds,
          criticalPath: criticalPath.criticalPath,
          memberLoads: criticalPath.memberLoads,
        };
        const riskAssessment: RiskAssessment = await apiCall('/api/pipeline/risk', {
          tasks: plan.tasks,
          members,
          deadline,
          progress: mockProgress,
          schedulerFacts,
        });
        store.setRiskAssessment(riskAssessment);
        store.setProgress(mockProgress);

        const riskStatusStr = criticalPath.delayDays > 0 ? 'w' : undefined;
        const allDone = STG.length;
        await advance(allDone, {
          7: `Predicted finish Day ${criticalPath.predictedCompletionDay}${delayText}`,
          8: 'No cycles found',
        }, riskStatusStr ? { 7: 'w' } : {});

        setPipelineRan(true);
        setPipelineRunning(false);

        const summary = `${plan.tasks.length} tasks, ${plan.totalEstimatedHours} hours`;
        addToast(`Plan ready: ${summary}`, 'ti-circle-check');
        setTimeout(() => {
          if (useMockupStore2.getState().screen === 'analysis') {
            go('overview');
          }
        }, 1000);
      } catch (err) {
        setPipelineRunning(false);
        setPipelineError(err instanceof Error ? err.message : String(err));
        addToast(`Analysis error: ${err instanceof Error ? err.message : String(err)}`, 'ti-alert-circle');
      }
    };

    runPipeline();
    // No cleanup — apiStartedRef prevents double-execution in React Strict Mode
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ic: Record<string, string> = { dn: 'ti-check', wn: 'ti-alert-triangle', run: 'ti-loader-2 spin', pend: 'ti-dots' };
  const cl: Record<string, string> = { dn: 'dn', wn: 'wn', run: 'run', pend: 'pend' };
  const stageStatusLabels: Record<string, string> = { dn: 'Done', wn: 'Needs attention', run: 'Running', pend: 'Pending' };

  const pipelineError = useMockupStore2(s => s.pipelineError);

  return (
    <section className="scr page on" id="s-analysis" style={{ maxWidth: 720 }}>
      <div className="mb16">
        <div className="eyebrow">AI planning</div>
        <h1 className="h1 mt4">Building your project plan</h1>
        <p className="mut mt4">We&apos;ll open your project as soon as it&apos;s ready.</p>
      </div>
      <div className="card">
        <div className="row mb8">
          <div className="h3">AI activity</div>
          <span className="sp" />
          <span className="badge b-blue">{active >= STG.length ? 'Complete' : `Step ${active + 1} of ${STG.length}`}</span>
        </div>
        {STG.map((s, i) => {
          const rawStatus = i < active ? (stageStatus[i] === 'w' || s[3] === 'w' ? 'wn' : 'dn') : i === active ? 'run' : 'pend';
          return (
            <div key={i} className={`stg ${cl[rawStatus]}`}>
              <div className="dot"><i className={`ti ${ic[rawStatus]}`} /></div>
              <div>
                <div className="b">{s[0]}</div>
                <div className="xs mut">{s[1]}</div>
                {i < active && (details[i] || s[2]) && (
                  <div className="xs mt4" style={{ color: stageStatus[i] === 'w' || s[3] === 'w' ? 'var(--wn)' : 'var(--ink2)' }}>
                    {details[i] || s[2]}
                  </div>
                )}
              </div>
              <div className="xs mut3">{stageStatusLabels[rawStatus]}</div>
            </div>
          );
        })}
      </div>
      {pipelineError && (
        <div className="alert al-dg mt12">
          <i className="ti ti-alert-triangle" />
          <div>
            <b>Analysis error</b>
            <div className="sm mut">{pipelineError}</div>
          </div>
        </div>
      )}
      <div className="row mt16 wrap">
        <span className="demo"><i className="ti ti-flask" /> {pipelineRan ? 'AI analysis complete' : 'Running AI analysis...'}</span>
        <span className="sp" />
        <button className="btn btn-g btn-sm" onClick={() => go('overview')}>Skip to my project</button>
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
  const pipelineRan = useMockupStore2(s => s.pipelineRan);

  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const isCompleted = project.statusLabel === 'Completed';

  // Read real data from task store
  const criticalPath = useTaskStore(s => s.criticalPath);
  const plan = useTaskStore(s => s.plan);
  const members = useTaskStore(s => s.members);
  const taskOverrides = useMockupStore2(s => s.taskOverrides); // re-renders when progress changes

  const pgStats = (m: PgpMember) => {
    const al = sum(m[5].map(t => t[1]));
    const dn = sum(m[5].map(t => t[1] - t[2]));
    return { al, dn, left: al - dn, pc: al ? Math.round(dn / al * 100) : 0, nd: m[5].filter(t => t[3] === 'done').length };
  };

  // Build progress rows: use real scheduler data if pipeline ran for THIS project, otherwise fall back to project-filtered PGP
  // (pipelineRan is global — without the projectId check, SRS scheduler data leaks into web/data projects)
  const useRealData = activeProjectId === 'srs' && pipelineRan && criticalPath && members.length > 0;

  // Convert real member loads to PGP-compatible format for the existing UI
  const realPGP: PgpMember[] = useRealData && criticalPath ? criticalPath.memberLoads.map((ml, idx) => {
    const member = members.find(m => m.id === ml.memberId);
    const name = member?.name || ml.memberName;
    const skillsStr = member ? member.skills.join(', ') : '';
    // Find tasks assigned to this member from plan
    const memberTasks = plan?.tasks.filter(t => t.assignedTo === ml.memberId) ?? [];
    const pgTasks: [string, number, number, TaskStatus, string?][] = memberTasks.map(t => [
      t.title,
      t.estimatedHours,
      t.estimatedHours, // remaining = full (new plan, no progress yet)
      t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'prog' : 'todo' as TaskStatus,
      t.priority === 'critical' || t.priority === 'high' ? 'p' : undefined,
    ]);
    const totalHours = ml.remainingWorkHours;
    return [
      member?.avatar || `M${idx}`,
      name,
      skillsStr,
      totalHours,
      ml.isOverloaded ? 1 : 0,
      pgTasks.length > 0 ? pgTasks : [['No tasks assigned', 0, 0, 'todo' as TaskStatus]],
    ] as PgpMember;
  }) : PGP.filter(m => memberKeys.includes(m[0]));

  // Apply task overrides to mock PGP data (when pipeline hasn't run)
  const mockPGP = PGP.filter(m => memberKeys.includes(m[0])).map(m => {
    const modifiedTasks = m[5].map(t => {
      const tkEntry = TK.find(tk => tk[1] === t[0]);
      const taskId = tkEntry ? String(tkEntry[0]) : t[0];
      const override = taskOverrides[taskId];
      if (!override) return t;
      const newStatus = override.status === 'done' ? 'done' : override.status === 'in-progress' ? 'prog' : 'todo';
      const newRemaining = override.hours ?? (override.status === 'done' ? 0 : override.status === 'in-progress' ? Math.floor(t[1] / 2) : t[1]);
      return [t[0], t[1], newRemaining, newStatus as TaskStatus, t[4]] as typeof t;
    });
    return [...m.slice(0, 5), modifiedTasks] as PgpMember;
  });

  let rows = (useRealData ? realPGP : mockPGP).map((m, i) => ({ m, i, s: pgStats(m) }));
  if (progressSort === 'low') rows.sort((a, b) => a.s.pc - b.s.pc || a.i - b.i);

  const memberCount = rows.length;

  const tt: Record<string, string[]> = {};
  rows.forEach(r => r.m[5].forEach(t => { (tt[t[0]] = tt[t[0]] || []).push(t[3]); }));
  const titles = Object.keys(tt);
  const doneT = titles.filter(k => tt[k].every(x => x === 'done')).length;
  const AL = sum(rows.map(r => r.s.al));
  const DN2 = sum(rows.map(r => r.s.dn));

  // Use project's own status/daysLeft for the deadline display
  // (scheduler criticalPath may have unrealistic day values for mockup)
  const isAtRisk = project.status === 'dg';
  const isOnTrack = project.status === 'ok' && !isCompleted;
  const daysLeft = project.daysLeft ?? 0;
  const statusLabel = isCompleted ? 'Completed' : isAtRisk ? 'At Risk' : 'On Track';
  const statusClass = isAtRisk ? 's-dg' : 's-ok';

  // Calculate timeline positions for the deadline line
  // At Risk: predicted completion is ~3 days after deadline
  // On Track: predicted completion is before deadline
  const totalDays = isCompleted ? 30 : Math.max(daysLeft + (isAtRisk ? 3 : 0), 14);
  const todayPct = isCompleted ? 100 : (1 - daysLeft / totalDays) * 100;
  const deadlinePct = isCompleted ? 100 : (daysLeft / totalDays) * 100 + todayPct;
  const predictedPct = isAtRisk ? deadlinePct + (3 / totalDays) * 100 : deadlinePct - (2 / totalDays) * 100;
  const clampedDeadlinePct = Math.min(deadlinePct, 95);
  const clampedPredictedPct = Math.min(predictedPct, 98);

  // ===== Rubric marks by section =====
  const getEffectiveTkStatus = (tkId: number): TaskStatus => {
    const override = taskOverrides[String(tkId)];
    if (override) return override.status === 'done' ? 'done' : override.status === 'in-progress' ? 'prog' : 'todo';
    const task = TK.find(t => t[0] === tkId);
    return task ? task[8] : 'todo';
  };

  const sectionData = RUBRIC_SECTIONS.map(([name, icon, taskIds, desc]) => {
    let earned = 0, potential = 0, total = 0;
    const taskDetails = taskIds.map(id => {
      const tk = TK.find(t => t[0] === id);
      const status = getEffectiveTkStatus(id);
      const mk = RUBRIC_MARKS[id] ?? 0;
      total += mk;
      if (status === 'done') { earned += mk; potential += mk; }
      else if (status === 'prog') { potential += mk; }
      return { id, title: tk?.[1] || `Task ${id}`, hours: tk?.[4] || 0, assignees: tk?.[5] || [], status, marks: mk };
    });
    return { name, icon, desc, taskIds, earned, potential, total, tasks: taskDetails };
  });

  const marksEarned = sectionData.reduce((s, sec) => s + sec.earned, 0);
  const marksPotential = sectionData.reduce((s, sec) => s + sec.potential, 0);
  const marksRemaining = RUBRIC_TOTAL - marksPotential;
  const marksEarnedPct = Math.round(marksEarned / RUBRIC_TOTAL * 100);
  const marksPotentialPct = Math.round(marksPotential / RUBRIC_TOTAL * 100);

  return (
    <section className="scr page wide on" id="s-overview">
      <WorkspaceHeader tab="overview" />
      {!isCompleted && (
        <div className="card mb16">
          <div className="row mb12 wrap">
            <div><div className="h3">Predicted completion</div><div className="sm mut">Calculated from task dependencies and each member&apos;s weekly availability.</div></div>
            <span className="sp" />
            <span className={`stat ${statusClass}`}>{statusLabel}{isAtRisk ? ` \u00b7 ${daysLeft} days left` : isOnTrack ? ` \u00b7 ${daysLeft} days left` : ''}</span>
          </div>
          <div className="dline">
            <div className="ax" />
            <div className={isAtRisk ? 'lt' : 'ok'} style={{ left: 0, width: `${Math.min(todayPct, 100)}%` }} />
            {isAtRisk && <div className="lt" style={{ left: `${todayPct}%`, width: `${Math.min(deadlinePct - todayPct + (3 / totalDays) * 100, 100 - todayPct)}%` }} />}
            <div className="mk" style={{ left: 0, top: 0, color: 'var(--ink2)' }}>Today<br />Sun 11 Oct</div>
            <div className="mk below" style={{ left: `${clampedDeadlinePct}%`, color: 'var(--blue6)' }}><span><b>Deadline</b></span><span>{project.due}</span></div>
            <div className="mk" style={{ left: `${clampedPredictedPct}%`, top: 0, color: isAtRisk ? 'var(--dg)' : 'var(--ok)' }}><b>{isAtRisk ? 'Predicted' : 'Done'}</b><br />{isAtRisk ? `${daysLeft + 3} days` : project.due}</div>
            <div className="pt" style={{ left: `${Math.min(predictedPct, 98)}%`, color: isAtRisk ? 'var(--dg)' : 'var(--ok)' }} />
          </div>
          {isAtRisk ? (
            <div className="alert al-dg mt16">
              <i className="ti ti-alert-triangle" />
              <div className="row wrap" style={{ flex: 1 }}>
                <div><b>4 tasks at risk of missing the deadline.</b><div className="sm mut">Only {daysLeft} days left. Open Project Rescue to prioritize tasks and maximize your marks.</div></div>
                <span className="sp" />
                <button className="btn btn-ai btn-sm" onClick={() => go('defender')}><i className="ti ti-trophy" /> Open Project Rescue</button>
              </div>
            </div>
          ) : (
            <div className="alert al-ok mt16">
              <i className="ti ti-circle-check" />
              <div className="row wrap" style={{ flex: 1 }}>
                <div><b>On track.</b><div className="sm mut">{daysLeft} days remaining. All tasks are predicted to finish before the deadline.</div></div>
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
              <div><b>Project completed on time.</b><div className="sm mut">Delivered on {project.due}. All {getProjectTK(activeProjectId).length} tasks done.</div></div>
            </div>
          </div>
        </div>
      )}
      {/* Estimated marks by rubric section */}
      <div className="card mb16">
        <div className="row wrap g16 mb12">
          <div>
            <div className="h3">Estimated marks <span className="badge b-blue mono">{marksEarned} / {RUBRIC_TOTAL}</span></div>
            <div className="sm mut mt4">Rubric marks broken down by section — track where your team is scoring.</div>
          </div>
          <span className="sp" />
          <div className="row g12">
            <span className="badge b-ok mono"><i className="ti ti-circle-check" /> {marksEarned} earned</span>
            <span className="badge b-wn mono"><i className="ti ti-progress" /> {marksPotential - marksEarned} in progress</span>
            <span className="badge mono"><i className="ti ti-circle" /> {marksRemaining} not started</span>
          </div>
        </div>
        {/* Stacked progress bar */}
        <div style={{ height: 20, background: 'var(--line)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${marksEarnedPct}%`, background: 'var(--blue)', transition: 'width .5s' }} />
          <div style={{ width: `${marksPotentialPct - marksEarnedPct}%`, background: 'var(--blue)', opacity: 0.35, transition: 'width .5s' }} />
        </div>
        <div className="row g16 xs mut mt8">
          <span><i className="ti ti-square-filled" style={{ color: 'var(--blue)' }} /> Earned ({marksEarnedPct}%)</span>
          <span><i className="ti ti-square-filled" style={{ color: 'var(--blue)', opacity: 0.35 }} /> In progress ({marksPotentialPct - marksEarnedPct}%)</span>
          <span><i className="ti ti-square-filled" style={{ color: 'var(--line2)' }} /> Not started ({100 - marksPotentialPct}%)</span>
        </div>

        {/* Section breakdown */}
        <div className="col mt16" style={{ gap: 12 }}>
          {sectionData.map((sec, si) => {
            const secEarnedPct = sec.total > 0 ? Math.round(sec.earned / sec.total * 100) : 0;
            const secPotentialPct = sec.total > 0 ? Math.round(sec.potential / sec.total * 100) : 0;
            const secAllDone = sec.earned === sec.total && sec.total > 0;
            const secInProgress = sec.potential > sec.earned;

            return (
              <div key={si} className="card flat" style={{ padding: 14, borderColor: 'var(--line)' }}>
                <div className="row mb8">
                  <div className="row g10">
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--blue1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      <i className={`ti ${sec.icon}`} />
                    </div>
                    <div>
                      <div className="b sm">{sec.name}</div>
                      <div className="xs mut" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{sec.desc}</div>
                    </div>
                  </div>
                  <span className="sp" />
                  <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
                    <span style={{ color: secAllDone ? 'var(--ok)' : 'var(--ink)' }}>{sec.earned}</span>
                    <span className="mut" style={{ fontWeight: 400 }}> / {sec.total} mk</span>
                  </span>
                  {secAllDone && <span className="badge b-ok"><i className="ti ti-circle-check" /> Done</span>}
                  {!secAllDone && secInProgress && <span className="badge b-wn"><i className="ti ti-progress" /> In progress</span>}
                  {!secAllDone && !secInProgress && <span className="badge"><i className="ti ti-circle" /> Not started</span>}
                </div>
                {/* Mini progress bar */}
                <div style={{ height: 8, background: 'var(--line)', borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                  <div style={{ width: `${secEarnedPct}%`, background: 'var(--blue)', transition: 'width .5s' }} />
                  <div style={{ width: `${secPotentialPct - secEarnedPct}%`, background: 'var(--blue)', opacity: 0.35, transition: 'width .5s' }} />
                </div>
                {/* Task chips */}
                <div className="row wrap g8">
                  {sec.tasks.map(t => {
                    const stColor = t.status === 'done' ? 'var(--ok)' : t.status === 'prog' ? 'var(--blue)' : 'var(--ink3)';
                    const stIcon = t.status === 'done' ? 'ti-circle-check' : t.status === 'prog' ? 'ti-progress' : 'ti-circle';
                    return (
                      <div key={t.id} className="row g6" style={{
                        padding: '4px 10px', borderRadius: 8, background: 'var(--soft)', border: '1px solid var(--line)',
                        cursor: 'pointer', ...(t.status === 'done' ? { opacity: 0.7 } : {}),
                      }} onClick={() => {
                        const realTask = useRealData && plan ? plan.tasks.find(pt => parseInt(pt.id.replace(/\D/g, '')) === t.id) : null;
                        useMockupStore2.getState().setSelectedTaskId(realTask?.id || String(t.id));
                        openOverlay('drTask');
                      }}>
                        <i className={`ti ${stIcon}`} style={{ color: stColor, fontSize: 13 }} />
                        <span className="xs" style={{ fontWeight: 500, ...(t.status === 'done' ? { textDecoration: 'line-through', color: 'var(--ink3)' } : {}) }}>{t.title}</span>
                        <span className="mono xs b" style={{ color: stColor }}>{t.marks}mk</span>
                        <span className="xs mut3">{t.hours}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* At-risk tip */}
        {isAtRisk && marksPotential < RUBRIC_TOTAL && (
          <div className="alert al-wn sm mt12">
            <i className="ti ti-bulb" />
            <div className="row wrap" style={{ flex: 1 }}>
              <div>
                <b>{marksPotential} of {RUBRIC_TOTAL} marks achievable right now.</b>
                <div className="sm mut mt4">{marksRemaining} marks are in unfinished tasks. Open Project Rescue to prioritize by effort-to-score ratio.</div>
              </div>
              <span className="sp" />
              <button className="btn btn-ai btn-sm" onClick={() => go('defender')}><i className="ti ti-trophy" /> Maximize marks</button>
            </div>
          </div>
        )}
      </div>
      <div className="card">
        <div className="row wrap g16 mb12">
          <div><div className="h3">Team progress <span className="badge">{rows.length} members</span></div><div className="sm mut">Select a member to see their tasks.</div></div>
          <span className="sp" />
          <div className="row g12 wrap">
            <div className="seg">
              <button className={progressSort === 'def' ? 'on' : ''} onClick={() => setProgressSort('def')}>Default order</button>
              <button className={progressSort === 'low' ? 'on' : ''} onClick={() => setProgressSort('low')}>Lowest progress first</button>
            </div>
            <button className="btn btn-sm" onClick={() => {
              const all = expandedProgress.size < rows.length;
              useMockupStore2.setState({ expandedProgress: all ? new Set(rows.map((_, i) => i)) : new Set() });
            }}>Expand all</button>
          </div>
        </div>
        <div className="mb12">
          <div className="row xs mut mb4">
            <span><b style={{ color: 'var(--ink)' }}>{doneT} / {titles.length}</b> tasks done</span>
            <span className="sp" />
            <span><b style={{ color: 'var(--ink)' }}>{DN2}</b> of {AL} h</span>
          </div>
          <div className="bar"><i style={{ width: Math.round(AL ? DN2 / AL * 100 : 0) + '%' }} /></div>
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
                      <div key={j} className="row g12" onClick={() => {
                        const realTask = useRealData && plan ? plan.tasks.find(pt => pt.title === t[0]) : null;
                        useMockupStore2.getState().setSelectedTaskId(realTask?.id || String(t[0]));
                        openOverlay('drTask');
                      }} style={{ padding: '8px 0', cursor: 'pointer' }}>
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
  const go = useMockupStore2(s => s.go);
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const pipelineRan = useMockupStore2(s => s.pipelineRan);
  const plan = useTaskStore(s => s.plan);
  const members = useTaskStore(s => s.members);
  const taskOverrides = useMockupStore2(s => s.taskOverrides); // re-renders when progress changes

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');

  // Only use real plan data if the pipeline ran for THIS project
  // (pipelineRan is global — without this check, SRS tasks leak into web/data projects)
  const useRealData = activeProjectId === 'srs' && pipelineRan && plan && plan.tasks.length > 0;

  // Convert real Task[] to TK-compatible tuple format for the existing UI
  const allRealTK: typeof TK = useRealData && plan ? plan.tasks.map((t) => {
    const priorityChar = t.priority === 'critical' || t.priority === 'high' ? 'H' : t.priority === 'medium' ? 'M' : 'L';
    const statusChar = t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'prog' : 'todo';
    const assignees = t.assignedTo ? [t.assignedTo.split('-').pop()?.slice(0, 2).toUpperCase() || '??'] : [];
    return [
      parseInt(t.id.replace(/\D/g, '')) || 0,
      t.title,
      t.description,
      priorityChar,
      t.estimatedHours,
      assignees,
      t.dependencies.length,
      `Day ${t.order}`,
      statusChar as TaskStatus,
      t.priority === 'critical' ? 'late' : undefined,
    ] as typeof TK[number];
  }) : getProjectTK(activeProjectId).map(t => {
    // Apply overrides to mock tasks
    const taskId = String(t[0]);
    const override = taskOverrides[taskId];
    if (!override) return t;
    const newStatus = override.status === 'done' ? 'done' : override.status === 'in-progress' ? 'prog' : 'todo';
    const newHours = override.hours ?? t[4];
    return [t[0], t[1], t[2], t[3], newHours, t[5], t[6], t[7], newStatus as TaskStatus, t[9]] as typeof t;
  });

  // Apply filters
  const realTK = allRealTK.filter(t => {
    if (searchQuery && !t[1].toLowerCase().includes(searchQuery.toLowerCase()) && !t[2].toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all') {
      const statusMap: Record<string, string> = { todo: 'todo', prog: 'prog', done: 'done' };
      if (statusMap[statusFilter] !== t[8]) return false;
    }
    if (priorityFilter !== 'all') {
      const pMap: Record<string, string> = { high: 'H', medium: 'M', low: 'L' };
      if (pMap[priorityFilter] !== t[3]) return false;
    }
    if (memberFilter !== 'all') {
      const memberAbbr = memberFilter.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
      if (!t[5].includes(memberAbbr)) return false;
    }
    return true;
  });

  return (
    <section className="scr page wide on" id="s-tasks">
      <WorkspaceHeader tab="tasks" />
      <div className="row wrap g8 mb12">
        <div className="inp row g8" style={{ width: 230, padding: '6px 12px' }}><i className="ti ti-search mut3" /><input style={{ border: 0, outline: 0, width: '100%', background: 'none' }} placeholder="Search tasks" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
        <select className="inp" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="todo">To do</option><option value="prog">In progress</option><option value="done">Done</option></select>
        <select className="inp" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select className="inp" value={memberFilter} onChange={e => setMemberFilter(e.target.value)}><option value="all">All members</option>{members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select>
        <span className="sp" />
        <div className="seg">
          <button className={taskView === 'list' ? 'on' : ''} onClick={() => setTaskView('list')}>List</button>
          <button className={taskView === 'board' ? 'on' : ''} onClick={() => setTaskView('board')}>Board</button>
        </div>
      </div>
      {realTK.length === 0 && searchQuery && (
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div className="mut"><i className="ti ti-search" /> No tasks match "{searchQuery}". Try clearing filters.</div>
        </div>
      )}
      {taskView === 'list' && (
        <div className="card pad0" style={{ overflow: 'hidden' }}>
          <div className="tk hd"><span /><span>Task</span><span>Priority</span><span>Hours</span><span>Marks</span><span>Assigned</span><span>Deps</span><span>Target</span></div>
          {realTK.map(t => (
            <div key={t[0]} className="tk" onClick={() => {
              const realTask = useRealData && plan ? plan.tasks.find(pt => parseInt(pt.id.replace(/\D/g, '')) === t[0]) : null;
              useMockupStore2.getState().setSelectedTaskId(realTask?.id || String(t[0]));
              openOverlay('drTask');
            }}>
              <span>{SI[t[8]]}</span>
              <div style={{ minWidth: 0 }}><div className="b" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[1]}</div><div className="xs mut" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t[2]}</div></div>
              {pri(t[3])}
              <span className="mono">{t[4]} h</span>
              <span className="mono"><b>{RUBRIC_MARKS[t[0]] ?? 0}</b> mk</span>
              <span className="stk">{t[5].map((k, ki) => av(k, 's', ki))}</span>
              <span className="xs mut"><i className="ti ti-link" /> {t[6]}</span>
              <span className={`xs ${t[9] ? '' : 'mut'}`} style={t[9] ? { color: 'var(--dg)', fontWeight: 600 } : {}}>{t[7]}{t[9] && <i className="ti ti-alert-triangle" />}</span>
            </div>
          ))}
          {realTK.length === 0 && (
            <div className="tk" style={{ color: 'var(--wn)', cursor: 'default' }}>
              <span><i className="ti ti-user-question" /></span>
              <div className="sm">No tasks yet. Run AI analysis to generate tasks.</div>
            </div>
          )}
        </div>
      )}
      {taskView === 'board' && (
        <div className="kb">
          {([
            ['To do', 'todo'],
            ['In progress', 'prog'],
            ['Done', 'done'],
          ] as [string, TaskStatus][]).map(c => (
            <div key={c[1]} className="kc">
              <div className="row b"><span>{c[0]}</span><span className="badge">{realTK.filter(t => t[8] === c[1]).length}</span></div>
              {realTK.filter(t => t[8] === c[1]).slice(0, 4).map(t => (
                <div key={t[0]} className="kcard" onClick={() => {
                  const realTask = useRealData && plan ? plan.tasks.find(pt => parseInt(pt.id.replace(/\D/g, '')) === t[0]) : null;
                  useMockupStore2.getState().setSelectedTaskId(realTask?.id || String(t[0]));
                  openOverlay('drTask');
                }}>
                  <div className="b sm">{t[1]}</div>
                  <div className="row mt8">{pri(t[3])}<span className="sp" /><span className="stk">{t[5].map((k: string, ki: number) => av(k, 's', ki))}</span></div>
                </div>
              ))}
              {realTK.filter(t => t[8] === c[1]).length === 0 && <div className="xs mut3 mt12">Nothing here yet.</div>}
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
  const pipelineRan = useMockupStore2(s => s.pipelineRan);
  const criticalPath = useTaskStore(s => s.criticalPath);
  const plan = useTaskStore(s => s.plan);
  const members = useTaskStore(s => s.members);
  const taskOverrides = useMockupStore2(s => s.taskOverrides); // re-renders when progress changes

  // Build Gantt data: use real schedule if pipeline ran for THIS project, otherwise fall back to project-filtered GT
  // (pipelineRan is global — without the projectId check, SRS schedule data leaks into web/data projects)
  const useRealData = activeProjectId === 'srs' && pipelineRan && criticalPath && plan && members.length > 0;

  // Convert real schedule to GT-compatible format: [task, member, startDay, endDay, class?]
  const realGT: typeof GT = useRealData && criticalPath && plan
    ? criticalPath.schedule.map((s) => {
        const task = plan.tasks.find(t => t.id === s.taskId);
        const member = members.find(m => m.id === task?.assignedTo);
        const memberLabel = member?.name.split(' ').map(w => w[0]).join('') || '?';
        const isLate = s.endDay > criticalPath.deadlineDay;
        // Reflect task status in bar color: late > done > default(blue=in-progress)
        const override = taskOverrides[task?.id || ''];
        const effectiveStatus = task?.status || override?.status;
        const barClass = isLate ? 'late' : effectiveStatus === 'done' ? 'dn' : '';
        return [
          task?.title ?? s.taskId,
          memberLabel,
          s.startDay,
          s.endDay,
          barClass,
        ] as typeof GT[number];
      })
    : getProjectGT(activeProjectId).map(g => {
        // Check overrides for mock data tasks
        const tkEntry = TK.find(t => t[1] === g[0]);
        const taskId = tkEntry ? String(tkEntry[0]) : g[0];
        const override = taskOverrides[taskId];
        if (override?.status === 'done') return [g[0], g[1], g[2], g[3], 'dn'] as typeof GT[number];
        if (override?.status === 'in-progress') return [g[0], g[1], g[2], g[3], ''] as typeof GT[number];
        return g;
      });

  // Calculate timeline dimensions from real data
  const mockProject = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const mockIsAtRisk = mockProject.status === 'dg';
  const mockIsCompleted = mockProject.statusLabel === 'Completed';
  const maxDay = useRealData && criticalPath
    ? Math.max(criticalPath.predictedCompletionDay, criticalPath.deadlineDay) + 2
    : 27;
  const N = maxDay;
  const W = 100 / N;

  // Deadline and predicted positions — project-aware for mock data
  // At Risk: predicted 3 days late (red dashed)
  // On Track: predicted 3 days early (blue solid)
  // Completed: finished exactly on deadline (blue solid)
  const deadlineDay = useRealData && criticalPath ? criticalPath.deadlineDay : (mockIsCompleted ? 19 : mockIsAtRisk ? 19 : 24);
  const predictedDay = useRealData && criticalPath ? criticalPath.predictedCompletionDay : (mockIsCompleted ? 19 : mockIsAtRisk ? 22 : 21);
  const delayDays = useRealData && criticalPath ? criticalPath.delayDays : (mockIsAtRisk ? 3 : 0);

  // Date labels for the timeline
  const dateLabels = [0, Math.floor(N / 4), Math.floor(N / 2), Math.floor(N * 3 / 4)];
  const baseDate = 12; // Oct 12 as day 0

  return (
    <section className="scr page wide on" id="s-timeline">
      <WorkspaceHeader tab="timeline" />
      {realGT.length === 0 ? (
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
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ minWidth: 860 }}>
              <div className="gr" style={{ gridTemplateColumns: '230px 1fr', borderTop: 0, background: 'var(--soft)', minHeight: 34 }}>
                <div className="xs mut3 b" style={{ padding: '0 14px' }}>TASK</div>
                <div style={{ position: 'relative', height: 34 }}>
                  {dateLabels.map(d => (
                    <span key={d} className="xs mut" style={{ position: 'absolute', left: `${d * W}%`, top: 8, paddingLeft: 4 }}>
                      {d + baseDate} Oct{d === 0 ? ' (Today)' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {realGT.map((g, i) => (
                <div key={i} className="gr" style={{ gridTemplateColumns: '230px 1fr' }}>
                  <div className="sm" style={{ padding: '0 14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g[0]}</div>
                  <div style={{ position: 'relative', height: 40 }}>
                    {[Math.floor(N / 4), Math.floor(N / 2), Math.floor(N * 3 / 4)].map(d => <i key={d} style={{ position: 'absolute', left: `${d * W}%`, top: 0, bottom: 0, borderLeft: '1px solid var(--line)' }} />)}
                    <div style={{ position: 'absolute', left: `${deadlineDay * W}%`, top: 0, bottom: 0, borderLeft: '2px solid var(--blue)' }} />
                    {delayDays > 0 ? (
                      <div style={{ position: 'absolute', left: `${predictedDay * W}%`, top: 0, bottom: 0, borderLeft: '2px dashed #e0483c' }} />
                    ) : (
                      <div style={{ position: 'absolute', left: `${predictedDay * W}%`, top: 0, bottom: 0, borderLeft: '2px solid var(--blue)' }} />
                    )}
                    <div className={`gbar ${g[4] || ''}`} style={{ left: `${g[2] * W}%`, width: `${(g[3] - g[2] + 1) * W}%` }}>{g[1]}</div>
                  </div>
                </div>
              ))}
              {realGT.length === 0 && (
                <div className="gr" style={{ gridTemplateColumns: '230px 1fr' }}>
                  <div className="sm mut" style={{ padding: '0 14px' }}>No schedule data</div>
                  <div />
                </div>
              )}
            </div>
            </div>
          </div>
          <div className="row wrap g16 xs mut mt12">
            <span><i className="ti ti-minus" style={{ color: 'var(--blue)' }} /> Deadline Day {deadlineDay}</span>
            <span><i className="ti ti-minus" style={{ color: delayDays > 0 ? '#e0483c' : 'var(--blue)' }} /> Predicted completion Day {predictedDay}{delayDays > 0 ? ` (${delayDays}d late)` : ' (on track)'}</span>
            {useRealData && criticalPath && criticalPath.delayedTaskIds.length > 0 && (
              <span className="badge b-wn"><i className="ti ti-link" /> {criticalPath.delayedTaskIds.length} tasks end after deadline</span>
            )}
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
        <h1>Plan smarter. <em>Maximize your marks.</em></h1>
        <p className="mut mt8">AI-powered project manager that decomposes assignments, matches skills, and prioritizes work for the best score.</p>
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
          {PROJECTS.map((p, i) => {
            const pTK = getProjectTK(p.id);
            const pDone = pTK.filter(t => t[8] === 'done').length;
            const pTotal = pTK.length;
            return (
            <div
              key={i}
              className="stc"
              style={{ cursor: 'pointer' }}
              onClick={() => { setActiveProject(p.id); go('overview'); }}
            >
              <div className="row mb12" style={{ alignItems: 'flex-start' }}>
                <span className={`stat s-${p.status}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{p.statusLabel}</span>
                <span className="sp" />
                <div className="row g8" style={{ flexWrap: 'nowrap', color: 'var(--ink2)', fontSize: 12 }}>
                  <span className="xs mut"><i className="ti ti-calendar" /> {p.due}</span>
                  {p.daysLeft > 0 && p.statusLabel !== 'Completed' && (
                    <span className="xs" style={{ color: p.status === 'dg' ? 'var(--dg)' : 'var(--ok)', fontWeight: 500 }}>
                      &middot; {p.daysLeft} days left
                    </span>
                  )}
                  {p.statusLabel === 'Completed' && (
                    <span className="xs" style={{ color: 'var(--ok)', fontWeight: 500 }}>
                      <i className="ti ti-circle-check" /> Completed on time
                    </span>
                  )}
                </div>
              </div>
              <div className="t" style={{ marginBottom: 8 }}><i className="ti ti-folder" style={{ color: 'var(--blue)' }} /> {p.name}</div>
              <div className="sm mut" style={{ marginBottom: 18, lineHeight: 1.5 }}>{p.desc}</div>
              <div className="row g16" style={{ marginTop: 'auto' }}>
                <span className="xs mut"><i className="ti ti-users" /> {p.members} members</span>
                <span className="xs mut"><i className="ti ti-list-check" /> {pDone}/{pTotal} tasks done</span>
                {pDone < pTotal && (
                  <span className="sp" />
                )}
                {pDone < pTotal && (
                  <div className="bar" style={{ flex: 1, maxWidth: 120 }}><i style={{ width: Math.round(pDone / pTotal * 100) + '%' }} /></div>
                )}
              </div>
            </div>
          );
          })}
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
