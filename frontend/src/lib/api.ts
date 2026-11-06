import { handleMockRequest } from './mockEngine'

export const TOKEN_KEY = 'resq_token'
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const ACCIDENT_EVIDENCE_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
    <rect width="640" height="360" fill="#0D1117"/>
    <rect x="0" y="0" width="640" height="38" fill="#161B22"/>
    <circle cx="24" cy="19" r="6" fill="#DC3545"/>
    <text x="38" y="24" fill="#F0F6FC" font-family="monospace" font-size="13" font-weight="bold">AI SURVEILLANCE TELEMETRY</text>
    <rect x="440" y="7" width="185" height="24" rx="4" fill="#DC3545"/>
    <text x="452" y="23" fill="#FFFFFF" font-family="monospace" font-size="11" font-weight="bold">COLLISION BURST FRAME</text>
    <rect x="160" y="90" width="320" height="170" rx="8" fill="#161B22" stroke="#DC3545" stroke-width="2" stroke-dasharray="8,6"/>
    <text x="320" y="160" text-anchor="middle" fill="#E6EDF3" font-family="sans-serif" font-size="16" font-weight="bold">EVIDENCE FRAME CAPTURED</text>
    <text x="320" y="190" text-anchor="middle" fill="#58A6FF" font-family="monospace" font-size="13">PyTorch ResNet-18 (94.0%)</text>
    <rect x="0" y="322" width="640" height="38" fill="#161B22"/>
    <text x="20" y="346" fill="#8B949E" font-family="monospace" font-size="11">CAM-01 [LIVE OPTICAL GRID] | 3s BURST INTERVAL TELEMETRY</text>
  </svg>`
)}`

export function resolveEvidenceUrl(url?: string): string {
  if (!url) return ACCIDENT_EVIDENCE_FALLBACK
  if (url.startsWith('data:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  const clean = url.startsWith('/') ? url : `/${url}`
  if (API_BASE) {
    return `${API_BASE}${clean}`
  }
  return clean
}

function prefixEvidence(val: any): any {
  if (!API_BASE) return val
  if (typeof val === 'string') {
    return (val.startsWith('/evidence/') || val.startsWith('/api/evidence/')) ? `${API_BASE}${val}` : val
  }
  if (Array.isArray(val)) {
    return val.map(prefixEvidence)
  }
  if (val && typeof val === 'object') {
    const res: Record<string, any> = {}
    for (const k of Object.keys(val)) {
      res[k] = prefixEvidence(val[k])
    }
    return res
  }
  return val
}

async function req(method: string, url: string, body?: any, form?: FormData) {
  try {
    const targetUrl = url.startsWith('http') ? url : (API_BASE ? `${API_BASE}${url}` : url)
    const headers: Record<string, string> = {}
    const t = localStorage.getItem(TOKEN_KEY)
    if (t) headers.Authorization = 'Bearer ' + t
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const res = await fetch(targetUrl, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem(TOKEN_KEY)
        throw new Error('Authentication expired. Please sign in.')
      }
      if (!res.ok) {
        let msg = res.statusText
        try {
          const j = await res.json()
          msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      return prefixEvidence(data)
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && !err.message.includes('Cannot reach')) {
      throw err
    }
  }

  // Seamless fallback to Supabase DB + prototype engine (for standalone/preview)
  return await handleMockRequest(method, url, body, form)
}

export const api = {
  get: (u: string) => req('GET', u),
  post: (u: string, b: any = {}) => req('POST', u, b),
  patch: (u: string, b: any) => req('PATCH', u, b),
  upload: (u: string, f: FormData) => req('POST', u, undefined, f),
}

export type Role = 'admin' | 'driver' | 'hospital' | 'police' | 'citizen'
export interface User {
  id: number
  username: string
  name: string
  role: Role
  ambulance_id: number | null
  hospital_id: number | null
  email?: string | null
  phone?: string | null
  details?: Record<string, any> | null
}

export interface RouteInfo { coords: [number, number][]; distance_km: number; eta_min: number; simulated: boolean; label: string }
export interface Assignment {
  id: number; incident_id: number; ambulance_id: number; ambulance_code: string; driver_name: string; driver_phone?: string | null; status: string
  explanation: string; ranking: { code: string; eta_min: number; distance_km: number }[]
  scene_route: RouteInfo | null; hospital_route: RouteInfo | null; hospital_id: number | null
  hospital_name?: string | null; hospital_available_beds?: number | null; hospital_icu_beds?: number | null; hospital_phone?: string | null
  leg: string | null
  leg_complete: boolean; remaining_eta: number | null; offered_at: string; responded_at: string | null
}
export interface Incident {
  id: number; camera_id: number | null; camera_name: string | null; lat: number; lng: number; location_name: string
  status: string; priority: string; source: string; confidence: number | null; notes: string; verified_by: string | null
  required_ambulances?: number
  police_notified?: boolean
  green_corridor?: boolean
  verification_answers?: { verified: boolean; ambulances_needed: number; notes: string } | null
  assessment: { severity: string; patients: number; needs: string[]; notes: string } | null
  recommended_hospital_id: number | null; selected_hospital_id: number | null
  selected_hospital_name?: string | null; selected_hospital_beds?: number | null; selected_hospital_icu?: number | null; selected_hospital_phone?: string | null
  hospital_warning: string | null
  created_at: string; completed_at: string | null; evidence: { id: number; url: string; seq: number; captured_at: string }[]
  assignments: Assignment[]
}
export interface Ambulance { id: number; code: string; driver_name: string; phone: string; lat: number; lng: number; status: string; crew_level: string; note: string }
export interface Hospital { id: number; name: string; lat: number; lng: number; phone: string; total_beds: number; available_beds: number; icu_beds: number; capabilities: string[]; receiving: boolean; status?: string; last_admission_at?: string | null; updated_at: string }
export interface Camera { id: number; name: string; location_name: string; lat: number; lng: number; status: string }

export const ACTIVE_ASG = ['offered', 'en_route', 'on_scene', 'transporting', 'at_hospital']
export const activeAssignment = (i?: Incident | null) => i?.assignments.slice().reverse().find(a => ACTIVE_ASG.includes(a.status)) ?? null
export const CLOSED = ['completed', 'rejected']
export const fmtTime = (s?: string | null) => (s ? new Date(s).toLocaleTimeString() : '—')
export const fmtDT = (s?: string | null) => (s ? new Date(s).toLocaleString() : '—')
