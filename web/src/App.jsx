import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const PENDING_KEY = 'pendingExpense'

const emptyForm = {
  amount: '',
  category: '',
  description: '',
  date: '',
}

function App() {
  const [form, setForm] = useState(emptyForm)
  const [expenses, setExpenses] = useState([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortNewest, setSortNewest] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pendingSubmission, setPendingSubmission] = useState(null)

  const categories = useMemo(() => {
    const unique = new Set(expenses.map((expense) => expense.category))
    return Array.from(unique).sort()
  }, [expenses])

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  }, [expenses])

  useEffect(() => {
    const stored = loadPending()
    if (stored) {
      setPendingSubmission(stored)
      retryPending(stored)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [filterCategory, sortNewest])

  const fetchExpenses = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterCategory !== 'all') {
        params.set('category', filterCategory)
      }
      if (sortNewest) {
        params.set('sort', 'date_desc')
      }

      const query = params.toString()
      const response = await fetch(
        `${API_URL}/expenses${query ? `?${query}` : ''}`,
      )
      if (!response.ok) {
        throw new Error('Failed to fetch expenses.')
      }
      const data = await response.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message ?? 'Unable to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  const retryPending = async (pending) => {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': pending.id,
        },
        body: JSON.stringify(pending.payload),
      })
      if (!response.ok) {
        throw new Error('Pending expense retry failed.')
      }
      clearPending()
      await fetchExpenses()
    } catch (err) {
      setError(err.message ?? 'Pending expense retry failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const loadPending = () => {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const savePending = (payload, id) => {
    const pending = { id, payload }
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    setPendingSubmission(pending)
  }

  const clearPending = () => {
    localStorage.removeItem(PENDING_KEY)
    setPendingSubmission(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pendingSubmission) {
      setError('A previous submission is still pending. Please wait.')
      return
    }

    setSubmitting(true)
    setError('')

    const payload = {
      amount: Number(form.amount),
      category: form.category.trim(),
      description: form.description.trim(),
      date: form.date,
    }

    const requestId = crypto.randomUUID()
    savePending(payload, requestId)

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error('Failed to save expense.')
      }
      clearPending()
      setForm(emptyForm)
      await fetchExpenses()
    } catch (err) {
      setError(err.message ?? 'Unable to save expense.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Expense Tracker</p>
          <h1>Keep tabs on where your money goes.</h1>
        </div>
        <div className="summary">
          <p className="summary-label">Total (current list)</p>
          <p className="summary-value">₹{totalAmount.toFixed(2)}</p>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Add Expense</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                placeholder="0.00"
              />
            </label>
            <label>
              Category
              <input
                type="text"
                required
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Groceries"
              />
            </label>
            <label>
              Description
              <input
                type="text"
                required
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Weekly market trip"
              />
            </label>
            <label>
              Date
              <input
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Expense'}
            </button>
            {pendingSubmission ? (
              <p className="note">Retrying pending submission…</p>
            ) : null}
          </form>
        </section>

        <section className="card">
          <div className="toolbar">
            <div>
              <h2>Expenses</h2>
              <p className="muted">Filter and sort your entries.</p>
            </div>
            <div className="controls">
              <label>
                Category
                <select
                  value={filterCategory}
                  onChange={(event) => setFilterCategory(event.target.value)}
                >
                  <option value="all">All</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={sortNewest}
                  onChange={(event) => setSortNewest(event.target.checked)}
                />
                Newest first
              </label>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {loading ? (
            <p className="note">Loading expenses…</p>
          ) : expenses.length === 0 ? (
            <p className="note">No expenses yet.</p>
          ) : (
            <div className="table">
              <div className="row header-row">
                <span>Date</span>
                <span>Category</span>
                <span>Description</span>
                <span className="amount">Amount</span>
              </div>
              {expenses.map((expense) => (
                <div className="row" key={expense.id}>
                  <span>{expense.date}</span>
                  <span>{expense.category}</span>
                  <span>{expense.description}</span>
                  <span className="amount">₹{Number(expense.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
