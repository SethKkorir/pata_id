import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );

  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <ShieldIcon />
          </div>
          <div className="logo-text">
            <span className="logo-name">PataID</span>
            <span className="logo-tagline">LOST & FOUND</span>
          </div>
        </Link>
        
        <nav className="nav-desktop">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Lost IDs
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Found IDs
          </NavLink>
          <Link to="/report" className="btn btn-primary btn-sm">
            Report Found ID
          </Link>
        </nav>
        
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <MenuIcon />
        </button>
      </div>
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <NavLink to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          Home
        </NavLink>
        <NavLink to="/search" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          Lost IDs
        </NavLink>
        <NavLink to="/report" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
          Found IDs
        </NavLink>
        <Link to="/report" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={() => setMobileMenuOpen(false)}>
          Report Found ID
        </Link>
      </div>
    </header>
  );
};

export default Header;