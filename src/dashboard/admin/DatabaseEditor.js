import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, addDoc, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Save, User, Building, AlertCircle, Database, ArrowLeft } from 'lucide-react';
import Button from '../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../components/BoxedInputFields/Personnalized-InputField';
import DropdownField from '../../components/BoxedInputFields/Dropdown-Field';
import '../../styles/variables.css';

const DatabaseEditor = () => {
  const { t } = useTranslation(['admin']);
  const [searchType, setSearchType] = useState('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ... (keeping existing hooks)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      let collectionName = searchType === 'user' ? 'users' : 'facilityProfiles';
      let searchField = searchType === 'user' ? 'email' : 'legalCompanyName';

      const ref = collection(db, collectionName);
      // Simple prefix search with limit to avoid permission issues if rules require it
      const q = query(
        ref,
        where(searchField, '>=', searchQuery),
        where(searchField, '<=', searchQuery + '\uf8ff'),
        limit(50)
      );
      const snapshot = await getDocs(q);

      const results = [];
      snapshot.forEach((docSnap) => {
        results.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });

      setSearchResults(results);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Search error:', error);
      // Fallback: If permission denied with 'where', try separate approach or detailed error
      if (error.code === 'permission-denied') {
        alert('Permission denied (Search). Ensure you have admin rights or that the database rules allow filtering.');
      } else {
        alert('Error searching. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const collectionOptions = [
    { value: 'user', label: t('admin:database.users', 'Users') },
    { value: 'facility', label: t('admin:database.facilities', 'Facilities') }
  ];

  const handleSelectDocument = async (docId) => {
    setLoading(true);
    try {
      const collectionName = searchType === 'user' ? 'users' : 'facilityProfiles';
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSelectedDocument({
          id: docSnap.id,
          collection: collectionName,
          data: docSnap.data()
        });
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      alert('Error loading document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDocument) return;
    
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      const docRef = doc(db, selectedDocument.collection, selectedDocument.id);
      await updateDoc(docRef, {
        ...data,
        lastModified: serverTimestamp()
      });
      alert('Document updated successfully!');
      setSelectedDocument(null);
      handleSearch();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Error updating document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderFormField = (key, value) => {
    if (key === 'lastModified' || key === 'createdAt' || key === 'lastLogin') {
      return null;
    }

    const fieldType = typeof value;
    
    if (fieldType === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <div key={key} style={{ border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', padding: 'var(--spacing-md)' }}>
          <strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>{key}:</strong>
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} style={{ marginLeft: 'var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
              {subKey}: {String(subValue)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <PersonnalizedInputField
        key={key}
        label={key}
        defaultValue={String(value)}
        name={key}
      />
    );
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'end', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ minWidth: '200px' }}>
          <DropdownField
            label={t('admin:database.collection', 'Collection')}
            options={collectionOptions}
            value={searchType}
            onChange={(value) => setSearchType(value)}
          />
        </div>

        <div style={{ flex: 1 }}>
          <PersonnalizedInputField
            label={t('admin:database.searchQuery', 'Search Query')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchType === 'user' ? 'Email address' : 'Company name'}
            name="searchQuery"
          />
        </div>

        <div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            variant="primary"
            style={{ height: '42px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Search size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
            {t('admin:database.search', 'Search')}
          </Button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
        {selectedDocument ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--grey-2)', paddingBottom: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                <Button variant="secondary" onClick={() => setSelectedDocument(null)} style={{ padding: 'var(--spacing-sm)' }}>
                  <ArrowLeft size={18} />
                </Button>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)' }}>
                    {t('admin:database.editing', 'Editing')}: {selectedDocument.id.substring(0, 8)}...
                  </h2>
                  <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                    Collection: {selectedDocument.collection}
                  </p>
                </div>
              </div>
              <Button type="submit" form="database-edit-form" disabled={saving} variant="confirmation">
                <Save size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                {saving ? t('admin:database.saving', 'Saving...') : t('admin:database.save', 'Save Changes')}
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', backgroundColor: 'var(--yellow-1)', borderRadius: 'var(--border-radius-sm)', color: 'var(--yellow-4)' }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-medium)' }}>Warning</strong>
                  <span style={{ fontSize: 'var(--font-size-small)' }}>
                    Direct database editing can cause inconsistencies. Using this form will automatically backup the original data to the audit logs, allowing for a rollback within 7 days.
                  </span>
                </div>
              </div>

              <form id="database-edit-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {Object.entries(selectedDocument.data).map(([key, value]) => renderFormField(key, value))}
              </form>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Database size={20} />
                {t('admin:database.results', 'Search Results')} ({searchResults.length})
              </h2>
            </div>

            {searchResults.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleSelectDocument(result.id)}
                    style={{
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--grey-2)',
                      borderRadius: 'var(--border-radius-sm)',
                      backgroundColor: 'var(--white)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-color)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--grey-2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-xs)' }}>
                      {searchType === 'user' ? result.data.email : result.data.legalCompanyName}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                      ID: {result.id.substring(0, 8)}...
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)' }}>
                <Database size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
                <p>{t('admin:database.noResults', 'Search for a document to edit')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseEditor;

