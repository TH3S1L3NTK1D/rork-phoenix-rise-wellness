import React from 'react';
import { Redirect } from 'expo-router';
import { TABS_ROUTES } from '@/constants/routes';

export default function RootIndex() {
  return <Redirect href={TABS_ROUTES.goals} />;
}
