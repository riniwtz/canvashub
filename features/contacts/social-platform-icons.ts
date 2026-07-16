import {
  AtSignIcon,
  BriefcaseBusinessIcon,
  CameraIcon,
  Code2Icon,
  Globe2Icon,
  Music2Icon,
  PlayIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { SocialPlatform } from "@/features/contacts/constants";

export const SOCIAL_PLATFORM_ICONS = {
  facebook: UsersIcon,
  instagram: CameraIcon,
  x: AtSignIcon,
  linkedin: BriefcaseBusinessIcon,
  tiktok: Music2Icon,
  youtube: PlayIcon,
  github: Code2Icon,
  website: Globe2Icon,
} satisfies Record<SocialPlatform, LucideIcon>;
