import { SynthesisPipeline } from "../../components/synthesis/SynthesisPipeline";

export const metadata = {
  title: "Synthesis Pipeline - Cognode",
  description: "Live AI Agent Orchestration Pipeline",
};

export default function SynthesisPage() {
  return (
    <main className="w-full min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SynthesisPipeline />
    </main>
  );
}
