import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, SystemNote } from '../components/ui'
import { api, activeAssignment, CLOSED, fmtTime } from '../lib/api'

const STEPS = ['offered', 'en_route', 'on_scene', 'assessed', 'transporting', 'at_hospital', 'completed']

export default function Tracking() {
  const { incidents, tracking, hospitals, selectedId, setSelectedId } = useApp()
  const [events, setEvents] = useState<any[]>([])
  const open = incidents.filter(i => !CLOSED.includes(i.status) && i.assignments.length)
  const sel = open.find(i => i.id === selectedId) ?? open[0]

  useEffect(() => {
    if (sel) {
      api.get(`/api/incidents/${sel.id}/tracking`)
        .then(res => setEvents(Array.isArray(res) ? res : (Array.isArray(res?.events) ? res.events : [])))
        .catch(() => setEvents([]))
    }
  }, [sel?.id, sel?.status])

  return (
    <div className="space-y-6 text-[#171717]">
      <div className="pb-2 border-b border-[#E2E8F0]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Response Tracking & Audit Progress</h1>
        <p className="text-xs text-[#666666] mt-0.5">
          Audited chronological timeline of roadside telemetry, ambulance transit, and hospital handover milestones.
        </p>
      </div>

      {!open.length ? (
        <Card>
          <Empty
            text="No active emergency responses"
            hint="Confirm or trigger a suspected incident to observe the real-time tracking pipeline."
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card title={`Active Incident Queue (${open.length})`}>
            <ul className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {open.map(i => {
                const a = activeAssignment(i)
                const active = sel?.id === i.id
                return (
                  <li
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer ${active
                        ? 'border-[#173B68] bg-[#EBF2FA] text-[#171717] shadow-sm'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F7F8FA] text-[#171717]'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <b className="font-semibold text-xs sm:text-sm text-[#171717]">Incident #{i.id}</b>
                      <Badge s={i.status} />
                    </div>
                    <div className="text-xs text-[#666666]">{i.location_name}</div>
                    {a && (
                      <div className="text-xs text-[#173B68] mt-1.5 font-mono flex items-center justify-between">
                        <span>{a.ambulance_code}</span>
                        <span>ETA: {Number(tracking[i.id]?.remaining_eta ?? a.remaining_eta ?? 0).toFixed(1)} min</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          {sel && (
            <Card className="lg:col-span-2" title={`Incident #${sel.id} Operational Progression`}>
              {/* Stepper Pills */}
              <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] mb-4">
                <ol className="flex flex-wrap gap-1.5">
                  {STEPS.map(s => {
                    const idx = STEPS.indexOf(s)
                    const cur = STEPS.indexOf(sel.status === 'dispatching' ? 'offered' : sel.status)
                    const isDone = idx < cur
                    const isCurrent = idx === cur
                    return (
                      <li
                        key={s}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition ${isDone
                            ? 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/30'
                            : isCurrent
                              ? 'bg-[#173B68] text-white shadow-sm'
                              : 'bg-white text-[#94A3B8] border border-[#E2E8F0]'
                          }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </li>
                    )
                  })}
                </ol>
              </div>

              {sel.selected_hospital_id && (
                <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs text-[#171717] mb-4 flex justify-between items-center">
                  <span className="text-[#666666]">Destination Medical Facility:</span>
                  <b className="text-[#198754] text-sm font-semibold">
                    {hospitals.find(h => h.id === sel.selected_hospital_id)?.name}
                  </b>
                </div>
              )}

              <h4 className="font-semibold text-xs sm:text-sm text-[#171717] mb-2 uppercase tracking-wider">
                Audited Milestone Timeline
              </h4>
              <ul className="text-xs space-y-2 max-h-72 overflow-y-auto pr-1">
                {(Array.isArray(events) ? events : [])
                  .filter(e => e.event !== 'position')
                  .slice()
                  .reverse()
                  .map(e => (
                    <li
                      key={e.id}
                      className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex gap-3 text-[#171717]"
                    >
                      <span className="font-mono text-[#173B68] w-20 shrink-0 font-bold">{fmtTime(e.ts)}</span>
                      <span className="flex-1">{e.message}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <SystemNote />
    </div>
  )
}
