export const CONTACT_NAME_MAX_LENGTH = 120;
export const CONTACT_NICKNAME_MAX_LENGTH = 80;
export const CONTACT_AGE_MAX = 150;
export const CONTACT_PHONE_MAX_LENGTH = 32;
export const CONTACT_PHONE_MIN_DIGITS = 7;
export const CONTACT_SOCIAL_LINK_MAX_COUNT = 10;
export const CONTACT_SOCIAL_URL_MAX_LENGTH = 2_048;

export const SOCIAL_PLATFORM_VALUES = [
  "facebook",
  "instagram",
  "x",
  "linkedin",
  "tiktok",
  "youtube",
  "github",
  "website",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_VALUES)[number];

type SocialPlatformDefinition = {
  label: string;
  baseUrl: string | null;
  hostnames: readonly string[];
  pathPrefix: string;
  placeholder: string;
};

export const SOCIAL_PLATFORM_DEFINITIONS = {
  facebook: {
    label: "Facebook",
    baseUrl: "https://www.facebook.com/",
    hostnames: ["facebook.com", "www.facebook.com", "m.facebook.com"],
    pathPrefix: "",
    placeholder: "username or facebook.com/username",
  },
  instagram: {
    label: "Instagram",
    baseUrl: "https://www.instagram.com/",
    hostnames: ["instagram.com", "www.instagram.com"],
    pathPrefix: "",
    placeholder: "username or instagram.com/username",
  },
  x: {
    label: "X (Twitter)",
    baseUrl: "https://x.com/",
    hostnames: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
    pathPrefix: "",
    placeholder: "username or x.com/username",
  },
  linkedin: {
    label: "LinkedIn",
    baseUrl: "https://www.linkedin.com/in/",
    hostnames: ["linkedin.com", "www.linkedin.com"],
    pathPrefix: "in/",
    placeholder: "username or linkedin.com/in/username",
  },
  tiktok: {
    label: "TikTok",
    baseUrl: "https://www.tiktok.com/@",
    hostnames: ["tiktok.com", "www.tiktok.com"],
    pathPrefix: "@",
    placeholder: "username or tiktok.com/@username",
  },
  youtube: {
    label: "YouTube",
    baseUrl: "https://www.youtube.com/@",
    hostnames: ["youtube.com", "www.youtube.com", "m.youtube.com"],
    pathPrefix: "@",
    placeholder: "handle or youtube.com/@handle",
  },
  github: {
    label: "GitHub",
    baseUrl: "https://github.com/",
    hostnames: ["github.com", "www.github.com"],
    pathPrefix: "",
    placeholder: "username or github.com/username",
  },
  website: {
    label: "Website",
    baseUrl: null,
    hostnames: [],
    pathPrefix: "",
    placeholder: "example.com/profile",
  },
} as const satisfies Record<SocialPlatform, SocialPlatformDefinition>;

export const SOCIAL_PLATFORM_OPTIONS = SOCIAL_PLATFORM_VALUES.map((value) => ({
  value,
  ...SOCIAL_PLATFORM_DEFINITIONS[value],
}));

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return (
    typeof value === "string" &&
    SOCIAL_PLATFORM_VALUES.some((platform) => platform === value)
  );
}

export function getSocialPlatformDefinition(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_DEFINITIONS[platform];
}
