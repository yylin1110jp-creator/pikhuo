import { HeroScene } from '@/components/hero/HeroScene';
import { SiteContent } from '@/components/SiteContent';
import { SiteHeader } from '@/components/SiteHeader';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroScene />
        <SiteContent />
      </main>
    </>
  );
}
