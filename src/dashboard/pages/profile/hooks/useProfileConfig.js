import { useState, useEffect } from 'react';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useTranslation } from 'react-i18next';
import { cloneDeep } from 'lodash';

export const useProfileConfig = (initialProfileData) => {
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { showNotification } = useNotification();
    const [profileConfig, setProfileConfig] = useState(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);
    const [formData, setFormData] = useState(null);

    useEffect(() => {
        if (initialProfileData?.role) {
            const role = initialProfileData.role;
            const type = initialProfileData.profileType || 'doctor';

            const loadConfig = async () => {
                setIsLoadingConfig(true);
                setProfileConfig(null);
                try {
                    console.log(`[Profile] Loading config for role: ${role}, type: ${type}`);
                    let configModule;

                    if (role === 'professional') {
                        try {
                            configModule = await import(`../professionals/configs/professionals-${type}.json`);
                        } catch (err) {
                            console.warn(`[Profile] Failed to load specific config for type '${type}', falling back to 'doctor'. Error:`, err);
                            try {
                                configModule = await import(`../professionals/configs/professionals-doctor.json`);
                            } catch (fallbackErr) {
                                console.error('[Profile] Failed to load fallback config:', fallbackErr);
                                throw new Error(`Could not load profile configuration for type: ${type} or fallback.`);
                            }
                        }
                    } else if (role === 'facility' || role === 'company') {
                        try {
                            configModule = await import(`../facilities/configs/facility.json`);
                        } catch (err) {
                            console.error('[Profile] Failed to load facility config:', err);
                            throw err;
                        }
                    } else {
                        console.error(`[Profile] Unknown role encountered: ${role}`);
                        throw new Error(`Unknown role: ${role}`);
                    }

                    const config = configModule.default || configModule;
                    setProfileConfig(config);

                    const deepCopiedData = cloneDeep(initialProfileData);
                    setFormData(deepCopiedData);

                    const firstTabId = config?.tabs?.[0]?.id || '';
                    if (!firstTabId) {
                        console.warn('[Profile] No tabs found in loaded configuration');
                    }

                    console.log('[Profile] Config loaded successfully for:', role);

                } catch (e) {
                    console.error('[Profile] Critical error loading config:', e);
                    showNotification(t('errors.loadingConfig'), 'error');
                } finally {
                    setIsLoadingConfig(false);
                }
            };
            loadConfig();
        } else if (initialProfileData && !initialProfileData.role) {
            console.warn('[Profile] Profile data loaded but role is missing:', initialProfileData);
        }
    }, [initialProfileData, t, showNotification]);

    return {
        profileConfig,
        isLoadingConfig,
        formData,
        setFormData
    };
};

