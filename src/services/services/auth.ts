import React from 'react';
import { auth } from './firebase';
import { CustomClaims, AuthContext } from '../types/context';

export const getCustomClaims = async (): Promise<CustomClaims | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const idTokenResult = await user.getIdTokenResult(true);
  const claims = idTokenResult.claims;

  if (!claims.facilityId || !claims.role || !claims.tier) {
    console.warn('Custom claims not set. User may need onboarding or facility assignment.');
    return null;
  }

  return {
    facilityId: claims.facilityId as string,
    role: claims.role as 'admin' | 'facility_admin' | 'professional' | 'coordinator',
    tier: claims.tier as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE',
    userId: user.uid,
    email: user.email || '',
  };
};

export const useSmartAuth = (): AuthContext | null => {
  const user = auth.currentUser;
  const [claims, setClaims] = React.useState<CustomClaims | null>(null);
  const [token, setToken] = React.useState<string>('');

  React.useEffect(() => {
    if (!user) {
      setClaims(null);
      setToken('');
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const loadClaims = async () => {
      try {
        const customClaims = await getCustomClaims();
        setClaims(customClaims);
        
        const idToken = await user.getIdToken();
        setToken(idToken);
      } catch (error) {
        console.error('Error loading custom claims:', error);
        setClaims(null);
      }
    };

    loadClaims();

    const refreshInterval = setInterval(() => {
      loadClaims();
    }, 55 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  if (!user || !claims) return null;

  return {
    uid: user.uid,
    claims,
    token,
    isAuthenticated: true,
  };
};

export const waitForAuth = (): Promise<AuthContext | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        resolve(null);
        unsubscribe();
        return;
      }

      try {
        const claims = await getCustomClaims();
        const token = await user.getIdToken();

        if (!claims) {
          resolve(null);
          unsubscribe();
          return;
        }

        resolve({
          uid: user.uid,
          claims,
          token,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('Error in waitForAuth:', error);
        resolve(null);
      }
      
      unsubscribe();
    });
  });
};

export const refreshCustomClaims = async (): Promise<CustomClaims | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  await user.getIdToken(true);
  return getCustomClaims();
};

export const hasPermission = (claims: CustomClaims | null, requiredRole: string): boolean => {
  if (!claims) return false;

  const roleHierarchy = {
    admin: 4,
    facility_admin: 3,
    coordinator: 2,
    professional: 1,
  };

  const userLevel = roleHierarchy[claims.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
};

export const isTierAllowed = (claims: CustomClaims | null, minTier: string): boolean => {
  if (!claims) return false;

  const tierHierarchy = {
    ENTERPRISE: 4,
    PROFESSIONAL: 3,
    STARTER: 2,
    FREE: 1,
  };

  const userTierLevel = tierHierarchy[claims.tier as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[minTier as keyof typeof tierHierarchy] || 0;

  return userTierLevel >= requiredTierLevel;
};

