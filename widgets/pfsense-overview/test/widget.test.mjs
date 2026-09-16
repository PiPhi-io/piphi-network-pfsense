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

test("widget uses a compact, theme-aware host surface", async () => {
  const source = await readFile(new URL("../src/widget.js", import.meta.url), "utf8");
  assert.match(source, /background:transparent/);
  assert.match(source, /data\.states/);
  assert.match(source, /Internet & router/);
  assert.match(source, /Services needing attention/);
  assert.doesNotMatch(source, /Connections working|Secure connections/);
  assert.doesNotMatch(source, /Gateways up|Services down|Live firewall data/);
  assert.equal(manifest.layout.transparent, true);
  assert.equal(manifest.layout.default_height, 160);
  assert.match(source, /host\.ready\(\{ height: Math\.ceil\(card\.scrollHeight\) \}\)/);
  assert.match(source, /host\.setHeight\(Math\.ceil\(card\.scrollHeight\)\)/);
  assert.doesNotMatch(source, /main\{min-height:/);
  assert.match(source, /grid-auto-rows:minmax\(52px,auto\)/);
  assert.match(source, /--piphi-widget-font-size-label/);
  assert.match(source, /--piphi-widget-font-size-value/);
  assert.match(source, /font-size:var\(--pfsense-label-size\)/);
  assert.match(source, /font-size:var\(--pfsense-value-size\)/);
  assert.doesNotMatch(source, /Updated just now/);
  assert.match(source, /main\[data-state="live"\] \[role=status\]\{display:none\}/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /@media\(max-width:360px\)/);
});
