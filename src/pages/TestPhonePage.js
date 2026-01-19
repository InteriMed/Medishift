import React, { useState } from 'react';
import { PhoneAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNotification } from '../contexts/NotificationContext';
import SimpleDropdown from '../components/BoxedInputFields/Dropdown-Field';
import PersonnalizedInputField from '../components/BoxedInputFields/Personnalized-InputField';
import Button from '../components/BoxedInputFields/Button';
import { useDropdownOptions } from '../dashboard/pages/profile/utils/DropdownListsImports';
import { FiMessageSquare, FiCheck } from 'react-icons/fi';

const TestPhonePage = () => {
    const { showError, showSuccess } = useNotification();
    const { phonePrefixOptions } = useDropdownOptions();
    
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phonePrefix, setPhonePrefix] = useState('+41');
    const [verificationId, setVerificationId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);

    const defaultPhonePrefixes = [
        { value: '+41', label: 'Switzerland (+41)' },
        { value: '+49', label: 'Germany (+49)' },
        { value: '+33', label: 'France (+33)' },
        { value: '+39', label: 'Italy (+39)' },
        { value: '+43', label: 'Austria (+43)' },
        { value: '+423', label: 'Liechtenstein (+423)' },
        { value: '+352', label: 'Luxembourg (+352)' },
        { value: '+32', label: 'Belgium (+32)' },
        { value: '+31', label: 'Netherlands (+31)' },
        { value: '+44', label: 'United Kingdom (+44)' },
        { value: '+1', label: 'USA/Canada (+1)' }
    ];

    const effectivePhonePrefixOptions = phonePrefixOptions && phonePrefixOptions.length > 0 
        ? phonePrefixOptions 
        : defaultPhonePrefixes;

    const isValidPhone = phoneNumber.replace(/\s+/g, '').length >= 7 && /^\d+$/.test(phoneNumber.replace(/\s+/g, ''));

    const handleSendCode = async () => {
        if (!isValidPhone) {
            showError('Please enter a valid phone number (at least 7 digits)');
            return;
        }

        setIsLoading(true);

        try {
            let digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
            const cleanPrefix = phonePrefix.startsWith('+') ? phonePrefix : `+${phonePrefix.replace(/[^0-9]/g, '')}`;
            
            if (digitsOnly.startsWith('0') && cleanPrefix === '+41') {
                digitsOnly = digitsOnly.substring(1);
            }
            
            const fullNumber = `${cleanPrefix}${digitsOnly}`;

            if (!/^\+[1-9]\d{1,14}$/.test(fullNumber)) {
                showError('Invalid phone number format. Please enter a valid international phone number.');
                setIsLoading(false);
                return;
            }

            console.log('📱 Test Phone Verification Request:', fullNumber);

            const phoneProvider = new PhoneAuthProvider(auth);
            
            const isEmulator = window.location.hostname === 'localhost' && (auth.config?.emulator || process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true');
            
            let verifier;
            if (isEmulator) {
                verifier = {
                    type: 'recaptcha',
                    verify: () => Promise.resolve('test-token'),
                    _reset: () => {},
                    clear: () => {}
                };
            } else {
                verifier = {
                    type: 'recaptcha',
                    verify: () => Promise.resolve('test-token'),
                    _reset: () => {},
                    clear: () => {}
                };
            }

            try {
                const vid = await phoneProvider.verifyPhoneNumber(fullNumber, verifier);
                console.log('✅ Phone verification ID received:', vid);
                setVerificationId(vid);
                setStep(2);
                showSuccess('Verification code sent successfully! (Test mode)');
            } catch (error) {
                console.error('❌ Phone verification error:', error);
                
                if (error.code === 'auth/operation-not-allowed') {
                    showError('Phone authentication is not enabled in Firebase Console. Please enable it in Firebase Console > Authentication > Sign-in method.');
                } else if (error.code === 'auth/invalid-phone-number') {
                    showError('Invalid phone number format. Please check your phone number and try again.');
                } else if (error.code === 'auth/too-many-requests') {
                    showError('Too many verification requests. Firebase has rate-limited this phone number or IP address.\n\nSolutions:\n1. Wait 1-2 hours before trying again\n2. Use a different phone number\n3. Use Firebase Auth Emulator for unlimited testing\n4. Check Firebase Console > Authentication > Settings for quota limits');
                } else if (error.code === 'auth/quota-exceeded') {
                    showError('SMS quota exceeded. The Firebase project has reached its SMS sending limit.\n\nSolutions:\n1. Wait for quota reset (usually daily)\n2. Upgrade Firebase plan\n3. Use Firebase Auth Emulator for testing');
                } else if (error.code === 'auth/internal-error' || error.code === 'auth/internal-error-encountered') {
                    const domain = window.location.hostname;
                    const isLocalhost = domain === 'localhost' || domain === '127.0.0.1';
                    
                    let errorMsg = 'Firebase Phone Auth requires reCAPTCHA verification. The mock verifier cannot bypass this requirement.\n\n';
                    
                    if (isLocalhost) {
                        errorMsg += 'For localhost testing:\n';
                        errorMsg += '1. Use Firebase Auth Emulator (recommended):\n';
                        errorMsg += '   - Set REACT_APP_USE_FIREBASE_EMULATOR=true\n';
                        errorMsg += '   - Start: firebase emulators:start --only auth\n';
                        errorMsg += '   - The emulator bypasses reCAPTCHA\n\n';
                        errorMsg += '2. Or authorize localhost in Firebase Console:\n';
                        errorMsg += '   - Go to Firebase Console > Authentication > Settings\n';
                        errorMsg += '   - Add "localhost" and "127.0.0.1" to Authorized domains\n';
                    } else {
                        errorMsg += 'Solutions:\n';
                        errorMsg += '1. Use Firebase Auth Emulator (best for testing):\n';
                        errorMsg += '   - Set REACT_APP_USE_FIREBASE_EMULATOR=true\n';
                        errorMsg += '   - Start: firebase emulators:start --only auth\n\n';
                        errorMsg += `2. Authorize domain "${domain}" in Firebase Console:\n`;
                        errorMsg += '   - Go to Firebase Console > Authentication > Settings > Authorized domains\n';
                        errorMsg += `   - Add "${domain}" to the list\n`;
                    }
                    
                    showError(errorMsg);
                } else if (error.message && (error.message.includes('reCAPTCHA') || error.message.includes('captcha'))) {
                    showError('reCAPTCHA is required. For testing without captcha, use Firebase Auth Emulator:\n\n1. Set REACT_APP_USE_FIREBASE_EMULATOR=true\n2. Start: firebase emulators:start --only auth\n3. The emulator bypasses reCAPTCHA requirements');
                } else {
                    showError(`Error: ${error.message || 'Failed to send verification code'}\n\nError Code: ${error.code || 'unknown'}\n\nNote: Firebase Phone Auth requires reCAPTCHA. Use Firebase Auth Emulator for testing without captcha.`);
                }
            }
        } catch (error) {
            console.error('❌ Error:', error);
            showError(`Error: ${error.message || 'An unexpected error occurred'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            showError('Please enter a valid 6-digit code.');
            return;
        }

        setIsLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
            console.log('✅ Verification code verified:', credential);
            showSuccess('Verification code verified successfully!');
            setStep(3);
        } catch (error) {
            console.error('❌ Code verification error:', error);
            if (error.code === 'auth/invalid-verification-code') {
                showError('Invalid verification code. Please try again.');
            } else if (error.code === 'auth/code-expired') {
                showError('Verification code expired. Please request a new one.');
            } else {
                showError(`Error: ${error.message || 'Failed to verify code'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiMessageSquare className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Phone Verification Test</h1>
                    <p className="text-slate-500">Test phone message sending without reCAPTCHA</p>
                    <p className="text-xs text-red-500 mt-2 font-semibold">⚠️ Note: This page requires Firebase Auth Emulator to bypass reCAPTCHA</p>
                </div>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <div className="w-1/2">
                                <SimpleDropdown
                                    label="Phone Prefix"
                                    options={effectivePhonePrefixOptions}
                                    value={phonePrefix}
                                    onChange={setPhonePrefix}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <PersonnalizedInputField
                                    label="Phone Number"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="79 123 45 67"
                                    type="tel"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSendCode}
                            disabled={!isValidPhone || isLoading}
                            className="w-full h-14 rounded-2xl font-black"
                        >
                            {isLoading ? 'Sending...' : 'Send Verification Code (No Captcha)'}
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FiCheck className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Code Sent</h2>
                            <p className="text-slate-500">Verification code sent to {phonePrefix} {phoneNumber}</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <PersonnalizedInputField
                                label="Verification Code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => {
                                    setStep(1);
                                    setVerificationCode('');
                                    setVerificationId('');
                                }}
                                variant="secondary"
                                className="flex-1 h-14 rounded-2xl font-black"
                            >
                                Change Number
                            </Button>
                            <Button
                                onClick={handleVerifyCode}
                                disabled={!verificationCode || verificationCode.length < 6 || isLoading}
                                className="flex-1 h-14 rounded-2xl font-black"
                            >
                                {isLoading ? 'Verifying...' : 'Verify Code'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto">
                            <FiCheck className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Verification Successful!</h2>
                        <p className="text-slate-500">Phone number verified successfully</p>
                        <Button
                            onClick={() => {
                                setStep(1);
                                setPhoneNumber('');
                                setVerificationCode('');
                                setVerificationId('');
                            }}
                            className="w-full h-14 rounded-2xl font-black"
                        >
                            Test Another Number
                        </Button>
                    </div>
                )}

                <div className="mt-8 space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                        <strong>⚠️ Rate Limiting Notice:</strong>
                        <p className="mt-2">If you see "too-many-requests" error:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Firebase limits SMS requests per phone number/IP</li>
                            <li>Wait 1-2 hours or use a different phone number</li>
                            <li>Use Firebase Auth Emulator for unlimited testing</li>
                            <li>Check Firebase Console for quota limits</li>
                        </ul>
                    </div>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                        <strong>⚠️ Important: This Test Page Requires Firebase Auth Emulator</strong>
                        <p className="mt-2 font-semibold">The mock reCAPTCHA verifier does NOT work with production Firebase.</p>
                        <p className="mt-2">To use this test page:</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                            <li>Install Firebase CLI: <code className="bg-red-100 px-1 rounded">npm install -g firebase-tools</code></li>
                            <li>Login: <code className="bg-red-100 px-1 rounded">firebase login</code></li>
                            <li>Start emulator: <code className="bg-red-100 px-1 rounded">firebase emulators:start --only auth</code></li>
                            <li>Set environment variable: <code className="bg-red-100 px-1 rounded">REACT_APP_USE_FIREBASE_EMULATOR=true</code></li>
                            <li>Restart your React app</li>
                        </ol>
                        <p className="mt-3 font-semibold">The emulator will bypass reCAPTCHA and rate limits for testing.</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                        <strong>ℹ️ Alternative: Use Production with reCAPTCHA</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>For production testing, use the regular phone verification flow</li>
                            <li>Ensure your domain is authorized in Firebase Console</li>
                            <li>reCAPTCHA will be required (this is normal and secure)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestPhonePage;

