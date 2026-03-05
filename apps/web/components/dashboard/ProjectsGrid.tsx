'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Database, Clock, RefreshCw, Trash2, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { PlanType } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

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
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Time formatting helper
    const getRelativeTime = (isoString: string) => {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const daysDifference = Math.round((new Date(isoString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        if (daysDifference === 0) {
            const hoursDiff = Math.round((new Date(isoString).getTime() - new Date().getTime()) / (1000 * 60 * 60));
            if (hoursDiff === 0) return 'Just now';
            return rtf.format(hoursDiff, 'hour');
        }
        return rtf.format(daysDifference, 'day');
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
        // Optimistic UI update
        setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'syncing' } : p));

        try {
            const res = await apiFetch(`/projects/${id}/sync`, { method: 'POST' });
            if (res.ok) {
                setTimeout(() => {
                    setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'synced', last_synced_at: new Date().toISOString() } : p));
                }, 1500); // Artificial delay to ensure user sees the spinner
            } else {
                throw new Error('Sync failed');
            }
        } catch (err) {
            setProjects(projects.map(p => p.id === id ? { ...p, sync_status: 'error' } : p));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this project?')) return;

        setRemovingId(id);
        try {
            const res = await apiFetch(`/projects/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setProjects(projects.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete', err);
        } finally {
            setRemovingId(null);
        }
    };

    const isFreePlan = plan === 'free';

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">My Projects</h1>
                    <p className="text-muted-foreground">Manage and synchronize your knowledge graphs across devices.</p>
                </div>

                {/* Add Project Button / Tooltip */}
                <div className="relative group">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={isFreePlan}
                        className={`flex items-center gap-2 font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm
              ${isFreePlan
                                ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-70'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            }
            `}
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Project</span>
                    </button>

                    {isFreePlan && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 w-max shadow-xl">
                            Upgrade to Pro to add more projects
                            {/* Tooltip triangle */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {projects.map((project) => (
                        <motion.div
                            key={project.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                            transition={{ duration: 0.2 }}
                            className="bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative group overflow-hidden flex flex-col h-full"
                        >
                            {/* Ambient Hover Glow */}
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-secondary rounded-xl text-primary">
                                        <Folder className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground truncate max-w-[150px]">{project.name}</h3>
                                </div>

                                {/* Status Badge */}
                                <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs border
                  ${project.sync_status === 'synced' ? 'bg-primary/10 text-primary border-primary/20' : ''}
                  ${project.sync_status === 'syncing' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : ''}
                  ${project.sync_status === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''}
                `}>
                                    {project.sync_status === 'synced' && <><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Synced</>}
                                    {project.sync_status === 'syncing' && <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing</>}
                                    {project.sync_status === 'error' && <><AlertTriangle className="w-3 h-3" /> Error</>}
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 flex-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Database className="w-4 h-4" />
                                    <span>{project.node_count.toLocaleString()} nodes</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span>{getRelativeTime(project.last_synced_at)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
                                <button
                                    onClick={() => handleSync(project.id)}
                                    disabled={project.sync_status === 'syncing'}
                                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${project.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                                    Sync Now
                                </button>

                                <button
                                    onClick={() => handleDelete(project.id)}
                                    disabled={removingId === project.id}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                                    aria-label="Delete project"
                                >
                                    {removingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State */}
                {projects.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-card/20 border border-dashed border-border rounded-3xl">
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                            <Folder className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No Projects Found</h3>
                        <p className="text-muted-foreground max-w-sm">You haven't created any projects yet. Click adding a new project to get started.</p>
                    </div>
                )}
            </div>

            {/* Add Project Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-border/50">
                            <h2 className="text-xl font-bold text-foreground">Create New Project</h2>
                        </div>

                        <form onSubmit={handleCreateProject} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Project Name</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="e.g. Thesis Research"
                                    autoFocus
                                    required
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                                />
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newProjectName.trim()}
                                    className="px-5 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </>
    );
}
