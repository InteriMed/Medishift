export const mergeOnboardingDocuments = (existingData, newData) => {
  if (!existingData && !newData) return {};
  if (!existingData) return newData;
  if (!newData) return existingData;

  return {
    ...existingData,
    ...newData,
    documents: {
      ...existingData.documents,
      ...newData.documents
    }
  };
};

export default mergeOnboardingDocuments;

