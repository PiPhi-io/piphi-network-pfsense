import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const manifest=JSON.parse(await readFile(new URL("../widget.manifest.json",import.meta.url)));
test("client widget is read-only and permissionless",()=>{assert.deepEqual(manifest.binding_modes,["read"]);assert.deepEqual(manifest.security.permissions,[]);assert.ok(manifest.capability_requirements.includes("clients_online"));});
