# TaskFlow AI — Existing Features, Remaining Work & Business Logic

This document is divided into three parts:
1. What currently exists in the app (what actually works, what is just visual)
2. What remains to be done
3. The logic to be implemented during actual development (rules, formulas, processes)

Current status: **Next.js App (Mockup 2) is live.** The UI includes 8 complete screens (Project/Home, Create, Team, Review, AI Analysis, Overview, Tasks, Timeline, AI Deadline Defender), with the backend 6-agent pipeline + scheduler + rescue engine implemented. Some data still uses mock data; scheduling and risk calculations are implemented by real logic modules (`src/lib/logic/`).

---

## 1. Existing Features

### 1.1 Screen Overview

| Screen | What's on the screen | What actually works | What is still static / non-functional |
|---|---|---|---|
| **Project (Home)** | Hero, 4-step process guide, project cards (At Risk / On Track / Completed), "Create new project" button | Clicking a project card sets activeProjectId and navigates to that project's workspace; completed projects show a "Generate Contribution" button (clicking shows a toast); task counts/completed counts on project cards are dynamically calculated (`getProjectTK()`) | Project card data comes from the `PROJECTS` mock array, task counts dynamically derived |
| **Create** | Project name, description, member count, assignment file (PDF/DOCX upload or paste text), rubric, deadline | Name character count and blank validation; member count −/+ with 2–10 range validation; upload/paste text toggle; four file states; checking "rubric included" shows or hides the rubric upload area; Back button returns to Home | Does not actually read file contents; date uses the browser's native picker |
| **Team** | Member list (strengths, weaknesses, weekly hours), right-side team overview | Add, edit, remove members; yellow prompt and empty slots when member count doesn't match settings; skill coverage statistics | "Potentially missing skills" in the overview is static text |
| **Member sidebar** | Name, strengths (with levels), weaknesses, Monday–Sunday toggle and hours | Strength and weakness required validation; strength/weakness mutual exclusion; 0–24 hour limit; "Copy Monday to weekdays" "Close weekends"; total hours auto-update; 0 hours warning | Suggested skills come from a fixed list |
| **Review** | Project summary, team summary | Member count, member strengths/weaknesses in the summary follow Team changes; prompts appear when strengths/weaknesses are missing or member count doesn't match | Project name, description, deadline, file names are static text |
| **AI analysis** | Nine-step timeline | Auto-advances step by step, calling the real `/api/pipeline/run` API; navigates to Overview when finished; can be skipped | Pure animation display, data comes from mock LLM layer |
| **Overview** | Predicted completion line, overall progress, Team progress | **Per-project**: filters members and tasks by activeProjectId; Team progress changes row count based on project members; click member to expand tasks; sorting; expand all; completed projects show completion alert (total task count dynamically calculated); at-risk projects show AI Defender button | Predicted completion date and task progress come from mock data |
| **Tasks** | List, kanban, task details | List and kanban toggle; task detail drawer; leader clicks Edit task to enter editing; lock button; member view Accept/Reject; **Per-project**: SRS uses TK array, other projects use `getProjectTK()` to derive from PGP | **Search and filter do not actually filter**; edited task content doesn't actually change |
| **Timeline** | Gantt chart | **Per-project**: SRS uses GT array, other projects use `getProjectGT()` to derive from PGP; predicted completion line shows as solid blue when On Track, red dashed when At Risk | Task bar positions are mock data |
| **AI Defender** | Risk alert, cause selection, agent execution screen, proposal, approve/reject, Before vs After | Must select a cause before Run; selecting "member unavailable/overloaded" requires selecting a member; execution log appears line by line (including real `/api/pipeline/rescue` API call); approve or reject toggles the result banner; Before/After comparison table shows real API returned data; **Per-project**: total tasks/completable count/score dynamically calculated from `getProjectTK()` | Proposal content comes from API return, but differences between causes depend on the API |
| **Overlays** | Member drawer, Task drawer, Reject modal, Save modal, Override modal, Edit modal, Toast | All can pop up and close; Task drawer has view/edit toggle | Forms don't actually save to the backend |
| **Other** | Leader / Member view toggle, Toast notifications | Toggling hides leader-only buttons | Member view is fixed to Bob |

### 1.2 Items Already Removed as Requested

Rubric tab and rubric coverage, Activity page, team workload in Timeline, Needs attention / Up next on the right side of Overview, the three explanation cards on the Defender risk page, the Review checklist, "What the AI will do" on the first page, and the rubric proofreading page after AI analysis.

---

## 2. What Remains

### 2.1 Must Do to Be "Actually Usable" (P0)

1. **~~Backend and data storage.~~** Save and read projects, members, tasks, assignments, status. → API routes implemented; data storage still uses mock data
2. **~~PDF upload and parsing.~~** → `/api/upload` implemented (pdf-parse + mammoth)
3. **~~Plan generation (connected to AI).~~** → `/api/pipeline/run` implemented, using mock LLM layer
4. **~~Real scheduling and risk calculation.~~** → `src/lib/logic/scheduler.ts` + `critical-path.ts` implemented
5. **Connect screens to real data.** Overview, Tasks, Timeline, Team progress still use mock data in part, need to be changed to compute from API results
6. **~~Defender connected to real AI + validation loop.~~** → `/api/pipeline/rescue` + `rescue-engine.ts` implemented
7. **Apply Rescue logic.** Approved changes actually write to tasks, reschedule, update risk status — UI layer not yet connected

### 2.2 Existing Screens Without Complete Logic (P1)

1. Tasks **search and three filters**.
2. **Edit task actually saves**, and recalculates schedule, confirmation dialog shows real "before/after difference".
3. **Lock task**: after locking, AI changes must be approved first.
4. **Reassignment suggestion after Reject**: currently only has the Reject dialog and prompt, "suggested person to take over" is not yet shown.
5. **"No suitable member"** screen only exists in UI states, not connected to the flow.
6. **Review page** should display the real content entered on the Create page (currently static text).
7. **Create date validation** should be checked programmatically, not just relying on the browser.
8. **Member view** should allow selecting different members (currently fixed to Bob).
9. **Selecting different causes should produce different Defender proposals** (currently only changes the log and labels).

### 2.3 Not Yet Done (Decide Based on Time, P2)

- Manually add and delete tasks.
- Recalculate after modifying project deadline (Edit project window is currently just visual).
- Mobile-width layout has not been verified page by page.
- No dark mode.
- Accessibility (keyboard navigation, screen readers) has not been systematically checked.
- Notifications (e.g., member assigned a new task).

### 2.4 Explicitly Not Wanted, So Not Done

Login and registration, subscription and payment, complex permissions, admin dashboard.

---

## 3. Business Logic

### 3.1 Data Model

```
Project   { id, name, description, deadline(with timezone), timezone, rubric_text?, assignment_text }
Member    { id, project_id, name, is_leader, strengths:[{skill, level}], weaknesses:[skill],
            availability: Monday to Sunday each {on, hours} }
Task      { id, project_id, title, description, priority(H/M/L), priority_reason,
            depends_on:[task_id], required_skills:[skill], locked, overridden_done,
            assignments:[Assignment] }
Assignment{ member_id, allocated_hours, remaining_hours,
            status(todo/in_progress/done), accept(pending/accepted/rejected), reject_reason? }
ChangeLog { time, actor(AI/Leader/Member), what, before, after }   // recommended to keep even without Activity page
```

### 3.2 Form Validation

**Create**
- Name: non-empty, max 100 characters.
- Member count: integer 2–10.
- Assignment: has PDF (≤20 MB, type is PDF) or has pasted text, at least one.
- Deadline: date-time must be later than "now" (compared using project timezone).
- Rubric: can be empty; when empty, inform the user that the AI will attempt to find it from the assignment.

**Team**
- Name non-empty, no duplicates (case-insensitive, ignoring leading/trailing whitespace).
- At least 1 strength, each with a level. At least 1 weakness.
- The same skill cannot be in both strengths and weaknesses.
- Daily hours 0–24; weekly total > 0.
- Member count should equal the count set on the first page; if not, remind but don't block, and don't auto-change.

### 3.3 Capacity and Scheduling (Core)

**Available hours**: A member's capacity for a given day = is the toggle on for that day ? hours : 0. "Today" is day 0; the day of the week determines which day's setting to use.

**A member's remaining work** = sum of remaining hours across all their incomplete, non-rejected assignments.

**Scheduling algorithm** (day by day, by priority, respecting dependencies):

```
1. Put all tasks into "pending". Completed tasks: start = end = -1, do not consume capacity.
2. Repeat:
   a. Find "schedulable" tasks = all their dependencies are already scheduled.
   b. Among schedulable tasks, schedule higher priority first (H→M→L), same priority by number.
   c. For this task:
        Earliest start day = max(end day of dependency tasks) + 1, at least day 0
        For each of its assignments (not rejected, not completed):
            From the earliest start day forward, day by day, take min(remaining capacity that day, hours not yet done),
            until that member's hours are done → record end day
        Task end day = max of all members' end days
        Task start day = min of the first day each member has work
   d. The capacity consumed by that member on that day must be deducted so the next task doesn't reuse it.
3. No schedulable task found but still pending → dependency cycle exists, error.
4. Task has no valid assignments (all rejected) → mark as "blocked", its end day and its successor tasks' end days are treated as infinity.
5. A member cannot finish within 200 days → end day treated as infinity.
```

**Multi-person parallelism per task**: Members of the same task each start from the same day and work independently; the task ends when the last person finishes.

### 3.4 Risk Status (Do Not Set Manually, Always Calculated)

```
Deadline (day number) = deadline date − today
Predicted completion day = max of end days across all incomplete tasks

Status:
  No incomplete tasks              → Complete
  Deadline < 0                      → Overdue
  Predicted completion day > deadline → At Risk     (delay days = predicted completion day − deadline)
  Otherwise                         → On Track
```

- **Member overloaded** = member's remaining work hours > sum of their available hours until the deadline.
- Note: **"No one overloaded" can still be At Risk**. The reason is that the dependency chain is too long or a person's time is concentrated on certain days (our demo project is exactly this situation). So risk alerts should show both "dependency chain" and "individual capacity" factors.
- **Critical path**: Starting from the task with the latest end day, trace backward to find "the incomplete dependency with the latest end day," forming a chain. The Defender's "Main risk" can use this to explain.
- Whenever any of the following occurs, **reschedule and recalculate risk**: task status change, remaining hours change, assignment change, priority change, dependency change, member availability change, deadline change, task rejected, Rescue applied.

### 3.5 Task Status

Task status is not stored manually; it is derived from each assignment's status:

```
Forcibly marked complete (leader override)        → Done
No valid assignments                               → To Do (and marked "needs reassignment")
All valid assignments are Done                     → Done
Any valid assignment is not To Do (in progress or done) → In Progress
Otherwise                                           → To Do
```

- For multi-person tasks, **all members must complete for it to be Done**, unless the leader explicitly overrides (a confirmation dialog must appear, explaining how the schedule will change).
- Rejected assignments do not participate in the calculation.

### 3.6 Progress Calculation

```
Member progress %     = sum of (allocated hours − remaining hours) across all their tasks ÷ sum of allocated hours
Member task count      = completed tasks / tasks they are responsible for
Overall progress       = sum of all members' completed hours ÷ sum of all allocated hours
Overall completed tasks = a task is counted as complete only when all its assignments are Done (do not double-count the same task)
Member status label    = on critical path → "On critical path"; has progress → "On track"; no progress → "Not started"
```

### 3.7 Priority

- Proposed by the AI during Plan generation, based on (in order of importance): rubric score weight and mandatory requirements → how many tasks depend on it → how close the deadline is.
- `priority_reason` should save real numbers; the task detail's "Why this priority" displays it directly, e.g., "worth 4 out of 30 points, 3 tasks depend on it, due in 2 days."
- Leader can manually change priority; changing it triggers rescheduling (higher priority gets capacity first), with a confirmation dialog showing the new predicted completion date.
- Rubric is only used for prioritization; **no separate rubric page is needed**.

### 3.8 Assignment and Matching

Scoring when selecting a person for a task (higher score = more suitable):

```
Skill match  = the member's highest strength level for the task's required skills (0 = none, 1/2/3)
Weakness penalty = the task's required skills are in the member's weaknesses → large penalty (not an absolute prohibition)
Availability = their available hours until deadline − existing remaining work
```

- Look at skill match first, then availability; weakness penalty ranks last.
- If availability is insufficient, cannot assign (unless no one else works either, in which case flag it).
- Large tasks can be split among multiple people; each person's hours must add up to the task's total estimated hours.
- If no one is suitable → report "no suitable member" and let the leader decide (add members, relax requirements).

### 3.9 AI Deadline Defender

**Trigger**: The risk page is shown only when the scheduling result is At Risk or Overdue; On Track shows "no risks." **A cause must be selected before the leader can press Run.** It cannot start automatically. Only the leader can execute.

**Role of the cause**: The cause is passed to the AI and influences the strategy. For example:
- Member unavailable → first clear all of that member's remaining work;
- Member overloaded → prioritize transferring their low-priority, not-yet-started work;
- Deadline moved up → recalculate capacity against the new deadline;
- Task slower than expected → increase the remaining hours of related tasks and reschedule.

**Whether changes need approval** (enforced by the program):

```
Needs leader approval = task is locked  or  member has accepted the assignment  or  the assignment is in progress
Can auto-apply       = none of the above (not started, not accepted, not locked)
Cannot change under any circumstance = completed tasks
```

**Validation loop (max 3 rounds, each starting from the original plan)**:

```
Round 1  Only adjust "auto-applicable" work → reschedule → predicted completion day ≤ deadline?
Round 2  Allow adjusting items needing approval, and allow relaxing dependencies (e.g., summary task doesn't need to wait for all charts) → reschedule → validate
Round 3  Add "reduce scope" (can only affect Low priority tasks, never High) → reschedule → validate
Within each round: max 8 steps, each step tries all candidates (transfer half or all hours to someone with the skill and availability),
         pick the one with the "earliest predicted completion day"; stop if no improvement.
```

**Result determination** (not decided by the AI):

```
There are still undecided "needs approval" changes    → Approval Required
After all decided, rescheduled predicted completion day ≤ deadline → Rescue Validated
After all decided, still late                           → Risk Unresolved (explain remaining constraints, provide reduce-scope option, needs approval)
```

- If the leader rejects a proposal → recalculate the result; may change from Validated to Unresolved.
- **Before vs After** numbers are all calculated by the scheduling program: predicted completion day, risk status, each person's workload, remaining risk (e.g., "no buffer time").
- **Apply**: done in one pass. Steps: re-validate with latest data → apply approved and auto-applicable changes → reschedule → update risk status → write change log. If someone else modified tasks in the meantime, validation failure should prompt a re-run.
- "Discard" does not modify any data.

### 3.10 Member Accept and Reject

- New assignments default to `pending`. Members can Accept or Reject.
- **Reject requires selecting a cause**: not enough time, insufficient skills, too much workload, other (can add explanation).
- After Reject: that assignment is no longer included in scheduling, the task may become "blocked," and a reassignment suggestion is triggered (using the scoring from section 3.8, excluding the rejecting member).
- No one found → report "no suitable member."
- After Accept, that work is considered "needs approval to modify" in the Defender.

### 3.11 Leader Edits Task

- Editable: title, description, priority, target date, each member's allocated and remaining hours, add/remove members, whether to lock.
- Changes that affect scheduling (priority, hours, members) → first calculate old and new predicted completion dates, show "changed from X to Y" in the confirmation dialog, save only after confirmation.
- After modification, affected members must re-Accept (default: only required when hours increase).
- Only the leader can do these.

### 3.12 Edge Case Checklist

| Situation | How to Handle |
|---|---|
| Member removed but still has tasks | Their incomplete assignments become "unassigned," task marked "needs reassignment," and matching suggestion is triggered |
| Member's total weekly available hours = 0 | Cannot save; if already exists, warn and do not assign tasks |
| Total remaining hours > team total available hours | Directly indicate "cannot catch up even with reassignment," Defender prioritizes suggesting scope reduction |
| Dependency cycle | Scheduling error, request AI to regenerate dependencies (should be validated at Plan generation stage) |
| Task fully rejected | Mark "blocked," successor tasks also blocked, predicted completion day is "unpredictable" |
| Deadline has passed | Status Overdue, Defender explains it cannot be completed within the deadline, only provides a "finish as soon as possible" schedule |
| No rubric | Inform as-is, prioritize using only dependencies and deadline |
| AI call fails or times out | Preserve user data, show failure status and provide retry |
| Data modified by someone else during scheduling | Re-validate before applying |
| Timezone | All times stored and compared with timezone |

---

## 4. Suggested Development Order (Remaining Work)

1. **(Priority)** Switch Overview, Tasks, Timeline data from mock to real API-returned pipeline data
2. **(Priority)** Implement real filtering for Tasks search and filter
3. **(Priority)** Edit task saves and triggers rescheduling
4. **(Important)** Defender Apply button actually updates task data
5. **(Important)** Reassignment suggestion UI after Reject
6. **(Follow-up)** Review page reflects real content entered on Create page
7. **(Follow-up)** Mobile width verification, accessibility check

Start with step 1: switch screen data from mock to real API results. Scheduling is already implemented by `scheduler.ts`, no need to rewrite.

---

## 5. Known Limitations

- `scheduler.ts` implements resource-constrained scheduling, but UI screens still use mock data for display, not yet fully connected
- Scheduling treats "day" as the minimum unit: the next task starts the day after the previous one ends. This is conservative; a real product could go down to half-days
- The demo data's "today" is fixed to October 11, 2026 (Sunday); real development should use the real date
- All task counts (badges, open task counts, progress bars, Defender stats) are now dynamic, computed at runtime from `getProjectTK()`, no longer using hardcoded values
- `getProjectTK(projectId)` returns the TK array for SRS, and derives TK-format tasks from PGP member data for other projects
- `getProjectGT(projectId)` returns the GT array for SRS, and derives GT-format Gantt data from PGP member data for other projects
- Mockup 1 (`TaskFlowMockup.tsx`) is still retained in the codebase as reference, but `page.tsx` has switched to Mockup 2 (`TaskFlowMockup2.tsx`)
