export const initialState = {
    isTutorialActive: false,
    activeTutorial: 'dashboard',
    currentStep: 0,
    tutorialMode: 'onboarding',
    onboardingType: 'professional',
    isPaused: false,
    isWaitingForSave: false,
    isReady: false,
    showFirstTimeModal: false,
    showTutorialSelectionModal: false,
    stepData: null,
    isBusy: false
};

export const ACTIONS = {
    SET_BUSY: 'SET_BUSY',
    SET_READY: 'SET_READY',
    START_TUTORIAL: 'START_TUTORIAL',
    STOP_TUTORIAL: 'STOP_TUTORIAL',
    COMPLETE_TUTORIAL: 'COMPLETE_TUTORIAL',
    SET_STEP: 'SET_STEP',
    SET_STEP_DATA: 'SET_STEP_DATA',
    SET_PAUSED: 'SET_PAUSED',
    SET_WAITING_FOR_SAVE: 'SET_WAITING_FOR_SAVE',
    SET_FIRST_TIME_MODAL: 'SET_FIRST_TIME_MODAL',
    SET_SELECTION_MODAL: 'SET_SELECTION_MODAL',
    SET_ONBOARDING_TYPE: 'SET_ONBOARDING_TYPE',
    RESET: 'RESET'
};

export function tutorialReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_BUSY:
            return { ...state, isBusy: action.payload };
        case ACTIONS.SET_READY:
            return { ...state, isReady: action.payload };
        case ACTIONS.START_TUTORIAL:
            return {
                ...state,
                activeTutorial: action.payload.feature,
                currentStep: action.payload.step || 0,
                tutorialMode: action.payload.mode || 'full',
                isTutorialActive: true,
                showFirstTimeModal: false,
                isPaused: false
            };
        case ACTIONS.COMPLETE_TUTORIAL:
        case ACTIONS.STOP_TUTORIAL:
            return {
                ...state,
                isTutorialActive: false,
                activeTutorial: null,
                isPaused: false,
                stepData: null
            };
        case ACTIONS.SET_STEP:
            return { ...state, currentStep: action.payload };
        case ACTIONS.SET_STEP_DATA:
            return { ...state, stepData: action.payload };
        case ACTIONS.SET_PAUSED:
            return { ...state, isPaused: action.payload, isTutorialActive: !action.payload };
        case ACTIONS.SET_WAITING_FOR_SAVE:
            return { ...state, isWaitingForSave: action.payload };
        case ACTIONS.SET_FIRST_TIME_MODAL:
            return { ...state, showFirstTimeModal: action.payload };
        case ACTIONS.SET_SELECTION_MODAL:
            return { ...state, showTutorialSelectionModal: action.payload };
        case ACTIONS.SET_ONBOARDING_TYPE:
            return { ...state, onboardingType: action.payload };
        case ACTIONS.RESET:
            return { ...initialState, isReady: state.isReady };
        default:
            return state;
    }
}
