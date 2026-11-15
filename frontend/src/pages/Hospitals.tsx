import { useState } from 'react'
import {
  Building2, PhoneCall, Bed, HeartPulse, CheckCircle2, AlertTriangle,
  PlusCircle, ShieldCheck, XCircle, Clock, Stethoscope, RefreshCw, Radio,
  Navigation, Eye, ZoomIn, Activity
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, useAct, Alert, SystemNote, Stat } from '../components/ui'
import { api, Hospital, fmtTime, resolveEvidenceUrl, ACCIDENT_EVIDENCE_FALLBACK } from '../lib/api'

function HospCard({ h, canEdit, isAdmin }: { h: Hospital; canEdit: boolean; isAdmin: boolean }) {
  const act = useAct()
  const { incidents } = useApp()
  const [beds, setBeds] = useState(h.available_beds)
  const [icu, setIcu] = useState(h.icu_beds)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const pct = Math.min(100, Math.round((h.available_beds / Math.max(1, h.total_beds)) * 100))

  // Find incoming patients routed to this hospital
  const incoming = incidents.filter(
    i => i.selected_hospital_id === h.id && ['transporting', 'at_hospital', 'on_scene'].includes(i.status)
  )

  const handleVerify = async () => {
    await act(() => api.post(`/api/hospitals/${h.id}/verify`), `Hospital ${h.name} approved & verified!`)
  }

  const handleReject = async () => {
    await act(() => api.post(`/api/hospitals/${h.id}/reject`), `Hospital ${h.name} rejected.`)
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#173B68] shrink-0" />
          <span className="font-bold text-[#171717] text-base">{h.name}</span>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          {h.status === 'pending_verification' ? (
            <Badge s="pending_verification">Awaiting Admin Verification</Badge>
          ) : (
            <Badge s={h.receiving ? 'receiving' : 'diverted'}>
              {h.receiving ? 'RECEIVING PATIENTS' : 'DIVERTED / FULL'}
            </Badge>
          )}
        </div>
      }
      className={h.status === 'pending_verification' ? 'border-[#D69E36]/40' : ''}
    >
      <div className="space-y-4 text-xs sm:text-sm text-[#171717]">
        {/* Verification Alert Banner if Pending */}
        {h.status === 'pending_verification' && (
          <div className="p-3 rounded-lg bg-[#FDF9F0] border border-[#D69E36]/30 text-[#855B14] text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#D69E36]" />
              Pending verification approval to join network
            </span>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerify}
                  className="px-2.5 py-1 rounded-md bg-[#198754] text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Verify & Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-2.5 py-1 rounded-md bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#DC3545] font-bold text-[11px] border border-[#DC3545]/40 transition cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contact Number Banner */}
        <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#666666]">Emergency Desk & Hotline</div>
            <div className="text-base font-black text-[#173B68] font-mono tracking-wide">{h.phone}</div>
          </div>
          <a
            href={`tel:${h.phone}`}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#EBF2FA] hover:bg-[#DDEBFA] text-[#173B68] border border-[#356FA5]/30 flex items-center gap-1.5 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Desk</span>
          </a>
        </div>

        {/* Patient Inflow & Telemetry */}
        {incoming.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#F0F9F4] border border-[#198754]/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#198754]">
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 animate-pulse text-[#DC3545]" />
                <span>INCOMING PATIENT INTAKE & PRE-ARRIVAL ({incoming.length})</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#198754]/30 text-[#198754]">
                Dijkstra Shortest Route
              </span>
            </div>

            {incoming.map(inc => {
              const asg = inc.assignments?.find(a => ['transporting', 'on_scene', 'at_hospital', 'en_route'].includes(a.status)) || inc.assignments?.[0]
              const assessment = inc.assessment ? (typeof inc.assessment === 'string' ? JSON.parse(inc.assessment) : inc.assessment) : null
              const hRoute = asg?.hospital_route
              const etaMin = hRoute?.eta_min ?? 4
              const distKm = hRoute?.distance_km ?? 2.8

              return (
                <div key={inc.id} className="p-3 rounded-lg bg-white border border-[#198754]/30 space-y-2 text-xs shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="font-bold text-[#171717] text-sm">
                        Incident #{inc.id} — {inc.location_name}
                      </span>
                      <span className="text-[#173B68] font-bold block text-[11px] mt-0.5">
                        🚑 Assigned Unit: {asg?.ambulance_code || 'Nearest Ambulance'} ({asg?.driver_name || 'Driver On Duty'})
                      </span>
                    </div>
                    <Badge s={inc.status} />
                  </div>

                  {/* Route & Pre-Arrival Telemetry */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FAFBFD] p-2 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Dijkstra Shortest ETA</span>
                      <span className="font-mono font-extrabold text-[#173B68] text-xs">
                        ~{etaMin} min ({distKm} km)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Clinical Priority</span>
                      <span className="font-bold text-[#DC3545]">
                        {assessment?.severity ? assessment.severity.toUpperCase() : (inc.priority?.toUpperCase() || 'CRITICAL')}
                        {assessment?.patients ? ` (${assessment.patients} pt)` : ''}
                      </span>
                    </div>
                    {assessment?.needs && assessment.needs.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Pre-Arrival Care: </span>
                        <span className="text-[#173B68] font-semibold">{assessment.needs.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* 6 Burst Evidence Gallery */}
                  {inc.evidence && inc.evidence.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-[#173B68]" />
                          <span>Scene Evidence ({inc.evidence.length} Frames):</span>
                        </span>
                        <span className="text-[10px] text-slate-500">Tap to inspect crash damage</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {inc.evidence.slice(0, 6).map((e, idx) => (
                          <div
                            key={e.id || idx}
                            onClick={() => setZoomUrl(resolveEvidenceUrl(e.url))}
                            className="relative group rounded overflow-hidden border border-slate-300 hover:border-[#173B68] cursor-pointer transition aspect-video"
                          >
                            <img
                              src={resolveEvidenceUrl(e.url)}
                              alt={`Evidence ${idx + 1}`}
                              onError={ev => {
                                ev.currentTarget.onerror = null
                                ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <span className="absolute bottom-0 right-0 bg-black/70 text-[8px] px-0.5 rounded text-white font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Bed Capacity Meters */}
        <div className="space-y-3 pt-1">
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-[#666666] font-medium flex items-center gap-1.5">
                <Bed className="w-4 h-4 text-[#173B68]" />
                <span>Available Emergency Beds</span>
              </span>
              <span className="font-bold text-[#171717]">
                {h.available_beds} / {h.total_beds} ({pct}% Free)
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${pct > 30 ? 'bg-[#198754]' : pct > 10 ? 'bg-[#D69E36]' : 'bg-[#DC3545]'
                  }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0]">
            <span className="text-[#666666] font-medium flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-[#DC3545]" />
              <span>Available ICU Bays</span>
            </span>
            <span className="font-extrabold text-[#171717] font-mono text-sm">
              {h.icu_beds} Bays
            </span>
          </div>

          <div className="text-xs text-[#666666]">
            <span>Capabilities: </span>
            <span className="font-mono text-[#173B68] font-medium">
              {Array.isArray(h.capabilities) ? h.capabilities.join(' · ') : (h.capabilities || 'General Emergency')}
            </span>
          </div>
        </div>

        {/* Edit Bed Inventory (Hospital Staff or Admin) */}
        {canEdit && (
          <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
            <div className="text-xs font-bold text-[#171717] uppercase tracking-wider">
              Update Bed Inventory & Status
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-[#666666] block mb-1">Available Beds</label>
                <input
                  type="number"
                  min={0}
                  max={h.total_beds}
                  value={beds}
                  onChange={e => setBeds(+e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#666666] block mb-1">ICU Bays</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={icu}
                  onChange={e => setIcu(+e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Btn
                v="primary"
                className="flex-1 text-xs py-2"
                onClick={() =>
                  act(
                    () => api.patch(`/api/hospitals/${h.id}`, { available_beds: beds, icu_beds: icu }),
                    `Hospital ${h.name} bed inventory updated!`
                  )
                }
              >
                Save Bed Inventory
              </Btn>

              <button
                type="button"
                onClick={() =>
                  act(
                    () => api.patch(`/api/hospitals/${h.id}`, { receiving: !h.receiving }),
                    `Hospital ${h.name} set to ${!h.receiving ? 'RECEIVING' : 'DIVERTED'}`
                  )
                }
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${h.receiving
                    ? 'bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#DC3545] border-[#DC3545]/30'
                    : 'bg-[#F0F9F4] hover:bg-[#E2F4E9] text-[#198754] border-[#198754]/30'
                  }`}
              >
                {h.receiving ? 'Divert Intake' : 'Resume Receiving'}
              </button>
            </div>
          </div>
        )}
      </div>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-xl overflow-hidden border border-white/20 p-2 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomUrl(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 grid place-items-center text-sm font-bold z-10 transition"
            >
              ✕
            </button>
            <img src={zoomUrl} alt="Evidence Zoom" className="w-full h-auto rounded" />
            <div className="text-center text-xs text-slate-300 mt-2 font-mono">
              Accident Scene Optical CCTV Evidence · Click outside to close
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function Hospitals() {
  const { hospitals, user } = useApp()
  const act = useAct()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [regMsg, setRegMsg] = useState('')

  const [form, setForm] = useState({
    name: '',
    lat: 13.0805,
    lng: 80.2770,
    phone: '+91-44-',
    total_beds: 100,
    available_beds: 15,
    icu_beds: 4,
    capabilities: 'emergency,icu,neuro',
  })

  const isAdmin = user?.role === 'admin'
  const isHospitalStaff = user?.role === 'hospital'

  const displayedHospitals = isHospitalStaff
    ? hospitals.filter(h => h.id === user?.hospital_id)
    : hospitals

  const pendingCount = hospitals.filter(h => h.status === 'pending_verification').length

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setRegMsg('')
    try {
      await act(
        () => api.post('/api/hospitals/register', form),
        'Hospital registration submitted! Awaiting Chief Dispatcher verification.'
      )
      setRegMsg('Registration received! Chief Dispatcher will review and approve your facility.')
      setRegisterOpen(false)
    } catch (e: any) {
      setRegMsg(e.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 text-[#171717]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">
              {isHospitalStaff ? 'Hospital Admission Console' : 'Regional Hospital Network'}
            </h1>
            {isHospitalStaff && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#F0F9F4] text-[#198754] border border-[#198754]/30">
                Facility Portal
              </span>
            )}
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            {isHospitalStaff
              ? 'Private hospital console: Manage open hospital beds, ICU readiness, and incoming ambulance admissions.'
              : 'Central health authority command: Real-time bed oversight, capability triage, and hospital approvals.'}
          </p>
        </div>

        {/* Quick Action: Register New Hospital */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRegisterOpen(true)}
            className="px-4 py-2.5 rounded-lg font-bold text-xs bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Facility</span>
          </button>
        </div>
      </div>

      {/* Admin City-wide Metrics */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total Network Hospitals"
            value={hospitals.length}
            color="bg-[#173B68]"
            icon={<Building2 className="w-5 h-5" />}
          />
          <Stat
            label="Active Receiving Centers"
            value={`${hospitals.filter(h => h.receiving && h.status !== 'pending_verification').length}/${hospitals.length}`}
            color="bg-[#198754]"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <Stat
            label="Available ICU Beds Network-Wide"
            value={hospitals.reduce((acc, h) => acc + (h.icu_beds || 0), 0)}
            color="bg-[#356FA5]"
            icon={<HeartPulse className="w-5 h-5" />}
          />
          <Stat
            label="Pending Facility Approvals"
            value={pendingCount}
            color={pendingCount > 0 ? 'bg-[#D69E36]' : 'bg-[#94A3B8]'}
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Hospital Privacy / Isolation Notice for Staff */}
      {isHospitalStaff && (
        <Alert kind="info">
          <b>Facility Privacy Protection:</b> You are authenticated as {user.name}. You have exclusive access to manage your facility's bed inventory and patient admissions.
        </Alert>
      )}

      {/* Hospital Cards Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedHospitals.map(h => (
          <HospCard
            key={h.id + '-' + h.updated_at}
            h={h}
            canEdit={isAdmin || (isHospitalStaff && user?.hospital_id === h.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {/* Register Facility Modal */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#CBD5E1] rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-base text-[#171717] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#173B68]" />
                <span>Register Emergency Hospital</span>
              </h3>
              <button
                onClick={() => setRegisterOpen(false)}
                className="text-[#666666] hover:text-[#171717] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#171717] block mb-1">Hospital Facility Name *</label>
                <input
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68]"
                  placeholder="e.g. Apollo Emergency Medical Center"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Hotline Phone *</label>
                  <input
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                    value={form.total_beds}
                    onChange={e => setForm({ ...form, total_beds: +e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Available ER Beds</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                    value={form.available_beds}
                    onChange={e => setForm({ ...form, available_beds: +e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Available ICU Beds</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                    value={form.icu_beds}
                    onChange={e => setForm({ ...form, icu_beds: +e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#171717] block mb-1">Clinical Specialties (comma-separated)</label>
                <input
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                  value={form.capabilities}
                  onChange={e => setForm({ ...form, capabilities: e.target.value })}
                  placeholder="emergency,icu,neuro,pediatric,burns"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <Btn v="primary" className="flex-1 py-2.5" busy={busy}>
                  Submit Facility Registration
                </Btn>
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] text-[#666666] hover:bg-[#F7F8FA]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SystemNote />
    </div>
  )
}
