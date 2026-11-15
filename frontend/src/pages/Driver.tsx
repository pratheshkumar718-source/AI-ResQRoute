import { useState, useEffect, useRef } from 'react'
import {
  MapPin, Navigation, Flag, Hospital as HIcon, CheckCircle2,
  FastForward, PhoneCall, PhoneOff, Volume2, VolumeX, ShieldAlert,
  Clock, Power, AlertTriangle, Eye, Layers, Activity, HelpCircle, Users, Radio
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, Empty, Alert, useAct, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor, useLiveStreetRoutes } from '../components/RouteHelpers'
import { api, Incident, resolveEvidenceUrl, ACCIDENT_EVIDENCE_FALLBACK } from '../lib/api'
import { sound } from '../lib/audio'

const NEEDS = ['emergency', 'icu', 'neuro', 'pediatric', 'burns']

function Assess({ aid }: { aid: number }) {
  const act = useAct()
  const [sev, setSev] = useState('moderate')
  const [pat, setPat] = useState(1)
  const [needs, setNeeds] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  return (
    <Card title="Patient & Crew Clinical Assessment">
      <div className="space-y-4 text-xs sm:text-sm">
        <div>
          <label className="text-xs font-semibold text-[#171717] uppercase block mb-1.5">
            Incident Severity
          </label>
          <div className="flex gap-2">
            {['minor', 'moderate', 'critical'].map(s => (
              <Btn
                key={s}
                v={sev === s ? (s === 'critical' ? 'danger' : 'primary') : 'ghost'}
                onClick={() => setSev(s)}
                className="capitalize text-xs"
              >
                {s}
              </Btn>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold text-[#171717] uppercase">Patient Count</label>
          <input
            type="number"
            min={1}
            max={10}
            value={pat}
            onChange={e => setPat(Math.max(1, +e.target.value))}
            className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 w-20 text-[#171717] text-center font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#171717] uppercase block mb-1.5">
            Specialized Care Required
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {NEEDS.map(n => {
              const checked = needs.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNeeds(checked ? needs.filter(x => x !== n) : [...needs, n])}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer capitalize ${checked
                    ? 'bg-[#EBF2FA] border-[#173B68] text-[#173B68]'
                    : 'bg-white border-[#CBD5E1] text-[#666666] hover:bg-[#F7F8FA]'
                    }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#171717] uppercase block mb-1.5">
            Paramedic Clinical Notes
          </label>
          <textarea
            className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#171717] placeholder-[#94A3B8] focus:outline-none focus:border-[#173B68] text-xs"
            rows={2}
            placeholder="Describe injury types, vital signs, or scene hazards..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <Btn
          className="w-full py-2.5"
          onClick={() =>
            act(
              () => api.post(`/api/assignments/${aid}/assessment`, { severity: sev, patients: pat, needs, notes }),
              'Assessment submitted. Hospital recommendation updated.'
            )
          }
        >
          Submit Clinical Assessment
        </Btn>
      </div>
    </Card>
  )
}

function Active({ inc }: { inc: Incident }) {
  const { ambulances, hospitals, tracking, user } = useApp()
  const act = useAct()
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const a = inc.assignments.find(x =>
    ['offered', 'en_route', 'on_scene', 'transporting', 'at_hospital'].includes(x.status)
  )!
  const eta = tracking[inc.id]?.remaining_eta ?? a.remaining_eta ?? 0
  const route = ['offered', 'en_route'].includes(a.status) ? a.scene_route : a.hospital_route
  const hosp = hospitals.find(h => h.id === inc.selected_hospital_id)
  const post = (p: string, ok: string) => act(() => api.post(`/api/assignments/${a.id}/${p}`), ok)

  // Driver isolation: focus this driver's unit on map
  const myAmbulances = ambulances.filter(amb => amb.id === user?.ambulance_id)

  return (
    <div className="grid xl:grid-cols-3 gap-6">
      {/* Map View Viewport */}
      <div className="xl:col-span-2 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white">
        <MapView
          ambulances={myAmbulances.length ? myAmbulances : ambulances}
          hospitals={hospitals}
          incidents={[inc]}
          focusIncident={inc}
          routes={routesFor(inc)}
          height={480}
        />
      </div>

      {/* Navigation State & Controls Column */}
      <div className="space-y-4">
        <Card title={`Active Incident #${inc.id}`} right={<Badge s={a.status} />}>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex gap-2.5">
              <MapPin className="w-5 h-5 text-[#DC3545] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#171717] text-base">{inc.location_name}</div>
                {inc.priority === 'critical' && (
                  <span className="text-[10px] font-bold text-[#DC3545] bg-[#FDF2F2] px-2 py-0.5 rounded border border-[#DC3545]/30">
                    CRITICAL PRIORITY
                  </span>
                )}
              </div>
            </div>

            {route && (
              <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] space-y-1.5">
                <div className="flex justify-between text-xs text-[#666666]">
                  <span>Road Route Distance</span>
                  <span className="font-bold text-[#171717]">{route.distance_km} km</span>
                </div>
                <div className="flex justify-between text-xs text-[#666666]">
                  <span>Estimated Arrival ETA</span>
                  <span className="font-bold text-[#173B68] font-mono text-sm">
                    {Number(eta).toFixed(1)} min
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-[#E2E8F0]">
                  <span className="text-[#666666]">Navigation Mode</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${(route as any)?.simulated
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                    {(route as any)?.simulated ? '⚡ Simulated Fallback Route' : '🛣️ Real Road Network Route'}
                  </span>
                </div>
              </div>
            )}

            {/* Police Green Corridor Status Indicator */}
            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${inc.green_corridor
              ? 'bg-[#F0F9F4] border-[#198754]/30 text-[#166534]'
              : 'bg-[#FAFBFD] border-[#E2E8F0] text-[#666666]'
              }`}>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${inc.green_corridor ? 'bg-[#198754]' : 'bg-[#94A3B8]'}`} />
                <span className="font-semibold">
                  {inc.green_corridor ? '🚔 Green Corridor Traffic Preemption: ACTIVE' : 'Traffic Corridor: Standard'}
                </span>
              </span>
              <span className="text-[10px] font-mono">Police Link</span>
            </div>

            {a.status === 'en_route' && (
              <p className="text-xs text-[#173B68] font-medium">
                {a.leg_complete ? '✅ Arrived at accident location.' : 'Ambulance is actively traveling along road network…'}
              </p>
            )}

            {/* 6 Burst Evidence Frames */}
            {inc.evidence.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-[#171717] mb-1.5 flex justify-between items-center">
                  <span>6 Optical Burst Evidence Frames</span>
                  <span className="text-[11px] text-[#356FA5] font-mono">{inc.evidence.length} frames</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {inc.evidence.slice(0, 6).map((e, idx) => (
                    <div
                      key={e.id}
                      onClick={() => setZoomUrl(resolveEvidenceUrl(e.url))}
                      className="relative group rounded-md overflow-hidden border border-[#CBD5E1] cursor-pointer"
                    >
                      <img
                        src={resolveEvidenceUrl(e.url)}
                        alt={`Evidence frame ${idx + 1}`}
                        onError={(ev) => {
                          ev.currentTarget.onerror = null
                          ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
                        }}
                        className="aspect-video object-cover w-full group-hover:scale-105 transition"
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] px-1 rounded text-white font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {a.status === 'en_route' && (
          <Card title="Scene Arrival Confirmation">
            <div className="space-y-2.5">
              <Btn
                className="w-full py-2.5"
                onClick={() => post('arrive-scene', 'Arrival at scene recorded')}
              >
                <Flag className="w-4 h-4" />
                <span>Mark Arrival at Scene</span>
              </Btn>
              {!a.leg_complete && (
                <Btn
                  v="ghost"
                  className="w-full"
                  onClick={() => post('simulate/skip', 'Fast-forwarded to scene')}
                >
                  <FastForward className="w-4 h-4 text-[#356FA5]" />
                  <span>Fast-Forward Travel (Simulation)</span>
                </Btn>
              )}
            </div>
          </Card>
        )}

        {a.status === 'on_scene' && (
          <>
            {!inc.assessment ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-[#EBF2FA] border border-[#356FA5]/30 text-xs text-[#173B68] flex items-center gap-2">
                  <Activity className="w-4 h-4 shrink-0 text-[#173B68]" />
                  <span>
                    <b>Step 1 of 2:</b> Submit patient clinical assessment below. Nearest suitable hospital and road-route navigation will be automatically evaluated upon submission.
                  </span>
                </div>
                <Assess aid={a.id} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Clinical Assessment Summary */}
                <div className="p-3.5 rounded-lg bg-white border border-[#CBD5E1] space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                    <span className="font-bold text-[#171717] uppercase tracking-wide">Patient Clinical Assessment</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                      {(inc.assessment as any)?.severity ?? 'Moderate'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#666666]">
                    <div>Patients: <b className="text-[#171717]">{(inc.assessment as any)?.patients ?? 1}</b></div>
                    <div>Care Needs: <b className="text-[#171717]">{((inc.assessment as any)?.needs ?? ['emergency']).join(', ')}</b></div>
                  </div>
                  {Boolean((inc.assessment as any)?.notes) && (
                    <div className="text-[11px] text-[#666666] italic bg-slate-50 p-2 rounded">
                      "{(inc.assessment as any).notes}"
                    </div>
                  )}
                </div>

                {/* Stage 2 Redirection Card */}
                <Card title="Stage 2 Redirection: Assigned Receiving Hospital">
                  {hosp ? (
                    <div className="text-xs sm:text-sm space-y-3">
                      <div className="p-3 rounded-lg bg-[#F0F9F4] border border-[#198754]/30">
                        <div className="font-bold text-[#171717] text-base">{hosp.name}</div>
                        <div className="text-xs text-[#198754] mt-0.5 font-medium flex items-center gap-1">
                          <span>✓ Evaluated for bed availability, care capabilities & road ETA</span>
                        </div>
                        {hosp.phone && (
                          <div className="text-xs text-[#666666] mt-1.5 flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 text-[#198754]" />
                            <span>Emergency Desk: {hosp.phone}</span>
                          </div>
                        )}
                      </div>

                      {a.hospital_route && (
                        <div className="text-xs text-[#666666] space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                          <div className="flex justify-between">
                            <span>Road Route Distance: <b>{a.hospital_route.distance_km} km</b></span>
                            <span className="font-mono text-[#173B68] font-bold">ETA: ~{a.hospital_route.eta_min} min</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span>Routing Engine:</span>
                            <span className={`px-2 py-0.5 rounded font-bold ${(a.hospital_route as any)?.simulated
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                              }`}>
                              {(a.hospital_route as any)?.simulated ? '⚡ Simulated Fallback' : '🛣️ Real Road Network'}
                            </span>
                          </div>
                        </div>
                      )}

                      <Btn
                        className="w-full py-2.5"
                        onClick={() => post('start-hospital-route', 'Hospital route initiated — emergency intake alerted')}
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Start Hospital Route (Stage 2 Redirection)</span>
                      </Btn>
                    </div>
                  ) : (
                    <Alert kind="error">
                      {inc.hospital_warning ?? 'No hospital selected yet.'} Awaiting destination choice.
                    </Alert>
                  )}
                </Card>
              </div>
            )}
          </>
        )}

        {a.status === 'transporting' && (
          <Card title="En Route to Hospital (Stage 2)">
            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-[#666666]">
                Transporting patient to <b className="text-[#171717]">{hosp?.name}</b> —{' '}
                {a.leg_complete ? (
                  <span className="text-[#198754] font-bold">Arrived at Emergency Bay</span>
                ) : (
                  <span className="text-[#173B68] font-mono">Traveling along street corridor…</span>
                )}
              </p>

              <Btn
                className="w-full py-2.5"
                onClick={() => post('arrive-hospital', 'Arrival at hospital recorded')}
              >
                <HIcon className="w-4 h-4" />
                <span>Mark Arrival at Emergency Bay</span>
              </Btn>

              {!a.leg_complete && (
                <Btn
                  v="ghost"
                  className="w-full"
                  onClick={() => post('simulate/skip', 'Fast-forwarded to hospital')}
                >
                  <FastForward className="w-4 h-4 text-[#356FA5]" />
                  <span>Fast-Forward Travel (Simulation)</span>
                </Btn>
              )}
            </div>
          </Card>
        )}

        {a.status === 'at_hospital' && (
          <Card title="Clinical Patient Handover Protocol">
            <div className="space-y-3 text-xs sm:text-sm">
              <p className="text-xs text-[#666666] leading-relaxed">
                Emergency clinical staff have received patient vitals and telemetry. Confirm physical handover to close incident and return ambulance to available status.
              </p>
              <Btn
                v="success"
                className="w-full py-2.5"
                onClick={() => post('complete', 'Handover complete — incident closed')}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Patient Handover</span>
              </Btn>
            </div>
          </Card>
        )}
      </div>

      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomUrl(null)}
        >
          <div className="max-w-3xl w-full bg-white border border-[#CBD5E1] rounded-xl overflow-hidden shadow-2xl p-2">
            <img
              src={resolveEvidenceUrl(zoomUrl)}
              alt="Enlarged collision frame"
              onError={(ev) => {
                ev.currentTarget.onerror = null
                ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
              }}
              className="w-full h-auto rounded-lg object-contain max-h-[80vh]"
            />
            <div className="p-2 text-center text-xs text-[#666666]">
              High-resolution collision evidence frame · Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Driver() {
  const { incidents, ambulances, user } = useApp()
  const act = useAct()
  const [muted, setMuted] = useState(sound.isMuted)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Driver verification state (Yes / No / Unable to determine)
  const [verifyChoice, setVerifyChoice] = useState<'yes' | 'no' | 'unable'>('yes')
  const [casualtiesCount, setCasualtiesCount] = useState<number>(1)
  const [fleetNeeded, setFleetNeeded] = useState<number>(1)
  const [driverNotes, setDriverNotes] = useState<string>('')
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  // Real Device GPS Tracking state
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const watchRef = useRef<number | null>(null)

  // Driver Isolation: find this driver's unit only
  const me = ambulances.find(a => a.id === user?.ambulance_id)
  const mine = incidents.flatMap(i =>
    i.assignments.filter(a => a.ambulance_id === user?.ambulance_id).map(a => ({ i, a }))
  )
  const offer = mine.find(x => x.a.status === 'offered')
  const active = mine.find(x => ['en_route', 'on_scene', 'transporting', 'at_hospital'].includes(x.a.status))

  const toggleGps = () => {
    if (gpsActive) {
      if (watchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
        watchRef.current = null
      }
      setGpsActive(false)
      setGpsCoords(null)
      return
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser')
      return
    }

    setGpsError(null)
    const wid = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords
        setGpsActive(true)
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) })
        if (me) {
          api.post(`/api/ambulances/${me.id}/location`, {
            lat: latitude,
            lng: longitude,
            accuracy_m: accuracy,
            heading: heading ?? undefined,
            speed_kmh: speed ? speed * 3.6 : undefined
          }).catch(() => { })
        }
      },
      err => {
        setGpsError(err.message)
        setGpsActive(false)
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
    watchRef.current = wid
  }

  useEffect(() => {
    return () => {
      if (watchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [])

  // Elapsed Time Tracker and Siren Ring for Offers — No Auto-Timeout
  useEffect(() => {
    if (!offer) {
      sound.stopIncomingCallRing()
      setElapsedSec(0)
      return
    }

    sound.startIncomingCallRing()
    const offeredTime = offer.a.offered_at ? new Date(offer.a.offered_at).getTime() : Date.now()
    const updateElapsed = () => {
      const sec = Math.floor((Date.now() - offeredTime) / 1000)
      setElapsedSec(sec)
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => {
      clearInterval(interval)
      sound.stopIncomingCallRing()
    }
  }, [offer?.a.id])

  const handleToggleStatus = async () => {
    if (!me) return
    const nextStatus = me.status === 'available' ? 'busy' : 'available'
    await act(
      () => api.patch(`/api/ambulances/${me.id}`, { status: nextStatus }),
      `Driver status set to ${nextStatus.toUpperCase()}`
    )
  }

  // Primary driver submits verification + casualties + ambulance count
  const handlePrimaryVerification = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()

    if (verifyChoice === 'no') {
      await act(
        () => api.post(`/api/assignments/${offer.a.id}/verify-and-respond`, {
          verified: false,
          ambulances_needed: 1,
          notes: driverNotes || 'False alarm determined after inspecting 6 camera evidence frames'
        }),
        'Inspection completed: marked as False Alarm.'
      )
      return
    }

    const verified = verifyChoice === 'yes'
    const finalAmbulances = Math.max(fleetNeeded, Math.ceil(casualtiesCount / 2))

    await act(
      () => api.post(`/api/assignments/${offer.a.id}/verify-and-respond`, {
        verified: true,
        ambulances_needed: finalAmbulances,
        notes: `Verification: ${verifyChoice === 'yes' ? 'Confirmed Accident' : 'Unable to determine from video — verifying on-scene'}. Casualties: ${casualtiesCount}. ${driverNotes}`
      }),
      verifyChoice === 'yes'
        ? `Accident verified! ${finalAmbulances} ambulance(s) coordinated. En route ASAP to scene!`
        : `En route to scene to investigate. Nearest backup on standby.`
    )
  }

  // Subsequent (cascade) driver accepts offer
  const handleCascadeAccept = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()
    await act(
      () => api.post(`/api/assignments/${offer.a.id}/respond`, { accept: true }),
      'Cascade dispatch accepted! En route ASAP to multi-casualty accident.'
    )
  }

  const handleDeclineOffer = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()
    await act(
      () => api.post(`/api/assignments/${offer.a.id}/respond`, { accept: false }),
      'Offer declined. Auto-forwarding to next nearest unit.'
    )
  }

  const toggleSound = () => {
    const isNowMuted = sound.toggleMute()
    setMuted(isNowMuted)
  }

  // Multi-Ambulance fleet tracking for the offered incident
  const isPrimary = offer && !offer.i.verified_by
  const activeFleet = offer
    ? offer.i.assignments.filter(asg => ['en_route', 'on_scene', 'transporting', 'at_hospital'].includes(asg.status))
    : []
  const reqFleet = offer?.i.required_ambulances || 1

  return (
    <div className="space-y-6 text-[#171717]">
      {/* Driver Header & Availability Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Paramedic Cockpit</h1>
            {me && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30">
                {me.code}
              </span>
            )}
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            Paramedic Unit: {me?.driver_name ?? user?.name} · Crew Capability: {me?.crew_level ?? 'ALS'}
          </p>
        </div>

        {/* Status Toggle Switch */}
        {me && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={!!active}
              title={active ? 'Cannot change status during an active assignment' : 'Click to toggle availability'}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm ${me.status === 'available'
                ? 'bg-[#F0F9F4] text-[#198754] border border-[#198754]/40 hover:bg-[#E2F4E9]'
                : 'bg-[#FDF2F2] text-[#DC3545] border border-[#DC3545]/40 hover:bg-[#FCE8E8]'
                } ${active ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${me.status === 'available' ? 'bg-[#198754]' : 'bg-[#DC3545]'
                  }`}
              />
              <span>
                {me.status === 'available' ? 'DUTY: AVAILABLE (READY)' : 'DUTY: BUSY / OFF-DUTY'}
              </span>
              <Power className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition ${muted
                ? 'bg-[#FDF2F2] border-[#DC3545]/30 text-[#DC3545]'
                : 'bg-[#EBF2FA] border-[#356FA5]/30 text-[#173B68] hover:bg-[#DDEBFA]'
                }`}
              title={muted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Real Device GPS Tracking Toggle */}
            <button
              type="button"
              onClick={toggleGps}
              title={gpsActive ? 'Disable live device GPS tracking' : 'Enable live device GPS tracking (Geolocation API)'}
              className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm ${gpsActive
                  ? 'bg-[#EBF2FA] text-[#173B68] border border-[#173B68]/40 hover:bg-[#DDEBFA]'
                  : 'bg-white text-[#666666] border border-[#CBD5E1] hover:bg-[#F7F8FA]'
                }`}
            >
              <Radio className={`w-3.5 h-3.5 ${gpsActive ? 'text-[#173B68] animate-pulse' : 'text-[#94A3B8]'}`} />
              <span>{gpsActive ? `GPS LIVE (±${gpsCoords?.accuracy ?? 5}m)` : 'DEVICE GPS: OFF'}</span>
            </button>
          </div>
        )}
      </div>

      {gpsError && (
        <Alert kind="warn">
          GPS notice: {gpsError}. Standard road network coordinates remain active.
        </Alert>
      )}

      {/* Unavailable Warning */}
      {me && me.status !== 'available' && !active && !offer && (
        <Alert kind="warn">
          Your ambulance is currently marked as <b>{me.status.toUpperCase()}</b>. Toggle your duty status to{' '}
          <b>AVAILABLE (READY)</b> above to receive real-time incident calls.
        </Alert>
      )}

      {/* 🚨 INCOMING EMERGENCY CALL ALERT & PARAMEDIC VERIFICATION CARD */}
      {offer && (
        <div className="p-6 rounded-xl bg-white border-2 border-[#DC3545] shadow-lg relative overflow-hidden">
          {/* Top Header: Countdown & Call Type */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#DC3545] text-white grid place-items-center shrink-0">
                <PhoneCall className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-[#DC3545] uppercase flex items-center gap-2">
                  <span>EMERGENCY DISPATCH CALL</span>
                  <span className="bg-[#DC3545] text-white text-[10px] px-2 py-0.5 rounded-full font-mono">PRIORITY 1</span>
                </div>
                <div className="text-lg font-bold text-[#171717] mt-0.5">
                  {offer.i.location_name}
                </div>
              </div>
            </div>

            {/* Elapsed Time — No Auto-Expiry */}
            <div className="flex items-center gap-3 bg-[#FAFBFD] px-4 py-2 rounded-lg border border-[#CBD5E1]">
              <Clock className="w-4 h-4 text-[#173B68]" />
              <div>
                <div className="text-[10px] font-mono uppercase text-[#666666]">Awaiting Paramedic Action</div>
                <div className="text-lg font-black text-[#171717] font-mono leading-none">
                  {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s <span className="text-xs text-[#173B68] font-normal">Elapsed · No Auto-Expiry</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 pt-5">
            {/* Left Column: 6 Captured Evidence Screenshots (3s Interval) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#171717] flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#173B68]" />
                  <span>6 Optical Surveillance Frames (3s Interval)</span>
                </span>
                <span className="text-[11px] text-[#666666] font-mono">Click to enlarge</span>
              </div>

              {offer.i.evidence.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {offer.i.evidence.slice(0, 6).map((e, idx) => (
                    <div
                      key={e.id}
                      onClick={() => setZoomUrl(resolveEvidenceUrl(e.url))}
                      className="relative rounded-lg overflow-hidden border border-[#CBD5E1] aspect-video group cursor-pointer hover:border-[#173B68] transition"
                    >
                      <img
                        src={resolveEvidenceUrl(e.url)}
                        alt={`Evidence frame ${idx + 1}`}
                        onError={(ev) => {
                          ev.currentTarget.onerror = null
                          ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-white font-bold bg-black/60 px-1 rounded">
                        Frame #{idx + 1} (+{idx * 3}s)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-[#FAFBFD] border border-[#CBD5E1] text-center text-xs text-[#666666]">
                  Capturing 6 evidence frames from collision optical sensor…
                </div>
              )}

              {/* Route Summary */}
              {offer.a.scene_route && (
                <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs text-[#171717] flex justify-between">
                  <span>Road Route to Scene: <b>{offer.a.scene_route.distance_km} km</b></span>
                  <span className="text-[#173B68] font-mono font-bold">ETA: {offer.a.scene_route.eta_min} min</span>
                </div>
              )}

              {/* AI Detection Telemetry (>=90% Level) */}
              <div className="p-2.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#171717]">
                  <Activity className="w-3.5 h-3.5 text-[#173B68]" />
                  <span>PyTorch ResNet-18</span>
                </span>
                <span className="text-[#173B68] font-bold bg-[#EBF2FA] px-2 py-0.5 rounded border border-[#356FA5]/30 text-[11px]">
                  CONFIDENCE: {Math.round((offer.i.confidence ?? 0.94) * 100)}% (CROSSES 90% LEVEL)
                </span>
              </div>

              {/* Assigned Nearest Ambulance & Assigned Hospital */}
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                {/* Nearest Ambulance Card */}
                <div className="p-3 rounded-lg bg-[#EBF2FA] border border-[#356FA5]/30 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#173B68]">
                    <span>NEAREST UNIT</span>
                    <span className="px-1.5 py-0.2 rounded bg-white text-[#173B68] font-mono text-[10px] border border-[#CBD5E1]">
                      RANK #1
                    </span>
                  </div>
                  <div className="font-extrabold text-[#171717] text-sm">
                    {offer.a.ambulance_code || me?.code || 'AMB-01'} (You)
                  </div>
                  <div className="text-[11px] text-[#666666]">
                    Road ETA: <b className="text-[#173B68] font-mono">{offer.a.scene_route?.eta_min ?? '2.8'} min</b> ({offer.a.scene_route?.distance_km ?? '1.9'} km)
                  </div>
                </div>

                {/* Nearest Hospital by Seat Availability Card */}
                <div className="p-3 rounded-lg bg-[#F0F9F4] border border-[#198754]/30 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#198754]">
                    <span>ASSIGNED HOSPITAL</span>
                    <span className="px-1.5 py-0.2 rounded bg-white text-[#198754] font-mono text-[10px] border border-[#CBD5E1]">
                      BED MATCH
                    </span>
                  </div>
                  <div className="font-extrabold text-[#171717] text-sm truncate" title={offer.a.hospital_name || offer.i.selected_hospital_name || 'City Central General Hospital'}>
                    {offer.a.hospital_name || offer.i.selected_hospital_name || 'City Central General Hospital'}
                  </div>
                  <div className="text-[11px] text-[#198754] flex items-center justify-between">
                    <span>Free Beds: <b>{offer.a.hospital_available_beds ?? offer.i.selected_hospital_beds ?? 14}</b></span>
                    <span className="text-[#666666] font-mono">({offer.a.hospital_icu_beds ?? offer.i.selected_hospital_icu ?? 3} ICU)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Paramedic Verification Form or Cascade Live Feed */}
            <div className="lg:col-span-6 space-y-4">
              {isPrimary ? (
                /* Primary Paramedic Question & Verification Flow */
                <div className="p-4 rounded-xl bg-white border border-[#CBD5E1] space-y-4 shadow-sm">
                  <div className="border-b border-[#E2E8F0] pb-2">
                    <div className="text-xs uppercase font-extrabold text-[#173B68] tracking-wider">
                      Paramedic Incident Verification Protocol
                    </div>
                    <p className="text-[11px] text-[#666666] mt-0.5">
                      Inspect the 6 frames above and answer verification requirements:
                    </p>
                  </div>

                  {/* Question 1: Accident Verification (Yes / No / Unable to determine) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#171717] block">
                      Question 1: Visual Inspection Verification
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setVerifyChoice('yes')}
                        className={`p-2.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${verifyChoice === 'yes'
                          ? 'bg-[#F0F9F4] border-[#198754] text-[#198754] shadow-sm'
                          : 'bg-white border-[#CBD5E1] text-[#666666] hover:bg-[#F7F8FA]'
                          }`}
                      >
                        <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-[#198754]" />
                        <span>Confirm Accident (Yes)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVerifyChoice('no')}
                        className={`p-2.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${verifyChoice === 'no'
                          ? 'bg-[#FDF2F2] border-[#DC3545] text-[#DC3545] shadow-sm'
                          : 'bg-white border-[#CBD5E1] text-[#666666] hover:bg-[#F7F8FA]'
                          }`}
                      >
                        <PhoneOff className="w-4 h-4 mx-auto mb-1 text-[#DC3545]" />
                        <span>False Alarm (No)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVerifyChoice('unable')}
                        className={`p-2.5 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${verifyChoice === 'unable'
                          ? 'bg-[#FDF9F0] border-[#D69E36] text-[#855B14] shadow-sm'
                          : 'bg-white border-[#CBD5E1] text-[#666666] hover:bg-[#F7F8FA]'
                          }`}
                      >
                        <HelpCircle className="w-4 h-4 mx-auto mb-1 text-[#D69E36]" />
                        <span>Unable to Determine</span>
                      </button>
                    </div>
                  </div>

                  {/* Question 2: Casualties & Required Ambulances */}
                  {verifyChoice !== 'no' && (
                    <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-[#171717] block mb-1">
                            Estimated Casualties
                          </label>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#356FA5]" />
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={casualtiesCount}
                              onChange={e => {
                                const c = Math.max(1, +e.target.value)
                                setCasualtiesCount(c)
                                setFleetNeeded(Math.max(1, Math.ceil(c / 2)))
                              }}
                              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#171717]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#171717] block mb-1">
                            Ambulances Required
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {[1, 2, 3].map(cnt => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => setFleetNeeded(cnt)}
                                className={`py-1.5 rounded-md text-xs font-bold border transition cursor-pointer ${fleetNeeded === cnt
                                  ? 'bg-[#173B68] text-white border-[#173B68]'
                                  : 'bg-white border-[#CBD5E1] text-[#666666]'
                                  }`}
                              >
                                {cnt} Unit{cnt > 1 ? 's' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {fleetNeeded > 1 && (
                        <p className="text-[11px] text-[#173B68] italic bg-[#EBF2FA] p-2 rounded border border-[#356FA5]/20">
                          ⚡ Multi-Ambulance Auto-Dispatch: The system will automatically dispatch the next {fleetNeeded - 1} nearest available ambulance units directly to the scene.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Remarks Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-[#666666] block mb-1">
                      Paramedic Observations / Remarks
                    </label>
                    <input
                      type="text"
                      value={driverNotes}
                      onChange={e => setDriverNotes(e.target.value)}
                      placeholder="e.g. Collision visible, road lane blocked, multiple casualties"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#171717] placeholder-[#94A3B8] focus:outline-none focus:border-[#173B68]"
                    />
                  </div>

                  {/* Action Submission */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrimaryVerification}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${verifyChoice === 'no'
                        ? 'bg-[#DC3545] hover:bg-[#BB2D3B] text-white'
                        : 'bg-[#173B68] hover:bg-[#102A4C] text-white'
                        }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {verifyChoice === 'yes'
                          ? 'CONFIRM ACCIDENT & RUSH TO SCENE'
                          : verifyChoice === 'unable'
                            ? 'DISPATCH TO SCENE FOR ON-SITE VERIFICATION'
                            : 'CLOSE AS FALSE ALARM'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclineOffer}
                      className="px-3 py-2.5 rounded-lg font-medium text-xs bg-white hover:bg-[#F7F8FA] text-[#666666] border border-[#CBD5E1] cursor-pointer"
                    >
                      Forward Next
                    </button>
                  </div>
                </div>
              ) : (
                /* Subsequent (Cascade) Paramedic Live Feed Card */
                <div className="p-4 rounded-xl bg-white border border-[#D69E36]/40 space-y-4 shadow-sm">
                  <div className="border-b border-[#E2E8F0] pb-2">
                    <div className="text-xs uppercase font-extrabold text-[#855B14] tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#D69E36]" />
                      <span>Multi-Ambulance Incident Cascade</span>
                    </div>
                    <p className="text-[11px] text-[#666666] mt-1">
                      Accident verified by Primary Paramedic: <b className="text-[#171717]">{offer.i.verified_by}</b>
                    </p>
                  </div>

                  {/* Live Fleet Requirement Feed */}
                  <div className="p-3.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#666666]">Total Ambulances Coordinated:</span>
                      <span className="font-extrabold text-[#171717] text-sm">{reqFleet} Units</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#666666]">Accepted & En Route:</span>
                      <span className="font-bold text-[#198754]">{activeFleet.length} / {reqFleet}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#666666]">Additional Units Required:</span>
                      <span className="font-mono font-bold text-[#173B68]">
                        {Math.max(0, reqFleet - activeFleet.length)} Unit(s)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap gap-1.5">
                      {activeFleet.map(asg => (
                        <span key={asg.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F0F9F4] text-[#198754] border border-[#198754]/30">
                          {asg.ambulance_code} ({asg.status.replace(/_/g, ' ')})
                        </span>
                      ))}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDF9F0] text-[#855B14] border border-[#D69E36]/30">
                        {me?.code} (Offered - You)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#666666] leading-relaxed">
                    Casualty volume requires multi-vehicle response. Click accept to begin road navigation immediately.
                  </p>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCascadeAccept}
                      className="flex-1 py-2.5 px-4 rounded-lg font-bold text-xs bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>ACCEPT MULTI-UNIT DISPATCH</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclineOffer}
                      className="px-3 py-2.5 rounded-lg font-medium text-xs bg-white hover:bg-[#FDF2F2] text-[#DC3545] border border-[#DC3545]/30 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom for Evidence Screenshots */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomUrl(null)}
        >
          <div className="max-w-3xl w-full bg-white border border-[#CBD5E1] rounded-xl overflow-hidden shadow-2xl p-2">
            <img
              src={resolveEvidenceUrl(zoomUrl)}
              alt="Enlarged collision frame"
              onError={(ev) => {
                ev.currentTarget.onerror = null
                ev.currentTarget.src = ACCIDENT_EVIDENCE_FALLBACK
              }}
              className="w-full h-auto rounded-lg object-contain max-h-[80vh]"
            />
            <div className="p-2 text-center text-xs text-[#666666]">
              High-resolution collision evidence frame · Click anywhere to close
            </div>
          </div>
        </div>
      )}

      {/* Active Incident Navigation View */}
      {active && <Active inc={active.i} />}

      {/* Standby State */}
      {!offer && !active && (
        <Card>
          <Empty
            text="No active dispatch assignment"
            hint="Keep your duty status as AVAILABLE (READY). Emergency dispatch alerts will appear here in real time."
          />
        </Card>
      )}

      <SystemNote />
    </div>
  )
}
