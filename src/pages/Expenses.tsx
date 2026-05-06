// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Plus, Pencil, Trash2, X, RefreshCw, CreditCard, Calendar, Repeat, Filter } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

const EXPENSE_CATEGORIES = [
  'Alquiler', 'Mercadona', 'Transportes', 'Estanco',
  'Klarna', 'Peluqueria', 'Deudas', 'Telefono', 'XMS', 'Otros'
]
const RECURRENCE_TYPES = ['weekly', 'monthly', 'yearly']

const CATEGORY_COLORS = {
  'Alquiler':    '#F43F5E',
  'Mercadona': '#FB923C',
  'Transportes':        '#FBBF24',
  'Estanco':    '#8B5CF6',
  'Klarna':    '#EC4899',
  'Peluqueria':       '#14B8A6',
  'Deudas':         '#EF4444',
  'Telefono':        '#64748B',
  'XMS':        '#6366F1',
  'Otros':            '#94A3B8',
}

const emptyForm = () => ({
  category: 'Mercadona', description: '', amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  recurring: false, recurrence_type: 'monthly', notes: ''
})

export default function Expenses() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(emptyForm())
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setForm({
      category: item.category,
      description: item.description || '',
      amount: item.amount,
      date: item.date,
      recurring: item.recurring,
      recurrence_type: item.recurrence_type || 'monthly',
      notes: item.notes || '',
    })
    setEditing(item.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.category || !form.amount || !form.date) return
    setSaving(true)
    const payload = {
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount),
      date: form.date,
      recurring: form.recurring,
      recurrence_type: form.recurring ? form.recurrence_type : null,
      notes: form.notes || null,
    }
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(null)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const thisMonthTotal = useMemo(() =>
    items.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }))
      .reduce((s, e) => s + Number(e.amount), 0), [items])

  const recurringTotal = useMemo(() =>
    items.filter(e => e.recurring && e.recurrence_type === 'monthly')
      .reduce((s, e) => s + Number(e.amount), 0), [items])

  const topCategory = useMemo(() => {
    const map = {}
    items.forEach(e => {
      if (!map[e.category]) map[e.category] = 0
      map[e.category] += Number(e.amount)
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : null
  }, [items])

  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category))
    return ['all', ...Array.from(set).sort()]
  }, [items])

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  // Category summary
  const categoryBreakdown = useMemo(() => {
    const map = {}
    items.forEach(e => {
      if (!map[e.category]) map[e.category] = 0
      map[e.category] += Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  const totalAll = categoryBreakdown.reduce((s, [, v]) => s + v, 0)

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Expenses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Manage and categorize your spending</p>
        </div>
        <button onClick={openNew} style={btnStyle('var(--rose)', 'rgba(244,63,94,0.12)')}>
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <MiniStat label="This Month" value={fmt(thisMonthTotal)} icon={<Calendar size={15} />} color="var(--rose)" />
        <MiniStat label="Monthly Recurring" value={fmt(recurringTotal)} icon={<Repeat size={15} />} color="var(--amber)" />
        <MiniStat
          label="Top Category"
          value={topCategory ? topCategory.name : 'N/A'}
          sub={topCategory ? fmt(topCategory.amount) : ''}
          icon={<CreditCard size={15} />}
          color="var(--violet)"
        />
      </div>

      {/* Category Breakdown Bar */}
      {categoryBreakdown.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Category Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryBreakdown.map(([cat, amt]) => {
              const pct = totalAll > 0 ? (amt / totalAll * 100) : 0
              const color = CATEGORY_COLORS[cat] || '#94A3B8'
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ color: 'var(--text-subtle)' }}>{cat}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(amt)} <span style={{ color: 'var(--text-muted)' }}>({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
              border: filterCat === cat ? `1px solid ${CATEGORY_COLORS[cat] || 'var(--rose)'}` : '1px solid var(--border)',
              background: filterCat === cat ? `${CATEGORY_COLORS[cat] || 'var(--rose)'}18` : 'transparent',
              color: filterCat === cat ? (CATEGORY_COLORS[cat] || 'var(--rose)') : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            }}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openNew} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'Category', 'Date', 'Recurring', 'Amount', ''].map(h => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: h === 'Amount' || h === '' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const catColor = CATEGORY_COLORS[item.category] || '#94A3B8'
                return (
                  <tr key={item.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{item.description || '—'}</div>
                      {item.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.notes}</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600, color: catColor,
                        background: `${catColor}15`, border: `1px solid ${catColor}30`,
                        padding: '3px 8px', borderRadius: 99,
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: catColor }} />
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-subtle)', fontSize: 13 }}>
                      {format(parseISO(item.date), 'dd MMM yyyy')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {item.recurring ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600, color: 'var(--amber)',
                          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                          padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize',
                        }}>
                          <Repeat size={10} /> {item.recurrence_type}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>One-time</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span className="font-display" style={{ fontWeight: 700, color: 'var(--rose)', fontSize: 15 }}>
                        {fmt(item.amount)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <IconBtn onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></IconBtn>
                        <IconBtn
                          onClick={() => handleDelete(item.id)}
                          danger disabled={deleting === item.id} title="Delete"
                        >
                          {deleting === item.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowForm(false)}>
          <FormField label="Category">
            <select
              style={inputStyle}
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>

          <FormField label="Description">
            <input
              style={inputStyle}
              placeholder="e.g. Netflix, Gym, Groceries…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Amount (€)">
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </FormField>
            <FormField label="Date">
              <input
                style={inputStyle}
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="exp-recurring"
              type="checkbox"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--rose)' }}
            />
            <label htmlFor="exp-recurring" style={{ color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>
              Recurring expense
            </label>
          </div>

          {form.recurring && (
            <FormField label="Recurrence">
              <select
                style={inputStyle}
                value={form.recurrence_type}
                onChange={e => setForm(f => ({ ...f, recurrence_type: e.target.value }))}
              >
                {RECURRENCE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </FormField>
          )}

          <FormField label="Notes (optional)">
            <input
              style={inputStyle}
              placeholder="Any extra details…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setShowForm(false)} style={btnStyle('var(--text-muted)', 'var(--surface)', true)}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle('var(--bg)', 'var(--rose)'), flex: 1, justifyContent: 'center' }}>
              {saving ? 'Saving…' : editing ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---- Shared helpers ----

function MiniStat({ label, value, sub, icon, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <p style={{ color: 'var(--text-subtle)', marginBottom: 16 }}>No expense entries yet</p>
      <button onClick={onAdd} style={btnStyle('var(--rose)', 'rgba(244,63,94,0.12)')}>
        <Plus size={14} /> Add Expense
      </button>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)', padding: '28px', width: '100%', maxWidth: 440,
        animation: 'scaleIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function IconBtn({ onClick, danger, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30, height: 30, border: '1px solid var(--border)',
        borderRadius: 7, background: 'transparent',
        color: danger ? 'var(--rose)' : 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(244,63,94,0.1)' : 'var(--surface)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 13px',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
  fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif',
  outline: 'none', transition: 'border-color 0.15s',
}

const btnStyle = (color, bg, outline = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 18px', borderRadius: 9,
  border: outline ? '1px solid var(--border)' : 'none',
  background: bg, color,
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.15s',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
})
