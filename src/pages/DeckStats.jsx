import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const API_URL = '/api'

const COLORS = {
  W: '#F0E68C',
  U: '#0E68AB',
  B: '#150B00',
  R: '#D3202A',
  G: '#00733E',
  C: '#BEB9B2'
}

export default function DeckStats() {
  const { id } = useParams()
  const [deck, setDeck] = useState(null)
  const [stats, setStats] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [hand, setHand] = useState(null)
  const [mulligans, setMulligans] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeck()
    fetchStats()
    fetchAnalysis()
  }, [id])

  const fetchDeck = async () => {
    try {
      const response = await fetch(`${API_URL}/decks/${id}`)
      const data = await response.json()
      setDeck(data)
    } catch (error) {
      console.error('Error fetching deck:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/deck-stats/${id}/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`${API_URL}/deck-stats/${id}/analyze`)
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Error fetching analysis:', error)
    }
  }

  const handleDrawHand = async () => {
    try {
      const response = await fetch(`${API_URL}/deck-stats/${id}/playtest/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hand_size: 7, mulligans })
      })
      const data = await response.json()
      setHand(data)
    } catch (error) {
      console.error('Error drawing hand:', error)
      alert('Errore nel pescare la mano')
    }
  }

  const handleMulligan = () => {
    setMulligans(m => m + 1)
  }

  if (loading) {
    return <div className="loading">Caricamento statistiche...</div>
  }

  if (!deck) {
    return <div className="error">Mazzo non trovato</div>
  }

  return (
    <div>
      <div className="header">
        <div>
          <Link to={`/decks/${id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px' }}>
            ← Torna al mazzo
          </Link>
          <h1>📊 Statistiche: {deck.name}</h1>
        </div>
      </div>

      {analysis && (
        <div className="card">
          <h2 style={{ marginBottom: '15px' }}>Analisi Mazzo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <p><strong>Formato:</strong> {analysis.format || 'Non specificato'}</p>
              <p><strong>Carte Totali:</strong> {analysis.total_cards}</p>
              <p><strong>Terre:</strong> {analysis.land_count} ({analysis.land_percentage}%)</p>
              <p><strong>CMC Medio:</strong> {analysis.avg_cmc}</p>
            </div>
            <div>
              {analysis.issues.length > 0 && (
                <div>
                  <h3 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ Problemi</h3>
                  <ul style={{ marginLeft: '20px', color: '#ef4444' }}>
                    {analysis.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.suggestions.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <h3 style={{ color: '#f59e0b', marginBottom: '10px' }}>💡 Suggerimenti</h3>
                  <ul style={{ marginLeft: '20px', color: '#f59e0b' }}>
                    {analysis.suggestions.map((sugg, i) => (
                      <li key={i}>{sugg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {stats && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>Curva di Mana</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.mana_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="cmc" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="var(--accent)" name="Numero Carte" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Distribuzione Colori</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats.color_distribution)
                      .filter(([_, count]) => count > 0)
                      .map(([color, count]) => ({ name: color, value: count }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(stats.color_distribution)
                      .filter(([_, count]) => count > 0)
                      .map(([color], index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[color] || '#888'} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Distribuzione Tipi</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(stats.type_distribution)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize' }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '100px',
                          height: '20px',
                          background: 'var(--bg-primary)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(count / stats.total_cards) * 100}%`,
                            height: '100%',
                            background: 'var(--accent)'
                          }} />
                        </div>
                        <span style={{ minWidth: '30px', textAlign: 'right' }}>{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>🎲 Playtest - Simula Mano Iniziale</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <button onClick={handleDrawHand}>Pesca Mano</button>
          <button className="secondary" onClick={handleMulligan} disabled={mulligans >= 7}>
            Mulligan ({mulligans})
          </button>
          {mulligans > 0 && (
            <button className="secondary" onClick={() => setMulligans(0)}>
              Reset
            </button>
          )}
        </div>

        {hand && (
          <>
            <div className="stats-grid" style={{ marginBottom: '20px' }}>
              <div className="stat-card">
                <h3>Carte in Mano</h3>
                <div className="value">{hand.stats.hand_size}</div>
              </div>
              <div className="stat-card">
                <h3>Terre</h3>
                <div className="value">{hand.stats.lands}</div>
              </div>
              <div className="stat-card">
                <h3>Magie</h3>
                <div className="value">{hand.stats.spells}</div>
              </div>
              <div className="stat-card">
                <h3>CMC Medio</h3>
                <div className="value">{hand.stats.avg_cmc}</div>
              </div>
            </div>

            <div className="card-grid">
              {hand.hand.map((card, index) => (
                <div key={index} className="mtg-card">
                  {card.image_uri && <img src={card.image_uri} alt={card.name} />}
                  <h3>{card.name}</h3>
                  <p>{card.type_line}</p>
                  {card.mana_cost && <p style={{ fontSize: '16px' }}>{card.mana_cost}</p>}
                  <p><strong>CMC:</strong> {card.cmc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
