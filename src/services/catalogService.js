import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '../config/keysDatabase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  limit
} from 'firebase/firestore';

const catalogService = {
  SEARCH_ORGANIZATIONS: async (searchTerm, options = {}) => {
    try {
      const { limitResults = 20, filters = {} } = options;
      
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      const organizationsRef = collection(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS);
      const searchLower = searchTerm.toLowerCase();
      
      const queries = [];
      
      if (filters.organizationType) {
        queries.push(
          query(
            organizationsRef,
            where('organizationDetails.organizationType', '==', filters.organizationType),
            orderBy('organizationDetails.name'),
            limit(limitResults)
          )
        );
      } else {
        queries.push(
          query(
            organizationsRef,
            orderBy('organizationDetails.name'),
            limit(limitResults)
          )
        );
      }

      const results = [];
      const seenIds = new Set();

      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (seenIds.has(doc.id)) return;
          
          const data = doc.data();
          const name = data.organizationDetails?.name || data.organizationName || '';
          const additionalName = data.organizationDetails?.additionalName || data.additionalName || '';
          const gln = data.organizationDetails?.glnCompany || '';
          
          const searchableText = `${name} ${additionalName} ${gln}`.toLowerCase();
          
          if (searchableText.includes(searchLower)) {
            results.push({
              id: doc.id,
              type: 'organization',
              name: name,
              additionalName: additionalName,
              organizationType: data.organizationDetails?.organizationType || data.organizationType,
              gln: gln,
              ...data
            });
            seenIds.add(doc.id);
          }
        });
      }

      return results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (!aName.startsWith(searchLower) && bName.startsWith(searchLower)) return 1;
        return aName.localeCompare(bName);
      });
    } catch (error) {
      console.error('Error searching organizations:', error);
      throw error;
    }
  },

  GET_ORGANIZATION: async (organizationId) => {
    try {
      const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, organizationId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }
      
      return {
        id: orgDoc.id,
        type: 'organization',
        ...orgDoc.data()
      };
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  },

  GET_ORGANIZATION_FACILITIES: async (organizationId) => {
    try {
      const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, organizationId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }
      
      const orgData = orgDoc.data();
      const facilitiesMap = orgData.facilities || {};
      const facilityIds = Object.keys(facilitiesMap);
      
      if (facilityIds.length === 0) {
        return [];
      }

      const facilities = [];
      for (const facilityId of facilityIds) {
        try {
          const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
          const facilityDoc = await getDoc(facilityRef);
          
          if (facilityDoc.exists()) {
            const facilityData = facilityDoc.data();
            facilities.push({
              id: facilityId,
              type: 'facility',
              name: facilityData.facilityDetails?.name || facilityData.facilityName,
              ...facilityData,
              organizationMetadata: facilitiesMap[facilityId]
            });
          }
        } catch (err) {
          console.warn(`Error fetching facility ${facilityId}:`, err);
        }
      }
      
      return facilities;
    } catch (error) {
      console.error('Error fetching organization facilities:', error);
      throw error;
    }
  },

  SEARCH_PROFESSIONALS: async (searchTerm, options = {}) => {
    try {
      const { limitResults = 20, filters = {} } = options;
      
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      const professionalsRef = collection(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES);
      const searchLower = searchTerm.toLowerCase();
      
      const queries = [];
      
      queries.push(
        query(
          professionalsRef,
          orderBy('professionalDetails.lastName'),
          limit(limitResults * 2)
        )
      );

      const results = [];
      const seenIds = new Set();

      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (seenIds.has(doc.id)) return;
          
          const data = doc.data();
          const firstName = data.professionalDetails?.firstName || '';
          const lastName = data.professionalDetails?.lastName || '';
          const email = data.contact?.email || '';
          const gln = data.professionalDetails?.gln || '';
          
          const searchableText = `${firstName} ${lastName} ${email} ${gln}`.toLowerCase();
          
          if (searchableText.includes(searchLower)) {
            if (filters.specialty && data.professionalDetails?.specialties) {
              const specialties = Array.isArray(data.professionalDetails.specialties)
                ? data.professionalDetails.specialties
                : [];
              if (!specialties.some(s => s.toLowerCase().includes(filters.specialty.toLowerCase()))) {
                return;
              }
            }

            if (filters.qualification && data.professionalDetails?.qualifications) {
              const qualifications = Array.isArray(data.professionalDetails.qualifications)
                ? data.professionalDetails.qualifications
                : [];
              if (!qualifications.some(q => 
                q.name?.toLowerCase().includes(filters.qualification.toLowerCase()) ||
                q.type?.toLowerCase().includes(filters.qualification.toLowerCase())
              )) {
                return;
              }
            }

            results.push({
              id: doc.id,
              type: 'professional',
              firstName: firstName,
              lastName: lastName,
              fullName: `${firstName} ${lastName}`.trim(),
              email: email,
              gln: gln,
              specialties: data.professionalDetails?.specialties || [],
              qualifications: data.professionalDetails?.qualifications || [],
              ...data
            });
            seenIds.add(doc.id);
          }
        });
      }

      return results
        .sort((a, b) => {
          const aName = a.fullName.toLowerCase();
          const bName = b.fullName.toLowerCase();
          if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
          if (!aName.startsWith(searchLower) && bName.startsWith(searchLower)) return 1;
          return aName.localeCompare(bName);
        })
        .slice(0, limitResults);
    } catch (error) {
      console.error('Error searching professionals:', error);
      throw error;
    }
  },

  GET_PROFESSIONAL: async (professionalId) => {
    try {
      const profRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, professionalId);
      const profDoc = await getDoc(profRef);
      
      if (!profDoc.exists()) {
        throw new Error('Professional not found');
      }
      
      const data = profDoc.data();
      return {
        id: profDoc.id,
        type: 'professional',
        firstName: data.professionalDetails?.firstName || '',
        lastName: data.professionalDetails?.lastName || '',
        fullName: `${data.professionalDetails?.firstName || ''} ${data.professionalDetails?.lastName || ''}`.trim(),
        ...data
      };
    } catch (error) {
      console.error('Error fetching professional:', error);
      throw error;
    }
  },

  SEARCH_FACILITIES: async (searchTerm, options = {}) => {
    try {
      const { limitResults = 20, filters = {} } = options;
      
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      const facilitiesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const searchLower = searchTerm.toLowerCase();
      
      const queries = [];
      
      if (filters.facilityType) {
        queries.push(
          query(
            facilitiesRef,
            where('facilityDetails.facilityType', '==', filters.facilityType),
            orderBy('facilityDetails.name'),
            limit(limitResults)
          )
        );
      } else {
        queries.push(
          query(
            facilitiesRef,
            orderBy('facilityDetails.name'),
            limit(limitResults * 2)
          )
        );
      }

      const results = [];
      const seenIds = new Set();

      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          if (seenIds.has(doc.id)) return;
          
          const data = doc.data();
          const name = data.facilityDetails?.name || data.facilityName || '';
          const additionalName = data.facilityDetails?.additionalName || '';
          const gln = data.facilityDetails?.gln || '';
          
          const searchableText = `${name} ${additionalName} ${gln}`.toLowerCase();
          
          if (searchableText.includes(searchLower)) {
            if (filters.canton && data.facilityDetails?.address?.canton) {
              if (data.facilityDetails.address.canton.toLowerCase() !== filters.canton.toLowerCase()) {
                return;
              }
            }

            results.push({
              id: doc.id,
              type: 'facility',
              name: name,
              additionalName: additionalName,
              facilityType: data.facilityDetails?.facilityType || data.facilityType,
              gln: gln,
              address: data.facilityDetails?.address,
              ...data
            });
            seenIds.add(doc.id);
          }
        });
      }

      return results
        .sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
          if (!aName.startsWith(searchLower) && bName.startsWith(searchLower)) return 1;
          return aName.localeCompare(bName);
        })
        .slice(0, limitResults);
    } catch (error) {
      console.error('Error searching facilities:', error);
      throw error;
    }
  },

  GET_FACILITY: async (facilityId) => {
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilityDoc = await getDoc(facilityRef);
      
      if (!facilityDoc.exists()) {
        throw new Error('Facility not found');
      }
      
      const data = facilityDoc.data();
      return {
        id: facilityDoc.id,
        type: 'facility',
        name: data.facilityDetails?.name || data.facilityName,
        ...data
      };
    } catch (error) {
      console.error('Error fetching facility:', error);
      throw error;
    }
  },

  SEARCH_ALL: async (searchTerm, options = {}) => {
    try {
      const { limitPerType = 10 } = options;
      
      const [organizations, professionals, facilities] = await Promise.all([
        this.SEARCH_ORGANIZATIONS(searchTerm, { limitResults: limitPerType, filters: options.filters || {} }),
        this.SEARCH_PROFESSIONALS(searchTerm, { limitResults: limitPerType, filters: options.filters || {} }),
        this.SEARCH_FACILITIES(searchTerm, { limitResults: limitPerType, filters: options.filters || {} })
      ]);

      return {
        organizations,
        professionals,
        facilities,
        total: organizations.length + professionals.length + facilities.length
      };
    } catch (error) {
      console.error('Error searching catalog:', error);
      throw error;
    }
  }
};

export default catalogService;

