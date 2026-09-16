import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const [context, settings, translatedTitle, waiting] = await Promise.all([
  host.getContext(), host.getSettings(), host.translate("widget.title"), host.translate("widget.waiting"),
]);

root.innerHTML = `<style>
  :root{color-scheme:only light;font:var(--piphi-widget-font-size,14px)/var(--piphi-widget-line-height,1.4) var(--piphi-widget-font-family,system-ui,sans-serif);--pfsense-label-size:var(--piphi-widget-font-size-label,.75rem);--pfsense-value-size:var(--piphi-widget-font-size-value,1.125rem)}*{box-sizing:border-box}html,body{margin:0;background:transparent}main{padding:10px;color:var(--piphi-widget-text,CanvasText);background:transparent}
  h2{font-size:1rem;margin:0 0 8px}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(52px,auto);gap:6px}.stat{min-height:52px;min-width:0;display:flex;flex-direction:column;justify-content:center;border:1px solid var(--piphi-widget-border,color-mix(in srgb,currentColor 14%,transparent));border-radius:var(--piphi-widget-radius,11px);padding:5px 8px;background:var(--piphi-widget-surface-muted,transparent)}
  small,[role=status]{color:var(--piphi-widget-text-muted,currentColor)}small{display:block;font-size:var(--pfsense-label-size);line-height:1.2}.value{display:block;margin-top:1px;font-size:var(--pfsense-value-size);line-height:1.15;font-weight:750;font-variant-numeric:tabular-nums}.alert{color:var(--piphi-widget-danger,#cc4b37)}[role=status]{margin:7px 0 0;font-size:var(--pfsense-label-size)}main[data-state="live"] [role=status]{display:none}
  @media(max-width:300px){main{padding:8px}}@media(max-width:240px){.stats{grid-template-columns:1fr}.stat{flex-direction:row;justify-content:space-between;align-items:center}.value{margin:0}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style><main data-state="loading" dir="${context.localization?.direction || "ltr"}"><h2>${escapeHtml(settings.title || (translatedTitle === "widget.title" ? "Devices & security" : translatedTitle))}</h2><section class="stats" aria-label="Device and security summary"><div class="stat"><small>Devices online</small><strong class="value" data-key="clients_online">—</strong></div><div class="stat"><small>Known devices</small><strong class="value" data-key="client_count">—</strong></div><div class="stat"><small>Certificates expiring</small><strong class="value alert" data-certificates>—</strong></div><div class="stat"><small>Recent security events</small><strong class="value" data-key="security_log_count">—</strong></div></section><p role="status">${escapeHtml(waiting === "widget.waiting" ? "Waiting for device data" : waiting)}</p></main>`;

const status = root.querySelector("[role=status]");
const card = root.querySelector("main");
const capabilities = ["client_count", "clients_online", "certificates_expiring", "certificates_expired", "security_log_count", "ha_enabled", "clients"];
const state = {};
function renderState(data, message = "") {
  status.textContent = message;
  card.dataset.state = message === "" ? "live" : "loading";
  mergeState(state, data);
  for (const node of root.querySelectorAll("[data-key]")) { const value = state[node.dataset.key]; if (value !== undefined && value !== null) node.textContent = formatNumber(value); }
  root.querySelector("[data-certificates]").textContent = formatNumber(Number(state.certificates_expiring || 0) + Number(state.certificates_expired || 0));
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
window.addEventListener("pagehide", () => { cancelAnimationFrame(resizeFrame); resizeObserver.disconnect(); for (const stop of stops) stop(); }, { once: true });
function statusText(event) {
  const value = String(event.status || event.kind || "").trim().toLowerCase();
  if (["snapshot", "point", "open", "online", "ready", "connected", "live"].includes(value)) return "";
  if (["loading", "connecting", "reconnecting"].includes(value)) return "Updating device list…";
  if (value === "stale") return "Last update may be delayed";
  if (value === "offline") return "Router is offline";
  if (["error", "denied"].includes(value)) return "Unable to update device list";
  return "Waiting for device data";
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
function formatNumber(value) { const number = Number(value); return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "—"; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
