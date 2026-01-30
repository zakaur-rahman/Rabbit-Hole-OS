import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { FileFreedom } from "@/components/landing/FileFreedom";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <FileFreedom />
      <HowItWorks />
      <CTA />
    </>
  );
}
