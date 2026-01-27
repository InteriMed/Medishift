import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp as app } from './firebaseService';
import { DEFAULT_VALUES } from '../config/keysDatabase';

const functions = getFunctions(app, DEFAULT_VALUES.FIREBASE_REGION);

export const analyzeTeamOrganigram = async (roles, employees, adminRightsHierarchy) => {
  try {
    const analyzeOrganigram = httpsCallable(functions, 'analyzeTeamOrganigram');

    const result = await analyzeOrganigram({
      roles,
      employees,
      adminRightsHierarchy
    });

    return result.data;
  } catch (error) {
    console.error('Team Organigram Analysis Error:', error);
    
    let errorMessage = error.message || 'Unknown error';
    if (error.code === 'functions/unavailable') {
      errorMessage = 'Service temporarily unavailable. Please try again later.';
    } else if (error.code === 'functions/deadline-exceeded') {
      errorMessage = 'Request timed out. Please try again with less data.';
    } else if (error.code === 'functions/internal') {
      errorMessage = 'Internal server error. Please contact support if this persists.';
    }
    
    return {
      success: false,
      error: errorMessage,
      graphData: null
    };
  }
};

