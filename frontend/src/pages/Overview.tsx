import { Siren, Truck, Building2, Clock, Camera, ShieldAlert, Radio, ArrowRight } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Stat, Badge, Empty, Spinner, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'
import { CLOSED, fmtDT } from '../lib/api'

export default function Overview({ go }: { go: (p: string) => void }) {
  const { incidents, ambulances, hospitals, cameras, loading, selectedId, setSelectedId } = useApp()
  if (loading && !incidents.length) return <Spinner />

  const open = incidents.filter(i => !CLOSED.includes(i.status))
  const suspected = incidents.filter(i => i.status === 'suspected')
  const availableAmbs = ambulances.filter(a => a.status === 'available')
  const receivingHosps = hospitals.filter(h => h.receiving && h.status !== 'pending_verification')
  const focus = incidents.find(i => i.id === selectedId) ?? open[0] ?? null

  const totalFreeBeds = hospitals.reduce((acc, h) => acc + (h.available_beds || 0), 0)
  const totalFreeIcu = hospitals.reduce((acc, h) => acc + (h.icu_beds || 0), 0)

  return (
    <div className="space-y-6 text-[#171717]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight">Operations Command Grid</h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30">
              SYNCHRONIZED RADAR
            </span>
          </div>
          <p className="text-xs text-[#666666] mt-0.5">
            Real-time cross-agency oversight: AI optical cameras, paramedic fleet units, police green corridors, and hospital trauma bays.
          </p>
        </div>

        {suspected.length > 0 && (
          <button
            onClick={() => go('incidents')}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#FDF9F0] text-[#855B14] border border-[#D69E36]/40 hover:bg-[#FAF3E0] flex items-center gap-2 transition cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#D69E36]" />
            <span>{suspected.length} Incident(s) Awaiting Dispatcher Verification</span>
          </button>
        )}
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active Emergencies"
          value={open.length}
          color="bg-[#DC3545]"
          icon={<Siren className="w-5 h-5" />}
        />
        <Stat
          label="Awaiting Verification"
          value={suspected.length}
          color="bg-[#D69E36]"
          icon={<Clock className="w-5 h-5" />}
        />
        <Stat
          label="Available Fleet Units"
          value={`${availableAmbs.length}/${ambulances.length}`}
          color="bg-[#198754]"
          icon={<Truck className="w-5 h-5" />}
        />
        <Stat
          label="Free Trauma Beds (ICU)"
          value={`${totalFreeBeds} (${totalFreeIcu})`}
          color="bg-[#173B68]"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid: Map & Live Incident Queue */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card
          className="lg:col-span-3"
          title="Live Emergency Map Radar"
          right={
            <button
              className="text-xs font-semibold text-[#173B68] hover:text-[#102A4C] flex items-center gap-1 cursor-pointer"
              onClick={() => go('map')}
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="rounded-lg overflow-hidden border border-[#E2E8F0]">
            <MapView
              ambulances={ambulances}
              hospitals={hospitals}
              incidents={incidents}
              focusIncident={focus}
              routes={routesFor(focus)}
              height={400}
              onSelectIncident={setSelectedId}
            />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Incident Activity Stream"
          right={
            <button
              className="text-xs font-semibold text-[#173B68] hover:text-[#102A4C] flex items-center gap-1 cursor-pointer"
              onClick={() => go('incidents')}
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {!incidents.length ? (
            <Empty
              text="No incidents logged"
              hint="Go to AI Surveillance → Start Local Cam and enable AI Monitoring to test PyTorch model detection."
            />
          ) : (
            <ul className="divide-y divide-[#E2E8F0] max-h-[400px] overflow-y-auto pr-1">
              {incidents.slice(0, 8).map(i => (
                <li
                  key={i.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#F7F8FA] rounded-lg transition"
                  onClick={() => {
                    setSelectedId(i.id)
                    go('incidents')
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-[#171717] truncate">
                      #{i.id} · {i.location_name}
                    </div>
                    <div className="text-[11px] text-[#666666] mt-0.5">{fmtDT(i.created_at)}</div>
                  </div>
                  <Badge s={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Multi-Persona Cross-Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ambulance Fleet Quick Matrix */}
        <Card
          title="Ambulance Fleet Status"
          right={
            <button
              onClick={() => go('ambulances')}
              className="text-xs text-[#173B68] hover:underline cursor-pointer font-medium"
            >
              Manage Units
            </button>
          }
        >
          <div className="space-y-2">
            {ambulances.slice(0, 5).map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${a.status === 'available'
                        ? 'bg-[#198754]'
                        : a.status === 'busy'
                          ? 'bg-[#DC3545]'
                          : 'bg-[#94A3B8]'
                      }`}
                  />
                  <b className="text-[#171717] font-mono">{a.code}</b>
                  <span className="text-[#666666] truncate max-w-[120px]">{a.driver_name}</span>
                </div>
                <Badge s={a.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Hospital Free Bed Matrix */}
        <Card
          title="Hospital Readiness Matrix"
          right={
            <button
              onClick={() => go('hospitals')}
              className="text-xs text-[#173B68] hover:underline cursor-pointer font-medium"
            >
              All Facilities
            </button>
          }
        >
          <div className="space-y-2">
            {hospitals.slice(0, 5).map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[#171717] font-semibold truncate">{h.name}</div>
                  <div className="text-[11px] text-[#666666]">
                    Free Beds: <b className="text-[#198754]">{h.available_beds}</b> · ICU: <b>{h.icu_beds}</b>
                  </div>
                </div>
                <Badge s={h.receiving ? 'receiving' : 'diverted'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Camera Surveillance Feeds Matrix */}
        <Card
          title="AI Traffic Surveillance"
          right={
            <button
              onClick={() => go('camera')}
              className="text-xs text-[#173B68] hover:underline cursor-pointer font-medium"
            >
              Launch Feeds
            </button>
          }
        >
          <div className="space-y-2">
            {cameras.slice(0, 4).map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-3.5 h-3.5 text-[#173B68] shrink-0" />
                  <span className="text-[#171717] font-medium truncate">{c.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#198754] bg-[#F0F9F4] px-2 py-0.5 rounded border border-[#198754]/30">
                  ONLINE (90%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SystemNote />
    </div>
  )
}
