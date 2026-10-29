/**
 * ISO 19650 / IFC Standardized Document Naming Utility
 * Formats document filenames according to ISO 19650-2 and IFC Actor Roles.
 * Pattern: [ENTITY_IDENTIFIER]-[IFC_ROLE]-[CATEGORY_CODE]-[VERSION].[ext]
 * Example: 509123456-SUB-SEG-AT-V01.pdf
 */

export function generateIfcIsoDocumentName(params: {
    projectCode?: string;
    entityIdentifier?: string; // NIF, Company Number or ID
    ifcRole?: string; // SUB, GEN, CON, SAF, CLI, etc.
    category: string;
    version: number;
    originalFileName?: string;
}): string {
    const cleanId = (params.entityIdentifier || 'ENT')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 12);

    // Map IFC Role to standardized 3/4-letter abbreviation
    const roleMap: Record<string, string> = {
        subempreiteiro: 'SUB',
        subcontractor: 'SUB',
        empreiteiro_geral: 'GEN',
        main_contractor: 'GEN',
        prestador_servicos: 'SRV',
        instalador: 'INST',
        fornecedor: 'SUP',
        fiscalizacao: 'FIS',
        dono_obra: 'CLI',
        safety: 'SAF',
        coordenador: 'CSS'
    };
    const role = roleMap[(params.ifcRole || '').toLowerCase()] || (params.ifcRole || 'SUB').toUpperCase().slice(0, 4);

    // Standardized ISO 19650 / SafeSite document categories
    const catMap: Record<string, string> = {
        insurance_work_accident: 'SEG-AT',
        insurance_work_acc_receipt: 'SEG-AT-REC',
        insurance_work_acc_policy: 'SEG-AT-APOL',
        insurance_civil_liability: 'SEG-RC',
        insurance_civil_receipt: 'SEG-RC-REC',
        insurance_civil_policy: 'SEG-RC-APOL',
        alvara_impic: 'ALV-IMPIC',
        certidao_comercial: 'CRT-COM',
        non_debt_tax: 'DEC-AT',
        non_debt_ss: 'DEC-SS',
        medicina_trabalho: 'MED-TRAB',
        folhas_remuneracao: 'FOL-REM',
        pss: 'DEC-PSS',
        general: 'DOC-GEN'
    };

    const cleanCat = catMap[params.category] || params.category.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 15);
    const verStr = `V${params.version.toString().padStart(2, '0')}`;

    let ext = 'pdf';
    if (params.originalFileName) {
        const parts = params.originalFileName.split('.');
        if (parts.length > 1) {
            ext = parts.pop()!.toLowerCase();
        }
    }

    return `${cleanId}-${role}-${cleanCat}-${verStr}.${ext}`;
}
