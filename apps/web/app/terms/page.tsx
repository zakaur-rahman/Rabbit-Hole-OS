"use client";

import { motion } from "framer-motion";
import { CognodeLogo } from "@/components/ui/CognodeLogo";

export default function TermsPage() {
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
                    <span className="font-mono text-[12px] tracking-[0.2em] uppercase text-amber font-bold">Legal</span>
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-serif text-5xl mb-8 leading-tight"
                >
                    Terms of Service
                </motion.h1>
                <p className="font-mono text-[12px] text-mid">Last Updated: March 17, 2026</p>
            </header>

            <section className="font-mono text-[14px] text-ink leading-loose space-y-12">
                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Cognode, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service. These terms apply to all users of the Cognode platform, including the desktop application and web services.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">2. Use of Service</h2>
                    <p>
                        Cognode provides an AI-native research operating system. You are granted a non-exclusive, non-transferable, revocable license to use the service for personal or professional research purposes. You agree not to:
                    </p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                        <li>Use the service for any illegal or unauthorized purpose.</li>
                        <li>Attempt to reverse engineer or extract the source code of the application.</li>
                        <li>Use automated systems (bots, scrapers) to access the service without authorization.</li>
                        <li>Interfere with or disrupt the integrity or performance of the service.</li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">3. User Content & Intellectual Property</h2>
                    <p>
                        You retain ownership of all data, notes, and documents you create on the Cognode platform. By using our synthesis services, you grant Cognode a limited license to process your content through our AI agent pipeline solely for the purpose of providing the service to you.
                    </p>
                    <p className="mt-4">
                        We do not claim ownership of your research findings or synthesized papers. However, the Cognode software, brand, and proprietary agent architectures are the intellectual property of Cognode.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">4. AI & Synthesis Disclaimer</h2>
                    <p>
                        Cognode utilizes third-party AI models (including Gemini and others) to perform synthesis and data extraction. While we implement a multi-agent review process to minimize hallucinations and errors, we do not guarantee the absolute accuracy or factual correctness of AI-generated content. Users are responsible for verifying all citations and claims before publication.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">5. Limitation of Liability</h2>
                    <p>
                        Cognode and its creators shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including but not limited to loss of data or research integrity.
                    </p>
                </div>

                <div>
                    <h2 className="font-serif text-2xl mb-4 border-b border-rule pb-2">6. Termination</h2>
                    <p>
                        We reserve the right to terminate or suspend your access to the service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or the service.
                    </p>
                </div>

                <div className="pt-12 mt-12 border-t border-rule text-mid text-[12px]">
                    <p>© 2026 Cognode Laboratory. For legal inquiries, contact support@cognode.io</p>
                </div>
            </section>
        </div>
    );
}
