// Extract user type from user data
export const getUserTypeFromData = (userData) => {
  return userData?.basicInfo?.accountType || 'worker';
};

// Extract user ID from user data
export const getUserIdFromData = (userData) => {
  // Try multiple possible locations for user ID
  const possibleIds = [
    userData?.uid,
    userData?.firebase_uid,
    userData?.id,
    userData?.userId,
    userData?.user?.uid,
    userData?.user?.id
  ];
  
  const userId = possibleIds.find(id => id && typeof id === 'string');
  
  if (!userId) {
    console.warn('No valid user ID found in userData:', userData);
  }
  
  return userId || null;
}; 