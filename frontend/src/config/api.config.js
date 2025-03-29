const API_CONFIG = {
    BASE_URL: 'http://localhost:5001',
    ENDPOINTS: {
        LISTINGS: '/api/listings',
        CHECK_EMAIL: '/api/users/check-email',
        USER_REGISTER: '/api/users/register',
        WORKERS_CREATE_EMPTY: '/api/workers/create-empty',
        MESSAGES_CREATE_EMPTY: '/api/messages/create-empty',
        JOBS_CREATE_EMPTY: '/api/jobs/create-empty',
        CONTRACTS_CREATE_EMPTY: '/api/contracts/create-empty',
        // Add any other endpoints you need
    }
};

// For backwards compatibility with existing code
export const API_BASE_URL = API_CONFIG.BASE_URL;
export const ENDPOINTS = API_CONFIG.ENDPOINTS;

export default API_CONFIG; 