'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ProjectsGrid, ProjectData } from '@/components/dashboard/ProjectsGrid';
import { PlanType } from '@/lib/constants';
import { useUser } from '@/components/providers/UserContext';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
    const { user, isLoading: userLoading } = useUser();
    const [projects, setProjects] = useState<ProjectData[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadProjects = async () => {
        setError(null);
        setProjects(null);
        try {
            const res = await apiFetch('/projects/me');
            if (!res.ok) throw new Error('Failed to load projects');
            const data = await res.json();
            setProjects(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const plan = (user?.plan as PlanType) || 'free';

    if (error) {
        return (
            <div className="p-6 text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col items-center gap-4 max-w-md mx-auto mt-16">
                <p className="text-sm text-center">{error}</p>
                <button onClick={loadProjects} className="px-4 py-2 text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    if (!projects || userLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-amber animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProjectsGrid initialProjects={projects} plan={plan} />
        </div>
    );
}
