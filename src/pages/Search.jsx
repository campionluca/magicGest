import { useState } from 'react'
import CardModal from '../components/CardModal'

const API_URL = '/api'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [addingCard, setAddingCard] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/cards/search?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error('Errore nella ricerca')
      }

      const data = await response.json()
      setResults(data.cards || [])
      setHasMore(data.has_more || false)
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCollection = async (card, options = {}) => {
    try {
      setAddingCard(card.id)
      const response = await fetch(`${API_URL}/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.id,
          quantity: options.quantity || 1,
          condition: options.condition || 'NM',
          foil: options.foil || false,
          language: options.language || 'en'
        })
      })

      if (!response.ok) {
        throw new Error('Errore nell\'aggiunta alla collezione')
      }

      alert('Carta aggiunta alla collezione!')
    } catch (err) {
      alert('Errore: ' + err.message)
    } finally {
      setAddingCard(null)
    }
  }

  const handleAddToWishlist = async (card) => {
    const maxPrice = prompt('Prezzo massimo che vuoi pagare per questa carta (opzionale):')
    const priority = prompt('Priorità (high/medium/low):', 'medium')

    try {
      await fetch(`${API_URL}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.id,
          quantity: 1,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          priority: priority || 'medium'
        })
      })
      alert('Carta aggiunta alla wishlist!')
    } catch (error) {
      console.error('Error adding to wishlist:', error)
      alert('Errore nell\'aggiunta alla wishlist')
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

  return (
    <div>
      <div className="header">
        <h1>Cerca Carte</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Cerca carte per nome, tipo, testo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Cercando...' : 'Cerca'}
          </button>
        </form>

        <div style={{ marginTop: '15px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          <p><strong>Esempi di ricerca:</strong></p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li><code>Lightning Bolt</code> - Cerca per nome</li>
            <li><code>t:creature c:red</code> - Creature rosse</li>
            <li><code>o:draw cmc=2</code> - Carte con "draw" nel testo e costo 2</li>
            <li><code>set:neo r:mythic</code> - Mythic del set Kamigawa Neon Dynasty</li>
          </ul>
        </div>
      </div>

      {error && (
        <div className="error">
          Errore: {error}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="card">
            <p>Trovate {results.length} carte{hasMore && ' (mostrando solo le prime)'}</p>
          </div>

          <div className="card-grid">
            {results.map((card) => (
              <div key={card.id} className="mtg-card">
                {(card.image_uris?.normal || card.image_uris?.small) && (
                  <img
                    src={card.image_uris.normal || card.image_uris.small}
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
                <p>{card.type_line}</p>
                {card.mana_cost && (
                  <p style={{ fontSize: '18px', margin: '8px 0' }}>{card.mana_cost}</p>
                )}
                {card.prices?.usd && (
                  <p><strong>${card.prices.usd}</strong></p>
                )}
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  <button
                    onClick={() => handleAddToCollection(card)}
                    disabled={addingCard === card.id}
                    style={{ flex: 1 }}
                  >
                    {addingCard === card.id ? '...' : '+ Collezione'}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleAddToWishlist(card)}
                    style={{ flex: 1 }}
                  >
                    ⭐ Wishlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setShowModal(false)}
          onAddToCollection={handleAddToCollection}
        />
      )}
    </div>
  )
}
