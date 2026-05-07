'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import {
  Clock,
  FileText,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import Chatbot from './Chatbot';

export default function LandingPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  import { redirect } from 'next/navigation';

  export default function HomePage() {
    redirect('/login');
  }
            style={{ display: 'none' }}
            id="desktop-login"
          >
            Log In
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => router.push('/signup')}
            style={{ display: 'none' }}
            id="desktop-signup"
          >
            Get Started <ArrowRight size={16} />
          </button>
          <style>{`
            @media (min-width: 768px) {
              #desktop-login, #desktop-signup, .nav-scroll-link { display: inline-flex !important; }
              #mobile-menu-btn { display: none !important; }
            }
          `}</style>
          <button
            id="mobile-menu-btn"
            className="btn btn-ghost btn-icon"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div style={{
          position: 'fixed',
          top: 72,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'rgba(15,23,42,0.98)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'slideDown 200ms ease',
        }}>
          <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <button className="btn btn-ghost" onClick={() => scrollTo('features')} style={{ width: '100%', justifyContent: 'flex-start' }}>
            Features
          </button>
          <button className="btn btn-ghost" onClick={() => scrollTo('how-it-works')} style={{ width: '100%', justifyContent: 'flex-start' }}>
            How It Works
          </button>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
          <button className="btn btn-secondary" onClick={() => { router.push('/login'); setMobileMenu(false); }} style={{ width: '100%' }}>
            Log In
          </button>
          <button className="btn btn-primary" onClick={() => { router.push('/signup'); setMobileMenu(false); }} style={{ width: '100%' }}>
            Get Started
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero-section" className="grid-pattern section-padding" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        paddingBottom: 80,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background Glows */}
        <div className="hero-glow" style={{ background: '#10b981', top: '10%', left: '15%' }} />
        <div className="hero-glow" style={{ background: '#14b8a6', bottom: '10%', right: '10%', width: 400, height: 400 }} />
        <div className="hero-glow" style={{ background: '#84cc16', top: '40%', right: '30%', width: 300, height: 300, opacity: 0.1 }} />

        <div style={{ textAlign: 'center', maxWidth: 800, position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
            marginBottom: 32,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--primary-300)',
          }}>
            <Sparkles size={14} />
            OJT Management Reimagined
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            marginBottom: 24,
            color: 'white',
          }}>
            Your Internship,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 6s ease infinite',
            }}>
              Automated
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--slate-400)',
            maxWidth: 560,
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}>
            Log daily activities, generate formatted weekly reports, and track
            real-time progress toward your hour requirements — all in one beautiful platform.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg animate-pulse-glow"
              onClick={() => router.push('/signup')}
              id="hero-get-started"
            >
              Get Started Free <ArrowRight size={20} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              id="hero-learn-more"
            >
              Learn More
            </button>
          </div>

          {/* Trust indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            marginTop: 48,
            flexWrap: 'wrap',
          }}>
            {[
              { icon: <Shield size={16} />, text: 'Secure & Private' },
              { icon: <Zap size={16} />, text: 'Instant Setup' },
              { icon: <CheckCircle2 size={16} />, text: 'No Credit Card Required' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--slate-500)',
              }}>
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding" style={{
        paddingTop: 100,
        paddingBottom: 100,
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span className="badge badge-primary" style={{ marginBottom: 16, display: 'inline-block' }}>
            Features
          </span>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}>
            Everything You Need to{' '}
            <span style={{ color: 'var(--primary-400)' }}>Succeed</span>
          </h2>
          <p style={{ color: 'var(--slate-400)', maxWidth: 500, margin: '0 auto', fontSize: 16 }}>
            Built specifically for interns who want to stay on top of their OJT hours and reporting.
          </p>
        </div>

        <div className="features-grid" style={{
          display: 'grid',
          gap: 24,
        }}>
          {features.map((feature, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: 32,
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: feature.color,
                filter: 'blur(60px)',
                opacity: 0.08,
              }} />
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `${feature.color}15`,
                border: `1px solid ${feature.color}25`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: feature.color,
                marginBottom: 20,
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'white' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--slate-400)', lineHeight: 1.7 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="section-padding" style={{
        paddingTop: 100,
        paddingBottom: 100,
        background: 'rgba(15,23,42,0.5)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="badge badge-primary" style={{ marginBottom: 16, display: 'inline-block' }}>
              How It Works
            </span>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}>
              Three Simple Steps
            </h2>
          </div>

          <div className="steps-grid" style={{
            display: 'grid',
            gap: 32,
          }}>
            {steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
              }}>
                <div style={{
                  minWidth: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'white',
                  flexShrink: 0,
                }}>
                  {step.number}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: 'white' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--slate-400)', lineHeight: 1.7 }}>
                    {step.description}
                  </p>
                  {i < steps.length - 1 && (
                    <ChevronRight
                      size={20}
                      style={{
                        color: 'var(--primary-400)',
                        marginTop: 12,
                        display: 'none',
                      }}
                      className="step-arrow"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="section-padding" style={{
        paddingTop: 100,
        paddingBottom: 100,
        textAlign: 'center',
      }}>
        <div className="cta-card" style={{
          maxWidth: 600,
          margin: '0 auto',
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div className="hero-glow" style={{
            background: '#10b981',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 400,
            height: 200,
            opacity: 0.12,
          }} />
          <h2 style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 12,
            position: 'relative',
          }}>
            Ready to Get Started?
          </h2>
          <p style={{
            color: 'var(--slate-400)',
            fontSize: 16,
            marginBottom: 32,
            position: 'relative',
          }}>
            Join Internly today and never worry about tracking hours or writing reports again.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push('/signup')}
            style={{ position: 'relative' }}
            id="cta-get-started"
          >
            Create Your Account <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding" style={{
        paddingTop: 40,
        paddingBottom: 20,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle glow */}
        <div className="hero-glow" style={{
          background: '#10b981',
          bottom: '-60%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          height: 250,
          opacity: 0.06,
        }} />

        {/* Top section: columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 28,
          marginBottom: 28,
          position: 'relative',
        }} id="footer-grid">
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 15,
                color: 'white',
              }}>I</div>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>Internly</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.6, maxWidth: 280, marginBottom: 14 }}>
              A comprehensive web-based on-the-job training management system. Track hours, log activities, and generate reports effortlessly.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'GitHub', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                )},
                { label: 'Twitter', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                )},
                { label: 'LinkedIn', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                )},
              ].map((social) => (
                <button
                  key={social.label}
                  title={social.label}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--slate-500)',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.color = 'var(--primary-400)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--slate-500)'; }}
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Product column */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Features', action: () => scrollTo('features') },
                { label: 'How It Works', action: () => scrollTo('how-it-works') },
                { label: 'Get Started', action: () => router.push('/signup') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    fontSize: 13,
                    color: 'var(--slate-500)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    transition: 'color 200ms, transform 200ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate-200)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--slate-500)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legal column */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['Privacy', 'Terms'] as const).map((link) => (
                <button
                  key={link}
                  onClick={() => setFooterModal(link)}
                  style={{
                    fontSize: 13,
                    color: 'var(--slate-500)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    transition: 'color 200ms, transform 200ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate-200)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--slate-500)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                  {link === 'Privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </button>
              ))}
            </div>
          </div>

          {/* Support column */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => setFooterModal('Contact')}
                style={{
                  fontSize: 13,
                  color: 'var(--slate-500)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  transition: 'color 200ms, transform 200ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate-200)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--slate-500)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                Contact Us
              </button>
              <button
                onClick={() => scrollTo('hero-section')}
                style={{
                  fontSize: 13,
                  color: 'var(--slate-500)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  transition: 'color 200ms, transform 200ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--slate-200)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--slate-500)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                Back to Top
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            #footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          }
          @media (max-width: 480px) {
            #footer-grid { grid-template-columns: 1fr !important; gap: 20px !important; text-align: center; }
            #footer-grid > div { align-items: center; }
            #footer-grid > div > div:has(button[title]) { justify-content: center; }
          }
        `}</style>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)',
          marginBottom: 16,
          position: 'relative',
        }} />

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          position: 'relative',
        }} id="footer-bottom">
          <p style={{ fontSize: 12, color: 'var(--slate-600)' }}>
            © 2026 Internly. All rights reserved.
          </p>
          <p style={{ fontSize: 11, color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: 5 }}>
            Made with
            <span style={{ color: '#ef4444', fontSize: 13, lineHeight: 1 }}>♥</span>
            in the Philippines
          </p>
        </div>
        <style>{`
          @media (max-width: 480px) {
            #footer-bottom { justify-content: center !important; text-align: center; }
          }
        `}</style>
      </footer>

      {/* Footer Modal */}
      {footerModal && (
        <div
          onClick={() => setFooterModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 200ms ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--slate-900)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 520,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              animation: 'slideUp 250ms ease',
            }}
          >
            <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <button
              onClick={() => setFooterModal(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--slate-400)',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'white' }}>
              {footerModal === 'Privacy' && 'Privacy Policy'}
              {footerModal === 'Terms' && 'Terms of Service'}
              {footerModal === 'Contact' && 'Contact Us'}
            </h3>

            <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--slate-400)' }}>
              {footerModal === 'Privacy' && (
                <>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Effective Date:</strong> January 1, 2026</p>
                  <p style={{ marginBottom: 12 }}>Internly is committed to protecting your privacy. All data you enter — including daily logs, hour records, and personal information — is stored locally on your device using browser storage.</p>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Data Collection:</strong> We do not collect, transmit, or store your data on any external server. Everything stays on your browser.</p>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Cookies:</strong> Internly does not use tracking cookies or third-party analytics.</p>
                  <p><strong style={{ color: 'var(--slate-200)' }}>Your Control:</strong> You can delete all your data at any time by clearing your browser&apos;s local storage.</p>
                </>
              )}

              {footerModal === 'Terms' && (
                <>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>Effective Date:</strong> January 1, 2026</p>
                  <p style={{ marginBottom: 12 }}>By using Internly, you agree to the following terms:</p>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>1. Purpose:</strong> Internly is a web-based tool designed to help on-the-job training participants track hours, log activities, and generate weekly reports.</p>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>2. Data Responsibility:</strong> All data is stored locally. You are responsible for maintaining and backing up your records.</p>
                  <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--slate-200)' }}>3. No Warranty:</strong> Internly is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for data loss resulting from browser resets or device changes.</p>
                  <p><strong style={{ color: 'var(--slate-200)' }}>4. Modifications:</strong> We reserve the right to update these terms at any time. Continued use of the app constitutes acceptance of any changes.</p>
                </>
              )}

              {footerModal === 'Contact' && (
                <>
                  <p style={{ marginBottom: 16 }}>Have questions, feedback, or need support? We&apos;d love to hear from you.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: 'rgba(16,185,129,0.06)',
                      borderRadius: 12,
                      border: '1px solid rgba(16,185,129,0.12)',
                    }}>
                      <span style={{ fontSize: 20 }}>✉️</span>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 2 }}>Email</div>
                        <div style={{ color: 'var(--slate-200)', fontWeight: 500 }}>support@internly.app</div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: 'rgba(6,182,212,0.06)',
                      borderRadius: 12,
                      border: '1px solid rgba(6,182,212,0.12)',
                    }}>
                      <span style={{ fontSize: 20 }}>🌐</span>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 2 }}>Website</div>
                        <div style={{ color: 'var(--slate-200)', fontWeight: 500 }}>www.internly.app</div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: 'rgba(16,185,129,0.06)',
                      borderRadius: 12,
                      border: '1px solid rgba(16,185,129,0.12)',
                    }}>
                      <span style={{ fontSize: 20 }}>📍</span>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--slate-500)', marginBottom: 2 }}>Location</div>
                        <div style={{ color: 'var(--slate-200)', fontWeight: 500 }}>Philippines</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <Chatbot />
    </div>
  );
}
