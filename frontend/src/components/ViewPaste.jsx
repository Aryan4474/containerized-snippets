import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clipboard, Check, Database, Zap, Clock, Eye, FileText, ArrowLeft, Trash2, Flame, QrCode, Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

export default function ViewPaste({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paste, setPaste] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [source, setSource] = useState('database'); // cache or database
  const [language, setLanguage] = useState('javascript');
  const [showDelete, setShowDelete] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const codeRef = useRef(null);
  const qrCanvasRef = useRef(null);

  // Fetch paste details on mount or ID change
  useEffect(() => {
    const token = localStorage.getItem(`delete_token_${id}`);
    setShowDelete(!!token);

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

        if (result.data && result.data.language) {
          setLanguage(result.data.language);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaste();
  }, [id]);

  // Dynamically render QR Code canvas when modal is opened
  useEffect(() => {
    if (showQr && qrCanvasRef.current) {
      const shareUrl = window.location.href;
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 200,
          margin: 3,
          color: {
            dark: '#818cf8',  // Indigo accent color
            light: '#0f172a', // Slate-900 background
          },
        },
        (error) => {
          if (error) {
            console.error('Failed to generate QR code:', error);
            showToast('Failed to generate QR code', 'error');
          }
        }
      );
    }
  }, [showQr, showToast]);

  const downloadQrCode = () => {
    if (!qrCanvasRef.current) return;
    try {
      const canvas = qrCanvasRef.current;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `paste-${id}-qrcode.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('QR Code downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to download QR code:', err);
      showToast('Failed to download QR code', 'error');
    }
  };

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

  const copyLinkToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      showToast('Copied share link to clipboard!', 'success');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy share link', 'error');
    }
  };

  const handleDeleteClick = () => {
    setConfirmingDelete(true);
  };

  const confirmDelete = async () => {
    const token = localStorage.getItem(`delete_token_${id}`);
    if (!token) {
      showToast('No deletion token found for this paste.', 'error');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/pastes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-delete-token': token,
        }
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete paste');
      }

      showToast('Paste deleted successfully!', 'success');
      localStorage.removeItem(`delete_token_${id}`);
      setConfirmingDelete(false);
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
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
      {/* Burn on Read Warning */}
      {paste.burnOnRead && (
        <div style={styles.burnWarning}>
          <Flame size={18} style={{ marginRight: '8px', flexShrink: 0 }} color="hsl(15, 90%, 60%)" />
          <span><strong>One-Time View (Burn on Read):</strong> This snippet has been destroyed in the database. Copy the code now; it will not be accessible upon refreshing or closing this tab!</span>
        </div>
      )}

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

          {/* Actions wrapper */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* QR Code Button */}
            <button onClick={() => setShowQr(true)} style={styles.qrBtn} title="Generate QR Code for this paste">
              <QrCode size={14} style={{ marginRight: '6px' }} />
              QR Code
            </button>

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

            {/* Delete Button (Creator-only) */}
            {showDelete && (
              <button onClick={handleDeleteClick} style={styles.deleteBtn}>
                <Trash2 size={14} style={{ marginRight: '6px' }} />
                Delete Snippet
              </button>
            )}
          </div>
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

      {/* Share Link Panel */}
      <div style={styles.sharePanel}>
        <div style={styles.shareTitle}>
          <Share2 size={14} style={{ marginRight: '6px' }} />
          Share Link
        </div>
        <div style={styles.shareContainer}>
          <input 
            type="text" 
            readOnly 
            value={window.location.href} 
            style={styles.shareInput}
            onClick={(e) => e.target.select()}
            title="Click to select all"
          />
          <button onClick={copyLinkToClipboard} style={styles.shareCopyBtn}>
            {linkCopied ? (
              <>
                <Check size={14} style={{ marginRight: '6px' }} color="hsl(142, 71%, 45%)" />
                Copied!
              </>
            ) : (
              <>
                <Clipboard size={14} style={{ marginRight: '6px' }} />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      {confirmingDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Delete this snippet?</h3>
            <p style={styles.modalText}>
              This action is permanent and will completely delete the paste from MongoDB and Redis cache. Visitors will no longer be able to access this page. This cannot be undone.
            </p>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setConfirmingDelete(false)} 
                style={styles.cancelBtn}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                style={styles.confirmDeleteBtn} 
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Snippet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal Overlay */}
      {showQr && (
        <div style={styles.modalOverlay} onClick={() => setShowQr(false)}>
          <div 
            className="qr-modal-card" 
            style={styles.qrCard} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.qrHeader}>
              <h3 style={styles.modalTitle}>Scan to View Paste</h3>
              <p style={styles.qrSubtitle}>Share this snippet instantly with mobile devices</p>
            </div>
            
            <div style={styles.qrCanvasWrapper}>
              <canvas ref={qrCanvasRef} style={styles.qrCanvas}></canvas>
            </div>

            <div style={styles.qrUrlContainer} title={window.location.href}>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.qrUrlLink}
              >
                {window.location.href}
              </a>
            </div>

            <div style={styles.modalActions}>
              <button 
                onClick={downloadQrCode} 
                style={styles.downloadBtn}
              >
                <Download size={14} style={{ marginRight: '6px' }} />
                Download PNG
              </button>
              <button 
                onClick={() => setShowQr(false)} 
                style={styles.closeBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.825rem',
    fontWeight: 500,
    color: 'hsl(0, 84%, 75%)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  burnWarning: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    border: '1px solid rgba(249, 115, 22, 0.3)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '2rem',
    color: 'hsl(20, 90%, 75%)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '440px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: '0.75rem',
  },
  modalText: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  confirmDeleteBtn: {
    backgroundColor: 'hsl(0, 84%, 60%)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
  },
  qrBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '6px',
    padding: '0.375rem 0.75rem',
    fontSize: '0.825rem',
    fontWeight: 500,
    color: 'hsl(239, 84%, 75%)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qrCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '2.5rem 2rem',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  },
  qrHeader: {
    marginBottom: '1.5rem',
  },
  qrSubtitle: {
    fontSize: '0.875rem',
    color: 'hsl(215, 20%, 65%)',
    marginTop: '0.25rem',
  },
  qrCanvasWrapper: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.25rem',
    borderRadius: '16px',
    backgroundColor: '#0f172a',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.1)',
    position: 'relative',
    marginBottom: '1.5rem',
  },
  qrCanvas: {
    display: 'block',
    borderRadius: '8px',
  },
  qrUrlContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '0.625rem 1rem',
    marginBottom: '1.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  qrUrlText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'hsl(215, 20%, 55%)',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(263, 90%, 62%) 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
  },
  closeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  qrUrlLink: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    color: 'hsl(239, 84%, 75%)',
    textDecoration: 'underline',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  sharePanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '1.25rem',
    marginTop: '1.5rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
  },
  shareTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'hsl(215, 20%, 65%)',
    marginBottom: '0.75rem',
  },
  shareContainer: {
    display: 'flex',
    gap: '0.75rem',
  },
  shareInput: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.825rem',
    color: '#f8fafc',
    outline: 'none',
    cursor: 'pointer',
  },
  shareCopyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'hsl(239, 84%, 75%)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  }
};
