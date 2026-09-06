import { getInjectedPiPhiWidgetHost } from "piphi-network-widget-sdk";

const host = getInjectedPiPhiWidgetHost();
const root = document.querySelector("#piphi-widget-root") || document.body;
const context = await host.getContext();
const title = await host.translate("widget.title");
const waiting = await host.translate("widget.waiting");

root.innerHTML = `<style>
  :root{color-scheme:light dark;font:14px/1.4 system-ui,sans-serif}main{box-sizing:border-box;padding:18px;color:CanvasText;background:Canvas}
  h2{font-size:1rem;margin:0 0 14px}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.stat{border:1px solid color-mix(in srgb,CanvasText 16%,transparent);border-radius:11px;padding:10px}
  small,[role=status]{opacity:.68}.value{display:block;font-size:1.35rem;font-weight:750;font-variant-numeric:tabular-nums}.alert{color:#cc4b37}
  h3{font-size:.85rem;margin:16px 0 7px}.clients{list-style:none;margin:0;padding:0}.clients li{display:flex;justify-content:space-between;gap:12px;padding:7px 2px;border-bottom:1px solid color-mix(in srgb,CanvasText 10%,transparent)}
  .online{color:#15945d}.offline{opacity:.62}[role=status]{margin:12px 0 0}@media(min-width:440px){.stats{grid-template-columns:repeat(4,1fr)}}
</style><main dir="${context.localization?.direction || "ltr"}"><h2>${escapeHtml(title)}</h2><section class="stats">
  <div class="stat"><small>Clients online</small><strong class="value" data-key="clients_online">—</strong></div>
  <div class="stat"><small>Known clients</small><strong class="value" data-key="client_count">—</strong></div>
  <div class="stat"><small>Certificate alerts</small><strong class="value alert" data-certificates>—</strong></div>
  <div class="stat"><small>Recent logs</small><strong class="value" data-key="security_log_count">—</strong></div>
</section><h3>Recently observed clients</h3><ul class="clients" data-clients><li>${escapeHtml(waiting)}</li></ul><p role="status">${escapeHtml(waiting)}</p></main>`;

const status = root.querySelector("[role=status]");
const clientsNode = root.querySelector("[data-clients]");
const stop = await host.subscribeState({capabilityIds:["client_count","clients_online","certificates_expiring","certificates_expired","security_log_count","ha_enabled"]},(event)=>{
  status.textContent=event.status||event.kind;if(event.kind!=="snapshot"&&event.kind!=="point")return;const state=extractState(event.data);
  for(const node of root.querySelectorAll("[data-key]")){const value=state[node.dataset.key];if(value!==undefined&&value!==null)node.textContent=formatNumber(value)}
  root.querySelector("[data-certificates]").textContent=formatNumber(Number(state.certificates_expiring||0)+Number(state.certificates_expired||0));
  const clients=Array.isArray(state.clients)?state.clients.slice(0,6):[];clientsNode.innerHTML=clients.length?clients.map((client)=>`<li><span>${escapeHtml(client.name||client.hostname||client.ip_address||client.id)}</span><strong class="${client.online?"online":"offline"}">${client.online?"Online":"Offline"}</strong></li>`).join(""):`<li>${escapeHtml(waiting)}</li>`;
});
window.addEventListener("pagehide",stop,{once:true});await host.ready({height:380});
function extractState(data){return data?.primaryState||data?.state||data?.value||data||{}}function formatNumber(value){const number=Number(value);return Number.isFinite(number)?new Intl.NumberFormat().format(number):"—"}function escapeHtml(value){return String(value).replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[character])}
