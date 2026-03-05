import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { HelpCircle, Bug, MessageSquare, BookOpen } from "lucide-react";
import Link from "next/link";

const supportOptions = [
    {
        title: "Documentation",
        description: "Read the full user guide and API reference.",
        icon: BookOpen,
        href: "#", // Placeholder
        cta: "Read Docs",
    },
    {
        title: "Report a Bug",
        description: "Found an issue? Let us know on our issue tracker.",
        icon: Bug,
        href: "mailto:bugs@cognode.ai",
        cta: "File Issue",
    },
    {
        title: "Feature Requests",
        description: "Have an idea for Cognode? We'd love to hear it.",
        icon: MessageSquare,
        href: "mailto:features@cognode.ai",
        cta: "Suggest Feature",
    },
    {
        title: "Account Support",
        description: "Issues with billing or account access?",
        icon: HelpCircle,
        href: "mailto:support@cognode.ai",
        cta: "Email Support",
    },
];

export default function SupportPage() {
    return (
        <div className="pt-24 pb-12 min-h-screen">
            <Section>
                <Container>
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight">
                            How can we help?
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            We&apos;re here to support your research workflow.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {supportOptions.map((option, index) => (
                            <div
                                key={index}
                                className="p-6 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <option.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                                        <p className="text-muted-foreground">{option.description}</p>
                                    </div>
                                </div>
                                <Button variant="outline" asChild className="w-full">
                                    <Link href={option.href}>{option.cta}</Link>
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 text-center border-t border-border pt-12">
                        <h3 className="font-semibold mb-4">Join the Community</h3>
                        <div className="flex justify-center gap-4">
                            <Button variant="ghost" asChild>
                                <Link href="#">Discord</Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href="#">Twitter / X</Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href="#">GitHub</Link>
                            </Button>
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
}
