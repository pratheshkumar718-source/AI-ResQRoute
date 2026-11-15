import { useState, useEffect, useRef, useMemo } from 'react'
import {
  PhoneCall, ShieldAlert, AlertTriangle, Video, Camera, Upload, CheckCircle2,
  MapPin, Clock, Truck, Building2, User, Users, HeartHandshake, Eye, Sparkles,
  ChevronRight, ArrowLeft, RefreshCw, Plus, Trash2, Edit2, Star, Check, X,
  Navigation, ExternalLink, HelpCircle, AlertOctagon, Info, Play, Square, RotateCcw
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, Alert, useAct } from '../components/ui'
import {
  api, Incident, Hospital, Ambulance, EmergencyContact,
  activeAssignment, fmtDT, fmtTime, resolveEvidenceUrl, ACCIDENT_EVIDENCE_FALLBACK,
  AiAnalysis, GeminiAnalysis
} from '../lib/api'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'

// Haversine distance calculator in kilometres
function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

const ACCIDENT_TYPES = [
  'Vehicle collision',
  'Two-wheeler accident',
  'Car accident',
  'Multiple vehicle collision',
  'Pedestrian accident',
  'Other / Unknown'
]

// 10-step emergency coordination lifecycle
const LIFECYCLE_STEPS = [
  { key: 'submitted', label: 'Report Submitted', desc: 'Emergency telemetry transmitted' },
  { key: 'ai_analyzed', label: 'AI Video Analyzed', desc: 'PyTorch collision scan completed' },
  { key: 'verifying', label: 'Dispatcher Verifying', desc: 'Chief Dispatcher reviewing scene' },
  { key: 'dispatched', label: 'Paramedic Dispatched', desc: 'Nearest unit allocated' },
  { key: 'en_route', label: 'En Route to Scene', desc: 'Ambulance navigating road corridor' },
  { key: 'on_scene', label: 'Arrived on Scene', desc: 'Paramedics rendering immediate care' },
  { key: 'assessed', label: 'Triage Assessment', desc: 'Clinical evaluation recorded' },
  { key: 'transporting', label: 'To Hospital', desc: 'Transit to receiving emergency unit' },
  { key: 'at_hospital', label: 'Arrived at Hospital', desc: 'Emergency bed handover active' },
  { key: 'completed', label: 'Case Completed', desc: 'Patient safely admitted' }
]

function getLifecycleIndex(inc: Incident): number {
  const asg = activeAssignment(inc)
  if (inc.status === 'completed') return 9
  if (asg?.status === 'at_hospital' || inc.status === 'at_hospital') return 8
  if (asg?.status === 'transporting' || inc.status === 'transporting') return 7
  if (inc.status === 'assessed') return 6
  if (asg?.status === 'on_scene' || inc.status === 'on_scene') return 5
  if (asg?.status === 'en_route' || inc.status === 'en_route') return 4
  if (asg?.status === 'offered' || inc.status === 'dispatching') return 3
  if (inc.status === 'suspected') {
    return inc.ai_analysis ? 2 : 1
  }
  return 0
}

function parseJsonSafe<T>(val: any): T | null {
  if (!val) return null
  if (typeof val === 'object') return val as T
  try {
    return JSON.parse(val) as T
  } catch {
    return null
  }
}

export default function CitizenDashboard() {
  const { user, incidents, ambulances, hospitals, refresh, tracking, setSelectedId } = useApp()
  const act = useAct()

  // Tabs
  const [activeTab, setActiveTab] = useState<'tracking' | 'hospitals' | 'reports' | 'contacts' | 'guide'>('tracking')

  // Modals
  const [reportingModalOpen, setReportingModalOpen] = useState(false)
  const [call108ModalOpen, setCall108ModalOpen] = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null)

  // Citizen Live Location
  const [citizenGps, setCitizenGps] = useState<{ lat: number; lng: number; address: string; accuracy?: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Contacts & Reports lists
  const [myReports, setMyReports] = useState<Incident[]>([])
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loadingReports, setLoadingReports] = useState(false)

  // Multi-step Report Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [accidentLat, setAccidentLat] = useState<number>(13.0827)
  const [accidentLng, setAccidentLng] = useState<number>(80.2707)
  const [locationName, setLocationName] = useState<string>('Central Junction, Anna Salai')
  const [isCurrentLocation, setIsCurrentLocation] = useState<'yes' | 'no' | null>(null)

  // Evidence state
  const [videoMode, setVideoMode] = useState<'none' | 'record' | 'upload'>('none')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordTimerRef = useRef<any>(null)
  const chunksRef = useRef<Blob[]>([])

  // Details state
  const [accidentType, setAccidentType] = useState<string>('Vehicle collision')
  const [vehiclesInvolved, setVehiclesInvolved] = useState<number | ''>(2)
  const [injuredCount, setInjuredCount] = useState<number | ''>(1)
  const [relationship, setRelationship] = useState<string>('reporting as a witness')
  const [reporterPhone, setReporterPhone] = useState<string>(user?.phone || '+91-98401-23456')
  const [description, setDescription] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null)

  // Contact Form state
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRelation, setContactRelation] = useState('Family')
  const [contactIsPrimary, setContactIsPrimary] = useState(false)

  // Detect GPS on mount
  useEffect(() => {
    detectLocation()
    fetchContacts()
    fetchMyReports()
  }, [user?.id])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setCitizenGps({ lat: 13.0827, lng: 80.2707, address: 'Central Junction (Default)' })
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        const addr = `GPS Position (${lat}, ${lng})`
        setCitizenGps({ lat, lng, address: addr, accuracy: Math.round(pos.coords.accuracy) })
        setGpsLoading(false)
      },
      () => {
        setCitizenGps({ lat: 13.0827, lng: 80.2707, address: 'Anna Salai, Chennai (Simulated GPS)' })
        setGpsLoading(false)
      },
      { timeout: 7000, enableHighAccuracy: true }
    )
  }

  const fetchContacts = async () => {
    try {
      const res = await api.get('/api/citizen/contacts')
      if (Array.isArray(res)) setContacts(res)
    } catch {
      // fallback
    }
  }

  const fetchMyReports = async () => {
    setLoadingReports(true)
    try {
      const res = await api.get('/api/citizen/my-reports')
      if (Array.isArray(res)) setMyReports(res)
    } catch {
      // fallback to store
      const mine = incidents.filter(i => i.reported_by_user_id === user?.id || i.source === 'citizen_report')
      setMyReports(mine)
    } finally {
      setLoadingReports(false)
    }
  }

  // Find active emergency for this citizen
  const activeIncident = useMemo(() => {
    return incidents.find(
      i => (i.reported_by_user_id === user?.id || i.source === 'citizen_report') &&
        !['completed', 'rejected'].includes(i.status)
    ) || null
  }, [incidents, user?.id])

  // Camera Recording Handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: true
      })
      mediaStreamRef.current = stream
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.play()
      }
    } catch (err: any) {
      alert('Unable to access device camera. Please check camera permissions or upload a video file instead.')
      setVideoMode('upload')
    }
  }

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null
    }
  }

  const handleStartRecording = () => {
    if (!mediaStreamRef.current) return
    chunksRef.current = []
    const rec = new MediaRecorder(mediaStreamRef.current)
    mediaRecorderRef.current = rec

    rec.ondataavailable = ev => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
    }

    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' })
      setRecordedBlob(blob)
      const url = URL.createObjectURL(blob)
      setRecordedVideoUrl(url)
      stopCameraStream()
    }

    rec.start(500)
    setIsRecording(true)
    setRecordSecs(0)
    recordTimerRef.current = setInterval(() => {
      setRecordSecs(s => {
        if (s >= 20) {
          handleStopRecording()
          return 20
        }
        return s + 1
      })
    }, 1000)
  }

  const handleStopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const handleRetakeVideo = () => {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl)
    setRecordedBlob(null)
    setRecordedVideoUrl(null)
    setRecordSecs(0)
    startCamera()
  }

  const handleVideoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid MP4 or MOV video file.')
      return
    }
    setUploadedVideoFile(file)
    setUploadedVideoUrl(URL.createObjectURL(file))
  }

  const handlePhotoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPhotoFiles(prev => [...prev, ...files].slice(0, 4))
    const urls = files.map(f => URL.createObjectURL(f))
    setPhotoPreviews(prev => [...prev, ...urls].slice(0, 4))
  }

  // Cleanup media stream on modal close or unmount
  useEffect(() => {
    return () => {
      stopCameraStream()
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [])

  // Start wizard
  const openReportingWizard = () => {
    const lat = citizenGps?.lat || 13.0827
    const lng = citizenGps?.lng || 80.2707
    setAccidentLat(lat)
    setAccidentLng(lng)
    setLocationName(citizenGps?.address || 'Near Anna Salai Junction')
    setIsCurrentLocation('yes')
    setStep(1)
    setVideoMode('none')
    setRecordedBlob(null)
    setRecordedVideoUrl(null)
    setUploadedVideoFile(null)
    setUploadedVideoUrl(null)
    setPhotoFiles([])
    setPhotoPreviews([])
    setDescription('')
    setSubmitFeedback(null)
    setReportingModalOpen(true)
  }

  // Submit Emergency Report to backend
  const handleSubmitReport = async () => {
    setSubmitting(true)
    setSubmitFeedback('Transmitting emergency location & incident details...')

    try {
      const fd = new FormData()
      fd.append('lat', accidentLat.toString())
      fd.append('lng', accidentLng.toString())
      fd.append('location_name', locationName)
      fd.append('accident_type', accidentType)
      fd.append('vehicles_involved', vehiclesInvolved ? vehiclesInvolved.toString() : '1')
      fd.append('injured_count', injuredCount ? injuredCount.toString() : '1')
      fd.append('citizen_relationship', relationship)
      fd.append('reporter_phone', reporterPhone)
      fd.append('description', description)
      fd.append('priority', injuredCount && Number(injuredCount) > 1 ? 'critical' : 'high')

      // Attach video if available
      if (recordedBlob) {
        setSubmitFeedback('Uploading recorded video & executing PyTorch ResNet-18 analysis...')
        const vidFile = new File([recordedBlob], 'citizen_accident_capture.mp4', { type: 'video/mp4' })
        fd.append('video', vidFile)
      } else if (uploadedVideoFile) {
        setSubmitFeedback('Uploading video footage & running frame-by-frame AI scan...')
        fd.append('video', uploadedVideoFile)
      }

      // Attach optional photos
      photoFiles.forEach(p => {
        fd.append('photos', p)
      })

      const res = await api.upload('/api/citizen/report', fd)

      setSubmitFeedback('Emergency reported! Chief Dispatcher & Paramedic units alerted.')
      setTimeout(() => {
        setSubmitting(false)
        setReportingModalOpen(false)
        stopCameraStream()
        refresh()
        fetchMyReports()
        setActiveTab('tracking')
        if (res?.id) setSelectedId(res.id)
      }, 1200)
    } catch (err: any) {
      setSubmitting(false)
      alert(`Submission error: ${err.message || 'Could not reach server'}`)
    }
  }

  // 108 Emergency Dial Action
  const handleDial108 = () => {
    // Attempt tel: protocol for mobile devices
    try {
      window.location.href = 'tel:108'
    } catch { }
    setCall108ModalOpen(true)
  }

  // Contacts CRUD
  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      alert('Please enter both name and telephone number.')
      return
    }

    try {
      if (editingContact) {
        await api.patch(`/api/citizen/contacts/${editingContact.id}`, {
          name: contactName,
          phone: contactPhone,
          relationship_type: contactRelation,
          is_primary: contactIsPrimary
        })
      } else {
        await api.post('/api/citizen/contacts', {
          name: contactName,
          phone: contactPhone,
          relationship_type: contactRelation,
          is_primary: contactIsPrimary
        })
      }
      setContactModalOpen(false)
      setEditingContact(null)
      fetchContacts()
    } catch (err: any) {
      alert(`Error saving contact: ${err.message}`)
    }
  }

  const handleDeleteContact = async (cid: number) => {
    if (!confirm('Remove this emergency contact?')) return
    try {
      await api.delete(`/api/citizen/contacts/${cid}`)
      fetchContacts()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const openEditContact = (c: EmergencyContact) => {
    setEditingContact(c)
    setContactName(c.name)
    setContactPhone(c.phone)
    setContactRelation(c.relationship_type || 'Family')
    setContactIsPrimary(c.is_primary)
    setContactModalOpen(true)
  }

  const openNewContact = () => {
    setEditingContact(null)
    setContactName('')
    setContactPhone('')
    setContactRelation('Family')
    setContactIsPrimary(contacts.length === 0)
    setContactModalOpen(true)
  }

  // Calculated distance for nearby hospitals
  const sortedHospitals = useMemo(() => {
    const curLat = citizenGps?.lat || 13.0827
    const curLng = citizenGps?.lng || 80.2707
    return [...hospitals].map(h => {
      const distKm = calcDistanceKm(curLat, curLng, h.lat, h.lng)
      const estEtaMin = Math.max(2, Math.round(distKm * 2.5))
      return { ...h, distKm, estEtaMin }
    }).sort((a, b) => a.distKm - b.distKm)
  }, [hospitals, citizenGps])

  const asg = activeAssignment(activeIncident)
  const currentStepIdx = activeIncident ? getLifecycleIndex(activeIncident) : 0

  return (
    <div className="space-y-6 text-[#171717] max-w-7xl mx-auto pb-12">
      {/* 1. WELCOME & EMERGENCY HEADER */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#CBD5E1] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-pulse"></span>
            <span className="text-xs font-bold font-mono tracking-wider text-[#166534] uppercase bg-[#F0F9F4] px-2.5 py-0.5 rounded-full border border-[#198754]/30">
              Citizen Emergency Responder
            </span>
            {citizenGps?.accuracy && (
              <span className="text-[11px] text-[#666666] font-mono">
                GPS ±{citizenGps.accuracy}m
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171717]">
            Welcome, {user?.name || 'Citizen Responder'}
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#666666] pt-0.5">
            <MapPin className="w-3.5 h-3.5 text-[#DC3545]" />
            <span>
              {gpsLoading ? 'Detecting high-precision GPS…' : citizenGps?.address || 'Chennai Central Zone'}
            </span>
            <button
              onClick={detectLocation}
              className="text-[#173B68] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
              Refresh GPS
            </button>
          </div>
        </div>

        {/* Top Emergency Trigger Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* OPTION B: Call 108 */}
          <button
            onClick={handleDial108}
            className="flex items-center justify-center gap-2.5 px-4 py-3 bg-[#DC3545] hover:bg-[#BB2D3B] text-white rounded-xl font-bold text-sm shadow-md transition transform active:scale-95 cursor-pointer border border-[#B02A37]"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Call 108 Emergency</span>
          </button>

          {/* OPTION A: AI Report Button */}
          <button
            onClick={openReportingWizard}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#173B68] hover:bg-[#122E52] text-white rounded-xl font-bold text-sm shadow-md transition transform active:scale-95 cursor-pointer border border-[#0F2643]"
          >
            <ShieldAlert className="w-4 h-4 text-[#D69E36]" />
            <span>Report an Accident (AI Assisted)</span>
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E2E8F0] scrollbar-none">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'tracking'
              ? 'bg-[#173B68] text-white shadow-sm'
              : 'bg-white text-[#666666] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Active Response & Tracking</span>
          {activeIncident && (
            <span className="w-2 h-2 rounded-full bg-[#DC3545] animate-ping ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'hospitals'
              ? 'bg-[#173B68] text-white shadow-sm'
              : 'bg-white text-[#666666] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Nearby Hospitals ({sortedHospitals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#173B68] text-white shadow-sm'
              : 'bg-white text-[#666666] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Reports ({myReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-[#173B68] text-white shadow-sm'
              : 'bg-white text-[#666666] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Emergency Contacts ({contacts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-[#173B68] text-white shadow-sm'
              : 'bg-white text-[#666666] hover:bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Good Samaritan Rights & First Aid</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB A: ACTIVE EMERGENCY & LIVE TRACKING */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {activeIncident ? (
            <div className="space-y-6">
              {/* Emergency Status Banner */}
              <div className="bg-gradient-to-r from-[#DC3545] to-[#B02A37] text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-sm">
                      🚨 ACTIVE EMERGENCY DISPATCH #{activeIncident.id}
                    </span>
                    <span className="text-xs text-white/80 font-mono">
                      Reported {fmtTime(activeIncident.created_at)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black">
                    {activeIncident.location_name}
                  </h2>
                  <p className="text-xs text-white/90">
                    {activeIncident.notes || `${activeIncident.accident_type || 'Accident'} reported with immediate priority.`}
                  </p>
                </div>

                {asg && (
                  <div className="flex items-center gap-4 bg-black/20 p-3.5 rounded-xl border border-white/20 backdrop-blur-sm">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-white/70 font-semibold">Assigned Ambulance</div>
                      <div className="text-lg font-black">{asg.ambulance_code}</div>
                      <div className="text-xs text-white/90">{asg.driver_name}</div>
                    </div>
                    {asg.driver_phone && (
                      <a
                        href={`tel:${asg.driver_phone}`}
                        className="p-2.5 bg-white text-[#DC3545] hover:bg-white/90 rounded-xl shadow transition"
                        title="Call Driver"
                      >
                        <PhoneCall className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* 10-Step Progress Tracker */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#CBD5E1] shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#173B68] mb-4 flex items-center justify-between">
                  <span>Emergency Response Lifecycle (10 Staged Milestones)</span>
                  <span className="text-xs font-mono text-[#666666]">
                    Step {currentStepIdx + 1} of 10
                  </span>
                </h3>

                {/* Progress bar */}
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden mb-6">
                  <div
                    className="bg-[#198754] h-full rounded-full transition-all duration-500"
                    style={{ width: `${((currentStepIdx + 1) / 10) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {LIFECYCLE_STEPS.map((s, idx) => {
                    const isDone = idx < currentStepIdx
                    const isCurrent = idx === currentStepIdx
                    return (
                      <div
                        key={s.key}
                        className={`p-3 rounded-xl border text-xs transition ${
                          isCurrent
                            ? 'border-[#198754] bg-[#F0F9F4] shadow-sm ring-1 ring-[#198754]'
                            : isDone
                            ? 'border-[#CBD5E1] bg-[#F8FAFC]'
                            : 'border-[#E2E8F0] bg-white opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#198754]" />
                          ) : isCurrent ? (
                            <span className="w-3 h-3 rounded-full bg-[#198754] animate-ping" />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-[#CBD5E1]" />
                          )}
                          <span className={`font-bold ${isCurrent ? 'text-[#166534]' : 'text-[#171717]'}`}>
                            {idx + 1}. {s.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#666666] line-clamp-1">{s.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Map & Telemetry Details */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-sm bg-white min-h-[420px]">
                  <MapView
                    ambulances={ambulances}
                    hospitals={hospitals}
                    incidents={incidents}
                    focusIncident={activeIncident}
                    routes={routesFor(activeIncident)}
                    height={460}
                    onSelectIncident={setSelectedId}
                  />
                </div>

                <div className="space-y-4">
                  {/* Ambulance & Driver Card */}
                  <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#173B68] flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      <span>Paramedic Unit Telemetry</span>
                    </h4>
                    {asg ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                          <span className="text-[#666666]">Ambulance Unit</span>
                          <span className="font-bold text-[#173B68]">{asg.ambulance_code}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                          <span className="text-[#666666]">Paramedic Pilot</span>
                          <span className="font-semibold text-[#171717]">{asg.driver_name}</span>
                        </div>
                        {asg.scene_route && (
                          <>
                            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                              <span className="text-[#666666]">Road Distance</span>
                              <span className="font-mono font-bold text-[#171717]">{asg.scene_route.distance_km} km</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                              <span className="text-[#666666]">Estimated Arrival ETA</span>
                              <span className="font-mono font-bold text-[#DC3545]">{asg.scene_route.eta_min} min</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between py-1">
                          <span className="text-[#666666]">Current Status</span>
                          <Badge s={asg.status} />
                        </div>
                        {asg.driver_phone && (
                          <a
                            href={`tel:${asg.driver_phone}`}
                            className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-[#F0F9F4] text-[#166534] border border-[#198754]/30 rounded-xl font-bold hover:bg-[#DCFCE7] transition"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call Paramedic ({asg.driver_phone})</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#666666] italic">Chief Dispatcher is allocating the nearest eligible ambulance unit…</p>
                    )}
                  </div>

                  {/* Designated Hospital Card */}
                  <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#198754] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      <span>Designated Emergency Hospital</span>
                    </h4>
                    {activeIncident.selected_hospital_name || asg?.hospital_name ? (
                      <div className="space-y-2 text-xs">
                        <div className="font-bold text-sm text-[#171717]">
                          {activeIncident.selected_hospital_name || asg?.hospital_name}
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                          <span className="text-[#666666]">Available Emergency Beds</span>
                          <span className="font-bold text-[#198754]">
                            {activeIncident.selected_hospital_beds ?? asg?.hospital_available_beds ?? 'Available'} beds
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                          <span className="text-[#666666]">ICU Capacity</span>
                          <span className="font-bold text-[#173B68]">
                            {activeIncident.selected_hospital_icu ?? asg?.hospital_icu_beds ?? '2'} ICU beds ready
                          </span>
                        </div>
                        {(activeIncident.selected_hospital_phone || asg?.hospital_phone) && (
                          <a
                            href={`tel:${activeIncident.selected_hospital_phone || asg?.hospital_phone}`}
                            className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30 rounded-xl font-bold hover:bg-[#DBEAFE] transition"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call Hospital Emergency Desk</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#666666] italic">Nearest hospital triage matching in progress…</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: No active emergency */
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#CBD5E1] shadow-sm text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 bg-[#F0F9F4] text-[#198754] rounded-2xl grid place-items-center mx-auto text-2xl border border-[#198754]/30 shadow-sm">
                🛡️
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-[#171717]">No Active Emergency Dispatches</h3>
                <p className="text-xs text-[#666666] max-w-md mx-auto">
                  You do not have any ongoing emergency requests. If you witness or encounter a road accident, report immediately using Option A or call 108.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={openReportingWizard}
                  className="w-full sm:w-auto px-6 py-3 bg-[#173B68] hover:bg-[#122E52] text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
                >
                  Report an Accident (AI Assisted)
                </button>
                <button
                  onClick={handleDial108}
                  className="w-full sm:w-auto px-6 py-3 bg-[#DC3545] hover:bg-[#BB2D3B] text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
                >
                  Direct 108 Emergency Call
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: NEARBY HOSPITALS */}
      {activeTab === 'hospitals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#171717]">Emergency Hospital Capacity Radar</h2>
              <p className="text-xs text-[#666666]">
                Sorted by real driving proximity from your current position ({citizenGps?.address || 'Chennai Central'}).
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#198754] bg-[#F0F9F4] px-3 py-1 rounded-lg border border-[#198754]/30 self-start sm:self-auto">
              Real-time Bed Telemetry
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedHospitals.map(h => (
              <div
                key={h.id}
                className="bg-white rounded-2xl p-5 border border-[#CBD5E1] shadow-sm flex flex-col justify-between hover:border-[#173B68] transition"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#171717]">{h.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#666666] mt-0.5 font-mono">
                        <MapPin className="w-3 h-3 text-[#DC3545]" />
                        <span>{h.distKm} km away · ~{h.estEtaMin} min drive</span>
                      </div>
                    </div>
                    {h.receiving ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0F9F4] text-[#166534] border border-[#198754]/30 uppercase">
                        Receiving
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF9F0] text-[#855B14] border border-[#D69E36]/30 uppercase">
                        Full
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#666666] uppercase block font-semibold">Available Beds</span>
                      <span className="text-base font-extrabold text-[#198754]">{h.available_beds}</span>
                      <span className="text-[10px] text-[#666666] block">of {h.total_beds} total</span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                      <span className="text-[10px] text-[#666666] uppercase block font-semibold">ICU Units</span>
                      <span className="text-base font-extrabold text-[#173B68]">{h.icu_beds}</span>
                      <span className="text-[10px] text-[#666666] block">critical care</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {h.capabilities?.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/20 capitalize"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-[#E2E8F0] grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${h.phone}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F0F9F4] hover:bg-[#DCFCE7] text-[#166534] border border-[#198754]/30 rounded-xl text-xs font-bold transition text-center"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Desk</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#EBF2FA] hover:bg-[#DBEAFE] text-[#173B68] border border-[#356FA5]/30 rounded-xl text-xs font-bold transition text-center"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Navigate</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB C: MY REPORTS / INCIDENT HISTORY */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#171717]">My Emergency Incident Reports</h2>
              <p className="text-xs text-[#666666]">
                Audit history of all roadside emergencies and reports logged under your citizen identity.
              </p>
            </div>
            <button
              onClick={fetchMyReports}
              className="text-xs text-[#173B68] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
              Refresh Reports
            </button>
          </div>

          {!myReports.length ? (
            <div className="bg-white rounded-2xl p-8 border border-[#CBD5E1] text-center space-y-3">
              <Clock className="w-10 h-10 text-[#666666] mx-auto opacity-50" />
              <h4 className="font-bold text-sm text-[#171717]">No Incident Reports Found</h4>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                You have not filed any accident reports yet. Emergency reports filed through Option A appear here with full video and AI telemetry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map(rep => {
                const ai = parseJsonSafe<AiAnalysis>(rep.ai_analysis)
                const gem = parseJsonSafe<GeminiAnalysis>(rep.gemini_analysis)
                const asgLast = rep.assignments?.[rep.assignments.length - 1]

                return (
                  <div
                    key={rep.id}
                    className="bg-white rounded-2xl p-5 border border-[#CBD5E1] shadow-sm space-y-4 hover:border-[#173B68] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#173B68]">
                            Incident #{rep.id}
                          </span>
                          <Badge s={rep.status} />
                          {rep.video_url && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0F9F4] text-[#166534] border border-[#198754]/30 flex items-center gap-1">
                              <Video className="w-3 h-3" /> Video Attached
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-[#171717] mt-1">{rep.location_name}</h3>
                        <div className="text-xs text-[#666666] mt-0.5">
                          Logged: {fmtDT(rep.created_at)} · Priority: <span className="uppercase font-bold text-[#DC3545]">{rep.priority}</span>
                        </div>
                      </div>

                      {asgLast && (
                        <div className="text-right sm:self-auto self-start">
                          <div className="text-[11px] text-[#666666]">Assigned Unit</div>
                          <div className="font-bold text-xs text-[#173B68]">{asgLast.ambulance_code} ({asgLast.driver_name})</div>
                        </div>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Accident Type</span>
                        <span className="font-bold text-[#171717]">{rep.accident_type || 'Vehicle collision'}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Vehicles Involved</span>
                        <span className="font-bold text-[#171717]">{rep.vehicles_involved ?? 'Unknown'}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#666666] uppercase block font-semibold">Injured Count</span>
                        <span className="font-bold text-[#DC3545]">{rep.injured_count ?? 'Unknown'}</span>
                      </div>
                    </div>

                    {/* AI Assessment Badges */}
                    {ai && (
                      <div className="p-3 bg-[#F0F9F4] rounded-xl border border-[#198754]/30 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-[#166534]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PyTorch ResNet-18 Model Verdict
                          </span>
                          <span>{ai.category}</span>
                        </div>
                        <p className="text-[11px] text-[#166534]/90">{ai.summary || ai.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB D: EMERGENCY CONTACTS (ICE) */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#171717]">Emergency Contacts (ICE)</h2>
              <p className="text-xs text-[#666666]">
                In Case of Emergency (ICE): Trusted family members and contacts alerted in severe collisions.
              </p>
            </div>
            <button
              onClick={openNewContact}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#173B68] text-white rounded-xl text-xs font-bold hover:bg-[#122E52] transition self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Contact</span>
            </button>
          </div>

          {!contacts.length ? (
            <div className="bg-white rounded-2xl p-8 border border-[#CBD5E1] text-center space-y-3">
              <Users className="w-10 h-10 text-[#666666] mx-auto opacity-50" />
              <h4 className="font-bold text-sm text-[#171717]">No Emergency Contacts Configured</h4>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                Add your family or designated guardians so dispatchers and emergency services can notify them in critical situations.
              </p>
              <button
                onClick={openNewContact}
                className="px-4 py-2 bg-[#173B68] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add Your First Emergency Contact
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {contacts.map(c => (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition ${
                    c.is_primary ? 'border-[#173B68] ring-1 ring-[#173B68]' : 'border-[#CBD5E1]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-[#171717]">{c.name}</h3>
                        <span className="text-xs text-[#666666] capitalize">{c.relationship_type || 'Family'}</span>
                      </div>
                      {c.is_primary && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF2FA] text-[#173B68] border border-[#356FA5]/30 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#173B68]" /> Primary
                        </span>
                      )}
                    </div>
                    <div className="pt-2">
                      <a
                        href={`tel:${c.phone}`}
                        className="text-sm font-mono font-bold text-[#173B68] hover:underline flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-[#198754]" />
                        <span>{c.phone}</span>
                      </a>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditContact(c)}
                      className="p-1.5 text-[#666666] hover:text-[#173B68] rounded-lg hover:bg-[#F8FAFC] transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1.5 text-[#DC3545] hover:text-[#BB2D3B] rounded-lg hover:bg-[#FDF2F2] transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB E: GOOD SAMARITAN RIGHTS & FIRST AID */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Legal Protection Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0F9F4] text-[#166534] border border-[#198754]/30 grid place-items-center text-xl">
                ⚖️
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#171717]">
                  Indian Good Samaritan Protection Law (Section 134A - MV Act)
                </h3>
                <p className="text-xs text-[#666666]">
                  Supreme Court Guidelines & Government of India Mandate protecting helpers.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[#173B68] block">No Civil or Criminal Liability</span>
                <p className="text-[#666666]">
                  A Good Samaritan cannot be held liable for any injury or death that occurs while rendering emergency assistance.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[#173B68] block">No Police Coercion</span>
                <p className="text-[#666666]">
                  You are not required to reveal your name or address. Police cannot force you to be a witness or come to the station.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[#173B68] block">Immediate Hospital Care</span>
                <p className="text-[#666666]">
                  Hospitals must provide immediate resuscitation without demanding upfront payment or detaining the bystander.
                </p>
              </div>
            </div>
          </div>

          {/* First Aid Emergency Reference */}
          <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#DC3545]" />
              <span>Immediate Bystander First Aid Protocol</span>
            </h3>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#173B68] text-white font-bold grid place-items-center text-xs">1</span>
                <h4 className="font-bold text-[#171717]">Ensure Scene Safety</h4>
                <p className="text-[#666666]">
                  Never enter oncoming highway lanes. Put vehicle hazard blinkers on. Ensure no active fuel leak fire hazards.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#173B68] text-white font-bold grid place-items-center text-xs">2</span>
                <h4 className="font-bold text-[#171717]">Check Consciousness</h4>
                <p className="text-[#666666]">
                  Gently tap shoulders and ask loudly: "Are you okay?". Do not jerk or twist neck/spine if spinal trauma is suspected.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#173B68] text-white font-bold grid place-items-center text-xs">3</span>
                <h4 className="font-bold text-[#171717]">Direct Pressure for Bleeding</h4>
                <p className="text-[#666666]">
                  Take clean cloth, jacket, or gauze and apply firm, direct pressure on heavy bleeding wounds until paramedics arrive.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFBFD] space-y-2">
                <span className="w-6 h-6 rounded-full bg-[#173B68] text-white font-bold grid place-items-center text-xs">4</span>
                <h4 className="font-bold text-[#171717]">Call 108 & Keep Clear</h4>
                <p className="text-[#666666]">
                  Keep bystander crowd away from the patient to ensure ventilation and clear the approach corridor for the ambulance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. OPTION A: MULTI-STEP ACCIDENT REPORTING MODAL */}
      {reportingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#CBD5E1] shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-[#173B68] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#93C5FD] font-semibold">
                  Option A · AI-Powered Emergency Reporting
                </span>
                <h2 className="text-lg font-extrabold">Report Road Accident</h2>
              </div>
              <button
                onClick={() => {
                  stopCameraStream()
                  setReportingModalOpen(false)
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="bg-[#F8FAFC] px-6 py-3 border-b border-[#E2E8F0] flex items-center justify-between text-xs">
              {[
                { s: 1, label: 'Location' },
                { s: 2, label: 'Video / Evidence' },
                { s: 3, label: 'Incident Details' },
                { s: 4, label: 'Review & Submit' }
              ].map(st => (
                <div key={st.s} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full font-bold grid place-items-center text-[11px] ${
                    step === st.s
                      ? 'bg-[#173B68] text-white'
                      : step > st.s
                      ? 'bg-[#198754] text-white'
                      : 'bg-[#E2E8F0] text-[#666666]'
                  }`}>
                    {step > st.s ? '✓' : st.s}
                  </span>
                  <span className={`font-semibold hidden sm:inline ${step === st.s ? 'text-[#173B68]' : 'text-[#666666]'}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
              {/* STEP 1: LOCATION SHARING */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#171717]">Step 1: Emergency Location Sharing</h3>
                    <p className="text-xs text-[#666666]">
                      Accurate coordinates allow the nearest ambulance driver to calculate actual road routes without delay.
                    </p>
                  </div>

                  {/* Ask Question: Is accident at your current location? */}
                  <div className="p-4 rounded-2xl bg-[#F0F9F4] border border-[#198754]/30 space-y-2">
                    <span className="text-xs font-bold text-[#166534] block">
                      Is the accident at your current GPS location?
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCurrentLocation('yes')
                          if (citizenGps) {
                            setAccidentLat(citizenGps.lat)
                            setAccidentLng(citizenGps.lng)
                            setLocationName(citizenGps.address)
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          isCurrentLocation === 'yes'
                            ? 'bg-[#198754] text-white border-[#198754]'
                            : 'bg-white text-[#166534] border-[#198754]/40 hover:bg-[#DCFCE7]'
                        }`}
                      >
                        ✓ Yes, at my location
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCurrentLocation('no')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          isCurrentLocation === 'no'
                            ? 'bg-[#173B68] text-white border-[#173B68]'
                            : 'bg-white text-[#173B68] border-[#356FA5]/40 hover:bg-[#EBF2FA]'
                        }`}
                      >
                        ✎ No, adjust location
                      </button>
                    </div>
                  </div>

                  {/* Location Coordinate Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-[#171717] block mb-1">
                        Accident Spot / Landmark Address
                      </label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={e => setLocationName(e.target.value)}
                        placeholder="e.g. Near Gemini Flyover, Anna Salai"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#173B68]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#666666] block mb-0.5">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={accidentLat}
                          onChange={e => setAccidentLat(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#666666] block mb-0.5">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={accidentLng}
                          onChange={e => setAccidentLng(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: VIDEO CAPTURE / UPLOAD */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#171717]">Step 2: Accident Video & Evidence Capture</h3>
                    <p className="text-xs text-[#666666]">
                      Short video footage is analyzed by our PyTorch ResNet-18 model to verify the accident and extract collision frames.
                    </p>
                  </div>

                  {/* Safety Warning Notice */}
                  <div className="p-3.5 rounded-2xl bg-[#FDF9F0] border border-[#D69E36]/40 flex items-start gap-2.5 text-xs text-[#855B14]">
                    <AlertTriangle className="w-4 h-4 text-[#D69E36] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Safety First Warning</span>
                      <span>
                        Do not approach hazardous wreckage, fire, or live traffic. Do not record while driving. Video is completely optional — you may skip if unsafe.
                      </span>
                    </div>
                  </div>

                  {/* Recording / Upload Selection Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoMode('record')
                        startCamera()
                      }}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        videoMode === 'record'
                          ? 'border-[#173B68] bg-[#EBF2FA] text-[#173B68]'
                          : 'border-[#CBD5E1] bg-white text-[#666666] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Camera className="w-5 h-5 text-[#173B68]" />
                      <span>Record Video (Camera)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream()
                        setVideoMode('upload')
                      }}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        videoMode === 'upload'
                          ? 'border-[#173B68] bg-[#EBF2FA] text-[#173B68]'
                          : 'border-[#CBD5E1] bg-white text-[#666666] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-[#173B68]" />
                      <span>Upload Video File (MP4/MOV)</span>
                    </button>
                  </div>

                  {/* Camera Record View */}
                  {videoMode === 'record' && (
                    <div className="space-y-3 bg-black rounded-2xl p-3 overflow-hidden text-center">
                      {!recordedVideoUrl ? (
                        <div className="relative aspect-video max-h-60 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center">
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          {isRecording && (
                            <div className="absolute top-3 left-3 bg-[#DC3545] text-white px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-white" />
                              <span>REC {recordSecs}s / 20s</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <video
                            controls
                            src={recordedVideoUrl}
                            className="w-full max-h-60 rounded-xl object-contain bg-black"
                          />
                          <span className="text-xs text-white/90 font-medium block">
                            ✓ Video recording ready for PyTorch AI processing
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 pt-1">
                        {!recordedVideoUrl ? (
                          !isRecording ? (
                            <button
                              type="button"
                              onClick={handleStartRecording}
                              className="px-4 py-2 bg-[#DC3545] hover:bg-[#BB2D3B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5" /> Start Recording
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStopRecording}
                              className="px-4 py-2 bg-white text-[#DC3545] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Square className="w-3.5 h-3.5 fill-[#DC3545]" /> Stop Recording
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={handleRetakeVideo}
                            className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Retake Video
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* File Upload View */}
                  {videoMode === 'upload' && (
                    <div className="space-y-3">
                      <label className="border-2 border-dashed border-[#CBD5E1] hover:border-[#173B68] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#F8FAFC] transition">
                        <Upload className="w-8 h-8 text-[#173B68] mb-2" />
                        <span className="text-xs font-bold text-[#171717]">Select MP4 or MOV video file</span>
                        <span className="text-[11px] text-[#666666] mt-0.5">Maximum file size: 50 MB</span>
                        <input
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm"
                          onChange={handleVideoUploadChange}
                          className="hidden"
                        />
                      </label>

                      {uploadedVideoUrl && (
                        <div className="bg-black rounded-2xl p-2 max-h-56">
                          <video controls src={uploadedVideoUrl} className="w-full max-h-52 object-contain" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Photos */}
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                    <label className="text-xs font-semibold text-[#171717] flex items-center justify-between">
                      <span>Optional Accident Photographs</span>
                      <span className="text-[11px] text-[#666666]">Up to 4 images</span>
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoUploadChange}
                      className="text-xs text-[#666666]"
                    />
                    {photoPreviews.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {photoPreviews.map((p, idx) => (
                          <img
                            key={idx}
                            src={p}
                            alt="Preview"
                            className="aspect-video object-cover rounded-lg border border-[#CBD5E1]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: INCIDENT DETAILS */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#171717]">Step 3: Incident Details</h3>
                    <p className="text-xs text-[#666666]">
                      Describe the visible vehicles and injuries to help the hospital prepare clinical bed capacity.
                    </p>
                  </div>

                  {/* Accident Type Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#171717]">Accident Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ACCIDENT_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAccidentType(t)}
                          className={`p-2 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                            accidentType === t
                              ? 'border-[#173B68] bg-[#EBF2FA] text-[#173B68] font-bold'
                              : 'border-[#CBD5E1] bg-white text-[#666666] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#171717] block mb-1">
                        Vehicles Involved
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={vehiclesInvolved}
                        onChange={e => setVehiclesInvolved(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#171717] block mb-1">
                        Injured Persons Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={injuredCount}
                        onChange={e => setInjuredCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#DC3545]"
                      />
                    </div>
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="text-xs font-semibold text-[#171717] block mb-1">
                      Your Relationship to Accident
                    </label>
                    <select
                      value={relationship}
                      onChange={e => setRelationship(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] text-xs bg-white focus:outline-none"
                    >
                      <option value="reporting as a witness">I am reporting as a witness</option>
                      <option value="I am involved">I am involved in the accident</option>
                      <option value="reporting on behalf of someone else">Reporting on behalf of a family member / friend</option>
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs font-semibold text-[#171717] block mb-1">
                      Contact Phone for Paramedic Coordination
                    </label>
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={e => setReporterPhone(e.target.value)}
                      placeholder="+91-98401-00000"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-[#171717] block mb-1">
                      Additional Scene Details / Landmarks
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. Near bus stop, white sedan hit divider, two people receiving bystander aid"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & SUBMIT */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-base text-[#171717]">Step 4: Review Emergency Report</h3>
                    <p className="text-xs text-[#666666]">
                      Verify the captured evidence and location before triggering emergency dispatch alerts.
                    </p>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#CBD5E1] space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#666666]">Location:</span>
                      <span className="font-bold text-[#171717] text-right">{locationName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#666666]">Coordinates:</span>
                      <span className="font-mono text-[#171717]">{accidentLat.toFixed(5)}, {accidentLng.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#666666]">Accident Type:</span>
                      <span className="font-bold text-[#171717]">{accidentType}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#666666]">Vehicles / Injured:</span>
                      <span className="font-bold text-[#171717]">{vehiclesInvolved || 1} Vehicle(s) · {injuredCount || 1} Injured</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                      <span className="text-[#666666]">Reporter Phone:</span>
                      <span className="font-mono font-bold text-[#173B68]">{reporterPhone}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#666666]">Video Evidence:</span>
                      <span className="font-bold text-[#198754]">
                        {recordedBlob || uploadedVideoFile ? '✓ Video Attached (PyTorch ResNet-18 will analyze)' : 'No Video Attached (Manual Review)'}
                      </span>
                    </div>
                  </div>

                  {submitFeedback && (
                    <div className="p-3 rounded-xl bg-[#EBF2FA] border border-[#356FA5]/30 text-xs font-semibold text-[#173B68] flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#173B68]" />
                      <span>{submitFeedback}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stepper Footer Controls */}
            <div className="bg-[#F8FAFC] p-5 border-t border-[#E2E8F0] flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s => (s - 1) as any))}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#666666] hover:bg-white transition cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 2) stopCameraStream()
                    setStep((s => (s + 1) as any))
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#173B68] hover:bg-[#122E52] text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  Continue to Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#DC3545] hover:bg-[#BB2D3B] text-white text-xs font-extrabold shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Report…' : 'Submit Emergency Report'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. OPTION B: CALL 108 EMERGENCY MODAL */}
      {call108ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-5 text-center">
            <div className="w-16 h-16 bg-[#DC3545] text-white rounded-full grid place-items-center mx-auto text-2xl shadow-lg animate-pulse">
              <PhoneCall className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#DC3545] font-bold">
                National Ambulance Emergency Line
              </span>
              <h2 className="text-3xl font-black text-[#171717]">Dial 108</h2>
              <p className="text-xs text-[#666666]">
                Direct connection to Government Emergency Medical Response Services.
              </p>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#CBD5E1] text-left text-xs space-y-2">
              <span className="font-bold text-[#171717] block">Instructions for 108 Call:</span>
              <ul className="list-disc list-inside space-y-1 text-[#666666]">
                <li>Stay calm and state your current location clearly ({citizenGps?.address || 'Chennai Central'}).</li>
                <li>State number of injured people and visible vehicle types.</li>
                <li>Do not disconnect until instructed by the operator.</li>
              </ul>
            </div>

            <div className="p-3 bg-[#FDF9F0] rounded-xl border border-[#D69E36]/30 text-[11px] text-[#855B14] text-left">
              <b>Important Disclaimer:</b> 108 is operated independently by state emergency medical authorities. ResQRoute AI enhances local coordination and is not a substitute for official 108 emergency services.
            </div>

            <div className="space-y-2 pt-2">
              <a
                href="tel:108"
                className="w-full py-3 bg-[#DC3545] hover:bg-[#BB2D3B] text-white rounded-xl font-bold text-sm block shadow transition"
              >
                Call 108 Now
              </a>

              <button
                type="button"
                onClick={() => {
                  setCall108ModalOpen(false)
                  openReportingWizard()
                }}
                className="w-full py-2.5 bg-[#EBF2FA] hover:bg-[#DBEAFE] text-[#173B68] rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Register Incident in ResQRoute AI After Calling
              </button>

              <button
                type="button"
                onClick={() => setCall108ModalOpen(false)}
                className="text-xs text-[#666666] hover:underline cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EMERGENCY CONTACT ADD/EDIT MODAL */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#CBD5E1] shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-[#171717]">
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact (ICE)'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#171717] block mb-1">Contact Full Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. Suresh Raman"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#171717] block mb-1">Telephone Number</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+91-98401-00000"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-[#171717] block mb-1">Relationship</label>
                <select
                  value={contactRelation}
                  onChange={e => setContactRelation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white"
                >
                  <option value="Family">Family Member</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Close Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactIsPrimary}
                  onChange={e => setContactIsPrimary(e.target.checked)}
                  className="rounded text-[#173B68]"
                />
                <span className="font-medium text-[#171717]">Designate as Primary Contact</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="px-5 py-2 rounded-xl bg-[#173B68] text-white text-xs font-bold hover:bg-[#122E52]"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
