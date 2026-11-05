import { useState, useEffect } from 'react'
import {
  Siren, Shield, Truck, Building2, ShieldAlert, Users, ArrowRight,
  Clock, Heart, Activity, CheckCircle2, ChevronRight,
  PhoneCall, MapPin, Eye, Bell, Lock, Stethoscope, Compass,
  ExternalLink, Zap, AlertTriangle, UserPlus, Info, Check, Sparkles
} from 'lucide-react'
import { useApp } from '../lib/store'
import ResQRouteLogo from '../components/ResQRouteLogo'
import Login, { PORTAL_ROLES } from './Login'

interface HomeProps {
  onEnterDashboard: (targetPage?: string) => void
}

export default function Home({ onEnterDashboard }: HomeProps) {
  const { user, logout } = useApp()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login')
  const [selectedLoginRole, setSelectedLoginRole] = useState('admin')
  const [activeWorkflowStage, setActiveWorkflowStage] = useState(1)
  const [sosModalOpen, setSosModalOpen] = useState(false)

  const openPortalLogin = (roleId: string = 'admin') => {
    setSelectedLoginRole(roleId)
    setLoginModalMode('login')
    setLoginModalOpen(true)
  }

  const openPortalRegister = (roleId: string = 'citizen') => {
    setSelectedLoginRole(roleId)
    setLoginModalMode('register')
    setLoginModalOpen(true)
  }

  const handlePrimaryCta = () => {
    if (user) {
      onEnterDashboard(user.role === 'admin' ? 'camera' : undefined)
    } else {
      openPortalLogin('admin')
    }
  }

  // 8-Stage Coordinated Workflow Data
  const WORKFLOW_STAGES = [
    {
      num: '01',
      title: 'AI Optical Accident Detection',
      tag: 'Autonomous Surveillance',
      desc: 'Traffic CCTV cameras and optical video streams are analyzed in real-time by a deep learning PyTorch ResNet-18 model calibrated to a 90% confidence threshold to identify collisions autonomously.',
      telemetry: 'Inference Latency: 28ms | Calibrated Level: 90% | Zero Manual Lag',
      icon: Eye,
    },
    {
      num: '02',
      title: 'Visual Evidence Burst Capture',
      tag: 'Forensic Validation',
      desc: 'Upon crossing the 90% threshold, the system immediately captures a sequence of 6 high-resolution burst screenshots at 3-second intervals to document vehicle impact dynamics and severity.',
      telemetry: 'Capture Protocol: 6 frames @ 3s interval | High-Fidelity JPEGs',
      icon: Activity,
    },
    {
      num: '03',
      title: 'Paramedic Human Verification',
      tag: 'Safety Safeguard',
      desc: 'The nearest paramedic unit receives an audible alert and reviews the 6 visual evidence screenshots in their cockpit to verify the accident (Yes / No / Unable to Determine) before proceeding.',
      telemetry: 'Decision Modes: Accident Confirmed, False Alarm Rejected, Additional Units Required',
      icon: CheckCircle2,
    },
    {
      num: '04',
      title: 'Proximity Ambulance Allocation',
      tag: 'Dynamic Dispatch',
      desc: 'Haversine and road network distance algorithms select the closest available Advanced Life Support (ALS) or Basic Life Support (BLS) ambulances, auto-scaling for multi-victim incidents.',
      telemetry: 'Dispatch Strategy: Nearest Available ALS/BLS | Multi-Ambulance Auto Scaling',
      icon: Truck,
    },
    {
      num: '05',
      title: 'Police Traffic Coordination',
      tag: 'Green Wave Corridor',
      desc: 'Police control rooms receive incident coordinates and route vectors, enabling traffic inspectors to activate green light corridors and clear congested intersections along the ambulance route.',
      telemetry: 'Traffic Integration: Arterial Green Corridors | Junction Clearing Alerts',
      icon: ShieldAlert,
    },
    {
      num: '06',
      title: 'Turn-by-Turn Road Navigation',
      tag: 'Street-Level Routing',
      desc: 'Ambulance drivers follow turn-by-turn routes generated via Open Source Routing Machine (OSRM) along authentic street network corridors, preventing detours through unnavigable paths.',
      telemetry: 'Navigation Engine: OSRM Road Geometry | Real Metropolitan Street Network',
      icon: Compass,
    },
    {
      num: '07',
      title: 'Capacity-Aware Hospital Matching',
      tag: 'Intelligent Triage',
      desc: 'The platform evaluates real-time ICU bed availability, emergency bay status, and surgical trauma capabilities across regional hospitals to recommend the optimal destination facility.',
      telemetry: 'Hospital Criteria: Available ICU Beds + Distance + Trauma Specialties',
      icon: Building2,
    },
    {
      num: '08',
      title: 'Coordinated Clinical Handover',
      tag: 'Pre-Arrival Preparation',
      desc: 'The receiving trauma center receives live patient vital signs, estimated time of arrival (ETA), and crash severity evidence so medical teams and operating rooms are prepared prior to arrival.',
      telemetry: 'Handover Status: Live ETA Broadcast | Trauma Bay Pre-Activation',
      icon: Stethoscope,
    },
  ]

  // Credible Statistics Data (MoRTH & WHO)
  const CREDIBLE_STATS = [
    {
      val: '4,61,312',
      label: 'Reported Road Accidents in India',
      source: 'Ministry of Road Transport and Highways (MoRTH), Govt. of India',
      reportYear: '2022 Annual Report',
      sourceUrl: 'https://morth.nic.in/road-accidents-in-india',
      detail: 'Official record of total traffic collisions occurring across India within a single reporting year.',
    },
    {
      val: '1,68,491',
      label: 'Annual Road Fatalities',
      source: 'Ministry of Road Transport and Highways (MoRTH), Govt. of India',
      reportYear: '2022 Annual Report',
      sourceUrl: 'https://morth.nic.in/road-accidents-in-india',
      detail: 'Lives lost on national and state highways, highlighting the critical urgency of pre-hospital response.',
    },
    {
      val: '4,43,366',
      label: 'Severe Injuries Requiring Trauma Care',
      source: 'MoRTH Road Safety Research Cell',
      reportYear: '2022 Annual Report',
      sourceUrl: 'https://morth.nic.in/road-accidents-in-india',
      detail: 'Accident victims sustaining severe bodily trauma requiring immediate specialized hospital stabilization.',
    },
    {
      val: 'Up to 50%',
      label: 'Preventable Fatalities in 1st Hour',
      source: 'World Health Organization (WHO) Trauma Guidelines',
      reportYear: 'Global Status Report on Road Safety',
      sourceUrl: 'https://www.who.int/violence_injury_prevention/road_traffic/en/',
      detail: 'Over half of pre-hospital trauma deaths can be averted through timely emergency care in the Golden Hour.',
    },
  ]

  // Portals Overview Data
  const PORTAL_CARDS = [
    {
      roleId: 'citizen',
      title: 'Citizen & Public Emergency Portal',
      subtitle: 'Public Safety & Bystander Assistance',
      icon: Users,
      badge: 'Public Access',
      desc: 'Access emergency hotline directories, request immediate SOS assistance, report accident sightings, and view essential first-aid guidelines for trauma victims.',
      features: ['One-Tap SOS Emergency Dialing', 'Accident Incident Reporting', 'First-Aid & CPR Guidance', 'Nearby Trauma Hospital Finder'],
      btnText: 'Open Citizen Portal',
      role: 'citizen',
    },
    {
      roleId: 'driver',
      title: 'Ambulance Driver Portal',
      subtitle: 'Paramedic Dispatch & Navigation',
      icon: Truck,
      badge: 'Paramedic Fleet',
      desc: 'Receive instant emergency dispatches, review 6 visual evidence screenshots to confirm incidents, view live patient triage metrics, and follow turn-by-turn road navigation.',
      features: ['6-Burst Visual Evidence Review', 'Accident Verification (Yes/No/Unable)', 'Turn-by-Turn Road Navigation', 'Hospital Bed Allocation Telemetry'],
      btnText: 'Enter Paramedic Portal',
      role: 'driver',
    },
    {
      roleId: 'police',
      title: 'Police Department Portal',
      subtitle: 'Traffic Coordination & Green Wave',
      icon: ShieldAlert,
      badge: 'Traffic Division',
      desc: 'Coordinate green light corridors along emergency routes, clear congested intersections, inspect incident telemetry, and ensure unobstructed access for emergency fleets.',
      features: ['Green Wave Corridor Activation', 'Junction Clearance Alerts', 'Real-Time Route Telemetry', 'Multi-Agency Communication'],
      btnText: 'Enter Police Portal',
      role: 'police',
    },
    {
      roleId: 'hospital',
      title: 'Hospital Trauma Unit Portal',
      subtitle: 'Emergency Bay & Bed Management',
      icon: Building2,
      badge: 'Trauma Centers',
      desc: 'Manage real-time ICU and emergency bed availability, monitor inbound ambulance telemetry with live ETAs, review pre-arrival vitals, and coordinate surgical intake.',
      features: ['Live ICU Bed Inventory Management', 'Inbound Ambulance Live ETA', 'Pre-Arrival Patient Severity Data', 'Seamless Handover Confirmation'],
      btnText: 'Enter Hospital Portal',
      role: 'hospital',
    },
    {
      roleId: 'admin',
      title: 'Central Admin Operations Center',
      subtitle: 'Surveillance & Multi-Agency Dispatch',
      icon: Shield,
      badge: 'Operations Command',
      desc: 'Supervise multi-camera AI optical surveillance, inspect calibrated 90% confidence thresholds, manage regional ambulance fleet allocation, and audit system logs.',
      features: ['Live PyTorch Camera Surveillance', '90% AI Confidence Recalibration', 'Fleet-Wide Fleet Command Grid', 'Complete Audit & Incident Logging'],
      btnText: 'Enter Admin Command',
      role: 'admin',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-[#171717] flex flex-col font-sans">
      {/* ---------------- 1. Sticky Navigation Bar ---------------- */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm py-2.5 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
          {/* Brand Logo & Wordmark */}
          <a href="#" className="flex items-center shrink-0">
            <ResQRouteLogo size="sm" className="hidden sm:flex xl:hidden" />
            <ResQRouteLogo size="md" className="sm:hidden xl:flex" />
          </a>

          {/* Navigation Links (Desktop) - Reduced font size and strict single-line fit */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 text-xs xl:text-sm font-medium text-[#666666] whitespace-nowrap shrink">
            <a href="#" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              Home
            </a>
            <a href="#mission" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              Our Mission
            </a>
            <a href="#golden-hour" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              The Golden Hour
            </a>
            <a href="#workflow" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              How It Works
            </a>
            <a href="#network" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              Emergency Network
            </a>
            <a href="#contact" className="px-2 xl:px-2.5 py-1.5 rounded-md hover:text-[#173B68] hover:bg-[#F7F8FA] transition whitespace-nowrap">
              Contact
            </a>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
            {/* Citizen Emergency SOS Button */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#DC3545] border border-[#DC3545]/30 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <PhoneCall className="w-3.5 h-3.5 shrink-0" />
              <span>Emergency SOS</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => onEnterDashboard()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>Enter Operations Portal</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </button>
                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#666666] hover:text-[#171717] hover:bg-[#F7F8FA] border border-[#E2E8F0] transition cursor-pointer whitespace-nowrap shrink-0"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => openPortalRegister('citizen')}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#173B68] hover:bg-[#EBF2FA] transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span>Register</span>
                </button>
                <button
                  onClick={() => openPortalLogin('admin')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- 2. Hero Section ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFFFF] to-[#F7F8FA] border-b border-[#E2E8F0] py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Text Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Restrained Project Identification Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF2FA] border border-[#356FA5]/30 text-xs font-semibold text-[#173B68]">
                <Shield className="w-3.5 h-3.5 text-[#356FA5]" />
                <span>ResQRoute AI — Emergency Response Coordination Platform</span>
              </div>

              {/* Main Tagline & Headings */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#171717] tracking-tight leading-tight">
                  Every Second Counts.{' '}
                  <span className="text-[#173B68] block mt-1">Give Every Second a Purpose.</span>
                </h1>
                <p className="text-lg sm:text-xl font-medium text-[#356FA5]">
                  Intelligent Accident Detection. Coordinated Emergency Response.
                </p>
              </div>

              {/* Official Description */}
              <p className="text-sm sm:text-base text-[#666666] leading-relaxed max-w-2xl">
                ResQRoute AI is an AI-powered emergency response coordination platform designed to detect suspected
                road accidents through video analysis, capture important visual evidence, coordinate nearby ambulances,
                connect police personnel and help hospitals prepare before patients arrive.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#network"
                  className="px-5 py-3 rounded-lg text-sm font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Emergency Network</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  onClick={handlePrimaryCta}
                  className="px-5 py-3 rounded-lg text-sm font-semibold bg-white hover:bg-[#F7F8FA] text-[#173B68] border border-[#CBD5E1] shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#356FA5]" />
                  <span>Access Your Portal</span>
                </button>

                <a
                  href="#mission"
                  className="px-4 py-3 rounded-lg text-sm font-medium text-[#666666] hover:text-[#171717] transition cursor-pointer"
                >
                  Discover Our Mission
                </a>
              </div>

              {/* Key Trust Metrics Strip */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E2E8F0]">
                <div>
                  <div className="text-2xl font-bold text-[#173B68]">90%</div>
                  <div className="text-xs text-[#666666] mt-0.5">Calibrated AI Detection Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#173B68]">6 Frames</div>
                  <div className="text-xs text-[#666666] mt-0.5">Burst Visual Evidence Sequence</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#173B68]">&lt; 30ms</div>
                  <div className="text-xs text-[#666666] mt-0.5">Deep Learning Inference Time</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Architecture Graphic Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-md p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#198754]" />
                    <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                      Live Coordination Pipeline
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#F7F8FA] text-[#356FA5] border border-[#E2E8F0]">
                    PyTorch ResNet-18
                  </span>
                </div>

                {/* Coordinated Flow Simulation Visualizer */}
                <div className="space-y-3 text-xs">
                  {/* Step A: Optical Surveillance */}
                  <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-[#173B68] text-white grid place-items-center shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#171717]">Optical Feed Monitoring</div>
                        <div className="text-[#666666] text-[11px]">CCTV CAM-01 Central Junction</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#F0F9F4] text-[#198754] font-semibold text-[10px]">
                      Active 25 FPS
                    </span>
                  </div>

                  {/* Step B: 6 Burst Evidence Frame Transfer */}
                  <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-[#DC3545] text-white grid place-items-center shrink-0">
                        <Siren className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#171717]">Accident Detection Trigger</div>
                        <div className="text-[#666666] text-[11px]">6 Evidence Frames @ 3s Interval</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#FDF2F2] text-[#DC3545] font-semibold text-[10px]">
                      94.2% Conf (≥90%)
                    </span>
                  </div>

                  {/* Step C: Multi-Agency Dispatch & Hospital Reservation */}
                  <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-md bg-[#356FA5] text-white grid place-items-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#171717]">Parallel Dispatch & Bed Triage</div>
                        <div className="text-[#666666] text-[11px]">Unit AMB-01 + City Central Hospital</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#EBF2FA] text-[#173B68] font-semibold text-[10px]">
                      14 Beds Ready
                    </span>
                  </div>
                </div>

                {/* Subtle Action Prompt */}
                <div className="pt-2 text-center">
                  <button
                    onClick={() => onEnterDashboard('camera')}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#173B68] hover:bg-[#102A4C] text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch AI Surveillance Monitor</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. Problem Statement & Challenge ---------------- */}
      <section id="mission" className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#DC3545] uppercase tracking-wider">
              The Emergency Response Challenge
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Every Delay Matters in an Emergency.
            </h2>
            <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
              When a severe road accident occurs, survival depends on rapid, seamless coordination. Yet traditional
              emergency systems remain fragmented, leading to critical delays during the Golden Hour.
            </p>
          </div>

          {/* 6 Real-World Emergency Coordination Challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#DC3545]/10 text-[#DC3545] grid place-items-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-[#171717] text-base">Delayed Accident Reporting</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Emergency dispatchers only learn about accidents after bystanders make a phone call, introducing delays of 5 to 15 critical minutes before response teams are alerted.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#173B68]/10 text-[#173B68] grid place-items-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-[#171717] text-base">Fragmented Ambulance Allocation</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Identifying and alerting the closest available Advanced Life Support (ALS) vehicle with appropriate equipment requires manual coordination across separated call centers.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#D69E36]/15 text-[#D69E36] grid place-items-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-[#171717] text-base">Lack of Visual Evidence</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Ambulance crews arrive at accident scenes blind, without visual verification of impact severity, vehicle deformation, or estimated casualty counts.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#356FA5]/10 text-[#356FA5] grid place-items-center font-bold text-sm">
                04
              </div>
              <h3 className="font-bold text-[#171717] text-base">Siloed Police Communication</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Traffic police personnel often receive emergency notifications late, preventing them from establishing green wave corridors to clear congested arterial roads.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#198754]/10 text-[#198754] grid place-items-center font-bold text-sm">
                05
              </div>
              <h3 className="font-bold text-[#171717] text-base">Unprepared Hospital Trauma Bays</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Trauma centers frequently receive patient handovers with zero advance warning, forcing surgeons, blood banks, and ICU staff to prepare only after the ambulance arrives.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#DC3545]/10 text-[#DC3545] grid place-items-center font-bold text-sm">
                06
              </div>
              <h3 className="font-bold text-[#171717] text-base">Hospital Capacity Mismatch</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Ambulances frequently deliver critically injured victims to nearest facilities that have zero open ICU beds or lack specialized neurotrauma facilities, forcing secondary transfers.
              </p>
            </div>
          </div>

          {/* Unified Platform Solution Statement */}
          <div className="p-6 rounded-xl bg-[#EBF2FA] border border-[#356FA5]/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-bold text-[#173B68] text-base">
                How ResQRoute AI Closes the Emergency Response Gap
              </h4>
              <p className="text-xs text-[#666666] max-w-3xl">
                By integrating AI-powered optical surveillance with unified cross-agency communication, ResQRoute AI eliminates reporting lag, validates accidents with 6-burst evidence frames, clears routes via police coordination, and routes patients to hospitals with confirmed open ICU beds.
              </p>
            </div>
            <a
              href="#workflow"
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white shadow-sm shrink-0 transition"
            >
              View 8-Stage Workflow
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- 4. Authentic Statistics Section ---------------- */}
      <section className="py-16 sm:py-20 bg-[#F7F8FA] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#173B68] uppercase tracking-wider">
              Verifiable Evidence & Research
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Data-Driven Need for Automated Emergency Coordination
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              Verified data from official government road safety publications and international health organizations.
            </p>
          </div>

          {/* Authentic MoRTH & WHO Statistic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CREDIBLE_STATS.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#173B68] tracking-tight">
                    {stat.val}
                  </div>
                  <h3 className="font-semibold text-xs text-[#171717] leading-tight">
                    {stat.label}
                  </h3>
                  <p className="text-[11px] text-[#666666] leading-relaxed">
                    {stat.detail}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] text-[10px] text-[#666666] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#171717] truncate">{stat.source}</span>
                    <span className="font-mono text-[#356FA5]">{stat.reportYear}</span>
                  </div>
                  <a
                    href={stat.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#356FA5] hover:underline font-medium"
                  >
                    <span>View Official Source</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-[11px] text-[#666666] italic max-w-2xl mx-auto">
              Statistics cited above are sourced from the Ministry of Road Transport and Highways (MoRTH), Government of India annual reports and World Health Organization global trauma response publications.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 5. The Golden Hour Section ---------------- */}
      <section id="golden-hour" className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF9F0] border border-[#D69E36]/30 text-xs font-semibold text-[#855B14]">
              <Clock className="w-3.5 h-3.5 text-[#D69E36]" />
              <span>Trauma Medicine Principle</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Protect the Golden Time.
            </h2>
            <p className="text-lg font-medium text-[#173B68]">
              Respond Sooner. Prepare Earlier. Coordinate Better.
            </p>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed max-w-2xl mx-auto">
              In emergency trauma medicine, the 'Golden Hour' is the first 60 minutes after severe traumatic injury during which rapid medical intervention dramatically increases the probability of survival.
            </p>
          </div>

          {/* 3 Core Pillars of the Golden Hour */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-3 text-center md:text-left">
              <div className="w-10 h-10 rounded-lg bg-[#173B68] text-white grid place-items-center mb-2 mx-auto md:mx-0">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#171717] text-base">Respond Sooner</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Autonomous AI video surveillance flags accidents instantaneously upon impact at a 90% confidence threshold, removing the critical 5-15 minute latency of traditional bystander reporting.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-3 text-center md:text-left">
              <div className="w-10 h-10 rounded-lg bg-[#356FA5] text-white grid place-items-center mb-2 mx-auto md:mx-0">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#171717] text-base">Prepare Earlier</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Emergency crews receive 6 high-resolution burst evidence screenshots captured at 3-second intervals directly in their vehicle cockpit, validating collision severity before scene arrival.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#F7F8FA] border border-[#E2E8F0] space-y-3 text-center md:text-left">
              <div className="w-10 h-10 rounded-lg bg-[#198754] text-white grid place-items-center mb-2 mx-auto md:mx-0">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#171717] text-base">Coordinate Better</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Real-time integration with police traffic signals enables green wave routes, while trauma centers reserve ICU beds and prepare blood units ahead of the ambulance arrival.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 6. The 8-Stage Interactive Workflow ---------------- */}
      <section id="workflow" className="py-16 sm:py-20 bg-[#F7F8FA] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#173B68] uppercase tracking-wider">
              End-to-End Operational Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              The 8-Stage ResQRoute AI Coordinated Workflow
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              From visual collision detection to hospital handover: explore how every second is given purpose.
            </p>
          </div>

          {/* Interactive Stage Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {WORKFLOW_STAGES.map((s, idx) => {
              const active = activeWorkflowStage === idx + 1
              return (
                <button
                  key={s.num}
                  onClick={() => setActiveWorkflowStage(idx + 1)}
                  className={`p-2.5 rounded-lg text-center transition cursor-pointer border ${active
                    ? 'bg-[#173B68] text-white border-[#173B68] shadow-sm'
                    : 'bg-white text-[#171717] border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                >
                  <div className={`font-mono text-xs font-bold ${active ? 'text-white' : 'text-[#356FA5]'}`}>
                    {s.num}
                  </div>
                  <div className="text-[11px] font-semibold truncate mt-0.5">{s.tag}</div>
                </button>
              )
            })}
          </div>

          {/* Active Stage Detailed Display Card */}
          {(() => {
            const current = WORKFLOW_STAGES[activeWorkflowStage - 1]
            const CurrentIcon = current.icon
            return (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#173B68] text-white grid place-items-center shrink-0">
                      <CurrentIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-[#356FA5] uppercase">
                        Stage {current.num} of 08 · {current.tag}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#171717]">{current.title}</h3>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-[#666666] bg-[#F7F8FA] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                    {current.telemetry}
                  </div>
                </div>

                <p className="text-sm text-[#171717] leading-relaxed">
                  {current.desc}
                </p>

                {/* Workflow Stepper Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    disabled={activeWorkflowStage === 1}
                    onClick={() => setActiveWorkflowStage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#171717] hover:bg-[#F7F8FA] border border-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Previous Stage
                  </button>

                  <div className="text-xs font-medium text-[#666666]">
                    Step {activeWorkflowStage} of 8
                  </div>

                  <button
                    disabled={activeWorkflowStage === 8}
                    onClick={() => setActiveWorkflowStage(p => Math.min(8, p + 1))}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#173B68] hover:bg-[#102A4C] text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next Stage →
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* ---------------- 7. The 5 Stakeholder Emergency Portals ---------------- */}
      <section id="network" className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#173B68] uppercase tracking-wider">
              Connected Stakeholder Network
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Specialized Portals for Every Emergency Agency
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              Secure role-based interfaces uniting public citizens, paramedics, traffic police, hospital trauma units, and central dispatch controllers.
            </p>
          </div>

          {/* 5 Distinct Portal Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PORTAL_CARDS.map((p, idx) => {
              const IconComp = p.icon
              return (
                <div
                  key={idx}
                  className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] p-6 shadow-sm hover:shadow transition flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-lg bg-[#EBF2FA] text-[#173B68] grid place-items-center">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7F8FA] text-[#356FA5] border border-[#E2E8F0]">
                        {p.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#171717]">{p.title}</h3>
                      <div className="text-xs font-medium text-[#356FA5] mt-0.5">{p.subtitle}</div>
                    </div>

                    <p className="text-xs text-[#666666] leading-relaxed">
                      {p.desc}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      {p.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs text-[#171717]">
                          <Check className="w-3.5 h-3.5 text-[#198754] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <button
                      onClick={() => openPortalLogin(p.roleId)}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#173B68] hover:bg-[#102A4C] text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{p.btnText}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------------- 8. Citizen Emergency Information & Help ---------------- */}
      <section className="py-16 sm:py-20 bg-[#F7F8FA] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#DC3545] uppercase tracking-wider">
              Citizen Support & Public Guidance
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Emergency Numbers & Golden Hour First-Aid
            </h2>
            <p className="text-xs sm:text-sm text-[#666666]">
              Immediate actions and emergency contact hotlines for citizens witnessing a road collision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] text-center space-y-1.5 shadow-sm">
              <div className="text-2xl font-black text-[#DC3545]">112</div>
              <div className="font-bold text-xs text-[#171717]">National Emergency Helpline</div>
              <div className="text-[11px] text-[#666666]">All-in-one emergency service across India</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] text-center space-y-1.5 shadow-sm">
              <div className="text-2xl font-black text-[#173B68]">108</div>
              <div className="font-bold text-xs text-[#171717]">Emergency Ambulance Helpline</div>
              <div className="text-[11px] text-[#666666]">Government emergency medical transit</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] text-center space-y-1.5 shadow-sm">
              <div className="text-2xl font-black text-[#356FA5]">103 / 100</div>
              <div className="font-bold text-xs text-[#171717]">Traffic & City Police</div>
              <div className="text-[11px] text-[#666666]">Scene protection & traffic management</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] text-center space-y-1.5 shadow-sm">
              <div className="text-2xl font-black text-[#198754]">102</div>
              <div className="font-bold text-xs text-[#171717]">Maternity & Child Health</div>
              <div className="text-[11px] text-[#666666]">Specialized maternal emergency support</div>
            </div>
          </div>

          {/* Bystander First-Aid Protocols */}
          <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#171717]">
              Essential Good Samaritan Bystander Protocols
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#666666]">
              <div className="space-y-1">
                <span className="font-semibold text-[#171717]">1. Secure the Incident Zone</span>
                <p>Do not put yourself in danger. Turn on vehicle hazard lights and warn oncoming traffic before approaching.</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-[#171717]">2. Do Not Move Injured Victims</span>
                <p>Unless there is active fire or imminent hazard, avoid moving neck/spine to prevent permanent paralysis.</p>
              </div>
              <div className="space-y-1">
                <span className="font-semibold text-[#171717]">3. Control Severe Hemorrhage</span>
                <p>Apply firm, direct pressure on bleeding wounds using a clean cloth while waiting for emergency ambulance arrival.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 9. Contact Section ---------------- */}
      <section id="contact" className="py-16 sm:py-20 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold text-[#173B68] uppercase tracking-wider">
              Network Support & Institutional Coordination
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
              Contact ResQRoute AI Operations Command
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed">
              For emergency service integration, traffic surveillance camera connectivity, or hospital network onboarding, reach out to our emergency technical team.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- 10. Comprehensive Enterprise Footer ---------------- */}
      <footer className="bg-[#173B68] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Identity Column */}
            <div className="space-y-3 md:col-span-1">
              <ResQRouteLogo size="md" inverted={true} />
              <p className="text-xs text-slate-300 leading-relaxed mt-2">
                Rescue, Quick Response and Intelligent Routing using Artificial Intelligence.
              </p>
              <div className="text-[11px] text-slate-400 font-mono">
                Tagline: Every Second Counts. Give Every Second a Purpose.
              </div>
            </div>

            {/* Quick Portals Links */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Emergency Portals</h4>
              <ul className="space-y-1.5 text-slate-300">
                <li><button onClick={() => openPortalLogin('citizen')} className="hover:text-white transition cursor-pointer">Citizen Emergency Information</button></li>
                <li><button onClick={() => openPortalLogin('driver')} className="hover:text-white transition cursor-pointer">Ambulance Driver Cockpit</button></li>
                <li><button onClick={() => openPortalLogin('police')} className="hover:text-white transition cursor-pointer">Police Traffic Coordination</button></li>
                <li><button onClick={() => openPortalLogin('hospital')} className="hover:text-white transition cursor-pointer">Hospital Trauma Units</button></li>
                <li><button onClick={() => openPortalLogin('admin')} className="hover:text-white transition cursor-pointer">Central Operations Command</button></li>
              </ul>
            </div>

            {/* Core Capabilities */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Core Architecture</h4>
              <ul className="space-y-1.5 text-slate-300">
                <li>PyTorch ResNet-18 Vision Model</li>
                <li>Calibrated 90% Confidence Threshold</li>
                <li>6 Burst Evidence Screenshots</li>
                <li>OSRM Road-Network Navigation</li>
                <li>Real-Time ICU Bed Triage</li>
              </ul>
            </div>

            {/* Emergency Hotline Notice */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Emergency Notice</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                If you are witnessing an active accident emergency right now, dial <b>112</b> or <b>108</b> immediately.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setSosModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#DC3545] hover:bg-[#BB2D3B] text-white transition cursor-pointer"
                >
                  View Emergency Directory
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
            <div>
              © {new Date().getFullYear()} ResQRoute AI. All rights reserved.
            </div>
            <div className="flex gap-4">
              <a href="#mission" className="hover:text-white transition">Mission</a>
              <a href="#golden-hour" className="hover:text-white transition">The Golden Hour</a>
              <a href="#workflow" className="hover:text-white transition">Workflow</a>
              <a href="#contact" className="hover:text-white transition">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ---------------- 11. Login & Registration Modal ---------------- */}
      {loginModalOpen && (
        <Login
          isModal={true}
          initialRole={selectedLoginRole}
          initialMode={loginModalMode}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={() => {
            setLoginModalOpen(false)
            onEnterDashboard()
          }}
        />
      )}

      {/* ---------------- 12. Citizen SOS Helpline Modal ---------------- */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#DC3545]">
                <PhoneCall className="w-5 h-5" />
                <h3 className="font-bold text-base text-[#171717]">Emergency SOS Contacts</h3>
              </div>
              <button
                onClick={() => setSosModalOpen(false)}
                className="text-[#666666] hover:text-[#171717] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#DC3545]/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#DC3545] text-sm">112</div>
                  <div className="text-[#171717]">National All-Emergency Helpline</div>
                </div>
                <a
                  href="tel:112"
                  className="px-3 py-1.5 rounded-lg bg-[#DC3545] text-white font-semibold text-xs"
                >
                  Call 112
                </a>
              </div>

              <div className="p-3 rounded-lg bg-[#EBF2FA] border border-[#356FA5]/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#173B68] text-sm">108</div>
                  <div className="text-[#171717]">Emergency Medical Ambulance Service</div>
                </div>
                <a
                  href="tel:108"
                  className="px-3 py-1.5 rounded-lg bg-[#173B68] text-white font-semibold text-xs"
                >
                  Call 108
                </a>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#171717] text-sm">103 / 100</div>
                  <div className="text-[#171717]">Traffic & City Police Control</div>
                </div>
                <a
                  href="tel:100"
                  className="px-3 py-1.5 rounded-lg bg-[#356FA5] text-white font-semibold text-xs"
                >
                  Call Police
                </a>
              </div>
            </div>

            <p className="text-[11px] text-[#666666] leading-relaxed">
              When reporting, speak clearly, provide your exact street landmark, describe vehicle types involved, and mention estimated victim count.
            </p>

            <button
              onClick={() => setSosModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#F7F8FA] hover:bg-[#EEF1F5] text-[#171717] text-xs font-semibold border border-[#E2E8F0] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
