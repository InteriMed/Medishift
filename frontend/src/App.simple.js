import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      console.log("Checking Firebase auth state...");
      const unsubscribe = auth.onAuthStateChanged(user => {
        console.log("Auth state changed:", user ? "User signed in" : "No user");
        setInitialized(true);
      }, error => {
        console.error("Auth state error:", error);
        setError(error.message);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up auth listener:", err);
      setError(err.message);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Firebase Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!initialized) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Firebase is working!</h1>
      <p>If you can see this, your Firebase configuration is correct.</p>
    </div>
  );
}

export default App; 