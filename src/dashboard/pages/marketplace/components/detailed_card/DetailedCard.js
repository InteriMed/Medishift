import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { FiX, FiMapPin, FiClock, FiDollarSign, FiBriefcase, FiCalendar } from 'react-icons/fi';
import pharmacyBase from '../../assets/pharmacy_base.svg';

const DetailedCard = ({ listing, onClose }) => {
  const { t, i18n } = useTranslation();
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (listing) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [listing]);

  if (!listing) return null;

  const isJob = 'title' in listing;
  const defaultImage = pharmacyBase;

  // Reuse the formatLocation logic from card.js
  const formatLocation = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location !== 'object' || location === null) return '';

    try {
      if (location.address) {
        const address = location.address;
        if (typeof address === 'string') return address;
        if (typeof address === 'object' && address !== null) {
          if (address.address) {
            if (typeof address.address === 'string') return address.address;
            if (typeof address.address === 'object' && address.address !== null) {
              const nestedParts = [address.address.street, address.address.city, address.address.canton, address.address.country].filter(Boolean);
              if (nestedParts.length > 0) return nestedParts.join(', ');
            }
          }
          const parts = [address.street, address.city, address.canton, address.country].filter(Boolean);
          if (parts.length > 0) return parts.join(', ');
        }
      }
      const parts = [];
      if (location.city && typeof location.city === 'string') parts.push(location.city);
      if (location.canton && typeof location.canton === 'string') parts.push(location.canton);
      if (location.country && typeof location.country === 'string') parts.push(location.country);
      if (parts.length > 0) return parts.join(', ');

      return '';
    } catch (error) {
      console.error('Error formatting location:', error, location);
      return '';
    }
  };

  const formatPreferredLocation = (preferred_location) => {
    if (!preferred_location) return '';
    if (typeof preferred_location === 'string') return preferred_location;
    if (typeof preferred_location !== 'object' || preferred_location === null) return '';

    try {
      if (preferred_location.address) {
        const address = preferred_location.address;
        if (typeof address === 'string') return address;
        if (typeof address === 'object' && address !== null) {
          if (address.address) {
            if (typeof address.address === 'string') return address.address;
            if (typeof address.address === 'object' && address.address !== null) {
              const nestedParts = [address.address.street, address.address.city, address.address.canton, address.address.country].filter(Boolean);
              if (nestedParts.length > 0) return nestedParts.join(', ');
            }
          }
          const parts = [address.street, address.city, address.canton, address.country].filter(Boolean);
          if (parts.length > 0) return parts.join(', ');
        }
      }
      if (preferred_location.locationPreference) {
        const preference = preferred_location.locationPreference;
        if (typeof preference === 'string') return preference;
        if (typeof preference === 'object' && preference !== null) {
          const parts = [preference.city, preference.canton, preference.country].filter(Boolean);
          if (parts.length > 0) return parts.join(', ');
        }
      }
      const parts = [];
      if (preferred_location.city && typeof preferred_location.city === 'string') parts.push(preferred_location.city);
      if (preferred_location.canton && typeof preferred_location.canton === 'string') parts.push(preferred_location.canton);
      if (preferred_location.country && typeof preferred_location.country === 'string') parts.push(preferred_location.country);
      if (parts.length > 0) return parts.join(', ');
      return '';
    } catch (error) {
      console.error('Error formatting preferred location:', error, preferred_location);
      return '';
    }
  };

  const location = isJob
    ? String(formatLocation(listing.location) || '')
    : String(formatPreferredLocation(listing.preferred_location) || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
      style={{ zIndex: 1050 }}
    >
      <div
        className="bg-card w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col relative transform transition-all duration-300 animate-in slide-in-from-bottom-4 shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <FiX className="w-5 h-5 text-foreground" />
        </button>

        {/* Header with Image */}
        <div className="relative h-48 w-full overflow-hidden bg-muted rounded-t-xl">
          <img
            src={listing.image || defaultImage}
            alt={isJob ? listing.title : 'Pharmacist Profile'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 192px)' }}>
          {/* Title and Status */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-bold text-foreground m-0 p-0" style={{ fontSize: '16px' }}>
                {isJob ? listing.title : `Pharmacist ${listing.pharmacist_id || ''}`}
              </h2>
              {isJob ? (
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase shrink-0 ${listing.status === 'Open'
                  ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
                  }`}>
                  {listing.status || t('marketplace:detailedCard.open')}
                </span>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border shrink-0 ${listing.verified
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                  }`}>
                  {listing.verified ? t('marketplace:detailedCard.verified') : t('marketplace:detailedCard.pending')}
                </span>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <FiMapPin className="w-4 h-4" />
              <span className="text-sm m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{location || t('marketplace:detailedCard.locationNotSpecified')}</span>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border border-border">
            {isJob ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiBriefcase className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.type')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{listing.type || t('marketplace:detailedCard.fullTime')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiDollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.salary')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    {listing.salary ? `CHF ${listing.salary}/h` : t('marketplace:detailedCard.negotiable')}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.startDate')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{listing.start_date || t('marketplace:detailedCard.immediate')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiClock className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.workingHours')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{listing.working_hours || t('marketplace:detailedCard.fullTime')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiBriefcase className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.profession')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{t('marketplace:detailedCard.pharmacist')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiDollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.hourlyRate')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    {listing.hourly_rate ? `CHF ${listing.hourly_rate}/h` : t('marketplace:detailedCard.negotiable')}
                  </p>
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-xs font-medium">{t('marketplace:detailedCard.availability')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>{listing.availability || t('marketplace:detailedCard.flexible')}</p>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground m-0 p-0" style={{ fontSize: '16px' }}>
                {isJob ? t('marketplace:detailedCard.jobDescription') : t('marketplace:detailedCard.about')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap m-0 py-0" style={{ paddingLeft: 0, paddingRight: 0 }}>
                {listing.description}
              </p>
            </div>
          )}

          {/* Requirements or Specialties */}
          {isJob ? (
            listing.requirements?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground m-0 p-0" style={{ fontSize: '16px' }}>{t('marketplace:detailedCard.requirements')}</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.requirements.map((req, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10 text-sm font-medium"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              </div>
            )
          ) : (
            listing.specialties?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground m-0 p-0" style={{ fontSize: '16px' }}>{t('marketplace:detailedCard.specialties')}</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10 text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Terms Agreement Checkbox */}
          <div className="flex items-start gap-3 pt-4 border-t border-border">
            <input
              type="checkbox"
              id="terms-agreement"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="terms-agreement" className="text-sm text-muted-foreground">
              {/* J'ai lu et j'accepte les <a href={`/${i18n.language}/terms-of-service`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Conditions Générales d'Utilisation (CGU)</a> */}
              <span dangerouslySetInnerHTML={{ __html: t('marketplace:detailedCard.agreement').replace('<1>', `<a href="/${i18n.language}/terms-of-service" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">`).replace('</1>', '</a>') }} />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex pt-2">
            <button
              className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${termsAccepted
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              disabled={!termsAccepted}
            >
              {isJob ? t('marketplace:detailedCard.applyForPosition') : t('marketplace:detailedCard.contactPharmacist')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

DetailedCard.propTypes = {
  listing: PropTypes.shape({
    image: PropTypes.string,
    title: PropTypes.string,
    pharmacist_id: PropTypes.string,
    status: PropTypes.string,
    verified: PropTypes.bool,
    type: PropTypes.string,
    salary: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    start_date: PropTypes.string,
    working_hours: PropTypes.string,
    hourly_rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    availability: PropTypes.string,
    description: PropTypes.string,
    requirements: PropTypes.arrayOf(PropTypes.string),
    specialties: PropTypes.arrayOf(PropTypes.string),
    location: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    preferred_location: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
  }),
  onClose: PropTypes.func.isRequired
};

export default DetailedCard;
