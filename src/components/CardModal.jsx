export default function CardModal({ card, onClose, onAddToCollection }) {
  const handleAddClick = () => {
    if (onAddToCollection) {
      onAddToCollection(card)
    }
  }

  const parsePrices = () => {
    if (typeof card.prices === 'string') {
      return JSON.parse(card.prices)
    }
    return card.prices || {}
  }

  const parseColors = () => {
    if (typeof card.colors === 'string') {
      return JSON.parse(card.colors)
    }
    return card.colors || []
  }

  const prices = parsePrices()
  const colors = parseColors()

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            {(card.image_uri || card.image_uris?.large || card.image_uris?.normal) && (
              <img
                src={card.image_uri || card.image_uris?.large || card.image_uris?.normal}
                alt={card.name}
                style={{ width: '100%', borderRadius: '12px' }}
              />
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: '15px' }}>{card.name}</h2>

            {card.mana_cost && (
              <p style={{ fontSize: '20px', margin: '10px 0' }}>{card.mana_cost}</p>
            )}

            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
              {card.type_line}
            </p>

            {card.oracle_text && (
              <div style={{
                background: 'var(--bg-primary)',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '15px',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {card.oracle_text}
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <p><strong>Set:</strong> {card.set_name} ({card.set_code?.toUpperCase()})</p>
              <p><strong>Rarità:</strong> {card.rarity}</p>
              {card.collector_number && (
                <p><strong>Numero:</strong> {card.collector_number}</p>
              )}
              {colors.length > 0 && (
                <p><strong>Colori:</strong> {colors.join(', ')}</p>
              )}
              {card.cmc !== undefined && (
                <p><strong>CMC:</strong> {card.cmc}</p>
              )}
            </div>

            {Object.keys(prices).length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ marginBottom: '10px' }}>Prezzi</h3>
                {prices.usd && <p><strong>USD:</strong> ${prices.usd}</p>}
                {prices.usd_foil && <p><strong>USD Foil:</strong> ${prices.usd_foil}</p>}
                {prices.eur && <p><strong>EUR:</strong> €{prices.eur}</p>}
                {prices.eur_foil && <p><strong>EUR Foil:</strong> €{prices.eur_foil}</p>}
              </div>
            )}

            {card.scryfall_uri && (
              <a
                href={card.scryfall_uri}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
              >
                Vedi su Scryfall →
              </a>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="secondary" onClick={onClose}>Chiudi</button>
              {onAddToCollection && (
                <button onClick={handleAddClick}>Aggiungi alla Collezione</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
