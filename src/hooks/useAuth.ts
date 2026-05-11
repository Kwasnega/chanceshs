import { useState, useEffect } from 'react';

export interface UserEntitlements {
  premium_report: boolean;
  early_alert: boolean;
  shs_kit_preview: boolean;
}

export interface AuthState {
  userId: string | null;
  isLoading: boolean;
  entitlements: UserEntitlements;
  hasPremiumReport: boolean;
  hasEarlyAlert: boolean;
  refreshEntitlements: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<UserEntitlements>({
    premium_report: false,
    early_alert: false,
    shs_kit_preview: false
  });

  useEffect(() => {
    const storedUserId = localStorage.getItem('chanceshs_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      checkEntitlements(storedUserId);
    } else {
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setUserId(newUserId);
      localStorage.setItem('chanceshs_user_id', newUserId);
      setIsLoading(false);
    }
  }, []);

  const checkEntitlements = async (uid: string) => {
    try {
      const [premiumRes, alertRes, kitRes] = await Promise.all([
        fetch(`/api/entitlements/check?userId=${uid}&featureType=premium_report`),
        fetch(`/api/entitlements/check?userId=${uid}&featureType=early_alert`),
        fetch(`/api/entitlements/check?userId=${uid}&featureType=shs_kit_preview`)
      ]);

      const [premiumData, alertData, kitData] = await Promise.all([
        premiumRes.json(),
        alertRes.json(),
        kitRes.json()
      ]);

      setEntitlements({
        premium_report: premiumData.hasAccess || false,
        early_alert: alertData.hasAccess || false,
        shs_kit_preview: kitData.hasAccess || false
      });
    } catch (error) {
      console.error('Error checking entitlements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEntitlements = async () => {
    if (userId) {
      setIsLoading(true);
      await checkEntitlements(userId);
    }
  };

  return {
    userId,
    isLoading,
    entitlements,
    hasPremiumReport: entitlements.premium_report,
    hasEarlyAlert: entitlements.early_alert,
    refreshEntitlements
  };
}
