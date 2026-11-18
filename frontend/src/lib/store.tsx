import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { api, TOKEN_KEY, User, Incident, Ambulance, Hospital, Camera } from './api'

export interface Toast { id: number; level: string; message: string }
interface Tracking { remaining_eta: number; lat: number; lng: number; leg: string }
interface Ctx {
  user: User | null; login: (u: string, p: string) => Promise<void>
  register: (data: {
    username: string
    password: string
    name: string
    role: any
    email?: string | null
    phone?: string | null
    ambulance_id?: number | null
    hospital_id?: number | null
    details?: Record<string, any> | null
  }) => Promise<void>
  logout: () => void
  incidents: Incident[]; ambulances: Ambulance[]; hospitals: Hospital[]; cameras: Camera[]
  loading: boolean; error: string | null; connected: boolean; backendConnected: boolean; refresh: () => void
  tracking: Record<number, Tracking>; toasts: Toast[]; push: (level: string, message: string) => void
  selectedId: number | null; setSelectedId: (id: number | null) => void
}
const C = createContext<Ctx>(null as any)
export const useApp = () => useContext(C)


export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(!!localStorage.getItem(TOKEN_KEY))
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)
  const [tracking, setTracking] = useState<Record<number, Tracking>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const userRef = useRef<User | null>(null); userRef.current = user
  const timer = useRef<any>(null)

  const push = useCallback((level: string, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t.slice(-4), { id, level, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000)
  }, [])

  const load = useCallback(async () => {
    try {
      const d = await api.get('/api/bootstrap')
      if (d && Array.isArray(d.incidents)) {
        setIncidents(d.incidents)
        setAmbulances(d.ambulances || [])
        setHospitals(d.hospitals || [])
        setCameras(d.cameras || [])
        setError(null)
      }
      const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
      if (apiUrl) {
        fetch(`${apiUrl}/api/health`)
          .then(r => setBackendConnected(r.ok))
          .catch(() => setBackendConnected(false))
      }
    } catch (e: any) {
      console.warn('[Store] Bootstrap notice:', e.message)
      setBackendConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])
  const refresh = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 120) }, [load])

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedUserJson = localStorage.getItem('resq_current_user')
    if (!savedToken && !savedUserJson) {
      setBooting(false)
      return
    }

    // Immediately restore saved user session for endless continuity
    if (savedUserJson) {
      try {
        const u = JSON.parse(savedUserJson)
        setUser(u)
      } catch { }
    }

    api.get('/api/auth/me')
      .then(u => {
        if (u) {
          setUser(u)
          localStorage.setItem('resq_current_user', JSON.stringify(u))
        }
      })
      .catch((err) => {
        // Endless session: do NOT delete token or kick user out on background refresh
        console.warn('[Store] Background auth check:', err?.message)
      })
      .finally(() => setBooting(false))
  }, [])


  // WebSocket with auto-reconnect
  useEffect(() => {
    if (!user) return
    setLoading(true); load()
    let ws: WebSocket | null = null, closed = false, retry = 0, rt: any
    const connect = () => {
      try {
        const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
        const wsHost = (import.meta.env.VITE_API_URL || '').replace(/^https?:\/\//, '') || location.host
        ws = new WebSocket(`${wsProtocol}://${wsHost}/ws`)
        ws.onopen = () => { retry = 0; setConnected(true); load() }
        ws.onclose = () => { setConnected(false); if (!closed) { retry++; rt = setTimeout(connect, Math.min(1000 * retry, 8000)) } }
        ws.onerror = () => { setConnected(false) }
        ws.onmessage = ev => {
          try {
            const m = JSON.parse(ev.data)
            if (m.type === 'tracking') {
              setTracking(t => ({ ...t, [m.incident_id]: { remaining_eta: m.remaining_eta, lat: m.lat, lng: m.lng, leg: m.leg } }))
              setAmbulances(a => a.map(x => (x.id === m.ambulance_id ? { ...x, lat: m.lat, lng: m.lng } : x)))
              return
            }
            const u = userRef.current
            const mine = !m.ambulance_id || u?.role !== 'driver' || m.ambulance_id === u.ambulance_id
            if (m.message && mine && m.type !== 'hello') push(m.level || 'info', m.message)
            if (m.type !== 'hello') refresh()
          } catch { }
        }
      } catch {
        setConnected(false)
      }
    }
    connect()
    return () => { closed = true; clearTimeout(rt); ws?.close() }
  }, [user, load, refresh, push])

  const login = async (username: string, password: string) => {
    const r = await api.post('/api/auth/login', { username, password })
    localStorage.setItem(TOKEN_KEY, r.token); setUser(r.user)
  }
  const register = async (data: { username: string; password: string; name: string; role: any; ambulance_id?: number | null; hospital_id?: number | null }) => {
    const r = await api.post('/api/auth/register', data)
    localStorage.setItem(TOKEN_KEY, r.token); setUser(r.user)
  }
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('resq_current_user')
    setUser(null)
    // NOTE: Maintain KEY_INCIDENTS and mock telemetry state so logging back in continues the operational flow smoothly!
  }

  if (booting) return <div className="h-screen grid place-items-center text-slate-500">Loading…</div>
  return (
    <C.Provider value={{ user, login, register, logout, incidents, ambulances, hospitals, cameras, loading, error, connected, backendConnected, refresh, tracking, toasts, push, selectedId, setSelectedId }}>
      {children}
    </C.Provider>
  )
}
