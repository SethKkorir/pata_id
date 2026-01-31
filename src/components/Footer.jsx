import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <ShieldIcon />
              <span>PataID</span>
            </div>
            <p className="footer-description">
              Reconnecting your community by providing a secure platform to recover lost identification cards.
            </p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/search">Search Lost IDs</Link></li>
              <li><Link to="/report">Report Found ID</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h4>Contact</h4>
            <ul>
              <li>Main Office: +254 700 000 000</li>
              <li>Email: support@pataid.com</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 PataID. All rights reserved.</p>
          <p className="made-with">
            Made with <span className="heart">&#10084;</span> for the community
          </p>
        </div>
      </div>
    </footer>
  );
};

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

export default Footer;