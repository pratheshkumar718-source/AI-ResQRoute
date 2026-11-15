import { useEffect, useState } from 'react'
import { Check, X, AlertOctagon, RefreshCw, ShieldAlert, Radio, Navigation, Eye, ZoomIn, Video, PhoneCall, Sparkles, UserCheck, AlertTriangle } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, Empty, Alert, useAct, DemoNote } from '../components/ui'
import { api, activeAssignment, fmtDT, fmtTime, Incident, resolveEvidenceUrl, ACCIDENT_EVIDENCE_FALLBACK, AiAnalysis, GeminiAnalysis } from '../lib/api'

function parseJsonSafe<T>(val: any): T | null {
  if (!val) return null
  if (typeof val === 'object') return val as T
  try {
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

const pct = (c: number | null) => (c == null ? 'n/a (test trigger)' : Math.round(c * 100) + '%')

function HospitalPanel({ inc }: { inc: Incident }) {
  const act = useAct()
  const { hospitals } = useApp()
  const [recs, setRecs] = useState<any>(null)

  useEffect(() => {
    api.get(`/api/incidents/${inc.id}/hospital-recommendations`)
      .then(setRecs)
      .catch(() => setRecs(null))
  }, [inc.id, inc.status, inc.selected_hospital_id, hospitals])

  if (!recs || !Array.isArray(recs.candidates)) return null
  const noneEligible = !recs.candidates.some((c: any) => c.eligible)

  return (
    <Card title="Hospital Recommendation & Clinical Bed Match">
      <p className="text-xs text-[#666666] mb-2">
        Care Needs: {(recs.needs || []).join(', ') || 'general emergency'} · {recs.disclaimer || 'Automated bed allocation by real-time ICU count'}
      </p>
      {recs.warning && <div className="mb-2"><Alert kind="error">{recs.warning}</Alert></div>}
      <ul className="space-y-2">
        {recs.candidates.map((c: any) => (
          <li
            key={c.hospital?.id || Math.random()}
            className={`border rounded-lg p-3 text-sm transition ${c.hospital?.id === recs.selected_hospital_id
              ? 'border-[#198754] bg-[#F0F9F4] text-[#171717]'
              : 'border-[#E2E8F0] bg-white text-[#171717]'
              }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <b className="text-[#171717]">{c.hospital?.name}</b>{' '}
                {c.eligible ? <Badge s="available">eligible #{c.rank}</Badge> : <Badge s="offline">excluded</Badge>}
                <div className="text-xs text-[#666666] mt-1">
                  {c.eligible ? c.explanation : 'Excluded: ' + (c.excluded_reasons || []).join('; ')}
                </div>
                <div className="text-xs text-[#666666] mt-0.5 font-mono">
                  {c.distance_km} km · ETA {c.eta_min} min (simulated road corridor)
                </div>
              </div>
              {inc.status === 'assessed' && c.hospital?.id !== recs.selected_hospital_id && (c.eligible || (noneEligible && c.hospital?.receiving)) && (
                <Btn
                  v="ghost"
                  onClick={() => act(() => api.post(`/api/incidents/${inc.id}/select-hospital`, { hospital_id: c.hospital.id, override: !c.eligible }), 'Destination updated')}
                >
                  {c.eligible ? 'Select' : 'Override'}
                </Btn>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Incidents() {
  const { incidents, selectedId, setSelectedId, user } = useApp()
  const act = useAct()
  const [zoom, setZoom] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [filter, setFilter] = useState('all')

  const list = incidents.filter(i => filter === 'all' || (filter === 'active' ? !['completed', 'rejected'].includes(i.status) : i.status === filter))
  const sel = incidents.find(i => i.id === selectedId) ?? list[0]

  useEffect(() => {
    if (sel) {
      api.get(`/api/incidents/${sel.id}/tracking`)
        .then(res => setEvents(Array.isArray(res) ? res : (Array.isArray(res?.events) ? res.events : [])))
        .catch(() => setEvents([]))
    } else {
      setEvents([])
    }
  }, [sel?.id, sel?.status, sel?.evidence?.length])

  const a = activeAssignment(sel)
  const last = sel?.assignments?.[sel.assignments.length - 1]

  return (
    <div className="space-y-5 text-[#171717]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#171717] flex items-center gap-2">
            <span>Incidents & Verification</span>
            {user?.role === 'police' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EBF2FA] border border-[#356FA5]/40 text-[#173B68] font-mono">
                Traffic Police Division
              </span>
            )}
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Real-time incident feed, 6-frame visual evidence verification, and Police Green Corridor route clearance.
          </p>
        </div>

        <select
          className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#173B68] shadow-sm"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All Incidents</option>
          <option value="active">Active Only</option>
          <option value="suspected">Suspected (Unverified)</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected (False Alarm)</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Incident List Column */}
        <Card title={`Incident Queue (${list.length})`}>
          {!list.length ? (
            <Empty text="No incidents registered" />
          ) : (
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {list.map(i => {
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
                    <div className="flex justify-between items-center">
                      <b className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                        <span>Incident #{i.id}</span>
                        {i.priority === 'critical' && (
                          <span className="text-[#DC3545] text-[10px] px-1.5 py-0.5 rounded bg-[#FDF2F2] border border-[#DC3545]/30">
                            CRITICAL
                          </span>
                        )}
                        {i.green_corridor && (
                          <span className="text-[#198754] text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F0F9F4] border border-[#198754]/30">
                            🚔 CORRIDOR
                          </span>
                        )}
                      </b>
                      <Badge s={i.status} />
                    </div>
                    <div className="text-xs text-[#666666] mt-1">{i.location_name} · {fmtDT(i.created_at)}</div>
                    <div className="text-[11px] text-[#356FA5] mt-0.5 font-medium">
                      {i.evidence?.length ?? 0} visual evidence frame(s)
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Incident Details Column */}
        {sel ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Traffic Police Green Corridor Control Banner */}
            {(user?.role === 'police' || user?.role === 'admin') && (
              <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg grid place-items-center text-lg font-bold border ${sel.green_corridor
                      ? 'bg-[#F0F9F4] text-[#198754] border-[#198754]/40'
                      : 'bg-[#EBF2FA] text-[#173B68] border-[#356FA5]/30'
                      }`}>
                      🚔
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#171717] text-sm">Police Green Corridor:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${sel.green_corridor
                          ? 'bg-[#F0F9F4] text-[#198754] border-[#198754]/40'
                          : 'bg-[#F7F8FA] text-[#666666] border-[#CBD5E1]'
                          }`}>
                          {sel.green_corridor ? 'ACTIVE (SIGNAL PREEMPTION)' : 'STANDARD TRAFFIC FLOW'}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] mt-0.5">
                        {sel.green_corridor
                          ? 'Intersections along emergency path are cleared. Traffic signals set to green wave priority for emergency ambulance transit.'
                          : 'Traffic signals operate under normal timing. Click to clear route and activate priority green wave.'}
                      </p>
                    </div>
                  </div>
                  <Btn
                    v={sel.green_corridor ? 'danger' : 'success'}
                    onClick={() => act(
                      () => api.post(`/api/incidents/${sel.id}/police-corridor`),
                      sel.green_corridor ? 'Green corridor deactivated — standard traffic resumed' : '🚔 Green corridor activated! Intersections cleared.'
                    )}
                  >
                    {sel.green_corridor ? 'Deactivate Corridor' : '🚔 Clear Route (Green Corridor)'}
                  </Btn>
                </div>
              </div>
            )}

            <Card title={`Incident #${sel.id} — ${sel.location_name}`} right={<Badge s={sel.status} />}>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm mb-4">
                <div>
                  <span className="text-[#666666]">Verification status: </span>
                  <b>{sel.status === 'suspected' ? 'UNVERIFIED (suspected)' : sel.status === 'dispatching' ? 'AUTOMATED DISPATCH (Awaiting Verification)' : sel.status === 'rejected' ? 'Rejected (False Alarm)' : 'Verified Incident'}</b>
                </div>
                <div>
                  <span className="text-[#666666]">Required Fleet: </span>
                  <b>{sel.required_ambulances ?? 1} Ambulance(s)</b>
                </div>
                <div>
                  <span className="text-[#666666]">Detection confidence: </span>
                  <b>{pct(sel.confidence)}</b>
                </div>
                <div>
                  <span className="text-[#666666]">Source: </span>
                  <b>{sel.source === 'ai_model' ? 'PyTorch AI Model (ResNet-18 · resqroute_accident_model.pt)' : sel.source === 'test_trigger' ? 'Test trigger' : sel.source}</b>
                </div>
                <div>
                  <span className="text-[#666666]">Surveillance Camera: </span>
                  <b>{sel.camera_name ?? 'CAM-01 Central Junction'}</b>
                </div>
                <div>
                  <span className="text-[#666666]">Assigned Ambulance: </span>
                  <b className="text-[#173B68]">{last?.ambulance_code ?? 'Nearest Unit AMB-01'} (Rank #1)</b>
                </div>
                <div>
                  <span className="text-[#666666]">Assigned Hospital: </span>
                  <b className="text-[#198754]">{sel.selected_hospital_name || last?.hospital_name || 'City Central General Hospital'}</b>{' '}
                  {sel.selected_hospital_beds !== undefined && (
                    <span className="text-[#666666] font-mono text-xs">({sel.selected_hospital_beds ?? last?.hospital_available_beds ?? 14} free beds)</span>
                  )}
                </div>
                {sel.verified_by && (
                  <div>
                    <span className="text-[#666666]">Verified by: </span>
                    <b>{sel.verified_by}</b>
                  </div>
                )}
              </div>

              {/* 6 Burst Evidence Gallery */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-[#171717] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#173B68]" />
                    <span>Visual Evidence Stream ({sel.evidence?.length ?? 0} Burst Screenshots)</span>
                  </h4>
                  <span className="text-[11px] text-[#666666]">Captured at 3s intervals</span>
                </div>

                {!sel.evidence?.length ? (
                  <p className="text-xs text-[#666666] italic">Waiting for evidence burst upload…</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {sel.evidence.slice(0, 6).map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setZoom(resolveEvidenceUrl(e.url))}
                        className="group relative rounded-lg overflow-hidden border border-[#CBD5E1] hover:border-[#173B68] transition cursor-pointer"
                      >
                        <img
                          src={resolveEvidenceUrl(e.url)}
                          alt={`Evidence frame ${e.seq}`}
                          onError={(ev) => {
                            ev.currentTarget.onerror = null
                            ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
                          }}
                          className="aspect-video object-cover w-full group-hover:scale-105 transition"
                        />
                        <div className="p-1 text-[10px] text-[#666666] bg-[#FAFBFD] border-t border-[#E2E8F0] flex items-center justify-between">
                          <span>Frame {e.seq}</span>
                          <ZoomIn className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Citizen Incident Details & AI Video Assessment */}
              {Boolean(sel.reported_by_user_id || sel.source === 'citizen_report' || sel.reporter_name) && (() => {
                const aiData = parseJsonSafe<AiAnalysis>(sel.ai_analysis)
                const gemData = parseJsonSafe<GeminiAnalysis>(sel.gemini_analysis)

                return (
                  <div className="mb-4 p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-[#EBF2FA] text-[#173B68]">
                          <UserCheck className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-[#173B68]">
                            Citizen Emergency Report
                          </h4>
                          <p className="text-[11px] text-[#666666]">
                            Submitted by {sel.reporter_name || 'Citizen Responder'} ({sel.citizen_relationship || 'Witness'})
                          </p>
                        </div>
                      </div>
                      {sel.reporter_phone && (
                        <a
                          href={`tel:${sel.reporter_phone}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-[#CBD5E1] text-[#173B68] hover:bg-[#F1F5F9] transition"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-[#198754]" />
                          <span>{sel.reporter_phone}</span>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Accident Type</span>
                        <span className="font-bold text-[#171717]">{sel.accident_type || 'Vehicle collision'}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Vehicles Involved</span>
                        <span className="font-bold text-[#171717]">{sel.vehicles_involved ?? 'Unknown'}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Injured Count</span>
                        <span className="font-bold text-[#DC3545]">{sel.injured_count ?? 'Unknown'}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Reporter Role</span>
                        <span className="font-bold text-[#171717] capitalize">{sel.citizen_relationship || 'Witness'}</span>
                      </div>
                    </div>

                    {/* Uploaded Video Player */}
                    {sel.video_url && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#171717]">
                          <Video className="w-4 h-4 text-[#DC3545]" />
                          <span>Uploaded Accident Video Footage</span>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-[#CBD5E1] bg-black max-h-72 flex justify-center">
                          <video
                            controls
                            playsInline
                            className="w-full max-h-72 object-contain"
                            src={resolveEvidenceUrl(sel.video_url)}
                          >
                            Your browser does not support HTML5 video preview.
                          </video>
                        </div>
                      </div>
                    )}

                    {/* ResNet-18 Video AI Detection Result */}
                    {aiData && (
                      <div className="p-3 bg-white rounded-lg border border-[#CBD5E1] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#173B68]" />
                            <span className="text-xs font-bold text-[#171717]">PyTorch ResNet-18 Video Inference</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${aiData.category?.toLowerCase().includes('detected') && !aiData.category?.toLowerCase().includes('no')
                              ? 'bg-[#F0F9F4] text-[#166534] border border-[#198754]/30'
                              : aiData.category?.toLowerCase().includes('inconclusive')
                                ? 'bg-[#FDF9F0] text-[#855B14] border border-[#D69E36]/30'
                                : 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]'
                            }`}>
                            {aiData.category || 'AI Analysis Completed'}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569]">
                          {aiData.summary || aiData.notes || 'Automated frame-by-frame collision signature scan completed.'}
                        </p>
                        {aiData.confidence !== null && aiData.confidence !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-[#666666]">
                              <span>Collision Probability Confidence</span>
                              <span className="font-mono font-bold text-[#171717]">{(aiData.confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${aiData.confidence >= 0.8 ? 'bg-[#DC3545]' : aiData.confidence >= 0.5 ? 'bg-[#D69E36]' : 'bg-[#198754]'
                                  }`}
                                style={{ width: `${Math.min(100, Math.max(5, aiData.confidence * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gemini AI Visual Assessment Card */}
                    {gemData && (
                      <div className="p-3 bg-gradient-to-br from-[#EFF6FF] to-[#FAFBFD] rounded-lg border border-[#93C5FD] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-[#2563EB]" />
                            <span className="text-xs font-bold text-[#1E40AF]">Gemini Vision Incident Assessment</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/40">
                            AI-GENERATED · HUMAN REVIEW REQUIRED
                          </span>
                        </div>

                        {gemData.incident_summary && (
                          <p className="text-xs text-[#1E3A8A] font-medium leading-relaxed">
                            {gemData.incident_summary}
                          </p>
                        )}

                        <div className="grid sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          {gemData.visible_hazards && gemData.visible_hazards.length > 0 && (
                            <div className="bg-white/80 p-2 rounded border border-[#BFDBFE]">
                              <span className="font-bold text-[#DC2626] block mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Visible Hazards
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[#475569]">
                                {gemData.visible_hazards.map((h, i) => (
                                  <li key={i}>{h}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {gemData.observed_collision_indicators && gemData.observed_collision_indicators.length > 0 && (
                            <div className="bg-white/80 p-2 rounded border border-[#BFDBFE]">
                              <span className="font-bold text-[#1E40AF] block mb-1">
                                Collision Indicators
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[#475569]">
                                {gemData.observed_collision_indicators.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {gemData.analysis_limitations && gemData.analysis_limitations.length > 0 && (
                          <p className="text-[10px] text-[#64748B] italic pt-1 border-t border-[#DBEAFE]">
                            Limitations: {gemData.analysis_limitations.join('; ')}. Dispatchers must verify scene reality before allocating critical resources.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Verification & Action Toolbar */}
              {(user?.role === 'admin' || user?.role === 'police') && (
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                  {sel.status === 'suspected' && (
                    <div className="flex flex-wrap gap-2">
                      <Btn v="success" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'confirm' }), 'Incident confirmed — dispatching')}>
                        <Check className="w-4 h-4" />Confirm Accident & Dispatch
                      </Btn>
                      <Btn v="danger" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'escalate' }), 'Escalated as critical — priority dispatch')}>
                        <AlertOctagon className="w-4 h-4" />Escalate (Critical Emergency)
                      </Btn>
                      <Btn v="ghost" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'reject' }), 'Incident rejected')}>
                        <X className="w-4 h-4" />Reject (False Alarm)
                      </Btn>
                    </div>
                  )}
                  {sel.status === 'no_ambulance' && (
                    <div className="space-y-2">
                      <Alert kind="error"><b>No suitable ambulance available.</b> Free up an ambulance unit, then retry.</Alert>
                      <Btn onClick={() => act(() => api.post(`/api/incidents/${sel.id}/dispatch`), 'Dispatch retried')}>
                        <RefreshCw className="w-4 h-4" />Retry Dispatch
                      </Btn>
                    </div>
                  )}
                  {sel.status === 'dispatching' && a?.status === 'offered' && (
                    <Btn v="ghost" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/dispatch`), 'Offer withdrawn, re-dispatched')}>
                      Paramedic Not Responding — Reassign Nearest Unit
                    </Btn>
                  )}
                </div>
              )}

              {sel.hospital_warning && <div className="mt-3"><Alert kind="error">{sel.hospital_warning}</Alert></div>}
            </Card>

            {/* Dispatch Decision Table */}
            {last && (
              <Card title="Autonomous Dispatch Decision Telemetry">
                <p className="text-xs text-[#666666] mb-2">{last.explanation}</p>
                {last.ranking?.length > 0 && (
                  <table className="text-xs mt-2 w-full border-collapse">
                    <thead>
                      <tr className="text-left text-[#666666] border-b border-[#E2E8F0]">
                        <th className="py-1.5">Rank</th>
                        <th className="py-1.5">Ambulance Unit</th>
                        <th className="py-1.5">Road Distance</th>
                        <th className="py-1.5">Estimated ETA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {last.ranking.map((r, k) => (
                        <tr key={k}>
                          <td className="py-1.5 font-bold text-[#173B68]">#{k + 1}</td>
                          <td className="py-1.5 font-medium">{r.code}</td>
                          <td className="py-1.5 font-mono">{r.distance_km} km</td>
                          <td className="py-1.5 font-mono">{r.eta_min} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-xs text-[#666666] mt-2">
                  Active Assignment: <span className="font-semibold text-[#171717]">{last.ambulance_code}</span> — <Badge s={last.status} />
                </p>
              </Card>
            )}

            {sel.assessment && (
              <Card title="Paramedic Crew Assessment">
                <div className="text-xs sm:text-sm space-y-1">
                  <div>Severity: <b>{sel.assessment.severity}</b> · Affected Patients: <b>{sel.assessment.patients}</b></div>
                  <div>Clinical Care Needs: <b>{sel.assessment.needs?.join(', ') || 'General Emergency Stabilization'}</b></div>
                  {sel.assessment.notes && <div className="text-[#666666] mt-1">{sel.assessment.notes}</div>}
                </div>
              </Card>
            )}

            {sel.assessment && <HospitalPanel inc={sel} />}

            {/* Audit Timeline */}
            <Card title="Incident Event Timeline">
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {(Array.isArray(events) ? events : []).filter(e => e.event !== 'position').slice().reverse().map(e => (
                  <li key={e.id} className="flex gap-3 py-1 border-b border-[#E2E8F0] last:border-0">
                    <span className="text-[#666666] font-mono w-20 shrink-0">{fmtTime(e.ts)}</span>
                    <span className="text-[#171717]">{e.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : (
          <Card className="lg:col-span-2"><Empty text="Select an incident from the queue" /></Card>
        )}
      </div>

      {/* Zoom Modal */}
      {zoom && (
        <div
          className="fixed inset-0 bg-black/60 z-[3500] grid place-items-center p-6 backdrop-blur-sm cursor-pointer"
          onClick={() => setZoom(null)}
        >
          <div className="bg-white p-2 rounded-xl max-h-[90vh] max-w-[90vw] shadow-2xl">
            <img
              src={resolveEvidenceUrl(zoom)}
              alt="Enlarged evidence frame"
              onError={(ev) => {
                ev.currentTarget.onerror = null
                ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
              }}
              className="max-h-[80vh] max-w-full rounded-lg object-contain"
            />
            <div className="text-center text-xs text-[#666666] mt-1.5 font-medium">Click anywhere to close preview</div>
          </div>
        </div>
      )}
    </div>
  )
}
