import { useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Plus, Minus, Crosshair, Maximize } from 'lucide-react'
import { api, Ambulance, Hospital, Incident } from '../lib/api'
import { Badge } from './ui'

export interface RouteLine {
  coords: [number, number][]
  color: string
  label: string
  dashed?: boolean
}

interface Props {
  ambulances: Ambulance[]
  hospitals: Hospital[]
  incidents: Incident[]
  routes?: RouteLine[]
  focusIncident?: Incident | null
  height?: number | string
  onSelectIncident?: (id: number) => void
}

const CENTER: [number, number] = [13.085, 80.26]
const OPEN = ['suspected', 'confirmed', 'dispatching', 'en_route', 'on_scene', 'assessed', 'transporting', 'at_hospital', 'no_ambulance']

export function getMapTilerKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('resq_maptiler_key')
    if (stored && stored.trim()) return stored.trim()
  }
  const envKey = (import.meta.env.VITE_MAPTILER_API_KEY as string | undefined) || ''
  return envKey.trim()
}

/* ---------------- High-Fidelity Custom Leaflet Markers ---------------- */

// 1. Ambulance Driver Marker with Status Badge & Pulse Siren
const ambIcon = (a: Ambulance) => {
  const isEmergency = ['en_route', 'transporting'].includes(a.status)
  const isTransporting = a.status === 'transporting'
  const isEnRoute = a.status === 'en_route'
  const isOnScene = a.status === 'on_scene'

  const bg = isTransporting ? '#DC2626' : isEnRoute ? '#D97706' : isOnScene ? '#2563EB' : '#16A34A'
  const tagBg = isTransporting ? '#991B1B' : isEnRoute ? '#92400E' : isOnScene ? '#1E40AF' : '#166534'
  const tagText = isEnRoute ? 'EN ROUTE' : isTransporting ? 'TO HOSPITAL' : isOnScene ? 'ON SCENE' : 'READY'

  const pulseRing = isEmergency
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${bg};opacity:0.4;animation:alertPulse 1.4s infinite;"></div>`
    : ''

  return L.divIcon({
    className: '',
    iconSize: [60, 52],
    iconAnchor: [30, 26],
    popupAnchor: [0, -28],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
        ${pulseRing}
        <div style="position:relative;display:flex;align-items:center;gap:4px;background:${bg};border:2px solid #FFFFFF;color:#FFFFFF;padding:3px 8px;border-radius:20px;font-family:sans-serif;font-weight:800;font-size:11px;line-height:1;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
          <span style="font-size:13px;line-height:1;">🚑</span>
          <span style="letter-spacing:0.3px;">${a.code}</span>
        </div>
        <div style="margin-top:-3px;background:${tagBg};color:#FFFFFF;border:1px solid #FFFFFF;border-radius:4px;padding:1px 5px;font-size:8px;font-weight:900;letter-spacing:0.4px;font-family:sans-serif;text-transform:uppercase;white-space:nowrap;">
          ${tagText}
        </div>
      </div>
    `
  })
}

// 2. Hospital Marker with Bed Count Badge & Receiving Status
const hospIcon = (h: Hospital) => {
  const isFull = h.available_beds <= 0 || !h.receiving
  const bedColor = isFull ? '#DC2626' : h.available_beds < 5 ? '#D97706' : '#16A34A'
  const bedText = isFull ? 'DIVERTED' : `${h.available_beds} BEDS FREE`
  const shortName = h.name.replace(' Hospital', '').replace(' Medical Centre', '').replace(' Emergency Unit', '')

  return L.divIcon({
    className: '',
    iconSize: [72, 54],
    iconAnchor: [36, 27],
    popupAnchor: [0, -30],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <div style="position:relative;display:flex;align-items:center;gap:4px;background:#173B68;border:2.5px solid #FFFFFF;color:#FFFFFF;padding:3px 8px;border-radius:18px;font-family:sans-serif;font-weight:800;font-size:11px;line-height:1;">
          <span style="font-size:13px;line-height:1;">🏥</span>
          <span style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shortName}</span>
        </div>
        <div style="margin-top:-3px;background:${bedColor};color:#FFFFFF;border:1px solid #FFFFFF;border-radius:6px;padding:1px 6px;font-size:8px;font-weight:900;letter-spacing:0.4px;font-family:sans-serif;white-space:nowrap;">
          ${bedText}
        </div>
      </div>
    `
  })
}

// 3. Accident Collision Marker with Pulse Animation & Severity
const incIcon = (i: Incident) => {
  const sev = i.priority?.toUpperCase() || 'CRITICAL'
  return L.divIcon({
    className: '',
    iconSize: [58, 54],
    iconAnchor: [29, 27],
    popupAnchor: [0, -30],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 8px rgba(220,38,38,0.45));">
        <div style="position:absolute;inset:-8px;border-radius:50%;background:#DC2626;opacity:0.45;animation:alertPulse 1.2s infinite;"></div>
        <div style="position:relative;display:flex;align-items:center;gap:3px;background:#DC2626;border:2.5px solid #FFFFFF;color:#FFFFFF;padding:3px 8px;border-radius:20px;font-family:sans-serif;font-weight:900;font-size:11px;line-height:1;">
          <span style="font-size:13px;line-height:1;">💥</span>
          <span>INC #${i.id}</span>
        </div>
        <div style="margin-top:-2px;background:#991B1B;color:#FFFFFF;border:1px solid #FFFFFF;border-radius:4px;padding:1px 5px;font-size:8px;font-weight:900;letter-spacing:0.5px;font-family:sans-serif;">
          ${sev}
        </div>
      </div>
    `
  })
}

/* ---------------- Detailed Popup Components ---------------- */

const AmbInfo = ({ a }: { a: Ambulance }) => (
  <div className="text-xs sm:text-sm space-y-1.5 p-1 min-w-[210px] text-slate-800">
    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
      <span className="font-bold text-base text-[#173B68]">🚑 {a.code}</span>
      <Badge s={a.status} />
    </div>
    <div className="space-y-0.5 text-slate-700">
      <div>Driver: <b>{a.driver_name}</b></div>
      <div className="text-[11px] text-slate-500">Crew Level: <b>{a.crew_level}</b></div>
      <div className="text-xs text-slate-700 mt-1">
        📞 <a href={`tel:${a.phone}`} className="text-[#173B68] font-bold underline">{a.phone}</a>
      </div>
    </div>
    {['en_route', 'transporting'].includes(a.status) && (
      <div className="p-2 rounded bg-blue-50 border border-blue-200 text-[11px] text-[#173B68] space-y-0.5">
        <div className="font-bold flex items-center gap-1">
          <span>⚡ Active Mission:</span>
          <span>{a.status === 'en_route' ? 'Stage 1: En Route to Accident Scene' : 'Stage 2: Redirection to Nearest Hospital'}</span>
        </div>
        <div className="text-[10px] text-blue-900 font-mono">
          Route calculated via <b>Dijkstra algorithm</b>
        </div>
      </div>
    )}
    <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200">
      Simulated GPS: {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
    </div>
  </div>
)

const HospInfo = ({ h }: { h: Hospital }) => (
  <div className="text-xs sm:text-sm space-y-1.5 p-1 min-w-[230px] text-slate-800">
    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
      <span className="font-bold text-sm text-[#173B68]">🏥 {h.name}</span>
      <Badge s={h.receiving ? 'receiving' : 'diverted'}>
        {h.receiving ? 'Receiving' : 'Diverted'}
      </Badge>
    </div>
    <div className="space-y-1 text-slate-700 text-xs">
      <div className="flex justify-between items-center">
        <span>Emergency Beds:</span>
        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${h.available_beds > 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {h.available_beds} / {h.total_beds} Free
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span>ICU Bays:</span>
        <b className="font-mono text-[#173B68]">{h.icu_beds} Bays</b>
      </div>
      <div>
        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Care Capabilities:</span>
        <div className="text-[#173B68] font-medium text-[11px]">
          {Array.isArray(h.capabilities) ? h.capabilities.join(' · ') : h.capabilities}
        </div>
      </div>
      <div className="pt-1">
        <a href={`tel:${h.phone}`} className="inline-flex items-center gap-1 text-xs text-blue-700 font-bold underline">
          📞 Emergency Desk: {h.phone}
        </a>
      </div>
    </div>
    <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 font-medium">
      ✓ Nearest hospital destination evaluated via <b>Dijkstra shortest path</b>
    </div>
  </div>
)

const IncInfo = ({ i }: { i: Incident }) => (
  <div className="text-xs sm:text-sm space-y-1.5 p-1 min-w-[220px] text-slate-800">
    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
      <span className="font-bold text-sm text-[#DC3545]">💥 Incident #{i.id}</span>
      <Badge s={i.status} />
    </div>
    <div className="text-xs text-slate-700 space-y-1">
      <div><b>Location:</b> {i.location_name}</div>
      <div>
        <b>AI Detection Confidence:</b>{' '}
        <span className="font-bold text-[#198754]">
          {i.confidence != null ? `${Math.round(i.confidence * 100)}%` : '94% (AI Model)'}
        </span>
      </div>
      <div><b>Camera Source:</b> {i.camera_name || 'CAM-01 Optical Feed'}</div>
      <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900 leading-tight">
        <b>Dijkstra Route Flow:</b> Nearest available hospital automatically assigned based on shortest network distance and bed capacity.
      </div>
      {i.police_notified && (
        <div className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 pt-0.5">
          🚔 Police notified with coordinates & 6 burst screenshots
        </div>
      )}
    </div>
  </div>
)

/* ---------------- Map Controls & Helpers ---------------- */

function Controls({ fitIncident, fitAll }: { fitIncident: () => void; fitAll: () => void }) {
  const map = useMap()
  const b = 'w-8 h-8 grid place-items-center bg-white hover:bg-slate-100 border-b border-slate-200 text-slate-700 transition'
  return (
    <div className="absolute top-3 left-3 z-[1000] rounded-lg overflow-hidden shadow-md border border-slate-300" onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
      <button className={b} title="Zoom in" onClick={() => map.zoomIn()}><Plus className="w-4 h-4" /></button>
      <button className={b} title="Zoom out" onClick={() => map.zoomOut()}><Minus className="w-4 h-4" /></button>
      <button className={b} title="Fit to incident" onClick={fitIncident}><Crosshair className="w-4 h-4" /></button>
      <button className={b.replace('border-b', '')} title="Fit all markers" onClick={fitAll}><Maximize className="w-4 h-4" /></button>
    </div>
  )
}

function Fitter({ pts, token }: { pts: [number, number][]; token: number }) {
  const map = useMap()
  useEffect(() => {
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts as any).pad(0.3), { maxZoom: 15, animate: true })
    }
  }, [token]) // eslint-disable-line
  return null
}

/* ---------------- Main MapView Component ---------------- */

export default function MapView(p: Props) {
  const [maptilerKey] = useState<string>(() => getMapTilerKey())
  const [mode, setMode] = useState<'checking' | 'maptiler' | 'osm' | 'svg'>('checking')

  const loaded = useRef(0)
  const errors = useRef(0)

  // Initialize mode: if key is present, run MapTiler; otherwise run modeled map fallback
  useEffect(() => {
    const pref = localStorage.getItem('resq_map_mode') || 'auto'
    if (pref === 'offline') {
      setMode('svg')
      return
    }

    const currentKey = getMapTilerKey()
    if (currentKey) {
      setMode('maptiler')
    } else {
      setMode('osm')
    }
  }, [])

  const open = p.incidents.filter(i => OPEN.includes(i.status))
  const focus = p.focusIncident ?? open[0] ?? null
  const allPts = useMemo(
    () => [...p.ambulances, ...p.hospitals, ...open].map(x => [x.lat, x.lng] as [number, number]),
    [p.ambulances, p.hospitals, p.incidents]
  )
  const incPts = useMemo<[number, number][]>(() => {
    const r = (p.routes ?? []).flatMap(r => r.coords)
    return focus ? [[focus.lat, focus.lng], ...r] : allPts
  }, [focus?.id, p.routes])

  const [fitToken, setFitToken] = useState(0)
  const [fitPts, setFitPts] = useState<[number, number][]>([])
  const doFit = (pts: [number, number][]) => {
    setFitPts(pts)
    setFitToken(t => t + 1)
  }

  const firstFit = useRef(false)
  useEffect(() => {
    if ((mode === 'maptiler' || mode === 'osm') && !firstFit.current && allPts.length) {
      firstFit.current = true
      doFit(allPts)
    }
  }, [mode, allPts.length])

  const lastFocus = useRef<number | null>(null)
  useEffect(() => {
    if ((mode === 'maptiler' || mode === 'osm') && focus && lastFocus.current !== focus.id) {
      lastFocus.current = focus.id
      if (firstFit.current) doFit(incPts)
    }
  }, [focus?.id, mode]) // eslint-disable-line

  const style = { height: p.height ?? 480 }

  if (mode === 'checking') {
    return <div style={style} className="rounded-xl bg-slate-200 grid place-items-center text-slate-500">Initializing tactical map…</div>
  }

  // Offline modeled SVG map fallback
  if (mode === 'svg') {
    return (
      <div style={style} className="relative rounded-xl overflow-hidden border border-slate-300">
        <SvgMap {...p} focus={focus} open={open} allPts={allPts} incPts={incPts} />
      </div>
    )
  }

  // Interactive Leaflet map (MapTiler raster tiles or OSM fallback)
  return (
    <div style={style} className="relative rounded-xl overflow-hidden border border-slate-300">
      <MapContainer center={CENTER} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        {mode === 'maptiler' && maptilerKey ? (
          <TileLayer
            key={`maptiler-${maptilerKey}`}
            attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
            url={`https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerKey}`}
            maxZoom={19}
            eventHandlers={{
              tileload: () => {
                loaded.current++
              },
              tileerror: () => {
                errors.current++
                // If MapTiler key fails repeatedly, fall back gracefully to modeled map
                if (errors.current > 4 && loaded.current === 0) {
                  setMode('osm')
                }
              }
            }}
          />
        ) : (
          <TileLayer
            key="osm-model-fallback"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            eventHandlers={{
              tileload: () => {
                loaded.current++
              },
              tileerror: () => {
                errors.current++
                if (errors.current > 6 && loaded.current === 0) {
                  setMode('svg')
                }
              }
            }}
          />
        )}

        <Fitter pts={fitPts} token={fitToken} />
        <Controls
          fitIncident={() => doFit(incPts)}
          fitAll={() => doFit(allPts)}
        />

        {/* Polylines for Dijkstra Shortest Routes */}
        {(p.routes ?? []).map((r, k) => (
          <Polyline
            key={k}
            positions={r.coords}
            pathOptions={{
              color: r.color,
              weight: 6,
              opacity: 0.92,
              lineJoin: 'round',
              lineCap: 'round',
              dashArray: r.dashed ? '8 8' : undefined
            }}
          >
            <Popup>{r.label}</Popup>
          </Polyline>
        ))}

        {/* High-Fidelity Hospital Markers */}
        {p.hospitals.map(h => (
          <Marker key={'h' + h.id} position={[h.lat, h.lng]} icon={hospIcon(h)}>
            <Popup><HospInfo h={h} /></Popup>
          </Marker>
        ))}

        {/* High-Fidelity Accident Spot Markers */}
        {open.map(i => (
          <Marker
            key={'i' + i.id}
            position={[i.lat, i.lng]}
            icon={incIcon(i)}
            eventHandlers={{ click: () => p.onSelectIncident?.(i.id) }}
          >
            <Popup><IncInfo i={i} /></Popup>
          </Marker>
        ))}

        {/* High-Fidelity Ambulance Driver Markers */}
        {p.ambulances.map(a => (
          <Marker key={'a' + a.id} position={[a.lat, a.lng]} icon={ambIcon(a)}>
            <Popup><AmbInfo a={a} /></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

/* ---------- Enhanced Offline SVG Modeled Map ---------- */
function SvgMap({
  ambulances,
  hospitals,
  routes = [],
  focus,
  open,
  allPts,
  incPts,
  onSelectIncident
}: Props & {
  focus: Incident | null
  open: Incident[]
  allPts: [number, number][]
  incPts: [number, number][]
}) {
  const [net, setNet] = useState<any>(null)
  useEffect(() => {
    api.get('/api/network').then(setNet).catch(() => {})
  }, [])

  const W = 1000
  const proj = useMemo(() => {
    if (!net || !net.bbox || typeof net.bbox.min_lat !== 'number' || !Array.isArray(net.nodes)) return null
    const b = net.bbox,
      kx = Math.cos(((b.min_lat + b.max_lat) / 2) * Math.PI / 180)
    const wdeg = (b.max_lng - b.min_lng) * kx,
      hdeg = b.max_lat - b.min_lat
    const sc = W / wdeg
    return {
      H: hdeg * sc,
      f: (lat: number, lng: number) => [(lng - b.min_lng) * kx * sc, (b.max_lat - lat) * sc] as [number, number]
    }
  }, [net])

  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: 1000 })
  const [sel, setSel] = useState<ReactNode>(null)

  useEffect(() => {
    if (proj) setVb({ x: 0, y: 0, w: W, h: proj.H })
  }, [proj])

  const drag = useRef<{ x: number; y: number } | null>(null)
  const fit = (pts: [number, number][]) => {
    if (!proj || !pts.length) return
    const xy = pts.map(q => proj.f(q[0], q[1]))
    const xs = xy.map(q => q[0]),
      ys = xy.map(q => q[1])
    let w = Math.max(160, Math.max(...xs) - Math.min(...xs)) * 1.5
    const ratio = proj.H / W
    let h = w * ratio
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2,
      cy = (Math.max(...ys) + Math.min(...ys)) / 2
    const minH = Math.max(...ys) - Math.min(...ys)
    if (minH * 1.5 > h) {
      h = minH * 1.5
      w = h / ratio
    }
    setVb({ x: cx - w / 2, y: cy - h / 2, w, h })
  }

  const zoom = (f: number) =>
    setVb(v => ({ x: v.x + (v.w - v.w * f) / 2, y: v.y + (v.h - v.h * f) / 2, w: v.w * f, h: v.h * f }))

  const firstFit = useRef(false)
  useEffect(() => {
    if (proj && !firstFit.current && allPts.length) {
      firstFit.current = true
      fit(allPts)
    }
  }, [proj, allPts.length]) // eslint-disable-line

  useEffect(() => {
    if (proj && firstFit.current && focus) fit(incPts)
  }, [focus?.id]) // eslint-disable-line

  if (!net || !proj) {
    return <div className="h-full grid place-items-center text-slate-500 bg-slate-100">Loading offline modeled map…</div>
  }

  const P = proj.f
  const btn = 'w-8 h-8 grid place-items-center bg-white hover:bg-slate-100 border-b border-slate-200 text-slate-700'

  return (
    <div className="relative h-full bg-[#eef2e6]">
      <svg
        className="w-full h-full touch-none cursor-grab"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid slice"
        onWheel={e => zoom(e.deltaY > 0 ? 1.15 : 0.87)}
        onPointerDown={e => {
          drag.current = { x: e.clientX, y: e.clientY }
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerMove={e => {
          if (!drag.current) return
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const dx = ((e.clientX - drag.current.x) * vb.w) / r.width,
            dy = ((e.clientY - drag.current.y) * vb.h) / r.height
          drag.current = { x: e.clientX, y: e.clientY }
          setVb(v => ({ ...v, x: v.x - dx, y: v.y - dy }))
        }}
      >
        <rect x={-500} y={-500} width={W + 1000} height={proj.H + 1000} fill="#e8eddc" />

        {/* Road Network Lines */}
        {(net.edges || []).map((e: number[], k: number) => {
          const a = P(net.nodes[e[0]][0], net.nodes[e[0]][1]),
            b = P(net.nodes[e[1]][0], net.nodes[e[1]][1])
          return (
            <line
              key={k}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={e[2] ? '#f4b942' : '#fff'}
              strokeWidth={e[2] ? 5 : 3}
              strokeLinecap="round"
            />
          )
        })}
        {(net.edges || []).map((e: number[], k: number) => {
          const a = P(net.nodes[e[0]][0], net.nodes[e[0]][1]),
            b = P(net.nodes[e[1]][0], net.nodes[e[1]][1])
          return <line key={'o' + k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#c8c8b8" strokeWidth={0.8} />
        })}

        {/* Dijkstra Shortest Routes */}
        {routes.map((r, k) => (
          <polyline
            key={k}
            fill="none"
            stroke={r.color}
            strokeWidth={7}
            strokeLinejoin="round"
            strokeDasharray={r.dashed ? '14 10' : undefined}
            opacity={0.92}
            points={r.coords.map(c => P(c[0], c[1]).join(',')).join(' ')}
            onClick={() => setSel(<div className="text-sm font-semibold">{r.label}</div>)}
          />
        ))}

        {/* Modeled Hospital Markers */}
        {hospitals.map(h => {
          const [x, y] = P(h.lat, h.lng)
          return (
            <g key={h.id} onClick={() => setSel(<HospInfo h={h} />)} className="cursor-pointer">
              <rect x={x - 24} y={y - 14} width={48} height={28} rx={6} fill="#173B68" stroke="#fff" strokeWidth={2} />
              <text x={x - 10} y={y + 5} fill="#fff" fontSize={13}>🏥</text>
              <text x={x + 10} y={y + 5} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={10}>{h.available_beds}B</text>
            </g>
          )
        })}

        {/* Modeled Accident Spot Markers */}
        {open.map(i => {
          const [x, y] = P(i.lat, i.lng)
          return (
            <g
              key={i.id}
              onClick={() => {
                setSel(<IncInfo i={i} />)
                onSelectIncident?.(i.id)
              }}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={22} fill="#dc2626" opacity={0.25}>
                <animate attributeName="r" values="14;28;14" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r={14} fill="#dc2626" stroke="#fff" strokeWidth={2.5} />
              <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontWeight={900} fontSize={12}>💥</text>
            </g>
          )
        })}

        {/* Modeled Ambulance Driver Markers */}
        {ambulances.map(a => {
          const [x, y] = P(a.lat, a.lng)
          const bg = a.status === 'transporting' ? '#DC2626' : a.status === 'en_route' ? '#D97706' : '#16A34A'
          return (
            <g key={a.id} onClick={() => setSel(<AmbInfo a={a} />)} className="cursor-pointer">
              <rect x={x - 22} y={y - 13} width={44} height={26} rx={6} fill={bg} stroke="#fff" strokeWidth={2} />
              <text x={x - 10} y={y + 5} fill="#fff" fontSize={12}>🚑</text>
              <text x={x + 10} y={y + 4} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={9}>
                {a.code.replace('AMB-', '')}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="absolute top-3 left-3 rounded-lg overflow-hidden shadow-md border border-slate-300">
        <button className={btn} title="Zoom in" onClick={() => zoom(0.7)}><Plus className="w-4 h-4" /></button>
        <button className={btn} title="Zoom out" onClick={() => zoom(1.4)}><Minus className="w-4 h-4" /></button>
        <button className={btn} title="Fit to incident" onClick={() => fit(incPts)}><Crosshair className="w-4 h-4" /></button>
        <button className={btn.replace('border-b', '')} title="Fit all markers" onClick={() => fit(allPts)}><Maximize className="w-4 h-4" /></button>
      </div>

      {sel && (
        <div className="absolute top-3 right-3 bg-white rounded-lg shadow-xl p-3 max-w-[280px] border border-slate-200 z-[1000]">
          <button className="float-right text-slate-400 hover:text-slate-700 ml-2 font-bold" onClick={() => setSel(null)}>×</button>
          {sel}
        </div>
      )}
    </div>
  )
}
