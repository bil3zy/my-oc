# My OpenCode Config

Personal OpenCode configuration with custom skills, agents, and settings.

## What's Included

- **Custom Skills** - Topic-specific AI workflows (TDD, diagnose, triage, etc.)
- **Custom Agents** - matt-mentor, general, plan agents with Matt Pocock methodology
- **Configuration** - OpenCode settings with multi-provider support

## Quick Setup

### 1. Clone or Copy

```bash
# Clone to config directory
git clone git@github.com:bil3zy/my-oc.git ~/.config/opencode

# Or copy files manually
cp opencode.json ~/.config/opencode/opencode.json
cp -r opencode/skills/ ~/.config/opencode/skills/
cp AGENTS.md ~/.config/opencode/AGENTS.md
```

### 2. Set API Keys

Set via environment variables:

```bash
# In your shell profile (~/.zshrc, ~/.bashrc)
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export MINIMAX_API_KEY="your-minimax-key"
```

Or edit `opencode.json` directly (not recommended for shared repos).

### 3. Verify

```bash
opencode --version
```

## Skills Included

| Skill | Description |
|-------|-------------|
| `tdd` | Test-driven development with red-green-refactor |
| `diagnose` | Root cause analysis for bugs |
| `grill-with-docs` | Alignment and planning sessions |
| `triage` | Issue backlog management |
| `to-prd` | Requirements documentation |
| `to-issues` | Convert plans to tasks |
| `zoom-out` | Codebase context mapping |
| `improve-codebase-architecture` | Architecture improvements |
| `prototype` | Design exploration |
| `matt-mentor` | Matt Pocock workflow mentorship |
| `playwright-skill` | E2E testing with Playwright |
| `verification-before-completion` | Pre-commit verification |

## File Structure

```
my-oc/
├── .gitignore           # Ignores session data, credentials
├── AGENTS.md           # Custom agent definitions
├── opencode.json       # Config (API keys via env vars)
└── opencode/
    └── skills/        # Custom skills
        ├── tdd/
        ├── diagnose/
        └── ...
```

## Troubleshooting

**Skills not loading?**

Check skill paths in `opencode.json`:
```json
{
  "skills": {
    "paths": [".opencode/skills"]
  }
}
```

**API key errors?**

Ensure environment variables are set:
```bash
echo $ANTHROPIC_API_KEY
```

## Adding New Skills

1. Create folder: `opencode/skills/<skill-name>/`
2. Add `SKILL.md` with frontmatter:
   ```markdown
   ---
   name: my-skill
   description: What this skill does
   ---
   
   ## What I do
   ...
   ```
3. Commit and push

## License

MIT