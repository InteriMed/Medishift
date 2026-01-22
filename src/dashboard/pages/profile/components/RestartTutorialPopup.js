import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../../../components/Dialog/Dialog';
import Button from '../../../../components/BoxedInputFields/Button';

/**
 * Popup shown when Team Access users try to access locked profile tabs.
 * Offers the option to restart the tutorial for full access.
 */
const RestartTutorialPopup = ({ isOpen, onClose, onRestartTutorial }) => {
    const { t } = useTranslation('dashboardProfile');

    const handleRestart = () => {
        onRestartTutorial();
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('restartTutorial.title', 'Unlock Full Access')}
            maxWidth="sm"
        >
            <div className="space-y-4">
                <p className="text-muted-foreground">
                    {t(
                        'restartTutorial.message',
                        'To unlock all features (work independently, do replacements, access all profile sections), you need to complete the full tutorial.'
                    )}
                </p>
                <p className="text-muted-foreground text-sm">
                    {t(
                        'restartTutorial.note',
                        'Your current progress will be saved. You can continue from where you left off.'
                    )}
                </p>
                <div className="flex gap-3 justify-end mt-6">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        {t('common:cancel', 'Cancel')}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleRestart}
                    >
                        {t('restartTutorial.button', 'Restart Tutorial')}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};

RestartTutorialPopup.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onRestartTutorial: PropTypes.func.isRequired
};

export default RestartTutorialPopup;
