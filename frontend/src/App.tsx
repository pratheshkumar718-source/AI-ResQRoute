import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Camera, ShieldAlert, Map, Ambulance as AmbIcon, Truck,
  Building2, Route, History, Settings as SettingsIcon, LogOut,
  ChevronRight, Volume2, VolumeX, PhoneCall, Home as HomeIcon
} from 'lucide-react'
import { AppProvider, useApp } from './lib/store'
import { Toasts, Alert, ErrorBoundary } from './components/ui'
import ResQRouteLogo from './components/ResQRouteLogo'
import { sound } from './lib/audio'
import Home from './pages/Home'
import Overview from './pages/Overview'
import CameraPage from './pages/CameraPage'
import Incidents from './pages/Incidents'
import LiveMap from './pages/LiveMap'
import Ambulances from './pages/Ambulances'
import Driver from './pages/Driver'
import Hospitals from './pages/Hospitals'
import Tracking from './pages/Tracking'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

interface NavItem {
  id: string
  label: string
  icon: any
  roles: string[]
  group: 'Command & AI Surveillance' | 'Fleet & Hospital Care' | 'Intelligence & Audit'
}

const NAV: NavItem[] = [
  { id: 'camera', label: 'AI Accident Surveillance', icon: Camera, roles: ['admin', 'police'], group: 'Command & AI Surveillance' },
  { id: 'overview', label: 'Operations Command Grid', icon: LayoutDashboard, roles: ['admin', 'hospital', 'police'], group: 'Command & AI Surveillance' },
  { id: 'incidents', label: 'Incidents & Verification', icon: ShieldAlert, roles: ['admin', 'police'], group: 'Command & AI Surveillance' },
  { id: 'map', label: 'Live Tactical Map', icon: Map, roles: ['admin', 'driver', 'hospital', 'police', 'citizen'], group: 'Command & AI Surveillance' },

  { id: 'ambulances', label: 'Ambulance Fleet Status', icon: AmbIcon, roles: ['admin', 'police'], group: 'Fleet & Hospital Care' },
  { id: 'driver', label: 'Paramedic Cockpit', icon: Truck, roles: ['driver'], group: 'Fleet & Hospital Care' },
  { id: 'hospitals', label: 'Hospital Beds & ICU', icon: Building2, roles: ['admin', 'hospital', 'citizen'], group: 'Fleet & Hospital Care' },

  { id: 'tracking', label: 'Response Tracking', icon: Route, roles: ['admin', 'hospital', 'police', 'citizen'], group: 'Intelligence & Audit' },
  { id: 'history', label: 'Audit & Incident Logs', icon: History, roles: ['admin', 'driver', 'hospital', 'police'], group: 'Intelligence & Audit' },
  { id: 'settings', label: 'Settings & System Audio', icon: SettingsIcon, roles: ['admin', 'driver', 'hospital', 'police', 'citizen'], group: 'Intelligence & Audit' },
]

const ROLE_BADGE: Record<string, { label: string; style: string }> = {
  admin: { label: 'Chief Dispatcher', style: 'bg-[#EBF2FA] text-[#173B68] border-[#356FA5]/30' },
  driver: { label: 'Paramedic Unit', style: 'bg-[#FDF9F0] text-[#855B14] border-[#D69E36]/30' },
  hospital: { label: 'Trauma Unit Staff', style: 'bg-[#F0F9F4] text-[#166534] border-[#198754]/30' },
  police: { label: 'Traffic Inspector', style: 'bg-[#EBF2FA] text-[#356FA5] border-[#356FA5]/30' },
  citizen: { label: 'Citizen Responder', style: 'bg-[#F7F8FA] text-[#666666] border-[#E2E8F0]' },
}

function getDefaultPageForUser(role?: string): string {
  if (role === 'admin') return 'camera'
  if (role === 'driver') return 'driver'
  if (role === 'hospital') return 'hospitals'
  if (role === 'police') return 'camera'
  return 'map'
}

function Shell() {
  const { user, logout, connected, error, incidents, ambulances } = useApp()
  const [view, setView] = useState<'home' | 'dashboard'>('home')
  const [muted, setMuted] = useState(sound.isMuted)
  const [callAlertSilenced, setCallAlertSilenced] = useState(false)

  const items = NAV.filter(n => user && n.roles.includes(user.role))
  const [page, setPage] = useState<string>(() => getDefaultPageForUser(user?.role))

  // Synchronize initial landing page whenever user logs in
  useEffect(() => {
    if (user) {
      const allowed = NAV.filter(n => n.roles.includes(user.role)).map(n => n.id)
      if (!allowed.includes(page)) {
        setPage(getDefaultPageForUser(user.role))
      }
    }
  }, [user?.role])

  const handleEnterDashboard = (targetPage?: string) => {
    if (targetPage) {
      setPage(targetPage)
    } else {
      setPage(getDefaultPageForUser(user?.role))
    }
    setView('dashboard')
  }

  const pending = incidents.filter(i => i.status === 'suspected').length
  const myOffers =
    user?.role === 'driver'
      ? incidents.filter(i => i.assignments.some(a => a.status === 'offered' && a.ambulance_id === user.ambulance_id)).length
      : 0
  const myAmb = ambulances.find(a => a.id === user?.ambulance_id)

  // Emergency audible call alert when an accident occurs that requires verification
  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'police') && pending > 0 && !callAlertSilenced && !muted) {
      sound.startIncomingCallRing()
    } else if (user?.role !== 'driver') {
      sound.stopIncomingCallRing()
    }
  }, [pending, callAlertSilenced, muted, user?.role])

  const handleToggleMute = () => {
    const isMuted = sound.toggleMute()
    setMuted(isMuted)
  }

  const handleSilenceCallAlert = () => {
    setCallAlertSilenced(true)
    sound.stopIncomingCallRing()
  }

  // If user is on home view, render Home page
  if (view === 'home' || !user) {
    return (
      <>
        <Home onEnterDashboard={handleEnterDashboard} />
        <Toasts />
      </>
    )
  }

  const activeItem = NAV.find(n => n.id === page)
  const roleInfo = ROLE_BADGE[user.role] ?? { label: user.role, style: 'bg-[#F7F8FA] text-[#666666] border-[#E2E8F0]' }

  const groups: Array<'Command & AI Surveillance' | 'Fleet & Hospital Care' | 'Intelligence & Audit'> = [
    'Command & AI Surveillance',
    'Fleet & Hospital Care',
    'Intelligence & Audit'
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA] text-[#171717] font-sans select-none">
      {/* Enterprise Light Sidebar Navigation */}
      <aside className="w-68 bg-white border-r border-[#E2E8F0] flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-[#E2E8F0] bg-white">
          <ResQRouteLogo size="sm" />
        </div>

        {/* Public Homepage CTA */}
        <div className="p-3 border-b border-[#E2E8F0] bg-[#FAFBFD]">
          <button
            onClick={() => setView('home')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-[#F7F8FA] text-[#173B68] border border-[#E2E8F0] transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HomeIcon className="w-3.5 h-3.5 text-[#356FA5]" />
              <span>Public Homepage</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
          </button>
        </div>

        {/* Categorized Menu Items */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {groups.map(grp => {
            const grpItems = items.filter(n => n.group === grp)
            if (!grpItems.length) return null
            return (
              <div key={grp} className="space-y-1">
                <div className="px-3 text-[10px] font-mono tracking-wider text-[#666666] uppercase font-semibold">
                  {grp}
                </div>
                <div className="space-y-0.5">
                  {grpItems.map(n => {
                    const badge = n.id === 'incidents' ? pending : n.id === 'driver' ? myOffers : 0
                    const active = page === n.id
                    return (
                      <button
                        key={n.id}
                        onClick={() => setPage(n.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                          active
                            ? 'bg-[#173B68] text-white shadow-sm font-semibold'
                            : 'text-[#171717] hover:bg-[#F7F8FA]'
                        }`}
                      >
                        <n.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#666666]'}`} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {badge > 0 && (
                          <span className="bg-[#DC3545] text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm">
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer Identity & Logout */}
        <div className="p-3.5 border-t border-[#E2E8F0] space-y-2 bg-[#FAFBFD]">
          <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#171717] truncate">{user.name}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${roleInfo.style}`}>
                {roleInfo.label}
              </span>
            </div>
            {myAmb && (
              <div className="text-[11px] text-[#356FA5] font-mono">
                Assigned Unit: <span className="font-bold text-[#171717]">{myAmb.code}</span> ({myAmb.crew_level})
              </div>
            )}
          </div>

          <button
            onClick={() => {
              logout()
              setView('home')
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[#666666] hover:text-[#DC3545] hover:bg-[#FDF2F2] border border-transparent transition text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Operations Header Bar */}
        <header className="h-14 px-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between shrink-0 z-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-[#666666] hidden sm:inline">Operations Command</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:inline" />
            <span className="text-[#171717] font-semibold flex items-center gap-1.5">
              {activeItem && <activeItem.icon className="w-4 h-4 text-[#173B68]" />}
              <span>{activeItem?.label ?? 'Dashboard'}</span>
            </span>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            {/* Live Telemetry Ping */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs font-mono">
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#198754] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#198754]" />
                  </span>
                  <span className="text-[#198754] font-medium">WS Live Telemetry</span>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full h-2 w-2 bg-[#D69E36] animate-pulse" />
                  <span className="text-[#D69E36]">Connecting…</span>
                </>
              )}
            </div>

            {/* Audio Siren Mute/Unmute */}
            <button
              onClick={handleToggleMute}
              title={muted ? 'Unmute Emergency Siren & Ring' : 'Mute Emergency Audio'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                muted
                  ? 'bg-[#FDF2F2] border-[#DC3545]/30 text-[#DC3545] hover:bg-[#FCE8E8]'
                  : 'bg-[#EBF2FA] border-[#356FA5]/30 text-[#173B68] hover:bg-[#DDEBFA]'
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-[#DC3545]" /> : <Volume2 className="w-3.5 h-3.5 text-[#173B68]" />}
              <span className="hidden sm:inline">{muted ? 'Siren Muted' : 'Siren ON'}</span>
            </button>

            {/* Incident Alert Badge (Quick jump) */}
            {pending > 0 && (
              <button
                onClick={() => setPage('incidents')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-semibold shadow-sm border border-[#DC3545] transition cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                <span>{pending} Active Call{pending > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </header>

        {/* Incoming Accident Call Banner for Dispatchers */}
        {(user.role === 'admin' || user.role === 'police') && pending > 0 && !callAlertSilenced && (
          <div className="bg-[#FDF2F2] border-b border-[#DC3545]/30 px-6 py-2.5 flex items-center justify-between text-xs sm:text-sm text-[#991B1B] shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-[#DC3545] text-white grid place-items-center shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[#DC3545] flex items-center gap-2">
                  <span>EMERGENCY ACCIDENT ALERT — VERIFICATION REQUIRED</span>
                  <span className="bg-[#DC3545] text-white text-[10px] font-mono px-2 py-0.5 rounded-full uppercase">Priority 1</span>
                </div>
                <div className="text-[#666666] text-xs">
                  AI camera optical heuristics detected {pending} suspected collision. Emergency siren is active until reviewed.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPage('incidents')
                  handleSilenceCallAlert()
                }}
                className="px-3 py-1.5 bg-[#DC3545] text-white rounded-md font-semibold text-xs hover:bg-[#BB2D3B] transition cursor-pointer shadow-sm"
              >
                Review & Confirm
              </button>
              <button
                onClick={handleSilenceCallAlert}
                className="px-2.5 py-1.5 bg-white hover:bg-[#F7F8FA] text-[#666666] rounded-md text-xs transition cursor-pointer border border-[#E2E8F0]"
              >
                Silence Siren
              </button>
            </div>
          </div>
        )}

        {/* Main View Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F8FA] text-[#171717] min-h-0">
          {error && (
            <div className="mb-4">
              <Alert kind="error">
                Backend connection status: {error}. The system is running with resilient telemetry link.
              </Alert>
            </div>
          )}

          <ErrorBoundary>
            {page === 'camera' && <CameraPage />}
            {page === 'overview' && <Overview go={setPage} />}
            {page === 'incidents' && <Incidents />}
            {page === 'map' && <LiveMap />}
            {page === 'ambulances' && <Ambulances />}
            {page === 'driver' && <Driver />}
            {page === 'hospitals' && <Hospitals />}
            {page === 'tracking' && <Tracking />}
            {page === 'history' && <HistoryPage />}
            {page === 'settings' && <SettingsPage />}
            {!['camera', 'overview', 'incidents', 'map', 'ambulances', 'driver', 'hospitals', 'tracking', 'history', 'settings'].includes(page) && (
              <div className="p-8 text-center text-[#666666]">
                <h2 className="text-lg font-bold text-[#171717] mb-2">Section Not Found</h2>
                <button
                  onClick={() => setPage(getDefaultPageForUser(user?.role))}
                  className="px-4 py-2 bg-[#173B68] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Return to Main Portal
                </button>
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
