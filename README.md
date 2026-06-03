# Playwright CLI Agent

AI-powered browser automation agent built on [playwright-cli](https://github.com/anthropics/claude-code), enabling Claude Code to interact with web pages through natural language commands.

## Features

- **Playwright CLI Skill** — Full browser automation: navigate, click, fill forms, screenshot, evaluate JS, manage cookies/localStorage, run Playwright tests, record traces and videos
- **Amap Favorites Skill** — Automated management of Amap (高德地图) favorites: export to CSV, batch delete, persistent login via `--persistent` flag

## Project Structure

```
.claude/skills/
├── playwright-cli/          # Core browser automation skill
│   ├── SKILL.md             # Skill definition & command reference
│   └── references/          # Detailed docs for advanced features
│       ├── element-attributes.md
│       ├── playwright-tests.md
│       ├── request-mocking.md
│       ├── running-code.md
│       ├── session-management.md
│       ├── spec-driven-testing.md
│       ├── storage-state.md
│       ├── test-generation.md
│       ├── tracing.md
│       └── video-recording.md
├── amap-favorites/          # Amap map favorites management
│   └── SKILL.md
confirm-all.js               # Helper: click all confirm buttons in modals
delete-faves.js              # Helper: batch delete amap favorites by name
wiki.md                      # Knowledge notes
```

## Usage

These skills are designed to be used with [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Place the `.claude/skills/` directory in your project and invoke via slash commands or natural language.

### Browser Automation Examples

```bash
# Open a browser and navigate
playwright-cli open https://example.com

# Interact with elements (use ref IDs from snapshot)
playwright-cli click e3
playwright-cli fill e5 "hello@example.com" --submit

# Take a snapshot to see current page state
playwright-cli snapshot

# Run custom JS
playwright-cli eval "document.title"
```

### Amap Favorites

```bash
# Open amap favorites page with persistent login
playwright-cli open https://www.amap.com/faves --persistent --head
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+
- `playwright-cli` (installed globally or via npx)
