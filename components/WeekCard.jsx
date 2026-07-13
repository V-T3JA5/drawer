import Link from 'next/link';

export default function WeekCard({ week, side, index }) {
  const cardInner = (
    <div className={`week-card side-${side}${week.hasContent ? '' : ' locked'}`} data-week-card>
      <div className="card-media">
        {week.cover ? (
          <img src={week.cover} alt={`${week.title} cover`} loading="lazy" />
        ) : (
          <div
            style={{
              aspectRatio: '3/2',
              border: '1px dashed rgba(232,137,10,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No cover image yet
          </div>
        )}
      </div>
      <div className="card-copy">
        <div className="card-eyebrow">
          Week {String(week.id).padStart(2, '0')}
          {!week.hasContent && ' · Coming soon'}
        </div>
        <h3>{week.title}</h3>
        <p>{week.desc}</p>
      </div>
    </div>
  );

  if (!week.hasContent) {
    return cardInner;
  }

  return (
    <Link href={`/week/${week.id}`} className="week-card-link">
      {cardInner}
    </Link>
  );
}
