# Canvas Template Repository

## Purpose

This repository is a starter template for building GitHub Copilot Canvas
extensions. Keep the starter small and easy to adapt. When implementing a
Canvas, replace the example behavior with the requested product behavior rather
than adding unrelated features.

## Project Layout

- `.github/extensions/mini-canvas/` is the canonical Canvas Extension source.
  `extension.mjs` handles SDK registration, static HTTP serving and instance
  lifecycle only. Never embed HTML or CSS in the entry point.
- Implement the screen in `index.html`, browser initialization and DOM/display
  logic in `app.mjs`, and layout/theme styles in `styles.css`.
- `scripts/sync-plugin.mjs` generates the five distribution files under
  `plugins/mini-canvas/com.github.copilot/extensions/mini-canvas/`. Never edit
  those copies manually; generate and commit them with source changes.
- `plugins/mini-canvas/plugin.json` is the Canvas distribution manifest.
  Root `plugin.json` is a separate existing Skill plugin; preserve
  `skills/azure-cost-health-check/SKILL.md` and `LICENSE`.
- `README.md` is the user-facing setup and usage guide. Update it when setup,
  commands, configuration, or the Canvas behavior changes.

Preserve the extension location unless the extension loader configuration is
also updated. Keep an entry point focused on wiring; split substantial action,
rendering, or shared logic into nearby modules when that makes the code easier
to understand.

## Canvas Extension Guidelines

- Use the existing `@github/copilot-sdk/extension` APIs and repository
  conventions. Check the installed SDK types or documentation before relying on
  additional APIs.
- Give every Canvas a stable, unique `id`. Keep its `displayName`,
  `description`, opened title, and README description consistent.
- Keep Canvas ID (`minimum-canvas`), Extension name (`mini-canvas`) and Plugin
  metadata distinct. Preserve the Extension manifest's existing name and numeric
  version unless a task explicitly requires changing them.
- Keep instance-specific resources keyed by `ctx.instanceId`. The example
  supports multiple open instances; do not accidentally share or overwrite
  their servers or state.
- Make `open` return a usable title and renderer URL. If opening allocates
  resources, make `onClose` release them and remove their instance state.
- Bind local development servers to loopback, use an ephemeral port when
  appropriate, and avoid assumptions that a port is available in advance.
- Surface startup and rendering errors instead of silently returning a
  success-shaped fallback.
- Serve only explicitly allowed files with correct MIME types. Never turn a
  request path into an arbitrary filesystem path. Update the server allowlist,
  generation file list and tests together when adding renderer files.
- Do not add secrets, credentials, or machine-specific configuration to the
  repository. Validate and safely handle data crossing the extension/server/
  renderer boundary.
- Avoid introducing a framework, dependency, build system, or configuration
  unless the requested Canvas needs it. Follow the chosen tool's established
  conventions once introduced.
- Use Agent Plugins 1.0 root manifests and fixed `skills/` discovery. Do not add
  undocumented manifest properties or claim Plugin logos are Canvas icons.

## Implementation Workflow

1. Inspect the extension entry point, README, and available project scripts
   before changing the architecture.
2. Implement the smallest complete Canvas behavior that satisfies the request.
   Keep lifecycle cleanup and multiple-instance behavior in scope when touching
   server or state management.
3. Update the README and any directly affected documentation so a new user can
   run and understand the Canvas.
4. Run `node scripts/sync-plugin.mjs`, then
   `node scripts/sync-plugin.mjs --check` and `node --test`. No dependency install
   or build is required. Tests cover syntax, JSON, HTTP, lifecycle, renderer
   behavior and distribution drift; the SDK host boundary is stubbed.
   Reopen the Canvas after renderer edits because assets are read at server
   startup. Distinguish local harness/browser checks from real Copilot app
   registration and Plugin-installation checks.
5. Review the final diff for accidental generated files, secrets, and
   unrelated changes.

Do not claim that a build, test, or runtime check passed unless it was actually
run.
