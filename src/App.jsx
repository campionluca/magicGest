import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Collection from './pages/Collection'
import Decks from './pages/Decks'
import DeckDetail from './pages/DeckDetail'
import Search from './pages/Search'
import Prices from './pages/Prices'
import './App.css'

function Navigation() {
  const location = useLocation()

  return (
    <nav className="nav">
      <div className="container">
        <div className="header">
          <h1>🃏 MagicGest</h1>
          <ul>
            <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>Collezione</Link></li>
            <li><Link to="/decks" className={location.pathname.startsWith('/decks') ? 'active' : ''}>Mazzi</Link></li>
            <li><Link to="/search" className={location.pathname === '/search' ? 'active' : ''}>Cerca Carte</Link></li>
            <li><Link to="/prices" className={location.pathname === '/prices' ? 'active' : ''}>Prezzi</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <Navigation />
      <div className="container">
        <Routes>
          <Route path="/" element={<Collection />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/decks/:id" element={<DeckDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/prices" element={<Prices />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
