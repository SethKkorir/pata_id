import React from 'react';

const UnauthorizedPage = () => (
  <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--accent)' }}>Access Denied</h1>
    <p style={{ fontSize: '1.125rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
      You don't have permission to access this page.
    </p>
    <a href="/" style={{
      display: 'inline-block',
      padding: '0.75rem 1.5rem',
      background: 'var(--primary)',
      color: 'white',
      borderRadius: 'var(--radius-lg)',
      textDecoration: 'none',
      fontWeight: '500'
    }}>
      Return Home
    </a>
  </div>
);

export default UnauthorizedPage;
