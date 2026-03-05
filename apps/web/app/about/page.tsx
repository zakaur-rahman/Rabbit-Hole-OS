import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function AboutPage() {
    return (
        <div className="pt-24 pb-12">
            <Section>
                <Container>
                    <div className="max-w-3xl mx-auto space-y-12">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold tracking-tight">Our Vision</h1>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                Cognode exists to bridge the gap between human creativity and artificial intelligence. We believe that knowledge should be structured, accessible, and amplified—not hidden in silos or scattered across disparate tools.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">Clarity Over Chaos</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Modern research is messy. Tabs accumulate, notes get lost, and context evaporates. Cognode provides a persistent, graph-based environment where every thought is connected and every insight is preserved. We prioritize clarity, focus, and depth over engagement metrics.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary">Research-Grade Intelligence</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We don&apos;t just wrap a chatbot. Cognode&apos;s AI is deeply integrated into your knowledge graph, understanding the relationships between your documents to provide synthesis that is accurate, cited, and verifiable. It&apos;s not magic; it&apos;s structured intelligence.
                            </p>
                        </div>

                        <div className="space-y-4 border-t border-border pt-8">
                            <h2 className="text-2xl font-bold">The Road Ahead</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                This is just the beginning. We are building the operating system for the mind—a tool that grows with you, adapts to your workflow, and respects your privacy above all else.
                            </p>
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
}
