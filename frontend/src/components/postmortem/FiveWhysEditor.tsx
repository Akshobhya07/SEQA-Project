import React from 'react';
import { ArrowDown, HelpCircle, CheckCircle } from 'lucide-react';
import { FiveWhysItem } from '../../types';

interface FiveWhysEditorProps {
  items: FiveWhysItem[];
  onChange?: (items: FiveWhysItem[]) => void;
  readOnly?: boolean;
}

export const FiveWhysEditor: React.FC<FiveWhysEditorProps> = ({
  items,
  onChange,
  readOnly = false,
}) => {
  const handleAnswerChange = (index: number, answer: string) => {
    if (!onChange || readOnly) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], answer };
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.step} className="relative">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-[11px] font-bold flex items-center justify-center">
                {item.step}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                {item.question}
              </span>
            </div>

            {readOnly ? (
              <p className="text-sm font-medium text-white pl-7">{item.answer || '—'}</p>
            ) : (
              <div className="pl-7 mt-1">
                <textarea
                  value={item.answer}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  rows={2}
                  placeholder={`Reason for step ${item.step}...`}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Connecting Arrow */}
          {idx < items.length - 1 && (
            <div className="flex justify-center my-1 text-slate-600">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
