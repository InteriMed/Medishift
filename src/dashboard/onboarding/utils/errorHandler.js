import { getFirebaseErrorMessage } from '../../../utils/errorHandler';

export const handleVerificationError = (error, setVerificationError, setIsAPILimitError, setShowContactForm, setCountdownSeconds, setVerificationStatus) => {
  console.error('Processing error:', error);

  const errorCode = error.code || error.message || '';
  const errorMessage = error.message || '';

  let userFriendlyMessage = '';

  if (errorCode === 'internal' || errorMessage.toLowerCase() === 'internal') {
    userFriendlyMessage = getFirebaseErrorMessage({ code: 'internal' });
  } else {
    userFriendlyMessage = getFirebaseErrorMessage(error) || errorMessage || 'An error occurred during verification.';
  }

  const msg = userFriendlyMessage.toLowerCase();

  const isLimit = msg.includes('resource') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted');

  if (isLimit) {
    const waitTimeMatch = errorMessage.match(/wait (\d+) seconds/i);
    const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;

    setCountdownSeconds(waitTime);
    setVerificationError("Our verification services are currently experiencing high demand. Please wait before trying again.");
    setIsAPILimitError(true);
    setShowContactForm(false);
  } else {
    setCountdownSeconds(0);
    setVerificationError(userFriendlyMessage);
    setIsAPILimitError(false);
    setShowContactForm(true);
  }

  setVerificationStatus('error');
};

export const sendErrorEmail = (contactMessage, contactPhonePrefix, contactPhoneNumber, currentUser, role, gln, verificationError) => {
  if (!contactMessage.trim() || !contactPhonePrefix || !contactPhoneNumber.trim()) return;

  const fullPhoneNumber = contactPhonePrefix ? `${contactPhonePrefix} ${contactPhoneNumber}` : contactPhoneNumber;
  const subject = encodeURIComponent('[URGENT ERROR] Onboarding Verification Failure');
  const body = encodeURIComponent(`
[Automated Error Support Onboarding]

User Details:
Name: ${currentUser?.displayName || 'N/A'}
Email: ${currentUser?.email || 'N/A'}
Phone: ${fullPhoneNumber || 'N/A'}
User ID: ${currentUser?.uid || 'N/A'}
Role: ${role || 'N/A'}
Target GLN: ${gln.trim() ? gln : 'No GLN Provided'}
Error Encountered: ${verificationError || 'Unknown'}

User Message:
${contactMessage}
    `);

  const mailtoLink = `mailto:support@medishift.ch?subject=${subject}&body=${body}`;
  window.location.href = mailtoLink;
};


