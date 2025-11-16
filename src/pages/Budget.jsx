import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API_URL = '/api'

export default function Budget() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [period, setPeriod] = useState('all')
  const [valueHistory, setValueHistory] = useState([])
  const [newTransaction, setNewTransaction] = useState({
    type: 'purchase',
    amount: '',
    description: ''
  })

  useEffect(() => {
    fetchSummary()
    fetchTransactions()
    fetchValueHistory()
  }, [period])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/budget/summary?period=${period}`)
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/budget/transactions?limit=20`)
      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchValueHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/budget/value-history?days=90`)
      const data = await response.json()
      const formatted = data.map(s => ({
        date: new Date(s.snapshot_date).toLocaleDateString('it-IT'),
        value: s.total_value,
        cards: s.total_cards
      }))
      setValueHistory(formatted)
    } catch (error) {
      console.error('Error fetching value history:', error)
    }
  }

  const handleAddTransaction = async (e) => {
    e.preventDefault()

    try {
      await fetch(`${API_URL}/budget/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTransaction,
          amount: parseFloat(newTransaction.amount)
        })
      })

      setShowAddModal(false)
      setNewTransaction({ type: 'purchase', amount: '', description: '' })
      fetchSummary()
      fetchTransactions()
    } catch (error) {
      console.error('Error adding transaction:', error)
      alert('Errore nell\'aggiunta della transazione')
    }
  }

  const handleCreateSnapshot = async () => {
    try {
      const response = await fetch(`${API_URL}/budget/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'scryfall_usd' })
      })
      const data = await response.json()
      alert(`Snapshot creato! Valore: $${data.total_value.toFixed(2)}`)
      fetchValueHistory()
    } catch (error) {
      console.error('Error creating snapshot:', error)
      alert('Errore nella creazione dello snapshot')
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Eliminare questa transazione?')) return

    try {
      await fetch(`${API_URL}/budget/transactions/${id}`, { method: 'DELETE' })
      fetchSummary()
      fetchTransactions()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  return (
    <div>
      <div className="header">
        <h1>💰 Budget Tracker</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            <option value="all">Tutto</option>
            <option value="month">Ultimo mese</option>
            <option value="year">Ultimo anno</option>
            <option value="30days">Ultimi 30 giorni</option>
          </select>
          <button onClick={() => setShowAddModal(true)}>+ Aggiungi Transazione</button>
        </div>
      </div>

      {summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Speso</h3>
              <div className="value" style={{ color: '#ef4444' }}>
                ${summary.summary.total_spent.toFixed(2)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {summary.summary.purchase_count} acquisti
              </p>
            </div>
            <div className="stat-card">
              <h3>Guadagnato</h3>
              <div className="value" style={{ color: 'var(--success)' }}>
                ${summary.summary.total_earned.toFixed(2)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {summary.summary.sale_count} vendite
              </p>
            </div>
            <div className="stat-card">
              <h3>Saldo Netto</h3>
              <div className="value" style={{ color: summary.summary.net_spent > 0 ? '#ef4444' : 'var(--success)' }}>
                ${Math.abs(summary.summary.net_spent).toFixed(2)}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {summary.summary.trade_count} scambi
              </p>
            </div>
            <div className="stat-card">
              <h3>Totale Transazioni</h3>
              <div className="value">
                {summary.summary.purchase_count + summary.summary.sale_count + summary.summary.trade_count}
              </div>
            </div>
          </div>

          {summary.by_month.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Spese per Mese</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="spent" fill="#ef4444" name="Speso ($)" />
                  <Bar dataKey="earned" fill="#22c55e" name="Guadagnato ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {valueHistory.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Valore Collezione nel Tempo</h2>
            <button className="secondary" onClick={handleCreateSnapshot}>
              Crea Snapshot
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={valueHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} name="Valore ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Transazioni Recenti</h2>
        {transactions.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nessuna transazione registrata
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Data</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Descrizione</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Importo</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px' }}>
                      {new Date(t.transaction_date).toLocaleDateString('it-IT')}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge" style={{
                        background: t.type === 'purchase' ? '#ef4444' :
                                   t.type === 'sale' ? 'var(--success)' : 'var(--info)'
                      }}>
                        {t.type === 'purchase' ? 'Acquisto' : t.type === 'sale' ? 'Vendita' : 'Scambio'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>{t.description || t.card_name || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      ${t.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        style={{ padding: '5px 10px', fontSize: '12px', background: '#dc2626' }}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Aggiungi Transazione</h2>
            <form onSubmit={handleAddTransaction}>
              <label>Tipo</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                required
              >
                <option value="purchase">Acquisto</option>
                <option value="sale">Vendita</option>
                <option value="trade">Scambio</option>
              </select>

              <label>Importo ($)</label>
              <input
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                placeholder="0.00"
                required
              />

              <label>Descrizione</label>
              <textarea
                rows="3"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                placeholder="Es: Acquistato Lightning Bolt x4"
              />

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowAddModal(false)}>
                  Annulla
                </button>
                <button type="submit">Aggiungi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
