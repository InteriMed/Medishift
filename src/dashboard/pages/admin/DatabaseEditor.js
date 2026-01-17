import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Search, Save, User, Building, AlertCircle } from 'lucide-react';

const avsSchema = z.string().regex(/^756\.\d{4}\.\d{4}\.\d{2}$/, 'Invalid AVS format (must be 756.XXXX.XXXX.XX)');

const DatabaseEditor = () => {
  const { t } = useTranslation(['admin']);
  const [searchType, setSearchType] = useState('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm({
    resolver: zodResolver(z.object({
      avsNumber: z.string().optional().refine((val) => !val || avsSchema.safeParse(val).success, {
        message: 'Invalid AVS format'
      })
    }))
  });

  useEffect(() => {
    if (selectedDocument) {
      reset(selectedDocument.data);
    }
  }, [selectedDocument, reset]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      let collectionName = searchType === 'user' ? 'users' : 'facilityProfiles';
      let searchField = searchType === 'user' ? 'email' : 'legalCompanyName';
      
      const ref = collection(db, collectionName);
      const q = query(ref, where(searchField, '>=', searchQuery), where(searchField, '<=', searchQuery + '\uf8ff'));
      const snapshot = await getDocs(q);
      
      const results = [];
      snapshot.forEach((docSnap) => {
        results.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = async (docId) => {
    try {
      const collectionName = searchType === 'user' ? 'users' : 'facilityProfiles';
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSelectedDocument({
          id: docId,
          collection: collectionName,
          data: docSnap.data()
        });
      }
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Error loading document');
    }
  };

  const onSubmit = async (formData) => {
    if (!selectedDocument) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, selectedDocument.collection, selectedDocument.id);
      await updateDoc(docRef, {
        ...formData,
        updatedAt: serverTimestamp(),
        lastEditedBy: 'admin'
      });
      
      alert('Document updated successfully!');
      await handleSelectDocument(selectedDocument.id);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Error saving document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderFormField = (key, value, path = '') => {
    const fullPath = path ? `${path}.${key}` : key;
    const fieldValue = watch(fullPath) ?? value;
    
    if (typeof value === 'object' && value !== null && !(value instanceof Date) && !value.toDate) {
      return (
        <div key={key} className="space-y-2">
          <h4 className="font-medium text-sm">{key}</h4>
          <div className="pl-4 border-l-2 border-border space-y-2">
            {Object.entries(value).map(([subKey, subValue]) => renderFormField(subKey, subValue, fullPath))}
          </div>
        </div>
      );
    }
    
    if (key === 'ahvNumber' || key === 'avsNumber') {
      return (
        <div key={key} className="space-y-1">
          <label className="block text-sm font-medium">{key}</label>
          <input
            {...register(fullPath)}
            type="text"
            defaultValue={value}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="756.XXXX.XXXX.XX"
          />
          {errors[fullPath] && (
            <p className="text-sm text-red-3">{errors[fullPath].message}</p>
          )}
        </div>
      );
    }
    
    return (
      <div key={key} className="space-y-1">
        <label className="block text-sm font-medium">{key}</label>
        <input
          {...register(fullPath)}
          type="text"
          defaultValue={typeof value === 'string' ? value : JSON.stringify(value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin:database.title', 'Database Editor')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin:database.subtitle', 'Direct database editing for user and facility profiles')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-div-color rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">
            {t('admin:database.search', 'Search')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('admin:database.collection', 'Collection')}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('user')}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    searchType === 'user'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-border hover:bg-grey-1'
                  }`}
                >
                  <User size={18} className="inline mr-2" />
                  {t('admin:database.users', 'Users')}
                </button>
                <button
                  onClick={() => setSearchType('facility')}
                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                    searchType === 'facility'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-border hover:bg-grey-1'
                  }`}
                >
                  <Building size={18} className="inline mr-2" />
                  {t('admin:database.facilities', 'Facilities')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t('admin:database.searchQuery', 'Search Query')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={searchType === 'user' ? 'Email address' : 'Company name'}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">
                  {t('admin:database.results', 'Results')} ({searchResults.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectDocument(result.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedDocument?.id === result.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-white border-border hover:bg-grey-1'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {searchType === 'user'
                          ? result.data.email || result.id
                          : result.data.legalCompanyName || result.id}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {result.id.substring(0, 8)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-background-div-color rounded-lg p-6 border border-border">
          {selectedDocument ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {t('admin:database.editing', 'Editing')}: {selectedDocument.id.substring(0, 8)}...
                </h2>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-4 text-white rounded-lg hover:bg-green-3 transition-colors disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? t('admin:database.saving', 'Saving...') : t('admin:database.save', 'Save')}
                </button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(selectedDocument.data).map(([key, value]) => {
                  if (key === 'createdAt' || key === 'updatedAt' || key === 'lastLoginAt') {
                    return null;
                  }
                  return renderFormField(key, value);
                })}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-start gap-2 p-3 bg-yellow-1 rounded-lg">
                  <AlertCircle size={18} className="text-yellow-4 mt-0.5" />
                  <p className="text-sm text-yellow-4">
                    {t('admin:database.warning', 'Warning: Direct database editing can cause data inconsistencies. Use with caution.')}
                  </p>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('admin:database.selectDocument', 'Search and select a document to edit')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseEditor;

















