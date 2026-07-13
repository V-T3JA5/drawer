'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import LoadingScreen from '@/components/LoadingScreen';
import WeekCard from '@/components/WeekCard';

// next/dynamic + ssr:false means the Three.js bundle is only ever fetched
// when this component actually mounts — which only happens when isDesktop
// is true. Phones never download it at all.
const DriftModel = dynamic(() => import('@/components/DriftModel'), { ssr: false });

const DESKTOP_BREAKPOINT = '(min-width: 901px)';

export default function HomeClient({ weeks }) {
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track desktop/mobile so the 3D layer mounts/unmounts correctly if the
  // window gets resized across the breakpoint mid-session.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_BREAKPOINT);
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Lock page scroll while the loading screen is up.
  useEffect(() => {
    document.body.style.overflow = loading ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [loading]);

  // Scroll-fade-in reveal for each card, once loading is done.
  useEffect(() => {
    if (loading) return;
    gsap.registerPlugin(ScrollTrigger);

    const cards = gsap.utils.toArray('[data-week-card]');
    const triggers = cards.map((card) =>
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      })
    );

    // A fresh page load can already be scrolled (e.g. browser restoring
    // scroll position) — refresh so ScrollTrigger measures correctly.
    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((tw) => tw.scrollTrigger && tw.scrollTrigger.kill());
    };
  }, [loading]);

  return (
    <>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}

      {isDesktop && <DriftModel scrollRegionSelector="#week-list-scroll-region" cycles={6} />}

      <section className="hero">
        <h1>
          Draw<span>er</span>
        </h1>
        <p>your egd guide</p>
      </section>

      <section id="week-list-scroll-region" className="week-list">
        {weeks.map((week, index) => (
          <WeekCard key={week.id} week={week} side={index % 2 === 0 ? 'left' : 'right'} index={index} />
        ))}
      </section>
    </>
  );
}
