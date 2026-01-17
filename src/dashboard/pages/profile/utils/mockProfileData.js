/**
 * Mock data for professional profile tabs.
 * Used for testing and development purposes.
 */

export const mockProfileData = {
    personalDetails: {
        identity: {
            legalFirstName: 'Jean',
            legalLastName: 'Dupont',
            dateOfBirth: '1985-06-15',
            nationality: 'CH',
            ahvNumber: '756.1234.5678.90'
        },
        contact: {
            residentialAddress: {
                street: 'Rue de la Gare',
                number: '42',
                postalCode: '1003',
                city: 'Lausanne',
                canton: 'VD',
                country: 'CH'
            },
            primaryPhonePrefix: '+41',
            primaryPhone: '79 123 45 67',
            primaryEmail: 'jean.dupont@example.com'
        }
    },

    professionalBackground: {
        education: [
            {
                degree: 'doctorate',
                institution: 'Université de Lausanne',
                field: 'Medicine',
                startDate: '2003-09-01',
                endDate: '2009-06-30',
                currentlyStudying: false,
                gpa: '5.5',
                honors: 'Magna Cum Laude'
            }
        ],
        workExperience: [
            {
                jobTitle: 'Chief Medical Officer',
                employer: 'Hôpital Universitaire de Genève',
                location: 'Geneva, Switzerland',
                startDate: '2015-03-01',
                current: true,
                description: 'Leading a team of 25 physicians in the emergency department.'
            },
            {
                jobTitle: 'Senior Resident',
                employer: 'Centre Hospitalier Universitaire Vaudois',
                location: 'Lausanne, Switzerland',
                startDate: '2010-07-01',
                endDate: '2015-02-28',
                current: false,
                description: 'Internal medicine and emergency care.'
            }
        ],
        qualifications: [
            {
                type: 'medical_license',
                title: 'FMH Specialist in Internal Medicine',
                institution: 'Swiss Medical Association (FMH)',
                licenseNumber: 'FMH-123456',
                dateObtained: '2012-06-15',
                validForLife: true,
                isVerified: true
            }
        ]
    },

    billingInformation: {
        employmentEligibility: {
            workPermit: {
                type: 'swiss_citizen',
                expiryDate: null,
                permitNumber: '',
                issuingCanton: ''
            }
        },
        payrollData: {
            numberOfChildren: 2,
            civilStatus: 'married',
            withholdingTaxInfo: {
                isSubject: false,
                taxCanton: ''
            },
            religion: 'none'
        },
        banking: {
            iban: 'CH9300762011623852957',
            bankName: 'UBS Switzerland AG',
            accountHolderName: 'Jean Dupont'
        }
    },

    settings: {
        platformSettings: {
            detailedAvailability: {
                availabilityType: ['full_time', 'on_call'],
                maxHoursPerWeek: 42,
                noticePeriodShortTerm: '24h',
                onCallPreferences: ['weekends', 'holidays'],
                longTermContractEarliestStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                notes: 'Available for emergency coverage on short notice.'
            },
            defaultMarketplaceRadius: 50,
            contractAutoApproval: {
                enabled: true,
                minimumHoursInAdvance: 48
            }
        },
        isActiveOnMarketplace: true,
        notificationPreferences: {
            email: true,
            push: true,
            sms: false,
            marketplaceUpdates: true,
            scheduleChanges: true,
            contractUpdates: true
        }
    },

    facilityCoreDetails: {
        facilityName: 'Pharmacie de la Navigation',
        facilityType: 'community_pharmacy',
        address: {
            street: 'Rue de la Navigation',
            number: '12',
            postalCode: '1201',
            city: 'Genève',
            canton: 'GE',
            country: 'CH'
        },
        mainPhoneNumber: '+41 22 732 25 25',
        mainEmail: 'info@pharmacie-navigation.ch',
        website: 'https://pharmacie-navigation.ch'
    },

    facilityLegalBilling: {
        legalEntityName: 'Pharmacie de la Navigation SA',
        uidNumber: 'CHE-123.456.789 MWST',
        commercialRegisterNumber: 'CH-660.1.234.567-8',
        legalRepresentative: {
            firstName: 'Marc',
            lastName: 'Müller',
            email: 'marc.mueller@pharmacie-navigation.ch',
            phone: '+41 78 987 65 43'
        },
        billingContact: {
            name: 'Comptabilité',
            email: 'compta@pharmacie-navigation.ch',
            phone: '+41 22 732 25 26'
        },
        facilityIBAN: 'CH12 0000 0000 0000 0000 0',
        facilityBankName: 'BCGE Genève'
    }
};

/**
 * Gets mock data for a specific tab.
 * @param {string} tabId - The tab identifier
 * @returns {object} Mock data for the specified tab
 */
export const getMockDataForTab = (tabId) => {
    return mockProfileData[tabId] || {};
};

/**
 * Gets all mock data combined.
 * @returns {object} Complete mock profile data
 */
export const getAllMockData = () => {
    return Object.keys(mockProfileData).reduce((acc, key) => {
        return { ...acc, ...mockProfileData[key] };
    }, {});
};

export default mockProfileData;
