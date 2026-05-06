// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, addMonths, parseISO, isWithinInterval } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, Percent, ChevronRight } from 'lucide-react'

const COLORS = ['#22D3EE','#10B981','#F59E0B','#F43F5E','#8B5CF6','#FB923C','#EC4899','#3B82F6','#14B8A6','#FBBF24']

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtShort = (n) => {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(0)
}

interface IncomeItem {
  id?: string;
  label: string;
  amount: number;
  date: string;
  reurring: boolean;
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null;
  notes?: string | null;
}

interface ExpenseItem {
  id?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null;
  notes?: string | null;
}

export default function Dashboard() {
  const [income, setIncome] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: inc }, { data: exp }] = await Promise.all([
        supabase.from('income').select('*').order('date', { ascending: true }),
        supabase.from('expenses').select('*').order('date', { ascending: true }),
      ])
      setIncome(inc || [])
      setExpenses(exp || [])
      setLoading(false)
    }
    load()
  }, [])

  // ---- Stats for current month ----
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)

  const thisMonthIncome = useMemo(() =>
    income.filter(i => isWithinInterval(parseISO(i.date), { start: thisMonthStart, end: thisMonthEnd }))
      .reduce((s, i) => s + Number(i.amount), 0), [income])

  const thisMonthExpenses = useMemo(() =>
    expenses.filter(e => isWithinInterval(parseISO(e.date), { start: thisMonthStart, end: thisMonthEnd }))
      .reduce((s, e) => s + Number(e.amount), 0), [expenses])

  const netBalance = thisMonthIncome - thisMonthExpenses
  const savingsRate = thisMonthIncome > 0 ? ((netBalance / thisMonthIncome) * 100).toFixed(1) : 0

  // ---- Monthly chart data (last 6 months) ----
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i)
      const start = startOfMonth(m)
      const end = endOfMonth(m)
      const inc = income.filter(r => isWithinInterval(parseISO(r.date), { start, end }))
        .reduce((s, r) => s + Number(r.amount), 0)
      const exp = expenses.filter(r => isWithinInterval(parseISO(r.date), { start, end }))
        .reduce((s, r) => s + Number(r.amount), 0)
      return { month: format(m, 'MMM'), income: inc, expenses: exp, balance: inc - exp }
    })
  }, [income, expenses])

  // ---- Category breakdown ----
  const categoryData = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      if (!map[e.category]) map[e.category] = 0
      map[e.category] += Number(e.amount)
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [expenses])

  // ---- Forecast (next 6 months based on recurring) ----
  const forecastData = useMemo(() => {
    const recurringIncome = income.filter(i => i.recurring)
    const recurringExpenses = expenses.filter(e => e.recurring)

    const monthlyAmt = (items) => items.reduce((s, item) => {
      const a = Number(item.amount)
      if (item.recurrence_type === 'monthly') return s + a
      if (item.recurrence_type === 'weekly')  return s + a * 4.33
      if (item.recurrence_type === 'yearly')  return s + a / 12
      return s + a
    }, 0)

    const projIncome = monthlyAmt(recurringIncome)
    const projExpenses = monthlyAmt(recurringExpenses)

    // Seed with current month actual
    const result = [{
      month: format(now, 'MMM yy'),
      income: thisMonthIncome,
      expenses: thisMonthExpenses,
      balance: thisMonthIncome - thisMonthExpenses,
      type: 'actual'
    }]

    for (let i = 1; i <= 5; i++) {
      const m = addMonths(now, i)
      result.push({
        month: format(m, 'MMM yy'),
        income: projIncome,
        expenses: projExpenses,
        balance: projIncome - projExpenses,
        type: 'forecast'
      })
    }
    return result
  }, [income, expenses, thisMonthIncome, thisMonthExpenses])

  if (loading) return <LoadingState />

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '-0.5px' }}>
          DASHBOARD
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          {format(now, 'MMMM yyyy')} · Financial Overview
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Monthly Income"
          value={fmt(thisMonthIncome)}
          icon={<TrendingUp size={18} />}
          color="var(--cyan)"
          bg="rgba(34,211,238,0.08)"
        />
        <StatCard
          label="Monthly Expenses"
          value={fmt(thisMonthExpenses)}
          icon={<TrendingDown size={18} />}
          color="var(--rose)"
          bg="rgba(244,63,94,0.08)"
        />
        <StatCard
          label="Net Balance"
          value={fmt(netBalance)}
          icon={<Wallet size={18} />}
          color={netBalance >= 0 ? 'var(--emerald)' : 'var(--rose)'}
          bg={netBalance >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)'}
        />
        <StatCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          icon={<Percent size={18} />}
          color="var(--violet)"
          bg="rgba(139,92,246,0.08)"
        />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Income vs Expenses" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} width={48} />
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
              />
              <Bar dataKey="income" fill="var(--cyan)" radius={[4,4,0,0]} name="Income" />
              <Bar dataKey="expenses" fill="var(--rose)" radius={[4,4,0,0]} name="Expenses" fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expenses by Category" subtitle="All time">
          {categoryData.length === 0 ? (
            <EmptyChart message="No expense data yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {categoryData.slice(0, 4).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: 'var(--text-subtle)' }}>{d.name}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Balance Trend" subtitle="Monthly net balance">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--emerald)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--emerald)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} width={48} />
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="balance" stroke="var(--emerald)" strokeWidth={2.5} fill="url(#balGrad)" name="Balance" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="6-Month Forecast" subtitle="Based on recurring items" badge="Projected">
          {forecastData.length === 0 ? (
            <EmptyChart message="Add recurring items to see forecast" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--rose)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--rose)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} width={48} />
                <Tooltip
                  formatter={(v) => fmt(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="income" stroke="var(--cyan)" strokeWidth={2} fill="url(#incGrad)" name="Projected Income" strokeDasharray={(d) => d?.type === 'forecast' ? '5 3' : 'none'} />
                <Area type="monotone" dataKey="expenses" stroke="var(--rose)" strokeWidth={2} fill="url(#expGrad)" name="Projected Expenses" strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 22px',
      transition: 'border-color var(--transition)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.5px' }}>
        {value}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '22px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--amber)',
            background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)',
            padding: '3px 8px', borderRadius: 99, letterSpacing: '0.04em'
          }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }) {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔭</div>
        <p style={{ color: 'var(--text-muted)' }}>Loading your finances…</p>
      </div>
    </div>
  )
}
