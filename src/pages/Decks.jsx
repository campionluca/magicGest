import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_URL = '/api'

export default function Decks() {
  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDeck, setNewDeck] = useState({
    name: '',
    format: '',
    description: '',
    color_identity: ''
  })

  useEffect(() => {
    fetchDecks()
  }, [])

  const fetchDecks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/decks`)
      const data = await response.json()
      setDecks(data)
    } catch (error) {
      console.error('Error fetching decks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDeck = async (e) => {
    e.preventDefault()

    if (!newDeck.name.trim()) {
      alert('Inserisci un nome per il mazzo')
      return
    }

    try {
      const response = await fetch(`${API_URL}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeck)
      })

      if (response.ok) {
        setShowCreateModal(false)
        setNewDeck({ name: '', format: '', description: '', color_identity: '' })
        fetchDecks()
      }
    } catch (error) {
      console.error('Error creating deck:', error)
      alert('Errore nella creazione del mazzo')
    }
  }

  const handleDeleteDeck = async (deckId) => {
    if (!confirm('Sei sicuro di voler eliminare questo mazzo?')) return

    try {
      await fetch(`${API_URL}/decks/${deckId}`, {
        method: 'DELETE'
      })
      fetchDecks()
    } catch (error) {
      console.error('Error deleting deck:', error)
    }
  }

  if (loading) {
    return <div className="loading">Caricamento mazzi...</div>
  }

  return (
    <div>
      <div className="header">
        <h1>I Miei Mazzi</h1>
        <button onClick={() => setShowCreateModal(true)}>+ Nuovo Mazzo</button>
      </div>

      {decks.length === 0 ? (
        <div className="card">
          <p>Nessun mazzo creato. Inizia creando il tuo primo mazzo!</p>
        </div>
      ) : (
        <div className="card-grid">
          {decks.map((deck) => (
            <div key={deck.id} className="card">
              <Link to={`/decks/${deck.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3>{deck.name}</h3>
                {deck.format && (
                  <p style={{ color: 'var(--accent)' }}>{deck.format}</p>
                )}
                {deck.description && (
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '10px 0' }}>
                    {deck.description}
                  </p>
                )}
                <div style={{ marginTop: '15px' }}>
                  <p><strong>Carte:</strong> {deck.total_cards || 0}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Ultimo aggiornamento: {new Date(deck.updated_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteDeck(deck.id)
                }}
                style={{ width: '100%', marginTop: '15px', background: '#dc2626' }}
              >
                Elimina Mazzo
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Crea Nuovo Mazzo</h2>
            <form onSubmit={handleCreateDeck}>
              <label>Nome Mazzo *</label>
              <input
                type="text"
                value={newDeck.name}
                onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                placeholder="Es: Izzet Spells"
                required
              />

              <label>Formato</label>
              <select
                value={newDeck.format}
                onChange={(e) => setNewDeck({ ...newDeck, format: e.target.value })}
              >
                <option value="">Seleziona formato</option>
                <option value="Standard">Standard</option>
                <option value="Modern">Modern</option>
                <option value="Pioneer">Pioneer</option>
                <option value="Commander">Commander</option>
                <option value="Legacy">Legacy</option>
                <option value="Vintage">Vintage</option>
                <option value="Pauper">Pauper</option>
                <option value="Casual">Casual</option>
              </select>

              <label>Identità Colore</label>
              <input
                type="text"
                value={newDeck.color_identity}
                onChange={(e) => setNewDeck({ ...newDeck, color_identity: e.target.value })}
                placeholder="Es: UR, WUB, G"
              />

              <label>Descrizione</label>
              <textarea
                rows="3"
                value={newDeck.description}
                onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                placeholder="Descrivi la strategia del mazzo..."
              />

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                  Annulla
                </button>
                <button type="submit">Crea Mazzo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
