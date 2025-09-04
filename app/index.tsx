import React from 'react';
import { Redirect } from 'expo-router';
import { getHref } from '@/constants/routes';

export default function RootIndex() {
  return <Redirect href={getHref('home')} />;
}
