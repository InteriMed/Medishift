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
                    let configModule;

                    if (role === 'professional') {
                        try {
                            configModule = await import(`../professionals/configs/professionals-${type}.json`);
                        } catch (err) {
                            try {
                                configModule = await import(`../professionals/configs/professionals-doctor.json`);
                            } catch (fallbackErr) {
                                throw new Error(`Could not load profile configuration for type: ${type} or fallback.`);
                            }
                        }
                    } else if (role === 'facility' || role === 'company') {
                        try {
                            configModule = await import(`../facilities/configs/facility.json`);
                        } catch (err) {
                            throw err;
                        }
                    } else {
                        throw new Error(`Unknown role: ${role}`);
                    }

                    const config = configModule.default || configModule;
                    setProfileConfig(config);

                    const deepCopiedData = cloneDeep(initialProfileData);
                    setFormData(deepCopiedData);

                } catch (e) {
                    showNotification(t('errors.loadingConfig'), 'error');
                } finally {
                    setIsLoadingConfig(false);
                }
            };
            loadConfig();
        }
    }, [initialProfileData, t, showNotification]);

    return {
        profileConfig,
        isLoadingConfig,
        formData,
        setFormData
    };
};

