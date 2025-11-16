import { useState, useEffect } from 'react'
import CardModal from '../components/CardModal'

const API_URL = '/api'

export default function Collection() {
  const [collection, setCollection] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchCollection()
    fetchStats()
  }, [])

  const fetchCollection = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/collection${filter ? `?filter=${filter}` : ''}`)
      const data = await response.json()
      setCollection(data)
    } catch (error) {
      console.error('Error fetching collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/collection/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchCollection()
  }

  const handleRemoveCard = async (collectionId) => {
    if (!confirm('Rimuovere questa carta dalla collezione?')) return

    try {
      await fetch(`${API_URL}/collection/${collectionId}`, {
        method: 'DELETE'
      })
      fetchCollection()
      fetchStats()
    } catch (error) {
      console.error('Error removing card:', error)
    }
  }

  const handleUpdateQuantity = async (collectionId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveCard(collectionId)
      return
    }

    try {
      await fetch(`${API_URL}/collection/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      fetchCollection()
      fetchStats()
    } catch (error) {
      console.error('Error updating quantity:', error)
    }
  }

  const getRarityBadgeClass = (rarity) => {
    const rarityMap = {
      common: 'common',
      uncommon: 'uncommon',
      rare: 'rare',
      mythic: 'mythic'
    }
    return rarityMap[rarity] || 'common'
  }

  const handleExport = (format) => {
    const url = format === 'json'
      ? `${API_URL}/export/collection`
      : `${API_URL}/export/collection/csv`
    window.open(url, '_blank')
  }

  if (loading && collection.length === 0) {
    return <div className="loading">Caricamento collezione...</div>
  }

  return (
    <div>
      <div className="header">
        <h1>La Mia Collezione</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={() => handleExport('json')}>
            Export JSON
          </button>
          <button className="secondary" onClick={() => handleExport('csv')}>
            Export CSV
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Carte Totali</h3>
            <div className="value">{stats.total_cards}</div>
          </div>
          <div className="stat-card">
            <h3>Carte Uniche</h3>
            <div className="value">{stats.unique_cards}</div>
          </div>
          <div className="stat-card">
            <h3>Valore Totale</h3>
            <div className="value">${stats.total_value.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <h3>Set Diversi</h3>
            <div className="value">{stats.top_sets.length}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Cerca per nome o set..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="submit">Cerca</button>
      </form>

      {collection.length === 0 ? (
        <div className="card">
          <p>Nessuna carta nella collezione. Vai su "Cerca Carte" per aggiungerne!</p>
        </div>
      ) : (
        <div className="card-grid">
          {collection.map((card) => (
            <div key={card.collection_id} className="mtg-card">
              {card.image_uri && (
                <img
                  src={card.image_uri}
                  alt={card.name}
                  onClick={() => {
                    setSelectedCard(card)
                    setShowModal(true)
                  }}
                />
              )}
              <h3>{card.name}</h3>
              <p>
                <span className={`badge ${getRarityBadgeClass(card.rarity)}`}>
                  {card.rarity}
                </span>
                {card.set_name}
              </p>
              <p>Quantità: {card.quantity}</p>
              <p>Condizione: {card.condition}</p>
              {card.foil === 1 && <p>✨ Foil</p>}
              {card.prices && JSON.parse(card.prices).usd && (
                <p><strong>${JSON.parse(card.prices).usd}</strong> cad.</p>
              )}
              <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                <button
                  className="secondary"
                  style={{ flex: 1, padding: '5px' }}
                  onClick={() => handleUpdateQuantity(card.collection_id, card.quantity - 1)}
                >
                  -
                </button>
                <button
                  className="secondary"
                  style={{ flex: 1, padding: '5px' }}
                  onClick={() => handleUpdateQuantity(card.collection_id, card.quantity + 1)}
                >
                  +
                </button>
                <button
                  style={{ flex: 2, padding: '5px', background: '#dc2626' }}
                  onClick={() => handleRemoveCard(card.collection_id)}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedCard && (
        <CardModal card={selectedCard} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
