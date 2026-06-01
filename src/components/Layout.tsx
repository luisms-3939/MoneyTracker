// @ts-nocheck
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, TrendingUp, CreditCard, Telescope } from 'lucide-react'

const NAV = [
	{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
	{ to: '/income', icon: TrendingUp, label: 'Income' },
	{ to: '/expenses', icon: CreditCard, label: 'Expenses' },
]

export default function Layout() {
	const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme)
		localStorage.setItem('theme', theme)
	}, [theme])

	const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
	return (
		<div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
			<Sidebar theme={theme} toggleTheme={toggleTheme} />
			<main style={{
				flex: 1,
				overflowY: 'auto',
				background: 'var(--bg)',
				padding: '32px',
			}}>
			<Outlet />
		</main>
	</div>
	)
}

function Sidebar({ theme, toggleTheme }) {
	return (
		<aside style={{
			width: 220,
			minWidth: 220,
			background: 'var(--surface)',
			borderRight: '1px solid var(--border)',
      		display: 'flex',
      		flexDirection: 'column',
      		padding: '28px 16px',
      		gap: 6,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 8px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            💶
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>
              Money<span style={{ color: 'var(--cyan)' }}>Scope</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Personal Finance</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-muted)', padding: '0 8px 8px', textTransform: 'uppercase' }}>
        Menu
      </div>
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            color: isActive ? 'var(--cyan)' : 'var(--text-subtle)',
            background: isActive ? 'rgba(34,211,238,0.08)' : 'transparent',
            transition: 'all var(--transition)',
            border: isActive ? '1px solid rgba(34,211,238,0.15)' : '1px solid transparent',
          })}
        >
          {/* Use a function here to acess isActive for the Icon */}
          {({ isActive }) => (
            <>
          <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
          {label}
          </>
          )}
        </NavLink>
      ))}

      {/* Bottom */}
      <div style={{ marginTop: 'auto', padding: '16px 8px 0', borderTop: '1px solid var(--border)' }}>
		  <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, padding: '0 4px',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </span>
          <div
            onClick={toggleTheme}
            style={{
              width: 44, height: 24, borderRadius: 99,
              background: theme === 'dark' ? 'var(--border-light)' : 'var(--cyan)',
              cursor: 'pointer', position: 'relative',
              transition: 'background 0.3s ease',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: theme === 'dark' ? 3 : 23,
              width: 18, height: 18, borderRadius: '50%',
              background: 'white',
              transition: 'left 0.3s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 2 }}>MoneyScope v1.0</div>
          Personal finance tracker
        </div>
      </div>
    </aside>
  )
}
