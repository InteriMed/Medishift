# InteriMed Onboarding Tutorial Feature

## Overview

This document outlines the comprehensive onboarding tutorial system for the InteriMed platform, designed to guide new users through the application's features after completing their profile. The system provides interactive, contextual help for users to understand how to use different components of the dashboard effectively.

## Architecture

The onboarding tutorial is implemented using a context-based system with overlays that highlight specific UI elements and provide explanatory content. This architecture allows for a non-intrusive, step-by-step guided experience.

### Key Components

1. **TutorialContext**: Manages the state of the tutorial, including the current step, completion status, and user preferences.
2. **Tutorial Component**: Renders overlays and tooltips based on the current tutorial step.
3. **TutorialStep Interface**: Defines the structure for each tutorial step, including target elements, content, and positioning.
4. **Tutorial Hooks**: Provides custom hooks for components to interact with the tutorial system.

## Feature Requirements

### 1. Post-Profile Completion Trigger

- The tutorial should automatically start once a user completes their profile (when `onboarding === "profileCompleted"`)
- Users should be able to skip the tutorial and access it later from a help menu
- The system should remember which tutorials a user has completed

### 2. Multi-Level Tutorial System

#### Level 1: Basic Dashboard Orientation
- Introduction to the dashboard layout
- Explanation of the sidebar navigation
- Overview of the main dashboard components

#### Level 2: Feature-Specific Tutorials
- Dedicated tutorials for each main feature (Contracts, Messages, Calendar, etc.)
- Each feature tutorial should be triggerable independently
- Progress tracking for each feature tutorial

#### Level 3: Advanced Features
- Workflows for complex processes (e.g., contract creation, appointment scheduling)
- Integration tutorials (e.g., calendar sync, document uploads)
- Role-specific advanced features

### 3. Sidebar Overlay Implementation

```javascript
// In components/Tutorial/SidebarTutorial.jsx
import React from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import styles from './TutorialOverlay.module.css';

export const SidebarTutorial = () => {
  const { currentStep, stepData, nextStep, prevStep, skipTutorial } = useTutorial();
  
  if (!stepData || stepData.targetArea !== 'sidebar') return null;
  
  return (
    <div className={styles.sidebarOverlay}>
      <div 
        className={styles.highlightBox}
        style={{
          top: `${stepData.position.top}px`,
          left: `${stepData.position.left}px`,
          width: `${stepData.position.width}px`,
          height: `${stepData.position.height}px`
        }}
      />
      
      <div className={styles.tutorialTooltip} style={stepData.tooltipPosition}>
        <h3>{stepData.title}</h3>
        <p>{stepData.content}</p>
        
        <div className={styles.actionButtons}>
          {currentStep > 0 && (
            <button onClick={prevStep} className={styles.prevButton}>
              Previous
            </button>
          )}
          <button onClick={skipTutorial} className={styles.skipButton}>
            Skip Tutorial
          </button>
          <button onClick={nextStep} className={styles.nextButton}>
            {stepData.isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 4. Content Area Overlay Implementation

```javascript
// In components/Tutorial/ContentTutorial.jsx
import React from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import styles from './TutorialOverlay.module.css';

export const ContentTutorial = () => {
  const { currentStep, stepData, nextStep, prevStep, skipTutorial } = useTutorial();
  
  if (!stepData || stepData.targetArea !== 'content') return null;
  
  return (
    <div className={styles.contentOverlay}>
      <div 
        className={styles.highlightBox}
        style={{
          top: `${stepData.position.top}px`,
          left: `${stepData.position.left}px`,
          width: `${stepData.position.width}px`,
          height: `${stepData.position.height}px`
        }}
      />
      
      <div className={styles.tutorialTooltip} style={stepData.tooltipPosition}>
        <h3>{stepData.title}</h3>
        <p>{stepData.content}</p>
        
        <div className={styles.actionButtons}>
          {currentStep > 0 && (
            <button onClick={prevStep} className={styles.prevButton}>
              Previous
            </button>
          )}
          <button onClick={skipTutorial} className={styles.skipButton}>
            Skip Tutorial
          </button>
          <button onClick={nextStep} className={styles.nextButton}>
            {stepData.isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 5. Tutorial Context Implementation

```javascript
// In contexts/TutorialContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { tutorialSteps } from '../data/tutorialSteps';

const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTutorial, setActiveTutorial] = useState('dashboard'); // Default tutorial
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState({});
  const [stepData, setStepData] = useState(null);
  
  // Load user's tutorial state from Firestore
  useEffect(() => {
    const loadTutorialState = async () => {
      if (!currentUser) return;
      
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user just completed their profile
          if (userData.onboarding === "profileCompleted" && 
              !userData.tutorialStarted) {
            setIsTutorialActive(true);
            // Mark tutorial as started
            await updateDoc(userDocRef, {
              tutorialStarted: true
            });
          }
          
          // Load completed tutorials
          if (userData.completedTutorials) {
            setCompletedTutorials(userData.completedTutorials);
          }
        }
      } catch (error) {
        console.error('Error loading tutorial state:', error);
      }
    };
    
    loadTutorialState();
  }, [currentUser]);
  
  // Update step data when current step changes
  useEffect(() => {
    if (isTutorialActive && tutorialSteps[activeTutorial]) {
      setStepData(tutorialSteps[activeTutorial][currentStep]);
    } else {
      setStepData(null);
    }
  }, [currentStep, activeTutorial, isTutorialActive]);
  
  // Get element position for highlighting
  useEffect(() => {
    if (stepData && stepData.targetSelector) {
      const targetElement = document.querySelector(stepData.targetSelector);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setStepData(prev => ({
          ...prev,
          position: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }
        }));
      }
    }
  }, [stepData]);
  
  const startTutorial = (tutorialName = 'dashboard') => {
    setActiveTutorial(tutorialName);
    setCurrentStep(0);
    setIsTutorialActive(true);
  };
  
  const nextStep = () => {
    const totalSteps = tutorialSteps[activeTutorial]?.length || 0;
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark this tutorial as completed
      completeTutorial();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const skipTutorial = () => {
    setIsTutorialActive(false);
  };
  
  const completeTutorial = async () => {
    setIsTutorialActive(false);
    
    // Update user's completed tutorials in Firestore
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Update completedTutorials in Firestore
        await updateDoc(userDocRef, {
          [`completedTutorials.${activeTutorial}`]: true
        });
        
        // Update local state
        setCompletedTutorials({
          ...completedTutorials,
          [activeTutorial]: true
        });
      } catch (error) {
        console.error('Error updating tutorial completion status:', error);
      }
    }
  };
  
  const value = {
    currentStep,
    stepData,
    activeTutorial,
    isTutorialActive,
    completedTutorials,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial
  };
  
  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
```

### 6. Tutorial Steps Data Format

```javascript
// In data/tutorialSteps.js
export const tutorialSteps = {
  // Dashboard tutorial steps
  dashboard: [
    {
      id: 'dashboard-overview',
      title: 'Welcome to InteriMed',
      content: 'This tutorial will guide you through the main features of the dashboard.',
      targetSelector: null, // No specific target for the welcome screen
      targetArea: 'content',
      tooltipPosition: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }
    },
    {
      id: 'sidebar-navigation',
      title: 'Sidebar Navigation',
      content: 'Use the sidebar to navigate between different sections of the app.',
      targetSelector: '.sidebar',
      targetArea: 'sidebar',
      tooltipPosition: { top: '20%', left: 'calc(250px + 20px)' }
    },
    {
      id: 'profile-section',
      title: 'Your Profile',
      content: 'Access and edit your profile information here.',
      targetSelector: 'a[href="/dashboard/profile"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '0', left: 'calc(250px + 20px)' }
    },
    // More dashboard tutorial steps...
  ],
  
  // Contracts tutorial steps
  contracts: [
    {
      id: 'contracts-overview',
      title: 'Contracts Overview',
      content: 'Manage all your contracts from this section.',
      targetSelector: '.contracts-header',
      targetArea: 'content',
      tooltipPosition: { top: '100px', left: '50%', transform: 'translateX(-50%)' }
    },
    // More contracts tutorial steps...
  ],
  
  // Additional tutorials for other features...
  messages: [
    // Message tutorial steps...
  ],
  
  calendar: [
    // Calendar tutorial steps...
  ]
};
```

## UI Components

### 1. Tutorial Overlay

The tutorial overlay is a semi-transparent layer that covers the entire application while highlighting specific UI elements. The overlay should:

- Dim areas not being highlighted
- Allow interaction only with highlighted elements
- Provide clear visual cues about which element is being explained
- Include navigation controls (next, previous, skip)

#### CSS Implementation

```css
/* In TutorialOverlay.module.css */
.sidebarOverlay,
.contentOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  pointer-events: none; /* Allow clicking through overlay */
}

.highlightBox {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  z-index: 1001;
  pointer-events: none; /* Allow clicking the highlighted element */
}

.tutorialTooltip {
  position: absolute;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 350px;
  z-index: 1002;
  pointer-events: auto; /* Make the tooltip clickable */
}

.actionButtons {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.prevButton,
.nextButton,
.skipButton {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.prevButton {
  background-color: #f3f4f6;
  color: #4b5563;
}

.nextButton {
  background-color: var(--primary-color);
  color: white;
}

.skipButton {
  background-color: transparent;
  color: #6b7280;
  text-decoration: underline;
}
```

### 2. Help Menu Button

A persistent help button should be added to the dashboard to allow users to access tutorials at any time:

```jsx
// In components/Header/Header.jsx
import { useTutorial } from '../../contexts/TutorialContext';
import { FiHelpCircle } from 'react-icons/fi';

const Header = () => {
  const { startTutorial } = useTutorial();
  
  return (
    <header className={styles.header}>
      {/* Existing header content */}
      
      <div className={styles.rightSection}>
        <button 
          className={styles.helpButton}
          onClick={() => startTutorial('dashboard')}
          title="Start tutorial"
        >
          <FiHelpCircle />
          <span>Help</span>
        </button>
        
        {/* Other header buttons */}
      </div>
    </header>
  );
};
```

## Integration Points

### 1. Dashboard Layout

```jsx
// In components/Layout/DashboardLayout.jsx
import { TutorialProvider } from '../../contexts/TutorialContext';
import { SidebarTutorial } from '../Tutorial/SidebarTutorial';
import { ContentTutorial } from '../Tutorial/ContentTutorial';

const DashboardLayout = ({ children }) => {
  return (
    <TutorialProvider>
      <div className={styles.dashboardContainer}>
        <Sidebar />
        <SidebarTutorial />
        
        <div className={styles.mainContent}>
          <Header />
          <main className={styles.contentArea}>
            {children}
          </main>
          <ContentTutorial />
        </div>
      </div>
    </TutorialProvider>
  );
};
```

### 2. Feature Components

Feature components should include data attributes to be targeted by the tutorial:

```jsx
// In features/Contracts/ContractsHeader.jsx
const ContractsHeader = () => {
  return (
    <div className={styles.header} data-tutorial="contracts-header">
      <h1>Contracts</h1>
      <p>Manage your employment contracts</p>
      
      <button 
        className={styles.createButton}
        data-tutorial="create-contract-button"
      >
        Create Contract
      </button>
    </div>
  );
};
```

## User Experience Considerations

### 1. Timing and Triggers

- The initial tutorial should start automatically after profile completion
- Feature-specific tutorials should be triggered on first visit to the feature
- Additional triggers:
  - After significant UI updates
  - When users access advanced features for the first time
  - On request through the help menu

### 2. Persistence

- Tutorial progress should be saved to allow users to resume later
- Completed tutorials should be marked and not shown again automatically
- Users should be able to revisit tutorials through the help menu

### 3. Accessibility

- All tutorial content should be screen reader friendly
- Keyboard navigation should be supported through the tutorial
- High contrast modes for better visibility
- Ability to increase text size in tooltips

## Implementation Phases

### Phase 1: Foundation

1. Create the `TutorialContext` system
2. Implement basic overlay and tooltip components
3. Define tutorial steps for the main dashboard
4. Add Firestore integration for tracking tutorial state

### Phase 2: Feature-Specific Tutorials

1. Implement tutorials for each major feature (Contracts, Messages, etc.)
2. Create a help menu for accessing tutorials
3. Add feature-specific tutorial triggers

### Phase 3: Advanced Interaction

1. Add interactive elements to tutorials (clickable areas, form completion)
2. Implement workflow-based tutorials for complex processes
3. Create customized tutorials based on user role

## Testing Strategy

1. **Functional Testing**:
   - Verify that tutorials display correctly on different screen sizes
   - Ensure navigation between steps works as expected
   - Confirm that tutorial state is saved correctly

2. **User Testing**:
   - Conduct user testing with new users
   - Gather feedback on tutorial clarity and usefulness
   - Measure time-to-competence for new users

3. **Regression Testing**:
   - Ensure tutorials don't interfere with normal application functionality
   - Verify that tutorials work correctly with future UI changes

## Conclusion

The InteriMed onboarding tutorial system provides a comprehensive, interactive guide for new users to quickly become familiar with the platform. By implementing this system, we will improve user adoption, reduce support requests, and enhance the overall user experience.

This implementation plan serves as a roadmap for developing a robust tutorial system that can evolve alongside the application's functionality. 