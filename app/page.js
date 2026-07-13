import { getAllWeekSummaries } from '@/lib/content';
import HomeClient from '@/components/HomeClient';

export default function HomePage() {
  const weeks = getAllWeekSummaries();
  return <HomeClient weeks={weeks} />;
}
