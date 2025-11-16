import { useState, useEffect } from 'react'
import CardModal from '../components/CardModal'

const API_URL = '/api'

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showAffordable, setShowAffordable] = useState(false)
  const [affordable, setAffordable] = useState([])

  useEffect(() => {
    fetchWishlist()
    fetchStats()
  }, [])

  const fetchWishlist = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/wishlist`)
      const data = await response.json()
      setWishlist(data)
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchAffordable = async () => {
    try {
      const response = await fetch(`${API_URL}/wishlist/affordable`)
      const data = await response.json()
      setAffordable(data)
      setShowAffordable(true)
    } catch (error) {
      console.error('Error fetching affordable:', error)
    }
  }

  const handleRemove = async (id) => {
    if (!confirm('Rimuovere dalla wishlist?')) return

    try {
      await fetch(`${API_URL}/wishlist/${id}`, { method: 'DELETE' })
      fetchWishlist()
      fetchStats()
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    }
  }

  const handleUpdatePriority = async (id, priority) => {
    try {
      await fetch(`${API_URL}/wishlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      })
      fetchWishlist()
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#6b7280'
    }
    return colors[priority] || colors.medium
  }

  if (loading) {
    return <div className="loading">Caricamento wishlist...</div>
  }

  return (
    <div>
      <div className="header">
        <h1>⭐ Wishlist</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={fetchAffordable}>
            Mostra Acquistabili
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Carte Desiderate</h3>
            <div className="value">{stats.total_items}</div>
          </div>
          <div className="stat-card">
            <h3>Valore Totale</h3>
            <div className="value">${stats.total_value.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <h3>Acquistabili</h3>
            <div className="value">{stats.affordable_count}</div>
          </div>
          <div className="stat-card">
            <h3>Valore Acquistabili</h3>
            <div className="value" style={{ color: 'var(--success)' }}>
              ${stats.affordable_value.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {showAffordable && affordable.length > 0 && (
        <div className="card" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'var(--success)' }}>
          <h3 style={{ color: 'var(--success)', marginBottom: '15px' }}>
            🎯 Carte Acquistabili Ora ({affordable.length})
          </h3>
          <div className="card-grid">
            {affordable.map((item) => (
              <div key={item.id} className="mtg-card" style={{ borderColor: 'var(--success)' }}>
                {item.image_uri && <img src={item.image_uri} alt={item.name} />}
                <h3>{item.name}</h3>
                <p>{item.set_name}</p>
                <p><strong style={{ color: 'var(--success)' }}>${item.current_price}</strong> / ${item.max_price}</p>
                <p>Quantità: {item.quantity}</p>
              </div>
            ))}
          </div>
          <button
            className="secondary"
            onClick={() => setShowAffordable(false)}
            style={{ marginTop: '15px', width: '100%' }}
          >
            Chiudi
          </button>
        </div>
      )}

      {wishlist.length === 0 ? (
        <div className="card">
          <p>Nessuna carta nella wishlist. Vai su "Cerca Carte" per aggiungerne!</p>
        </div>
      ) : (
        <>
          {['high', 'medium', 'low'].map(priority => {
            const items = wishlist.filter(w => w.priority === priority)
            if (items.length === 0) return null

            return (
              <div key={priority} className="card">
                <h2 style={{ color: getPriorityColor(priority), marginBottom: '20px', textTransform: 'capitalize' }}>
                  {priority === 'high' && '🔥 '}{priority === 'medium' && '⚡ '}{priority === 'low' && '📌 '}
                  Priorità {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Bassa'} ({items.length})
                </h2>
                <div className="card-grid">
                  {items.map((item) => (
                    <div key={item.id} className="mtg-card">
                      {item.image_uri && (
                        <img
                          src={item.image_uri}
                          alt={item.name}
                          onClick={() => {
                            setSelectedCard(item)
                            setShowModal(true)
                          }}
                        />
                      )}
                      <h3>{item.name}</h3>
                      <p>{item.set_name}</p>
                      <span className={`badge ${item.rarity}`}>{item.rarity}</span>
                      {item.prices.usd && (
                        <p><strong>${item.prices.usd}</strong> cad.</p>
                      )}
                      {item.max_price && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Max: ${item.max_price}
                        </p>
                      )}
                      <p>Quantità: {item.quantity}</p>
                      {item.notes && (
                        <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                          {item.notes}
                        </p>
                      )}
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <select
                          value={item.priority}
                          onChange={(e) => handleUpdatePriority(item.id, e.target.value)}
                          style={{ padding: '5px', fontSize: '12px' }}
                        >
                          <option value="high">🔥 Alta</option>
                          <option value="medium">⚡ Media</option>
                          <option value="low">📌 Bassa</option>
                        </select>
                        <button
                          onClick={() => handleRemove(item.id)}
                          style={{ padding: '5px', background: '#dc2626', fontSize: '12px' }}
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {showModal && selectedCard && (
        <CardModal card={selectedCard} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
