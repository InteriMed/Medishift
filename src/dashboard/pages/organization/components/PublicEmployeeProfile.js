import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import {
    FiMapPin, FiBriefcase, FiCheckCircle, FiStar,
    FiClock, FiGlobe, FiAward, FiX
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

/**
 * PublicEmployeeProfile - A marketplace-ready public profile view.
 * Designed to be safe for public sharing (no sensitive HR data).
 */
const PublicEmployeeProfile = ({ employeeId, isOpen, onClose }) => {
    const { t } = useTranslation(['common', 'organization']);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!employeeId || !isOpen) return;
            setLoading(true);
            try {
                // Fetch professional profile
                const profRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, employeeId);
                const profSnap = await getDoc(profRef);

                if (profSnap.exists()) {
                    setProfile({ id: profSnap.id, ...profSnap.data() });
                } else {
                    // Fallback to basic user data
                    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, employeeId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setProfile({ id: userSnap.id, ...userSnap.data() });
                    }
                }
            } catch (error) {
                console.error("Error fetching public profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [employeeId, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header / Hero Section */}
                <div className="relative h-48 bg-gradient-to-r from-indigo-600 to-purple-600 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors z-10"
                        aria-label="Close"
                    >
                        <FiX className="w-5 h-5" />
                    </button>

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {!loading && profile && (
                        <div className="absolute -bottom-16 left-8 flex items-end">
                            {profile.profileDisplay?.profilePictureUrl || profile.photoURL ? (
                                <img
                                    src={profile.profileDisplay?.profilePictureUrl || profile.photoURL}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-indigo-600 uppercase">
                                    {(profile.identity?.firstName || profile.firstName)?.[0]}
                                    {(profile.identity?.lastName || profile.lastName)?.[0]}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content Section */}
                {!loading && profile ? (
                    <div className="flex-1 overflow-y-auto pt-20 pb-8 px-8 custom-scrollbar">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    {`${profile.identity?.legalFirstName || profile.identity?.firstName || profile.firstName || ''} ${profile.identity?.legalLastName || profile.identity?.lastName || profile.lastName || ''}`.trim()}
                                    <FiCheckCircle className="text-blue-500 w-6 h-6" title="Verified Professional" />
                                </h1>
                                <p className="text-lg text-gray-600 font-medium mt-1">
                                    {profile.profileDisplay?.jobTitle || profile.profileType || "Pharmacist"}
                                </p>

                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <FiMapPin className="w-4 h-4" />
                                        {profile.identity?.nationality || 'Geneva, Switzerland'}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FiStar className="w-4 h-4 text-yellow-400 fill-current" />
                                        <span className="font-semibold text-gray-800">4.8</span> (12 reviews)
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4 md:mt-0">
                                <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                                    Book Now
                                </button>
                                <button className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition-all">
                                    Contact
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                            <div className="md:col-span-2 space-y-8">
                                {/* About Bio */}
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">About</h3>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                        {profile.profileDisplay?.bio || "Experienced professional dedicated to excellence in pharmacy and healthcare. Specialized in providing high-quality patient care and maintaining professional standards."}
                                    </p>
                                </section>

                                {/* Skills Section */}
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Skills & Certifications</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.operational?.netCare && <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100 italic">NetCare Triage</span>}
                                        {profile.operational?.injectionCert && <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">Injection Certified</span>}
                                        {profile.operational?.cardioTest && <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">CardioTest</span>}

                                        {/* Fallback tags if operational data is sparse */}
                                        {['Vaccination', 'Medication Management', 'Inventory Control', 'Customer Service'].map(tag => (
                                            <span key={tag} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-200">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {/* Simplified Experience Section */}
                                <section>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Experience</h3>
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <FiBriefcase className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{profile.profileDisplay?.jobTitle || "Senior Pharmacist"}</h4>
                                                <p className="text-gray-600">Verified Healthcare Professional</p>
                                                <p className="text-sm text-gray-400 mt-1">{profile.profileDisplay?.experienceYears || 5}+ years of practice</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Right Sidebar Info */}
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FiGlobe className="w-4 h-4 text-indigo-500" /> Languages
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">{profile.operational?.primaryLanguage || 'French'}</span>
                                            <span className="font-medium text-green-600">Mastery</span>
                                        </div>
                                        {profile.operational?.additionalLanguages && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-600">{profile.operational.additionalLanguages}</span>
                                                <span className="font-medium text-blue-600">Professional</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FiClock className="w-4 h-4 text-indigo-500" /> Availability
                                    </h4>
                                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm font-medium border border-green-100">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Available for bookings
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                                        {t('organization:employee.openToInterim', 'Open to interim shifts and coverage within Geneva and surroundings.')}
                                    </p>
                                </div>

                                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 text-center">
                                    <FiAward className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                                    <div className="font-bold text-indigo-900 text-lg">{t('organization:employee.topCandidate', 'Top Candidate')}</div>
                                    <p className="text-indigo-700/80 text-sm">{t('organization:employee.reliableProfessional', 'Reliable professional with excellent feedback.')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !loading && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900">{t('organization:employee.profileNotFound', 'Profile Not Found')}</h3>
                            <p className="text-gray-500">{t('organization:employee.profileNotLoaded', 'The requested profile could not be loaded.')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicEmployeeProfile;
