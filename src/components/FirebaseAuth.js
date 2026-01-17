import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const FirebaseAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  const auth = getAuth();
  
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUser(user);
        setError(null);
      } else {
        setUser(null);
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [auth]);
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      setError(error.message);
    }
  };
  
  return (
    <div>
      <h2>Firebase Authentication</h2>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <form>
          <div>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button type="button" onClick={handleSignIn}>Sign In</button>
            <button type="button" onClick={handleSignUp}>Sign Up</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default FirebaseAuth; 