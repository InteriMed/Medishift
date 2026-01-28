import Cookies from 'js-cookie';

export const WORKSPACE_TYPES = {
  PERSONAL: 'personal',
  FACILITY: 'facility',
  ORGANIZATION: 'organization',
  ADMIN: 'admin'
};

export const getSessionAuth = () => {
  const authToken = Cookies.get('authToken');
  const userId = Cookies.get('userId');

  return {
    authToken,
    userId,
    isAuthenticated: !!authToken && !!userId
  };
};

export const setSessionAuth = (authToken, userId) => {
  Cookies.set('authToken', authToken, { expires: 7 });
  Cookies.set('userId', userId, { expires: 7 });
};

export const clearSessionAuth = () => {
  Cookies.remove('authToken');
  Cookies.remove('userId');
};

export default { getSessionAuth, setSessionAuth, clearSessionAuth, WORKSPACE_TYPES };

