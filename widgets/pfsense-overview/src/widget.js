import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const [context, settings, translatedTitle, waiting] = await Promise.all([
  host.getContext(), host.getSettings(), host.translate("widget.title"), host.translate("widget.waiting"),
]);

root.innerHTML = `
  <style>
    :root{color-scheme:only light;font:var(--piphi-widget-font-size,14px)/var(--piphi-widget-line-height,1.4) var(--piphi-widget-font-family,system-ui,sans-serif);--pfsense-label-size:var(--piphi-widget-font-size-label,.75rem);--pfsense-value-size:var(--piphi-widget-font-size-value,1.125rem)}
    *{box-sizing:border-box}html,body{margin:0;background:transparent}main{padding:10px;color:var(--piphi-widget-text,CanvasText);background:transparent}
    header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}h2{margin:0;font-size:1rem}.health{display:inline-flex;align-items:center;gap:6px;color:var(--piphi-widget-text-muted,currentColor);font-size:.76rem;font-weight:700}
    .dot{width:8px;height:8px;border-radius:50%;background:#94a3b8}.live .dot{background:var(--piphi-widget-success,#16a36a);box-shadow:0 0 0 3px color-mix(in srgb,var(--piphi-widget-success,#16a36a) 18%,transparent)}.offline .dot{background:var(--piphi-widget-danger,#d04444)}
    .resources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(52px,auto);gap:6px}.card{min-height:52px;min-width:0;display:flex;flex-direction:column;justify-content:center;border:1px solid var(--piphi-widget-border,color-mix(in srgb,currentColor 14%,transparent));border-radius:var(--piphi-widget-radius,11px);padding:5px 8px;background:var(--piphi-widget-surface-muted,transparent)}
    .value{display:block;margin-top:1px;font-size:var(--pfsense-value-size);line-height:1.15;font-weight:750;font-variant-numeric:tabular-nums}small,[role=status]{color:var(--piphi-widget-text-muted,currentColor)}small{display:block;font-size:var(--pfsense-label-size);line-height:1.2}[role=status]{margin:7px 0 0;font-size:var(--pfsense-label-size)}main[data-state="live"] [role=status]{display:none}
    @media(max-width:360px){main{padding:8px}.card{padding-inline:7px}}@media(max-width:240px){.resources{grid-template-columns:1fr}.card{flex-direction:row;justify-content:space-between;align-items:center}.value{margin:0}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
  </style>
  <main dir="${context.localization?.direction || "ltr"}">
    <header><h2>${escapeHtml(settings.title || (translatedTitle === "widget.title" ? "Internet & router" : translatedTitle))}</h2><span class="health" data-health><span class="dot"></span><span data-health-text>Checking</span></span></header>
    <section class="resources" aria-label="Internet and router health"><div class="card"><small>Connection issues</small><strong class="value" data-key="gateways_offline">—</strong></div><div class="card"><small>Services needing attention</small><strong class="value" data-key="services_down">—</strong></div><div class="card"><small>Processor use</small><strong class="value"><span data-key="cpu_usage_percent">—</span>%</strong></div><div class="card"><small>Memory use</small><strong class="value"><span data-key="memory_usage_percent">—</span>%</strong></div></section>
    <p role="status">${escapeHtml(waiting === "widget.waiting" ? "Waiting for router data" : waiting)}</p>
  </main>`;

const status = root.querySelector("[role=status]");
const card = root.querySelector("main");
const health = root.querySelector("[data-health]");
const healthText = root.querySelector("[data-health-text]");
const capabilities = ["connected", "cpu_usage_percent", "memory_usage_percent", "gateways_online", "gateways_offline", "services_down", "vpn_tunnels_up"];
const state = {};
function renderState(data, message = "") {
  status.textContent = message;
  card.dataset.state = message === "" ? "live" : "loading";
  mergeState(state, data);
  for (const node of root.querySelectorAll("[data-key]")) { const value = state[node.dataset.key]; if (value !== undefined && value !== null) node.textContent = formatNumber(value); }
  if (state.connected === undefined) return;
  const connectedState = String(state.connected ?? "").toLowerCase();
  const connected = state.connected === true
    || state.connected === 1
    || ["1", "true", "connected", "online", "open", "up"].includes(connectedState);
  health.className = `health ${connected ? "live" : "offline"}`;
  healthText.textContent = connected ? "Online" : "Offline";
  card.dataset.state = connected ? "live" : "offline";
}
let resizeFrame = 0;
function reportContentHeight() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    void host.setHeight(Math.ceil(card.scrollHeight)).catch(() => undefined);
  });
}
const resizeObserver = new ResizeObserver(reportContentHeight);
resizeObserver.observe(card);
await host.ready({ height: Math.ceil(card.scrollHeight) });
const stops = [];
const selectedCapabilities = (context.bindings || [])
  .map((slot) => slot.binding?.capabilityId)
  .filter((capabilityId) => capabilities.includes(capabilityId));
renderState(await host.getCapabilityState({ capabilityIds: selectedCapabilities, forceRefresh: true }));
stops.push(await host.subscribeState({ capabilityIds: selectedCapabilities }, (event) => {
  status.textContent = statusText(event);
  if (event.kind !== "snapshot" && event.kind !== "point") return;
  renderState(event.data, statusText(event));
}));

window.addEventListener("pagehide", () => {
  cancelAnimationFrame(resizeFrame);
  resizeObserver.disconnect();
  for (const stop of stops) stop();
}, { once: true });
function statusText(event) {
  const value = String(event.status || event.kind || "").trim().toLowerCase();
  if (["snapshot", "point", "open", "online", "ready", "connected", "live"].includes(value)) return "";
  if (["loading", "connecting", "reconnecting"].includes(value)) return "Updating router status…";
  if (value === "stale") return "Last update may be delayed";
  if (value === "offline") return "Router is offline";
  if (["error", "denied"].includes(value)) return "Unable to update router status";
  return "Waiting for router data";
}
function mergeState(target, data) {
  if (Array.isArray(data?.states)) for (const item of data.states) {
    const capabilityId = item?.capability_id || item?.capabilityId;
    if (capabilityId) target[capabilityId] = item.value;
  }
  if (data?.primaryState?.capability_id) target[data.primaryState.capability_id] = data.primaryState.value;
  if (data?.capabilityId) target[data.capabilityId] = data.value;
  const legacy = data?.state || (data?.primaryState?.capability_id ? null : data?.primaryState);
  if (legacy && typeof legacy === "object") Object.assign(target, legacy);
}
function formatNumber(value) { const number = Number(value); return Number.isFinite(number) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number) : "—"; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
