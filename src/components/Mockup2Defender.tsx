'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMockupStore2 } from '@/store/useMockupStore2';
import { WorkspaceHeader, av } from './Mockup2Screens';
import { MEM, LOGS, DST, REASONS } from '@/lib/mock/mockTaskflow2';

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
  const addToast = useMockupStore2(s => s.addToast);
  const [showErr, setShowErr] = useState(false);

  const reasonText = () => {
    if (defenderReason === null) return '';
    return REASONS[defenderReason][1] + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
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
        <span className="badge b-navy" style={{ background: 'rgba(255,255,255,.14)' }}><i className="ti ti-shield-bolt" /> AI Deadline Defender</span>
        <span className="badge" style={{ background: '#ffd9d4', color: '#8d1f15' }}><i className="ti ti-alert-triangle" /> Deadline at risk</span>
      </div>
      <h2 style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-.02em', maxWidth: 640 }}>
        Your team will finish about 7 days after the deadline.
      </h2>
      <p className="mut mt8" style={{ maxWidth: 600 }}>
        The schedule is limited by a chain of dependent tasks, not by total hours. TaskFlow can reorganize work and check the new plan before anything changes.
      </p>
      <div className="g2r mt24" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div className="kv"><div className="k">Current deadline</div><div className="v">Fri 30 Oct</div></div>
        <div className="kv"><div className="k">Predicted completion</div><div className="v" style={{ color: '#ffb4ac' }}>Fri 6 Nov</div></div>
        <div className="kv"><div className="k">Estimated delay</div><div className="v">7 days</div></div>
      </div>
      <div className="mt24 lead-only">
        <div className="b mb8" style={{ fontSize: 15 }}>Why does the plan need to change? <span style={{ color: '#ffb4ac', fontWeight: 500, fontSize: 13 }}>Required</span></div>
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
              {MEM.map(m => <option key={m.k} value={m.n}>{m.n}</option>)}
            </select>
          )}
          {defenderReason === 5 && (
            <input className="rsel" style={{ width: 'min(360px,100%)' }} placeholder="Briefly explain what changed" />
          )}
        </div>
        {showErr && (
          <div className="mt8" style={{ color: '#ffb4ac', fontSize: 13 }}>
            <i className="ti ti-alert-circle" /> Choose a reason first so the AI knows what to fix.
          </div>
        )}
      </div>
      <div className="row wrap mt24 g12 lead-only">
        <button className="btn btn-lg" style={{ background: '#fff', color: 'var(--navy)', borderColor: '#fff', fontWeight: 650 }} onClick={handleRun}>
          <i className="ti ti-player-play" /> Run AI Rescue
        </button>
        <span className="sm mut" style={{ color: '#b5c3f3' }}>The AI only reassigns work after you pick a reason. Nothing changes until you review the proposals.</span>
      </div>
      <div className="sm mem-only mt12" style={{ color: '#ffd9a0' }}>
        <i className="ti ti-lock" /> Only the project leader can run AI Rescue.
      </div>
    </div>
  );
}

// ===== Run Phase =====
function RunPhase() {
  const setDefenderPhase = useMockupStore2(s => s.setDefenderPhase);
  const defenderReason = useMockupStore2(s => s.defenderReason);
  const defenderWho = useMockupStore2(s => s.defenderWho);
  const [activeStage, setActiveStage] = useState(0);
  const [logs, setLogs] = useState<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reasonText = () => {
    if (defenderReason === null) return '';
    return REASONS[defenderReason][1] + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
  };

  useEffect(() => {
    setActiveStage(0);
    setLogs([]);
    intervalRef.current = setInterval(() => {
      setLogs(prev => {
        const next = prev.length;
        if (next >= LOGS.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => {
            const st = useMockupStore2.getState();
            if (st.screen === 'defender' && st.defenderPhase === 'run') {
              setDefenderPhase('result');
            }
          }, 500);
          return prev;
        }
        const log = LOGS[next];
        setActiveStage(log[0]);
        return [...prev, next];
      });
    }, 900);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const stageIcon = (c: string) => c === 'dn' ? 'ti-check' : c === 'run' ? 'ti-loader-2 spin' : 'ti-dots';

  return (
    <div>
      <div className="row wrap mb12">
        <div>
          <div className="eyebrow">AI Deadline Defender</div>
          <h2 className="h2 mt4">Recovering your deadline</h2>
        </div>
        <span className="sp" />
        <span className="demo"><i className="ti ti-flask" /> Simulation &middot; tool names are illustrative</span>
        <button className="btn btn-sm" onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setDefenderPhase('result'); }}>Skip to result</button>
      </div>
      <div className="g2r" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)' }}>
        <div className="card">
          {DST.map((s, i) => {
            const c = i < activeStage ? 'dn' : i === activeStage ? 'run' : 'pend';
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
          <div className="mb8" style={{ color: '#8ea2e8' }}>AI Deadline Defender &middot; simulation</div>
          <div className="lg">
            <i className="ti ti-message-2" style={{ color: '#8ea2e8' }} />
            <div>
              <div style={{ color: '#fff' }}>Reason from leader: {reasonText()}</div>
              <div className="mt4"><span className="tool">leader_input</span></div>
              <div className="xs mt4" style={{ color: '#a9b8ea' }}>The AI plans reassignments around this reason.</div>
            </div>
          </div>
          {logs.map((li, i) => {
            const l = LOGS[li];
            const color = l[5] === 'f' ? '#ff8f85' : l[5] === 'o' ? '#6fe0b2' : '#8ea2e8';
            return (
              <div key={i} className="lg">
                <i className={`ti ${l[1]}`} style={{ color }} />
                <div>
                  <div style={{ color: '#fff' }}>{l[2]}</div>
                  <div className="mt4"><span className="tool">{l[3]}</span></div>
                  <div className="xs mt4" style={{ color: '#a9b8ea' }}>{l[4]}</div>
                </div>
              </div>
            );
          })}
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

  const reasonText = () => {
    if (defenderReason === null) return '';
    return REASONS[defenderReason][1] + ((defenderReason === 1 || defenderReason === 2) ? ` (${defenderWho})` : '');
  };

  const ok = proposal2 === 'approved';
  const rej = proposal2 === 'rejected';

  const bannerMap: Record<string, [string, string, string, string]> = {
    pending: ['al-wn', 'ti-hand-stop', 'Approval required', '1 change needs your decision. With your approval, the plan finishes Fri 30 Oct.'],
    approved: ['al-ok', 'ti-circle-check', 'Rescue validated', 'The revised plan finishes Fri 30 Oct and high-priority tasks stay on schedule. There is no spare buffer.'],
    rejected: ['al-dg', 'ti-alert-triangle', 'Risk unresolved', 'Without Proposal 2 the plan still ends Sun 1 Nov, 2 days late. Remaining constraint: Compile SRS cannot start before the diagrams are done.'],
  };
  const B = bannerMap[proposal2];

  const aft = rej
    ? ['Sun 1 Nov', 'At Risk \u00b7 2 days late', 's-dg']
    : ok
    ? ['Fri 30 Oct', 'On Track \u00b7 no buffer', 's-ok']
    : ['Fri 30 Oct (if approved)', 'Pending approval', 's-wn'];

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
        <span className="badge b-blue"><i className="ti ti-message-2" /> Reason: {reasonText()}</span>
      </div>
      <div className="mb16">
        <div className={`alert ${B[0]}`}>
          <i className={`ti ${B[1]}`} />
          <div style={{ flex: 1 }}>
            <div className="b" style={{ fontSize: 16 }}>{B[2]}</div>
            <div className="sm">{B[3]}</div>
            {rej && (
              <div className="mt12 card flat" style={{ padding: '12px 14px' }}>
                <div className="b sm mb4"><i className="ti ti-sparkles" style={{ color: 'var(--blue)' }} /> Option: drop low-priority work (needs approval)</div>
                <div className="sm mut">Remove &ldquo;Quality and risk plan&rdquo; (Low priority, 4 h). High and Medium priority tasks are never removed.</div>
                <div className="row g8 mt8">
                  <button className="btn btn-sm btn-p" onClick={() => addToast('Scope reduction approved', 'ti-check')}>Approve scope reduction</button>
                  <button className="btn btn-sm" onClick={() => setProposal2('pending')}>Reconsider Proposal 2</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="h3 mb8">Rescue recommendations</h3>
      <div className="row g8 mb12 wrap">
        <span className="badge b-ok"><i className="ti ti-bolt" /> Safe to apply automatically</span>
        <span className="badge b-wn"><i className="ti ti-hand-stop" /> Needs leader approval</span>
        <span className="xs mut">Completed work is never changed. 1 completed task left untouched.</span>
      </div>

      {/* Proposal 1 */}
      <div className="prop">
        <div className="row wrap mb12">
          <span className="badge b-ok"><i className="ti ti-bolt" /> Auto-applied &middot; safe</span>
          <span className="h3">Proposal 1 &mdash; Share &ldquo;Design system architecture&rdquo;</span>
          <span className="sp" />
          <span className="xs mut">Impact: removes a David bottleneck</span>
        </div>
        <div className="ba">
          <div>
            <div className="eyebrow mb8">Before</div>
            <div className="row g8">{av('DC', 's')} David Chen <span className="sp" /><b>8 h</b></div>
          </div>
          <div className="ar"><i className="ti ti-arrow-right" /></div>
          <div>
            <div className="eyebrow mb8">After</div>
            <div className="row g8">{av('DC', 's')} David Chen <span className="sp" /><b>4 h</b></div>
            <div className="row g8 mt4">{av('CN', 's')} Chloe Ng <span className="sp" /><b>4 h</b></div>
          </div>
        </div>
        <div className="sm mt12"><b>Why:</b> Chloe has 23 h spare before the deadline and UI/UX Design (Advanced), a skill this task lists. <span className="mut">Safe because the task is unaccepted and unlocked.</span></div>
      </div>

      {/* Proposal 2 */}
      <div className={`prop ${proposal2 === 'pending' ? 'pend' : rej ? 'rej' : ''}`}>
        <div className="row wrap mb12">
          <span className={`badge ${ok ? 'b-ok' : rej ? '' : 'b-wn'}`}>
            <i className={`ti ${ok ? 'ti-check' : rej ? 'ti-x' : 'ti-hand-stop'}`} /> {ok ? 'Approved by leader' : rej ? 'Rejected' : 'Needs your approval'}
          </span>
          <span className="h3">Proposal 2 &mdash; Start &ldquo;Compile SRS&rdquo; before diagrams finish</span>
        </div>
        <div className="ba">
          <div>
            <div className="eyebrow mb8">Before</div>
            <div className="sm">Compile SRS waits for Requirements, Introduction, <b>Diagrams</b> and <b>Architecture</b>.</div>
            <div className="xs mut mt4">Starts Tue 27 Oct</div>
          </div>
          <div className="ar"><i className="ti ti-arrow-right" /></div>
          <div>
            <div className="eyebrow mb8">After</div>
            <div className="sm">Compile SRS starts after Requirements and Introduction. Diagrams are inserted during <b>Referencing</b>.</div>
            <div className="xs mut mt4">Starts Mon 19 Oct</div>
          </div>
        </div>
        <div className="sm mt12"><b>Why:</b> Removes a 7-day wait on the critical path. <b>Affects:</b> Alice (Compile 10 h, Referencing 4 h). <span className="mut">Needs approval because it changes the order of planned work.</span></div>
        {proposal2 === 'pending' && (
          <div className="row g8 mt16">
            <button className="btn btn-p" onClick={() => { setProposal2('approved'); addToast('Change approved. Forecast recalculated.'); }}>
              <i className="ti ti-check" /> Approve change
            </button>
            <button className="btn" onClick={() => { setProposal2('rejected'); addToast('Change rejected. Risk is still unresolved.', 'ti-alert-triangle'); }}>
              <i className="ti ti-x" /> Reject change
            </button>
            <span className="xs mut">Expected impact: Fri 6 Nov &rarr; Fri 30 Oct</span>
          </div>
        )}
      </div>

      {/* Attempt 1 note */}
      <div className="card flat mb16">
        <div className="row">
          <i className="ti ti-history" style={{ color: 'var(--ink3)' }} />
          <div className="sm"><b>Attempt 1 didn&apos;t pass validation.</b> Moving all 8 h of &ldquo;Design system architecture&rdquo; to Chloe still ended <b>Sun 1 Nov, 2 days late</b>. The agent tried a different approach.</div>
        </div>
      </div>

      {/* Before vs After comparison */}
      <h3 className="h3 mb8 mt24">Before vs After</h3>
      <div className="card">
        <div className="cmp" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="eyebrow">Metric</div>
          <div className="eyebrow">Before rescue</div>
          <div />
          <div className="eyebrow" style={{ color: 'var(--blue6)' }}>After rescue</div>
        </div>
        {cmpRow('Predicted completion', 'Fri 6 Nov', aft[0])}
        {cmpRow('Deadline status', <span className="stat s-dg">At Risk &middot; 7 days late</span>, <span className={`stat ${aft[2]}`}>{aft[1]}</span>)}
        {cmpRow('Workload distribution', <div className="sm">David 26 h &middot; Alice 28 h<br />Chloe 19 h &middot; Bob 16 h</div>, <div className="sm">David 22 h &middot; Alice 28 h<br />Chloe 23 h &middot; Bob 16 h</div>)}
        {cmpRow('Remaining risks', <div className="sm">4 tasks end after deadline<br />Alice and David are bottlenecks</div>, <div className="sm">{ok ? 'No buffer left<br />2 assignments await acceptance' : 'Depends on Proposal 2<br />2 assignments await acceptance'}</div>)}
      </div>

      <div className="row g12 mt16 wrap">
        <button className={`btn btn-lg ${ok ? 'btn-p' : ''}`} onClick={() => { addToast(ok ? 'Rescued plan applied to the project' : 'Approved changes applied. Risk remains.'); setTimeout(() => go('timeline'), 600); }}>
          <i className="ti ti-circle-check" /> {ok ? 'Apply plan to project' : 'Apply approved changes only'}
        </button>
        <button className="btn btn-lg" onClick={() => { addToast('Rescue discarded. No changes were made.', 'ti-trash'); setDefenderPhase('risk'); setProposal2('pending'); }}>Discard rescue</button>
        <button className="btn btn-lg btn-g" onClick={() => { setDefenderPhase('risk'); setProposal2('pending'); }}>Back to risk alert</button>
      </div>
    </div>
  );
}
