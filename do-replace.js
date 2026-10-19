import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.join(__dirname, 'app/[locale]/project/[id]/companies/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

const startMarker = "{activeTab === 'legal' && (";
const endMarker = "{activeTab === 'site' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find markers!");
    process.exit(1);
}

const replacementCode = `
{activeTab === 'legal' && (
      <div className="space-y-6 animate-in fade-in duration-300 mb-8">
           {/* Data Table Implementation */}
           <div className="bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-[#444746] overflow-hidden shadow-sm">
                 <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                           <thead className="bg-gray-50/80 dark:bg-surface/80 border-b border-gray-200 dark:border-[#444746] text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                               <tr>
                                   <th className="px-4 py-3 min-w-[300px]">Document Name</th>
                                   <th className="px-4 py-3 min-w-[200px]">Control Value</th>
                                   <th className="px-4 py-3 w-[150px] text-center">Document</th>
                                   <th className="px-4 py-3 w-[150px] text-center">State</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 dark:divide-[#444746]">
                               {/* We render grouped rows */}
                               {(() => {
                                   const groupedRows = {};
                                   
                                   const addRow = (groupKey, rowData) => {
                                       if (!groupedRows[groupKey]) groupedRows[groupKey] = [];
                                       groupedRows[groupKey].push(rowData);
                                   };

                                   // 1. Seguros e Apólices
                                   if (isVisible('insurance_at')) {
                                       addRow('insurancePolicies', {
                                            id: 'insuranceWorkAccDate',
                                            label: "Workers' Compensation Insurance - Receipt",
                                            category: "insurance_work_acc_receipt",
                                            type: 'date',
                                            isUploadVisible: isUploadVisible('insurance_at'),
                                            value: newItem.insuranceWorkAccDate,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('insuranceWorkAccDate', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: isApprovalUser && newItem.workflowStatus === 'validated',
                                            canRequestReview: newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested' && !isDataUser,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('insuranceWorkAccDate', 'Expiration')} isEditing={isEditing}>
                                                    <input type="date" disabled={getFieldProps('insuranceWorkAccDate', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.insuranceWorkAccDate || ''} onChange={e => setNewItem({ ...newItem, insuranceWorkAccDate: e.target.value })} />
                                                </FieldControl>
                                            )
                                       });
                                       addRow('insurancePolicies', {
                                            id: 'insuranceWorkAccPolicy',
                                            label: "Workers' Compensation Insurance - Policy",
                                            category: "insurance_work_acc_policy",
                                            type: 'text',
                                            isUploadVisible: isUploadVisible('insurance_at'),
                                            value: newItem.insuranceWorkAccPolicy,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('insuranceWorkAccPolicy', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: isApprovalUser && newItem.workflowStatus === 'validated',
                                            canRequestReview: newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested' && !isDataUser,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('insuranceWorkAccPolicy', 'Policy Number')} isEditing={isEditing}>
                                                    <input type="text" disabled={getFieldProps('insuranceWorkAccPolicy', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.insuranceWorkAccPolicy || ''} onChange={e => setNewItem({ ...newItem, insuranceWorkAccPolicy: e.target.value })} />
                                                </FieldControl>
                                            )
                                       });
                                   }

                                   if (isVisible('insurance_rc')) {
                                       addRow('insurancePolicies', {
                                            id: 'insuranceCivilDate',
                                            label: "General Liability Insurance - Receipt",
                                            category: "insurance_civil_receipt",
                                            type: 'date',
                                            isUploadVisible: isUploadVisible('insurance_rc'),
                                            value: newItem.insuranceCivilDate,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('insuranceCivilDate', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: isApprovalUser && newItem.workflowStatus === 'validated',
                                            canRequestReview: newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested' && !isDataUser,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('insuranceCivilDate', 'Expiration')} isEditing={isEditing}>
                                                    <input type="date" disabled={getFieldProps('insuranceCivilDate', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.insuranceCivilDate || ''} onChange={e => setNewItem({ ...newItem, insuranceCivilDate: e.target.value })} />
                                                </FieldControl>
                                            )
                                       });
                                       addRow('insurancePolicies', {
                                            id: 'insuranceCivilPolicy',
                                            label: "General Liability Insurance - Policy",
                                            category: "insurance_civil_policy",
                                            type: 'text',
                                            isUploadVisible: isUploadVisible('insurance_rc'),
                                            value: newItem.insuranceCivilPolicy,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('insuranceCivilPolicy', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: isApprovalUser && newItem.workflowStatus === 'validated',
                                            canRequestReview: newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested' && !isDataUser,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('insuranceCivilPolicy', 'Policy Number')} isEditing={isEditing}>
                                                    <input type="text" disabled={getFieldProps('insuranceCivilPolicy', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.insuranceCivilPolicy || ''} onChange={e => setNewItem({ ...newItem, insuranceCivilPolicy: e.target.value })} />
                                                </FieldControl>
                                            )
                                       });
                                   }

                                   // 2. Segurança Social e Finanças
                                   if (isVisible('finance_ss')) {
                                        addRow('financeAndSS', {
                                            id: 'cleanSSDate',
                                            label: "Non-Debt Declaration (Social Security)",
                                            category: "finance_ss",
                                            type: 'date',
                                            isUploadVisible: isUploadVisible('finance_ss'),
                                            value: newItem.cleanSSDate,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('cleanSSDate', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: false,
                                            canRequestReview: false,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('cleanSSDate', 'Expiration')} isEditing={isEditing}>
                                                    <input type="date" disabled={getFieldProps('cleanSSDate', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.cleanSSDate || ''} onChange={e => setNewItem({ ...newItem, cleanSSDate: e.target.value })} />
                                                </FieldControl>
                                            )
                                        });
                                   }

                                   if (isVisible('finance_fin')) {
                                        addRow('financeAndSS', {
                                            id: 'cleanFinDate',
                                            label: "Non-Debt Declaration (Tax Authority)",
                                            category: "finance_fin",
                                            type: 'date',
                                            isUploadVisible: isUploadVisible('finance_fin'),
                                            value: newItem.cleanFinDate,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('cleanFinDate', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: false,
                                            canRequestReview: false,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('cleanFinDate', 'Expiration')} isEditing={isEditing}>
                                                    <input type="date" disabled={getFieldProps('cleanFinDate', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.cleanFinDate || ''} onChange={e => setNewItem({ ...newItem, cleanFinDate: e.target.value })} />
                                                </FieldControl>
                                            )
                                        });
                                   }

                                   if (isVisible('ss_discount')) {
                                        addRow('financeAndSS', {
                                            id: 'ssDiscountSheet',
                                            label: "SS Payment Sheet",
                                            category: "ss_discount_sheet",
                                            type: 'text',
                                            isUploadVisible: isUploadVisible('ss_discount'),
                                            value: newItem.ssDiscountSheet,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('ssDiscountSheet', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: false,
                                            canRequestReview: false,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('ssDiscountSheet', 'SS Payment Sheet')} isEditing={isEditing}>
                                                    <input type="month" disabled={getFieldProps('ssDiscountSheet', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.ssDiscountSheet || ''} onChange={e => setNewItem({ ...newItem, ssDiscountSheet: e.target.value })} />
                                                </FieldControl>
                                            )
                                        });
                                   }

                                   if (isVisible('pss_acceptance')) {
                                        addRow('financeAndSS', {
                                            id: 'pssAcceptanceDate',
                                            label: "H&S Plan Acceptance",
                                            category: "pss_acceptance",
                                            type: 'date',
                                            isUploadVisible: isUploadVisible('pss_acceptance'),
                                            value: newItem.pssAcceptanceDate,
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('pssAcceptanceDate', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: false,
                                            canRequestReview: false,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('pssAcceptanceDate', 'H&S Plan Acceptance')} isEditing={isEditing}>
                                                    <input type="date" disabled={getFieldProps('pssAcceptanceDate', '').isDisabled} className="w-full p-2 text-[13px] border border-gray-300 dark:border-[#444746] rounded-lg outline-none focus:border-blue-500 transition-colors bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                        value={newItem.pssAcceptanceDate || ''} onChange={e => setNewItem({ ...newItem, pssAcceptanceDate: e.target.value })} />
                                                </FieldControl>
                                            )
                                        });
                                   }

                                   // 3. Horário de Trabalho
                                   if (isVisible('work_schedule')) {
                                        addRow('workSchedule', {
                                            id: 'workScheduleDelivered',
                                            label: "Work Schedule Delivery",
                                            category: "work_schedule",
                                            type: 'text',
                                            isUploadVisible: true,
                                            value: newItem.workScheduleDelivered ? 'Delivered' : 'Pending',
                                            isValidated: false,
                                            hasOpenTicket: getFieldProps('workScheduleDelivered', '').hasOpenTicket,
                                            approvalStatus: newItem.approvalStatus,
                                            workflowStatus: newItem.workflowStatus,
                                            canValidate: false,
                                            canApprove: false,
                                            canRequestReview: false,
                                            onToggleValidation: () => {},
                                            entityId: newItem.id,
                                            renderControl: () => (
                                                <FieldControl {...getFieldProps('workScheduleDelivered', 'Status')} isEditing={isEditing}>
                                                    <div className="flex items-center gap-2 p-2 border border-gray-300 dark:border-[#444746] rounded-lg bg-gray-50/50 dark:bg-surface/50">
                                                        <div className={"w-2 h-2 rounded-full " + (newItem.workScheduleDelivered ? "bg-green-500" : "bg-red-500")} />
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{newItem.workScheduleDelivered ? 'Delivered' : 'Not Delivered'}</span>
                                                    </div>
                                                </FieldControl>
                                            )
                                        });
                                   }

                                   // 4. Custom Documents
                                   if (selectedProfile && selectedProfile.customDocuments?.length > 0) {
                                       selectedProfile.customDocuments.forEach((doc) => {
                                            const fieldKey = \`custom_\${doc.id}\`;
                                            const isVisible = !(doc.dataType === 'boolean' && newItem.customDocuments?.[doc.id]?.value === 'false');
                                            
                                            const isLocked = !isEditing;
                                            const isValidated = newItem.fieldValidations?.[fieldKey];
                                            const disableInputs = isLocked || (isValidated && !isManager);

                                            if (isVisible) {
                                                addRow('otherDocuments', {
                                                    id: doc.id,
                                                    label: doc.name,
                                                    category: fieldKey,
                                                    type: doc.dataType,
                                                    isUploadVisible: doc.requiresUpload !== false,
                                                    value: newItem.customDocuments?.[doc.id]?.value,
                                                    isValidated: isValidated,
                                                    hasOpenTicket: (newItem.tickets || []).some(t => t.fieldId === doc.id && t.status === 'open'),
                                                    approvalStatus: newItem.approvalStatus,
                                                    workflowStatus: newItem.workflowStatus,
                                                    canValidate: isManager && isEditing,
                                                    canApprove: false,
                                                    canRequestReview: (isManager && newItem.workflowStatus !== 'draft' && newItem.workflowStatus !== 'data_requested') || (isApprovalUser && newItem.workflowStatus === 'approval_pending'),
                                                    onToggleValidation: () => {
                                                        const isValidating = !isValidated;
                                                        const executeValidation = () => {
                                                            toggleFieldValidation(newItem.id, fieldKey, isValidating);
                                                            if (!isValidating) {
                                                                const resolvedTickets = (newItem.tickets || []).filter(t => t.fieldId === doc.id && t.status === 'resolved');
                                                                resolvedTickets.forEach(t => updateTicket(t.id, { status: 'open' }));
                                                            }
                                                            setNewItem((prev) => ({
                                                                ...prev,
                                                                fieldValidations: {
                                                                    ...prev.fieldValidations,
                                                                    [fieldKey]: isValidating
                                                                }
                                                            }));
                                                        };
                                                        executeValidation();
                                                    },
                                                    entityId: newItem.id,
                                                    renderControl: () => (
                                                        <FieldControl 
                                                            {...{
                                                                label: doc.name,
                                                                isValidated: newItem.fieldValidations?.[fieldKey],
                                                                canValidate: false,
                                                                canRequestReview: false,
                                                                isEditing: isEditing,
                                                                hasOpenTicket: false,
                                                                tickets: []
                                                            }}
                                                        >
                                                            {doc.dataType === 'boolean' ? (
                                                                <select
                                                                    className="w-full p-2 text-[13px] border rounded-md bg-white dark:bg-surface border-gray-300 dark:border-[#444746] text-gray-700 dark:text-gray-200"
                                                                    value={newItem.customDocuments?.[doc.id]?.value || 'false'}
                                                                    onChange={e => setNewItem((prev) => ({
                                                                        ...prev, customDocuments: { ...(prev.customDocuments || {}), [doc.id]: { ...(prev.customDocuments?.[doc.id] || {}), value: e.target.value } }
                                                                    }))}
                                                                    disabled={disableInputs}
                                                                >
                                                                    <option value="false">No</option>
                                                                    <option value="true">Yes</option>
                                                                </select>
                                                            ) : (doc.dataType === 'single_select' || doc.dataType === 'multi_select') ? (
                                                                <select
                                                                    className="w-full p-2 text-[13px] border rounded-md bg-white dark:bg-surface border-gray-300 dark:border-[#444746] text-gray-700 dark:text-gray-200"
                                                                    value={newItem.customDocuments?.[doc.id]?.value || ''}
                                                                    onChange={e => setNewItem((prev) => ({
                                                                        ...prev, customDocuments: { ...(prev.customDocuments || {}), [doc.id]: { ...(prev.customDocuments?.[doc.id] || {}), value: e.target.value } }
                                                                    }))}
                                                                    disabled={disableInputs}
                                                                    multiple={doc.dataType === 'multi_select'}
                                                                >
                                                                    <option value="">Select option...</option>
                                                                    {doc.options?.map((opt) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={doc.dataType === 'date' || doc.dataType === 'month' ? doc.dataType : (doc.dataType === 'number' ? 'number' : 'text')}
                                                                    className="w-full p-2 text-[13px] border rounded-md border-gray-300 dark:border-[#444746] bg-white dark:bg-[#131314] text-gray-700 dark:text-gray-200"
                                                                    value={newItem.customDocuments?.[doc.id]?.value || ''}
                                                                    onChange={e => setNewItem((prev) => ({
                                                                        ...prev, customDocuments: { ...(prev.customDocuments || {}), [doc.id]: { ...(prev.customDocuments?.[doc.id] || {}), value: e.target.value } }
                                                                    }))}
                                                                    disabled={disableInputs}
                                                                    placeholder={doc.dataType === 'text' ? 'Enter value...' : ''}
                                                                />
                                                            )}
                                                        </FieldControl>
                                                    )
                                                });
                                            }
                                       });
                                   }

                                   return Object.entries(groupedRows).map(([groupKey, rows]) => {
                                        if (rows.length === 0) return null;
                                        return (
                                            <React.Fragment key={groupKey}>
                                                <tr className="bg-gray-100/50 dark:bg-[#1e1e1e] border-y border-gray-100 dark:border-[#444746]">
                                                    <td colSpan="4" className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                                        {t(\`headers.\${groupKey}\`) || groupKey}
                                                    </td>
                                                </tr>
                                                {rows.map((row) => {
                                                    const hasDocs = documents.some(d => d.entityId === row.entityId && d.category === row.category && !d.archived);
                                                    return (
                                                        <tr 
                                                            key={row.id} 
                                                            className="hover:bg-gray-50/50 dark:hover:bg-surface/50 transition-colors cursor-pointer group"
                                                            onClick={(e) => {
                                                                if ((e.target).tagName.toLowerCase() === 'input' || (e.target).tagName.toLowerCase() === 'select') return;
                                                                setSelectedDocRow(row);
                                                            }}
                                                        >
                                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                                <div className="flex items-center gap-2">
                                                                    {row.hasOpenTicket && <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm" title="Open Ticket" />}
                                                                    {row.label}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={row.value || ''}>
                                                                {row.type === 'date' && row.value ? new Date(row.value).toLocaleDateString() : (row.value || <span className="text-gray-400 italic font-normal text-xs">Unset...</span>)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {hasDocs ? (
                                                                    <div className="inline-flex items-center justify-center p-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-md border border-green-100 dark:border-green-500/20 group-hover:scale-105 transition-transform" title="Document Uploaded">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="inline-flex items-center justify-center p-1.5 bg-gray-50 dark:bg-[#131314] text-gray-400 dark:text-gray-600 rounded-md border border-gray-100 dark:border-[#444746]" title="Document Missing">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {row.isValidated ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                                                        <Check size={12} strokeWidth={3} /> VALIDATED
                                                                    </span>
                                                                ) : row.approvalStatus === 'approved' ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                                                                        <Shield size={12} strokeWidth={3} /> APPROVED
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-gray-100 dark:bg-[#131314] text-gray-500 dark:text-gray-400">
                                                                        PENDING
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                   });
                               })()}
                           </tbody>
                      </table>
                 </div>
           </div>
      </div>
)}

`;

const newContent = content.substring(0, startIndex) + replacementCode + content.substring(endIndex);
fs.writeFileSync(targetFile, newContent);
console.log("Successfully replaced the block!");
