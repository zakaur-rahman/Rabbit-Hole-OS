'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ProjectsGrid, ProjectData } from '@/components/dashboard/ProjectsGrid';
import { PlanType } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
    const [data, setData] = useState<{ projects: ProjectData[], plan: PlanType } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadProjects = async () => {
        setError(null);
        setData(null);
        try {
            const [userRes, projectsRes] = await Promise.all([
                apiFetch('/oauth/me'),
                apiFetch('/projects/me')
            ]);

            if (!userRes.ok || !projectsRes.ok) throw new Error('Failed to load projects view');

            const user = await userRes.json();
            const projects = await projectsRes.json();

            setData({
                projects,
                plan: (user.plan as PlanType) || 'free'
            });
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    if (error) {
        return (
            <div className="p-6 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col items-center gap-4 max-w-md mx-auto mt-16">
                <p className="text-sm text-center">{error}</p>
                <button onClick={loadProjects} className="px-4 py-2 text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ProjectsGrid initialProjects={data.projects} plan={data.plan} />
        </div>
    );
}
