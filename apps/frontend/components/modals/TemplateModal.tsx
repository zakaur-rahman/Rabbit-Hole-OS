import React from 'react';
import { X, FileText, CheckSquare, Lightbulb, BookOpen } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    content: string;
    tags: string[];
}

const TEMPLATES: Template[] = [
    {
        id: 'meeting',
        name: 'Meeting Notes',
        description: 'Track attendees, agenda, and action items',
        icon: <FileText className="text-blue-400" />,
        content: `# Meeting: [Topic]
**Date:** ${new Date().toLocaleDateString()}
**Attendees:** 
- [ ] 

## Agenda
1. 
2. 

## Notes
- 

## Action Items
- [ ] 
`,
        tags: ['meeting', 'work']
    },
    {
        id: 'project',
        name: 'Project Plan',
        description: 'Define problem, solution, and milestones',
        icon: <Lightbulb className="text-yellow-400" />,
        content: `# Project: [Name]

## Problem Statement
What are we solving?

## Solution
How will we solve it?

## Milestones
- [ ] Phase 1: MVP
- [ ] Phase 2: Polish
`,
        tags: ['project', 'planning']
    },
    {
        id: 'learning',
        name: 'Learning Topic',
        description: 'Structure for learning new concepts',
        icon: <BookOpen className="text-green-400" />,
        content: `# Topic: [Subject]

## Core Concepts
- Definition: 

## Resources
- [Link Description](url)

## Summary
What did I learn?
`,
        tags: ['learning', 'study']
    },
    {
        id: 'todo',
        name: 'Task List',
        description: 'Simple checklist for tasks',
        icon: <CheckSquare className="text-red-400" />,
        content: `# Tasks

- [ ] High Priority
- [ ] Medium Priority
- [ ] Low Priority
`,
        tags: ['tasks']
    }
];

interface TemplateModalProps {
    onClose: () => void;
    onSelect: (template: Template) => void;
}

export default function TemplateModal({ onClose, onSelect }: TemplateModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Choose a Template</h2>
                    <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                    {TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => onSelect(template)}
                            className="flex flex-col gap-3 p-4 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 rounded-xl transition-all text-left group"
                        >
                            <div className="flex items-start justify-between w-full">
                                <div className="p-2 bg-neutral-700/50 rounded-lg group-hover:scale-110 transition-transform">
                                    {template.icon}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-white">{template.name}</h3>
                                <p className="text-sm text-neutral-400">{template.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
