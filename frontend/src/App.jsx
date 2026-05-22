import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CreatePaste from './components/CreatePaste';
import ViewPaste from './components/ViewPaste';
import Toast from './components/Toast';

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  return (
    <BrowserRouter>
      <div style={styles.app}>
        <Navbar />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<CreatePaste showToast={showToast} />} />
            <Route path="/paste/:id" element={<ViewPaste showToast={showToast} />} />
          </Routes>
        </main>
        
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </div>
    </BrowserRouter>
  );
}

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    width: '100%',
  }
};
