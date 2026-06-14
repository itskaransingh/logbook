## **Atomnik Logbook Dashboard Optimization** 

## **Objective** 

Improve the Atomnik logbook so it feels less like a plain attendance/task tracker and more like a lightweight productivity dashboard for interns and co-founders. 

The system should help interns know what to do, record what they did, feel rewarded for completing work, and give co-founders clear visibility without needing constant manual follow-ups. 

## **1. Navigation Layout [Harsh]** 

## **Current Structure** 

- Updates 

- Today 

- Tasks 

- Account 

## **Suggested Structure** 

- Today 

- Tasks 

- Activity Feed 

## **Requirements** 

- Navigation should be visible at the top of the screen, not the bottom. 

- The Account section does not need its own tab. 

- Replace it with a profile icon/logo in the top-right corner. 

Clicking the profile icon can reveal: 

- Profile 

- Role 

- Settings 

- Sign Out 

This keeps navigation focused on productivity rather than account management. 

## **2. New Section: Activity Feed [Harsh]** 

The Activity Feed should act as the public timeline of meaningful activity within the organisation. 

## **Should Display** 

- Tasks completed by interns 

- Tasks approved by co-founders 

- End-of-day completion updates 

- Co-founder comments and feedback 

- Important milestone achievements 

## **Example** 

## **Pending Approval** 

Sarvika completed Atomnik Webpage UI Development. Awaiting co-founder approval. 

## **Approved** 

Approved by Co-Founder: Sarvika completed Atomnik Webpage UI Development. 

## **Design Principle** 

This section should answer: 

"What happened today?" 

within 10 seconds. 

## **3. Today Section [Harsh]** 

The Today section should feel like an intern's personal command center. 

## **Current** 

Hey Harsh 👋 Friday, June 12 

## **Suggested** 

Hey Harsh 👋 

- [Rotating motivational quote] 

Friday, June 12 

## **Example Quotes** 

- Small wins compound fast. 

- Today's output becomes tomorrow's reputation. 

- Focus now. Flex later. 

- Make progress visible. 

- One clean task at a time. 

## **Requirements** 

- Quote changes every ~5.5 seconds. 

- Tone should feel energetic and human. 

- Avoid corporate-sounding motivation. 

## **4. Task Completion Flow [GPT]** 

A completed task should not immediately disappear. 

## **Flow** 

1. Intern marks task complete. 

2. Task moves to **Pending Approval** . 

3. Co-founder receives approval request. 

4. Any one co-founder can approve. 

5. Task appears in Activity Feed. 

6. Intern receives reward animation. 

## **Statuses** 

- To Do 

- In Progress 

- Pending Approval 

- Approved 

- Needs Changes 

## **Reason** 

Creates accountability and prevents accidental or fake task completion. 

## **5. End-of-Day Completion Flow [Harsh]** 

## **Button Name** 

**Wrap Up My Day** 

## **Confirmation Popup** 

## **Ready to wrap up your day?** 

You've marked your tasks for today. This will send your work summary to the co-founders for approval. 

Buttons: 

- Cancel 

- Yes, Wrap Up 

## **Flow** 

1. Intern wraps up day. 

2. Summary sent to co-founders. 

3. Co-founder approves. 

4. Activity Feed receives completion message. 

## **Example** 

Harsh wrapped up the day successfully. Approved by Co-Founder. Strong finish. 

## **6. Dopamine Reward System** 🌟 **[Harsh]** 

The product should intentionally create positive reinforcement loops. 

## **Small Reward** 

When a task is approved: 

- Mini confetti animation 

- Short feedback message 

Example: 

Nice. One task down. 

## **Bigger Reward** 

When Wrap Up My Day is approved: 

- Larger confetti animation 

- Celebration message 

- Optional streak update 

Example: 

Day approved. You kept the momentum alive. 

## **Design Goal** 

Make completion satisfying without making the product feel childish. 

## **Wrap Up My Day Button Placement** 

The button should feel like the natural final step of the day. 

## **Suggested Behaviour** 

- Sticky button 

- Appears prominently once all tasks are completed/submitted 

- Visually highlighted 

## **Avoid** 

Showing it too early in the workflow. 

The user should feel: 

"I've earned the right to press this." 

## **7. Comments System [Harsh]** 

Co-founders should be able to provide feedback directly on tasks. 

## **Minimum Version** 

- Co-founder comments on task 

- Intern can view comment 

- Task can be marked Needs Changes 

## **Better Version** 

- Threaded comments 

- Emoji reactions 

- User tagging 

- Important comments pushed into Activity Feed 

## **Example** 

Shrenik: Good work. Please add one more screenshot before final approval. 

## **Purpose** 

Transforms the logbook from a tracker into a communication tool. 

## **8. Co-Founder Dashboard [GPT]** 

Create a dedicated dashboard for co-founders. 

## **Quick Visibility** 

- Interns active today 

- Tasks completed 

- Tasks pending approval 

- Missing updates 

- Wrap-up requests 

- Feedback requiring action 

## **Suggested Sections** 

- Pending Approvals 

- Today's Activity 

- Intern Progress 

- Needs Attention 

## **Purpose** 

Reduces management overhead. 

## **9. Streaks & Progress Indicators [GPT]** 

Introduce lightweight progress tracking. 

## **Examples** 

- Daily completion streak 

- Tasks completed today 

- Focus minutes today 

- Weekly consistency score 

- Pending approvals count 

## **Example** 

Today: 3/4 tasks completed | 110 focus minutes | 2-day streak 

## **Rule** 

Keep it simple. 

Avoid turning the product into a gamified scoreboard. 

## **10. Suggested Final App Structure [GPT]** 

## **Today** 

Purpose: Daily dashboard 

Contains: 

- Greeting 

- Rotating quote 

- Work clock 

- Focus timer 

- Hourly updates 

- Today's tasks preview 

## **Tasks** 

Purpose: Task management 

Contains: 

- To Do 

- In Progress 

- Pending Approval 

- Approved 

- Needs Changes 

- Comments 

- New Task button 

## **Activity Feed** 

Purpose: Shared visibility 

Contains: 

- Completed tasks 

- Approved tasks 

- Comments 

- Wrap-ups 

- Milestones 

## **Profile Icon** 

Purpose: Account management 

Contains: 

- Profile 

- Role 

- Settings 

- Sign Out 

## **Priority Ranking** 

## **High Priority** 

- Rename Updates → Activity Feed 

- Move navigation to top 

- Replace Account tab with profile icon 

- Add task approval flow 

- Add Wrap Up My Day 

- Add comments system 

## **Medium Priority** 

- Confetti animations 

- Rotating quotes 

- Better hourly updates 

- Focus timer ↔ task linking 

- Co-founder dashboard 

## **Low Priority** 

- Streaks 

- Emoji reactions 

- Theme customization 

- Quote categories 

## **Intention of the Logbook** 

The biggest shift is moving from: 

## **Passive Record Keeping** 

to 

## **Active Productivity Management** 

## **Desired Productivity Loop** 

Plan Task ↓ Work Using Focus Timer ↓ Update Progress ↓ Complete Task ↓ Get Approval ↓ Receive Reward ↓ Wrap Up Day 

This makes the logbook valuable for both sides: 

## **Interns Gain** 

- Clarity 

- Motivation 

- Accountability 

- Momentum 

## **Co-Founders Gain** 

- Visibility 

- Feedback Loops 

- Progress Tracking 

- Better Management Signals 

