"use client";

import { motion } from "framer-motion";
import { CognodeLogo } from "@/components/ui/CognodeLogo";

export default function PrivacyPage() {
    return (
        <div className="pt-32 pb-24 px-8 md:px-12 max-w-4xl mx-auto">
            <header className="mb-16">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-4 mb-6"
                >
                    <CognodeLogo className="w-10 h-10 text-ink" />
                    <span className="font-mono text-[12px] tracking-[0.2em] uppercase text-amber font-bold">Privacy</span>
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-serif text-5xl mb-8 leading-tight"
                >
                    Privacy Policy
                </motion.h1>
                <p className="font-mono text-[12px] text-mid">Last Updated: March 17, 2026</p>
            </header>

            <section className="font-mono text-[14px] text-ink leading-loose space-y-12">
                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">1. Overview</h2>
                    <p>
                        Cognode is built with a &quot;Privacy First&quot; philosophy. As a research operating system, we understand the sensitivity of your data. This policy explains how we collect, use, and protect your information across our desktop and web applications.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">2. Data Collection</h2>
                    <p>We collect only the information necessary to provide the service:</p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                        <li><strong>Account Information:</strong> Handled securely via Google OAuth. We receive your name, email, and profile picture.</li>
                        <li><strong>Research Data:</strong> Nodes, edges, and notes you create are stored in our secure database to enable cross-device syncing and AI synthesis.</li>
                        <li><strong>Scraped Content:</strong> When you use the integrated browser to &quot;capture&quot; a web page, the extracted text is processed and stored for your research graph.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">3. AI Processing</h2>
                    <p>
                        To enable research synthesis, your data is processed through our AI agent pipeline (leveraging Gemini 2.5 and others). 
                    </p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                        <li>Data sent to AI providers is encrypted in transit.</li>
                        <li>We do not allow AI providers to use your personal research data to train their fundamental models.</li>
                        <li>Synthesis jobs are processed as temporary background tasks and results are only accessible by you.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">4. Storage & Security</h2>
                    <p>
                        Cognode uses industry-standard encryption for all data at rest and in transit. On the desktop application, a local SQLite database acts as the primary storage to ensure performance, with periodic syncing to our secure cloud infrastructure.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">5. Third-Party Services</h2>
                    <p>We utilize a minimal set of trusted third-party services:</p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                        <li><strong>Google OAuth:</strong> For secure authentication.</li>
                        <li><strong>Google Gemini / OpenAI:</strong> For AI-driven synthesis and reasoning.</li>
                        <li><strong>PostgreSQL / Redis:</strong> For database and task queue management.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">6. Your Rights</h2>
                    <p>
                        You have the right to access, export, and delete your research data at any time. We provide tools within the application to export your knowledge graph as Markdown or delete your account and all associated data permanently.
                    </p>
                </div>

                <div className="pt-12 mt-12 border-t border-rule text-mid text-[12px]">
                    <p>© 2026 Cognode Laboratory. For privacy-related questions, contact privacy@cognode.io</p>
                </div>
            </section>
        </div>
    );
}
