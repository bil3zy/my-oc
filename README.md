# My OpenCode Config

Personal OpenCode configuration with custom skills, agents, and settings.

## What's Included

- **Custom Skills** - Topic-specific AI workflows (TDD, diagnose, triage, etc.)
- **Custom Agents** - matt-mentor, general, plan, ralph, matt-qa agents
- **Plugins** - Research agent, superpowers, ralph-loop, notifier
- **Configuration** - OpenCode settings with multi-provider support

## Quick Setup

### Prerequisites

- OpenCode installed
- Node.js (for npm plugins)
- Python 3 (for research agent hooks)

### Setup on New Machine

```bash
# 1. Clone repo
git clone <repo-url> ~/my-oc

# 2. Install npm dependencies
cd ~/my-oc && npm install

# 3. Create config with your API keys
cp opencode.json.template opencode.json
# Edit opencode.json → replace YOUR_MINIMAX_API_KEY, YOUR_DEEPSEEK_API_KEY

# 4. Backup existing config (if any)
mv ~/.config/opencode ~/.config/opencode.bak

# 5. Symlink config directory
ln -s ~/my-oc ~/.config/opencode
```

### Set API Keys

Edit `opencode.json` (gitignored, safe for real keys):
- `YOUR_MINIMAX_API_KEY` - Minimax API key
- `YOUR_DEEPSEEK_API_KEY` - DeepSeek API key

Template at `opencode.json.template` has placeholders for the repo.

### Verify

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
├── AGENTS.md           # Agent definitions and workflow rules
├── opencode.json       # Config (placeholder API keys)
├── package.json        # NPM dependencies for plugins
├── plugins/            # Local plugins
│   ├── research-agent.js
│   └── superpowers.js
├── agent/              # Agent definitions
│   ├── matt-qa.md
│   └── ralph.md
└── opencode/
    └── skills/         # Custom skills
        ├── tdd/
        ├── diagnose/
        └── ...
```

## Maintenance

### Updating Config

Since `~/.config/opencode` is a symlink to `~/my-oc`, any edit to config files happens in the repo. Commit and push changes:

```bash
cd ~/my-oc
git add -A
git commit -m "describe change"
git push
```

On another machine, pull and re-symlink:

```bash
cd ~/my-oc && git pull && npm install
```

## Troubleshooting

**Skills not loading?**

Check skill paths in `opencode.json`:
```json
{
  "skills": {
    "paths": ["opencode/skills"]
  }
}
```

**Plugin errors?**

Run `npm install` in `~/my-oc/` to ensure dependencies are installed.

**API key errors?**

Replace placeholder values in `opencode.json` with real API keys.

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
