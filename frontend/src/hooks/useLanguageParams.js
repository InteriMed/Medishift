import { useParams } from 'react-router-dom';

export const useLanguageParams = () => {
  const { lang, ...otherParams } = useParams();
  return { lang: lang || 'en', ...otherParams };
}; 