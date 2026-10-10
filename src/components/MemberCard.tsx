'use client';

/**
 * MemberCard.tsx — FR-010
 * Person A (Frontend)
 *
 * Team member profile card showing:
 * - Avatar + name + role
 * - Skills with proficiency bars
 * - Current tasks count
 * - Availability
 *
 * Data source: store.members (mock: mockMembers)
 */

import type { Member } from '@/types/types';

export default function MemberCard({ member }: { member: Member }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{member.avatar}</span>
        <div>
          <p className="font-medium text-sm">{member.name}</p>
          <p className="text-xs text-slate-500">{member.role}</p>
        </div>
      </div>

      {/* Skills with proficiency */}
      <div className="space-y-1 mb-3">
        {member.skills.map((skill) => {
          const prof = member.skillProficiency[skill] || 0;
          return (
            <div key={skill} className="flex items-center gap-2">
              <span className="w-16 text-[10px] capitalize text-slate-500">{skill}</span>
              <div className="flex-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-4 rounded-sm ${
                        i <= prof ? 'bg-blue-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>{member.currentTaskIds.length} tasks</span>
        <span>{member.availability}h/wk</span>
      </div>
    </div>
  );
}
