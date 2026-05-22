import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Plus } from 'lucide-react';

export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.logoLink}>
          <div style={styles.logoContainer}>
            <div style={styles.iconBg}>
              <Terminal size={20} color="#fff" />
            </div>
            <span style={styles.logoText}>SnippetBin</span>
          </div>
        </Link>
        <Link to="/" style={styles.button}>
          <Plus size={16} style={{ marginRight: '4px' }} />
          New Paste
        </Link>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '0.875rem 1.5rem',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  iconBg: {
    background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(263, 90%, 62%) 100%)',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 700,
    background: 'linear-gradient(to right, #fff, hsl(215, 20%, 65%))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.025em',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#f8fafc',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    ':hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    }
  }
};
