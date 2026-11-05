import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, Spinner, SystemNote } from '../components/ui'
import { api, CLOSED, fmtDT } from '../lib/api'

export default function HistoryPage() {
  const { incidents, hospitals } = useApp()
  const [h, setH] = useState<any>(null)

  useEffect(() => {
    api.get('/api/history').then(setH).catch(() => setH({ audit: [], events: [] }))
  }, [incidents.length, incidents[0]?.status])

  const done = incidents.filter(i => CLOSED.includes(i.status))

  return (
    <div className="space-y-6 text-[#171717]">
      <div className="pb-2 border-b border-[#E2E8F0]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Archived Incident & Audit History</h1>
        <p className="text-xs text-[#666666] mt-0.5">
          Permanent chronological log of closed emergency dispatches, dispatcher verification actions, and system telemetry.
        </p>
      </div>

      <Card title="Resolved Incident Records">
        {!done.length ? (
          <Empty
            text="No completed or resolved emergency records yet"
            hint="Once incidents complete hospital handover or are rejected as false alerts, they archive here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="text-left text-[#666666] border-b border-[#E2E8F0] text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-2">Incident #</th>
                  <th>Location Landmark</th>
                  <th>Timestamp</th>
                  <th>Telemetry Source</th>
                  <th>Assigned Unit</th>
                  <th>Destination Hospital</th>
                  <th>Final Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {done.map(i => {
                  const a = i.assignments.find(x => x.status === 'completed')
                  return (
                    <tr key={i.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="py-2.5 px-2 font-mono font-bold text-[#173B68]">#{i.id}</td>
                      <td className="font-semibold text-[#171717]">{i.location_name}</td>
                      <td className="text-xs text-[#666666]">{fmtDT(i.created_at)}</td>
                      <td className="text-xs font-mono capitalize text-[#171717]">{i.source}</td>
                      <td className="font-mono text-[#173B68] font-bold">{a?.ambulance_code ?? '—'}</td>
                      <td className="text-[#171717]">
                        {hospitals.find(x => x.id === i.selected_hospital_id)?.name ?? '—'}
                      </td>
                      <td>
                        <Badge s={i.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="System Audit Log (Latest Activity)">
        {!h ? (
          <Spinner label="Loading audit trails..." />
        ) : !h?.audit?.length ? (
          <Empty text="No audit entries logged" />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[#666666] border-b border-[#E2E8F0] uppercase tracking-wider text-[11px]">
                  <th className="py-2 px-2">Timestamp</th>
                  <th>Actor ID</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Operational Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {h.audit.map((a: any) => (
                  <tr key={a.id} className="hover:bg-[#F7F8FA] transition font-mono">
                    <td className="py-2 px-2 text-[#666666]">{fmtDT(a.ts)}</td>
                    <td className="font-bold text-[#173B68]">{a.actor}</td>
                    <td className="font-bold text-[#171717]">{a.action}</td>
                    <td className="text-[#666666]">{a.entity} #{a.entity_id}</td>
                    <td className="text-[#171717] truncate max-w-md">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SystemNote />
    </div>
  )
}
