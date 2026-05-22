import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="hsl(142, 71%, 45%)" />;
      case 'error':
        return <AlertCircle size={18} color="hsl(0, 84%, 60%)" />;
      default:
        return <Info size={18} color="hsl(239, 84%, 67%)" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.2)';
      case 'error':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(99, 102, 241, 0.2)';
    }
  };

  return (
    <div style={{ ...styles.toast, borderColor: getBorderColor() }} className="animate-slide-in">
      <div style={styles.content}>
        {getIcon()}
        <span style={styles.message}>{message}</span>
      </div>
      <button onClick={onClose} style={styles.closeBtn}>
        <X size={14} />
      </button>
    </div>
  );
}

const styles = {
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderRadius: '12px',
    padding: '0.875rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.5rem',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    zIndex: 1000,
    maxWidth: '380px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  message: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#f8fafc',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(215, 20%, 65%)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    ':hover': {
      color: '#fff',
      background: 'rgba(255, 255, 255, 0.05)',
    }
  }
};
