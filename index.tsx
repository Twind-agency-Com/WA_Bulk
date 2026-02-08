import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const STARTUP_TIMEOUT_MS = 12000;

const StartupManager: React.FC = () => {
  const [error, setError] = useState<{ step: string; message: string; diagnostics?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const startupTimer = setTimeout(() => {
      if (isLoading) {
        setError({
          step: 'Bootstrapping',
          message: 'Il caricamento dell\'applicazione ha impiegato troppo tempo (Timeout 12s).',
          diagnostics: getDiagnostics()
        });
      }
    }, STARTUP_TIMEOUT_MS);

    const initApp = async () => {
      try {
        // Step 1: Diagnostica Variabili d'Ambiente
        const diagnostics = getDiagnostics();
        if (!diagnostics.API_KEY_PRESENT) {
          throw new Error("Mancante: API_KEY non configurata nelle impostazioni dell'ambiente.");
        }

        // Step 2: Tentativo di rendering
        setIsLoading(false);
        clearTimeout(startupTimer);
      } catch (err: any) {
        setError({
          step: 'Initialization',
          message: err.message || 'Errore sconosciuto durante l\'avvio.',
          diagnostics: getDiagnostics()
        });
        setIsLoading(false);
      }
    };

    initApp();
    return () => clearTimeout(startupTimer);
  }, []);

  const getDiagnostics = () => ({
    API_KEY_PRESENT: !!process.env.API_KEY,
    USER_AGENT: navigator.userAgent,
    TIMESTAMP: new Date().toISOString(),
    URL: window.location.href
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 text-center mb-2">Inizializzazione Fallita</h1>
          <p className="text-red-500 text-sm font-bold text-center mb-6">Fase: {error.step}</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <p className="text-xs text-gray-600 font-mono break-words">{error.message}</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
            >
              Riprova Caricamento
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(error, null, 2));
                alert('Diagnostica copiata negli appunti!');
              }}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-xs hover:bg-gray-200 transition-all"
            >
              Copia Info Debug
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-400 font-mono">
            <p>API_KEY: {error.diagnostics?.API_KEY_PRESENT ? '✅ PRESENTE' : '❌ MANCANTE'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366] mb-4"></div>
        <p className="text-gray-400 font-bold text-sm">Avvio di WhatsBulk Pro...</p>
      </div>
    );
  }

  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <StartupManager />
  </React.StrictMode>
);