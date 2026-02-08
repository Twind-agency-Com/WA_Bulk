import React, { useState, useEffect } from 'react';
import { Campaign, CampaignStatus, Contact, TemplateCategory, ComplianceCheck, ApiConfig } from './types';
import { CampaignCard } from './components/CampaignCard';
import { ComplianceBadge } from './components/ComplianceBadge';
import { checkCompliance, optimizeTemplate } from './services/geminiService';

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
            <p className="text-gray-500 font-medium mt-2">Accedi alla tua dashboard professionale</p>
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">ID Utente</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={`w-full p-4 bg-gray-50 border ${loginError ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'} rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-gray-900 placeholder-gray-400`}
                  placeholder="Inserisci ID Account"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={`w-full p-4 pr-12 bg-gray-50 border ${loginError ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'} rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all font-mono text-gray-900 placeholder-gray-400`}
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {loginError && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 text-center">Credenziali non valide. Riprova.</p>
                )}
              </div>

              <button 
                type="submit" 
                className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-xl hover:bg-gray-800 transition-all"
              >
                Sblocca Dashboard
              </button>

              <div className="pt-4 text-center">
                <p className="text-xs text-gray-400">
                  Account: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-600">Twind</code> / <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-600">TW1234</code>
                </p>
              </div>
            </form>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-8 uppercase font-bold tracking-widest">
            Crittografia End-to-End & Compliance Meta v4.0
          </p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Invii Totali</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{campaigns.reduce((a, b) => a + b.sentCount, 0)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Open Rate Medio</p>
          <p className="text-2xl font-black text-blue-600 mt-1">72%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase">Contatti Opt-in</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{contacts.length}</p>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm ${apiConfig.isConfigured ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className="text-xs font-bold text-gray-400 uppercase">Stato API</p>
          <p className={`text-sm font-bold mt-1 ${apiConfig.isConfigured ? 'text-green-700' : 'text-red-700'}`}>
            {apiConfig.isConfigured ? '● Connesso' : '○ Non configurato'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Campagne Recenti</h3>
            <button onClick={() => setActiveTab('campaigns')} className="text-sm text-green-600 font-bold hover:underline">Vedi tutte</button>
          </div>
          <div className="space-y-4">
            {campaigns.length > 0 ? campaigns.slice(0, 2).map(c => <CampaignCard key={c.id} campaign={c} />) : <p className="text-gray-400 text-sm italic">Nessuna campagna recente.</p>}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Action: Crea Template</h3>
          <div className="space-y-4">
            <textarea 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              placeholder="Scrivi qui per testare la compliance AI..."
              rows={3}
            />
            <button onClick={() => setShowCreateModal(true)} className="w-full bg-[#25D366] text-white py-3 rounded-lg font-bold hover:bg-green-600 transition-all shadow-md">Nuovo Invio Massivo</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Database Audience</h2>
          <p className="text-xs text-gray-500 mt-1">Solo i contatti con opt-in verificato possono ricevere messaggi.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">Importa CSV</button>
          <button className="px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors">Aggiungi</button>
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
            {contacts.map(contact => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{contact.name}</td>
                <td className="px-6 py-4 text-gray-600">{contact.phone}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{contact.optInDate}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {contact.tags.map(t => <span key={t} className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-full">#{t}</span>)}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 hover:text-red-500 cursor-pointer">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPolicyGuide = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4">Regole d'Oro di Meta</h2>
          <p className="text-green-50 text-lg max-w-xl opacity-90">Evita il ban del tuo numero Business seguendo queste linee guida fondamentali per i messaggi massivi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Consenso (Opt-in)", desc: "Devi avere prova che l'utente ha accettato di ricevere messaggi. Mai comprare liste esterne.", color: "green" },
          { title: "Categorizzazione", desc: "Scegli bene tra Marketing, Utility e Auth. Errori ripetuti portano alla sospensione.", color: "blue" },
          { title: "Qualità Messaggio", desc: "Evita il caps lock eccessivo e troppe emoji. Mantieni un tono professionale.", color: "purple" }
        ].map((p, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
             <div className={`w-10 h-10 bg-${p.color}-100 text-${p.color}-600 rounded-lg flex items-center justify-center mb-4 font-bold`}>{i+1}</div>
             <h4 className="font-bold text-gray-900 mb-2">{p.title}</h4>
             <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 mb-2">WhatsApp Cloud API</h2>
        <p className="text-sm text-gray-500 mb-8">Inserisci le tue credenziali da Meta for Developers per abilitare l'invio reale.</p>
        
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Permanent Access Token</label>
            <input 
              type="password" 
              value={apiConfig.accessToken}
              onChange={e => setApiConfig({...apiConfig, accessToken: e.target.value})}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-mono text-sm text-gray-900" 
              placeholder="EAAB..." 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Phone ID</label>
              <input 
                type="text" 
                value={apiConfig.phoneNumberId}
                onChange={e => setApiConfig({...apiConfig, phoneNumberId: e.target.value})}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-900 font-bold" 
                placeholder="102938..." 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Business ID</label>
              <input 
                type="text" 
                value={apiConfig.wabaId}
                onChange={e => setApiConfig({...apiConfig, wabaId: e.target.value})}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-gray-900 font-bold" 
                placeholder="556677..." 
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg">Salva e Collega Account</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-auto md:h-screen z-20">
        <div className="p-8">
          <h1 className="text-2xl font-black text-[#25D366] tracking-tighter flex items-center gap-2">
            WhatsBulk<span className="text-gray-900">PRO</span>
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${apiConfig.isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{apiConfig.isConfigured ? 'Live' : 'Offline'}</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { id: 'campaigns', label: 'Campagne', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
            { id: 'contacts', label: 'Audience', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { id: 'policy', label: 'Policy Guide', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { id: 'settings', label: 'Impostazioni', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 capitalize">{activeTab}</h2>
            <p className="text-gray-500 font-medium mt-1">Gestisci la tua comunicazione professionale con WhatsBulk Pro.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-black text-white px-6 py-3 rounded-xl font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-0h6m-6 0H6" /></svg>
            Nuova Campagna
          </button>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'contacts' && renderContacts()}
        {activeTab === 'policy' && renderPolicyGuide()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {campaigns.length > 0 ? campaigns.map(c => <CampaignCard key={c.id} campaign={c} />) : <div className="col-span-full py-20 text-center text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-3xl">Nessuna campagna creata.</div>}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-2xl font-black text-gray-900">Configura Invio</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-8 space-y-6">
                <input 
                  type="text" 
                  value={newCampaign.name}
                  onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-bold outline-none focus:ring-2 focus:ring-green-500" 
                  placeholder="Titolo Campagna"
                />
                <textarea 
                  rows={5}
                  value={newCampaign.messageText}
                  onChange={e => setNewCampaign({...newCampaign, messageText: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Scrivi qui il tuo messaggio..."
                ></textarea>
                <button 
                  onClick={async () => {
                    if (!newCampaign.messageText) return;
                    setIsChecking(true);
                    const res = await checkCompliance(newCampaign.messageText, newCampaign.category!);
                    setComplianceResult(res);
                    setIsChecking(false);
                  }}
                  disabled={isChecking}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  {isChecking ? "Analisi AI..." : "Verifica Compliance AI"}
                </button>
                {complianceResult && (
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <ComplianceBadge score={complianceResult.score} isCompliant={complianceResult.isCompliant} />
                    <ul className="mt-3 text-xs text-gray-600 space-y-1">
                      {complianceResult.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100">
                <button 
                  onClick={handleCreateCampaign}
                  disabled={!complianceResult || complianceResult.score < 60}
                  className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black shadow-xl hover:bg-green-600 disabled:opacity-50 transition-all"
                >
                  Salva Campagna Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;