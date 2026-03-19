'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, Loader2, X } from 'lucide-react';
import { PlanType } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { ProjectCard } from './ProjectCard';
import { DashboardCard } from './DashboardCard';

export interface ProjectData {
    id: string;
    name: string;
    node_count: number;
    last_synced_at: string;
    sync_status: 'synced' | 'syncing' | 'error';
}

interface ProjectsGridProps {
    initialProjects: ProjectData[];
    plan: PlanType;
}

export function ProjectsGrid({ initialProjects, plan }: ProjectsGridProps) {
    const [projects, setProjects] = useState<ProjectData[]>(initialProjects);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Time formatting helper
    const getRelativeTime = (isoString: string) => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const diffMs = new Date(isoString).getTime() - new Date().getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.round(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) return 'Just now';
            return rtf.format(diffHours, 'hour');
        }
        return rtf.format(diffDays, 'day');
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        try {
            setIsSubmitting(true);
            const res = await apiFetch('/projects', {
                method: 'POST',
                body: JSON.stringify({ name: newProjectName })
            });
            if (res.ok) {
                const newProject = await res.json();
                setProjects([newProject, ...projects]);
                setIsAddModalOpen(false);
                setNewProjectName('');
            }
        } catch {
            console.error('Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSync = async (id: string) => {
        setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'syncing' } : p));

        try {
            const res = await apiFetch(`/projects/${id}/sync`, { method: 'POST' });
            if (res.ok) {
                setTimeout(() => {
                    setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'synced', last_synced_at: new Date().toISOString() } : p));
                }, 1500);
            } else {
                throw new Error('Sync failed');
            }
        } catch {
            setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'error' } : p));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this project?')) return;

        try {
            const res = await apiFetch(`/projects/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setProjects(projects.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete', err);
        }
    };

    const isFreePlan = plan === 'free';

    return (
        <div className="space-y-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-amber mb-3 block">
                        Project Management
                    </span>
                    <h1 className="text-4xl font-serif font-black text-ink tracking-tight leading-none mb-2">My Projects</h1>
                    <p className="text-neutral-500 text-[13px] font-mono leading-relaxed">Manage and synchronize your knowledge graphs across devices.</p>
                </div>

                <div className="relative group/btn">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isFreePlan}
                        className={`flex items-center gap-2 text-[12px] font-mono uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm relative z-10
                            ${isFreePlan
                                ? 'bg-ink/5 text-neutral-600 cursor-not-allowed border border-ink/5'
                                : 'bg-ink text-paper hover:opacity-80 hover:shadow-[0_10px_30px_rgba(100,100,100,0.1)] active:scale-95'
                            }
                        `}
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Project</span>
                    </button>

                    {isFreePlan && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-ink text-paper text-[10px] font-mono uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-transparent">
                            Upgrade to Pro to add more projects
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink"></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {projects.map((project, i) => (
                        <motion.div
                            key={project.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                            transition={{ duration: 0.4, delay: i * 0.05 }}
                            className="h-full"
                        >
                            <ProjectCard
                                name={project.name}
                                nodeCount={project.node_count}
                                lastSync={getRelativeTime(project.last_synced_at)}
                                status={project.sync_status}
                                onSync={() => handleSync(project.id)}
                                onDelete={() => handleDelete(project.id)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State */}
                {projects.length === 0 && (
                    <div className="col-span-full py-20">
                        <DashboardCard hover={false} className="flex flex-col items-center justify-center text-center py-16 border-dashed border-ink/10">
                            <div className="w-16 h-16 bg-ink/5 rounded-full flex items-center justify-center mb-6 text-neutral-500">
                                <Folder className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-ink mb-2">No Projects Found</h3>
                            <p className="text-neutral-500 font-mono text-[13px] max-w-sm">You haven&apos;t created any knowledge architecture yet. Begin by initializing your first project.</p>
                        </DashboardCard>
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-paper w-full max-w-md rounded-2xl border border-ink/10 shadow-[0_30px_60px_rgba(0,0,0,0.1)] overflow-hidden relative z-10"
                        >
                            <div className="p-8 border-b border-ink/5 flex items-center justify-between">
                                <h2 className="text-2xl font-serif font-black text-ink">Initialize Project</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-500 hover:text-ink transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateProject} className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-500">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                        placeholder="e.g. Cognitive Network"
                                        autoFocus
                                        required
                                        className="w-full bg-ink/5 border border-ink/5 rounded-xl px-5 py-3.5 text-ink font-mono placeholder:text-neutral-500 focus:outline-none focus:border-amber/30 focus:bg-ink/10 transition-all"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 py-3.5 rounded-xl font-mono text-[12px] uppercase tracking-widest text-neutral-500 hover:text-ink hover:bg-ink/5 transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !newProjectName.trim()}
                                        className="flex-2 py-3.5 rounded-xl font-mono text-[12px] uppercase tracking-widest bg-ink text-paper hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
