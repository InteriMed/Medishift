export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

export const FEATURE_TIER_REQUIREMENTS = {
  ORGANIZATION_TAB: SUBSCRIPTION_TIERS.PREMIUM
};

const TIER_ORDER = [
  SUBSCRIPTION_TIERS.FREE,
  SUBSCRIPTION_TIERS.BASIC,
  SUBSCRIPTION_TIERS.PREMIUM,
  SUBSCRIPTION_TIERS.ENTERPRISE
];

export const checkSubscriptionAccess = (userTier, requiredTier) => {
  if (!userTier) userTier = SUBSCRIPTION_TIERS.FREE;
  const userIndex = TIER_ORDER.indexOf(userTier);
  const requiredIndex = TIER_ORDER.indexOf(requiredTier);
  
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex >= requiredIndex;
};

export const getRequiredTierForFeature = (featureName) => {
  return FEATURE_TIER_REQUIREMENTS[featureName] || SUBSCRIPTION_TIERS.FREE;
};

export const canAccessFeature = (userTier, featureName) => {
  const requiredTier = getRequiredTierForFeature(featureName);
  return checkSubscriptionAccess(userTier, requiredTier);
};

export const getSubscriptionDisplayName = (tier) => {
  const names = {
    [SUBSCRIPTION_TIERS.FREE]: 'Free',
    [SUBSCRIPTION_TIERS.BASIC]: 'Basic',
    [SUBSCRIPTION_TIERS.PREMIUM]: 'Premium',
    [SUBSCRIPTION_TIERS.ENTERPRISE]: 'Enterprise'
  };
  return names[tier] || tier;
};

export const getSubscriptionColor = (tier) => {
  const colors = {
    [SUBSCRIPTION_TIERS.FREE]: '#6B7280',
    [SUBSCRIPTION_TIERS.BASIC]: '#3B82F6',
    [SUBSCRIPTION_TIERS.PREMIUM]: '#8B5CF6',
    [SUBSCRIPTION_TIERS.ENTERPRISE]: '#F59E0B'
  };
  return colors[tier] || colors[SUBSCRIPTION_TIERS.FREE];
};

export default {
  SUBSCRIPTION_TIERS,
  FEATURE_TIER_REQUIREMENTS,
  checkSubscriptionAccess,
  getRequiredTierForFeature,
  canAccessFeature,
  getSubscriptionDisplayName,
  getSubscriptionColor
};

