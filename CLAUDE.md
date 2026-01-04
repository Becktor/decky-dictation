# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Decky Dictation is a Steam Deck plugin that enables speech-to-text input using Vosk and Nerd Dictation. It runs as a Decky Loader plugin, allowing users to dictate text in games using controller buttons.

## Build Commands

The project uses the [Decky Plugin CLI](https://github.com/SteamDeckHomebrew/cli) for building. Use VS Code tasks from `.vscode/tasks.json`:

- **Full build**: Run the `build` task (runs setup, dependency check, then CLI build)
- **Setup only**: Run the `setup` task (installs dependencies via `pnpm i` and updates DFL)
- **Frontend bundle**: `npm run build` or `pnpm build` (uses rollup to compile TypeScript to `dist/index.js`)
- **Deploy to Deck**: Run the `builddeploy` task (requires Steam Deck SSH config in `.vscode/settings.json`)

The Decky CLI must be available at `./cli/decky` and requires sudo on Linux.

## Architecture

**Frontend (React/TypeScript)**
- `src/index.tsx` - Single file containing all frontend logic
- `DeckyDictationLogic` class - Handles controller input and communicates with backend
- `DeckyDictation` component - Settings UI with enable toggle and push-to-dictate mode
- Uses `@decky/ui` for UI components and `@decky/api` for plugin APIs
- Uses `callable()` from `@decky/api` to call Python backend methods
- Registers for controller input via `window.SteamClient.Input.RegisterForControllerInputMessages`

**Backend (Python)**
- `main.py` - Plugin class with `begin()` and `end()` methods called from frontend via `callable()`
- Spawns `nerd-dictation` subprocess for speech recognition
- Logs to `/tmp/decky-dictation.log` and `/tmp/decky-dictation-std-out.log`

**Binary Dependencies**
- `bin/nerd-dictation/` - Nerd Dictation tool
- `bin/vosk-model-small-en-us-0.15/` - Vosk speech recognition model
- `bin/vosk/` - Vosk Python bindings (set via PYTHONPATH)
- `backend/Dockerfile` - Builds these dependencies from holo-base image

## Controller Button Mapping

Button values for `RegisterForControllerInputMessages` callback:
- L5 (15): Start dictation
- R5 (16): End dictation (toggle mode only)

## Key Limitations

- Only works in-game, not in Steam UI (DISPLAY=:1 hardcoded)
- Works only in first opened game when multiple games are running
