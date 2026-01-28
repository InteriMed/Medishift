export const getAllMockData = () => {
  return {
    personalDetails: {},
    professionalBackground: {},
    billingInformation: {},
    documents: {},
    settings: {}
  };
};

export const getMockDataForTab = (tabId) => {
  const allData = getAllMockData();
  return allData[tabId] || {};
};

export default { getAllMockData, getMockDataForTab };

