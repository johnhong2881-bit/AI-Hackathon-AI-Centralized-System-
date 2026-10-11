'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMockupStore2 } from '@/store/useMockupStore2';
import { useTaskStore } from '@/store/useTaskStore';
import { WorkspaceHeader, av } from './Mockup2Screens';
import { MEM, LOGS, DST, REASONS, RUBRIC_MARKS, RUBRIC_TOTAL, PROJECTS, PROJECT_MEMBERS, PGP, getProjectTK } from '@/lib/mock/mockTaskflow2';
import type { RescuePlan } from '@/types/types';

// Build a combined member list from MEM and PGP (PGP has members not in MEM, e.g. EW, FA, GL, HS)
function getProjectMembers(activeProjectId: string): { k: string; n: string }[] {
  const memberKeys = PROJECT_MEMBERS[activeProjectId] || PROJECT_MEMBERS['srs'];
  const lookup = new Map<string, { k: string; n: string }>();
  MEM.forEach(m => lookup.set(m.k, { k: m.k, n: m.n }));
  PGP.forEach(p => { if (!lookup.has(p[0])) lookup.set(p[0], { k: p[0], n: p[1] }); });
  return memberKeys.map(k => lookup.get(k) || { k, n: k });
}

// ===== Defender Screen =====
export function DefenderScreen() {
  const phase = useMockupStore2(s => s.defenderPhase);
  return (
    <section className="scr page wide on" id="s-defender">
      <WorkspaceHeader tab="defender" />
      {phase === 'risk' && <RiskPhase />}
      {phase === 'run' && <RunPhase />}
      {phase === 'result' && <ResultPhase />}
    </section>
  );
}

// ===== Risk Phase =====
function RiskPhase() {
  const defenderReason = useMockupStore2(s => s.defenderReason);
  const setDefenderReason = useMockupStore2(s => s.setDefenderReason);
  const defenderWho = useMockupStore2(s => s.defenderWho);
  const setDefenderWho = useMockupStore2(s => s.setDefenderWho);
  const setDefenderPhase = useMockupStore2(s => s.setDefenderPhase);
  const defenderReasonText = useMockupStore2(s => s.defenderReasonText);
  const setDefenderReasonText = useMockupStore2(s => s.setDefenderReasonText);
  const addToast = useMockupStore2(s => s.addToast);
  const [showErr, setShowErr] = useState(false);

  // Project-aware data
  const activeProjectId = useMockupStore2(s => s.activeProjectId);
  const project = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  const projectMembers = getProjectMembers(activeProjectId);

  // Calculate project-specific values for the info cards
  const isCompleted = project.statusLabel === 'Completed';
  const isAtRisk = project.status === 'dg';
  const daysLeft = project.daysLeft ?? 0;
  const tasksTotal = getProjectTK(activeProjectId).length;
  const tasksDone = getProjectTK(activeProjectId).filter(t => t[8] === 'done').length;
  const tasksCompletable = isCompleted ? tasksTotal : isAtRisk ? Math.max(tasksDone, Math.ceil(tasksTotal * 0.6)) : Math.max(tasksDone, Math.ceil(tasksTotal * 0.8));
  const marksAchievable = isCompleted ? RUBRIC_TOTAL : isAtRisk ? Math.round(RUBRIC_TOTAL * 0.73) : Math.round(RUBRIC_TOTAL * 0.9);

  // Reset defenderWho to a valid project member when switching projects
  useEffect(() => {
    if (projectMembers.length > 0 && !projectMembers.find(m => m.n === defenderWho)) {
      setDefenderWho(projectMembers[0].n);
    }
  }, [activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reasonText = () => {
    if (defenderReason === null) return '';
    const base = REASONS[defenderReason][1];
    if (defenderReason === 5) {
      return defenderReasonText ? `${base}: ${defenderReasonText}` : base;
    }
    return base + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
  };

  const handleRun = () => {
    if (defenderReason === null) {
      setShowErr(true);
      return;
    }
    setDefenderPhase('run');
  };

  return (
    <div className="nv-hero">
      <div className="row wrap g12 mb16">
        <span className="badge b-navy" style={{ background: 'rgba(255,255,255,.14)' }}><i className="ti ti-trophy" /> Project Rescue</span>
        <span className="badge" style={{
          background: isCompleted ? '#d4f4e4' : isAtRisk ? '#ffd9d4' : '#d4e8f4',
          color: isCompleted ? '#0d6e4e' : isAtRisk ? '#8d1f15' : '#1a5fa8',
        }}>
          <i className={`ti ${isCompleted ? 'ti-circle-check' : isAtRisk ? 'ti-alert-triangle' : 'ti-clock'}`} />
          {isCompleted ? 'Completed' : isAtRisk ? 'Deadline at risk' : 'On track'}
        </span>
      </div>
      <h2 style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-.02em', maxWidth: 640 }}>
        {isAtRisk
          ? "Not enough time to finish everything. Here\u2019s how to maximize your marks."
          : isCompleted
          ? "Project complete. Here\u2019s the final mark breakdown."
          : "Your project is on track. Here\u2019s how to stay ahead."}
      </h2>
      <p className="mut mt8" style={{ maxWidth: 600 }}>
        {isAtRisk
          ? "The AI will prioritize easy, high-value tasks so your team gets the most marks with the time left. You don\u2019t need to finish everything \u2014 just the tasks that matter most."
          : isCompleted
          ? "All tasks were completed on time. The contribution report and mark breakdown are available below."
          : "The AI can still optimize your workflow. Run the optimizer to see if there\u2019s a better task ordering or quick wins to gain extra marks."}
      </p>
      <div className="g2r mt24" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div className="kv"><div className="k">Current deadline</div><div className="v">{project.due}</div></div>
        <div className="kv"><div className="k">Time remaining</div><div className="v" style={{ color: isCompleted ? '#6fe0b2' : isAtRisk ? '#ffb4ac' : '#6fe0b2' }}>{isCompleted ? 'Completed' : `${daysLeft} days`}</div></div>
        <div className="kv"><div className="k">Tasks completable</div><div className="v">{tasksCompletable} of {tasksTotal}</div></div>
        <div className="kv"><div className="k">Marks achievable</div><div className="v" style={{ color: '#6fe0b2' }}>{marksAchievable} / {RUBRIC_TOTAL}</div></div>
      </div>
      <div className="mt24 lead-only">
        <div className="b mb8" style={{ fontSize: 15 }}>What&apos;s the situation? <span style={{ color: '#ffb4ac', fontWeight: 500, fontSize: 13 }}>Required</span></div>
        <div className="row wrap g8">
          {REASONS.map((r, i) => (
            <button key={i} className={`rs ${defenderReason === i ? 'on' : ''}`} onClick={() => { setDefenderReason(i); setShowErr(false); }}>
              <i className={`ti ${r[0]}`} />{r[1]}
            </button>
          ))}
        </div>
        <div className="mt8">
          {(defenderReason === 1 || defenderReason === 2) && (
            <select className="rsel" value={defenderWho} onChange={e => setDefenderWho(e.target.value)}>
              {projectMembers.map(m => <option key={m.k} value={m.n}>{m.n}</option>)}
            </select>
          )}
          {defenderReason === 5 && (
            <input className="rsel" style={{ width: 'min(360px,100%)' }} placeholder="Briefly explain what changed" value={defenderReasonText} onChange={e => setDefenderReasonText(e.target.value)} />
          )}
        </div>
        {showErr && (
          <div className="mt8" style={{ color: '#ffb4ac', fontSize: 13 }}>
            <i className="ti ti-alert-circle" /> Pick a situation so the AI knows how to prioritize.
          </div>
        )}
      </div>
      <div className="row wrap mt24 g12 lead-only">
        <button className="btn btn-lg" style={{ background: '#fff', color: 'var(--navy)', borderColor: '#fff', fontWeight: 650 }} onClick={handleRun}>
          <i className="ti ti-trophy" /> Optimize for Maximum Marks
        </button>
        <span className="sm mut" style={{ color: '#b5c3f3' }}>The AI ranks tasks by effort-to-score ratio. Easy high-value tasks go first. You review before anything changes.</span>
      </div>
      <div className="sm mem-only mt12" style={{ color: '#ffd9a0' }}>
        <i className="ti ti-lock" /> Only the project leader can run the optimizer.
      </div>
    </div>
  );
}

// ===== Run Phase =====
function RunPhase() {
  const setDefenderPhase = useMockupStore2(s => s.setDefenderPhase);
  const defenderReason = useMockupStore2(s => s.defenderReason);
  const defenderWho = useMockupStore2(s => s.defenderWho);
  const addToast = useMockupStore2(s => s.addToast);
  const [activeStage, setActiveStage] = useState(0);
  const [logs, setLogs] = useState<{ icon: string; msg: string; tool: string; detail: string; flag?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reasonText = () => {
    if (defenderReason === null) return '';
    const base = REASONS[defenderReason][1];
    if (defenderReason === 5) {
      const text = useMockupStore2.getState().defenderReasonText;
      return text ? `${base}: ${text}` : base;
    }
    return base + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
  };

  // Build leader reason object for the API
  const leaderReasonObj = () => {
    if (defenderReason === null) return undefined;
    const reasonLabel = REASONS[defenderReason][1];
    // Map member name to ID using combined MEM + PGP lookup (PGP has members not in MEM)
    const projectMembers = getProjectMembers(useMockupStore2.getState().activeProjectId);
    const member = projectMembers.find(m => m.n === defenderWho);
    return {
      type: reasonLabel,
      memberId: member?.k,
      memberName: defenderWho,
      detail: defenderReason === 5 ? useMockupStore2.getState().defenderReasonText : undefined,
    };
  };

  useEffect(() => {
    let cancelled = false;
    let stageTimer: ReturnType<typeof setInterval> | null = null;
    const abortController = new AbortController();
    const store = useTaskStore.getState();

    const runRescue = async () => {
      const { riskAssessment, plan, members, deadline } = store;

      if (!riskAssessment || !plan || !members.length) {
        setError('Pipeline data not found. Please run AI analysis first.');
        setActiveStage(-1);
        return;
      }

      // Simulate stage progression with real API call
      const stages = DST;
      let stageIdx = 0;
      stageTimer = setInterval(() => {
        if (cancelled) { if (stageTimer) clearInterval(stageTimer); return; }
        if (stageIdx < stages.length - 1) {
          stageIdx++;
          setActiveStage(stageIdx);
        }
      }, 600);

      // Timeout safety: 15 seconds max
      const timeoutId = setTimeout(() => abortController.abort(), 15000);

      try {
        // Call the real rescue API
        const res = await fetch('/api/pipeline/rescue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riskAssessment,
            tasks: plan.tasks,
            members,
            deadline,
            leaderReason: leaderReasonObj(),
          }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const rescuePlan: RescuePlan = await res.json();
        if (cancelled) return;

        store.setRescuePlan(rescuePlan);
        if (stageTimer) clearInterval(stageTimer);
        setActiveStage(stages.length);

        // Build logs from the rescue workflow step history
        const wf = rescuePlan.workflow;
        const newLogs: { icon: string; msg: string; tool: string; detail: string; flag?: string }[] = [];

        if (wf && wf.stepHistory) {
          wf.stepHistory.forEach((step) => {
            newLogs.push({
              icon: 'ti-chart-line',
              msg: step.description,
              tool: step.step,
              detail: step.result,
            });
          });
        }

        // Add comparison result log if available
        if (rescuePlan.comparisonResult) {
          const cmp = rescuePlan.comparisonResult;
          newLogs.push({
            icon: cmp.afterRiskLevel === 'none' || cmp.afterRiskLevel === 'low' ? 'ti-check' : 'ti-alert-triangle',
            msg: `Optimization complete: ${cmp.beforeHours}h → ${cmp.afterHours}h (saved ${cmp.hoursSaved}h)`,
            tool: 'comparison',
            detail: cmp.improvementSummary,
            flag: cmp.afterRiskLevel === 'none' || cmp.afterRiskLevel === 'low' ? 'o' : 'f',
          });
        }

        setLogs(newLogs);

        // Navigate to result phase after a short delay
        setTimeout(() => {
          if (cancelled) return;
          if (useMockupStore2.getState().screen === 'defender' && useMockupStore2.getState().defenderPhase === 'run') {
            setDefenderPhase('result');
          }
        }, 1200);
      } catch (err) {
        clearTimeout(timeoutId);
        if (stageTimer) clearInterval(stageTimer);
        if (cancelled) return;
        setActiveStage(-1);
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg);
        addToast(`Optimization failed: ${errMsg}`, 'ti-alert-circle');
      }
    };

    runRescue();

    return () => {
      cancelled = true;
      abortController.abort();
      if (stageTimer) clearInterval(stageTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageIcon = (c: string) => c === 'dn' ? 'ti-check' : c === 'run' ? 'ti-loader-2 spin' : 'ti-dots';

  return (
    <div>
      <div className="row wrap mb12">
        <div>
          <div className="eyebrow">Project Rescue</div>
          <h2 className="h2 mt4">Optimizing for maximum marks</h2>
        </div>
        <span className="sp" />
        <span className="demo"><i className="ti ti-flask" /> {error ? 'Error' : logs.length > 0 ? 'Complete' : 'Ranking tasks by effort-to-score...'}</span>
        <button className="btn btn-sm" onClick={() => setDefenderPhase('result')}>Skip to result</button>
      </div>
      {error && (
        <div className="alert al-dg mb12">
          <i className="ti ti-alert-triangle" />
          <div>
            <b>Optimization error</b>
            <div className="sm mut">{error}</div>
          </div>
        </div>
      )}
      <div className="g2r" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)' }}>
        <div className="card">
          {DST.map((s, i) => {
            const c = error ? 'pend' : i < activeStage ? 'dn' : i === activeStage ? 'run' : 'pend';
            return (
              <div key={i} className={`stg ${c}`}>
                <div className="dot"><i className={`ti ${stageIcon(c)}`} /></div>
                <div><div className="b">{s}</div></div>
                <div />
              </div>
            );
          })}
        </div>
        <div className="logbox">
          <div className="mb8" style={{ color: '#8ea2e8' }}>Project Rescue &middot; live run</div>
          <div className="lg">
            <i className="ti ti-message-2" style={{ color: '#8ea2e8' }} />
            <div>
              <div style={{ color: '#fff' }}>Situation: {reasonText() || 'No situation selected'}</div>
              <div className="mt4"><span className="tool">leader_input</span></div>
              <div className="xs mt4" style={{ color: '#a9b8ea' }}>The AI ranks tasks by how easy they are vs how many marks they&apos;re worth.</div>
            </div>
          </div>
          {logs.map((l, i) => {
            const color = l.flag === 'f' ? '#ff8f85' : l.flag === 'o' ? '#6fe0b2' : '#8ea2e8';
            return (
              <div key={i} className="lg">
                <i className={`ti ${l.icon}`} style={{ color }} />
                <div>
                  <div style={{ color: '#fff' }}>{l.msg}</div>
                  <div className="mt4"><span className="tool">{l.tool}</span></div>
                  <div className="xs mt4" style={{ color: '#a9b8ea' }}>{l.detail}</div>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && !error && (
            <div className="lg">
              <i className="ti ti-loader-2 spin" style={{ color: '#8ea2e8' }} />
              <div>
                <div style={{ color: '#fff' }}>Ranking tasks by effort-to-score ratio...</div>
                <div className="xs mt4" style={{ color: '#a9b8ea' }}>3-round optimization: identify quick wins, rank by mark value, flag low-value tasks to drop.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Result Phase =====
function ResultPhase() {
  const defenderReason = useMockupStore2(s => s.defenderReason);
  const defenderWho = useMockupStore2(s => s.defenderWho);
  const proposal2 = useMockupStore2(s => s.proposal2);
  const setProposal2 = useMockupStore2(s => s.setProposal2);
  const setDefenderPhase = useMockupStore2(s => s.setDefenderPhase);
  const go = useMockupStore2(s => s.go);
  const addToast = useMockupStore2(s => s.addToast);

  const rescuePlan = useTaskStore(s => s.rescuePlan);
  const criticalPath = useTaskStore(s => s.criticalPath);
  const setCriticalPath = useTaskStore(s => s.setCriticalPath);
  const setRescuePlan = useTaskStore(s => s.setRescuePlan);

  const reasonText = () => {
    if (defenderReason === null) return '';
    const base = REASONS[defenderReason][1];
    if (defenderReason === 5) {
      const text = useMockupStore2.getState().defenderReasonText;
      return text ? `${base}: ${text}` : base;
    }
    return base + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
  };

  const ok = proposal2 === 'approved';
  const rej = proposal2 === 'rejected';

  // Build dynamic data from real rescue plan, fall back to mock for display
  const cmp = rescuePlan?.comparisonResult;
  const actions = rescuePlan?.actions ?? [];
  const projectedRecovery = rescuePlan?.projectedRecovery ?? 'Priority plan generated';
  const confidence = rescuePlan ? Math.round(rescuePlan.confidence * 100) : 0;

  // Predicted completion from scheduler
  const beforePredicted = criticalPath
    ? `Day ${criticalPath.predictedCompletionDay}${criticalPath.delayDays > 0 ? ` (${criticalPath.delayDays}d late)` : ''}`
    : 'Unknown';
  const afterPredicted = cmp
    ? cmp.afterDeadlineBuffer >= 0
      ? `On track (${cmp.afterDeadlineBuffer}h buffer)`
      : `Still ${Math.abs(cmp.afterDeadlineBuffer)}h behind`
    : projectedRecovery;

  const bannerMap: Record<string, [string, string, string, string]> = {
    pending: ['al-wn', 'ti-hand-stop', 'Priority plan ready for review', `${actions.length} actions recommended to maximize your marks. ${projectedRecovery}.`],
    approved: ['al-ok', 'ti-circle-check', 'Priority plan approved', `The optimized plan can score ${cmp?.hoursSaved ?? 0} more marks. ${projectedRecovery}.`],
    rejected: ['al-dg', 'ti-alert-triangle', 'Marks at risk', `Without optimization you may only score partial marks. ${cmp?.improvementSummary ?? ''}`],
  };
  const B = bannerMap[proposal2];

  const cmpRow = (label: string, before: ReactNode, after: ReactNode) => (
    <div className="cmp">
      <div className="b sm">{label}</div>
      <div className="bf">{before}</div>
      <div className="mut3"><i className="ti ti-arrow-right" /></div>
      <div className="af">{after}</div>
    </div>
  );

  return (
    <div>
      <div className="row g8 mb12 wrap">
        <span className="badge b-blue"><i className="ti ti-message-2" /> Situation: {reasonText()}</span>
        {rescuePlan && (
          <span className="badge b-ok"><i className="ti ti-trophy" /> {actions.length} tasks ranked · {confidence}% confidence</span>
        )}
      </div>
      <div className="mb16">
        <div className={`alert ${B[0]}`}>
          <i className={`ti ${B[1]}`} />
          <div style={{ flex: 1 }}>
            <div className="b" style={{ fontSize: 16 }}>{B[2]}</div>
            <div className="sm">{B[3]}</div>
          </div>
        </div>
      </div>

      {/* Rescue actions from real API data */}
      {actions.length > 0 && (
        <>
          <h3 className="h3 mb8">Priority plan</h3>
          <div className="row g8 mb12 wrap">
            <span className="badge b-ok"><i className="ti ti-bolt" /> Do first</span>
            <span className="badge b-wn"><i className="ti ti-hand-stop" /> If time permits</span>
            <span className="xs mut">{actions.length} tasks ranked by effort-to-score</span>
          </div>
          {actions.map((action, i) => {
            const needsApproval = action.priority === 'critical' || action.priority === 'high';
            const badgeClass = needsApproval ? 'b-wn' : 'b-ok';
            const badgeIcon = needsApproval ? 'ti-hand-stop' : 'ti-bolt';
            const badgeLabel = needsApproval ? 'If time permits' : 'Do first';
            return (
              <div key={action.id} className={`prop ${needsApproval && proposal2 === 'pending' ? 'pend' : ''}`}>
                <div className="row wrap mb12">
                  <span className={`badge ${badgeClass}`}>
                    <i className={`ti ${badgeIcon}`} /> {badgeLabel}
                  </span>
                  <span className="h3">Task {i + 1} &mdash; {action.description}</span>
                </div>
                <div className="ba">
                  <div>
                    <div className="eyebrow mb8">Impact</div>
                    <div className="sm">{action.estimatedImpact}</div>
                  </div>
                  <div className="ar"><i className="ti ti-arrow-right" /></div>
                  <div>
                    <div className="eyebrow mb8">Type</div>
                    <div className="sm">{action.actionType} · Priority: {action.priority}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Approval buttons */}
          {rescuePlan?.requiresLeaderApproval && proposal2 === 'pending' && (
            <div className="row g8 mt16">
              <button className="btn btn-p" onClick={() => { setProposal2('approved'); addToast('Priority plan approved. Marks optimized.'); }}>
                <i className="ti ti-check" /> Approve priority plan
              </button>
              <button className="btn" onClick={() => { setProposal2('rejected'); addToast('Priority plan rejected. No changes made.', 'ti-alert-triangle'); }}>
                <i className="ti ti-x" /> Reject plan
              </button>
            </div>
          )}
        </>
      )}

      {/* Before vs After comparison from real data */}
      {cmp && (
        <>
          <h3 className="h3 mb8 mt24">Before vs After</h3>
          <div className="card">
            <div className="cmp" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="eyebrow">Metric</div>
              <div className="eyebrow">Before</div>
              <div />
              <div className="eyebrow" style={{ color: 'var(--blue6)' }}>After</div>
            </div>
            {cmpRow('Total hours', `${cmp.beforeHours}h`, `${cmp.afterHours}h (saved ${cmp.hoursSaved}h)`)}
            {cmpRow('Risk level', <span className="stat s-dg">{cmp.beforeRiskLevel}</span>, <span className={`stat ${cmp.afterRiskLevel === 'none' ? 's-ok' : cmp.afterRiskLevel === 'low' ? 's-ok' : 's-dg'}`}>{cmp.afterRiskLevel}</span>)}
            {cmpRow('Tasks at risk', `${cmp.beforeTasksAtRisk}`, `${cmp.afterTasksAtRisk}`)}
            {cmpRow('Deadline buffer', `${cmp.beforeDeadlineBuffer}h`, `${cmp.afterDeadlineBuffer}h`)}
            {cmpRow('Predicted completion', beforePredicted, afterPredicted)}
            <div className="mt12 sm mut"><i className="ti ti-info-circle" /> {cmp.improvementSummary}</div>
          </div>
        </>
      )}

      {/* Fallback when no rescue plan */}
      {!rescuePlan && (
        <div className="alert al-wn">
          <i className="ti ti-info-circle" />
          <div>
            <b>No priority plan yet</b>
            <div className="sm mut">Run the optimizer from the risk alert to generate a priority plan.</div>
          </div>
        </div>
      )}

      <div className="row g12 mt16 wrap">
        <button className={`btn btn-lg ${ok ? 'btn-p' : ''}`} onClick={() => {
          // Apply rescue plan: update critical path with new predictions
          if (ok && rescuePlan && criticalPath && cmp) {
            const updatedCriticalPath = {
              ...criticalPath,
              predictedCompletionDay: Math.max(1, criticalPath.predictedCompletionDay - (cmp.hoursSaved > 0 ? Math.ceil(cmp.hoursSaved / 8) : 0)),
              delayDays: Math.max(0, criticalPath.delayDays - (cmp.hoursSaved > 0 ? Math.ceil(cmp.hoursSaved / 8) : 0)),
              riskStatus: cmp.afterRiskLevel === 'none' || cmp.afterRiskLevel === 'low' ? 'On Track' as const : criticalPath.riskStatus,
            };
            setCriticalPath(updatedCriticalPath);
          }
          // Clear rescue plan to indicate it's been applied
          setRescuePlan(null);
          // Reset defender state
          setDefenderPhase('risk');
          setProposal2('pending');
          addToast(ok ? 'Priority plan applied. Tasks reordered by marks value.' : 'Approved changes applied.', 'ti-circle-check');
          setTimeout(() => go('tasks'), 600);
        }}>
          <i className="ti ti-circle-check" /> {ok ? 'Apply priority plan' : 'Apply approved changes only'}
        </button>
        <button className="btn btn-lg" onClick={() => { addToast('Plan discarded. No changes were made.', 'ti-trash'); setDefenderPhase('risk'); setProposal2('pending'); setRescuePlan(null); }}>Discard plan</button>
        <button className="btn btn-lg btn-g" onClick={() => { setDefenderPhase('risk'); setProposal2('pending'); }}>Back to risk alert</button>
      </div>
    </div>
  );
}
