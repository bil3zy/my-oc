---
name: improve-opencode-workflow
description: Proactively improve opencode workflow by documenting current state, finding conflicts, asking clarifications, and researching new opencode ecosystem tools. Triggered when context exceeds ~100k tokens or on demand.
---

# Improve OpenCode Workflow

Proactively audit and improve the opencode workflow by capturing current state, detecting conflicts between documentation and behavior, asking targeted clarification questions, and researching opencode ecosystem tools.

## Trigger

- **Automatic**: When context exceeds ~100k tokens
- **Manual**: User invokes via skill tool or explicit request

## Workflow

### Phase 1: Capture Current State

Read and document:
- `~/.config/opencode/opencode.json` - global config, plugins, models
- `~/bahu-project/AGENTS.md` - project-level instructions
- `~/bahu-project/CONTEXT.md` - domain glossary
- `docs/agents/*.md` - issue tracker, triage labels, domain docs
- `docs/adr/*.md` - architectural decision records
- Active skills list from `~/.config/opencode/skills/`

### Phase 2: Conflict Detection

Check for:

**Reference conflicts**:
- Files referenced in AGENTS.md actually exist
- SKILL.md references point to real files
- Triage labels defined match issue tracker usage

**Behavioral conflicts**:
- AGENTS.md anti-patterns are being followed in code
- Skill descriptions match actual behavior
- Domain terms in CONTEXT.md match code usage

**Documentation drift**:
- Outdated commands or paths
- Missing documentation for established patterns
- Stale ADRs that need updating

### Phase 3: Clarification Loop

Use `grill-me` skill approach to ask targeted questions:

- "Your AGENTS.md says X but code does Y — which is correct?"
- "This ADR was created 6 months ago — is it still valid?"
- "You're experiencing pain point Z — have you considered tool T?"

### Phase 4: Research & Suggest

- Scan opencode marketplace for relevant plugins/skills
- Suggest workflow optimizations
- Propose skill integrations to reduce redundancy

## Output Flow

1. Present findings conversationally
2. Propose specific changes
3. If user approves → implement via `opencode-config` skill

## Leverage Existing Skills

- `grill-me`: Targeted clarification questions
- `opencode-config`: Apply approved changes
- `improve-codebase-architecture`: Cross-reference domain decisions
- `verification-before-completion`: Verify changes applied correctly

## Example Output

```
## Workflow Audit Complete

### Reference Conflicts Found
- AGENTS.md:100 references `docs/agents/triage-labels.md` - EXISTS
- `CONTEXT.md` at root - EXISTS

### Behavioral Conflicts Found
- aiSearchController.js:101 - NOT expanding city names ✓ (following anti-pattern)
- user.js:484,533 - preserving network ID ✓ (following anti-pattern)

### Suggestions
1. Consider adding `opencode-ralph-loop` plugin for automatic context management
2. Domain glossary could use "PropertyOffer" consistently instead of mixing with "listing"

### Proposed Changes
- Create `docs/agents/workflow-audit.md` to track audit history
- Add `context-reset` reminder in AGENTS.md

Approve these changes? (yes/no/per-item)
```

## Notes

- Never auto-apply changes without explicit approval
- Present findings before proposing changes
- Flag conflicts clearly so user can make informed decisions