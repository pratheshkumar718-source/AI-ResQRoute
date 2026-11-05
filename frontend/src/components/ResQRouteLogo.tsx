import React from 'react'

interface LogoProps {
  className?: string
  iconOnly?: boolean
  inverted?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const ResQRouteLogo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  inverted = false,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36
  const textTitle = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  const textSub = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Brand Icon combining Emergency Vehicle, Waypoint Route, & First-Aid Cross */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        {/* Navy Shield Hexagon Background */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="10"
          fill="#173B68"
          stroke="#356FA5"
          strokeWidth="1.5"
        />

        {/* Road / Route Curvature Line */}
        <path
          d="M 8 36 C 18 36, 18 20, 26 20 C 34 20, 36 12, 40 12"
          stroke="#CBD5E1"
          strokeWidth="2.5"
          strokeDasharray="2 2"
          strokeLinecap="round"
        />

        {/* Dynamic Route Waypoint */}
        <circle cx="26" cy="20" r="3" fill="#356FA5" />

        {/* Emergency First-Aid Cross in Pure White & Emergency Red */}
        <g transform="translate(24, 25)">
          {/* Subtle White Backing Badge */}
          <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#FFFFFF" />
          
          {/* Red Emergency Cross */}
          <rect x="-3" y="-9" width="6" height="18" rx="1.5" fill="#DC3545" />
          <rect x="-9" y="-3" width="18" height="6" rx="1.5" fill="#DC3545" />
          
          {/* Central Precision Beacon */}
          <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
        </g>
      </svg>

      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <div className={`font-extrabold tracking-tight flex items-center gap-1.5 ${inverted ? 'text-white' : 'text-[#171717]'} ${textTitle}`}>
            <span>ResQRoute</span>
            <span className="text-[#DC3545] font-black tracking-normal">AI</span>
          </div>
          <span className={`font-medium tracking-wider uppercase mt-0.5 ${inverted ? 'text-slate-300' : 'text-[#666666]'} ${textSub}`}>
            Emergency Response Coordination
          </span>
        </div>
      )}
    </div>
  )
}

export default ResQRouteLogo

