import { register } from "node:module";

// Replace only the host boundary. Tests still run the real extension and HTTP server.
const sdk = `data:text/javascript,${encodeURIComponent(`
    export const createCanvas = ({ id, displayName, description, open, onClose }) => ({
        declaration: { id, displayName, description }, open, onClose,
    });
    export const joinSession = async ({ canvases }) => {
        globalThis[Symbol.for("mini-canvas.test.canvas")] = canvases[0];
    };
`)}`;
register(`data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
        if (specifier === "@github/copilot-sdk/extension") {
            return { url: ${JSON.stringify(sdk)}, shortCircuit: true };
        }
        return nextResolve(specifier, context);
    }
`)}`, import.meta.url);

let imports = 0;
export async function loadCanvas(directory) {
    await import(new URL(`extension.mjs?test=${imports++}`, directory));
    return globalThis[Symbol.for("mini-canvas.test.canvas")];
}
