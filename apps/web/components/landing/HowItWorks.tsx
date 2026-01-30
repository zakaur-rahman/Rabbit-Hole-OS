import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Import, Waypoints, Sparkles, FileOutput } from "lucide-react";

const steps = [
    {
        id: "01",
        title: "Ingest",
        description: "Import PDFs, Markdown, or connect to your existing knowledge base. Cognode indexes everything locally.",
        icon: Import,
    },
    {
        id: "02",
        title: "Connect",
        description: "The AI automatically suggests links and builds a semantic graph of your verified knowledge.",
        icon: Waypoints,
    },
    {
        id: "03",
        title: "Synthesize",
        description: "Ask complex questions. Cognode generates insights, citing exact sources from your graph.",
        icon: Sparkles,
    },
    {
        id: "04",
        title: "Publish",
        description: "Export your findings as clean, structured documents or LaTeX formatted papers.",
        icon: FileOutput,
    },
];

export function HowItWorks() {
    return (
        <Section className="relative overflow-hidden">
            <Container>
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                        From Chaos to <span className="text-primary">Clarity</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        A complete pipeline for knowledge work, fully automated yet completely under your control.
                    </p>
                </div>

                <div className="relative grid md:grid-cols-4 gap-8">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

                    {steps.map((step, index) => (
                        <div key={index} className="relative flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-background border border-border flex items-center justify-center z-10 shadow-xl group hover:border-primary/50 transition-colors">
                                <step.icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-sm font-mono text-primary font-bold">{step.id}</span>
                                <h3 className="text-xl font-bold">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </Section>
    );
}
