import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../.github/extensions/mini-canvas/", import.meta.url);
const destination = new URL("../plugins/mini-canvas/com.github.copilot/extensions/mini-canvas/", import.meta.url);
const files = ["app.mjs", "copilot-extension.json", "extension.mjs", "index.html", "styles.css"];
const check = process.argv.slice(2);
if (check.length > 1 || (check.length === 1 && check[0] !== "--check")) {
    throw new Error("Usage: node scripts/sync-plugin.mjs [--check]");
}

async function checkFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some((entry) => !entry.isFile()) ||
        entries.map((entry) => entry.name).sort().join("\n") !== files.join("\n")) {
        throw new Error(`Expected exactly ${files.join(", ")} in ${fileURLToPath(directory)}`);
    }
}

await checkFiles(source);
if (check.length === 0) {
    await mkdir(destination, { recursive: true });
    for (const name of files) {
        await copyFile(new URL(name, source), new URL(name, destination));
    }
}
await checkFiles(destination);
for (const name of files) {
    const [original, generated] = await Promise.all([
        readFile(new URL(name, source)),
        readFile(new URL(name, destination)),
    ]);
    if (!original.equals(generated)) {
        throw new Error(`${name} is out of sync. Run: node scripts/sync-plugin.mjs`);
    }
}
console.log(check.length ? "Plugin files are in sync." : "Generated and verified Plugin files.");
