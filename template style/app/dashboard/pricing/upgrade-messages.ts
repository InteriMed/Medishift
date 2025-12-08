export interface UpgradeMessage {
  title: string;
  description: string;
  cta: string;
  features?: string[];
}

export interface UpgradeMessages {
  [origin: string]: {
    [membership: string]: UpgradeMessage | null;
  };
}

export const upgradeMessages: UpgradeMessages = {
  visualizer: {
    free: {
      title: "Upgrade to Extend Audio Duration",
      description: "Free users can crop up to 30 seconds of audio. Upgrade to unlock full audio feature.",
      cta: "Upgrade Now",
      features: [
        "Full audio duration cropping",
        "Unlimited audio analysis",
        "Advanced editing features"
      ]
    },
    creator: null,
    pro: null,
    business: null
  },
  imageUpload: {
    free: {
      title: "Upgrade to Upload Reference Images",
      description: "Reference image uploads are available for paid plans. Upgrade to unlock this feature and enhance your video creation with custom visuals.",
      cta: "Upgrade Now",
      features: [
        "Upload reference images for video creation",
        "Use custom scenes and characters",
        "Enhanced AI video generation",
        "Priority support"
      ]
    },
    creator: null,
    pro: null,
    business: null
  }
};

