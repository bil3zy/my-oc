# OpenCode AI Coding Workflow

**Inspired by Matt Pocock's "Skills for Real Engineers"**

## Core Philosophy

Before building anything, ensure alignment. The most common failure mode is misalignment — you think the agent understands, but it didn't. Fix this with a **grilling session** before any implementation.

## The 8-Step Workflow

### Phase 1: Alignment
1. **Grill Session** — For any feature request, use `brainstorming` or `grill-me` skill to interview the user. Ask 40-80 questions until every branch of the decision tree is resolved.
2. **Shared Language** — Establish ubiquitous language. Document project-specific jargon in `CONTEXT.md` for concision.

### Phase 2: Planning
3. **Create PRD** — Use `writing-plans` to synthesize aligned understanding into a Product Requirements Document.
4. **Break to Issues** — Split PRD into vertical slices (not horizontal layers). Each slice cuts across all layers (DB → API → UI) for immediate feedback.

### Phase 3: Execution
5. **Track with TODOs** — Use `todowrite` to create vertical slice tasks with priorities. Mark blocking relationships.
6. **Parallel Agent Work** — Use `task` tool with subagents for independent slices. Sequential plans can only use one agent; vertical slices enable parallelization.

### Phase 4: QA
7. **Verification Before Completion** — Use `verification-before-completion` skill before claiming work is done. Run lint, typecheck, tests.
8. **Regression Test** — Ensure new changes don't break existing functionality.

## Key Principles

| Principle | Why |
|-----------|-----|
| **Vertical slices > horizontal layers** | Full feedback after every issue, not after phase 3 |
| **Grill before building** | Avoid vibe coding — ensure shared mental model |
| **Smart zone is finite (~100k tokens)** | Short, focused sessions with clean context resets |
| **Deep modules** | Shallow, tightly-coupled files = garbage agent output |
| **Shared language** | Concise communication, consistent naming |

## Skill Usage Map

| Matt Pocock's Skill | OpenCode Equivalent |
|---------------------|---------------------|
| `/grill-me` | `brainstorming` or `grill-me` skill |
| `/grill-with-docs` | `brainstorming` + `writing-plans` |
| `/to-prd` | `writing-plans` |
| `/to-issues` | `todowrite` (vertical slices) |
| `/tdd` | `test-driven-development` |
| `/diagnose` | `systematic-debugging` |
| `/improve-codebase-architecture` | `improve-codebase-architecture` |
| `/zoom-out` | Context expansion via `ctx_expand` |
| `/prototype` | Exploratory coding + `todowrite` |
| `/lean-ux-canvas` | `lean-ux-canvas` skill — UX framing, assumption surfacing, experiment design |

## Anti-Patterns to Avoid

- **YOLO mode**: Delegate everything, review nothing
- **Vibe coding**: Skip alignment, go straight to specs
- **Horizontal layering**: DB → API → UI → feedback at the end
- **Shallow modules**: Many small tightly-coupled files

## Default Behavior

For ANY feature request or implementation task:
1. First check if `brainstorming` or `grill-me` applies
2. Then use `writing-plans` to structure the approach
3. Create `todowrite` todos as vertical slices
4. Use `verification-before-completion` before marking done

## Agent Ownership Rules

### Matt-QA: Sole Test File Authority

**Matt-QA** (`agent/matt-qa.md`) is the **only** agent authorized to create, modify, or delete test files. This is enforced by permission rules in `opencode.json`.

| Rule | Detail |
|------|--------|
| **Who** | Only `Matt-QA` sub-agent |
| **Scope** | Write, review, debug, and modify tests |
| **Enforcement** | `edit` permission denies test file patterns for all other agents |
| **Summoning** | Implementation agents invoke via `task` tool after feature code is complete |

**All agents** may read test files and run test suites. **No agent except Matt-QA** may edit test files.

## Context Reset Rule

When context exceeds ~100k tokens (smart zone limit):
- Complete current vertical slice
- Summarize progress
- Start fresh session with summary as context
