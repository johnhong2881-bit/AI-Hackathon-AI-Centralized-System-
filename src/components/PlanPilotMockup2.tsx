'use client';

import { useMockupStore2 } from '@/store/useMockupStore2';
import { AVC } from '@/lib/mock/mockPlanPilot2';
import {
  ProjectScreen, CreateScreen, TeamScreen, ReviewScreen, AnalysisScreen,
  OverviewScreen, TasksScreen, TimelineScreen,
} from './Mockup2Screens';
import { DefenderScreen } from './Mockup2Defender';
import { Mockup2Overlays } from './Mockup2Overlays';

export default function PlanPilotMockup2() {
  const screen = useMockupStore2(s => s.screen);
  const go = useMockupStore2(s => s.go);
  const role = useMockupStore2(s => s.role);
  const setRole = useMockupStore2(s => s.setRole);
  const addToast = useMockupStore2(s => s.addToast);

  return (
    <div className={`tf-root ${role === 'mem' ? 'mem' : 'lead'}`}>
      {/* Top Nav */}
      <header className="top">
        <div className="logo" onClick={() => go('project')}>
          <span className="mk"><i className="ti ti-bolt" /></span>
          PlanPilot AI
        </div>
        <div className="sp" />
        <div className="seg">
          <button className={role === 'lead' ? 'on' : ''} onClick={() => { setRole('lead'); addToast('Viewing as Alice Tan (leader)', 'ti-eye'); }}>Leader view</button>
          <button className={role === 'mem' ? 'on' : ''} onClick={() => { setRole('mem'); addToast('Viewing as Bob Lee (member)', 'ti-eye'); }}>Member view &middot; Bob</button>
        </div>
        <span className={`av ${AVC['AT'] || 'av0'}`} title="Alice Tan (Leader)">AT</span>
      </header>

      {/* Screens */}
      {screen === 'project' && <ProjectScreen />}
      {screen === 'create' && <CreateScreen />}
      {screen === 'team' && <TeamScreen />}
      {screen === 'review' && <ReviewScreen />}
      {screen === 'analysis' && <AnalysisScreen />}
      {screen === 'overview' && <OverviewScreen />}
      {screen === 'tasks' && <TasksScreen />}
      {screen === 'timeline' && <TimelineScreen />}
      {screen === 'defender' && <DefenderScreen />}

      {/* Overlays */}
      <Mockup2Overlays />
    </div>
  );
}
