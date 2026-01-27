export const getInitialReportingFormData = () => ({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
    isAnonymous: false
});

export const getInitialInternalTicketFormData = () => ({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
});

export const resetReportingFormData = (setCreateFormData) => {
    setCreateFormData(getInitialReportingFormData());
};

export const resetInternalTicketFormData = (setCreateFormData) => {
    setCreateFormData(getInitialInternalTicketFormData());
};

export const handleCloseReportingPopup = (setIsCreateTicketOpen, setCreateFormData, isCreating) => {
    if (!isCreating) {
        setIsCreateTicketOpen(false);
        resetReportingFormData(setCreateFormData);
    }
};

export const handleCloseInternalTicketPopup = (setIsCreateTicketOpen, setCreateFormData, isCreating) => {
    if (!isCreating) {
        setIsCreateTicketOpen(false);
        resetInternalTicketFormData(setCreateFormData);
    }
};

export const isFormValid = (formData) => {
    return formData.subject?.trim() && formData.message?.trim();
};

