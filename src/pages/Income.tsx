// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { Plus, Pencil, Trash2, X, RefreshCw, TrendingUp, Calendar, Repeat } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)

const INCOME_CATEGORIES = ['Sueldo', 'Anticipo', 'Paga Extra', 'Otros']
const RECURRENCE_TYPES = ['weekly', 'monthly', 'yearly']

const empty = () => ({
	label: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'),
	recurring: false, recurrence_type: 'monthly', notes: ''
});

export default function Income() {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [editing, setEditing] = useState(null)
	const [form, setForm] = useState(empty())
	const [saving, setSaving] = useState(false)
	const [deleting, setDeleting] = useState(null)
	const [filter, setFilter] = useState('all')

	const load = async () => {
		setLoading(true)
		const { data } = await supabase.from('income').select('*').order('date', { ascending: false })
		setItems(data || [])
		setLoading(false)
	}

	useEffect(() => { load() }, [])

	const openNew = () => {
		setForm(empty())
		setEditing(null)
		setShowForm(true)
	}

	const openEdit = (item) => {
		setForm({
			label: item.label,
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
		if (!form.label || !form.amount || !form.date) return
			setSaving(true)
		const payload = {
			label: form.label,
			amount: parseFloat(form.amount),
			date: form.date,
			recurring: form.recurring,
			recurrence_type: form.recurring ? form.recurrence_type : null,
			notes: form.notes || null,
		}
    const { error } = editing
			? await supabase.from('income').update(payload).eq('id', editing)
		  : await supabase.from('income').insert(payload);
		if (error) {
      console.error("Supabase Error:", error.message);
      alert("Failed to save: " + error.message);
    }else {
    	setShowForm(false)
		  load();
	 }
   setSaving(false);
}  

	const handleDelete = async (id) => {
		setDeleting(id)
		await supabase.from('income').delete().eq('id', id)
		setDeleting(null)
		setItems(prev => prev.filter(i => i.id !== id))
	}

	const now = new Date()
	const monthStart = startOfMonth(now)
	const monthEnd = endOfMonth(now)

	const thisMonthTotal = useMemo(() =>
		items.filter(i => isWithinInterval(parseISO(i.date), { start: monthStart, end: monthEnd }))
		.reduce((s, i) => s + Number(i.amount), 0), [items])

	const recurringTotal = useMemo(() =>
		items.filter(i => i.recurring && i.recurrence_type === 'monthly')
		.reduce((s, i) => s + Number(i.amount), 0), [items])

	const allTimeTotal = useMemo(() => items.reduce((s, i) => s + Number(i.amount), 0), [items])

	const filtered = filter === 'recurring' ? items.filter(i => i.recurring) : items

	return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Income</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Track all your income sources</p>
        </div>
        <button onClick={openNew} style={btnStyle('var(--cyan)', 'rgba(34,211,238,0.12)')}>
          <Plus size={15} /> Add Income
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <MiniStat label="This Month" value={fmt(thisMonthTotal)} icon={<Calendar size={15} />} color="var(--cyan)" />
        <MiniStat label="Monthly Recurring" value={fmt(recurringTotal)} icon={<Repeat size={15} />} color="var(--emerald)" />
        <MiniStat label="All Time" value={fmt(allTimeTotal)} icon={<TrendingUp size={15} />} color="var(--violet)" />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'recurring'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            border: filter === f ? '1px solid var(--cyan)' : '1px solid var(--border)',
            background: filter === f ? 'rgba(34,211,238,0.1)' : 'transparent',
            color: filter === f ? 'var(--cyan)' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}>
            {f === 'all' ? 'All Entries' : 'Recurring Only'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState type="income" onAdd={openNew} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Label', 'Date', 'Recurring', 'Amount', ''].map(h => (
                  <th key={h} style={{
                    padding: '13px 18px', textAlign: h === 'Amount' || h === '' ? 'right' : 'left',
                    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} style={{
                  borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{item.label}</div>
                    {item.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.notes}</div>}
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-subtle)', fontSize: 13 }}>
                    {format(parseISO(item.date), 'dd MMM yyyy')}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {item.recurring ? (
                      <span style={badgeStyle('var(--emerald)', 'rgba(16,185,129,0.12)')}>
                        <Repeat size={10} /> {item.recurrence_type}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>One-time</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: 15, fontFamily: 'Syne, sans-serif' }}>
                      {fmt(item.amount)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <IconBtn onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></IconBtn>
                      <IconBtn
                        onClick={() => handleDelete(item.id)}
                        danger
                        disabled={deleting === item.id}
                        title="Delete"
                      >
                        {deleting === item.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Income' : 'Add Income'} onClose={() => setShowForm(false)}>
          <FormField label="Label / Source">
            <input
              style={inputStyle}
              placeholder="e.g. Monthly Salary"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              list="income-labels"
            />
            <datalist id="income-labels">
              {INCOME_CATEGORIES.map(c => <option key={c} value={c} />)}
            </datalist>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
            <input
              id="inc-recurring"
              type="checkbox"
              checked={form.recurring}
              onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--cyan)' }}
            />
            <label htmlFor="inc-recurring" style={{ color: 'var(--text)', fontSize: 14, cursor: 'pointer' }}>
              Recurring income
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
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle('var(--bg)', 'var(--cyan)'), flex: 1, justifyContent: 'center' }}>
              {saving ? 'Saving…' : editing ? 'Update Income' : 'Add Income'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---- Shared UI helpers ----

function MiniStat({ label, value, icon, color }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function EmptyState({ type, onAdd }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{type === 'income' ? '💰' : '📋'}</div>
      <p style={{ color: 'var(--text-subtle)', marginBottom: 16 }}>No {type} entries yet</p>
      <button onClick={onAdd} style={btnStyle('var(--cyan)', 'rgba(34,211,238,0.12)')}>
        <Plus size={14} /> Add {type === 'income' ? 'Income' : 'Expense'}
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
        width: 30, height: 30, border: `1px solid var(--border)`,
        borderRadius: 7, background: 'transparent',
        color: danger ? 'var(--rose)' : 'var(--text-muted)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
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

const badgeStyle = (color, bg) => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 600, color,
  background: bg, border: `1px solid ${color}30`,
  padding: '2px 8px', borderRadius: 99,
  textTransform: 'capitalize',
})

const btnStyle = (color, bg, outline = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 18px', borderRadius: 9,
  border: outline ? `1px solid var(--border)` : 'none',
  background: bg, color,
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer', transition: 'all 0.15s',
  fontFamily: 'Plus Jakarta Sans, sans-serif',
})