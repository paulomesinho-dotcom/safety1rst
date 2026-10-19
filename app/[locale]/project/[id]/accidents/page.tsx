'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useStore } from '@/store/useStore';
import { AlertCircle, Calendar, MapPin, Plus, FileText, Trash2, Edit2, LayoutGrid, List, ShieldAlert } from 'lucide-react';
import { Modal, InputGroup, PrimaryButton } from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { PDFConfigModal } from '@/components/PDFConfigModal';
import { Accident, RiskAssessment } from '@/types';

const Accidents = () => {
    const params = useParams();
    const projectId = params?.id as string;
    const { accidents, addAccident, updateAccident, deleteAccident, accessPoints, riskAssessments, addRiskAssessment, updateRiskAssessment, deleteRiskAssessment } = useStore();

    const [activeTab, setActiveTab] = useState<'incidents' | 'risks'>('incidents');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [isPDFOpen, setIsPDFOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, type: 'incident' | 'risk' } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filter by project
    const projectAccidents = accidents.filter(a => a.projectId === projectId);
    const projectRisks = riskAssessments.filter(r => r.projectId === projectId);
    const availableLocations = accessPoints.filter(p => p.projectId === projectId && p.status === 'active');

    // Forms State
    const [editingAccident, setEditingAccident] = useState<Partial<Accident>>({
        title: '', location: '', locationId: '', severity: 'low', description: '', status: 'open', type: 'accident', date: '', ifcGlobalId: '', mitigationMeasures: ''
    });

    const [editingRisk, setEditingRisk] = useState<Partial<RiskAssessment>>({
        riskName: '', riskType: 'General', riskNature: '', unmitigatedRisk: 'Medium', mitigatedRisk: 'Low', mitigationMeasures: '', ifcGlobalId: ''
    });

    const isEditing = !!editingAccident.id;
    const isEditingRisk = !!editingRisk.id;

    // Handlers
    const handleSubmitAccident = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && editingAccident.id) {
            updateAccident(editingAccident.id, editingAccident);
        } else {
            const locName = availableLocations.find(l => l.id === editingAccident.locationId)?.name || editingAccident.location || 'Unknown';
            addAccident({
                title: editingAccident.title!,
                date: editingAccident.date || new Date().toISOString().split('T')[0],
                location: locName,
                locationId: editingAccident.locationId,
                severity: editingAccident.severity || 'low',
                status: editingAccident.status || 'open',
                type: editingAccident.type || 'accident',
                description: editingAccident.description!,
                projectId,
                ifcGlobalId: editingAccident.ifcGlobalId,
                mitigationMeasures: editingAccident.mitigationMeasures
            });
        }
        setIsModalOpen(false);
    };

    const handleSubmitRisk = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditingRisk && editingRisk.id) {
            updateRiskAssessment(editingRisk.id, editingRisk);
        } else {
            addRiskAssessment({
                ...editingRisk,
                riskName: editingRisk.riskName!,
                status: editingRisk.status || 'draft',
                accountId: editingRisk.accountId || '',
                updatedAt: new Date().toISOString(),
                projectId,
            });
        }
        setIsRiskModalOpen(false);
    };

    const handleExportPDF = (config: any) => {
        const doc = new jsPDF({ orientation: config.orientation, unit: 'mm', format: config.pageSize });

        if (config.headerText) {
            doc.setFontSize(18);
            doc.text(config.headerText, 14, 20);
        }

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        if (activeTab === 'incidents') {
            const tableData = projectAccidents.map(acc => [
                acc.date, acc.title, acc.type.replace('_', ' ').toUpperCase(), acc.severity.toUpperCase(), acc.status.toUpperCase(), acc.location
            ]);
            autoTable(doc, {
                head: [['Date', 'Title', 'Type', 'Severity', 'Status', 'Location']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [220, 53, 69] }
            });
        } else {
            const tableData = projectRisks.map(r => [
                r.riskName, r.riskType || '-', r.unmitigatedRisk || '-', r.mitigatedRisk || '-', r.ifcGlobalId || '-'
            ]);
            autoTable(doc, {
                head: [['Risk Name', 'Type', 'Unmitigated', 'Mitigated', 'IFC GlobalId']],
                body: tableData,
                startY: 40,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [234, 153, 41] }
            });
        }

        doc.save(`${activeTab}_report.pdf`);
        setIsPDFOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#444746] mb-4 px-4 pt-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeTab === 'incidents' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {activeTab === 'incidents' ? <AlertCircle size={24} /> : <ShieldAlert size={24} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-normal text-google-text">Safety & Risks</h2>
                        <p className="text-xs text-gray-500">Manage safety incidents and risk assessments</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-[#131314] p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('incidents')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'incidents' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            Incidents
                        </button>
                        <button
                            onClick={() => setActiveTab('risks')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'risks' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            Risk Assessments
                        </button>
                    </div>

                    <div className="w-px h-6 bg-gray-200 dark:bg-[#444746] mx-1"></div>

                    <div className="flex bg-gray-100 dark:bg-surface p-1 rounded-lg">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-surface shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}><List size={16} /></button>
                    </div>
                    <button onClick={() => setIsPDFOpen(true)} className="flex items-center gap-2 bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#131314] shadow-sm transition-all">
                        <FileText size={18} /> Export Log
                    </button>
                    {activeTab === 'incidents' ? (
                        <button onClick={() => { setEditingAccident({ title: '', location: '', locationId: '', severity: 'low', description: '', status: 'open', type: 'accident', date: '', ifcGlobalId: '', mitigationMeasures: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm transition-all">
                            <Plus size={18} /> Report Incident
                        </button>
                    ) : (
                        <button onClick={() => { setEditingRisk({ riskName: '', riskType: 'General', riskNature: '', unmitigatedRisk: 'Medium', mitigatedRisk: 'Low', mitigationMeasures: '', ifcGlobalId: '' }); setIsRiskModalOpen(true); }} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 shadow-sm transition-all">
                            <Plus size={18} /> Add Risk
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 pb-4 overflow-y-auto">
                    {activeTab === 'incidents' && projectAccidents.map(acc => (
                        <div key={acc.id} className="border border-gray-200 dark:border-[#444746] rounded-xl p-5 hover:border-red-200 hover:shadow-md transition-all bg-white dark:bg-surface group flex flex-col h-full relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => { setEditingAccident(acc); setIsModalOpen(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-surface rounded text-gray-600 dark:text-gray-300"><Edit2 size={16} /></button>
                                <button onClick={() => setDeleteConfirmation({ id: acc.id, type: 'incident' })} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 size={16} /></button>
                            </div>
                            <div className="flex justify-between items-start mb-3 pr-16">
                                <div className="flex flex-col gap-1">
                                    <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${acc.type === 'accident' ? 'bg-red-50 text-red-700 border-red-100' : acc.type === 'near_miss' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>{acc.type.replace('_', ' ')}</span>
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">{acc.title}</h3>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-1">{acc.description}</p>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border capitalize bg-gray-100 border-gray-200">
                                    {acc.severity} Severity
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border capitalize bg-gray-100 border-gray-200">
                                    {acc.status}
                                </span>
                            </div>
                            {acc.ifcGlobalId && <p className="text-xs text-gray-400 mb-2 truncate">IFC GlobalId: {acc.ifcGlobalId}</p>}
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3 mt-auto">
                                <span className="flex items-center gap-1"><Calendar size={14} /> {acc.date}</span>
                                <span className="flex items-center gap-1"><MapPin size={14} /> {acc.location}</span>
                            </div>
                        </div>
                    ))}
                    {activeTab === 'risks' && projectRisks.map(risk => (
                        <div key={risk.id} className="border border-gray-200 dark:border-[#444746] rounded-xl p-5 hover:border-orange-200 hover:shadow-md transition-all bg-white dark:bg-surface group flex flex-col h-full relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => { setEditingRisk(risk); setIsRiskModalOpen(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-surface rounded text-gray-600 dark:text-gray-300"><Edit2 size={16} /></button>
                                <button onClick={() => setDeleteConfirmation({ id: risk.id, type: 'risk' })} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 size={16} /></button>
                            </div>
                            <div className="flex justify-between items-start mb-3 pr-16">
                                <div className="flex flex-col gap-1">
                                    <span className="w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-orange-50 text-orange-700 border-orange-100">{risk.riskType || 'General'}</span>
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight">{risk.riskName}</h3>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-1">{risk.mitigationMeasures || 'No measures defined.'}</p>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border capitalize bg-red-50 text-red-700 border-red-100">
                                    Pre: {risk.unmitigatedRisk || 'Unknown'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border capitalize bg-green-50 text-green-700 border-green-100">
                                    Post: {risk.mitigatedRisk || 'Unknown'}
                                </span>
                            </div>
                            {risk.ifcGlobalId && <p className="text-xs text-gray-400 mb-2 truncate">IFC GlobalId: {risk.ifcGlobalId}</p>}
                        </div>
                    ))}
                    {((activeTab === 'incidents' && projectAccidents.length === 0) || (activeTab === 'risks' && projectRisks.length === 0)) && (
                        <div className="col-span-full text-center py-20 text-gray-400 bg-gray-50 dark:bg-[#131314] rounded-xl border-dashed border-2 border-gray-200">
                            <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No records found</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="px-4 pb-4 overflow-y-auto w-full">
                    {activeTab === 'incidents' ? (
                        <table className="w-full text-xs text-left text-gray-500">
                            <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-[#131314] border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Title</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Severity</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Location</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projectAccidents.map(acc => (
                                    <tr key={acc.id} onClick={() => { setEditingAccident(acc); setIsModalOpen(true); }} className="bg-white dark:bg-surface hover-row cursor-pointer transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono">{acc.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{acc.title}</td>
                                        <td className="px-6 py-4">{acc.type}</td>
                                        <td className="px-6 py-4">{acc.severity}</td>
                                        <td className="px-6 py-4">{acc.status}</td>
                                        <td className="px-6 py-4">{acc.location}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: acc.id, type: 'incident' }); }} className="p-1.5 text-red-600 hover:bg-neutral-100 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-xs text-left text-gray-500">
                            <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-[#131314] border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Risk Name</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Unmitigated</th>
                                    <th className="px-6 py-3 font-medium">Mitigated</th>
                                    <th className="px-6 py-3 font-medium">IFC GlobalId</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projectRisks.map(risk => (
                                    <tr key={risk.id} onClick={() => { setEditingRisk(risk); setIsRiskModalOpen(true); }} className="bg-white dark:bg-surface hover-row cursor-pointer transition-colors group">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{risk.riskName}</td>
                                        <td className="px-6 py-4">{risk.riskType}</td>
                                        <td className="px-6 py-4 text-red-600">{risk.unmitigatedRisk}</td>
                                        <td className="px-6 py-4 text-green-600">{risk.mitigatedRisk}</td>
                                        <td className="px-6 py-4 font-mono">{risk.ifcGlobalId || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({ id: risk.id, type: 'risk' }); }} className="p-1.5 text-red-600 hover:bg-neutral-100 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            <PDFConfigModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} onGenerate={handleExportPDF} />

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={() => {
                    if (deleteConfirmation?.type === 'incident') deleteAccident(deleteConfirmation.id);
                    if (deleteConfirmation?.type === 'risk') deleteRiskAssessment(deleteConfirmation.id);
                    setDeleteConfirmation(null);
                }}
                title={`Delete ${deleteConfirmation?.type === 'incident' ? 'Incident Report' : 'Risk Assessment'}?`}
                message="Are you sure you want to delete this record?"
                description="This action cannot be undone. The record will be permanently removed."
                confirmText="Delete Record"
                variant="danger"
                icon="trash"
            />

            {/* Incident Modal */}
            <Modal title={isEditing ? "Edit Incident Report" : "Report New Incident"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmitAccident}>
                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Incident Type">
                            <select className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500 bg-white dark:bg-surface" value={editingAccident.type} onChange={e => setEditingAccident({ ...editingAccident, type: e.target.value as any })}>
                                <option value="accident">Accident</option>
                                <option value="incident">Incident</option>
                                <option value="near_miss">Near Miss</option>
                            </select>
                        </InputGroup>
                        <InputGroup label="Date">
                            <input type="date" required className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500" value={editingAccident.date || ''} onChange={e => setEditingAccident({ ...editingAccident, date: e.target.value })} />
                        </InputGroup>
                    </div>
                    <InputGroup label="Title">
                        <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500" value={editingAccident.title} onChange={e => setEditingAccident({ ...editingAccident, title: e.target.value })} placeholder="Brief summary of event" />
                    </InputGroup>
                    <InputGroup label="Location">
                        <select required className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500 bg-white" value={editingAccident.locationId || ''} onChange={e => {
                            const selectedId = e.target.value;
                            const selectedLoc = availableLocations.find(l => l.id === selectedId);
                            setEditingAccident({ ...editingAccident, locationId: selectedId, location: selectedLoc?.name || '' });
                        }}>
                            <option value="">Select Location...</option>
                            {availableLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.category})</option>
                            ))}
                        </select>
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Severity">
                            <select className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white" value={editingAccident.severity} onChange={e => setEditingAccident({ ...editingAccident, severity: e.target.value as any })}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </InputGroup>
                        <InputGroup label="Current Status">
                            <select className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white" value={editingAccident.status} onChange={e => setEditingAccident({ ...editingAccident, status: e.target.value as any })}>
                                <option value="open">Open</option>
                                <option value="investigating">Investigating</option>
                                <option value="closed">Closed</option>
                            </select>
                        </InputGroup>
                    </div>

                    <InputGroup label="IFC GlobalId (Optional)">
                        <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500" value={editingAccident.ifcGlobalId || ''} onChange={e => setEditingAccident({ ...editingAccident, ifcGlobalId: e.target.value })} placeholder="e.g. 1QxwA_VpD79w4xP$vK5q_8" />
                    </InputGroup>

                    <InputGroup label="Mitigation Measures">
                        <textarea className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500" rows={2} value={editingAccident.mitigationMeasures || ''} onChange={e => setEditingAccident({ ...editingAccident, mitigationMeasures: e.target.value })} placeholder="Measures taken..." />
                    </InputGroup>

                    <InputGroup label="Description">
                        <textarea className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-red-500" rows={3} value={editingAccident.description} onChange={e => setEditingAccident({ ...editingAccident, description: e.target.value })} placeholder="Detailed description..." />
                    </InputGroup>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <PrimaryButton type="submit" className="bg-red-600 hover:bg-red-700 w-auto px-6">{isEditing ? 'Update' : 'Submit'}</PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Risk Assessment Modal */}
            <Modal title={isEditingRisk ? "Edit Risk Assessment" : "New Risk Assessment"} isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)}>
                <form onSubmit={handleSubmitRisk}>
                    <InputGroup label="Risk Name">
                        <input required type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500" value={editingRisk.riskName} onChange={e => setEditingRisk({ ...editingRisk, riskName: e.target.value })} placeholder="E.g., Fall from height" />
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Risk Type">
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500" value={editingRisk.riskType || ''} onChange={e => setEditingRisk({ ...editingRisk, riskType: e.target.value })} placeholder="E.g., Physical, Chemical" />
                        </InputGroup>
                        <InputGroup label="Risk Nature">
                            <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500" value={editingRisk.riskNature || ''} onChange={e => setEditingRisk({ ...editingRisk, riskNature: e.target.value })} placeholder="Nature details" />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Unmitigated Risk">
                            <select className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white" value={editingRisk.unmitigatedRisk || ''} onChange={e => setEditingRisk({ ...editingRisk, unmitigatedRisk: e.target.value })}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </InputGroup>
                        <InputGroup label="Mitigated Risk">
                            <select className="w-full p-2.5 border border-gray-300 rounded-lg outline-none bg-white" value={editingRisk.mitigatedRisk || ''} onChange={e => setEditingRisk({ ...editingRisk, mitigatedRisk: e.target.value })}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </InputGroup>
                    </div>

                    <InputGroup label="Mitigation Measures">
                        <textarea className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500 min-h-[80px]" value={editingRisk.mitigationMeasures || ''} onChange={e => setEditingRisk({ ...editingRisk, mitigationMeasures: e.target.value })} placeholder="Describe measures to reduce risk..." />
                    </InputGroup>

                    <InputGroup label="IFC GlobalId (Optional)">
                        <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:border-orange-500" value={editingRisk.ifcGlobalId || ''} onChange={e => setEditingRisk({ ...editingRisk, ifcGlobalId: e.target.value })} placeholder="e.g. 2Qw$2_..." />
                    </InputGroup>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsRiskModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <PrimaryButton type="submit" className="bg-orange-600 hover:bg-orange-700 w-auto px-6">{isEditingRisk ? 'Update' : 'Save'}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Accidents;
