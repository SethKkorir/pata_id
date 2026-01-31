import React from 'react';
import { Link } from 'react-router-dom';
import Button, { SearchIcon, PlusIcon } from '../components/Button';
import './HomePage.css';

const HomePage = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="container hero-content">
          <h1 className="hero-title">
            Find Your ID <br />
            <span className="text-primary">With PataID</span>
          </h1>
          <p className="hero-subtitle">
            The secure platform for recovering lost student and staff identification cards across all campuses.
          </p>
          <div className="hero-buttons">
            <Link to="/search">
              <Button variant="primary" size="lg" icon={<SearchIcon />}>
                I Lost My ID
              </Button>
            </Link>
            <Link to="/report">
              <Button variant="outline-accent" size="lg" icon={<PlusIcon />}>
                I Found an ID
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="features-grid">
            <FeatureCard
              icon={<ShieldIcon />}
              title="Secure & Verified"
              description="All items are held securely by campus security until verified owners come forward."
              variant="primary"
            />
            <FeatureCard
              icon={<CommunityIcon />}
              title="Community Driven"
              description="Built for students and staff to help one another recover lost belongings."
              variant="accent"
            />
            <FeatureCard
              icon={<CheckIcon />}
              title="Quick Recovery"
              description="Search, find, and verify ownership in minutes rather than waiting days."
              variant="success"
            />
          </div>
        </div>
      </section>
    </>
  );
};

const FeatureCard = ({ icon, title, description, variant }) => {
  const variantClasses = {
    primary: 'feature-icon-primary',
    accent: 'feature-icon-accent',
    success: 'feature-icon-success'
  };

  return (
    <div className="feature-card">
      <div className={`feature-icon ${variantClasses[variant]}`}>
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
};

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </svg>
);

const CommunityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default HomePage;