import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const source = new URL(".github/extensions/mini-canvas/", root);

async function listFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === ".git") continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await listFiles(path));
        else if (entry.isFile()) files.push(path);
    }
    return files;
}

test("all JavaScript parses and all JSON is valid", async () => {
    const files = await listFiles(fileURLToPath(root));
    for (const file of files) {
        if (file.endsWith(".mjs")) {
            const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
            assert.equal(result.status, 0, `${file}\n${result.stderr}`);
        } else if (file.endsWith(".json")) {
            JSON.parse(await readFile(file, "utf8"));
        }
    }
});

test("plugin manifests follow the Agent Plugins 1.0 core contract", async () => {
    const allowed = new Set([
        "$schema", "name", "version", "description", "author", "homepage",
        "repository", "license", "keywords", "extensions",
    ]);
    for (const file of ["plugin.json", "plugins/mini-canvas/plugin.json"]) {
        const manifest = JSON.parse(await readFile(new URL(file, root), "utf8"));
        assert.equal(manifest.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
        assert.match(manifest.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
        assert.ok(manifest.name.length <= 64);
        assert.equal(typeof manifest.version, "string");
        assert.ok(Object.keys(manifest).every((key) => allowed.has(key)));
        assert.equal(manifest.extensions, undefined);
    }
    const metadata = JSON.parse(await readFile(new URL("copilot-extension.json", source), "utf8"));
    assert.deepEqual(metadata, { name: "mini-canvas", version: 1 });
    await readFile(new URL("skills/azure-cost-health-check/SKILL.md", root));
});

test("renderer initializes and clicks increment the counter", async () => {
    const html = await readFile(new URL("index.html", source), "utf8");
    assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css"/);
    assert.match(html, /<script type="module" src="\.\/app\.mjs"><\/script>/);
    const listeners = new Map();
    const elements = {
        "#increment": { disabled: true, addEventListener: (event, handler) => listeners.set(event, handler) },
        "#counter": { textContent: "0" },
        "#status": { textContent: "" },
    };
    const previous = globalThis.document;
    try {
        globalThis.document = { querySelector: (selector) => elements[selector] };
        await import(new URL("app.mjs", source));
        assert.equal(elements["#increment"].disabled, false);
        assert.match(elements["#status"].textContent, /JavaScript is ready/);
        listeners.get("click")();
        listeners.get("click")();
        assert.equal(elements["#counter"].textContent, "2");
    } finally {
        if (previous === undefined) delete globalThis.document;
        else globalThis.document = previous;
    }
});

test("plugin generation detects drift, missing and extra files, and is repeatable", async (t) => {
    function run(directory, ...args) {
        return spawnSync(process.execPath, ["scripts/sync-plugin.mjs", ...args], {
            cwd: directory, encoding: "utf8",
        });
    }
    assert.equal(run(fileURLToPath(root), "--check").status, 0);
    const temporary = await mkdtemp(join(tmpdir(), "mini-canvas-package-"));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    for (const directory of [".github/extensions", "plugins", "scripts"]) {
        await cp(new URL(`${directory}/`, root), join(temporary, directory), { recursive: true });
    }
    const generated = join(temporary, "plugins/mini-canvas/com.github.copilot/extensions/mini-canvas");
    await writeFile(join(generated, "app.mjs"), "out of sync");
    assert.notEqual(run(temporary, "--check").status, 0);
    assert.equal(run(temporary).status, 0);
    assert.equal(run(temporary).status, 0);
    assert.equal(run(temporary, "--check").status, 0);
    await rm(join(generated, "styles.css"));
    assert.notEqual(run(temporary, "--check").status, 0);
    assert.equal(run(temporary).status, 0);
    await writeFile(join(generated, "unexpected.txt"), "unexpected");
    assert.notEqual(run(temporary, "--check").status, 0);
    assert.notEqual(run(temporary, "--invalid").status, 0);
});
