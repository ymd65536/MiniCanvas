# Basic Repository Template

## Overview

## Extension icon

The icon follows the `github/awesome-copilot` canvas convention:

- `.github/plugin/plugin.json` sets `extensions["com.github.copilot"].logo` to `assets/preview.png`.
- `assets/preview.png` (256x256 PNG) sits at the plugin root, and an identical copy sits in
  `.github/extensions/mini-canvas/assets/preview.png` so it ships with the extension folder.

After changing the icon, reinstall the plugin/extension and restart GitHub Copilot app.

### Plugin-layout verification (`plugins/mini-canvas`)

`plugins/mini-canvas/` mirrors the published `github/awesome-copilot` plugin layout:

```text
plugins/mini-canvas/
├── plugin.json                       # extensions["com.github.copilot"].logo = "assets/preview.png"
├── assets/preview.png
└── com.github.copilot/extensions/mini-canvas/
    ├── copilot-extension.json        # {"name": "mini-canvas", "version": 1}
    ├── extension.mjs                 # copy of .github/extensions/mini-canvas/extension.mjs
    └── assets/preview.png
```

Install from the subdirectory, then restart GitHub Copilot app and check the Extensions list:

```sh
copilot plugin install ymd65536/MiniCanvas:plugins/mini-canvas
```

The extension and icon files are copies of the project-scope ones; keep them in sync.
Uninstall any previously installed direct/user-scope `mini-canvas` extension first so the
two do not conflict. Whether the app uses `logo` for the Extensions list is **unverified**:
the SDK has no documented per-canvas icon option.
