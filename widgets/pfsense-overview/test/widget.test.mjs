import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile(new URL("../widget.manifest.json", import.meta.url)));

test("widget declares a sandboxed, read-only runtime contract", () => {
  assert.equal(manifest.id, "io.piphi.pfsense.overview");
  assert.deepEqual(manifest.binding_modes, ["read"]);
  assert.deepEqual(manifest.security.permissions, []);
  assert.ok(manifest.capability_requirements.includes("connected"));
});
