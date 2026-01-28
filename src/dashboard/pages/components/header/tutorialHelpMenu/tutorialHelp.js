import React from 'react';
import { useTutorial } from '../../../../../TutorialContext';
import { FiHelpCircle } from 'react-icons/fi';
import styles from './tutorialHelp.module.css';

/**
 * TutorialHelp Component
 * A help button to be placed in the header that allows users to access the tutorial at any time
 */
const TutorialHelp = () => {
  const { setShowTutorialSelectionModal } = useTutorial();

  return (
    <button
      className={styles.helpButton}
      onClick={() => setShowTutorialSelectionModal(true)}
      title="Start tutorial"
      aria-label="Start tutorial"
    >
      <FiHelpCircle className={styles.helpIcon} />
      <span className={styles.helpText}>Help</span>
    </button>
  );
};

export default TutorialHelp; 