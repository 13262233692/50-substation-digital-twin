import { NavLink } from 'react-router-dom'
import { Activity } from 'lucide-react'
import ConnectionIndicator from './ConnectionIndicator'

const NAV_ITEMS = [
  { to: '/', label: '主控台' },
  { to: '/monitor', label: '设备监控' },
  { to: '/config', label: '系统配置' },
]

export default function TopNav() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F2E]/80 backdrop-blur-md border-b border-[#2A3040]">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#00E5FF]" />
          <span className="text-lg font-bold tracking-wider text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            变电站数字孪生基座
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-semibold tracking-wider transition-colors relative ${
                  isActive ? 'text-[#00E5FF]' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00E5FF] rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <ConnectionIndicator />
      </div>
    </div>
  )
}
