'use client';

import { useEffect, useRef, useState } from 'react';
import { useMockupStore } from '@/store/useMockupStore';
import { LOGS, DST } from '@/lib/mock/mockTaskflow';
import { av } from './MockupScreens';
import { WorkspaceHeader } from './MockupScreens';

export function DefenderScreen() {
  const phase = useMockupStore(s => s.defenderPhase);
  const setPhase = useMockupStore(s => s.setDefenderPhase);
  const proposal2 = useMockupStore(s => s.proposal2);
  const setProposal2 = useMockupStore(s => s.setProposal2);
  const addToast = useMockupStore(s => s.addToast);
  const go = useMockupStore(s => s.go);
  const role = useMockupStore(s => s.role);

  const [logIndex, setLogIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'run') return;
    setLogIndex(0);
    intervalRef.current = setInterval(() => {
      setLogIndex(prev => {
        if (prev >= LOGS.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setPhase('result'), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, setPhase]);

  if (phase === 'risk') {
    return (
      <section className="scr page wide on" id="s-defender">
        <WorkspaceHeader tab="defender" />
        <div id="dRisk">
          <div className="nv-hero">
            <div className="row wrap g12 mb16">
              <span className="badge b-navy" style={{ background: 'rgba(255,255,255,.14)' }}><i className="ti ti-shield-bolt" /> AI Deadline Defender</span>
              <span className="badge" style={{ background: '#ffd9d4', color: '#8d1f15' }}><i className="ti ti-alert-triangle" /> Deadline at risk</span>
            </div>
            <h2 style={{ fontSize: 30, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-.02em', maxWidth: 640 }}>Your team will finish about 7 days after the deadline.</h2>
            <p className="mut mt8" style={{ maxWidth: 600 }}>The schedule is limited by a chain of dependent tasks, not by total hours. TaskFlow can reorganize work and check the new plan before anything changes.</p>
            <div className="g2r mt24" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              <div className="kv"><div className="k">Current deadline</div><div className="v">Fri 30 Oct</div></div>
              <div className="kv"><div className="k">Predicted completion</div><div className="v" style={{ color: '#ffb4ac' }}>Fri 6 Nov</div></div>
              <div className="kv"><div className="k">Estimated delay</div><div className="v">7 days</div></div>
            </div>
            <div className="row wrap mt24 g12">
              <button className="btn btn-lg" style={{ background: '#fff', color: 'var(--navy)', borderColor: '#fff', fontWeight: 650 }} onClick={() => setPhase('run')}><i className="ti ti-player-play" /> Run AI Rescue</button>
              <span className="sm mut">Nothing changes until you review the proposals.</span>
            </div>
            <div className="sm mem-only mt12" style={{ color: '#ffd9a0' }}><i className="ti ti-lock" /> Only the project leader can run AI Rescue.</div>
          </div>
          <div className="g2r mt16" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
            <div className="card flat"><div className="h3 mb8">Main risk factors</div>
              <div className="rd"><i className="ti ti-route" style={{ color: 'var(--dg)' }} /><span><b>Long dependency chain.</b> Requirements → Diagrams → Compile SRS → Referencing → Final review.</span></div>
              <div className="rd"><i className="ti ti-calendar-off" style={{ color: 'var(--wn)' }} /><span><b>Alice's hours are uneven.</b> 0 h on Wednesdays and most hours on weekends.</span></div>
              <div className="rd"><i className="ti ti-user-bolt" style={{ color: 'var(--wn)' }} /><span><b>David carries the critical diagrams.</b> 26 h remaining, no backup.</span></div>
            </div>
            <div className="card flat"><div className="h3 mb8">Tasks causing delays</div>
              <div className="col g8 sm">
                <span><span className="pri pri-M">Medium</span> Compile SRS document <span className="mut">· ends Sat 31 Oct</span></span>
                <span><span className="pri pri-L">Low</span> Referencing and formatting <span className="mut">· Mon 2 Nov</span></span>
                <span><span className="pri pri-L">Low</span> Rehearse and finalize presentation</span>
                <span><span className="pri pri-H">High</span> Final review and submission check <span className="mut">· Fri 6 Nov</span></span>
              </div>
            </div>
            <div className="card flat"><div className="h3 mb8">Overloaded members</div>
              <div className="sm mut mb8">Nobody exceeds total available hours, but two people are the bottleneck.</div>
              <div className="row g8"><span className="av av0">AT</span><span className="av av3">DC</span></div>
              <div className="h3 mt16 mb8">Missing mandatory requirements</div>
              <div className="rd sm"><i className="ti ti-target-off" style={{ color: 'var(--wn)' }} /><span>Testing: <b>traceability matrix</b> has no task.</span></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'run') {
    const actStage = logIndex < LOGS.length ? LOGS[logIndex][0] : LOGS.length;
    return (
      <section className="scr page wide on" id="s-defender">
        <WorkspaceHeader tab="defender" />
        <div id="dRun">
          <div className="row wrap mb12">
            <div><div className="eyebrow">AI Deadline Defender</div><h2 className="h2 mt4">Recovering your deadline</h2></div>
            <span className="sp" /><span className="demo"><i className="ti ti-flask" /> Simulation · tool names are illustrative</span>
            <button className="btn btn-sm" onClick={() => setPhase('result')}>Skip to result</button>
          </div>
          <div className="g2r" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.5fr)' }}>
            <div className="card">
              {DST.map((s, i) => {
                const c = logIndex >= LOGS.length ? 'dn' : i < actStage ? 'dn' : i === actStage ? 'run' : 'pend';
                return (
                  <div key={i} className={`stg ${c}`}>
                    <div className="dot"><i className={`ti ${c === 'dn' ? 'ti-check' : c === 'run' ? 'ti-loader-2 spin' : 'ti-dots'}`} /></div>
                    <div><div className="b">{s}</div></div>
                    <div />
                  </div>
                );
              })}
            </div>
            <div className="logbox">
              <div className="mb8" style={{ color: '#8ea2e8' }}>AI Deadline Defender · simulation</div>
              {LOGS.slice(0, logIndex).map((l, i) => (
                <div key={i} className="lg">
                  <i className={`ti ${l[1]}`} style={{ color: l[5] === 'f' ? '#ff8f85' : l[5] === 'o' ? '#6fe0b2' : '#8ea2e8' }} />
                  <div>
                    <div style={{ color: '#fff' }}>{l[2]}</div>
                    <div className="mt4"><span className="tool">{l[3]}</span></div>
                    <div className="xs mt4" style={{ color: '#a9b8ea' }}>{l[4]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Phase: result
  const ok = proposal2 === 'approved';
  const rej = proposal2 === 'rejected';
  const banner = {
    pending: ['al-wn', 'ti-hand-stop', 'Approval required', '1 change needs your decision. With your approval, the plan finishes Fri 30 Oct.'],
    approved: ['al-ok', 'ti-circle-check', 'Rescue validated', 'The revised plan finishes Fri 30 Oct and all mandatory rubric criteria still have tasks. There is no spare buffer.'],
    rejected: ['al-dg', 'ti-alert-triangle', 'Risk unresolved', 'Without Proposal 2 the plan still ends Sun 1 Nov, 2 days late. Remaining constraint: Compile SRS cannot start before the diagrams are done.'],
  }[proposal2];
  const aft = proposal2 === 'rejected' ? ['Sun 1 Nov', 'At Risk · 2 days late', 's-dg'] : ok ? ['Fri 30 Oct', 'On Track · no buffer', 's-ok'] : ['Fri 30 Oct (if approved)', 'Pending approval', 's-wn'];
  const cmpRow = (l: string, b: React.ReactNode, a: React.ReactNode) => (
    <div className="cmp">
      <div className="b sm">{l}</div>
      <div className="bf">{b}</div>
      <div className="mut3"><i className="ti ti-arrow-right" /></div>
      <div className="af">{a}</div>
    </div>
  );

  return (
    <section className="scr page wide on" id="s-defender">
      <WorkspaceHeader tab="defender" />
      <div id="dRes">
        <div className="mb16">
          <div className={`alert ${banner[0]}`}>
            <i className={`ti ${banner[1]}`} />
            <div style={{ flex: 1 }}>
              <div className="b" style={{ fontSize: 16 }}>{banner[2]}</div>
              <div className="sm">{banner[3]}</div>
              {rej && (
                <div className="mt12 card flat" style={{ padding: '12px 14px' }}>
                  <div className="b sm mb4"><i className="ti ti-sparkles" style={{ color: 'var(--blue)' }} /> Option: reduce non-mandatory work (needs approval)</div>
                  <div className="sm mut">Lower "Documentation and Formatting" from Good to Average. Saves 3 h. Mandatory requirements are never removed.</div>
                  <div className="row g8 mt8"><button className="btn btn-sm btn-p">Approve scope reduction</button><button className="btn btn-sm" onClick={() => setProposal2('approved')}>Reconsider Proposal 2</button></div>
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
            <span className="badge b-ok"><i className="ti ti-bolt" /> Auto-applied · safe</span>
            <span className="h3">Proposal 1 — Share "Design system architecture"</span>
            <span className="sp" /><span className="xs mut">Impact: removes a David bottleneck</span>
          </div>
          <div className="ba">
            <div><div className="eyebrow mb8">Before</div><div className="row g8"><span className="av s av3">DC</span> David Chen <span className="sp" /><b>8 h</b></div></div>
            <div className="ar"><i className="ti ti-arrow-right" /></div>
            <div><div className="eyebrow mb8">After</div><div className="row g8"><span className="av s av3">DC</span> David Chen <span className="sp" /><b>4 h</b></div><div className="row g8 mt4"><span className="av s av2">CN</span> Chloe Ng <span className="sp" /><b>4 h</b></div></div>
          </div>
          <div className="sm mt12"><b>Why:</b> Chloe has 23 h spare before the deadline and UI/UX Design (Advanced), a skill this task lists. <span className="mut">Safe because the task is unaccepted and unlocked.</span></div>
        </div>

        {/* Proposal 2 */}
        <div className={`prop ${proposal2 === 'pending' ? 'pend' : rej ? 'rej' : ''}`} id="prop2">
          <div className="row wrap mb12">
            <span className={`badge ${ok ? 'b-ok' : rej ? '' : 'b-wn'}`} id="p2b">
              <i className={`ti ${ok ? 'ti-check' : rej ? 'ti-x' : 'ti-hand-stop'}`} />
              {ok ? 'Approved by leader' : rej ? 'Rejected' : 'Needs your approval'}
            </span>
            <span className="h3">Proposal 2 — Start "Compile SRS" before diagrams finish</span>
          </div>
          <div className="ba">
            <div><div className="eyebrow mb8">Before</div><div className="sm">Compile SRS waits for Requirements, Introduction, <b>Diagrams</b> and <b>Architecture</b>.</div><div className="xs mut mt4">Starts Tue 27 Oct</div></div>
            <div className="ar"><i className="ti ti-arrow-right" /></div>
            <div><div className="eyebrow mb8">After</div><div className="sm">Compile SRS starts after Requirements and Introduction. Diagrams are inserted during <b>Referencing</b>.</div><div className="xs mut mt4">Starts Mon 19 Oct</div></div>
          </div>
          <div className="sm mt12"><b>Why:</b> Removes a 7-day wait on the critical path. <b>Affects:</b> Alice (Compile 10 h, Referencing 4 h). <span className="mut">Needs approval because it changes the order of planned work.</span></div>
          {proposal2 === 'pending' && (
            <div className="row g8 mt16" id="p2act">
              <button className="btn btn-p" onClick={() => { setProposal2('approved'); addToast('Change approved. Forecast recalculated.'); }}><i className="ti ti-check" /> Approve change</button>
              <button className="btn" onClick={() => { setProposal2('rejected'); addToast('Change rejected. Risk is still unresolved.', 'ti-alert-triangle'); }}><i className="ti ti-x" /> Reject change</button>
              <span className="xs mut">Expected impact: Fri 6 Nov → Fri 30 Oct</span>
            </div>
          )}
        </div>

        {/* Attempt 1 note */}
        <div className="card flat mb16"><div className="row"><i className="ti ti-history" style={{ color: 'var(--ink3)' }} /><div className="sm"><b>Attempt 1 didn't pass validation.</b> Moving all 8 h of "Design system architecture" to Chloe still ended <b>Sun 1 Nov, 2 days late</b>. The agent tried a different approach.</div></div></div>

        {/* Before vs After */}
        <h3 className="h3 mb8 mt24">Before vs After</h3>
        <div className="card">
          {cmpRow('', <div className="eyebrow">Before rescue</div>, <div className="eyebrow" style={{ color: 'var(--blue6)' }}>After rescue</div>)}
          {cmpRow('Predicted completion', 'Fri 6 Nov', aft[0])}
          {cmpRow('Deadline status', <span className="stat s-dg">At Risk · 7 days late</span>, <span className={`stat ${aft[2]}`}>{aft[1]}</span>)}
          {cmpRow('Workload distribution', <div className="sm">David 26 h · Alice 28 h<br />Chloe 19 h · Bob 16 h</div>, <div className="sm">David 22 h · Alice 28 h<br />Chloe 23 h · Bob 16 h</div>)}
          {cmpRow('Rubric coverage', 'Planned 94% · 1 gap', 'Planned 94% · 1 gap (traceability matrix still unplanned)')}
          {cmpRow('Remaining risks', <div className="sm">4 tasks end after deadline<br />1 coverage gap</div>, <div className="sm">{ok ? 'No buffer left<br />1 coverage gap' : 'Depends on Proposal 2<br />1 coverage gap'}</div>)}
        </div>
        <div className="row g12 mt16 wrap">
          <button className={`btn btn-lg ${ok ? 'btn-p' : ''}`} id="applyBtn" onClick={() => { addToast(ok ? 'Rescued plan applied to the project' : 'Approved changes applied. Risk remains.'); setTimeout(() => go('timeline'), 600); }}><i className="ti ti-circle-check" /> {ok ? 'Apply plan to project' : 'Apply approved changes only'}</button>
          <button className="btn btn-lg" onClick={() => { addToast('Rescue discarded. No changes were made.', 'ti-trash'); setPhase('risk'); setProposal2('pending'); }}>Discard rescue</button>
          <button className="btn btn-lg btn-g" onClick={() => { setPhase('risk'); setProposal2('pending'); }}>Back to risk alert</button>
        </div>
      </div>
    </section>
  );
}
