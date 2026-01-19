export const generateBasicProfilePicture = (firstName = '', lastName = '') => {
  const canvas = document.createElement('canvas');
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  
  const bgColor = '#4B5563';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  
  const letter = (firstName?.[0] || lastName?.[0] || 'U').toUpperCase();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
};

export const isGoogleUser = (user) => {
  if (!user || !user.providerData) return false;
  return user.providerData.some(provider => provider.providerId === 'google.com');
};

