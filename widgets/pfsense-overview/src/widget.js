import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const context = await host.getContext();
const title = await host.translate("widget.title");
const waiting = await host.translate("widget.waiting");

root.innerHTML = `
  <style>
    :root { color-scheme: light dark; font: 14px/1.4 system-ui, sans-serif; }
    main { box-sizing: border-box; min-height: 280px; padding: 18px; color: CanvasText; background: Canvas; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    h2 { margin: 0; font-size: 1rem; }
    .health { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #888; }
    .live .dot { background: #1b9b61; box-shadow: 0 0 0 4px color-mix(in srgb, #1b9b61 18%, transparent); }
    .offline .dot { background: #d04444; }
    .resources, .network { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .network { margin-top: 10px; }
    .card { border: 1px solid color-mix(in srgb, CanvasText 16%, transparent); border-radius: 12px; padding: 11px; }
    .value { display: block; margin-top: 3px; font-size: 1.35rem; font-weight: 750; font-variant-numeric: tabular-nums; }
    small, [role=status] { opacity: .68; }
    [role=status] { margin: 13px 0 0; }
    @media (min-width: 420px) { .network { grid-template-columns: repeat(4, 1fr); } }
  </style>
  <main dir="${context.localization?.direction || "ltr"}">
    <header><h2>${escapeHtml(title)}</h2><span class="health" data-health><span class="dot"></span><span data-health-text>—</span></span></header>
    <section class="resources" aria-label="Resource utilization">
      <div class="card"><small>CPU</small><strong class="value"><span data-key="cpu_usage_percent">—</span>%</strong></div>
      <div class="card"><small>Memory</small><strong class="value"><span data-key="memory_usage_percent">—</span>%</strong></div>
    </section>
    <section class="network" aria-label="Network health">
      <div class="card"><small>Gateways up</small><strong class="value" data-key="gateways_online">—</strong></div>
      <div class="card"><small>Gateways down</small><strong class="value" data-key="gateways_offline">—</strong></div>
      <div class="card"><small>Services down</small><strong class="value" data-key="services_down">—</strong></div>
      <div class="card"><small>VPNs up</small><strong class="value" data-key="vpn_tunnels_up">—</strong></div>
    </section>
    <p role="status">${escapeHtml(waiting)}</p>
  </main>`;

const status = root.querySelector("[role=status]");
const health = root.querySelector("[data-health]");
const healthText = root.querySelector("[data-health-text]");
const stop = await host.subscribeState(
  { capabilityIds: ["connected", "cpu_usage_percent", "memory_usage_percent", "gateways_online", "gateways_offline", "services_down", "vpn_tunnels_up"] },
  (event) => {
    status.textContent = event.status || event.kind;
    if (event.kind !== "snapshot" && event.kind !== "point") return;
    const state = extractState(event.data);
    for (const node of root.querySelectorAll("[data-key]")) {
      const value = state[node.dataset.key];
      if (value !== undefined && value !== null) node.textContent = formatNumber(value);
    }
    const connected = state.connected === true;
    health.className = `health ${connected ? "live" : "offline"}`;
    healthText.textContent = connected ? "Online" : "Offline";
  },
);

window.addEventListener("pagehide", stop, { once: true });
await host.ready({ height: 320 });

function extractState(data) { return data?.primaryState || data?.state || data?.value || data || {}; }
function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number) : "—";
}
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
