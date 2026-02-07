import { defineWorkspace } from "vitest/config";

// Keep the workspace file lean so the extension only loads a single entry.
export default defineWorkspace(["vitest.config.ts"]);
