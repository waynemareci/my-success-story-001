# Strategy Facilitator — Project Overview

## Vision
An AI-powered goal achievement platform that helps users discover their true, most important goals (which may not be immediately obvious even to themselves), commit to actionable steps, and adaptively track progress with compassionate accountability.

The application is anonymous-first: users are more willing to take risks, be honest, and face failures when human judgment is eliminated from the equation.

## Three Core Components

### 1. Goal Discovery (The Questionnaire)
An interactive, multi-turn LLM-powered conversation that surfaces latent goals — the ones beneath the surface of what users initially say they want.

- Moderate psychological depth: adult life issues (career, relationships, health, finances, purpose) but not deep psychoanalysis or therapy
- Socratic in approach: follow-up questions probe the "why" behind stated goals
- Misalignment detection: if a user's answers across the conversation contradict each other, the system challenges them explicitly rather than accepting surface responses
- The conversation should feel like talking to a thoughtful, curious, non-judgmental friend — not a therapist, not a life coach selling something
- Concludes with a structured summary of agreed-upon goals, confirmed with the user before moving to action planning
- The LLM is expected to do the heavy lifting of determining when goals are sufficiently surfaced vs. when to probe deeper

### 2. Action Planning
Given confirmed goals, the system generates granular, concrete actions required to achieve them.

- Tasks should be specific enough to be unambiguous (not "exercise more" but "walk for 20 minutes after dinner on Monday, Wednesday, Friday")
- Flexible deadlines: timing adapts to user effort and pace rather than rigid calendar targets
- Multiple parallel action tracks may exist for different goals simultaneously
- User is presented with AI-suggested tasks and commits to them (with autonomy to adjust)
- Task decomposition quality is a core differentiator — this must be excellent

### 3. Adaptive Execution Loop
An iterative progress tracking and feedback system that adjusts over time.

- Users check in regularly (daily or weekly, flexible based on preference)
- Check-ins are text-based: user reports what happened, system interprets success or failure
- System is encouraging but does not shy away from calling out failures to execute
- Adaptive difficulty:
  - >80% task completion rate → increase difficulty and ambition of next tasks
  - 40–80% completion rate → maintain current difficulty level
  - <40% completion rate → simplify tasks, focus on smaller wins
- If a user repeatedly fails at tasks associated with a specific goal, the system raises the question of whether the goal should be abandoned or reframed
- No human coaching in MVP — purely AI-driven

## Key Design Principles

**Anonymity First**
No social accountability features in MVP. Users do not share progress with others. The entire experience is private. This reduces fear of judgment and increases willingness to set ambitious or unconventional goals and to honestly report failures.

**Compassionate Accountability**
The system is honest about failures — it does not let users rationalize or ignore missed commitments — but delivers this honesty with encouragement, not shame. Tone should never feel punitive.

**Goal Pivoting**
The system must know when to suggest stopping. Repeated failure on a specific goal is a signal, not just noise. The system should surface this pattern and offer the user a structured conversation about abandoning, reframing, or scaling back the goal.

**Autonomy**
Users choose from AI-suggested tasks rather than having tasks prescribed. The system recommends, the user commits. This increases ownership and follow-through.

## Tech Stack

### MVP Stack
- **Frontend**: React (Next.js preferred for routing and API routes)
- **Backend**: Node.js / Express (or Next.js API routes)
- **Database**: PostgreSQL (chosen over Neo4j for MVP speed; Neo4j reconsidered post-MVP when relationship complexity justifies it)
- **LLM**: Anthropic Claude API (primary), OpenAI as fallback consideration
- **Auth**: Anonymous sessions for MVP (no login required initially)
- **Hosting**: TBD (Vercel for frontend, Railway or Render for backend/DB)
- **Analytics**: Mixpanel or Amplitude (post-MVP)

### Database Schema (Initial Thinking)
Core entities:
- **Users** (anonymized session-based profiles)
- **Goals** (hierarchical: meta-goals → sub-goals, with status tracking)
- **Tasks** (states: pending, in-progress, completed, failed, abandoned)
- **CheckIns** (timestamped self-reports tied to tasks)
- **ConversationHistory** (stored for LLM context in future sessions)
- **MisalignmentFlags** (logged when system challenges user's stated goal)

### LLM Integration Approach
- Anthropic Claude API via `@anthropic-ai/sdk`
- Multi-turn conversation with full history passed on each request
- Structured JSON outputs for goal summaries and task generation
- Separate system prompts for each mode: discovery, planning, check-in, pivot conversation
- API key via environment variable: `ANTHROPIC_API_KEY`

## Market & Business Context

### Target Markets
- **B2C**: Individuals seeking self-improvement, goal clarity, and structured accountability without the cost or vulnerability of human coaching
- **B2B**: 
  - Employee development (L&D departments)
  - Wellness benefits programs (HR)
  - Performance coaching for teams (sales, leadership)
  - White-label licensing to coaches and consultants

### Monetization (MVP)
- **Free tier**: 1 active goal, limited check-ins, basic task generation
- **Paid tier**: $15–20/month
  - Unlimited goals
  - Daily AI coaching interactions
  - Full adaptive difficulty system
  - Progress analytics
- **B2B**: $50–100/user/year, sold in packs of 10+ users

### Competitive Landscape (Research in Progress)
Apps to analyze: Coachello, Akido, GoalsWon, Mentor AI, Noa Coach, Habitica, Rosebud, Reflectly, Woebot, Wysa, Lattice, 15Five

Key differentiators to validate:
- Anonymity-first design
- Deep goal discovery (not surface-level task management)
- Adaptive difficulty
- Psychological sophistication without crossing into therapy

## Developer Context
- Solo developer initially, with plans to bring on collaborators as the product matures
- Strong background in React, Node.js, Neo4j, MongoDB, PostgreSQL
- Experience with Anthropic Claude API and LLM integration
- Existing project: Personal Finance Dashboard (credit card optimization, Plaid integration) — separate codebase, potential future integration point for financial goal tracking
- Currently studying for Series 65 exam (investment advisory) — B2B angle in financial wellness space worth exploring
- Development environment: Windows 11, VSCode, WSL
