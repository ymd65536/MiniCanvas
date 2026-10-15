import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const servers = new Map();
const files = [
    ["index.html", "text/html; charset=utf-8"],
    ["app.mjs", "text/javascript; charset=utf-8"],
    ["styles.css", "text/css; charset=utf-8"],
];

async function startServer() {
    // Read before listening so missing assets fail open() rather than render a blank panel.
    const assets = new Map(await Promise.all(files.map(async ([name, type]) => [
        `/${name}`,
        { type, body: await readFile(new URL(name, import.meta.url)) },
    ])));
    const server = createServer((req, res) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
            res.writeHead(405, { Allow: "GET, HEAD" });
            res.end();
            return;
        }

        // Exact routes only: never resolve a request path against the filesystem.
        const path = req.url.split("?")[0];
        const asset = assets.get(path === "/" ? "/index.html" : path);
        if (!asset) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end(req.method === "HEAD" ? undefined : "Not found");
            return;
        }
        res.writeHead(200, {
            "Content-Type": asset.type,
            "Content-Length": asset.body.length,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        });
        res.end(req.method === "HEAD" ? undefined : asset.body);
    });
    server.on("error", (error) => {
        console.error("Minimum Canvas HTTP server error:", error);
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });
    const address = server.address();
    if (!address || typeof address === "string") {
        await stopServer(server);
        throw new Error("Canvas server did not bind to a TCP port");
    }
    return { server, url: `http://127.0.0.1:${address.port}/` };
}

function stopServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
    });
}

await joinSession({
    canvases: [
        createCanvas({
            id: "minimum-canvas",
            displayName: "Minimum Canvas",
            description: "A minimal Canvas Extension template with a click counter.",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    // Store the promise so concurrent opens share one server per instance.
                    entry = startServer();
                    servers.set(ctx.instanceId, entry);
                }
                try {
                    const { url } = await entry;
                    return { title: "Minimum Canvas", url };
                } catch (error) {
                    if (servers.get(ctx.instanceId) === entry) {
                        servers.delete(ctx.instanceId);
                    }
                    throw error;
                }
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    const { server } = await entry;
                    await stopServer(server);
                }
            },
        }),
    ],
});
