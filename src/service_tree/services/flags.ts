import React from 'react';
import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import { firebaseApp } from '../../services/firebase';
import { CustomClaims, FeatureFlagContext } from '../types/context';

let remoteConfig: RemoteConfig | null = null;

const initializeRemoteConfig = (): RemoteConfig => {
  if (!remoteConfig) {
    remoteConfig = getRemoteConfig(firebaseApp);
    remoteConfig.settings = {
      minimumFetchIntervalMillis: 3600000,
      fetchTimeoutMillis: 60000,
    };

    remoteConfig.defaultConfig = {
      enable_ai_assistant: false,
      enable_advanced_analytics: false,
      enable_payroll_automation: false,
      enable_shift_swap: true,
      enable_marketplace: false,
      enable_document_ai: false,
      pilot_facilities: '[]',
      beta_facilities: '[]',
    };

    fetchAndActivate(remoteConfig).catch((error) => {
      console.error('Failed to fetch remote config:', error);
    });
  }

  return remoteConfig;
};

export const getFeatureFlag = (flagName: string, context?: FeatureFlagContext): boolean => {
  try {
    const config = initializeRemoteConfig();
    const globalValue = getValue(config, flagName).asBoolean();

    if (!context) return globalValue;

    const pilotFacilities = JSON.parse(getValue(config, 'pilot_facilities').asString() || '[]');
    const betaFacilities = JSON.parse(getValue(config, 'beta_facilities').asString() || '[]');

    const isPilot = pilotFacilities.includes(context.facilityId);
    const isBeta = betaFacilities.includes(context.facilityId);

    if (isPilot || isBeta) return true;

    const tierFlags: Record<string, string[]> = {
      enable_ai_assistant: ['PROFESSIONAL', 'ENTERPRISE'],
      enable_advanced_analytics: ['ENTERPRISE'],
      enable_payroll_automation: ['PROFESSIONAL', 'ENTERPRISE'],
      enable_document_ai: ['ENTERPRISE'],
    };

    if (tierFlags[flagName]) {
      const allowedTiers = tierFlags[flagName];
      if (!allowedTiers.includes(context.tier)) {
        return false;
      }
    }

    return globalValue;
  } catch (error) {
    console.error('Error getting feature flag:', error);
    return false;
  }
};

export const useFeatureFlag = (flagName: string, claims: CustomClaims | null): boolean => {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);

  React.useEffect(() => {
    const context: FeatureFlagContext | undefined = claims
      ? {
          facilityId: claims.facilityId,
          tier: claims.tier,
          role: claims.role,
          userId: claims.userId,
        }
      : undefined;

    const enabled = getFeatureFlag(flagName, context);
    setIsEnabled(enabled);
  }, [flagName, claims]);

  return isEnabled;
};

export const getAllFeatureFlags = (context: FeatureFlagContext): Record<string, boolean> => {
  const flags = [
    'enable_ai_assistant',
    'enable_advanced_analytics',
    'enable_payroll_automation',
    'enable_shift_swap',
    'enable_marketplace',
    'enable_document_ai',
  ];

  return flags.reduce((acc, flag) => {
    acc[flag] = getFeatureFlag(flag, context);
    return acc;
  }, {} as Record<string, boolean>);
};

export const checkTierAccess = (claims: CustomClaims, requiredTier: string): boolean => {
  const tierHierarchy: Record<string, number> = {
    FREE: 1,
    STARTER: 2,
    PROFESSIONAL: 3,
    ENTERPRISE: 4,
  };

  const userTierLevel = tierHierarchy[claims.tier] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier] || 0;

  return userTierLevel >= requiredTierLevel;
};

export const isFeatureAvailableForUser = (
  featureName: string,
  claims: CustomClaims | null
): boolean => {
  if (!claims) return false;

  const context: FeatureFlagContext = {
    facilityId: claims.facilityId,
    tier: claims.tier,
    role: claims.role,
    userId: claims.userId,
  };

  return getFeatureFlag(featureName, context);
};

export const refreshFeatureFlags = async (): Promise<void> => {
  try {
    const config = initializeRemoteConfig();
    await fetchAndActivate(config);
  } catch (error) {
    console.error('Failed to refresh feature flags:', error);
  }
};

