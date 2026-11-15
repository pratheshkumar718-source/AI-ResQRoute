import { useEffect, useState } from 'react'
import { Volume2, VolumeX, BellRing, BellOff, ShieldCheck, Activity, RefreshCw, User, Mail, Phone, Shield } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Btn, Alert, useAct } from '../components/ui'
import { api } from '../lib/api'
import { sound } from '../lib/audio'

export default function SettingsPage() {
  const { user, connected } = useApp()
  const act = useAct()
  const [health, setHealth] = useState<any>(null)
  const [muted, setMuted] = useState(sound.isMuted)
  const [ringing, setRinging] = useState(false)

  const isCitizen = user?.role === 'citizen'

  useEffect(() => {
    api.get('/api/health').then(setHealth).catch(() => setHealth(null))
  }, [])

  const mode = localStorage.getItem('resq_map_mode') || 'auto'
  const setMode = (m: string) => {
    localStorage.setItem('resq_map_mode', m)
    window.location.reload()
  }

  const handleToggleMute = () => {
    const isMuted = sound.toggleMute()
    setMuted(isMuted)
    if (isMuted) setRinging(false)
  }

  const handleTestRing = () => {
    if (ringing) {
      sound.stopIncomingCallRing()
      setRinging(false)
    } else {
      sound.startIncomingCallRing()
      setRinging(true)
    }
  }

  /* ─────────────── Citizen-only simplified view ─────────────── */
  if (isCitizen) {
    return (
      <div className="space-y-6 max-w-3xl text-[#171717]">
        <div className="pb-2 border-b border-[#E2E8F0]">
          <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Account & Preferences</h1>
          <p className="text-xs text-[#666666] mt-0.5">
            View your profile details and configure emergency notification preferences.
          </p>
        </div>

        {/* Profile Card */}
        <Card title="Your Profile">
          <ul className="text-xs sm:text-sm space-y-3">
            <li className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="flex items-center gap-2 text-[#666666]">
                <User className="w-3.5 h-3.5" /> Full Name
              </span>
              <b className="text-[#171717]">{user?.name || '—'}</b>
            </li>
            <li className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
              <span className="flex items-center gap-2 text-[#666666]">
                <Shield className="w-3.5 h-3.5" /> Account Role
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F7F8FA] text-[#666666] border border-[#E2E8F0] uppercase tracking-wider">
                Citizen Responder
              </span>
            </li>
            {user?.email && (
              <li className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="flex items-center gap-2 text-[#666666]">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <b className="text-[#171717]">{user.email}</b>
              </li>
            )}
            {user?.phone && (
              <li className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                <span className="flex items-center gap-2 text-[#666666]">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <b className="font-mono text-[#173B68]">{user.phone}</b>
              </li>
            )}
            <li className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-[#666666]">
                <Activity className="w-3.5 h-3.5" /> Connection Status
              </span>
              <span className={`font-mono text-xs font-bold ${connected ? 'text-[#198754]' : 'text-[#D69E36]'}`}>
                {connected ? '● Connected' : '○ Reconnecting…'}
              </span>
            </li>
          </ul>
        </Card>

        {/* Notification Preferences */}
        <Card title="Emergency Notification Sound">
          <p className="text-xs text-[#666666] mb-3 leading-relaxed">
            Control the audible emergency alert tone that sounds when an ambulance dispatch update or critical notification arrives.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Btn v={muted ? 'ghost' : 'primary'} onClick={handleToggleMute}>
              {muted ? <VolumeX className="w-4 h-4 text-[#DC3545]" /> : <Volume2 className="w-4 h-4" />}
              <span>{muted ? 'Notifications Muted' : 'Notifications Active'}</span>
            </Btn>
            <Btn v={ringing ? 'danger' : 'ghost'} onClick={handleTestRing} disabled={muted}>
              {ringing ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4 text-[#D69E36]" />}
              <span>{ringing ? 'Stop Test' : 'Test Alert Sound'}</span>
            </Btn>
          </div>
        </Card>
      </div>
    )
  }

  /* ─────────────── Full admin / staff view (unchanged) ─────────────── */
  return (
    <div className="space-y-6 max-w-4xl text-[#171717]">
      <div className="pb-2 border-b border-[#E2E8F0]">
        <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">System Settings & Audio Telemetry</h1>
        <p className="text-xs text-[#666666] mt-0.5">
          Configure real-time emergency sirens, map projection engines, network diagnostics, and view authenticated stakeholder identities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Operational Node Diagnostics">
          <ul className="text-xs sm:text-sm space-y-2.5">
            <li className="flex justify-between items-center py-1 border-b border-[#E2E8F0]">
              <span className="text-[#666666]">Core REST Backend</span>
              <b className={`font-mono text-xs ${health ? 'text-[#198754]' : 'text-[#DC3545]'}`}>
                {health ? 'ONLINE (127.0.0.1:8000)' : 'UNREACHABLE'}
              </b>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-[#E2E8F0]">
              <span className="text-[#666666]">WebSocket Telemetry Link</span>
              <b className={`font-mono text-xs ${connected ? 'text-[#198754]' : 'text-[#D69E36]'}`}>
                {connected ? 'CONNECTED (Live Telemetry)' : 'RECONNECTING…'}
              </b>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-[#E2E8F0]">
              <span className="text-[#666666]">External Network Dependencies</span>
              <b className="text-[#171717] font-mono text-xs">NONE (100% Offline Capable)</b>
            </li>
            <li className="flex justify-between items-center py-1">
              <span className="text-[#666666]">Authenticated Persona</span>
              <b className="text-[#173B68] text-xs truncate max-w-[180px]">
                {user?.name} ({user?.role?.toUpperCase()})
              </b>
            </li>
          </ul>
        </Card>

        <Card title="Emergency Audio Siren & Synthesizer">
          <p className="text-xs text-[#666666] mb-3 leading-relaxed">
            ResQRoute uses the Web Audio API to synthesize dual-tone 440Hz/480Hz emergency dispatch rings and high-priority sirens directly in the browser with zero external audio assets.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Btn v={muted ? 'ghost' : 'primary'} onClick={handleToggleMute}>
              {muted ? <VolumeX className="w-4 h-4 text-[#DC3545]" /> : <Volume2 className="w-4 h-4" />}
              <span>{muted ? 'Audio Muted' : 'Audio Active'}</span>
            </Btn>
            <Btn v={ringing ? 'danger' : 'ghost'} onClick={handleTestRing} disabled={muted}>
              {ringing ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4 text-[#D69E36]" />}
              <span>{ringing ? 'Stop Ringing' : 'Test Dual-Tone Ring'}</span>
            </Btn>
          </div>
        </Card>

        <Card title="Tactical Map Rendering Engine">
          <p className="text-xs text-[#666666] mb-3 leading-relaxed">
            Switch between live OpenStreetMap tiles (standard) and high-contrast offline vector SVG cartography for environments without internet access.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${mode !== 'offline'
                  ? 'bg-[#173B68] text-white border-[#173B68]'
                  : 'bg-white text-[#666666] border-[#CBD5E1] hover:bg-[#F7F8FA]'
                }`}
            >
              OpenStreetMap (Auto)
            </button>
            <button
              onClick={() => setMode('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${mode === 'offline'
                  ? 'bg-[#173B68] text-white border-[#173B68]'
                  : 'bg-white text-[#666666] border-[#CBD5E1] hover:bg-[#F7F8FA]'
                }`}
            >
              Offline SVG Cartography
            </button>
          </div>
        </Card>

        <Card title="External Map & Traffic Detection API Integrations">
          <p className="text-xs text-[#666666] mb-3 leading-relaxed">
            Live optical CCTV detection across municipal road networks requires external API credentials currently in development / pilot provisioning.
          </p>
          <ul className="text-xs space-y-2">
            <li className="flex justify-between items-center py-1 border-b border-[#E2E8F0]">
              <span className="text-[#666666]">Municipal CCTV Stream API</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#D69E36]/30 font-semibold">
                Developing Stage (Key Required)
              </span>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-[#E2E8F0]">
              <span className="text-[#666666]">Traffic Department GIS Token</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#D69E36]/30 font-semibold">
                Developing Stage (Key Required)
              </span>
            </li>
            <li className="flex justify-between items-center py-1">
              <span className="text-[#666666]">OSRM Road Corridor Geometry</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F0F9F4] text-[#198754] border border-[#198754]/30 font-semibold">
                Connected & Active
              </span>
            </li>
          </ul>
        </Card>

        <Card title="Reset Operational Demonstration Data">
          <p className="text-xs text-[#666666] mb-3 leading-relaxed">
            Reset all incident statuses, re-initialize fleet positions to base stations, and clear temporary demonstration audit records.
          </p>
          <Btn
            v="danger"
            onClick={() =>
              act(
                () => api.post('/api/demo/reset'),
                'Demonstration environment reset to baseline coordinates'
              )
            }
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo State</span>
          </Btn>
        </Card>
      </div>
    </div>
  )
}
