import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { loadCanvas } from "./helpers/load-canvas.mjs";

const source = new URL("../.github/extensions/mini-canvas/", import.meta.url);
const plugin = new URL("../plugins/mini-canvas/com.github.copilot/extensions/mini-canvas/", import.meta.url);
const assets = [
    ["index.html", "text/html; charset=utf-8"],
    ["app.mjs", "text/javascript; charset=utf-8"],
    ["styles.css", "text/css; charset=utf-8"],
];

function rawRequest(url, path, method = "GET") {
    return new Promise((resolve, reject) => {
        const req = request(new URL(url), { path, method }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("error", reject);
            res.on("end", () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString(),
            }));
        });
        req.on("error", reject);
        req.end();
    });
}

for (const [name, directory] of [["source", source], ["plugin", plugin]]) {
    test(`${name}: static assets, instance isolation and cleanup`, async (t) => {
        const canvas = await loadCanvas(directory);
        assert.equal(canvas.declaration.id, "minimum-canvas");
        assert.equal(canvas.declaration.displayName, "Minimum Canvas");
        const first = { instanceId: "first" };
        const second = { instanceId: "second" };
        t.after(async () => {
            await canvas.onClose(first);
            await canvas.onClose(second);
        });

        const [a, duplicate, b] = await Promise.all([
            canvas.open(first), canvas.open(first), canvas.open(second),
        ]);
        assert.deepEqual(a, duplicate);
        assert.equal(a.title, "Minimum Canvas");
        assert.equal(new URL(a.url).hostname, "127.0.0.1");
        assert.ok(Number(new URL(a.url).port) > 0);
        assert.notEqual(a.url, b.url);
        for (const [file, type] of assets) {
            const res = await rawRequest(a.url, `/${file}`);
            assert.equal(res.status, 200);
            assert.equal(res.headers["content-type"], type);
            assert.equal(res.body, await readFile(new URL(file, directory), "utf8"));
        }
        assert.equal((await rawRequest(a.url, "/")).body,
            await readFile(new URL("index.html", directory), "utf8"));
        assert.equal((await rawRequest(a.url, "/app.mjs?v=1")).status, 200);
        const head = await rawRequest(a.url, "/styles.css", "HEAD");
        assert.equal(head.status, 200);
        assert.equal(head.body, "");
        for (const path of [
            "/missing", "/extension.mjs", "/copilot-extension.json",
            "/../extension.mjs", "/%2e%2e/extension.mjs", "/%2e%2e%2findex.html",
            "/..\\extension.mjs", "/%00", "/%ZZ", "//index.html",
        ]) {
            assert.equal((await rawRequest(a.url, path)).status, 404, path);
        }
        assert.equal((await rawRequest(a.url, "/", "POST")).status, 405);

        await canvas.onClose(first);
        await assert.rejects(rawRequest(a.url, "/"));
        assert.equal((await rawRequest(b.url, "/")).status, 200);
        await canvas.onClose(first);
        const reopened = await canvas.open(first);
        assert.equal((await rawRequest(reopened.url, "/")).status, 200);
        await canvas.onClose(first);
        await assert.rejects(rawRequest(reopened.url, "/"));
        await canvas.onClose(second);
        await assert.rejects(rawRequest(b.url, "/"));
    });
}

test("missing assets reject open and allow retry; close during startup releases the server", async (t) => {
    const temporary = await mkdtemp(join(tmpdir(), "mini-canvas-lifecycle-"));
    t.after(() => rm(temporary, { recursive: true, force: true }));
    const directory = pathToFileURL(`${temporary}/`);
    await copyFile(new URL("extension.mjs", source), new URL("extension.mjs", directory));
    const canvas = await loadCanvas(directory);
    const ctx = { instanceId: "retry" };
    t.after(() => canvas.onClose(ctx));
    await assert.rejects(canvas.open(ctx), { code: "ENOENT" });
    for (const [file] of assets) {
        await copyFile(new URL(file, source), new URL(file, directory));
    }
    const opening = canvas.open(ctx);
    const closing = canvas.onClose(ctx);
    const { url } = await opening;
    await closing;
    await assert.rejects(rawRequest(url, "/"));
    const reopened = await canvas.open(ctx);
    assert.equal((await rawRequest(reopened.url, "/")).status, 200);
});
