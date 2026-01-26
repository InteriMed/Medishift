import { commonActions } from './actions/common';
import { personalActions } from './actions/personal';
import { organizationActions } from './actions/organization';
import { catalogActions } from './actions/catalog';
import { apiActions } from './actions/api';

export const actions = [
  ...commonActions,
  ...personalActions,
  ...organizationActions,
  ...catalogActions,
  ...apiActions
];

export const categories = {
  calendar: {
    labelKey: "serviceTree:categories.calendar",
    icon: "calendar",
    color: "#3B82F6"
  },
  contracts: {
    labelKey: "serviceTree:categories.contracts",
    icon: "file-text",
    color: "#10B981"
  },
  messages: {
    labelKey: "serviceTree:categories.messages",
    icon: "message-circle",
    color: "#8B5CF6"
  },
  profile: {
    labelKey: "serviceTree:categories.profile",
    icon: "user",
    color: "#F59E0B"
  },
  payroll: {
    labelKey: "serviceTree:categories.payroll",
    icon: "dollar-sign",
    color: "#EF4444"
  },
  common: {
    labelKey: "serviceTree:categories.common",
    icon: "settings",
    color: "#6B7280"
  },
  account: {
    labelKey: "serviceTree:categories.account",
    icon: "shield",
    color: "#EC4899"
  },
  documents: {
    labelKey: "serviceTree:categories.documents",
    icon: "file",
    color: "#14B8A6"
  },
  api: {
    labelKey: "serviceTree:categories.api",
    icon: "cloud",
    color: "#6366F1"
  },
  catalog: {
    labelKey: "serviceTree:categories.catalog",
    icon: "database",
    color: "#06B6D4"
  },
  organization: {
    labelKey: "serviceTree:categories.organization",
    icon: "building",
    color: "#F97316"
  },
  support: {
    labelKey: "serviceTree:categories.support",
    icon: "help-circle",
    color: "#0EA5E9"
  },
  services: {
    labelKey: "serviceTree:categories.services",
    icon: "briefcase",
    color: "#22C55E"
  },
  announcements: {
    labelKey: "serviceTree:categories.announcements",
    icon: "megaphone",
    color: "#A855F7"
  }
};

export const getActionsByWorkspace = (workspaceType) => {
  return actions.filter(action => 
    !action.workspace || action.workspace.includes(workspaceType)
  );
};

export const getActionParameters = (actionId) => {
  const action = actions.find(a => a.id === actionId);
  return action?.parameters || [];
};

export default { actions, categories, getActionsByWorkspace, getActionParameters };
