const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'app/[locale]/project/[id]/companies/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add state for the new modal
const stateRegex = /const \[reviewModalOpen, setReviewModalOpen\] = useState\(false\);/;
content = content.replace(stateRegex, `const [reviewModalOpen, setReviewModalOpen] = useState(false);\n    const [selectedDocRow, setSelectedDocRow] = useState<any>(null);`);

// 2. Add the DocumentDetailsModal rendering at the end of the module or near other modals 
// Actually we can place it just before `</Drawer>` or alongside `reviewModalOpen`. We will put it after the drawer but before the final return.
// Better: just put it inside the existing render tree, outside the Drawer or inside the CompaniesPage root.
// Let's add it right before `return (` of the main render? Wait, where is `<PDFConfigModal`?
const modalInsertionRegex = /<ProfileManagerModal /;
const documentDetailsModalCode = `
            {selectedDocRow && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-[#444746] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#444746] bg-gray-50/50 dark:bg-surface/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedDocRow.label}</h2>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">{selectedDocRow.category.replace(/_/g, ' ')}</p>
                            </div>
                            <button
                                onClick={() => setSelectedDocRow(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-surface rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
                            
                            {/* Controls Action Bar (Approve/Reject/Validate/Review) */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-surface rounded-xl border border-gray-100 dark:border-[#444746]">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow Actions:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     {isEditing && selectedDocRow.canRequestReview && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReviewField({ id: selectedDocRow.id, label: selectedDocRow.label, currentValue: selectedDocRow.value });
                                                setReviewModalOpen(true);
                                                setSelectedDocRow(null); // Optional: close modal
                                            }}
                                            title="Solicitar Revisão"
                                            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-surface text-primary border border-primary/20 hover:bg-primary-light transition-colors shadow-sm text-sm font-medium"
                                        >
                                            <MessageSquare size={16} /> Request Review
                                        </button>
                                    )}

                                    {isEditing && selectedDocRow.canValidate && (
                                        <button
                                            type="button"
                                            onClick={selectedDocRow.onToggleValidation}
                                            className={"flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm text-sm font-medium " + 
                                                (selectedDocRow.isValidated
                                                    ? "bg-green-600 text-white border-green-700"
                                                    : "bg-white dark:bg-surface text-gray-700 border-gray-200 hover:border-green-300 hover:text-green-700 hover:bg-green-50")
                                            }
                                        >
                                            {selectedDocRow.isValidated ? <Check size={16} strokeWidth={3} /> : <Check size={16} />}
                                            {selectedDocRow.isValidated ? t('common.valid') : t('actions.validate')}
                                        </button>
                                    )}

                                     {isEditing && selectedDocRow.canApprove && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    approveCompany(newItem.id);
                                                    setSelectedDocRow(null);
                                                }}
                                                className={"flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg transition-all border shadow-sm text-sm font-medium " + 
                                                    (selectedDocRow.approvalStatus === 'approved'
                                                        ? "bg-primary text-white border-blue-700"
                                                        : "bg-white dark:bg-surface text-primary border-primary/20 hover:bg-primary-light")
                                                }
                                            >
                                                {selectedDocRow.approvalStatus === 'approved' ? <Shield size={16} strokeWidth={3} /> : <Shield size={16} />}
                                                {selectedDocRow.approvalStatus === 'approved' ? t('status.approved') : t('actions.approve')}
                                            </button>
                                            {selectedDocRow.approvalStatus !== 'approved' && selectedDocRow.onReject && (
                                                <button
                                                    type="button"
                                                    onClick={selectedDocRow.onReject}
                                                    className="flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                                                    title={t('actions.reject')}
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Main Input Field */}
                            <div>
                                {selectedDocRow.renderControl()}
                            </div>

                            {/* Documents Upload & List */}
                            <div className="border-t border-gray-200 dark:border-[#444746] pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Paperclip size={16} className="text-gray-400" /> Attached Files
                                    </h4>
                                    {selectedDocRow.isUploadVisible && (isManager || isDataUser || !isApprovalUser) && isEditing && (
                                        <DocumentUpload
                                            entityId={selectedDocRow.entityId}
                                            projectId={projectId}
                                            category={selectedDocRow.category}
                                            layout="button"
                                            label="Upload"
                                            systemLabel={selectedDocRow.label}
                                            onOperation={(op) => {
                                                if (op.type === 'upload') handleSessionUpload(op.fileId);
                                            }}
                                            enableAI={true}
                                            aiType={selectedDocRow.type === 'date' ? 'date' : 'text'}
                                            onSmartComplete={(data) => {
                                                if (data.date && selectedDocRow.type === 'date') {
                                                    setNewItem(prev => ({ ...prev, [selectedDocRow.id]: data.date }));
                                                } else if (data.text && selectedDocRow.type === 'text') {
                                                    setNewItem(prev => ({ ...prev, [selectedDocRow.id]: data.text }));
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="bg-gray-50/50 dark:bg-[#131314] rounded-xl p-4 border border-gray-100 dark:border-[#444746]">
                                    <DocumentList
                                        entityId={selectedDocRow.entityId}
                                        projectId={projectId}
                                        category={selectedDocRow.category}
                                        isEditing={isEditing}
                                        workflowStatus={newItem.workflowStatus}
                                        onDelete={handleSessionDelete}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ProfileManagerModal `;

content = content.replace(modalInsertionRegex, documentDetailsModalCode);


// 3. Replace the entire "activeTab === 'legal'" section
const startSearch = "{activeTab === 'legal' && (";
const endSearch = "{activeTab === 'site' && (";
const startIndex = content.indexOf(startSearch);
const endIndex = content.indexOf(endSearch);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find the bounds for the replacement.");
    process.exit(1);
}

const replacementCode = `{activeTab === 'legal' && (() => {
                                    // Prepare Rows Configuration
                                    const selectedProfile = companyProfiles.find(p => p.id === newItem.profileId);
                                    
                                    const isFieldVisible = (key: string) => {
                                        if (!newItem.profileId) return true;
                                        if (!selectedProfile) return true;
                                        return !!selectedProfile.requirements?.[key as keyof typeof selectedProfile.requirements];
                                    };
                                    
                                    const isUploadVisible = (key: string) => {
                                        if (!newItem.profileId) return true;
                                        if (!selectedProfile) return true;
                                        return selectedProfile.standardUploads?.[key] !== false;
                                    };

                                    const buildRow = (id, category, group, label, type, baseKey) => {
                                        const hasDocs = documents.some(d => d.entityId === newItem.id && d.category === category && !d.archived);
                                        const fieldProps = getFieldProps(id, label);
                                        const isValidated = newItem.fieldValidations?.[id];
                                        const workflowStatus = newItem.workflowStatus;
                                        
                                        const canRequestReview = (isManager && workflowStatus !== 'draft' && workflowStatus !== 'data_requested') || (isApprovalUser && workflowStatus === 'approval_pending');
                                        
                                        return {
                                            id,
                                            category,
                                            group,
                                            label,
                                            type,
                                            value: newItem[id],
                                            isUploadVisible: isUploadVisible(baseKey),
                                            hasDocs,
                                            entityId: newItem.id,
                                            
                                            isValidated: isValidated,
                                            canValidate: isManager && isEditing,
                                            onToggleValidation: () => {
                                                const isValidating = !isValidated;
                                                toggleFieldValidation(newItem.id, id, isValidating);
                                                if (!isValidating) {
                                                    const resolvedTickets = (newItem.tickets || []).filter(t => t.fieldId === id && t.status === 'resolved');
                                                    resolvedTickets.forEach(t => updateTicket(t.id, { status: 'open' }));
                                                }
                                                setNewItem(prev => ({...prev, fieldValidations: {...prev.fieldValidations, [id]: isValidating}}));
                                            },
                                            
                                            canRequestReview,
                                            approvalStatus: newItem.approvalStatus,
                                            canApprove: isApprovalUser && workflowStatus === 'validated',
                                            onReject: null,
                                            
                                            hasOpenTicket: fieldProps.hasOpenTicket,
                                            
                                            // The render function for the input
                                            renderControl: () => (
                                                <FieldControl {...fieldProps} isEditing={isEditing}>
                                                    <input 
                                                        type={type === 'month' ? 'month' : (type === 'date' ? 'date' : 'text')} 
                                                        disabled={fieldProps.isDisabled} 
                                                        className="w-full p-3 text-[13px] border border-gray-300 dark:border-[#444746] rounded-xl outline-none focus:border-blue-500 transition-colors bg-white dark:bg-surface"
                                                        value={newItem[id] || ''} 
                                                        onChange={e => setNewItem({ ...newItem, [id]: e.target.value })} 
                                                    />
                                                </FieldControl>
                                            )
                                        };
                                    };

                                    const rows = [];
                                    
                                    // Seguros
                                    if (isFieldVisible('insurance_at')) {
                                        rows.push(buildRow('insuranceWorkAccDate', 'insurance_work_acc_receipt', 'insurancePolicies', t('fields.insuranceWorkAccDate') || "Workers' Comp. - Receipt", 'date', 'insurance_at'));
                                        rows.push(buildRow('insuranceWorkAccPolicy', 'insurance_work_acc_policy', 'insurancePolicies', t('fields.insuranceWorkAccPolicy') || "Workers' Comp. - Policy", 'text', 'insurance_at'));
                                    }
                                    if (isFieldVisible('insurance_rc')) {
                                        rows.push(buildRow('insuranceCivilDate', 'insurance_civil_receipt', 'insurancePolicies', t('fields.insuranceCivilDate') || "Liability - Receipt", 'date', 'insurance_rc'));
                                        rows.push(buildRow('insuranceCivilPolicy', 'insurance_civil_policy', 'insurancePolicies', t('fields.insuranceCivilPolicy') || "Liability - Policy", 'text', 'insurance_rc'));
                                    }
                                    
                                    // Financas e SS
                                    if (isFieldVisible('finance_ss')) rows.push(buildRow('cleanSSDate', 'finance_ss', 'financeAndSS', t('fields.cleanSSDate') || "Social Security (Expiration)", 'date', 'finance_ss'));
                                    if (isFieldVisible('finance_fin')) rows.push(buildRow('cleanFinDate', 'finance_fin', 'financeAndSS', t('fields.cleanFinDate') || "Tax Authority (Expiration)", 'date', 'finance_fin'));
                                    if (isFieldVisible('ss_discount')) rows.push(buildRow('ssDiscountSheet', 'ss_discount_sheet', 'financeAndSS', t('fields.ssDiscountSheet') || "SS Payment Sheet", 'month', 'ss_discount'));
                                    if (isFieldVisible('pss_acceptance')) rows.push(buildRow('pssAcceptanceDate', 'pss_acceptance', 'financeAndSS', t('fields.pssAcceptanceDate') || "H&S Plan Acceptance", 'date', 'pss_acceptance'));

                                    // Work Schedule (Custom boolean delivery style)
                                    if (isFieldVisible('work_schedule')) {
                                        const id = 'workScheduleDelivered';
                                        const hasDocs = documents.some(d => d.entityId === newItem.id && d.category === 'work_schedule' && !d.archived);
                                        const fieldProps = getFieldProps(id, t('fields.workScheduleDelivered') || 'Work Schedule');
                                        rows.push({
                                            id,
                                            category: 'work_schedule',
                                            group: 'managementDocs',
                                            label: t('fields.workScheduleDelivered') || 'Work Schedule',
                                            type: 'boolean',
                                            value: newItem[id] ? 'Delivered' : 'Pending',
                                            isUploadVisible: isUploadVisible('work_schedule'),
                                            hasDocs,
                                            entityId: newItem.id,
                                            isValidated: newItem.fieldValidations?.[id],
                                            hasOpenTicket: fieldProps.hasOpenTicket,
                                            renderControl: () => (
                                                <FieldControl {...fieldProps} isEditing={isEditing}>
                                                    <div className="mt-2 p-3 border rounded-lg bg-white dark:bg-surface flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={"w-2 h-2 rounded-full " + (newItem[id] ? "bg-green-500" : "bg-red-500")} />
                                                            <span className="text-sm font-medium">{newItem[id] ? 'Delivered' : 'Not Delivered'}</span>
                                                        </div>
                                                    </div>
                                                </FieldControl>
                                            )
                                        });
                                    }

                                    // Custom Documents loop
                                    if (selectedProfile && selectedProfile.customDocuments) {
                                        selectedProfile.customDocuments.forEach(doc => {
                                             if (doc.dataType === 'boolean' && newItem.customDocuments?.[doc.id]?.value === 'false') return; // Hidden
                                             
                                             const fieldKey = \`custom_\${doc.id}\`;
                                             const hasDocs = documents.some(d => d.entityId === newItem.id && d.category === doc.id && !d.archived);
                                             const fieldProps = getFieldProps(doc.id, doc.name);
                                             const isValidated = newItem.fieldValidations?.[fieldKey];
                                             
                                             rows.push({
                                                id: doc.id,
                                                category: doc.id,
                                                group: 'customDocuments',
                                                label: doc.name,
                                                type: doc.dataType,
                                                value: newItem.customDocuments?.[doc.id]?.value,
                                                isUploadVisible: true,
                                                hasDocs,
                                                entityId: newItem.id,
                                                isValidated,
                                                hasOpenTicket: fieldProps.hasOpenTicket,
                                                canValidate: isManager && isEditing,
                                                onToggleValidation: () => {
                                                    const isValidating = !isValidated;
                                                    toggleFieldValidation(newItem.id, fieldKey, isValidating);
                                                    setNewItem(prev => ({...prev, fieldValidations: {...prev.fieldValidations, [fieldKey]: isValidating}}));
                                                },
                                                canRequestReview: (isManager && newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested') || (isApprovalUser && newItem.workflowStatus === 'approval_pending'),
                                                renderControl: () => (
                                                    <FieldControl {...fieldProps} isEditing={isEditing}>
                                                        {doc.dataType === 'boolean' ? (
                                                            <select className="w-full p-3 text-[13px] border rounded-xl bg-white dark:bg-surface" value={newItem.customDocuments?.[doc.id]?.value || 'false'}
                                                                onChange={e => setNewItem({ ...newItem, customDocuments: { ...(newItem.customDocuments || {}), [doc.id]: { ...(newItem.customDocuments?.[doc.id] || {}), value: e.target.value } } })}
                                                                disabled={fieldProps.isDisabled}>
                                                                <option value="false">No</option>
                                                                <option value="true">Yes</option>
                                                            </select>
                                                        ) : (doc.dataType === 'single_select' || doc.dataType === 'multi_select') ? (
                                                            <select className="w-full p-3 text-[13px] border rounded-xl bg-white dark:bg-surface" value={newItem.customDocuments?.[doc.id]?.value || ''}
                                                                onChange={e => setNewItem({ ...newItem, customDocuments: { ...(newItem.customDocuments || {}), [doc.id]: { ...(newItem.customDocuments?.[doc.id] || {}), value: e.target.value } } })}
                                                                disabled={fieldProps.isDisabled} multiple={doc.dataType === 'multi_select'}>
                                                                <option value="">Select option...</option>
                                                                {doc.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        ) : (
                                                            <input type={doc.dataType === 'date' || doc.dataType === 'month' ? doc.dataType : (doc.dataType === 'number' ? 'number' : 'text')} 
                                                                className="w-full p-3 text-[13px] border rounded-xl"
                                                                value={newItem.customDocuments?.[doc.id]?.value || ''}
                                                                onChange={e => setNewItem({ ...newItem, customDocuments: { ...(newItem.customDocuments || {}), [doc.id]: { ...(newItem.customDocuments?.[doc.id] || {}), value: e.target.value } } })}
                                                                disabled={fieldProps.isDisabled} />
                                                        )}
                                                    </FieldControl>
                                                )
                                             });
                                        });
                                    }

                                    // Grouping Rows
                                    const groups = {
                                        insurancePolicies: rows.filter(r => r.group === 'insurancePolicies'),
                                        financeAndSS: rows.filter(r => r.group === 'financeAndSS'),
                                        managementDocs: rows.filter(r => r.group === 'managementDocs'),
                                        customDocuments: rows.filter(r => r.group === 'customDocuments'),
                                    };

                                    return (
                                        <div className="space-y-8 mt-4 pb-12">
                                            {/* Data Table */}
                                            <div className="overflow-hidden bg-white dark:bg-surface border border-gray-200 dark:border-[#444746] rounded-xl shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                                                        <thead className="bg-gray-50/50 dark:bg-[#131314] text-xs uppercase text-gray-500 font-extrabold tracking-wider border-b border-gray-200 dark:border-[#444746]">
                                                            <tr>
                                                                <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Name</th>
                                                                <th className="px-6 py-4 whitespace-nowrap">Control</th>
                                                                <th className="px-6 py-4 whitespace-nowrap">Document</th>
                                                                <th className="px-6 py-4 rounded-tr-xl whitespace-nowrap">State</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                                                            {Object.entries(groups).map(([groupKey, groupRows]) => {
                                                                if (groupRows.length === 0) return null;
                                                                // Extract Header Icon logic
                                                                let headerIcon = <FileText size={16} className="text-primary" />;
                                                                if (groupKey === 'insurancePolicies') headerIcon = <Shield size={16} className="text-primary" />;
                                                                if (groupKey === 'financeAndSS') headerIcon = <Landmark size={16} className="text-primary" />;
                                                                if (groupKey === 'customDocuments') headerIcon = <FileText size={16} className="text-indigo-600" />;

                                                                return (
                                                                    <React.Fragment key={groupKey}>
                                                                        <tr className="bg-gray-50/30 dark:bg-[#1a1a1b]">
                                                                            <td colSpan={4} className="px-6 py-3">
                                                                                <h3 className="text-[11px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest flex items-center gap-2">
                                                                                    {headerIcon} {t(\`headers.\${groupKey}\`) || groupKey}
                                                                                </h3>
                                                                            </td>
                                                                        </tr>
                                                                        
                                                                        {groupRows.map((row) => (
                                                                            <tr key={row.id} 
                                                                                className="hover:bg-gray-50/50 dark:hover:bg-[#131e21] group cursor-pointer transition-colors"
                                                                                onClick={() => setSelectedDocRow(row)}>
                                                                                <td className="px-6 py-4 w-1/3">
                                                                                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs" title={row.label}>{row.label}</div>
                                                                                    <div className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wide truncate">{row.category.replace(/_/g, ' ')}</div>
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                    {row.value ? (
                                                                                        <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-[#202124] rounded-md font-medium text-gray-800 dark:text-gray-200">
                                                                                            {row.type === 'date' ? new Date(row.value).toLocaleDateString() : row.value}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-gray-400">Not defined</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                    {!row.isUploadVisible ? (
                                                                                         <span className="text-gray-400 font-medium text-[11px] uppercase">N/A</span>
                                                                                    ) : row.hasDocs ? (
                                                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[11px] font-bold uppercase w-max">
                                                                                            <Paperclip size={12} strokeWidth={2.5} /> Attached
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-gray-400 border border-gray-200 dark:border-gray-700 text-[10px] uppercase w-max">
                                                                                            Missing
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                     <div className="flex flex-wrap items-center gap-2">
                                                                                        {row.isValidated && (
                                                                                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 uppercase">
                                                                                                <Check size={10} strokeWidth={3} /> {t('common.valid')}
                                                                                            </span>
                                                                                        )}
                                                                                        {row.hasOpenTicket && (
                                                                                            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-100 uppercase animate-pulse">
                                                                                                <AlertTriangle size={10} strokeWidth={3} /> {t('common.review')}
                                                                                            </span>
                                                                                        )}
                                                                                        {!row.isValidated && !row.hasOpenTicket && (
                                                                                            <span className="text-gray-400 text-xs italic">
                                                                                                Draft
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            `

content = content.substring(0, startIndex) + replacementCode + content.substring(endIndex);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully replaced Legal Tab layout with Data Table.');
