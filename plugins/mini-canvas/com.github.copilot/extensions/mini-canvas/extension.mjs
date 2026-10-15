// Extension: tamachine-ai
// A minimal example canvas.
//
// This single-file skeleton is a starting point. For more complex canvases
// (multiple actions with non-trivial logic, shared state, a custom renderer,
// etc.) prefer splitting things out: move each action handler into its own
// function, extract `open`/`onClose` into helpers, and pull large units
// (renderer assets, schema definitions, shared utilities) into sibling files
// imported from this entry point. Keep extension.mjs focused on wiring.

import { createServer } from "node:http";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

// One local HTTP server per open canvas instance. Each instance gets its own
// ephemeral port so multiple canvases (or multiple opens of the same canvas)
// don't collide. Replace this with your real renderer — point a static-file
// server, a Vite/Next dev server, or any framework you like at the same URL.
const servers = new Map();

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Minimum Canvas</title>
  </head>
  <body>
    <h1>Minimum Canvas</h1>
    <p>The canvas extension is running.</p>
  </body>
</html>`;
}

async function startServer() {
    const server = createServer((req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
        throw new Error("Canvas server did not bind to a TCP port");
    }
    const port = address.port;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "minimum-canvas",
            displayName: "Minimum Canvas",
            description: "A minimal example canvas.",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Minimum Canvas", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
