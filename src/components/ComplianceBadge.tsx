import React from 'react';

interface Props {
  score: number;
  isCompliant: boolean;
}

export const ComplianceBadge: React.FC<Props> = ({ score, isCompliant }) => {
  const color = score > 80 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  return (
    <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${color}`}>
      <span className={`w-2 h-2 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}></span>
      AI Score: {score}/100
    </div>
  );
};