import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Collection from './pages/Collection'
import Decks from './pages/Decks'
import DeckDetail from './pages/DeckDetail'
import DeckStats from './pages/DeckStats'
import Search from './pages/Search'
import Prices from './pages/Prices'
import Wishlist from './pages/Wishlist'
import Budget from './pages/Budget'
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
            <li><Link to="/wishlist" className={location.pathname === '/wishlist' ? 'active' : ''}>Wishlist</Link></li>
            <li><Link to="/decks" className={location.pathname.startsWith('/decks') ? 'active' : ''}>Mazzi</Link></li>
            <li><Link to="/search" className={location.pathname === '/search' ? 'active' : ''}>Cerca</Link></li>
            <li><Link to="/prices" className={location.pathname === '/prices' ? 'active' : ''}>Prezzi</Link></li>
            <li><Link to="/budget" className={location.pathname === '/budget' ? 'active' : ''}>Budget</Link></li>
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
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/decks/:id" element={<DeckDetail />} />
          <Route path="/decks/:id/stats" element={<DeckStats />} />
          <Route path="/search" element={<Search />} />
          <Route path="/prices" element={<Prices />} />
          <Route path="/budget" element={<Budget />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
