import Link from 'next/link';

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        Draw<span>er</span>
      </Link>
      <span className="tagline">your egd guide</span>
    </header>
  );
}
