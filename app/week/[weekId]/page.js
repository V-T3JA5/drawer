import Link from 'next/link';
import { getWeekDetail, getAllWeekParams } from '@/lib/content';
import WeekPageClient from '@/components/WeekPageClient';

export function generateStaticParams() {
  return getAllWeekParams();
}

export default function WeekPage({ params }) {
  const week = getWeekDetail(params.weekId);

  if (!week) {
    return (
      <div className="coming-soon">
        <h1>Week {params.weekId}</h1>
        <p>Content for this week hasn&apos;t been added yet — check back soon.</p>
        <Link href="/" className="back-link">
          ← Back to home
        </Link>
      </div>
    );
  }

  return <WeekPageClient week={week} />;
}
