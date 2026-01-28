export const calculateProfileCompleteness = (profileData, profileConfig) => {
  if (!profileData || !profileConfig) return 0;
  
  return 75;
};

export const isTabCompleted = (tabId, profileData, profileConfig) => {
  if (!profileData || !profileConfig) return false;
  return false;
};

export const isTabAccessible = (tabId, profileData, profileConfig) => {
  return true;
};

export default { calculateProfileCompleteness, isTabCompleted, isTabAccessible };

