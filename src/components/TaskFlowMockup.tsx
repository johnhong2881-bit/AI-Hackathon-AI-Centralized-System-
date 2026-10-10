'use client';

import { useEffect } from 'react';
import { useMockupStore } from '@/store/useMockupStore';
import { SCR, GRP } from '@/lib/mock/mockTaskflow';
import {
  CreateScreen, TeamScreen, ReviewScreen, AnalysisScreen,
  OverviewScreen, TasksScreen, RubricScreen, TimelineScreen,
  ActivityScreen, StatesScreen,
} from './MockupScreens';
import { DefenderScreen } from './MockupDefender';
import { Overlay, ToastContainer } from './MockupOverlays';

export default function TaskFlowMockup() {
  const screen = useMockupStore(s => s.screen);
  const role = useMockupStore(s => s.role);
  const setRole = useMockupStore(s => s.setRole);
  const go = useMockupStore(s => s.go);
  const addToast = useMockupStore(s => s.addToast);

  // Close overlay on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useMockupStore.getState().closeOverlay();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  let g = 0;
  return (
    <div className={`tf-root ${role === 'lead' ? 'lead' : 'mem'}`}>
      {/* Top Nav */}
      <header className="top">
        <div className="logo" onClick={() => go('create')}>
          <span className="mk"><i className="ti ti-bolt" /></span>
          TaskFlow AI
        </div>
        <span className="demo hide-m"><i className="ti ti-flask" /> UI mockup · sample data</span>
        <div className="sp" />
        <div className="seg">
          <button className={role === 'lead' ? 'on' : ''} onClick={() => { setRole('lead'); addToast('Viewing as Alice Tan (leader)', 'ti-eye'); }}>Leader view</button>
          <button className={role === 'mem' ? 'on' : ''} onClick={() => { setRole('mem'); addToast('Viewing as Bob Lee (member)', 'ti-eye'); }}>Member view · Bob</button>
        </div>
        <span className="av av0" title="Alice Tan (Leader)">AT</span>
      </header>

      {/* Screen Nav */}
      <nav className="scrnav">
        {SCR.map(s => {
          const showGroup = s[2] !== g;
          if (showGroup) g = s[2];
          return (
            <span key={s[0]} style={{ display: 'contents' }}>
              {showGroup && <span className="gp">{GRP[g]}</span>}
              <button className={s[0] === screen ? 'on' : ''} onClick={() => go(s[0] as any)}>{s[1]}</button>
            </span>
          );
        })}
      </nav>

      {/* Screens */}
      {(screen === 'create' || screen === 'team' || screen === 'review' || screen === 'analysis') && (
        <>
          {screen === 'create' && <CreateScreen />}
          {screen === 'team' && <TeamScreen />}
          {screen === 'review' && <ReviewScreen />}
          {screen === 'analysis' && <AnalysisScreen />}
        </>
      )}
      {screen === 'overview' && <OverviewScreen />}
      {screen === 'tasks' && <TasksScreen />}
      {screen === 'rubric' && <RubricScreen />}
      {screen === 'timeline' && <TimelineScreen />}
      {screen === 'defender' && <DefenderScreen />}
      {screen === 'activity' && <ActivityScreen />}
      {screen === 'states' && <StatesScreen />}

      {/* Overlays + Toast */}
      <Overlay />
      <ToastContainer />
    </div>
  );
}
