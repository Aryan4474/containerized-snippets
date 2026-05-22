import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clipboard, Check, Database, Zap, Clock, Eye, FileText, ArrowLeft } from 'lucide-react';

export default function ViewPaste({ showToast }) {
  const { id } = useParams();
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState('database'); // cache or database
  const [language, setLanguage] = useState('javascript');
  const codeRef = useRef(null);

  // Fetch paste details on mount or ID change
  useEffect(() => {
    const fetchPaste = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/pastes/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to retrieve paste');
        }

        setPaste(result.data);
        setSource(result.source || 'database');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaste();
  }, [id]);

  // Re-run syntax highlighting whenever paste content or selected language changes
  useEffect(() => {
    if (paste && window.Prism) {
      setTimeout(() => {
        window.Prism.highlightAll();
      }, 50);
    }
  }, [paste, language]);

  const copyToClipboard = async () => {
    if (!paste) return;
    try {
      await navigator.clipboard.writeText(paste.content);
      setCopied(true);
      showToast('Copied code to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy code', 'error');
    }
  };

  const formatExpiry = (expiryStr) => {
    if (!expiryStr) return 'Never';
    const diffMs = new Date(expiryStr) - new Date();
    if (diffMs < 0) return 'Expired';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Expires in ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Expires in ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Expires in ${diffDays}d`;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: 'hsl(215, 20%, 65%)' }}>Fetching snippet details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorCard}>
          <h2 style={{ color: 'hsl(0, 84%, 60%)', marginBottom: '0.75rem' }}>Paste Not Found</h2>
          <p style={{ color: 'hsl(215, 20%, 65%)', marginBottom: '1.5rem' }}>
            {error === 'Paste not found' 
              ? 'This paste does not exist, or it has expired and was automatically deleted.' 
              : error}
          </p>
          <Link to="/" style={styles.backBtn}>
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            Create New Paste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Area */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{paste.title || 'Untitled Paste'}</h1>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>
              <Eye size={14} />
              {paste.views} {paste.views === 1 ? 'view' : 'views'}
            </span>
            <span style={styles.metaItem}>
              <Clock size={14} />
              {formatExpiry(paste.expiryAt)}
            </span>
            <span style={styles.metaItem}>
              <FileText size={14} />
              Created {new Date(paste.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Source Badge */}
        <div style={source === 'cache' ? styles.cacheBadge : styles.dbBadge}>
          {source === 'cache' ? (
            <>
              <Zap size={14} style={{ marginRight: '4px' }} />
              Redis Cache Hit
            </>
          ) : (
            <>
              <Database size={14} style={{ marginRight: '4px' }} />
              Database Miss
            </>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          {/* Language Selector */}
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={styles.langSelect}
          >
            <option value="javascript">JavaScript / JSON</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="c">C / C++</option>
            <option value="bash">Bash / Shell</option>
            <option value="plaintext">Plain Text</option>
          </select>

          {/* Copy Button */}
          <button onClick={copyToClipboard} style={styles.copyBtn}>
            {copied ? (
              <>
                <Check size={14} style={{ marginRight: '6px' }} color="hsl(142, 71%, 45%)" />
                Copied!
              </>
            ) : (
              <>
                <Clipboard size={14} style={{ marginRight: '6px' }} />
                Copy Snippet
              </>
            )}
          </button>
        </div>

        {/* Preformatted Code block */}
        <div style={styles.editorArea}>
          <pre className={`language-${language}`}>
            <code ref={codeRef} className={`language-${language}`}>
              {paste.content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '3rem auto',
    padding: '0 1.5rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.05)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    borderLeftColor: 'hsl(239, 84%, 67%)',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  errorCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    padding: '2.5rem',
    textAlign: 'center',
    maxWidth: '450px',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#f8fafc',
    textDecoration: 'none',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.025em',
    marginBottom: '0.5rem',
  },
  metaRow: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.825rem',
    color: 'hsl(215, 20%, 65%)',
  },
  cacheBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: 'hsl(239, 84%, 67%)',
    borderRadius: '9999px',
    padding: '0.375rem 0.875rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.1)',
  },
  dbBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(215, 20%, 65%, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'hsl(215, 20%, 65%)',
    borderRadius: '9999px',
    padding: '0.375rem 0.875rem',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  panel: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  panelHeader: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '0.75rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langSelect: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.825rem',
    color: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.825rem',
    fontWeight: 500,
    color: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  },
  editorArea: {
    padding: '1.25rem',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  }
};
