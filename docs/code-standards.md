# Code Standards

## File & Directory Structure

- `components/`: Reusable UI components
  - Component names should be PascalCase
  - Each component should have its own directory with:
    - `ComponentName.js`: Component implementation
    - `ComponentName.css`: Component styles (if needed)
    - `ComponentName.test.js`: Component tests
    - `index.js`: Export file

- `pages/`: Page components
  - Follow same structure as components

- `contexts/`: React context providers
- `hooks/`: Custom React hooks
- `services/`: Firebase and API service integration
- `utils/`: Helper functions and utilities
- `assets/`: Static assets like images, icons, etc.
- `styles/`: Global styles and theme definitions

## Naming Conventions

- **Files & Components**: PascalCase (e.g., `UserProfile.js`)
- **Directories**: camelCase (e.g., `userAuth/`)
- **Functions**: camelCase (e.g., `fetchUserData()`)
- **CSS Classes**: kebab-case (e.g., `user-profile-container`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

## Component Structure

```jsx
// Imports
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ComponentName.css';

// Component definition
const ComponentName = ({ prop1, prop2 }) => {
  // State and hooks
  const [state, setState] = useState(initialState);
  
  // Effects
  useEffect(() => {
    // Side effects here
  }, [dependencies]);
  
  // Helper functions
  const handleEvent = () => {
    // Event handling
  };
  
  // JSX rendering
  return (
    <div className="component-name">
      {/* Component content */}
    </div>
  );
};

// PropTypes
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

// Default props
ComponentName.defaultProps = {
  prop2: 0,
};

export default ComponentName;
```

## Firebase Best Practices

- Use environment variables for Firebase config
- Implement proper error handling for all Firebase operations
- Use security rules to protect data
- Structure Firestore collections efficiently
- Implement proper authentication state management 