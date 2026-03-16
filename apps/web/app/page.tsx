import { Hero } from "@/components/landing/Hero";
import { Marquee } from "@/components/landing/Marquee";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { Pipeline } from "@/components/landing/Pipeline";
import { Privacy } from "@/components/landing/Privacy";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <main className="overflow-hidden">
      <Hero />
      <Marquee />
      <Stats />
      <Features />
      <Pipeline />
      <Privacy />
      <CTA />
    </main>
  );
}
