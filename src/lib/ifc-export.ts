import { Project, Company, Worker, Equipment } from '@/types';
import { getCompanyRoleLabel } from '@/lib/company-ifc-map';
import { getEquipmentTypeLabel } from '@/lib/equipment-ifc-map';

// Helper to sanitize text for IFC (ISO-8859-1 essentially, but we'll keep it simple ascii usually, or utf-8 if supported by schema, but IFC usually implies specific encoding. We will escape special chars)
const formatString = (str?: string) => {
    if (!str) return '$';
    // Basic escaping for IFC string
    return "'" + str.replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
};

// Helper for IFC Date (Time stamp)
const currentTimestamp = () => Math.floor(Date.now() / 1000);

// Simple Global ID generator (IFC uses a specific base64 encoding of UUIDs, but for simplicity we will use a pseudo-random 22-char string or just use provided UUIDs if they fit)
// The standard requires a 22-character compressed UUID. There are libraries for this, but for this prototype we'll try to use a placeholder or a simple compressor if needed.
// For now, we will use a naive approach or just raw UUIDs if the viewer supports it (some do). 
// Actually, strict IFC requires the 22-char base64.
// Let's implement a simplified version or just use a random 22-char string.
const generateIfcGuid = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
    let result = "";
    for (let i = 0; i < 22; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "'" + result + "'";
};


class IfcBuilder {
    private lines: string[] = [];
    private currentId: number = 1;

    // Add a raw line, returns the ID used (e.g. 1 for #1)
    add(content: string): number {
        const id = this.currentId++;
        this.lines.push(`#${id}=${content};`);
        return id;
    }

    // Add header
    addHeader(fileName: string, author: string, organization: string) {
        const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('${fileName}','${new Date().toISOString()}',('${author}'),('${organization}'),'IFC Export Utility','SafetyFirst','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;`;
        this.lines.push(header);
    }

    addFooter() {
        this.lines.push('ENDSEC;\nEND-ISO-10303-21;');
    }

    build(): string {
        return this.lines.join('\n');
    }
}

export const generateIfcExport = (project: Project, companies: Company[], workers: Worker[], equipments: Equipment[] = []): string => {
    const builder = new IfcBuilder();

    // 1. Header
    builder.addHeader(
        project.name.replace(/ /g, '_') + '.ifc',
        'SafetyFirst Admin',
        project.name
    );

    // 2. Core Project Structure
    // We need at least IfcProject, IfcSite, IfcBuilding (Standard Hierarchy)

    // #1=IFCPERSON($,$,'User',$,$,$,$,$);
    const ownerHistoryPersonId = builder.add(`IFCPERSON($,$,${formatString('System User')},$,$,$,$,$)`);

    // #2=IFCORGANIZATION($,${formatString('SafetyFirst')},$,$,$);
    const ownerHistoryOrgId = builder.add(`IFCORGANIZATION($,${formatString('SafetyFirst')},$,$,$)`);

    // #3=IFCPERSONANDORGANIZATION(#1,#2,$);
    const ownerHistoryPersonOrgId = builder.add(`IFCPERSONANDORGANIZATION(#${ownerHistoryPersonId},#${ownerHistoryOrgId},$)`);

    // #4=IFCAPPLICATION(#2, '1.0', ${formatString('SafetyFirst App')}, ${formatString('SafetyFirst')});
    const appId = builder.add(`IFCAPPLICATION(#${ownerHistoryOrgId},'1.0',${formatString('SafetyFirst App')},${formatString('SafetyFirst')})`);

    // #5=IFCOWNERHISTORY(#3,#4,$,.ADDED.,$,$,$,12345678);
    const ownerHistoryId = builder.add(`IFCOWNERHISTORY(#${ownerHistoryPersonOrgId},#${appId},$,.ADDED.,$,$,$,${currentTimestamp()})`);

    // Units (Simplified - SI)
    const lengthUnitId = builder.add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
    const areaUnitId = builder.add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
    const volumeUnitId = builder.add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
    const unitAssignmentId = builder.add(`IFCUNITASSIGNMENT((#${lengthUnitId},#${areaUnitId},#${volumeUnitId}))`);

    // Geometric Context (Minimal)
    const worldCoordinateSystemId = builder.add(`IFCAXIS2PLACEMENT3D(#${builder.add('IFCCARTESIANPOINT((0.,0.,0.))')},$,$)`);
    const directionContextId = builder.add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${worldCoordinateSystemId},$)`);

    // Project
    const projectId = builder.add(`IFCPROJECT(${generateIfcGuid()},#${ownerHistoryId},${formatString(project.name)},${formatString(project.description)},$,$,$,(#${directionContextId}),#${unitAssignmentId})`);


    // 3. Companies -> IfcOrganization
    // We map existing companies to IfcOrganization
    const companyIfcIds: Record<string, number> = {};

    companies.forEach(company => {
        const role = company.ifcActorRole ?? 'NOTDEFINED';
        const roleDescription = company.companyRoleCustom
            ?? getCompanyRoleLabel(company.companyRole ?? '')
            ?? company.name;

        const actorRoleId = builder.add(`IFCACTORROLE(.${role}.,${formatString(roleDescription)},$)`);

        // IFC4: IFCORGANIZATION(Identification, Name, Description, Roles, Addresses)
        const orgId = builder.add(`IFCORGANIZATION(${formatString(company.nif)},${formatString(company.name)},${formatString(company.activity)},(#${actorRoleId}),$)`);
        companyIfcIds[company.id] = orgId;
    });

    // 4. Workers -> IfcPerson
    workers.forEach(worker => {
        // Split Name
        const parts = worker.name.trim().split(' ');
        let firstName = worker.name;
        let lastName = '';

        if (parts.length > 1) {
            lastName = parts.pop() || '';
            firstName = parts.join(' ');
        }

        // IFC4: IFCPERSON(Identification, FamilyName, GivenName, MiddleNames, PrefixTitles, SuffixTitles, Roles, Addresses)
        const personId = builder.add(`IFCPERSON(${formatString(worker.nif || worker.id)},${formatString(lastName)},${formatString(firstName)},$,$,$,$,$)`);

        // Create Relationship to Organization (IfcPersonAndOrganization)
        if (worker.companyId && companyIfcIds[worker.companyId]) {
            const orgRef = companyIfcIds[worker.companyId];
            /* const personOrgId = */ builder.add(`IFCPERSONANDORGANIZATION(#${personId},#${orgRef},$)`);
        }

        // Add IfcLaborResource
        const predefinedType = worker.ifcLaborType ?? 'NOTDEFINED';
        builder.add(`IFCLABORRESOURCE(${generateIfcGuid()},#${ownerHistoryId},${formatString(worker.name)},$,${formatString(worker.occupationCustom || worker.occupation || '')},$,$,$,$,.${predefinedType}.)`);
    });

    // 5. Equipments -> IfcBuildingElementProxy
    equipments.forEach(equipment => {
        const guid = equipment.ifcGlobalId ? formatString(equipment.ifcGlobalId) : generateIfcGuid();
        const ifcType = equipment.ifcElementType ?? 'NOTDEFINED';
        const typeLabel = equipment.equipmentTypeCustom
            ?? getEquipmentTypeLabel(equipment.equipmentType ?? '')
            ?? equipment.type ?? '';

        builder.add(`IFCBUILDINGELEMENTPROXY(${guid},#${ownerHistoryId},${formatString(equipment.name)},${formatString(typeLabel)},${formatString(ifcType)},$,$,$,.${ifcType}.,${formatString(equipment.serialNumber)});`);
    });

    builder.addFooter();
    return builder.build();
};
