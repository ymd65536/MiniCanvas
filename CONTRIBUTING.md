# Contributing

1. Fork the repository and create a feature branch.
2. Edit the canonical files in `.github/extensions/mini-canvas/`. Keep the
   renderer in `index.html`, `app.mjs` and `styles.css`, not in `extension.mjs`.
3. Update [README.md](./README.md) when behavior or usage changes.
4. Generate the Plugin distribution and run the checks:

   ```sh
   node scripts/sync-plugin.mjs
   node scripts/sync-plugin.mjs --check
   node --test
   ```

5. Commit both source and generated files and open a pull request. Describe
   which checks ran and which still need a real GitHub Copilot app session.

See [AGENTS.md](./AGENTS.md) for lifecycle, packaging and scope guidelines.
Do not edit generated Plugin Extension files directly, remove existing Skills,
or add unverified icon settings.
