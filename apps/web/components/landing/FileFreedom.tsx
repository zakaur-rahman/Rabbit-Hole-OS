"use client";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { FileText, FolderOpen, Database, Globe } from "lucide-react";

export function FileFreedom() {
    return (
        <Section className="bg-background border-t border-white/5">
            <Container>
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <ScrollReveal>
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                                No lock-in. <br />
                                <span className="text-muted-foreground">Just folders and files.</span>
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Your knowledge shouldn't be held hostage. Cognode works directly on top of your local folders Use standard Markdown files that you can open with any text editor.
                            </p>

                            <ul className="space-y-4 pt-4">
                                <li className="flex items-center gap-3 text-foreground/80">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><FileText className="w-5 h-5" /></div>
                                    Plain text Markdown files
                                </li>
                                <li className="flex items-center gap-3 text-foreground/80">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><FolderOpen className="w-5 h-5" /></div>
                                    Human-readable folder structure
                                </li>
                                <li className="flex items-center gap-3 text-foreground/80">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary"><Database className="w-5 h-5" /></div>
                                    100% Local data storage
                                </li>
                            </ul>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal delay={0.2} className="relative">
                        <div className="relative rounded-xl border border-white/10 bg-card/50 p-6 md:p-8 backdrop-blur-sm overflow-hidden">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="font-mono text-xs md:text-sm text-muted-foreground space-y-2">
                                <div className="flex items-center gap-2 text-foreground/60 border-b border-white/5 pb-2 mb-4">
                                    <Globe className="w-4 h-4" />
                                    <span>~/Documents/Research/Knowledge-Graph</span>
                                </div>

                                <div className="pl-4 border-l border-white/10 space-y-2">
                                    <div className="flex items-center gap-2 text-primary">
                                        <FolderOpen className="w-4 h-4" />
                                        <span>Neuroscience</span>
                                    </div>
                                    <div className="pl-6 border-l border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-foreground/80">
                                            <FileText className="w-3 h-3" />
                                            <span>Action_Potentials.md</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-foreground/80">
                                            <FileText className="w-3 h-3" />
                                            <span>Synaptic_Plasticity.md</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-primary pt-2">
                                        <FolderOpen className="w-4 h-4" />
                                        <span>Machine_Learning</span>
                                    </div>
                                    <div className="pl-6 border-l border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-foreground/80">
                                            <FileText className="w-3 h-3" />
                                            <span>Transformers.md</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-foreground/80">
                                            <FileText className="w-3 h-3" />
                                            <span>Attention_Mechanism.md</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </div>
            </Container>
        </Section>
    );
}
