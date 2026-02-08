import React, { useState, useEffect } from 'react';
import { Campaign, CampaignStatus, Contact, TemplateCategory, ComplianceCheck, ApiConfig } from './types';
import { CampaignCard } from './components/CampaignCard';
import { ComplianceBadge } from './components/ComplianceBadge';
import { checkCompliance } from './services/geminiService';

const STORAGE_KEY_API = 'whatsbulk_api_config';
const STORAGE_KEY_CAMPAIGNS = 'whatsbulk_campaigns';
const STORAGE_KEY_CONTACTS = 'whatsbulk_contacts';
const STORAGE_KEY_AUTH = 'whatsbulk_is_authenticated';

const INITIAL_API_CONFIG: ApiConfig = {
  accessToken: '',
  phoneNumberId: '',
  wabaId: '',
  isConfigured: false
};

const INITIAL_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Mario Rossi', phone: '+393331234567', optInDate: '2024-01-10', tags: ['vip', 'milano'] },
  { id: 'c2', name: 'Anna Verdi', phone: '+393339876543', optInDate: '2024-02-15', tags: ['prospect'] },
  { id: 'c3', name: 'Luca Bianchi', phone: '+393471122334', optInDate: '2024-03-01', tags: ['newsletter'] },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  });
  
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'campaigns' | 'contacts' | 'policy' | 'settings'>('dashboard');
  
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
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    messageText: '',
    category: TemplateCategory.MARKETING
  });
  const [newContact, setNewContact] = useState({ name: '', phone: '', tags: '' });
  const [complianceResult, setComplianceResult] = useState<ComplianceCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY_API, JSON.stringify(apiConfig)), [apiConfig]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns)), [campaigns]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts)), [contacts]);
  useEffect(() => localStorage.setItem(STORAGE_KEY_AUTH, isAuthenticated.toString()), [isAuthenticated]);

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
    alert(isReady ? "Configurazione salvata con successo!" : "Attenzione: alcuni campi sono mancanti.");
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone.startsWith('+') ? newContact.phone : `+39${newContact.phone}`,
      optInDate: new Date().toISOString().split('T')[0],
      tags: newContact.tags.split(',').map(t => t.trim()).filter(t => t !== '')
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: '', phone: '', tags: '' });
    setShowAddContactModal(false);
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo contatto?")) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.messageText || !complianceResult) return;

    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      messageText: newCampaign.messageText,
      category: newCampaign.category || TemplateCategory.MARKETING,
      status: CampaignStatus.DRAFT,
      sentCount: 0,
      openCount: 0,
      totalContacts: contacts.length,
      createdAt: new Date().toISOString(),
      complianceScore: complianceResult.score
    };

    setCampaigns([campaign, ...campaigns]);
    setShowCreateModal(false);
    setNewCampaign({ name: '', messageText: '', category: TemplateCategory.MARKETING });
    setComplianceResult(null);
    setActiveTab('campaigns');
  };

  const renderContacts = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Database Audience</h2>
          <p className="text-xs text-gray-500 mt-1">Solo i contatti con opt-in verificato possono ricevere messaggi.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">Importa CSV</button>
          <button 
            onClick={() => setShowAddContactModal(true)}
            className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Aggiungi Contatto
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Nome</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Telefono</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Data Opt-In</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Tag</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.length > 0 ? contacts.map(contact => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4 font-bold text-gray-900">{contact.name}</td>
                <td className="px-6 py-4 text-gray-600">{contact.phone}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{contact.optInDate}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {contact.tags.map(t => <span key={t} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-full">#{t}</span>)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDeleteContact(contact.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">Nessun contatto in database.</td>
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
            <h1 className="text-4xl font-black text-[#25D366] tracking-tighter flex justify-center items-center gap-2">
              WhatsBulk<span className="text-gray-900">PRO</span>
            </h1>
          </div>
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <input 
                type="text" 
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-900 font-bold"
                placeholder="ID Account"
              />
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full p-4 pr-12 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-mono text-gray-900"
                  placeholder="Password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? "Nasc." : "Most."}
                </button>
              </div>
              <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-black hover:bg-gray-800 transition-all">Accedi</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-8">
          <h1 className="text-2xl font-black text-[#25D366]">WhatsBulk<span className="text-gray-900">PRO</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {['dashboard', 'campaigns', 'contacts', 'policy', 'settings'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`w-full text-left px-5 py-3 rounded-xl font-bold transition-all ${activeTab === tab ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className="p-4"><button onClick={handleLogout} className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl">Logout</button></div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <h2 className="text-3xl font-black text-gray-900 capitalize">{activeTab}</h2>
            {activeTab === 'campaigns' && (
              <button onClick={() => setShowCreateModal(true)} className="bg-black text-white px-6 py-3 rounded-xl font-bold">Nuova Campagna</button>
            )}
            {activeTab === 'contacts' && (
              <button onClick={() => setShowAddContactModal(true)} className="bg-black text-white px-6 py-3 rounded-xl font-bold">Nuovo Contatto</button>
            )}
          </header>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Invii</p>
                <p className="text-3xl font-black">{campaigns.reduce((a, b) => a + b.sentCount, 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Audience</p>
                <p className="text-3xl font-black">{contacts.length}</p>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && renderContacts()}

          {activeTab === 'campaigns' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
               {campaigns.length === 0 && <div className="col-span-full py-20 text-center text-gray-400">Nessuna campagna presente.</div>}
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl bg-white p-8 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-black mb-6">Configurazione Cloud API</h3>
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <input 
                  type="password" 
                  value={apiConfig.accessToken}
                  onChange={e => setApiConfig({...apiConfig, accessToken: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm"
                  placeholder="Access Token Meta"
                />
                <input 
                  type="text" 
                  value={apiConfig.phoneNumberId}
                  onChange={e => setApiConfig({...apiConfig, phoneNumberId: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="Phone ID"
                />
                <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold">Salva</button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Nuova Campagna */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-xl p-8 shadow-2xl">
               <h3 className="text-2xl font-black mb-6">Nuovo Invio</h3>
               <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Nome Campagna" 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  />
                  <textarea 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl" 
                    rows={4}
                    placeholder="Testo messaggio..."
                    onChange={e => setNewCampaign({...newCampaign, messageText: e.target.value})}
                  />
               </div>
               <div className="flex gap-4 mt-8">
                 <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 font-bold text-gray-500">Chiudi</button>
                 <button 
                  onClick={async () => {
                    if (!newCampaign.messageText) return;
                    setIsChecking(true);
                    const res = await checkCompliance(newCampaign.messageText, TemplateCategory.MARKETING);
                    setComplianceResult(res);
                    setIsChecking(false);
                    if (res.score >= 60) handleCreateCampaign();
                  }}
                  className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold"
                 >
                   {isChecking ? "Analisi AI..." : "Salva Draft"}
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Contatto */}
        {showAddContactModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6">Nuovo Contatto</h3>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={newContact.name}
                    onChange={e => setNewContact({...newContact, name: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                    placeholder="Es: Mario Rossi"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Numero WhatsApp</label>
                  <input 
                    type="tel" 
                    required
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                    placeholder="3331234567 (Prefisso +39 auto)"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Tag (Separati da virgola)</label>
                  <input 
                    type="text" 
                    value={newContact.tags}
                    onChange={e => setNewContact({...newContact, tags: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl"
                    placeholder="vip, milano, prospect"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddContactModal(false)} className="flex-1 py-4 font-bold text-gray-500">Annulla</button>
                  <button type="submit" className="flex-1 bg-black text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-gray-800">Aggiungi</button>
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