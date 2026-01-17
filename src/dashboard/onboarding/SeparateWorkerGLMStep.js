import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/BoxedInputFields/Button';
import { FiCheckCircle, FiUser } from 'react-icons/fi';

const SeparateWorkerGLMStep = ({ onComplete, onBack, showHeader = true }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const saveGLMSetting = async () => {
    if (!currentUser) return;

    setIsProcessing(true);

    try {
      const { httpsCallable, getFunctions } = await import('firebase/functions');
      const { app } = await import('../../../services/firebaseService');
      const functions = getFunctions(app, 'europe-west6');
      const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

      await updateUserProfile({
        hasGLM: true
      });

      setIsComplete(true);
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Error saving GLM setting:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUser className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">
            {t('dashboard.onboarding.separateWorkerGLM.title', 'Separate Worker with GLM')}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            {t('dashboard.onboarding.separateWorkerGLM.description', 'You have a GLM (manager) but no GLN. Your GLM setting will be saved to your profile.')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {isComplete ? (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-primary mb-2">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t('dashboard.onboarding.separateWorkerGLM.complete', 'GLM Setting Saved!')}</span>
            </div>
            <p className="text-sm text-primary/80">
              {t('dashboard.onboarding.separateWorkerGLM.completeMessage', 'Your GLM setting has been saved to your profile. You can manage this setting in your profile settings.')}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={saveGLMSetting}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t('dashboard.onboarding.separateWorkerGLM.saving', 'Saving...')}
                </>
              ) : (
                t('dashboard.onboarding.separateWorkerGLM.saveButton', 'Save GLM Setting')
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeparateWorkerGLMStep;

