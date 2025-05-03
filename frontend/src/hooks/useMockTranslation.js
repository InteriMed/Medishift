// A simple mock for the useTranslation hook
export const useMockTranslation = () => {
  return {
    t: key => key,
    i18n: {
      language: 'en',
      changeLanguage: () => Promise.resolve()
    }
  };
}; 