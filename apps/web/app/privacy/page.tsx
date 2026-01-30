import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function PrivacyPage() {
    return (
        <div className="pt-24 pb-12">
            <Section>
                <Container>
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div className="border-b border-border pb-8">
                            <h1 className="text-3xl font-bold tracking-tight mb-4">Privacy Policy</h1>
                            <p className="text-muted-foreground">Last updated: January 2026</p>
                        </div>

                        <div className="space-y-6 text-foreground/90">
                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-primary">1. Overview</h2>
                                <p className="leading-relaxed">
                                    At Cognode, we believe your thoughts are your own. Our architecture is designed to be local-first, meaning your data lives on your device, not our servers. This Privacy Policy explains how we handle the minimal data we do collect.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-primary">2. Data Collection & Usage</h2>
                                <p className="leading-relaxed">
                                    <strong>Local Data:</strong> Your knowledge graph, notes, PDFs, and embeddings are stored locally on your machine. We do not have access to this content.
                                </p>
                                <p className="leading-relaxed">
                                    <strong>Sync (Optional):</strong> If you choose to enable cloud sync, your encrypted data is stored using industry-standard AES-256 encryption. We cannot decrypt your content.
                                </p>
                                <p className="leading-relaxed">
                                    <strong>Account Info:</strong> When you sign in (e.g., via Google OAuth), we store your email address and authentication tokens to manage your subscription/license.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-primary">3. Device Metadata</h2>
                                <p className="leading-relaxed">
                                    To manage license activation limits, we collect basic device identifiers (OS type, generic hardware ID). This is never linked to your personal browsing or research data.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-primary">4. AI Processing</h2>
                                <p className="leading-relaxed">
                                    Cognode uses local LLMs by default. If you opt-in to cloud-based models for simplified synthesis, your prompts are sent to our inference partners (e.g., OpenAI/Anthropic) via our secure proxy. We do not use your data to train our models.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold text-primary">5. Terms</h2>
                                <p className="leading-relaxed">
                                    By using Cognode, you agree to these terms. We may update this policy primarily to comply with legal requirements or if our architecture changes significantly.
                                </p>
                            </section>
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
}
