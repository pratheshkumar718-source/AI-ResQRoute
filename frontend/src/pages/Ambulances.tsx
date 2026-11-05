import { useApp } from '../lib/store'
import { Card, Badge, Btn, useAct, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { api, ACTIVE_ASG } from '../lib/api'

export default function Ambulances() {
  const { ambulances, hospitals, incidents } = useApp()
  const act = useAct()
  const busyIds = new Set(
    incidents.flatMap(i => i.assignments).filter(a => ACTIVE_ASG.includes(a.status)).map(a => a.ambulance_id)
  )

  return (
    <div className="space-y-6 text-[#171717]">
      <div className="pb-2 border-b border-[#E2E8F0]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Ambulance Fleet Status & Readiness</h1>
        <p className="text-xs text-[#666666] mt-0.5">
          Real-time fleet readiness, paramedic crew assignment, telemetry tracking, and dispatch eligibility.
        </p>
      </div>

      <Card title="Active Emergency Fleet Units">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="text-left text-[#666666] border-b border-[#E2E8F0] text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2">Unit Code</th>
                <th>Assigned Paramedic</th>
                <th>Emergency Contact</th>
                <th>Crew Capability</th>
                <th>Road Telemetry</th>
                <th>Duty Status</th>
                <th>Dispatcher Overwrite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {ambulances.map(a => (
                <tr key={a.id} className="hover:bg-[#F7F8FA] transition">
                  <td className="py-3 px-2 font-mono font-bold text-[#173B68]">{a.code}</td>
                  <td className="font-semibold text-[#171717]">{a.driver_name}</td>
                  <td className="font-mono text-xs text-[#666666]">{a.phone}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30 text-xs font-mono font-bold">
                      {a.crew_level}
                    </span>
                  </td>
                  <td className="text-xs text-[#666666] font-mono">
                    {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                  </td>
                  <td>
                    <Badge s={a.status} />
                    {busyIds.has(a.id) && (
                      <span className="text-xs text-[#DC3545] font-bold ml-1.5">ACTIVE LEG</span>
                    )}
                    {a.note && <div className="text-[11px] text-[#666666] mt-0.5">{a.note}</div>}
                  </td>
                  <td className="space-x-1.5 whitespace-nowrap">
                    {(['available', 'busy', 'offline', 'maintenance'] as const)
                      .filter(s => s !== a.status)
                      .map(s => (
                        <Btn
                          key={s}
                          v="ghost"
                          disabled={busyIds.has(a.id)}
                          onClick={() =>
                            act(() => api.patch(`/api/ambulances/${a.id}`, { status: s }), `${a.code} set to ${s}`)
                          }
                          className="capitalize text-xs py-1 px-2.5"
                        >
                          {s}
                        </Btn>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Live Ambulance Telemetry Map">
        <div className="rounded-lg overflow-hidden border border-[#E2E8F0]">
          <MapView
            ambulances={ambulances}
            hospitals={hospitals}
            incidents={incidents}
            height={360}
          />
        </div>
      </Card>

      <SystemNote />
    </div>
  )
}
