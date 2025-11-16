# MagicGest 🃏

Gestionale per collezione di carte Magic: The Gathering con monitoraggio prezzi e gestione mazzi.

## Funzionalità

### Core
- ✅ **Gestione Collezione**: Aggiungi, modifica e rimuovi carte dalla tua collezione
- ✅ **Ricerca Carte**: Cerca carte tramite l'API Scryfall con filtri avanzati
- ✅ **Gestione Mazzi**: Crea e gestisci i tuoi mazzi (mainboard + sideboard)
- ✅ **Import/Export**: Esporta la collezione in JSON o CSV, esporta mazzi in formato MTGO
- ✅ **Statistiche**: Visualizza statistiche della collezione (valore totale, carte per set, ecc.)

### Monitoraggio Prezzi
- ✅ **Tracking Prezzi**: Traccia i prezzi delle carte su diverse piattaforme
- ✅ **Grafici Storici**: Visualizza l'andamento dei prezzi nel tempo
- ✅ **Alert Prezzi**: Notifiche quando una carta raggiunge il prezzo target
- ✅ **Trend Mercato**: Visualizza top carte in crescita/calo

### Wishlist & Budget
- ✅ **Wishlist**: Lista carte desiderate con priorità e prezzo massimo
- ✅ **Carte Acquistabili**: Trova carte della wishlist sotto il prezzo target
- ✅ **Budget Tracker**: Traccia spese e vendite per la collezione
- ✅ **Storico Valore**: Grafici del valore della collezione nel tempo

### Analisi Mazzi
- ✅ **Statistiche Avanzate**: Curva di mana, distribuzione colori e tipi
- ✅ **Analizzatore Deck**: Suggerimenti e problemi del mazzo
- ✅ **Playtest Simulator**: Simula mani iniziali con mulligan
- ✅ **Deck Value Tracking**: Monitora il valore del mazzo

## Stack Tecnologico

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **API Carte**: Scryfall API
- **Grafici**: Recharts
- **Routing**: React Router

## Installazione

1. Clona il repository:
```bash
git clone <repo-url>
cd magicGest
```

2. Installa le dipendenze:
```bash
npm install
```

## Utilizzo

### Avvio in sviluppo

Avvia sia il server backend che il frontend in parallelo:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Avvio separato

Server backend:
```bash
npm run server
```

Client frontend:
```bash
npm run client
```

### Build per produzione

```bash
npm run build
```

## Struttura del Progetto

```
magicGest/
├── server/              # Backend Node.js/Express
│   ├── db/             # Database SQLite e schema
│   ├── routes/         # API routes
│   └── index.js        # Server principale
├── src/                # Frontend React
│   ├── components/     # Componenti React riutilizzabili
│   ├── pages/          # Pagine dell'applicazione
│   ├── App.jsx         # Componente principale
│   └── main.jsx        # Entry point
├── public/             # File statici
└── package.json
```

## Piattaforme Prezzi Supportate

- Scryfall USD/EUR (normale e foil)
- TCGPlayer
- Cardmarket

## API Endpoints

### Carte
- `GET /api/cards/search?q=<query>` - Cerca carte su Scryfall
- `GET /api/cards/:id` - Ottieni dettagli carta

### Collezione
- `GET /api/collection` - Ottieni tutte le carte della collezione
- `POST /api/collection` - Aggiungi carta alla collezione
- `PUT /api/collection/:id` - Aggiorna carta
- `DELETE /api/collection/:id` - Rimuovi carta
- `GET /api/collection/stats` - Statistiche collezione

### Mazzi
- `GET /api/decks` - Lista mazzi
- `GET /api/decks/:id` - Dettagli mazzo
- `POST /api/decks` - Crea mazzo
- `PUT /api/decks/:id` - Aggiorna mazzo
- `DELETE /api/decks/:id` - Elimina mazzo
- `POST /api/decks/:id/cards` - Aggiungi carta al mazzo
- `PUT /api/decks/:deckId/cards/:cardId` - Aggiorna carta nel mazzo
- `DELETE /api/decks/:deckId/cards/:cardId` - Rimuovi carta dal mazzo

### Prezzi
- `GET /api/prices/platforms` - Lista piattaforme disponibili
- `GET /api/prices/card/:cardId` - Prezzo corrente carta
- `GET /api/prices/history/:cardId` - Storico prezzi
- `POST /api/prices/record/:cardId` - Registra prezzo
- `POST /api/prices/record-collection` - Registra prezzi collezione
- `GET /api/prices/trends` - Top variazioni prezzi

### Import/Export
- `GET /api/export/collection` - Esporta collezione (JSON)
- `GET /api/export/collection/csv` - Esporta collezione (CSV)
- `GET /api/export/deck/:deckId` - Esporta mazzo (formato MTGO)

### Wishlist
- `GET /api/wishlist` - Ottieni wishlist
- `POST /api/wishlist` - Aggiungi carta alla wishlist
- `PUT /api/wishlist/:id` - Aggiorna item wishlist
- `DELETE /api/wishlist/:id` - Rimuovi da wishlist
- `GET /api/wishlist/affordable` - Carte acquistabili
- `GET /api/wishlist/stats` - Statistiche wishlist

### Alert Prezzi
- `GET /api/alerts` - Lista alert
- `POST /api/alerts` - Crea alert prezzo
- `PUT /api/alerts/:id` - Aggiorna alert
- `DELETE /api/alerts/:id` - Elimina alert
- `POST /api/alerts/check` - Controlla alert attivi
- `GET /api/alerts/triggered` - Alert scattati

### Budget
- `GET /api/budget/transactions` - Lista transazioni
- `POST /api/budget/transactions` - Aggiungi transazione
- `DELETE /api/budget/transactions/:id` - Elimina transazione
- `GET /api/budget/summary` - Riepilogo budget
- `POST /api/budget/snapshot` - Crea snapshot valore collezione
- `GET /api/budget/value-history` - Storico valore collezione

### Statistiche Mazzi
- `GET /api/deck-stats/:deckId/stats` - Statistiche mazzo avanzate
- `POST /api/deck-stats/:deckId/playtest/draw` - Simula mano iniziale
- `GET /api/deck-stats/:deckId/analyze` - Analizza mazzo

## Database

Il database SQLite viene creato automaticamente al primo avvio in `server/db/magicgest.db`.

### Tabelle
- `cards` - Cache delle carte da Scryfall
- `collection` - Carte possedute dall'utente
- `decks` - Mazzi creati
- `deck_cards` - Carte nei mazzi
- `price_history` - Storico prezzi
- `wishlist` - Carte desiderate
- `price_alerts` - Alert su variazioni prezzi
- `budget_transactions` - Transazioni acquisti/vendite
- `collection_snapshots` - Snapshot valore collezione
- `settings` - Impostazioni applicazione

## Come Usare

### 1. Cercare e Aggiungere Carte

1. Vai su "Cerca Carte"
2. Cerca usando il nome o filtri avanzati (es: `t:creature c:red`)
3. Clicca "Aggiungi alla Collezione"

### 2. Gestire la Collezione

1. Vai su "Collezione"
2. Visualizza statistiche e valore totale
3. Modifica quantità con i pulsanti +/-
4. Esporta in JSON o CSV

### 3. Creare Mazzi

1. Vai su "Mazzi"
2. Clicca "Nuovo Mazzo"
3. Compila le informazioni (nome, formato, ecc.)
4. Aggiungi carte al mainboard o sideboard
5. Esporta il mazzo in formato testo

### 4. Monitorare Prezzi

1. Vai su "Prezzi"
2. Seleziona la piattaforma preferita
3. Clicca "Registra Prezzi Collezione" periodicamente
4. Visualizza trend e grafici storici

### 5. Gestire la Wishlist

1. Vai su "Cerca Carte" e cerca una carta
2. Clicca "⭐ Wishlist" per aggiungerla
3. Imposta prezzo massimo e priorità
4. Vai su "Wishlist" per visualizzare le carte
5. Clicca "Mostra Acquistabili" per vedere carte sotto il prezzo target

### 6. Tracciare il Budget

1. Vai su "Budget"
2. Clicca "+ Aggiungi Transazione" per registrare acquisti/vendite
3. Visualizza grafici spese per mese
4. Clicca "Crea Snapshot" per salvare il valore attuale della collezione
5. Monitora l'andamento del valore nel tempo

### 7. Analizzare i Mazzi

1. Apri un mazzo e clicca "📊 Statistiche & Playtest"
2. Visualizza curva di mana, distribuzione colori e tipi
3. Leggi suggerimenti e problemi rilevati
4. Usa il Playtest Simulator per simulare mani iniziali
5. Testa il mazzo con mulligan

## Funzionalità Future

- 🔲 Wrapper Electron per app desktop nativa
- 🔲 Import collezione da CSV/JSON
- 🔲 Compatibilità con altri formati di esportazione (Archidekt, Moxfield)
- 🔲 Scansione carte con fotocamera
- 🔲 Notifiche push per alert prezzi
- 🔲 Condivisione mazzi con link pubblici
- 🔲 Commander legality checker
- 🔲 Deck recommendations basate su archetipi

## Licenza

MIT

## Contributi

Contributi benvenuti! Apri una issue o una pull request.

## Note

- I prezzi sono forniti da Scryfall e potrebbero non essere aggiornati in tempo reale
- Si consiglia di registrare i prezzi regolarmente per costruire uno storico affidabile
- Rispetta i rate limit dell'API Scryfall (max ~10 richieste/secondo)
