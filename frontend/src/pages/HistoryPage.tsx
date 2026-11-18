import { useEffect, useState } from 'react'
import { Folder, Tag, AlertTriangle, CheckCircle2, ShieldCheck, FileText, ChevronRight, Download, Filter } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, Spinner, SystemNote, Btn } from '../components/ui'
import { api, CLOSED, fmtDT } from '../lib/api'

interface LogEntry {
  id?: number | string
  file?: string
  category: string
  folder: string
  tag: string
  tags: string[]
  ts?: string
  actor?: string
  action?: string
  entity?: string
  entity_id?: any
  incident_id?: any
  detail: string
  data?: any
}

export default function HistoryPage() {
  const { incidents, hospitals } = useApp()
  const [h, setH] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  useEffect(() => {
    api.get('/api/history').then(setH).catch(() => setH({ audit: [], events: [], folders: [], records: [] }))
  }, [incidents.length, incidents[0]?.status])

  // Derive completed incidents
  const done = incidents.filter(i => CLOSED.includes(i.status))
  const falseAlarms = incidents.filter(i => i.status === 'rejected')
  const completedIncidents = incidents.filter(i => i.status === 'completed')

  // Combine DB audit logs and structured file logs
  const serverRecords: LogEntry[] = (h?.records || []).map((r: any) => ({
    ...r,
    tags: r.tags || [`[${r.tag || 'LOG'}]`],
  }))

  // Synthesize logs from incidents if backend file logs are empty
  const synthesizedRecords: LogEntry[] = []
  falseAlarms.forEach(fa => {
    synthesizedRecords.push({
      id: `fa-${fa.id}`,
      file: `false_alarm_inc_${fa.id}.json`,
      category: 'false_alarms',
      folder: '📁 False Alarms & Unverified',
      tag: 'FALSE_ALARM',
      tags: ['[FALSE_ALARM]', '[DISMISSED]', '[UNVERIFIED]', `[INCIDENT #${fa.id}]`],
      ts: fa.created_at,
      actor: fa.verified_by || 'Paramedic',
      action: 'dismissed_false_alarm',
      incident_id: fa.id,
      detail: fa.notes || 'Examined camera evidence frames: False alarm / no accident occurred',
      data: fa,
    })
  })

  completedIncidents.forEach(ci => {
    const asg = ci.assignments?.find(a => a.status === 'completed')
    synthesizedRecords.push({
      id: `ho-${ci.id}`,
      file: `handover_inc_${ci.id}.json`,
      category: 'handover',
      folder: '📁 Hospital Admissions & Handover',
      tag: 'HANDOVER',
      tags: ['[HANDOVER_COMPLETED]', '[PATIENT_ADMITTED]', '[BED_ALLOCATED]', `[INCIDENT #${ci.id}]`],
      ts: ci.completed_at || ci.created_at,
      actor: asg?.driver_name || 'Paramedic',
      action: 'handover_completed',
      incident_id: ci.id,
      detail: `Patient safely transferred to ${ci.selected_hospital_name || 'Emergency Bay'}. Bed availability decremented. Unit released to AVAILABLE.`,
      data: ci,
    })
  })

  const auditEntries: LogEntry[] = (h?.audit || []).map((a: any) => {
    let cat = 'audit'
    let folder = '📁 System Audit Trail'
    let tag = 'SYSTEM'
    let tags = ['[SYSTEM]', `[${a.action?.toUpperCase()}]`]

    if (a.action?.includes('false_alarm') || a.action?.includes('rejected')) {
      cat = 'false_alarms'
      folder = '📁 False Alarms & Unverified'
      tag = 'FALSE_ALARM'
      tags = ['[FALSE_ALARM]', '[DISMISSED]']
    } else if (a.action?.includes('verified') || a.action?.includes('accident_detected')) {
      cat = 'verified'
      folder = '📁 Verified Collisions & Rescues'
      tag = 'VERIFIED'
      tags = ['[VERIFIED]', '[CODE_RED]']
    } else if (a.action?.includes('handover') || a.action?.includes('hospital')) {
      cat = 'handover'
      folder = '📁 Hospital Admissions & Handover'
      tag = 'HANDOVER'
      tags = ['[HANDOVER]', '[ADMITTED]']
    }

    return {
      id: `audit-${a.id}`,
      category: cat,
      folder,
      tag,
      tags,
      ts: a.ts,
      actor: a.actor,
      action: a.action,
      entity: a.entity,
      entity_id: a.entity_id,
      detail: a.detail,
    }
  })

  // Merge unique records
  const allLogs: LogEntry[] = [...serverRecords, ...synthesizedRecords, ...auditEntries]
  const uniqueLogs = Array.from(new Map(allLogs.map(item => [item.id || `${item.category}-${item.ts}-${item.detail}`, item])).values())

  // Filter logs by selected folder
  const filteredLogs = selectedFolder === 'all'
    ? uniqueLogs
    : uniqueLogs.filter(l => l.category === selectedFolder)

  const foldersList = [
    { id: 'all', name: '📁 All Incident Logs', count: uniqueLogs.length, desc: 'Unified chronological log archive' },
    { id: 'false_alarms', name: '📁 False Alarms & Unverified (Dismissed)', count: uniqueLogs.filter(l => l.category === 'false_alarms').length, tag: 'FALSE_ALARM', desc: 'Separately filed unverified alerts and false alarms', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
    { id: 'verified', name: '📁 Verified Collisions & Rescues', count: uniqueLogs.filter(l => l.category === 'verified').length, tag: 'VERIFIED', desc: 'Confirmed collisions and active paramedic rescues', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { id: 'handover', name: '📁 Hospital Admissions & Handover', count: uniqueLogs.filter(l => l.category === 'handover').length, tag: 'HANDOVER', desc: 'Patient hospital handovers and bed decrement records', badge: 'bg-blue-100 text-blue-900 border-blue-300' },
  ]

  return (
    <div className="space-y-6 text-[#171717]">
      {/* Page Header */}
      <div className="pb-2 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Structured Incident Logs & Audit Trail</span>
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Archived logs classified into categorized folders with verification tags, false alarm files, and handover telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#666666] bg-white px-3 py-1.5 rounded-lg border border-[#CBD5E1]">
          <Folder className="w-4 h-4 text-[#173B68]" />
          <span>Storage: <b>backend/data/logs/</b></span>
        </div>
      </div>

      {/* Log Folders Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {foldersList.map(f => {
          const active = selectedFolder === f.id
          return (
            <div
              key={f.id}
              onClick={() => setSelectedFolder(f.id)}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${active
                ? 'bg-[#EBF2FA] border-[#173B68] shadow-sm'
                : 'bg-white border-[#E2E8F0] hover:bg-[#F7F8FA]'
                }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-[#171717]">{f.name}</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${active ? 'bg-[#173B68] text-white' : 'bg-[#FAFBFD] text-[#666666] border border-[#CBD5E1]'}`}>
                    {f.count}
                  </span>
                </div>
                <p className="text-[11px] text-[#666666] mt-1 line-clamp-2">{f.desc}</p>
              </div>

              {f.tag && (
                <div className="mt-2.5 pt-2 border-t border-[#E2E8F0]/60 flex items-center gap-1.5 text-[10px] font-mono">
                  <Tag className="w-3 h-3 text-[#356FA5]" />
                  <span className="text-[#356FA5] font-bold">[{f.tag}]</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Structured Log Records Table */}
      <Card
        title={`Log Records in Selected Folder (${filteredLogs.length})`}
        right={
          selectedFolder !== 'all' && (
            <button
              onClick={() => setSelectedFolder('all')}
              className="text-xs text-[#173B68] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View All Folders</span>
            </button>
          )
        }
      >
        {!filteredLogs.length ? (
          <Empty
            text={`No logs filed under "${foldersList.find(f => f.id === selectedFolder)?.name || selectedFolder}"`}
            hint="Records will appear here as incidents are verified, false alarms are rejected, or patients are handed over."
          />
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="text-left text-[#666666] border-b border-[#E2E8F0] text-xs uppercase tracking-wider bg-[#FAFBFD]">
                  <th className="py-2.5 px-3">Folder & Tags</th>
                  <th>Timestamp</th>
                  <th>Reporter / Actor</th>
                  <th>Action</th>
                  <th>Incident / Target</th>
                  <th>Operational Detail & Notes</th>
                  <th className="text-right px-3">Log Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLogs.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#F7F8FA] transition">
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${item.category === 'false_alarms'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : item.category === 'verified'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : item.category === 'handover'
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : 'bg-slate-50 text-slate-800 border-slate-300'
                          }`}>
                          {item.folder}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {(item.tags || []).slice(0, 3).map((t, tidx) => (
                            <span key={tidx} className="text-[9px] font-mono font-bold text-[#173B68] bg-[#EBF2FA] px-1.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className="text-xs text-[#666666] font-mono whitespace-nowrap">
                      {fmtDT(item.ts)}
                    </td>

                    <td className="font-semibold text-[#171717] text-xs">
                      {item.actor || 'System'}
                    </td>

                    <td className="text-xs font-mono font-bold capitalize text-[#173B68]">
                      {item.action?.replace(/_/g, ' ') || item.category}
                    </td>

                    <td className="text-xs font-mono text-[#666666]">
                      {item.incident_id ? `#${item.incident_id}` : (item.entity ? `${item.entity} #${item.entity_id || ''}` : '—')}
                    </td>

                    <td className="text-xs text-[#171717] max-w-sm truncate" title={item.detail}>
                      {item.detail}
                    </td>

                    <td className="text-right px-3 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(item)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#173B68] hover:bg-[#EBF2FA] border border-[#CBD5E1] rounded transition cursor-pointer"
                      >
                        Inspect Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resolved Incident Outcomes Overview */}
      <Card title="Resolved Incident Records Summary">
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
                  <th>Verification Outcome</th>
                  <th>Assigned Unit</th>
                  <th>Receiving Hospital</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {done.map(i => {
                  const a = i.assignments?.find(x => x.status === 'completed' || x.status === 'declined')
                  return (
                    <tr key={i.id} className="hover:bg-[#F7F8FA] transition">
                      <td className="py-2.5 px-2 font-mono font-bold text-[#173B68]">#{i.id}</td>
                      <td className="font-semibold text-[#171717]">{i.location_name}</td>
                      <td className="text-xs text-[#666666] font-mono">{fmtDT(i.created_at)}</td>
                      <td>
                        {i.status === 'rejected' ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Dismissed False Alarm
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Verified & Handed Over
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-[#173B68] font-bold">{a?.ambulance_code ?? '—'}</td>
                      <td className="text-[#171717]">
                        {hospitals.find(x => x.id === i.selected_hospital_id)?.name ?? i.selected_hospital_name ?? '—'}
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

      {/* Inspect Log Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-xl overflow-hidden shadow-2xl border border-[#CBD5E1]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 bg-[#FAFBFD] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-[#171717] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#173B68]" />
                  <span>Log File: {selectedLog.file || `${selectedLog.category}_${selectedLog.id}.json`}</span>
                </div>
                <div className="text-xs text-[#666666] mt-0.5">{selectedLog.folder}</div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs font-bold text-[#666666] hover:text-[#171717] p-1.5"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {(selectedLog.tags || []).map((t, idx) => (
                  <span key={idx} className="text-xs font-mono font-bold bg-[#EBF2FA] text-[#173B68] px-2 py-0.5 rounded border border-[#356FA5]/30">
                    {t}
                  </span>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] text-xs space-y-1">
                <div><b>Timestamp:</b> {fmtDT(selectedLog.ts)}</div>
                <div><b>Actor:</b> {selectedLog.actor || 'Paramedic / Dispatch System'}</div>
                <div><b>Operational Action:</b> {selectedLog.action}</div>
                <div><b>Summary:</b> {selectedLog.detail}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#171717] uppercase block mb-1">
                  Structured JSON Payload
                </label>
                <pre className="p-3 rounded-lg bg-[#0F172A] text-[#38BDF8] text-xs font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.data || selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-[#FAFBFD] border-t border-[#E2E8F0] text-right">
              <Btn v="ghost" onClick={() => setSelectedLog(null)}>
                Dismiss
              </Btn>
            </div>
          </div>
        </div>
      )}

      <SystemNote />
    </div>
  )
}
