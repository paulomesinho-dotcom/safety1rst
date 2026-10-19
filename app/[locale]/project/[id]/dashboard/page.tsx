'use client';

import React, { useState } from 'react';

import { useStore } from '@/store/useStore';
import { generateIfcExport } from '@/lib/ifc-export';
import {
    Activity, Users, HardHat, Building2, AlertTriangle, FileText, CheckCircle2, Clock, Calendar, Heart, Shield, Phone, Download, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/Modal';

export default function ProjectDashboardPage() {
    // Params can be retrieved from hook
    const params = useParams();
    const id = params?.id as string;

    // Legacy context removal: ProjectLayout now provides visual layout but context usage via Outlet is gone.
    // Logic should be direct via store or props if passed, but easier to use store with ID.
    const { projects, workers, companies, equipment, trainings } = useStore();

    // Re-fetch project/role/permissions if needed or use store selectors
    const currentProject = projects.find(p => p.id === id);

    // Preview State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    const handleIfcExport = () => {
        if (!currentProject) return;
        const projectCompanies = companies.filter(c => c.projectId === id);
        const projectWorkers = workers.filter(w => w.projectId === id);
        const projectEquipments = equipment.filter(e => e.projectId === id);

        const ifcData = generateIfcExport(currentProject, projectCompanies, projectWorkers, projectEquipments);

        const blob = new Blob([ifcData], { type: 'application/x-step' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.name.replace(/ /g, '_')}.ifc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleIfcPreview = () => {
        if (!currentProject) return;
        const projectCompanies = companies.filter(c => c.projectId === id);
        const projectWorkers = workers.filter(w => w.projectId === id);
        const projectEquipments = equipment.filter(e => e.projectId === id);

        const ifcData = generateIfcExport(currentProject, projectCompanies, projectWorkers, projectEquipments);
        setPreviewContent(ifcData);
        setIsPreviewOpen(true);
    }

    if (!currentProject) return null;

    // Calculate Stats
    const projectWorkers = workers.filter(w => w.projectId === id);
    const activeWorkers = projectWorkers.filter(w => w.status === 'active').length;

    const projectCompanies = companies.filter(c => c.projectId === id);
    const activeCompanies = projectCompanies.filter(c => c.status === 'active').length;

    const projectEquipment = equipment.filter(e => e.projectId === id);

    // Calculate First Aid Qualified
    const firstAidTrainings = trainings.filter(t => t.projectId === id && t.type === 'first_aid');
    const firstAidTrainingIds = firstAidTrainings.map(t => t.id);
    const activeFirstAidWorkers = projectWorkers.filter(w =>
        w.status === 'active' &&
        w.completedTrainingIds?.some(docId => firstAidTrainingIds.includes(docId))
    );
    const firstAidWorkersCount = activeFirstAidWorkers.length;

    // Get detailed list for widget
    const firstAidersList = activeFirstAidWorkers.slice(0, 5); // Limit to 5 for dashboard

    const stats = [
        { label: 'Active Workers', value: activeWorkers, total: projectWorkers.length, icon: Users, color: 'text-primary', bg: 'bg-primary-light' },
        { label: 'Companies', value: activeCompanies, total: projectCompanies.length, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Equipment', value: projectEquipment.length, total: projectEquipment.length, icon: HardHat, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'First Aid Response', value: firstAidWorkersCount, total: activeWorkers, icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const tasks = [
        { id: 1, title: 'Review Safety Plan for Zone B', due: 'Today', status: 'pending', priority: 'high' },
        { id: 2, title: 'Approve new worker documents', due: 'Tomorrow', status: 'in_progress', priority: 'medium' },
        { id: 3, title: 'Weekly equipment inspection', due: 'Fri, Oct 24', status: 'pending', priority: 'low' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-heading font-light text-gray-900 dark:text-white">{currentProject.name}</h1>
                    <p className="text-gray-500 mt-1">Project Overview & Statistics</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleIfcPreview}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-[#131314] text-sm font-medium shadow-sm transition-all"
                    >
                        <Eye size={16} /> Preview IFC
                    </button>
                    <button
                        onClick={handleIfcExport}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-medium shadow-sm transition-all"
                    >
                        <Download size={16} /> Export IFC
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-surface p-5 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746] flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
                                <span className="text-xs text-gray-400">/ {stat.total}</span>
                            </div>
                        </div>
                        <div className={cn("p-2 rounded-lg", stat.bg)}>
                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart / Activity Area (Mock) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Activity size={18} className="text-primary" />
                                Safety Compliance Trend
                            </h3>
                            <select className="text-sm border-none bg-gray-50 dark:bg-[#131314] rounded-lg px-3 py-1 text-gray-600 dark:text-gray-300 outline-none">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                            </select>
                        </div>
                        <div className="h-64 w-full bg-gray-50 dark:bg-[#131314] rounded-lg flex items-center justify-center text-gray-400 text-sm">
                            [Chart Placeholder: Compliance Score over time]
                        </div>
                    </div>
                </div>

                {/* Side Widgets */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-600" />
                                Pending Tasks
                            </h3>
                            <span className="text-xs font-medium bg-gray-100 dark:bg-surface text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">3</span>
                        </div>
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover-row transition-colors border border-transparent hover:border-gray-100 dark:hover:border-[#444746] cursor-pointer">
                                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                                        task.priority === 'high' ? 'bg-red-500' :
                                            task.priority === 'medium' ? 'bg-orange-500' : 'bg-primary-light0'
                                    )} />
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <Clock size={12} /> {task.due}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-sm text-primary font-medium hover:bg-primary-light rounded-lg transition-colors">
                            View All Tasks
                        </button>
                    </div>

                    <div className="bg-white dark:bg-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-[#444746]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Shield size={18} className="text-red-600" />
                                On-Site First Aiders
                            </h3>
                            <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{activeFirstAidWorkers.length} Available</span>
                        </div>
                        <div className="space-y-3">
                            {firstAidersList.length > 0 ? (
                                firstAidersList.map(worker => (
                                    <div key={worker.id} className="flex items-center justify-between p-2 rounded-lg hover-row border border-transparent hover:border-gray-100 dark:hover:border-[#444746]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary-hover font-bold text-xs ring-2 ring-white shadow-sm">
                                                {worker.avatarUrl ? (
                                                    <img src={worker.avatarUrl} alt={worker.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    worker.name.split(' ').map(n => n[0]).join('').substring(0, 2)
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.name}</p>
                                                <p className="text-xs text-gray-500">{worker.role}</p>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-green-600 hover:bg-green-50 p-1.5 rounded-full transition-colors" title={worker.phone || 'No phone'}>
                                            <Phone size={14} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic text-center py-4">No first aiders currently active.</p>
                            )}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs text-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-50 pt-3">
                            View All Qualifications
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                title="IFC Export Preview"
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                maxWidth="max-w-5xl"
            >
                <div>
                    <div className="bg-gray-50 dark:bg-[#131314] p-4 rounded-lg border border-gray-200 dark:border-[#444746] overflow-auto max-h-[60vh]">
                        <pre className="text-xs font-mono text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{previewContent}</pre>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => setIsPreviewOpen(false)}
                            className="px-4 py-2 bg-gray-100 dark:bg-surface text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 text-sm font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
