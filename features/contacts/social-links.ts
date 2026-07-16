import {
  CONTACT_SOCIAL_URL_MAX_LENGTH,
  SOCIAL_PLATFORM_DEFINITIONS,
  SOCIAL_PLATFORM_VALUES,
  type SocialPlatform,
} from "@/features/contacts/constants";

type SocialLinkInput = {
  platform: SocialPlatform;
  value: string;
};

export type NormalizedSocialLink = {
  platform: SocialPlatform;
  url: string;
};

export type SocialLinkNormalizationResult =
  | { success: true; data: NormalizedSocialLink }
  | { success: false; message: string };

type UrlCandidate =
  | { kind: "suffix" }
  | { kind: "invalid" }
  | { kind: "url"; url: URL };

const WEB_PROTOCOL_PATTERN = /^https?:\/\//i;
const PROTOCOL_RELATIVE_PATTERN = /^\/\//;
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const DOMAIN_WITH_PATH_PATTERN = /^[^/?#\s]+\.[^/?#\s]+[/?#]/;

const HOSTNAME_PLATFORM = new Map<string, SocialPlatform>(
  SOCIAL_PLATFORM_VALUES.flatMap((platform) =>
    SOCIAL_PLATFORM_DEFINITIONS[platform].hostnames.map(
      (hostname) => [hostname, platform] as const,
    ),
  ),
);

export function detectSocialPlatform(value: string): SocialPlatform | null {
  const candidate = parseUrlCandidate(value, "website");

  if (candidate.kind !== "url" || hasUnsafeUrlParts(candidate.url)) {
    return null;
  }

  return HOSTNAME_PLATFORM.get(normalizeHostname(candidate.url.hostname)) ??
    (hasExplicitWebsiteSignal(value) ? "website" : null);
}

export function normalizeSocialLink(
  input: SocialLinkInput,
): SocialLinkNormalizationResult {
  const value = input.value.trim();

  if (!value) {
    return invalidSocialLink("Enter a profile link or username.");
  }

  if (value.length > CONTACT_SOCIAL_URL_MAX_LENGTH) {
    return invalidSocialLink(
      `Social links must be ${CONTACT_SOCIAL_URL_MAX_LENGTH} characters or fewer.`,
    );
  }

  const candidate = parseUrlCandidate(value, input.platform);

  if (candidate.kind === "invalid") {
    return invalidSocialLink("Enter a valid HTTP or HTTPS link.");
  }

  if (candidate.kind === "url") {
    return normalizeUrlCandidate(input.platform, candidate.url);
  }

  return normalizeSocialSuffix(input.platform, value);
}

function parseUrlCandidate(
  value: string,
  platform: SocialPlatform,
): UrlCandidate {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { kind: "suffix" };
  }

  if (SCHEME_PATTERN.test(trimmedValue) && !WEB_PROTOCOL_PATTERN.test(trimmedValue)) {
    return { kind: "invalid" };
  }

  if (WEB_PROTOCOL_PATTERN.test(trimmedValue)) {
    return parseUrl(trimmedValue);
  }

  if (PROTOCOL_RELATIVE_PATTERN.test(trimmedValue)) {
    return parseUrl(`https:${trimmedValue}`);
  }

  const hostnameCandidate = readHostnameCandidate(trimmedValue);
  const isKnownHostname = HOSTNAME_PLATFORM.has(hostnameCandidate);
  const isWebsite = platform === "website";
  const looksLikeWebsite =
    isKnownHostname ||
    trimmedValue.toLowerCase().startsWith("www.") ||
    DOMAIN_WITH_PATH_PATTERN.test(trimmedValue) ||
    resemblesKnownHostnameLookalike(hostnameCandidate) ||
    (isWebsite && hostnameCandidate.includes("."));

  return looksLikeWebsite
    ? parseUrl(`https://${trimmedValue}`)
    : { kind: "suffix" };
}

function parseUrl(value: string): UrlCandidate {
  try {
    return { kind: "url", url: new URL(value) };
  } catch {
    return { kind: "invalid" };
  }
}

function normalizeUrlCandidate(
  platform: SocialPlatform,
  url: URL,
): SocialLinkNormalizationResult {
  if (hasUnsafeUrlParts(url)) {
    return invalidSocialLink(
      "Links cannot contain credentials, custom ports, or non-web protocols.",
    );
  }

  const hostname = normalizeHostname(url.hostname);
  const detectedPlatform = HOSTNAME_PLATFORM.get(hostname);

  if (platform !== "website" && detectedPlatform !== platform) {
    return invalidSocialLink(
      `This link does not match ${SOCIAL_PLATFORM_DEFINITIONS[platform].label}.`,
    );
  }

  if (platform === "website" && !isPublicWebsiteHostname(hostname)) {
    return invalidSocialLink("Enter a website with a valid domain name.");
  }

  if (platform !== "website" && !hasProfilePath(url)) {
    return invalidSocialLink("Enter a profile link that includes a username or handle.");
  }

  url.protocol = "https:";

  if (url.toString().length > CONTACT_SOCIAL_URL_MAX_LENGTH) {
    return invalidSocialLink(
      `Social links must be ${CONTACT_SOCIAL_URL_MAX_LENGTH} characters or fewer.`,
    );
  }

  return {
    success: true,
    data: { platform, url: url.toString() },
  };
}

function normalizeSocialSuffix(
  platform: SocialPlatform,
  value: string,
): SocialLinkNormalizationResult {
  const definition = SOCIAL_PLATFORM_DEFINITIONS[platform];

  if (!definition.baseUrl) {
    return invalidSocialLink("Enter a complete website domain or link.");
  }

  if (/\s/.test(value)) {
    return invalidSocialLink("Usernames and profile paths cannot contain spaces.");
  }

  const suffix = cleanSocialSuffix(value, definition.pathPrefix);

  if (!suffix) {
    return invalidSocialLink("Enter a profile username or path.");
  }

  const url = new URL(`${definition.baseUrl}${suffix}`);

  return normalizeUrlCandidate(platform, url);
}

function cleanSocialSuffix(value: string, pathPrefix: string) {
  let suffix = value.trim().replace(/^\/+/, "");

  if (pathPrefix && suffix.toLowerCase().startsWith(pathPrefix.toLowerCase())) {
    suffix = suffix.slice(pathPrefix.length);
  } else if (suffix.startsWith("@")) {
    suffix = suffix.slice(1);
  }

  return suffix.replace(/^\/+/, "");
}

function hasUnsafeUrlParts(url: URL) {
  return (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    Boolean(url.username || url.password || url.port)
  );
}

function hasProfilePath(url: URL) {
  return Boolean(url.pathname.replace(/^\/+|\/+$/g, ""));
}

function hasExplicitWebsiteSignal(value: string) {
  const trimmedValue = value.trim().toLowerCase();

  return (
    WEB_PROTOCOL_PATTERN.test(trimmedValue) ||
    PROTOCOL_RELATIVE_PATTERN.test(trimmedValue) ||
    trimmedValue.startsWith("www.")
  );
}

function isPublicWebsiteHostname(hostname: string) {
  return hostname.includes(".") && !hostname.startsWith(".") && !hostname.endsWith(".");
}

function readHostnameCandidate(value: string) {
  return normalizeHostname(value.split(/[/?#]/, 1)[0] ?? "");
}

function resemblesKnownHostnameLookalike(hostname: string) {
  return Array.from(HOSTNAME_PLATFORM.keys()).some(
    (knownHostname) =>
      hostname !== knownHostname &&
      (hostname.startsWith(`${knownHostname}.`) ||
        hostname.endsWith(`.${knownHostname}`)),
  );
}

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function invalidSocialLink(message: string): SocialLinkNormalizationResult {
  return { success: false, message };
}
