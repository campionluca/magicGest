import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API_URL = '/api'

export default function Prices() {
  const [platforms, setPlatforms] = useState([])
  const [selectedPlatform, setSelectedPlatform] = useState('scryfall_usd')
  const [collection, setCollection] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [priceHistory, setPriceHistory] = useState([])
  const [days, setDays] = useState(30)
  const [recording, setRecording] = useState(false)
  const [trends, setTrends] = useState({ gainers: [], losers: [] })

  useEffect(() => {
    fetchPlatforms()
    fetchCollection()
    fetchTrends()
  }, [])

  useEffect(() => {
    if (selectedCard) {
      fetchPriceHistory(selectedCard)
    }
  }, [selectedCard, selectedPlatform, days])

  const fetchPlatforms = async () => {
    try {
      const response = await fetch(`${API_URL}/prices/platforms`)
      const data = await response.json()
      setPlatforms(data)
    } catch (error) {
      console.error('Error fetching platforms:', error)
    }
  }

  const fetchCollection = async () => {
    try {
      const response = await fetch(`${API_URL}/collection`)
      const data = await response.json()
      setCollection(data)
    } catch (error) {
      console.error('Error fetching collection:', error)
    }
  }

  const fetchPriceHistory = async (cardId) => {
    try {
      const response = await fetch(`${API_URL}/prices/history/${cardId}?platform=${selectedPlatform}&days=${days}`)
      const data = await response.json()
      setPriceHistory(data.history.map(h => ({
        date: new Date(h.date).toLocaleDateString('it-IT'),
        price: h.price,
        fullDate: h.date
      })))
    } catch (error) {
      console.error('Error fetching price history:', error)
    }
  }

  const fetchTrends = async () => {
    try {
      const response = await fetch(`${API_URL}/prices/trends?platform=${selectedPlatform}&days=7&limit=10`)
      const data = await response.json()
      setTrends(data)
    } catch (error) {
      console.error('Error fetching trends:', error)
    }
  }

  const handleRecordPrices = async () => {
    if (!confirm('Registrare i prezzi attuali per tutta la collezione?')) return

    try {
      setRecording(true)
      const response = await fetch(`${API_URL}/prices/record-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform })
      })
      const data = await response.json()
      alert(`Registrati: ${data.recorded}, Saltati: ${data.skipped}, Errori: ${data.failed}`)
      fetchTrends()
    } catch (error) {
      console.error('Error recording prices:', error)
      alert('Errore nella registrazione dei prezzi')
    } finally {
      setRecording(false)
    }
  }

  return (
    <div>
      <div className="header">
        <h1>Monitoraggio Prezzi</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            style={{ width: 'auto', marginBottom: 0 }}
          >
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={handleRecordPrices} disabled={recording}>
            {recording ? 'Registrando...' : 'Registra Prezzi Collezione'}
          </button>
        </div>
      </div>

      {trends.gainers.length > 0 && (
        <div className="card">
          <h2>Top Variazioni (ultimi 7 giorni)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div>
              <h3 style={{ color: 'var(--success)', marginBottom: '15px' }}>🔥 Più Cresciute</h3>
              {trends.gainers.map((trend, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                  <strong>{trend.name}</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '14px' }}>
                    <span>${trend.old_price.toFixed(2)} → ${trend.new_price.toFixed(2)}</span>
                    <span style={{ color: 'var(--success)' }}>+{trend.percent_change.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ color: '#ef4444', marginBottom: '15px' }}>📉 Più Calate</h3>
              {trends.losers.map((trend, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                  <strong>{trend.name}</strong>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '14px' }}>
                    <span>${trend.old_price.toFixed(2)} → ${trend.new_price.toFixed(2)}</span>
                    <span style={{ color: '#ef4444' }}>{trend.percent_change.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Storico Prezzi Carta</h2>
        <div style={{ marginBottom: '20px' }}>
          <label>Seleziona carta dalla collezione:</label>
          <select
            value={selectedCard || ''}
            onChange={(e) => setSelectedCard(e.target.value)}
          >
            <option value="">-- Seleziona una carta --</option>
            {collection.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name} ({card.set_name})
              </option>
            ))}
          </select>

          <label>Periodo:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ marginBottom: 0 }}
          >
            <option value={7}>Ultimi 7 giorni</option>
            <option value={30}>Ultimi 30 giorni</option>
            <option value={90}>Ultimi 90 giorni</option>
            <option value={180}>Ultimi 6 mesi</option>
            <option value={365}>Ultimo anno</option>
          </select>
        </div>

        {priceHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceHistory}>
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
              <Line
                type="monotone"
                dataKey="price"
                stroke="var(--accent)"
                strokeWidth={2}
                name="Prezzo ($)"
                dot={{ fill: 'var(--accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : selectedCard ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            Nessuno storico prezzi disponibile per questa carta.
            <br />
            Registra i prezzi regolarmente per costruire lo storico.
          </p>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            Seleziona una carta per visualizzare lo storico prezzi
          </p>
        )}
      </div>

      <div className="card">
        <h3>Come funziona?</h3>
        <ul style={{ marginLeft: '20px', marginTop: '10px', color: 'var(--text-secondary)' }}>
          <li>Seleziona la piattaforma di prezzi che preferisci (Scryfall, TCGPlayer, Cardmarket, ecc.)</li>
          <li>Clicca "Registra Prezzi Collezione" per salvare i prezzi attuali di tutte le tue carte</li>
          <li>Ripeti regolarmente (es. ogni giorno/settimana) per costruire uno storico</li>
          <li>Visualizza l'andamento dei prezzi nel grafico e scopri le tendenze del mercato</li>
        </ul>
      </div>
    </div>
  )
}
