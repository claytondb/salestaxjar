'use client';

import { useState } from 'react';
import { ClipboardList, Bell, BellOff, Check } from 'lucide-react';

const SURVEY_UNLOCK_DATE = new Date('2026-03-02'); // Same as beta end date

interface BetaSurveyCardProps {
  userEmail?: string;
  compact?: boolean;
}

export default function BetaSurveyCard({ userEmail, compact = false }: BetaSurveyCardProps) {
  const [reminderSet, setReminderSet] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSetReminder = async () => {
    setLoading(true);
    try {
      // TODO: Call API to set reminder
      await fetch('/api/beta/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, action: 'set' }),
      });
      setReminderSet(true);
    } catch (error) {
      console.error('Failed to set reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReminder = async () => {
    setLoading(true);
    try {
      // TODO: Call API to cancel reminder
      await fetch('/api/beta/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, action: 'cancel' }),
      });
      setReminderSet(false);
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = SURVEY_UNLOCK_DATE.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-900">Beta Survey</p>
            <p className="text-sm text-amber-700">
              Survey unlocks on {formattedDate}
            </p>
            
            {reminderSet ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  We'll email you when it opens
                </span>
                <button
                  onClick={handleCancelReminder}
                  disabled={loading}
                  className="text-xs text-amber-600 hover:text-amber-800 underline"
                >
                  Don't remind me
                </button>
              </div>
            ) : (
              <button
                onClick={handleSetReminder}
                disabled={loading}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-800 text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                <Bell className="w-3 h-3" />
                {loading ? 'Setting...' : 'Remind me'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-amber-900 text-lg">Beta Feedback Survey</h3>
          <p className="text-amber-700 mt-1">
            Complete the survey to lock in your <strong>lifetime free Pro account</strong>.
          </p>
          
          <div className="mt-4 p-3 bg-white/60 rounded-xl border border-amber-200">
            <p className="text-amber-800 font-medium">
              🔒 Survey link unlocks on {formattedDate}
            </p>
            
            {reminderSet ? (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-amber-700 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-600" />
                  We'll send you an email when the survey opens
                </span>
                <button
                  onClick={handleCancelReminder}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  <BellOff className="w-4 h-4" />
                  {loading ? '...' : "Don't remind me"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSetReminder}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                {loading ? 'Setting reminder...' : 'Remind me'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
