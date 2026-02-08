import React from 'react';
import { Campaign, CampaignStatus } from '../types';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  campaign: Campaign;
}

export const CampaignCard: React.FC<Props> = ({ campaign }) => {
  const data = [
    { name: 'Sent', value: campaign.sentCount },
    { name: 'Opened', value: campaign.openCount }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-bold text-gray-900">{campaign.name || 'Senza Titolo'}</h3>
        <span className={`px-2 py-1 rounded text-[10px] font-bold ${campaign.status === CampaignStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
          {campaign.status}
        </span>
      </div>
      <div className="h-16 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><Bar dataKey="value" fill="#25D366" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
        <span>Sent: {campaign.sentCount}</span>
        <span>Open: {Math.round((campaign.openCount / (campaign.sentCount || 1)) * 100)}%</span>
      </div>
    </div>
  );
};