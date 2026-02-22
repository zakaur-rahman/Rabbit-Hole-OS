'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ProjectsGrid, ProjectData } from '@/components/dashboard/ProjectsGrid';
import { PlanType } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function ProjectsPage() {
    const [data, setData] = useState<{ projects: ProjectData[], plan: PlanType } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProjects() {
            try {
                // Fetch User Plan & Projects in parallel
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
        }
        loadProjects();
    }, []);

    if (error) {
        return <div className="p-4 text-destructive bg-destructive/10 rounded-xl">{error}</div>;
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
