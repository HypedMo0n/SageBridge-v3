import { redirect } from 'next/navigation';

export default function Home() {
  // New users go to onboarding; returning users go to dashboard
  // The onboardingComplete flag is checked client-side on /onboarding
  redirect('/onboarding');
}
