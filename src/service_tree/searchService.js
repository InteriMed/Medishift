import { actions, categories } from './actionIndex';
import { t as localT, getTranslation } from './locales';

const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const calculateScore = (action, searchTerms, translatedLabel, translatedDesc) => {
  let score = 0;
  const normalizedLabel = normalizeText(translatedLabel || '');
  const normalizedDesc = normalizeText(translatedDesc || '');
  const normalizedKeywords = action.keywords.map(normalizeText);

  for (const term of searchTerms) {
    const normalizedTerm = normalizeText(term);
    
    if (normalizedLabel.includes(normalizedTerm)) {
      score += normalizedLabel === normalizedTerm ? 100 : 50;
    }
    
    if (normalizedDesc.includes(normalizedTerm)) {
      score += 20;
    }
    
    for (const keyword of normalizedKeywords) {
      if (keyword === normalizedTerm) {
        score += 40;
      } else if (keyword.includes(normalizedTerm)) {
        score += 15;
      } else if (normalizedTerm.includes(keyword)) {
        score += 10;
      }
    }
    
    if (normalizeText(action.category).includes(normalizedTerm)) {
      score += 25;
    }
  }

  return score;
};

const resolveLabel = (action, lang) => {
  const [, category, key] = action.labelKey.split(/[:.]/);
  return localT(`${category}.${key}`, lang, action.id);
};

const resolveDescription = (action, lang) => {
  const [, category, key] = action.descriptionKey.split(/[:.]/);
  return localT(`${category}.${key}`, lang, '');
};

const resolveCategoryLabel = (categoryId, lang) => {
  return localT(`categories.${categoryId}`, lang, categoryId);
};

export const searchActions = (query, lang = 'en', options = {}) => {
  const { limit = 10, category = null, minScore = 5, workspace = null } = options;

  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length >= 2);

  if (searchTerms.length === 0) {
    return [];
  }

  let filteredActions = actions;
  
  if (workspace) {
    filteredActions = filteredActions.filter(action => 
      !action.workspace || action.workspace.includes(workspace)
    );
  }
  
  if (category) {
    filteredActions = filteredActions.filter(action => action.category === category);
  }

  const results = filteredActions
    .map(action => {
      const translatedLabel = resolveLabel(action, lang);
      const translatedDesc = resolveDescription(action, lang);
      const score = calculateScore(action, searchTerms, translatedLabel, translatedDesc);

      return {
        ...action,
        label: translatedLabel,
        description: translatedDesc,
        categoryLabel: resolveCategoryLabel(action.category, lang),
        score
      };
    })
    .filter(result => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
};

export const getActionsByCategory = (lang = 'en', categoryId = null, workspace = null) => {
  let categoryActions = categoryId 
    ? actions.filter(action => action.category === categoryId)
    : actions;
  
  if (workspace) {
    categoryActions = categoryActions.filter(action => 
      !action.workspace || action.workspace.includes(workspace)
    );
  }

  return categoryActions.map(action => ({
    ...action,
    label: resolveLabel(action, lang),
    description: resolveDescription(action, lang),
    categoryLabel: resolveCategoryLabel(action.category, lang)
  }));
};

export const getCategories = (lang = 'en') => {
  return Object.entries(categories).map(([id, category]) => ({
    id,
    label: resolveCategoryLabel(id, lang),
    icon: category.icon,
    color: category.color,
    count: actions.filter(a => a.category === id).length
  }));
};

export const getActionById = (actionId, lang = 'en') => {
  const action = actions.find(a => a.id === actionId);
  if (!action) return null;

  return {
    ...action,
    label: resolveLabel(action, lang),
    description: resolveDescription(action, lang),
    categoryLabel: resolveCategoryLabel(action.category, lang)
  };
};

export const getSuggestedActions = (lang = 'en', context = {}) => {
  const { route, recentActions = [], workspace = null } = context;
  
  let suggestions = [];
  let filteredActions = actions;
  
  if (workspace) {
    filteredActions = filteredActions.filter(action => 
      !action.workspace || action.workspace.includes(workspace)
    );
  }

  if (route) {
    suggestions = filteredActions
      .filter(action => action.route && route.startsWith(action.route.split('/').slice(0, 3).join('/')))
      .slice(0, 5);
  }

  if (suggestions.length < 5 && recentActions.length > 0) {
    const recentCategories = [...new Set(recentActions.map(id => {
      const action = filteredActions.find(a => a.id === id);
      return action?.category;
    }).filter(Boolean))];

    const relatedActions = filteredActions
      .filter(action => 
        recentCategories.includes(action.category) && 
        !recentActions.includes(action.id) &&
        !suggestions.find(s => s.id === action.id)
      )
      .slice(0, 5 - suggestions.length);

    suggestions = [...suggestions, ...relatedActions];
  }

  return suggestions.map(action => ({
    ...action,
    label: resolveLabel(action, lang),
    description: resolveDescription(action, lang),
    categoryLabel: resolveCategoryLabel(action.category, lang)
  }));
};

export const getSearchTranslations = (lang = 'en') => {
  const translations = getTranslation(lang);
  return translations.search || {};
};

export default {
  searchActions,
  getActionsByCategory,
  getCategories,
  getActionById,
  getSuggestedActions,
  getSearchTranslations
};
