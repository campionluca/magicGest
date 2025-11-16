import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import CardModal from '../components/CardModal'

const API_URL = '/api'

export default function DeckDetail() {
  const { id } = useParams()
  const [deck, setDeck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchDeck()
  }, [id])

  const fetchDeck = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/decks/${id}`)
      const data = await response.json()
      setDeck(data)
    } catch (error) {
      console.error('Error fetching deck:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchCards = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const response = await fetch(`${API_URL}/cards/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data.cards || [])
    } catch (error) {
      console.error('Error searching cards:', error)
    }
  }

  const handleAddCardToDeck = async (card, category = 'mainboard') => {
    try {
      await fetch(`${API_URL}/decks/${id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_id: card.id,
          quantity: 1,
          category
        })
      })
      fetchDeck()
      setShowAddCard(false)
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      console.error('Error adding card to deck:', error)
    }
  }

  const handleUpdateCardQuantity = async (deckCardId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveCard(deckCardId)
      return
    }

    try {
      await fetch(`${API_URL}/decks/${id}/cards/${deckCardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      fetchDeck()
    } catch (error) {
      console.error('Error updating card quantity:', error)
    }
  }

  const handleRemoveCard = async (deckCardId) => {
    if (!confirm('Rimuovere questa carta dal mazzo?')) return

    try {
      await fetch(`${API_URL}/decks/${id}/cards/${deckCardId}`, {
        method: 'DELETE'
      })
      fetchDeck()
    } catch (error) {
      console.error('Error removing card:', error)
    }
  }

  const groupCardsByCategory = () => {
    if (!deck?.cards) return {}

    return deck.cards.reduce((groups, card) => {
      const category = card.category || 'mainboard'
      if (!groups[category]) groups[category] = []
      groups[category].push(card)
      return groups
    }, {})
  }

  const getCategoryTotal = (cards) => {
    return cards.reduce((sum, card) => sum + card.quantity, 0)
  }

  const handleExportDeck = () => {
    window.open(`${API_URL}/export/deck/${id}`, '_blank')
  }

  if (loading) {
    return <div className="loading">Caricamento mazzo...</div>
  }

  if (!deck) {
    return <div className="error">Mazzo non trovato</div>
  }

  const groupedCards = groupCardsByCategory()
  const mainboardCount = getCategoryTotal(groupedCards.mainboard || [])
  const sideboardCount = getCategoryTotal(groupedCards.sideboard || [])

  return (
    <div>
      <div className="header">
        <div>
          <Link to="/decks" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>
            ← Torna ai mazzi
          </Link>
          <h1>{deck.name}</h1>
          {deck.format && <p style={{ color: 'var(--accent)' }}>{deck.format}</p>}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to={`/decks/${id}/stats`}>
            <button className="secondary">📊 Statistiche & Playtest</button>
          </Link>
          <button className="secondary" onClick={handleExportDeck}>
            Export Decklist
          </button>
          <button onClick={() => setShowAddCard(true)}>+ Aggiungi Carta</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Mainboard</h3>
          <div className="value">{mainboardCount}</div>
        </div>
        <div className="stat-card">
          <h3>Sideboard</h3>
          <div className="value">{sideboardCount}</div>
        </div>
        <div className="stat-card">
          <h3>Carte Uniche</h3>
          <div className="value">{deck.cards?.length || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Valore Mazzo</h3>
          <div className="value">${deck.value?.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      {deck.description && (
        <div className="card">
          <h3>Descrizione</h3>
          <p>{deck.description}</p>
        </div>
      )}

      {Object.entries(groupedCards).map(([category, cards]) => (
        <div key={category} className="card">
          <h2 style={{ textTransform: 'capitalize', marginBottom: '20px' }}>
            {category === 'mainboard' ? 'Mainboard' : 'Sideboard'} ({getCategoryTotal(cards)})
          </h2>
          <div className="card-grid">
            {cards.map((card) => (
              <div key={card.deck_card_id} className="mtg-card">
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
                <p>{card.type_line}</p>
                <p>Quantità: {card.quantity}</p>
                {card.prices && (
                  <p><strong>${(parseFloat(card.prices.usd || 0) * card.quantity).toFixed(2)}</strong></p>
                )}
                <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                  <button
                    className="secondary"
                    style={{ flex: 1, padding: '5px' }}
                    onClick={() => handleUpdateCardQuantity(card.deck_card_id, card.quantity - 1)}
                  >
                    -
                  </button>
                  <button
                    className="secondary"
                    style={{ flex: 1, padding: '5px' }}
                    onClick={() => handleUpdateCardQuantity(card.deck_card_id, card.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    style={{ flex: 2, padding: '5px', background: '#dc2626' }}
                    onClick={() => handleRemoveCard(card.deck_card_id)}
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showAddCard && (
        <div className="modal" onClick={() => setShowAddCard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Aggiungi Carta al Mazzo</h2>
            <form onSubmit={handleSearchCards} className="search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca carta..."
              />
              <button type="submit">Cerca</button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '20px' }}>
                {searchResults.map((card) => (
                  <div
                    key={card.id}
                    style={{
                      display: 'flex',
                      gap: '15px',
                      padding: '10px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center'
                    }}
                  >
                    {card.image_uris?.small && (
                      <img src={card.image_uris.small} alt={card.name} style={{ width: '60px', borderRadius: '4px' }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4>{card.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{card.type_line}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleAddCardToDeck(card, 'mainboard')}>Main</button>
                      <button className="secondary" onClick={() => handleAddCardToDeck(card, 'sideboard')}>Side</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowAddCard(false)}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedCard && (
        <CardModal card={selectedCard} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
