import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import DailyEntry from "./components/DailyEntry";
import WeeklyTargets from "./components/WeeklyTargets";
import Reminders from "./components/Reminders";
import Dashboard from "./components/Dashboard";
import Analytics from "./components/Analytics";
import Settings from "./components/Settings";
import WeeklyProgress from "./components/WeeklyProgress";
import Login from "./components/Login";
import { supabase } from "./services/supabase";

function Navigation({ onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    return 'ZenTrackr';
  };

  const menuItems = [
    { path: '/', label: '📊 Dashboard' },
    { path: '/daily', label: '📝 Track Today' },
    { path: '/analytics', label: '📈 Analytics' },
    { path: '/weekly-progress', label: '📊 Weekly Progress' },
    { path: '/reminders', label: '⏰ Reminders' },
    { path: '/targets', label: '🎯 Target Setter' },
    { path: '/settings', label: '⚙️ Settings' }
  ];

  return (
    <>
      <nav className="mobile-nav">
        <div className="nav-header">
          <Link to="/" style={{textDecoration: 'none', color: 'inherit'}}>
            <h1 className="nav-title">{getPageTitle()}</h1>
          </Link>
          <button 
            className={`menu-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
      
      <div className={`menu-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      
      <div className={`mobile-menu ${isMenuOpen ? 'active' : ''}`}>
        <div className="menu-header">
          <Link to="/" style={{textDecoration: 'none', color: 'inherit'}} onClick={() => setIsMenuOpen(false)}>
            <h2>ZenTrackr</h2>
          </Link>
        </div>
        <div className="menu-items">
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button 
            className="menu-item" 
            onClick={onLogout}
            style={{color: '#ef4444', border: 'none', background: 'none', textAlign: 'left'}}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('userEmail');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <Navigation onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/daily" element={<DailyEntry />} />
          <Route path="/targets" element={<WeeklyTargets />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/weekly-progress" element={<WeeklyProgress />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
