import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiChevronUp, FiHelpCircle } from 'react-icons/fi';
import FilterBar from '../../components/filterBar/filterBar';
import { cn } from '../../../../utils/cn';

const FAQTab = () => {
  const { t } = useTranslation(['support', 'faq']);
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedItems, setExpandedItems] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [allFaqs, setAllFaqs] = useState([]);

  const categories = [
    { value: 'all', label: t('faq:allCategories', 'All Categories') },
    { value: 'general', label: t('faq:categoryLabels.general', 'General') },
    { value: 'pharmacies', label: t('faq:categoryLabels.pharmacies', 'For Facilities') },
    { value: 'professionals', label: t('faq:categoryLabels.professionals', 'For Professionals') },
    { value: 'compliance', label: t('faq:categoryLabels.compliance', 'Compliance & Regulations') },
    { value: 'pricing', label: t('faq:categoryLabels.pricing', 'Pricing & Billing') },
    { value: 'technical', label: t('faq:categoryLabels.technical', 'Technical Support') }
  ];

  useEffect(() => {
    const faqCategories = Object.keys(t('faq:categories', { returnObjects: true }));
    const loadedFaqs = [];

    faqCategories.forEach(category => {
      const questions = t(`faq:categories.${category}.questions`, { returnObjects: true });

      Object.keys(questions).forEach(key => {
        loadedFaqs.push({
          id: `${category}-${key}`,
          category,
          question: questions[key].question,
          answer: questions[key].answer
        });
      });
    });

    setAllFaqs(loadedFaqs);
    setFilteredFaqs(loadedFaqs.filter(faq => faq.category === activeCategory));
  }, [t, activeCategory]);

  useEffect(() => {
    let results = allFaqs;

    if (activeCategory !== 'all') {
      results = results.filter(faq => faq.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    setFilteredFaqs(results);
  }, [allFaqs, activeCategory, searchQuery]);

  const toggleItem = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFilterChange = (key, value) => {
    if (key === 'category') {
      setActiveCategory(value);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6">
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('faq:searchPlaceholder', 'Search questions...')}
        filters={{ category: activeCategory }}
        onFilterChange={handleFilterChange}
        dropdownFields={[
          {
            key: 'category',
            label: t('support:filters.category', 'Category'),
            options: categories,
            defaultValue: 'general'
          }
        ]}
        title={t('support:faq.filterTitle', 'Find Answers')}
        description={t('support:faq.filterDescription', 'Search our frequently asked questions')}
        showAdd={false}
        translationNamespace="support"
      />

      <div className="mt-6">
        {filteredFaqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FiHelpCircle className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('faq:noResults', 'No results found')}
            </h3>
            <p className="text-muted-foreground">
              {t('support:faq.noResultsHint', 'Try adjusting your search or category filter')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map(faq => (
              <div
                key={faq.id}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  className={cn(
                    "w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-base transition-colors",
                    expandedItems[faq.id] ? 'text-primary' : 'text-foreground hover:text-primary'
                  )}
                  onClick={() => toggleItem(faq.id)}
                >
                  <span className="pr-8">{faq.question}</span>
                  {expandedItems[faq.id] ? (
                    <FiChevronUp className="flex-shrink-0 w-5 h-5" />
                  ) : (
                    <FiChevronDown className="flex-shrink-0 w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {expandedItems[faq.id] && (
                  <div className="px-6 pb-4 pt-0 animate-in fade-in duration-200">
                    <p className="text-muted-foreground leading-relaxed border-t border-border pt-4">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQTab;

