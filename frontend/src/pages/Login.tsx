import { useState } from 'react'
import {
  Siren, Shield, Truck, Building2, ShieldAlert, Users, X, ArrowRight,
  Lock, CheckCircle2, UserPlus, AlertCircle,
  Mail, Phone, Heart, Award, Hospital as HIcon, Compass, Sparkles, UserCheck
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Alert } from '../components/ui'
import ResQRouteLogo from '../components/ResQRouteLogo'

export interface LoginProps {
  onSuccess?: () => void
  onClose?: () => void
  initialRole?: string
  initialMode?: 'login' | 'register'
  isModal?: boolean
}

export const PORTAL_ROLES = [
  {
    id: 'citizen',
    label: 'Citizens & Public',
    subtitle: 'Emergency SOS & Road Safety',
    u: 'citizen1',
    p: 'citizen123',
    icon: Users,
    badge: 'Public Portal',
    desc: 'Access emergency hotline directory, real-time safety advisories, and nearby emergency hospitals.',
  },
  {
    id: 'police',
    label: 'Police Department',
    subtitle: 'Traffic Corridor & Scene Clearance',
    u: 'police1',
    p: 'police123',
    icon: ShieldAlert,
    badge: 'Traffic Division',
    desc: 'Coordinate green light corridors, receive instant accident scene telemetry, and manage hospital liaison.',
  },
  {
    id: 'hospital',
    label: 'Hospital Emergency Units',
    subtitle: 'Emergency Prep & Bed Triage',
    u: 'hospital1',
    p: 'hospital123',
    icon: Building2,
    badge: 'Healthcare Staff',
    desc: 'Receive pre-arrival patient severity metrics, prepare emergency bays, and manage live ICU bed counts.',
  },
  {
    id: 'admin',
    label: 'Central Dispatch & Admin',
    subtitle: 'AI Surveillance & Fleet Command',
    u: 'admin',
    p: 'admin123',
    icon: Shield,
    badge: 'Operations Command',
    desc: 'Monitor full multi-camera AI incident detection, verify incidents, and supervise autonomous dispatch ranking.',
  },
  {
    id: 'driver',
    label: 'Ambulance Units',
    subtitle: 'Smart Turn-by-Turn Navigation',
    u: 'driver1',
    p: 'driver123',
    icon: Truck,
    badge: 'Paramedic Fleet',
    desc: 'Accept instant emergency dispatches, review scene frames, submit patient triage, and follow hospital routes.',
  },
]

export default function Login({
  onSuccess,
  onClose,
  initialRole = 'admin',
  initialMode = 'login',
  isModal = false,
}: LoginProps) {
  const { login, register, hospitals } = useApp()
  const initial = PORTAL_ROLES.find(r => r.id === initialRole) || PORTAL_ROLES[3]

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [selectedRole, setSelectedRole] = useState(initial)
  const [u, setU] = useState(initial.u)
  const [p, setP] = useState(initial.p)

  // Registration essential fields
  const [regRole, setRegRole] = useState(initialRole)
  const [regName, setRegName] = useState('')
  const [regUser, setRegUser] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')

  // Role specific fields
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [residentialArea, setResidentialArea] = useState('')

  const [ambulanceId, setAmbulanceId] = useState<number>(1)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [crewLevel, setCrewLevel] = useState('ALS')
  const [baseStation, setBaseStation] = useState('Central Station')

  const [hospitalId, setHospitalId] = useState<number>(1)
  const [department, setDepartment] = useState('Emergency Care & ICU')
  const [hotlineExt, setHotlineExt] = useState('Ext 101')

  const [badgeNumber, setBadgeNumber] = useState('')
  const [precinct, setPrecinct] = useState('Central Traffic Division')
  const [patrolZone, setPatrolZone] = useState('Zone 4 Arterial Corridor')

  const [stationId, setStationId] = useState('DISPATCH-HQ-01')
  const [agency, setAgency] = useState('Central Operations Command')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSelect = (r: typeof PORTAL_ROLES[0]) => {
    setSelectedRole(r)
    setU(r.u)
    setP(r.p)
    setErr('')
    setSuccessMsg('')
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setSuccessMsg('')
    try {
      await login(u, p)
      if (onSuccess) onSuccess()
    } catch (x: any) {
      setErr(x.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setSuccessMsg('')

    const details: Record<string, any> = {}
    let amb_id: number | null = null
    let hosp_id: number | null = null

    if (regRole === 'citizen') {
      details.blood_group = bloodGroup
      details.emergency_contact_name = emergencyContactName.trim() || 'Next of Kin'
      details.emergency_contact_phone = emergencyContactPhone.trim() || regPhone.trim()
      details.address = residentialArea.trim() || 'Metropolitan Sector'
    } else if (regRole === 'driver') {
      amb_id = ambulanceId
      details.license_number = licenseNumber.trim() || 'TN-01-DL-2024-PENDING'
      details.crew_level = crewLevel
      details.base_station = baseStation.trim()
    } else if (regRole === 'hospital') {
      hosp_id = hospitalId
      details.department = department.trim()
      details.hotline_extension = hotlineExt.trim()
    } else if (regRole === 'police') {
      details.badge_number = badgeNumber.trim() || 'TN-TP-SERVICE-ID'
      details.precinct = precinct.trim()
      details.patrol_zone = patrolZone.trim()
    } else if (regRole === 'admin') {
      details.station_id = stationId.trim()
      details.agency = agency.trim()
    }

    try {
      await register({
        name: regName.trim(),
        username: regUser.trim().toLowerCase(),
        password: regPass,
        role: regRole,
        email: regEmail.trim().toLowerCase() || undefined,
        phone: regPhone.trim() || undefined,
        ambulance_id: amb_id,
        hospital_id: hosp_id,
        details,
      })
      setSuccessMsg('Account registered successfully! Entering command portal…')
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 700)
    } catch (x: any) {
      setErr(x.message || 'Registration failed. Please choose another username.')
    } finally {
      setBusy(false)
    }
  }

  const quickEnter = async (r: typeof PORTAL_ROLES[0]) => {
    setSelectedRole(r)
    setU(r.u)
    setP(r.p)
    setBusy(true)
    setErr('')
    setSuccessMsg('')
    try {
      await login(r.u, r.p)
      if (onSuccess) onSuccess()
    } catch (x: any) {
      setErr(x.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xl w-full max-w-2xl overflow-hidden text-[#171717] relative max-h-[90vh] flex flex-col">
      {/* Top Header */}
      <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFBFD] shrink-0">
        <div className="flex items-center gap-3">
          <ResQRouteLogo size="sm" />
          <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30">
            {mode === 'login' ? 'Authorized Access' : 'Stakeholder Registration'}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#F7F8FA] hover:bg-[#EEF1F5] text-[#666666] hover:text-[#171717] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="px-6 pt-3 flex gap-2 border-b border-[#E2E8F0] bg-[#FAFBFD] shrink-0">
        <button
          type="button"
          onClick={() => { setMode('login'); setErr(''); setSuccessMsg('') }}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${mode === 'login'
              ? 'border-[#173B68] text-[#173B68]'
              : 'border-transparent text-[#666666] hover:text-[#171717]'
            }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Sign In to Portal</span>
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setErr(''); setSuccessMsg('') }}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${mode === 'register'
              ? 'border-[#198754] text-[#198754]'
              : 'border-transparent text-[#666666] hover:text-[#171717]'
            }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-[#198754]" />
          <span>Register Essential Details</span>
        </button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        {mode === 'login' ? (
          <>
            {/* Role Portals */}
            <div>
              <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider block mb-2">
                Select Stakeholder Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {PORTAL_ROLES.map(r => {
                  const active = selectedRole.id === r.id
                  const Icon = r.icon
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r)}
                      className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${active
                          ? 'bg-[#EBF2FA] border-[#173B68] text-[#173B68] shadow-sm'
                          : 'border-[#E2E8F0] bg-white hover:bg-[#F7F8FA] text-[#171717]'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div className={`p-1.5 rounded-md ${active ? 'bg-[#173B68] text-white' : 'bg-[#F7F8FA] text-[#666666]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-medium text-[#666666] px-1.5 py-0.5 rounded bg-[#F7F8FA]">
                          {r.badge}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-xs leading-snug">{r.label}</div>
                        <div className="text-[10px] text-[#666666] leading-tight mt-0.5">{r.subtitle}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Role Info Card */}
            <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] flex items-start gap-3">
              <div className="p-2 rounded-md bg-[#EBF2FA] text-[#173B68] shrink-0 mt-0.5">
                <selectedRole.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#171717]">{selectedRole.label} Portal</span>
                  <button
                    type="button"
                    onClick={() => quickEnter(selectedRole)}
                    disabled={busy}
                    className="text-[11px] font-semibold text-[#173B68] hover:text-[#102A4C] underline flex items-center gap-1 cursor-pointer"
                  >
                    Quick Enter <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-[#666666] mt-0.5 leading-relaxed">{selectedRole.desc}</p>
              </div>
            </div>

            {/* Authentication Form */}
            <form onSubmit={submitLogin} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1">Username / ID</label>
                  <input
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                    placeholder="Username"
                    value={u}
                    onChange={e => setU(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1">Passcode / Key</label>
                  <input
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                    type="password"
                    placeholder="Password"
                    value={p}
                    onChange={e => setP(e.target.value)}
                    required
                  />
                </div>
              </div>

              {err && <Alert kind="error">{err}</Alert>}
              {successMsg && <Alert kind="ok">{successMsg}</Alert>}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>Authenticating Stakeholder...</>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Sign In to {selectedRole.label}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErr(''); setSuccessMsg('') }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm bg-[#F0F9F4] hover:bg-[#E2F4E9] text-[#198754] border border-[#198754]/30 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4 text-[#198754]" />
                  <span>Register Essential Details</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Comprehensive Registration Form with Essential Details */
          <form onSubmit={submitRegister} className="space-y-4">
            {/* Operational Role Picker */}
            <div>
              <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider block mb-2">
                1. Select Stakeholder Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PORTAL_ROLES.map(r => {
                  const active = regRole === r.id
                  const Icon = r.icon
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id)}
                      className={`p-2.5 rounded-lg border text-left transition flex items-center gap-2.5 cursor-pointer ${active
                          ? 'bg-[#EBF2FA] border-[#173B68] text-[#173B68]'
                          : 'border-[#E2E8F0] bg-white hover:bg-[#F7F8FA] text-[#171717]'
                        }`}
                    >
                      <div className={`p-1.5 rounded-md ${active ? 'bg-[#173B68] text-white' : 'bg-[#F7F8FA] text-[#666666]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium truncate">{r.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Essential Personal & Contact Information */}
            <div className="space-y-3 p-3.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#173B68] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#198754]" />
                <span>2. Essential Identity & Contact Information</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#171717] block mb-1">Full Legal Name *</label>
                <input
                  className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                  placeholder="e.g. Dr. Priya Selvam / Officer Rajesh"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#356FA5]" />
                    <span>Official / Personal Email *</span>
                  </label>
                  <input
                    type="email"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                    placeholder="name@emergency.gov / personal"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#198754]" />
                    <span>Emergency Contact Phone *</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition font-mono"
                    placeholder="+91-98400-00000"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1">Username / ID *</label>
                  <input
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                    placeholder="e.g. priya_selvam"
                    value={regUser}
                    onChange={e => setRegUser(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#171717] block mb-1">Password *</label>
                  <input
                    type="password"
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:border-[#173B68] transition"
                    placeholder="At least 6 characters"
                    value={regPass}
                    onChange={e => setRegPass(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Role-Specific Details */}
            <div className="space-y-3 p-3.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#173B68] uppercase tracking-wider">
                3. Role Operational Assignment
              </div>

              {regRole === 'citizen' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Blood Group</label>
                    <select
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Residential Sector</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      placeholder="e.g. Anna Nagar West"
                      value={residentialArea}
                      onChange={e => setResidentialArea(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {regRole === 'driver' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Assigned Ambulance Unit</label>
                    <select
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={ambulanceId}
                      onChange={e => setAmbulanceId(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map(id => (
                        <option key={id} value={id}>Unit AMB-0{id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Paramedic Crew Level</label>
                    <select
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={crewLevel}
                      onChange={e => setCrewLevel(e.target.value)}
                    >
                      <option value="ALS">Advanced Life Support (ALS)</option>
                      <option value="BLS">Basic Life Support (BLS)</option>
                    </select>
                  </div>
                </div>
              )}

              {regRole === 'hospital' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Hospital Facility</label>
                    <select
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={hospitalId}
                      onChange={e => setHospitalId(Number(e.target.value))}
                    >
                      <option value={1}>City Central General Hospital</option>
                      <option value={2}>Riverside Emergency Medical Centre</option>
                      <option value={3}>Lakeview Specialty Hospital</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Clinical Department</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {regRole === 'police' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Police Precinct</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={precinct}
                      onChange={e => setPrecinct(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Patrol Sector / Corridor</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={patrolZone}
                      onChange={e => setPatrolZone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {regRole === 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Station ID</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={stationId}
                      onChange={e => setStationId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#171717] block mb-1">Agency Name</label>
                    <input
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#171717]"
                      value={agency}
                      onChange={e => setAgency(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {err && <Alert kind="error">{err}</Alert>}
            {successMsg && <Alert kind="ok">{successMsg}</Alert>}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={busy}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>Registering Details...</>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Register & Enter Command Center
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setErr(''); setSuccessMsg('') }}
                className="w-full sm:w-auto py-2.5 px-4 rounded-lg font-semibold text-xs sm:text-sm bg-white hover:bg-[#F7F8FA] text-[#171717] border border-[#CBD5E1] transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Lock className="w-4 h-4 text-[#666666]" />
                <span>Existing User? Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Info */}
        <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666] shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#198754]" />
            <span>Interactive Multi-Role Emergency Network</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#173B68] hover:underline cursor-pointer font-medium"
              >
                Need an account? Register here
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#173B68] hover:underline cursor-pointer font-medium"
              >
                Already registered? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] grid place-items-center p-4">
      {content}
    </div>
  )
}
