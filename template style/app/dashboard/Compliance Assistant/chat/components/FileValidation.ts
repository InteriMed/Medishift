const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/webm'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/ogg'];

export function validateFileType(file: File, acceptString?: string): { valid: boolean; type: 'image' | 'audio' | 'video' | 'unknown'; error?: string } {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  const isEmptyAccept = !acceptString || acceptString.trim() === '';
  
  let detectedType: 'image' | 'audio' | 'video' | 'unknown' = 'unknown';
  
  if (fileType) {
    if (ALLOWED_IMAGE_TYPES.some(type => fileType === type) || fileType.startsWith('image/')) {
      detectedType = 'image';
    } else if (ALLOWED_AUDIO_TYPES.some(type => fileType === type) || fileType.startsWith('audio/')) {
      detectedType = 'audio';
    } else if (ALLOWED_VIDEO_TYPES.some(type => fileType === type) || fileType.startsWith('video/')) {
      detectedType = 'video';
    }
  }
  
  if (detectedType === 'unknown' && !fileType) {
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
      detectedType = 'image';
    } else if (fileName.match(/\.(mp3|wav|m4a|aac|flac|ogg|webm|opus)$/i)) {
      detectedType = 'audio';
    } else if (fileName.match(/\.(mp4|mov|avi|wmv|webm|ogg)$/i)) {
      detectedType = 'video';
    }
  }
  
  if (isEmptyAccept) {
    return { valid: true, type: detectedType };
  }
  
  const acceptedTypes = acceptString.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  const defaultAccept = "image/*,audio/*,video/*";
  const isDefaultAccept = acceptString === defaultAccept;
  
  if (isDefaultAccept) {
    return { valid: true, type: detectedType };
  }
  
  if (detectedType === 'unknown') {
    return { 
      valid: false, 
      type: 'unknown', 
      error: `File type not supported. Accepted types: ${acceptString}` 
    };
  }
  
  const isAccepted = acceptedTypes.some(accept => {
    const acceptLower = accept.toLowerCase();
    
    if (detectedType === 'image') {
      if (acceptLower === 'image/*' || acceptLower.startsWith('image/')) {
        return fileType.startsWith('image/') || (!fileType && ALLOWED_IMAGE_TYPES.some(type => fileName.match(new RegExp(`\\.${type.split('/')[1]}$`, 'i'))));
      }
      return ALLOWED_IMAGE_TYPES.some(type => acceptLower.includes(type.split('/')[1]));
    }
    if (detectedType === 'audio') {
      if (acceptLower === 'audio/*' || acceptLower.startsWith('audio/')) {
        return fileType.startsWith('audio/') || (!fileType && fileName.match(/\.(mp3|wav|m4a|aac|flac|ogg|webm|opus)$/i));
      }
      return acceptLower.match(/\.(mp3|wav|m4a|aac|flac|ogg|webm|opus)$/i);
    }
    if (detectedType === 'video') {
      if (acceptLower === 'video/*' || acceptLower.startsWith('video/')) {
        return fileType.startsWith('video/') || (!fileType && fileName.match(/\.(mp4|mov|avi|wmv|webm|ogg)$/i));
      }
      return acceptLower.match(/\.(mp4|mov|avi|wmv|webm|ogg)$/i);
    }
    return false;
  });
  
  if (!isAccepted) {
    const errorMessage = (detectedType as string) === 'unknown' 
      ? `File type not recognized or not supported. Accepted types: ${acceptString}`
      : `${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} files are not accepted. Accepted types: ${acceptString}`;
    
    return { 
      valid: false, 
      type: detectedType, 
      error: errorMessage
    };
  }
  
  return { valid: true, type: detectedType };
}

