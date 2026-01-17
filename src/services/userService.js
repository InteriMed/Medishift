import { db, storage, auth } from './firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from 'firebase/auth';

const userService = {
  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   */
  getUserProfile: async (userId) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   */
  updateUserProfile: async (userId, userData) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      // Remove any fields that should not be updated
      const { id, createdAt, email, ...updatableData } = userData;
      
      await updateDoc(userDocRef, {
        ...updatableData,
        updatedAt: serverTimestamp()
      });
      
      // Get the updated document
      const updatedDoc = await getDoc(userDocRef);
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {Object} passwordData - Object containing old and new passwords
   */
  changePassword: async (passwordData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.oldPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Change password
      await updatePassword(currentUser, passwordData.newPassword);
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  /**
   * Upload profile picture
   * @param {File} file - The image file to upload
   */
  uploadProfilePicture: async (file) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Create a storage reference
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}/${file.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update user profile with new photo URL
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
        updatedAt: serverTimestamp()
      });
      
      return { success: true, photoURL: downloadURL };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },
  
  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   */
  searchUsers: async (searchTerm) => {
    try {
      if (!searchTerm || searchTerm.length < 3) {
        return [];
      }
      
      // Firestore doesn't support direct partial string searches
      // For a production app, consider using Algolia or another search solution
      const usersRef = collection(db, 'users');
      const nameStartsWithQuery = query(
        usersRef, 
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff')
      );
      
      const snapshot = await getDocs(nameStartsWithQuery);
      const results = [];
      
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
};

export default userService; 