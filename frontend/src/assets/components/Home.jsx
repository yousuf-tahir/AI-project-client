import React from 'react';
import NavBar from './Navbar';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles/Home.css'

const Home = () => {
  return (
    <>
    <NavBar/>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Smart AI Interview System</h1>
              <p className="subtitle">Transform Your Hiring Process with AI</p>
              <p className="description">
                Automate interviews, evaluate candidates, and make data-driven hiring decisions
              </p>
              <div className="hero-buttons">
                <button className="cta-button primary">Start System</button>
                <button className="cta-button secondary">Explore System</button>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-number">50%</div>
                  <div className="stat-label">Time Reduction</div>
                </div>
                <div className="stat">
                  <div className="stat-number">95%</div>
                  <div className="stat-label">Accuracy Rate</div>
                </div>
                <div className="stat">
                  <div className="stat-number">1000+</div>
                  <div className="stat-label">Companies Served</div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=870&q=80"
              alt="AI Interview System in Action"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <div className="container">
          <div className="about-content">
            <h2>Transform Your Hiring Process with Smart AI Interview System</h2>
            <div className="about-stats">
              <div className="stat-card">
                <div className="stat-number">50%</div>
                <div className="stat-label">Time Reduction</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">95%</div>
                <div className="stat-label">Accuracy Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Companies Served</div>
              </div>
            </div>
            <p className="about-description">
              Smart AI Interview Bot combines cutting-edge AI technology with intuitive user
              experience to streamline your hiring process. Our platform helps both HR professionals
              and candidates by automating interviews, providing real-time feedback, and ensuring
              unbiased evaluation.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Smart Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-robot"></i>
              </div>
              <h3>AI-Powered Interviews</h3>
              <p>Automated interviews with intelligent question generation</p>
              <ul className="feature-bullets">
                <li>Smart question generation</li>
                <li>Context-aware responses</li>
                <li>Real-time analysis</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Intelligent Scoring</h3>
              <p>Advanced evaluation using multiple AI models</p>
              <ul className="feature-bullets">
                <li>OpenAI GPT integration</li>
                <li>Speech-to-text analysis</li>
                <li>Comprehensive scoring</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-user-shield"></i>
              </div>
              <h3>Enterprise Security</h3>
              <p>Bank-grade security for your data</p>
              <ul className="feature-bullets">
                <li>End-to-end encryption</li>
                <li>Compliance certified</li>
                <li>Regular audits</li>
              </ul>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>Time-Saving</h3>
              <p>Reduce interview time by 50%</p>
              <ul className="feature-bullets">
                <li>Automated scheduling</li>
                <li>Instant feedback</li>
                <li>Easy candidate management</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="how-it-works-content">
            <div className="step-wrapper">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-icon">
                  <i className="fas fa-microphone"></i>
                </div>
                <div className="step-content">
                  <h3>Start Interview</h3>
                  <p>Begin the interview with voice or text input</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-icon">
                  <i className="fas fa-robot"></i>
                </div>
                <div className="step-content">
                  <h3>AI Evaluation</h3>
                  <p>Real-time analysis using AI algorithms</p>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="step-content">
                  <h3>Get Results</h3>
                  <p>Instant feedback and scoring report</p>
                  <p>HR reviews candidate scores and schedules next interviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="container">
          <div className="benefits-grid">
            <div className="benefit-card">
              <h2>For HR Professionals</h2>
              <ul>
                <li><i className="fas fa-check"></i> Automated interview scheduling</li>
                <li><i className="fas fa-check"></i> Real-time candidate scoring</li>
                <li><i className="fas fa-check"></i> Comprehensive analytics dashboard</li>
                <li><i className="fas fa-check"></i> Secure candidate management</li>
              </ul>
            </div>
            <div className="benefit-card">
              <h2>For Candidates</h2>
              <ul>
                <li><i className="fas fa-check"></i> Mock interview practice</li>
                <li><i className="fas fa-check"></i> Instant feedback on performance</li>
                <li><i className="fas fa-check"></i> Personalized improvement suggestions</li>
                <li><i className="fas fa-check"></i> Secure interview platform</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Hiring Process?</h2>
            <p>Join the thousands of companies already using AI to streamline their hiring</p>
            <div className="cta-buttons">
              <button className="cta-button primary">Get Started Now</button>
              <button className="cta-button secondary">System Demo</button>
            </div>
            <div className="trust-badges">
              <img src="https://via.placeholder.com/100x30" alt="Trusted by Fortune 500" />
              <img src="https://via.placeholder.com/100x30" alt="AI Excellence Award" />
              <img src="https://via.placeholder.com/100x30" alt="HR Tech Leader" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;