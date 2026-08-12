"use client"

import ProfileCheckup from "@/components/profile-checkup/ProfileCheckup"
import type { RawContext } from "./types"

interface ProfileCheckupTabProps {
  effectiveUsername: string
  rawContext: RawContext | null
}

/**
 * Thin wrapper so Profile Checkup has a file in this folder per the
 * requested structure. The real component lives at
 * components/profile-checkup/ProfileCheckup.tsx and was NOT part of the
 * files reviewed for this pass — it's untouched here. Since the spec calls
 * this out as the primary feature to focus on, it's worth a dedicated
 * follow-up once that file (and /api/diagnostic, which generates the
 * checkup data) can be reviewed against the "max 10 checks, why it matters /
 * affected repo / estimated improvement / quick fix" spec.
 */
export function ProfileCheckupTab({ effectiveUsername, rawContext }: ProfileCheckupTabProps) {
  return <ProfileCheckup effectiveUsername={effectiveUsername} activityContext={rawContext} />
}
