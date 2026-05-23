import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, Clock, Send, ShieldAlert } from 'lucide-react';

export default function CreatePaste({ showToast }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
  const [language, setLanguage] = useState('plaintext');
  const [burnOnRead, setBurnOnRead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sizeInBytes, setSizeInBytes] = useState(0);
  const navigate = useNavigate();

  // Track content size in bytes
  useEffect(() => {
    const bytes = new Blob([content]).size;
    setSizeInBytes(bytes);
  }, [content]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast('Paste content cannot be empty', 'error');
      return;
    }

    if (sizeInBytes > 2 * 1024 * 1024) {
      showToast('Paste size exceeds 2 MB limit', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content,
          expiresIn,
          language,
          burnOnRead
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create paste');
      }

      // Store deletion token locally to permit creator-only deletion
      if (result.data && result.data.id && result.data.deleteToken) {
        localStorage.setItem(`delete_token_${result.data.id}`, result.data.deleteToken);
      }

      showToast('Paste created successfully!', 'success');
      navigate(`/paste/${result.data.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Share Code Snippets Instantly</h1>
        <p style={styles.subtitle}>
          Create and share clean, syntax-highlighted code snippets with Redis-cached speed.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.metaGrid}>
          <div style={styles.inputWrapper}>
            <label style={styles.label}>Paste Title</label>
            <div style={styles.inputContainer}>
              <FileCode size={16} color="hsl(215, 20%, 65%)" style={styles.fieldIcon} />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Paste"
                maxLength={100}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Expiration Time</label>
            <div style={styles.inputContainer}>
              <Clock size={16} color="hsl(215, 20%, 65%)" style={styles.fieldIcon} />
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                style={styles.select}
                disabled={burnOnRead}
              >
                {burnOnRead ? (
                  <option value="never">N/A (Managed by Burn-on-Read)</option>
                ) : (
                  <>
                    <option value="never">Never (Expires in 24h from cache)</option>
                    <option value="10m">10 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="1d">1 Day</option>
                    <option value="1w">1 Week</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div style={styles.inputWrapper}>
            <label style={styles.label}>Syntax Highlighting</label>
            <div style={styles.inputContainer}>
              <FileCode size={16} color="hsl(215, 20%, 65%)" style={styles.fieldIcon} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={styles.select}
              >
                <option value="plaintext">Plain Text</option>
                <option value="javascript">JavaScript / JSON</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="c">C / C++</option>
                <option value="bash">Bash / Shell</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.optionsRow}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={burnOnRead}
              onChange={(e) => {
                setBurnOnRead(e.target.checked);
                if (e.target.checked) {
                  setExpiresIn('never');
                }
              }}
              style={styles.checkbox}
            />
            <span style={{ 
              marginLeft: '8px', 
              color: burnOnRead ? 'hsl(343, 90%, 65%)' : 'hsl(215, 20%, 65%)', 
              transition: 'all 0.2s', 
              fontWeight: 500,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              🔥 Burn on Read (Automatically destroy immediately after first view)
            </span>
          </label>
        </div>

        <div style={styles.editorWrapper}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your code or text here..."
            style={styles.textarea}
            rows={15}
            required
          />
        </div>

        <div style={styles.footer}>
          <span style={styles.sizeIndicator}>
            Size: <strong style={{ color: sizeInBytes > 2 * 1024 * 1024 ? 'hsl(0, 84%, 60%)' : 'hsl(210, 40%, 98%)' }}>{formatSize(sizeInBytes)}</strong> / 2 MB max
          </span>
          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.submitBtn, opacity: 0.7, cursor: 'not-allowed' } : styles.submitBtn}
          >
            {loading ? 'Creating...' : 'Create Paste'}
            <Send size={16} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '3rem auto',
    padding: '0 1.5rem',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2.5rem',
  },
  title: {
    fontSize: '2.25rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #fff 0%, hsl(215, 20%, 65%) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.03em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'hsl(215, 20%, 65%)',
    maxWidth: '550px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'hsl(210, 40%, 98%)',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.75rem 1rem 0.75rem 2.25rem',
    fontSize: '0.9rem',
    color: '#f8fafc',
    outline: 'none',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: 'hsl(239, 84%, 67%)',
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
    }
  },
  select: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '0.75rem 1rem 0.75rem 2.25rem',
    fontSize: '0.9rem',
    color: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitAppearance: 'none',
    ':focus': {
      borderColor: 'hsl(239, 84%, 67%)',
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
    }
  },
  editorWrapper: {
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  textarea: {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#f8fafc',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    padding: '1.25rem',
    outline: 'none',
    resize: 'vertical',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  sizeIndicator: {
    fontSize: '0.825rem',
    color: 'hsl(215, 20%, 65%)',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(263, 90%, 62%) 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
    }
  },
  optionsRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  checkboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: 'hsl(343, 90%, 65%)',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  }
};
