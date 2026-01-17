const trackEvent = (eventName, properties = {}) => {
  if (window.analytics) {
    window.analytics.track(eventName, properties);
  } else {
    console.log('Analytics event:', eventName, properties);
  }
};

export const marketplaceEvents = {
  viewListing: (listingId, listingType) => {
    trackEvent('view_listing', { listingId, listingType });
  },
  applyToJob: (jobId, jobTitle) => {
    trackEvent('job_application', { jobId, jobTitle });
  },
  contactPharmacist: (pharmacistId) => {
    trackEvent('contact_pharmacist', { pharmacistId });
  },
  shareContent: (contentType, contentId) => {
    trackEvent('share_content', { contentType, contentId });
  },
  applyFilter: (filterType, filterValue) => {
    trackEvent('apply_filter', { filterType, filterValue });
  }
}; 