import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function TermsPage() {
    return (
        <div className="pt-24 pb-12">
            <Section>
                <Container>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="border-b border-border pb-8">
                            <h1 className="text-3xl font-bold tracking-tight mb-4">Terms of Service</h1>
                            <p className="text-muted-foreground">Effective Date: January 1, 2026</p>
                        </div>

                        <div className="space-y-6 text-foreground/90">
                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                                <p className="leading-relaxed">
                                    By downloading, installing, or using Cognode (&quot;the Software&quot;), you agree to be bound by these Terms. If you do not agree, do not use the Software.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">2. License Grant</h2>
                                <p className="leading-relaxed">
                                    Cognode grants you a limited, non-exclusive, non-transferable, revocable license to use the Software for personal or commercial purposes, subject to your subscription plan.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">3. Restrictions</h2>
                                <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                                    <li>You may not reverse engineer, decompile, or disassemble the Software.</li>
                                    <li>You may not sell, resell, rent, or lease the Software to third parties.</li>
                                    <li>You may not remove or alter any proprietary notices or labels on the Software.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">4. Intellectual Property</h2>
                                <p className="leading-relaxed">
                                    The Software, including its code, documentation, appearance, structure, and organization, is the exclusive property of Cognode Inc.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">5. Disclaimer of Warranties</h2>
                                <p className="leading-relaxed">
                                    THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND. COGNODE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-foreground">6. Termination</h2>
                                <p className="leading-relaxed">
                                    We may terminate or suspend your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                                </p>
                            </section>
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
}
