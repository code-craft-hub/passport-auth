import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api.service';
import type { ReferralStats as ReferralStatsType } from '../../types';

export const ReferralStats: React.FC = () => {
  const [stats, setStats] = useState<ReferralStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getReferralStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch referral stats');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      alert('Referral code copied to clipboard!');
    }
  };

  if (loading) {
    return <div>Loading referral stats...</div>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={fetchReferralStats}>Retry</button>
      </div>
    );
  }

  if (!stats) {
    return <div>No referral stats available</div>;
  }

  return (
    <div>
      <h2>Referral Stats</h2>
      
      <div>
        <h3>Your Referral Code</h3>
        <p>
          <strong>{stats.referralCode || 'Generating...'}</strong>
          {stats.referralCode && (
            <button onClick={copyReferralCode} style={{ marginLeft: '10px' }}>
              Copy
            </button>
          )}
        </p>
        {!stats.referralCode && (
          <p style={{ color: 'orange' }}>
            Your referral code is being generated. Please check back in a moment.
          </p>
        )}
      </div>

      <div>
        <h3>Total Referrals</h3>
        <p><strong>{stats.referralCount}</strong></p>
      </div>

      <button onClick={fetchReferralStats}>Refresh</button>
    </div>
  );
};