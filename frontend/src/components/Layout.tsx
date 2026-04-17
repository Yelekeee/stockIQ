import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  // Desktop: expanded (wide) vs collapsed (icon-only rail)
  const [expanded, setExpanded] = useState(true)
  // Mobile: drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const location = useLocation()

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleDark = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 flex-shrink-0
        transform transition-all duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${expanded ? 'w-64' : 'lg:w-16 w-64'}
      `}>
        <Sidebar
          expanded={expanded}
          onToggleExpand={() => setExpanded(e => !e)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content — shifts right on desktop to make room for sidebar */}
      <div className={`
        flex-1 flex flex-col overflow-hidden min-w-0
        transition-all duration-300
        ${expanded ? 'lg:ml-64' : 'lg:ml-16'}
      `}>
        <Header
          onMenuToggle={() => setMobileOpen(o => !o)}
          onDarkToggle={toggleDark}
          darkMode={darkMode}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
