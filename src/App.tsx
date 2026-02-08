import React, { useState, useEffect, useRef } from 'react';
import { Campaign, CampaignStatus, Contact, TemplateCategory, ComplianceCheck, ApiConfig } from './types';
import { CampaignCard } from './components/CampaignCard';
import { ComplianceBadge } from './components/ComplianceBadge';
import { checkCompliance } from './services/geminiService';

const STORAGE_KEY_API = 'whatsbulk_api_config';
const STORAGE_KEY_CAMPAIGNS = 'whatsbulk_campaigns';
const STORAGE_KEY_CONTACTS = 'whatsbulk_contacts_v2'; // Versioned key for new schema
const STORAGE_KEY_AUTH = 'whatsbulk_is_authenticated';

const INITIAL_API_CONFIG: ApiConfig = {
  accessToken: '',
  phoneNumberId: '',
  wabaId: '',
  isConfigured: false
};

const INITIAL_CONTACTS: Contact[] = [
  { id: 'init-1', name: 'Mario Rossi', phone: '+393331234567', email: 'mario@esempio.it', optInDate: '2024-01-10', tags: ['vip'] },
  { id: 'init-2', name: 'Anna Verdi', phone: '+393339876543', email: 'anna@esempio.it', optInDate: '2024-02-15', tags: ['prospect'] },
];

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });
  
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'contacts' | 'settings'>('dashboard');
  
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_API);
    return saved ? JSON.parse(saved) : INITIAL_API_CONFIG;
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    return saved ? JSON.parse(saved) : [];
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : INITIAL_CONTACTS;
      } catch (e) {
        return INITIAL_CONTACTS;
      }
    }
    return INITIAL_CONTACTS;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    messageText: '',
    category: TemplateCategory.MARKETING
  });
  
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', tags: '' });
  const [complianceResult, setComplianceResult] = useState<ComplianceCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_API, JSON.stringify(apiConfig)); }, [apiConfig]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns)); }, [campaigns]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_AUTH, isAuthenticated.toString()); }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === 'Twind' && loginPassword === 'TW1234') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setLoginPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const isReady = !!(apiConfig.accessToken && apiConfig.phoneNumberId);
    setApiConfig({ ...apiConfig, isConfigured: isReady });
    alert(isReady ? "Configurazione salvata con successo!" : "Configurazione incompleta.");
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newContact.name.trim();
    let phone = newContact.phone.trim().replace(/[^\d+]/g, '');

    if (!name || !phone) {
      alert("Nome e Telefono sono obbligatori");
      return;
    }
    if (!phone.startsWith('+')) phone = `+39${phone}`;

    const contact: Contact = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      phone,
      email: newContact.email.trim(),
      optInDate: new Date().toISOString().split('T')[0],
      tags: newContact.tags.split(',').map(t => t.trim()).filter(t => t !== '')
    };

    setContacts(prev => {
      // Check for duplicate by phone
      const exists = prev.some(c => c.phone === contact.phone);
      if (exists) {
        if (window.confirm("Questo numero esiste già. Sovrascrivere i dati?")) {
          return prev.map(c => c.phone === contact.phone ? { ...contact, id: c.id } : c);
        }
        return prev;
      }
      return [contact, ...prev];
    });

    setNewContact({ name: '', phone: '', email: '', tags: '' });
    setShowAddContactModal(false);
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo contatto definitivamente?")) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("File vuoto");

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 1) return;

        const delimiter = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(delimiter).map(h => h.toLowerCase().trim().replace(/^["']|["']$/g, ''));
        
        // Map indices
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nome'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('cell'));
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));

        const dataLines = lines.slice(1);
        let addedCount = 0;
        let updatedCount = 0;

        setContacts(prev => {
          const updatedContacts = [...prev];
          
          dataLines.forEach((line, idx) => {
            const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
            
            const name = nameIdx !== -1 ? parts[nameIdx] : parts[0];
            let phone = phoneIdx !== -1 ? parts[phoneIdx] : parts[1];
            const email = emailIdx !== -1 ? parts[emailIdx] : '';

            if (name && phone) {
              phone = phone.replace(/[^\d+]/g, '');
              if (!phone.startsWith('+')) phone = `+39${phone}`;

              const existingIdx = updatedContacts.findIndex(c => c.phone === phone);
              const contactData: Contact = {
                id: existingIdx !== -1 ? updatedContacts[existingIdx].id : `csv-${Date.now()}-${idx}`,
                name,
                phone,
                email,
                optInDate: new Date().toISOString().split('T')[0],
                tags: ['import-csv']
              };

              if (existingIdx !== -1) {
                updatedContacts[existingIdx] = { ...updatedContacts[existingIdx], ...contactData };
                updatedCount++;
              } else {
                updatedContacts.unshift(contactData);
                addedCount++;
              }
            }
          });

          return updatedContacts;
        });

        alert(`Importazione completata!\nNuovi contatti: ${addedCount}\nContatti aggiornati: ${updatedCount}`);
      } catch (err) {
        console.error(err);
        alert("Errore durante l'importazione. Verifica il formato del file CSV.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderContactsTable = () => (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:row justify-between items-start md:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-xl font-black text-gray-900">Database Audience</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestisci <span className="font-bold text-green-600">{contacts.length}</span> contatti verificati.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-white border border-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importa CSV
          </button>
          <button 
            onClick={() => setShowAddContactModal(true)}
            className="px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            Aggiungi
          </button>
          <button 
            onClick={() => { if(window.confirm("ATTENZIONE: Stai per svuotare l'intero database. Procedere?")) setContacts([]); }}
            className="px-4 py-2.5 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition-all"
          >
            Svuota
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Telefono</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Opt-In</th>
              <th className="px-6 py-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contacts.length > 0 ? contacts.map(contact => (
              <tr key={contact.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-4 font-bold text-gray-900">{contact.name}</td>
                <td className="px-6 py-4 text-gray-600 font-mono text-sm">{contact.phone}</td>
                <td className="px-6 py-4 text-gray-500 text-xs">{contact.email || '-'}</td>
                <td className="px-6 py-4 text-gray-400 text-[10px] font-bold">{contact.optInDate}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Elimina"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center opacity-30">
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <p className="text-gray-900 font-black text-lg">Il database è vuoto</p>
                    <p className="text-gray-500 text-sm">Comincia importando un file CSV o aggiungendo manualmente.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#25D366] tracking-tighter">WhatsBulk<span className="text-gray-900">PRO</span></h1>
            <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Professional Messaging Hub</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <input 
                type="text" 
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-900 font-bold"
                placeholder="ID Account (Twind)"
              />
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-gray-900"
                  placeholder="Password (TW1234)"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? "Nasc." : "Most."}
                </button>
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl">Accedi</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
        <div className="p-8">
          <h1 className="text-2xl font-black text-[#25D366]">WhatsBulk<span className="text-gray-900">PRO</span></h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${apiConfig.isConfigured ? 'bg-green-500' : 'bg-red-400'}`}></span>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{apiConfig.isConfigured ? 'API Attiva' : 'API Mancante'}</span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {['dashboard', 'campaigns', 'contacts', 'settings'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all ${activeTab === tab ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-50">
          <button onClick={handleLogout} className="w-full py-3.5 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all">Scollegati</button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-4xl font-black text-gray-900 capitalize tracking-tight">{activeTab}</h2>
              <p className="text-gray-400 font-bold mt-1">Console professionale per campagne massive.</p>
            </div>
            <div className="flex gap-2">
              {activeTab === 'contacts' && (
                <button 
                  onClick={() => setShowAddContactModal(true)} 
                  className="bg-black text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  Nuovo Contatto
                </button>
              )}
              {activeTab === 'campaigns' && (
                <button 
                  onClick={() => setShowCreateModal(true)} 
                  className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-green-600 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                  Nuova Campagna
                </button>
              )}
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Totale Audience</p>
                <p className="text-4xl font-black text-gray-900 mt-2">{contacts.length}</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Campagne Inviate</p>
                <p className="text-4xl font-black text-gray-900 mt-2">{campaigns.length}</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficienza AI</p>
                <p className="text-2xl font-black text-green-600 mt-2">Pronta</p>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && renderContactsTable()}

          {activeTab === 'campaigns' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
              {campaigns.length === 0 && (
                <div className="col-span-full py-24 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                  <p className="text-gray-300 font-black text-2xl italic">Ancora nessuna campagna</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black mb-8">Credenziali WhatsApp Cloud API</h3>
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Permanent Token</label>
                  <input 
                    type="password" 
                    value={apiConfig.accessToken}
                    onChange={e => setApiConfig({...apiConfig, accessToken: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-sm outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="EAAB..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Phone Number ID</label>
                  <input 
                    type="text" 
                    value={apiConfig.phoneNumberId}
                    onChange={e => setApiConfig({...apiConfig, phoneNumberId: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="109..."
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl mt-4">Salva e Collega</button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Nuova Campagna */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-3xl font-black">Nuova Campagna</h3>
                 <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-black transition-colors">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
               <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Titolo Campagna" 
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl font-black text-lg outline-none focus:ring-4 focus:ring-green-100"
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  />
                  <textarea 
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl outline-none focus:ring-4 focus:ring-green-100 min-h-[150px]" 
                    placeholder="Messaggio WhatsApp..."
                    onChange={e => setNewCampaign({...newCampaign, messageText: e.target.value})}
                  />
               </div>
               <div className="flex gap-4 mt-10">
                 <button onClick={() => setShowCreateModal(false)} className="flex-1 py-5 font-black text-gray-400">Annulla</button>
                 <button 
                  onClick={async () => {
                    if (!newCampaign.messageText) return;
                    setIsChecking(true);
                    const res = await checkCompliance(newCampaign.messageText, TemplateCategory.MARKETING);
                    setComplianceResult(res);
                    setIsChecking(false);
                    if (res.score >= 50) {
                      setCampaigns(prev => [{
                        id: Date.now().toString(),
                        name: newCampaign.name || 'Invio ' + new Date().toLocaleDateString(),
                        messageText: newCampaign.messageText!,
                        category: TemplateCategory.MARKETING,
                        status: CampaignStatus.DRAFT,
                        sentCount: 0,
                        openCount: 0,
                        totalContacts: contacts.length,
                        createdAt: new Date().toISOString(),
                        complianceScore: res.score
                      }, ...prev]);
                      setShowCreateModal(false);
                      setNewCampaign({ name: '', messageText: '', category: TemplateCategory.MARKETING });
                      setComplianceResult(null);
                      setActiveTab('campaigns');
                    } else alert("Policy Error: Score troppo basso (" + res.score + ")");
                  }}
                  className="flex-1 bg-[#25D366] text-white py-5 rounded-3xl font-black shadow-2xl"
                 >
                   {isChecking ? "Analisi..." : "Salva e Verifica AI"}
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Contatto */}
        {showAddContactModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-2xl font-black mb-8">Nuovo Contatto</h3>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Nome</label>
                  <input 
                    type="text" 
                    required
                    value={newContact.name}
                    onChange={e => setNewContact({...newContact, name: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-black"
                    placeholder="es. Mario Rossi"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Telefono</label>
                  <input 
                    type="tel" 
                    required
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono focus:ring-2 focus:ring-black"
                    placeholder="3331234567"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 px-1">Email (Opzionale)</label>
                  <input 
                    type="email" 
                    value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-black"
                    placeholder="mario@esempio.it"
                  />
                </div>
                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setShowAddContactModal(false)} className="flex-1 py-4 font-bold text-gray-400">Annulla</button>
                  <button type="submit" className="flex-1 bg-black text-white py-4 rounded-2xl font-black shadow-xl">Salva</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;