import Link from 'next/link';
import { getQuestionSteps, getAllQuestionParams } from '@/lib/content';
import TutorialClient from '@/components/TutorialClient';

export function generateStaticParams() {
  return getAllQuestionParams();
}

export default function TutorialPage({ params }) {
  const data = getQuestionSteps(params.weekId, params.questionId);

  if (!data || data.steps.length === 0) {
    return (
      <div className="coming-soon">
        <h1>Not available yet</h1>
        <p>This question doesn&apos;t have steps added yet.</p>
        <Link href={`/week/${params.weekId}`} className="back-link">
          ← Back to week
        </Link>
      </div>
    );
  }

  return <TutorialClient data={data} />;
}
