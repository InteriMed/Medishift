/**
 * Tutorial Steps Data for MediShift Dashboard
 * Contains step definitions for all feature tutorials
 */

export const tutorialSteps = {
  // Dashboard overview tutorial steps
  // Dashboard onboarding tutorial steps
  dashboard: [
    {
      id: 'onboarding-help-button',
      title: 'Onboarding Help',
      content: 'You can restart the onboarding tutorial anytime by clicking this help button in the top bar. This will guide you through all the features of MediShift.',
      targetSelector: '[data-tutorial="onboarding-help-button"]',
      targetArea: 'header',
      tooltipPosition: { top: '80px', right: '120px' },
      requiresInteraction: false
    },
    {
      id: 'onboarding-intro',
      title: 'Welcome to Your Dashboard',
      content: 'This is your central hub. To get the most out of MediShift, let\'s start by completing your profile details.',
      targetSelector: null,
      targetArea: 'content',
      tooltipPosition: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }
    },
    {
      id: 'expand-sidebar',
      title: 'Navigation Menu',
      content: 'This is the navigation menu. You can access all features of MediShift from here - your profile, messages, contracts, calendar, marketplace, and settings. If the menu is collapsed, click the expand button to see all options.',
      targetSelector: 'aside[class*="fixed left-0"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '50%', left: 'calc(250px + 20px)' },
      expandSidebar: true,
      highlightSidebar: true,
      requiresInteraction: false
    },
    {
      id: 'navigate-to-profile',
      title: 'Let\'s Get Started with Your Profile',
      content: 'To begin, please click on the Profile tab. This is where you\'ll complete your personal and professional information. We\'ll guide you through each step once you\'re there.',
      targetSelector: 'a[href="/dashboard/profile"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'profile',
      makeOtherTabsInactive: true,
      requiresInteraction: false
    }
  ],

  // Profile tabs tutorial sequence - Guides through tabs in order
  profileTabs: [
    {
      id: 'personal-details-tab',
      title: 'Step 1: Personal Details',
      content: 'Start by filling out your personal information like name, address, and contact details. You can upload your CV using the Auto Fill button to speed up the process, or fill in the information manually.',
      targetSelector: '[data-tutorial="profile-upload-button"]',
      targetArea: 'content',
      highlightTab: 'personalDetails',
      highlightUploadButton: true,
      navigationPath: '/dashboard/profile/personalDetails',
      requiresInteraction: true,
      customButtons: [
        {
          text: 'I understood',
          action: 'pause_and_fill',
          variant: 'primary'
        }
      ]
    },
    {
      id: 'professional-background-tab',
      title: 'Step 2: Professional Background',
      content: 'Next, add your qualifications, specialties, and work experience. You can use the Auto Fill button to speed up the process, or fill in the information manually. Complete this section to continue to the next step.',
      targetSelector: 'button[data-tab="professionalBackground"]',
      targetArea: 'content',
      highlightTab: 'professionalBackground',
      highlightUploadButton: true,
      navigationPath: '/dashboard/profile/professionalBackground',
      requiresInteraction: true,
      customButtons: [
        {
          text: 'I understood',
          action: 'pause_and_fill',
          variant: 'primary'
        }
      ]
    },
    {
      id: 'billing-information-tab',
      title: 'Step 3: Billing Information',
      content: 'Set up your payment details to get paid for your work quickly and securely. You can use the Auto Fill button to speed up the process, or fill in the information manually. Complete this section to continue.',
      targetSelector: 'button[data-tab="billingInformation"]',
      targetArea: 'content',
      highlightTab: 'billingInformation',
      highlightUploadButton: true,
      navigationPath: '/dashboard/profile/billingInformation',
      requiresInteraction: true,
      customButtons: [
        {
          text: 'I understood',
          action: 'pause_and_fill',
          variant: 'primary'
        }
      ]
    },
    {
      id: 'document-uploads-tab',
      title: 'Step 4: Document Uploads',
      content: 'Finally, upload your professional documents such as certificates, resume, and identification. You can use the Auto Fill button if you have documents ready, or upload them manually. This is the last step!',
      targetSelector: 'button[data-tab="documentUploads"]',
      targetArea: 'content',
      highlightTab: 'documentUploads',
      highlightUploadButton: true,
      navigationPath: '/dashboard/profile/documentUploads',
      requiresInteraction: true,
      customButtons: [
        {
          text: 'I understood',
          action: 'pause_and_fill',
          variant: 'primary'
        }
      ]
    },
    {
      id: 'profile-completion-info',
      title: 'Profile Complete!',
      content: 'Congratulations! Your profile is now complete. You have access to all platform features. Let\'s continue to the next section.',
      targetSelector: '.profileContainer',
      targetArea: 'content',
      tooltipPosition: { top: '150px', left: '50%' },
      navigationPath: '/dashboard/profile/settings',
      highlightTab: 'settings',
      actionButton: {
        text: 'Continue to Messages',
        action: 'start_messages_tutorial'
      }
    }
  ],

  // Contracts tutorial steps
  contracts: [
    {
      id: 'contracts-overview',
      title: 'Contracts Feature',
      content: 'The contracts feature allows you to manage all your employment contracts in one place.',
      targetSelector: 'a[href="/dashboard/contracts"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '180px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'contracts',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/contracts'
      }
    },
    {
      id: 'contracts-list',
      title: 'Your Contracts',
      content: 'Here you can see all your active and past contracts. Click on any contract to view its details.',
      targetSelector: '.contracts-list',
      targetArea: 'content',
      tooltipPosition: { top: '300px', left: '50%' },
      requiredPage: '/dashboard/contracts',
      requiresInteraction: false
    }
  ],

  // Messages tutorial steps
  messages: [
    {
      id: 'messages-overview',
      title: 'Messaging Feature',
      content: 'The messaging feature allows you to communicate with employers and other professionals.',
      targetSelector: 'a[href="/dashboard/messages"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '210px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'messages',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/messages'
      }
    },
    {
      id: 'messages-conversations',
      title: 'Your Conversations',
      content: 'Here you can see all your active conversations. Click on any conversation to view and respond to messages.',
      targetSelector: '.conversations-list',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '30%' },
      requiredPage: '/dashboard/messages',
      requiresInteraction: false
    },
    {
      id: 'messages-compose',
      title: 'Start New Conversation',
      contentByRole: {
        professional: 'You can start a conversation with the members of your team by clicking on New message, or contact any employer for your current contracts.',
        facility: 'You can start a conversation with your team members or contact professionals you are working with by clicking on New message.',
        default: 'You can start a conversation with the members of your team by clicking on New message, or contact any employer for your current contracts.'
      },
      content: 'Start a new conversation by clicking on the "New Message" button.',
      targetSelector: '.new-message-button',
      targetArea: 'content',
      tooltipPosition: { top: '150px', left: '70%' },
      requiredPage: '/dashboard/messages',
      requiresInteraction: false
    }
  ],

  // Calendar tutorial steps
  calendar: [
    {
      id: 'calendar-overview',
      title: 'Calendar Feature',
      content: 'The calendar feature helps you manage your schedule and appointments.',
      targetSelector: 'a[href="/dashboard/calendar"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '240px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'calendar',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/calendar'
      }
    },
    {
      id: 'calendar-view',
      title: 'Calendar View',
      content: 'View your schedule in different formats - daily, weekly, or monthly.',
      targetSelector: '.calendar-view-options',
      targetArea: 'content',
      tooltipPosition: { top: '150px', left: '70%' },
      requiredPage: '/dashboard/calendar',
      requiresInteraction: false
    },
    {
      id: 'calendar-appointment',
      title: 'Creating Appointments',
      content: 'Create new appointments by clicking on a time slot or using the "New Appointment" button.',
      targetSelector: '.new-appointment-button',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '70%' },
      requiredPage: '/dashboard/calendar',
      requiresInteraction: false
    }
  ],

  // Profile tutorial steps
  profile: [
    {
      id: 'profile-overview',
      title: 'Your Profile',
      content: 'Your profile contains all your personal and professional information.',
      targetSelector: 'a[href="/dashboard/profile"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'profile',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/profile'
      }
    },
    {
      id: 'profile-edit',
      title: 'Editing Your Profile',
      content: 'You can update your profile information at any time through the different sections.',
      targetSelector: '.profile-tabs',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '50%' },
      requiredPage: '/dashboard/profile',
      requiresInteraction: false
    }
  ],

  // Marketplace tutorial steps
  marketplace: [
    {
      id: 'marketplace-overview',
      title: 'Marketplace Feature',
      content: 'The marketplace allows you to discover job opportunities and connect with employers.',
      targetSelector: 'a[href="/dashboard/marketplace"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '270px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'marketplace',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/marketplace'
      }
    },
    {
      id: 'marketplace-search',
      title: 'Searching Opportunities',
      content: 'Search and filter job opportunities based on your preferences.',
      targetSelector: '.marketplace-search',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '30%' },
      requiredPage: '/dashboard/marketplace',
      requiresInteraction: false
    },
    {
      id: 'marketplace-apply',
      title: 'Applying for Jobs',
      content: 'Apply for job opportunities with a single click or save them for later.',
      targetSelector: '.job-card',
      targetArea: 'content',
      tooltipPosition: { top: '350px', left: '60%' },
      requiredPage: '/dashboard/marketplace',
      requiresInteraction: false
    }
  ],

  // Payroll tutorial steps
  payroll: [
    {
      id: 'payroll-overview',
      title: 'Payroll Feature',
      content: 'The payroll feature allows you to manage payroll requests and track payment processing for your facility.',
      targetSelector: 'a[href="/dashboard/payroll"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '330px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'payroll',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/payroll'
      }
    },
    {
      id: 'payroll-requests',
      title: 'Payroll Requests',
      content: 'View and manage all payroll requests. You can see the status of each request and track payments.',
      targetSelector: '.payroll-requests-list',
      targetArea: 'content',
      tooltipPosition: { top: '250px', left: '50%' },
      requiredPage: '/dashboard/payroll',
      requiresInteraction: false
    },
    {
      id: 'payroll-status',
      title: 'Tracking Payroll Status',
      content: 'Monitor the status of payroll requests from draft to completed. Filter by status to find specific requests.',
      targetSelector: '.status-filters',
      targetArea: 'content',
      tooltipPosition: { top: '150px', left: '60%' },
      requiredPage: '/dashboard/payroll',
      requiresInteraction: false
    }
  ],

  // Organization tutorial steps
  organization: [
    {
      id: 'organization-overview',
      title: 'Organization Feature',
      content: 'The organization feature allows you to manage pharmacy chains or groups, including multiple facilities under one organization.',
      targetSelector: 'a[href="/dashboard/organization"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '360px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'organization',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/organization'
      }
    },
    {
      id: 'organization-facilities',
      title: 'Managing Facilities',
      content: 'View and manage all facilities that are part of your organization. You can add or remove facilities from the group.',
      targetSelector: '.facilities-list',
      targetArea: 'content',
      tooltipPosition: { top: '250px', left: '50%' },
      requiredPage: '/dashboard/organization',
      requiresInteraction: false
    },
    {
      id: 'organization-settings',
      title: 'Organization Settings',
      content: 'Configure organization-wide settings and manage administrators who have access to all facilities in the chain.',
      targetSelector: '.organization-settings',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '50%' },
      requiredPage: '/dashboard/organization',
      requiresInteraction: false
    }
  ],

  // Settings tutorial steps
  settings: [
    {
      id: 'settings-overview',
      title: 'Settings Feature',
      content: 'The settings section allows you to customize your account preferences.',
      targetSelector: 'a[href="/dashboard/settings"]',
      targetArea: 'sidebar',
      tooltipPosition: { top: '300px', left: 'calc(250px + 20px)' },
      highlightSidebarItem: 'settings',
      actionButton: {
        text: 'Show me',
        path: '/dashboard/settings'
      }
    },
    {
      id: 'settings-account',
      title: 'Account Settings',
      content: 'Update your account information, change your password, and manage email preferences.',
      targetSelector: '.settings-account',
      targetArea: 'content',
      tooltipPosition: { top: '200px', left: '50%' },
      requiredPage: '/dashboard/settings',
      requiresInteraction: false
    },
    {
      id: 'settings-notifications',
      title: 'Notification Settings',
      content: 'Customize your notification preferences to control what alerts you receive.',
      targetSelector: '.settings-notifications',
      targetArea: 'content',
      tooltipPosition: { top: '300px', left: '50%' },
      requiredPage: '/dashboard/settings',
      requiresInteraction: false
    }
  ]
};


export default tutorialSteps; 