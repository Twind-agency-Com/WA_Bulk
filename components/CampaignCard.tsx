
import React from 'react';
import { Campaign, CampaignStatus } from '../types';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  campaign: Campaign;
  onSend?: (campaignId: string) => void;
  canSend?: boolean;
}

export const CampaignCard: React.FC<Props> = ({ campaign, onSend, canSend }) => {
  const data = [
    { name: 'Sent', value: campaign.sentCount },
    { name: 'Opened', value: campaign.openCount },
    { name: 'Pending', value: campaign.totalContacts - campaign.sentCount }
  ];

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case CampaignStatus.SENDING: return 'bg-blue-100 text-blue-700 animate-pulse';
      case CampaignStatus.FAILED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{campaign.name}</h3>
          <p className="text-xs text-gray-500">Created: {new Date(campaign.createdAt).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(campaign.status)}`}>
          {campaign.status}
        </span>
      </div>

      <div className="h-24 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#25D366' : index === 1 ? '#34B7F1' : '#ECE5DD'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <div>
          <p className="text-xs font-medium uppercase text-gray-400">Total</p>
          <p className="font-bold">{campaign.totalContacts}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-400">Open Rate</p>
          <p className="font-bold text-blue-500">
            {Math.round((campaign.openCount / (campaign.sentCount || 1)) * 100)}%
          </p>
        </div>
      </div>

      {onSend && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => onSend(campaign.id)}
            disabled={!canSend || campaign.status !== CampaignStatus.DRAFT}
            className="w-full py-3 rounded-xl font-black transition-all bg-[#25D366] text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {campaign.status === CampaignStatus.SENDING ? 'Invio in corso…' : 'Invia campagna'}
          </button>
          {(!canSend) && (
            <p className="mt-2 text-[10px] font-bold text-red-500 text-center">Configura prima le API WhatsApp nelle Impostazioni.</p>
          )}
        </div>
      )}
    </div>
  );
};
