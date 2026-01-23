import React from 'react';
import PropTypes from 'prop-types';
import { FiShare2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';

const ListingCard = ({ listing, onClick, viewMode = 'grid' }) => {
  const { t } = useTranslation(['marketplace']);
  const isJob = 'title' in listing;

  const formatLocation = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      const parts = [];
      if (location.city) parts.push(location.city);
      if (location.country) parts.push(location.country);
      return parts.join(', ');
    }
    return '';
  };

  if (isJob) {
    if (viewMode === 'list') {
      return (
        <div
          className="flex gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
          onClick={() => onClick(listing)}
          role="button"
          tabIndex="0"
          aria-label={`Job: ${listing.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClick(listing);
            }
          }}
        >
          <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
            {listing.image ? (
              <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                {listing.title?.[0] || 'J'}
              </div>
            )}
            <button
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <FiShare2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground mb-1 text-base">{listing.title}</h3>
            <p className="text-sm text-muted-foreground mb-1">{formatLocation(listing.location)}</p>
            <p className="text-sm text-muted-foreground mb-1">{listing.employer_name || t('marketplace:listingCard.company', 'Company')}</p>
            <p className="text-sm font-medium text-foreground">
              {listing.salary_range ? `${listing.salary_range}` : t('marketplace:listingCard.salaryNegotiable')}
            </p>
            {listing.requirements && listing.requirements.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {listing.requirements.slice(0, 2).map((req, index) => (
                  <span key={index} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-md">
                    {req}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer hover:shadow-md overflow-hidden"
        onClick={() => onClick(listing)}
        role="button"
        tabIndex="0"
        aria-label={`Job: ${listing.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick(listing);
          }
        }}
      >
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
          {listing.image ? (
            <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
              {listing.title?.[0] || 'J'}
            </div>
          )}
          <button
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <FiShare2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2">
          <h3 className="font-bold text-foreground text-base m-0">{listing.title}</h3>
          <p className="text-sm text-muted-foreground m-0">{formatLocation(listing.location)}</p>
          <p className="text-sm text-muted-foreground m-0">{listing.employer_name || t('marketplace:listingCard.company', 'Company')}</p>
          <p className="text-sm font-medium text-foreground m-0">
            {listing.salary_range ? `${listing.salary_range}` : t('marketplace:listingCard.salaryNegotiable')}
          </p>
          {listing.requirements && listing.requirements.length > 0 && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {listing.requirements.slice(0, 2).map((req, index) => (
                <span key={index} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-md">
                  {req}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div
        className="flex gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
        onClick={() => onClick(listing)}
        role="button"
        tabIndex="0"
        aria-label={t('marketplace:listingCard.pharmacistProfile', 'Pharmacist Profile')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick(listing);
          }
        }}
      >
        <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
          {listing.image ? (
            <img src={listing.image} alt={t('marketplace:listingCard.pharmacistProfile', 'Pharmacist Profile')} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
              P
            </div>
          )}
          <button
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <FiShare2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground mb-1 text-base">
            {listing.pharmacist_id ? `Pharmacist ${listing.pharmacist_id}` : t('marketplace:listingCard.availablePharmacist')}
          </h3>
          <p className="text-sm text-muted-foreground mb-1">{formatLocation(listing.preferred_location)}</p>
          <p className="text-sm text-muted-foreground mb-1">{t('marketplace:detailedCard.pharmacist')}</p>
          <p className="text-sm text-muted-foreground mb-1">
            {listing.specialties?.join(', ') || t('marketplace:listingCard.generalPractice')}
          </p>
          {listing.hourly_rate && (
            <p className="text-sm font-medium text-foreground mb-1">CHF {listing.hourly_rate}/hour</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-md font-medium",
              listing.verified
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
            )}>
              {listing.verified ? t('marketplace:detailedCard.verified') : t('marketplace:detailedCard.pending')}
            </span>
            {listing.specialties && listing.specialties.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {listing.specialties.slice(0, 2).map((specialty, index) => (
                  <span key={index} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-md">
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer hover:shadow-md overflow-hidden"
      onClick={() => onClick(listing)}
      role="button"
      tabIndex="0"
      aria-label="Pharmacist Profile"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(listing);
        }
      }}
    >
      <div className="relative w-full aspect-video bg-muted overflow-hidden">
        {listing.image ? (
          <img src={listing.image} alt="Pharmacist Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
            P
          </div>
        )}
        <button
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <FiShare2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-bold text-foreground text-base m-0">
          {listing.pharmacist_id ? `Pharmacist ${listing.pharmacist_id}` : t('marketplace:listingCard.availablePharmacist')}
        </h3>
        <p className="text-sm text-muted-foreground m-0">{formatLocation(listing.preferred_location)}</p>
        <p className="text-sm text-muted-foreground m-0">{t('marketplace:detailedCard.pharmacist')}</p>
        <p className="text-sm text-muted-foreground m-0">
          {listing.specialties?.join(', ') || t('marketplace:listingCard.generalPractice')}
        </p>
        {listing.hourly_rate && (
          <p className="text-sm font-medium text-foreground m-0">CHF {listing.hourly_rate}/hour</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "px-2 py-0.5 text-xs rounded-md font-medium",
            listing.verified
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
          )}>
            {listing.verified ? t('marketplace:detailedCard.verified') : t('marketplace:detailedCard.pending')}
          </span>
          {listing.specialties && listing.specialties.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {listing.specialties.slice(0, 2).map((specialty, index) => (
                <span key={index} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-md">
                  {specialty}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ListingCard.propTypes = {
  listing: PropTypes.shape({
    title: PropTypes.string,
    image: PropTypes.string,
    location: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    employer_name: PropTypes.string,
    salary_range: PropTypes.string,
    requirements: PropTypes.arrayOf(PropTypes.string),
    pharmacist_id: PropTypes.string,
    preferred_location: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    specialties: PropTypes.arrayOf(PropTypes.string),
    hourly_rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verified: PropTypes.bool
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  viewMode: PropTypes.oneOf(['grid', 'list'])
};

export default ListingCard; 
