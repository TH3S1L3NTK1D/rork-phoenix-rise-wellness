import React from 'react';

const EMERGENCY_DISABLE_AUDIO = true as const;

function CoachDisabled() {
  if (EMERGENCY_DISABLE_AUDIO) return null as any;
  return null as any;
}

export default React.memo(CoachDisabled);
