import { Radio, KeyRound } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'
import { activeAssignment, CLOSED, api } from '../lib/api'

export default function LiveMap() {
  const { incidents, ambulances, hospitals, selectedId, setSelectedId, tracking, user } = useApp()
  let list = incidents.filter(i => !CLOSED.includes(i.status))
  if (user?.role === 'driver') {
    list = list.filter(i =>
      i.assignments.some(
        a =>
          a.ambulance_id === user.ambulance_id &&
          ['offered', 'en_route', 'on_scene', 'transporting', 'at_hospital'].includes(a.status)
      )
    )
  }
  const sel = list.find(i => i.id === selectedId) ?? list[0] ?? null
  const a = activeAssignment(sel)
  const route = a && (['offered', 'en_route'].includes(a.status) ? a.scene_route : a.hospital_route)
  const eta = sel ? tracking[sel.id]?.remaining_eta ?? a?.remaining_eta : null

  return (
    <div className="space-y-6 text-[#171717]">
      <div className="pb-2 border-b border-[#E2E8F0]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Live Telemetry & Tactical Map</h1>
        <p className="text-xs text-[#666666] mt-0.5">
          Real-time tracking of ambulance locations, collision coordinates, and receiving trauma hospitals on local street networks.
        </p>
      </div>

      {/* Live Map Collision Detection Status Notice */}
      <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30 grid place-items-center shrink-0 mt-0.5">
            <Radio className="w-4 h-4 animate-pulse text-[#DC3545]" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-[#171717]">Live Map Optical Detection & CCTV Feed Integration</span>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#D69E36]/40">
                DEVELOPING STAGE · API KEYS REQUIRED
              </span>
            </div>
            <p className="text-xs text-[#666666] leading-relaxed max-w-3xl">
              Live automated collision detection across street-level streaming cameras is currently in the active development / pilot stage. Connecting real-world municipal optical feeds requires external <b>Traffic Department GIS API keys</b> and <b>CCTV Media Streaming Gateway tokens</b>. Tactical map currently operates with calibrated road network geometry (OSRM) and verified AI camera coordinates.
            </p>
          </div>
        </div>
        <div className="flex sm:flex-col items-end gap-1.5 shrink-0 text-right">
          <span className="text-[10px] uppercase font-mono font-bold text-[#666666]">Street Network Routing</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#198754] bg-[#F0F9F4] border border-[#198754]/30 px-2 py-0.5 rounded-md font-mono">
            ● OSRM ROAD ROUTING ACTIVE
          </span>
        </div>
      </div>

      <div className="grid xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 rounded-xl overflow-hidden border border-[#CBD5E1] shadow-sm bg-white">
          <MapView
            ambulances={ambulances}
            hospitals={hospitals}
            incidents={incidents}
            focusIncident={sel}
            routes={routesFor(sel)}
            height={560}
            onSelectIncident={setSelectedId}
          />
        </div>

        <div className="space-y-4">
          <Card title="Active Incident Telemetry">
            {!list.length ? (
              <Empty text="No active emergencies" hint="Incidents will appear on the map in real time once detected." />
            ) : (
              <div className="space-y-3.5">
                <select
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#173B68]"
                  value={sel?.id}
                  onChange={e => setSelectedId(+e.target.value)}
                >
                  {list.map(i => (
                    <option key={i.id} value={i.id}>
                      #{i.id} — {i.location_name} ({i.status.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>

                {sel && (
                  <div className="text-xs sm:text-sm space-y-3 text-[#171717]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#666666]">Response Phase</span>
                      <Badge s={sel.status} />
                    </div>

                    {/* Police Traffic & Green Corridor Panel */}
                    <div className={`p-3 rounded-lg border space-y-2 ${sel.green_corridor
                        ? 'bg-[#F0F9F4] border-[#198754]/40 text-[#166534]'
                        : 'bg-[#FAFBFD] border-[#E2E8F0] text-[#171717]'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${sel.green_corridor ? 'bg-[#198754]' : 'bg-[#94A3B8]'}`} />
                          <span>Green Corridor Signal Preemption</span>
                        </span>
                        {(user?.role === 'police' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.post(`/api/incidents/${sel.id}/police-corridor`)
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${sel.green_corridor
                                ? 'bg-[#DC3545] text-white hover:bg-[#BB2D3B]'
                                : 'bg-[#173B68] text-white hover:bg-[#102A4C]'
                              }`}
                          >
                            {sel.green_corridor ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#666666] leading-tight">
                        {sel.green_corridor
                          ? 'Priority traffic signal preemption is ACTIVE. Police escort coordinated; intersections prioritized.'
                          : 'Standard traffic flow. Police can activate Green Corridor above.'}
                      </p>
                    </div>

                    {/* Allocated Paramedic Driver Details */}
                    {a && (
                      <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] space-y-1.5">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-[#173B68] flex justify-between">
                          <span>Allocated Paramedic Fleet</span>
                          <span className="font-mono text-[10px]">{sel.required_ambulances || 1} Unit(s) Required</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#666666]">Unit Code & Driver:</span>
                          <b className="font-mono text-[#171717]">{a.ambulance_code} · {a.driver_name}</b>
                        </div>
                        {a.driver_phone && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#666666]">Driver Contact:</span>
                            <a href={`tel:${a.driver_phone}`} className="text-[#173B68] font-mono hover:underline font-bold">
                              {a.driver_phone}
                            </a>
                          </div>
                        )}
                        {route && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#666666]">Calculated Route:</span>
                            <b>{route.distance_km} km</b>
                          </div>
                        )}
                        {eta != null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-[#666666]">Road Transit ETA:</span>
                            <b className="text-[#173B68] font-mono font-bold">{Number(eta).toFixed(1)} min</b>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Allocated Receiving Hospital Details */}
                    {(() => {
                      const hosp = hospitals.find(h => h.id === sel.selected_hospital_id)
                      if (!hosp) return null
                      return (
                        <div className="p-3 rounded-lg bg-[#F0F9F4] border border-[#198754]/30 space-y-1.5">
                          <div className="text-[11px] uppercase tracking-wider font-bold text-[#198754]">
                            Allocated Receiving Trauma Center
                          </div>
                          <div className="text-xs font-bold text-[#171717]">{hosp.name}</div>
                          <div className="text-[11px] text-[#666666] flex justify-between">
                            <span>Available Beds: <b className="text-[#198754]">{hosp.available_beds}</b> / {hosp.total_beds}</span>
                            <span>ICU: <b className="text-[#DC3545]">{hosp.icu_beds}</b></span>
                          </div>
                          {hosp.phone && (
                            <div className="text-[11px] text-[#666666] flex justify-between pt-1 border-t border-[#198754]/20">
                              <span>Trauma Bay Desk:</span>
                              <a href={`tel:${hosp.phone}`} className="text-[#198754] font-mono font-bold hover:underline">
                                {hosp.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Police Legal Registration Note */}
                    <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-[11px] text-[#666666] space-y-1">
                      <div className="font-semibold text-[#171717]">Police Division Legal Coordination</div>
                      <p>
                        Case incident #{sel.id} synchronized under Section 134 Motor Vehicles Act. Destination hospital and escort notified.
                      </p>
                    </div>

                    {sel.hospital_warning && (
                      <div className="p-2.5 rounded-lg bg-[#FDF2F2] border border-[#DC3545]/30 text-[#DC3545] text-xs">
                        {sel.hospital_warning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Tactical Map Legend">
            <ul className="text-xs space-y-2 text-[#666666]">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DC3545] pulse-emergency" />
                <span className="text-[#171717]">Verified Collision Location</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#173B68]" />
                <span className="text-[#171717]">Receiving Trauma Hospital (H)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#198754]" />
                <span className="text-[#171717]">Ambulance Available (Ready)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[#173B68]" />
                <span className="text-[#171717]">Ambulance En Route (Active)</span>
              </li>
              <li className="flex items-center gap-2 pt-1 border-t border-[#E2E8F0]">
                <span className="h-1.5 w-5 rounded bg-[#173B68]" />
                <span className="text-[#171717]">Stage 1: Unit → Accident Route</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-5 rounded bg-[#198754]" />
                <span className="text-[#171717]">Stage 2: Accident → Hospital Route</span>
              </li>
            </ul>
          </Card>

          <Card title="Traffic & Map API Integration Status">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <div>
                  <div className="font-semibold text-[#171717]">Municipal CCTV Stream API</div>
                  <div className="text-[11px] text-[#666666]">Live optical surveillance feed</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#D69E36]/30 font-semibold shrink-0">
                  Key Required
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
                <div>
                  <div className="font-semibold text-[#171717]">Traffic Department GIS Token</div>
                  <div className="text-[11px] text-[#666666]">Live congestion & signal preemption</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#D69E36]/30 font-semibold shrink-0">
                  Developing Stage
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#171717]">OSRM Road Corridor Engine</div>
                  <div className="text-[11px] text-[#666666]">Street network route geometry</div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F0F9F4] text-[#198754] border border-[#198754]/30 font-semibold shrink-0">
                  Connected (Active)
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <SystemNote />
    </div>
  )
}
