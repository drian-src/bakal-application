import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { Logo, Button } from '../shared';
import './LandingPage.css';

const LandingPage = () => {
  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8a3 3 0 0 0-3 3"/>
        </svg>
      ),
      title: 'Intelligent Search',
      description: 'AI-powered search that finds the best matches across multiple Filipino marketplaces in seconds.'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/>
        </svg>
      ),
      title: 'Personalized Recommendations',
      description: 'Relevant product picks based on your taste, past buys, and budget — helping you decide faster.'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <circle cx="12" cy="14" r="2"/>
        </svg>
      ),
      title: 'Unified Cross-Platform Search',
      description: 'Compare prices, reviews, and stock across PCExpress, VillMan, and PCWorx seamlessly.'
    }
  ];

  return (
    <MainLayout>
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="navbar-container">
          <div className="navbar-logo-section">
            <Logo size="xlarge" />
          </div>
          <div className="navbar-actions">
            <Link to="/login">
              <Button variant="primary" size="medium">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title animate-slideUp">
                Your Smart Shopping
                <span className="hero-title-highlight"> Assistant</span>
              </h1>
              <p className="hero-description animate-slideUp stagger-1">
                Bakàl uses AI to help you discover, compare, and find the best electronics across leading online stores.
              </p>
              {/* hero CTAs removed to avoid repetition with navbar actions */}
            </div>
            
            <div className="hero-image animate-slideInRight">
              <div className="platforms-showcase-hero">
                <div className="showcase-container">
                  {/* PCExpress */}
                  <div className="platform-card-hero pcexpress">
                    <div className="platform-header-hero">
                      <img src="https://pcx.com.ph/cdn/shop/articles/PCX-Branches-Square_1ab4c7b1-b18e-42d6-8f4e-c1dd65aa0664.jpg?v=1738804652&width=1000" alt="PCExpress" className="platform-icon-hero" />
                    </div>
                    <div className="platform-info-hero">
                      <h3>PCExpress</h3>
                      <div className="platform-feature">Top Electronics Store</div>
                    </div>
                  </div>

                  {/* VillMan */}
                  <div className="platform-card-hero villman">
                    <div className="platform-header-hero">
                      <img src="https://villman.com/favicon.png" alt="VillMan" className="platform-icon-hero" />
                    </div>
                    <div className="platform-info-hero">
                      <h3>VillMan</h3>
                      <div className="platform-feature">Trusted & Verified</div>
                    </div>
                  </div>

                  {/* PCWorx */}
                  <div className="platform-card-hero pcworx">
                    <div className="platform-header-hero">
                      <img src="https://pbs.twimg.com/profile_images/1351362241098989568/AiM-A331_400x400.jpg" alt="PCWorx" className="platform-icon-hero" />
                    </div>
                    <div className="platform-info-hero">
                      <h3>PCWorx</h3>
                      <div className="platform-feature">Quality & Value</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="features-header">
            <h2 className="features-title">Why choose Bakàl?</h2>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card animate-slideUp stagger-${index + 1}`}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section 
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to shop smarter?</h2>
            <p className="cta-description">
              Join thousands of Filipino shoppers who save time and money with Bakàl
            </p>
            <Link to="/login">
              <Button variant="secondary" size="large">
                Sign In with Google
              </Button>
            </Link>
          </div>
        </div>
      </section>
      */}

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-bottom">
              <p className="footer-copyright">
                © 2024 Bakàl. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </MainLayout>
  );
};

export default LandingPage;