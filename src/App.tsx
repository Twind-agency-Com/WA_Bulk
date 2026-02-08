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
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    messageText: '',
    category: TemplateCategory.MARKETING
  });
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

  const launchCampaign = (id: string) => {
    if (!apiConfig.isConfigured) {
      alert("Configura prima le API nelle impostazioni!");
      setActiveTab('settings');
      return;
    }
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: CampaignStatus.SENDING } : c));
    setTimeout(() => {
      setCampaigns(prev => prev.map(c => {
        if (c.id === id) {
          return { 
            ...c, 
            status: CampaignStatus.COMPLETED, 
            sentCount: c.totalContacts, 
            openCount: Math.floor(c.totalContacts * (0.6 + Math.random() * 0.3)) 
          };
        }
        return c;
      }));
    }, 2500);
  };

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
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
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
            <button onClick={() => setShowCreateModal(true)} className="bg-black text-white px-6 py-3 rounded-xl font-bold">Nuova Campagna</button>
          </header>
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Invii</p>
                <p className="text-3xl font-black">{campaigns.reduce((a, b) => a + b.sentCount, 0)}</p>
              </div>
            </div>
          )}
          {activeTab === 'campaigns' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
             </div>
          )}
        </div>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl p-8">
               <h3 className="text-2xl font-black mb-6">Nuovo Invio</h3>
               <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl mb-4" 
                  rows={4}
                  placeholder="Testo messaggio..."
                  onChange={e => setNewCampaign({...newCampaign, messageText: e.target.value})}
               />
               <div className="flex gap-4">
                 <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 font-bold text-gray-500">Chiudi</button>
                 <button onClick={handleCreateCampaign} className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold">Crea Draft</button>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;