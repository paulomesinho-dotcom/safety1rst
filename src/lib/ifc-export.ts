import { Project, Company, Worker, Equipment, SiteObservation, SiteLogisticsItem, SiteWorkZone } from '@/types';
import { getCompanyRoleLabel } from '@/lib/company-ifc-map';
import { getEquipmentTypeLabel } from '@/lib/equipment-ifc-map';

// Helper to sanitize text for IFC (escapes single quotes and backslashes)
const formatString = (str?: string) => {
    if (!str) return '$';
    return "'" + str.replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
};

// Helper for IFC Date (Unix timestamp)
const currentTimestamp = () => Math.floor(Date.now() / 1000);

// Generate 22-character compressed base64 GUID for buildingSMART IFC standard
export const generateIfcGuid = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
    let result = "";
    for (let i = 0; i < 22; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "'" + result + "'";
};

export class IfcBuilder {
    private lines: string[] = [];
    private currentId: number = 1;

    add(content: string): number {
        const id = this.currentId++;
        this.lines.push(`#${id}=${content};`);
        return id;
    }

    addHeader(fileName: string, author: string, organization: string, description: string = 'CoordinationView') {
        const header = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [${description}]'),'2;1');
FILE_NAME('${fileName}','${new Date().toISOString()}',('${author}'),('${organization}'),'SafeSite BIM IFC Engine','SafeSite Safety1rst','');
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

/**
 * Standard IFC Export for Project Actors, Workers and Registered Equipments
 */
export const generateIfcExport = (project: Project, companies: Company[], workers: Worker[], equipments: Equipment[] = []): string => {
    const builder = new IfcBuilder();

    builder.addHeader(
        project.name.replace(/ /g, '_') + '.ifc',
        'SafeSite Admin',
        project.name
    );

    const ownerHistoryPersonId = builder.add(`IFCPERSON($,$,${formatString('System User')},$,$,$,$,$)`);
    const ownerHistoryOrgId = builder.add(`IFCORGANIZATION($,${formatString('SafeSite')},$,$,$)`);
    const ownerHistoryPersonOrgId = builder.add(`IFCPERSONANDORGANIZATION(#${ownerHistoryPersonId},#${ownerHistoryOrgId},$)`);
    const appId = builder.add(`IFCAPPLICATION(#${ownerHistoryOrgId},'1.0',${formatString('SafeSite App')},${formatString('SafeSite')})`);
    const ownerHistoryId = builder.add(`IFCOWNERHISTORY(#${ownerHistoryPersonOrgId},#${appId},$,.ADDED.,$,$,$,${currentTimestamp()})`);

    const lengthUnitId = builder.add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
    const areaUnitId = builder.add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
    const volumeUnitId = builder.add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
    const unitAssignmentId = builder.add(`IFCUNITASSIGNMENT((#${lengthUnitId},#${areaUnitId},#${volumeUnitId}))`);

    const worldCoordinateSystemId = builder.add(`IFCAXIS2PLACEMENT3D(#${builder.add('IFCCARTESIANPOINT((0.,0.,0.))')},$,$)`);
    const directionContextId = builder.add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${worldCoordinateSystemId},$)`);

    /* const projectId = */ builder.add(`IFCPROJECT(${generateIfcGuid()},#${ownerHistoryId},${formatString(project.name)},${formatString(project.description)},$,$,$,(#${directionContextId}),#${unitAssignmentId})`);

    const companyIfcIds: Record<string, number> = {};
    companies.forEach(company => {
        const role = company.ifcActorRole ?? 'NOTDEFINED';
        const roleDescription = company.companyRoleCustom
            ?? getCompanyRoleLabel(company.companyRole ?? '')
            ?? company.name;

        const actorRoleId = builder.add(`IFCACTORROLE(.${role}.,${formatString(roleDescription)},$)`);
        const orgId = builder.add(`IFCORGANIZATION(${formatString(company.nif)},${formatString(company.name)},${formatString(company.activity)},(#${actorRoleId}),$)`);
        companyIfcIds[company.id] = orgId;
    });

    workers.forEach(worker => {
        const parts = worker.name.trim().split(' ');
        let firstName = worker.name;
        let lastName = '';
        if (parts.length > 1) {
            lastName = parts.pop() || '';
            firstName = parts.join(' ');
        }

        const personId = builder.add(`IFCPERSON(${formatString(worker.nif || worker.id)},${formatString(lastName)},${formatString(firstName)},$,$,$,$,$)`);
        if (worker.companyId && companyIfcIds[worker.companyId]) {
            const orgRef = companyIfcIds[worker.companyId];
            builder.add(`IFCPERSONANDORGANIZATION(#${personId},#${orgRef},$)`);
        }
        const predefinedType = worker.ifcLaborType ?? 'NOTDEFINED';
        builder.add(`IFCLABORRESOURCE(${generateIfcGuid()},#${ownerHistoryId},${formatString(worker.name)},$,${formatString(worker.occupationCustom || worker.occupation || '')},$,$,$,$,.${predefinedType}.)`);
    });

    equipments.forEach(equipment => {
        const guid = equipment.ifcGlobalId ? formatString(equipment.ifcGlobalId) : generateIfcGuid();
        const ifcType = equipment.ifcElementType ?? 'NOTDEFINED';
        const typeLabel = equipment.equipmentTypeCustom
            ?? getEquipmentTypeLabel(equipment.equipmentType ?? '')
            ?? equipment.type ?? '';

        builder.add(`IFCBUILDINGELEMENTPROXY(${guid},#${ownerHistoryId},${formatString(equipment.name)},${formatString(typeLabel)},${formatString(ifcType)},$,$,$,.${ifcType}.,${formatString(equipment.serialNumber)})`);
    });

    builder.addFooter();
    return builder.build();
};

export interface SafetyIfcExportOptions {
    subProjectName?: string;
    authorName?: string;
    organizationName?: string;
    coordinateOffset?: [number, number, number];
}

/**
 * Generates a complete standalone OpenBIM IFC4 Safety and Logistics Model.
 * This file can be imported/federated directly in Autodesk Revit, ArchiCAD, Solibri,
 * Navisworks, Bexel Manager or BIMcollab Zoom alongside Structural and Architectural models.
 */
export const generateSafetyIfcExport = (
    project: Project,
    observations: SiteObservation[],
    logisticsItems: SiteLogisticsItem[],
    workZones: SiteWorkZone[] = [],
    options?: SafetyIfcExportOptions
): string => {
    const builder = new IfcBuilder();
    const modelTitle = options?.subProjectName
        ? `${project.name} - ${options.subProjectName} (HSE Estaleiro e Seguranca)`
        : `${project.name} - Estaleiro e Seguranca (DL 273/2003)`;

    const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_SafetyModel_IFC4.ifc`;
    builder.addHeader(fileName, options?.authorName || 'Coordenador Seguranca CSO', options?.organizationName || 'SafeSite OpenBIM', 'DesignTransferView');

    // 1. Owner & Application
    const personId = builder.add(`IFCPERSON($,$,${formatString(options?.authorName || 'Coordenador Seguranca')},$,$,$,$,$)`);
    const orgId = builder.add(`IFCORGANIZATION($,${formatString('SafeSite HSE')},${formatString('Seguranca em Obra')},$,$)`);
    const personOrgId = builder.add(`IFCPERSONANDORGANIZATION(#${personId},#${orgId},$)`);
    const appId = builder.add(`IFCAPPLICATION(#${orgId},'2.0',${formatString('SafeSite BIM Safety Engine')},${formatString('SafeSite')})`);
    const ownerHistoryId = builder.add(`IFCOWNERHISTORY(#${personOrgId},#${appId},$,.ADDED.,$,$,$,${currentTimestamp()})`);

    // 2. Units & World Coordinates
    const lengthUnitId = builder.add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
    const areaUnitId = builder.add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
    const volumeUnitId = builder.add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
    const unitAssignmentId = builder.add(`IFCUNITASSIGNMENT((#${lengthUnitId},#${areaUnitId},#${volumeUnitId}))`);

    // World placement (0, 0, 0)
    const zeroPointId = builder.add('IFCCARTESIANPOINT((0.,0.,0.))');
    const zDirId = builder.add('IFCDIRECTION((0.,0.,1.))');
    const xDirId = builder.add('IFCDIRECTION((1.,0.,0.))');
    const yDirId = builder.add('IFCDIRECTION((0.,1.,0.))');
    const worldAxisPlacementId = builder.add(`IFCAXIS2PLACEMENT3D(#${zeroPointId},#${zDirId},#${xDirId})`);
    const geomContextId = builder.add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${worldAxisPlacementId},$)`);
    const bodySubContextId = builder.add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${geomContextId},$,.MODEL_VIEW.,$)`);

    // 3. Spatial Hierarchy: Project -> Site -> Building -> Storey
    const ifcProjectId = builder.add(`IFCPROJECT(${generateIfcGuid()},#${ownerHistoryId},${formatString(modelTitle)},${formatString('Modelo federado de Seguranca, Estaleiro e Evacuacao')},$,$,$,(#${geomContextId}),#${unitAssignmentId})`);

    const sitePlacementId = builder.add(`IFCLOCALPLACEMENT($,#${worldAxisPlacementId})`);
    const siteId = builder.add(`IFCSITE(${generateIfcGuid()},#${ownerHistoryId},${formatString('Estaleiro da Obra')},${formatString('Implantacao Geral do Estaleiro')},.ELEMENT.,#${sitePlacementId},$,$,.ELEMENT.,$,$,$,$,$)`);

    const buildingPlacementId = builder.add(`IFCLOCALPLACEMENT(#${sitePlacementId},#${worldAxisPlacementId})`);
    const buildingId = builder.add(`IFCBUILDING(${generateIfcGuid()},#${ownerHistoryId},${formatString(project.name)},${formatString('Edificacao / Obra')},.ELEMENT.,#${buildingPlacementId},$,$,.ELEMENT.,$,$,$)`);

    const storeyPlacementId = builder.add(`IFCLOCALPLACEMENT(#${buildingPlacementId},#${worldAxisPlacementId})`);
    const defaultStoreyId = builder.add(`IFCBUILDINGSTOREY(${generateIfcGuid()},#${ownerHistoryId},${formatString('Estaleiro / Piso de Trabalho')},${formatString('Cota de Seguranca')},.ELEMENT.,#${storeyPlacementId},$,$,.ELEMENT.,0.)`);

    // Link Project -> Site -> Building -> Storey
    builder.add(`IFCRELAGGREGATES(${generateIfcGuid()},#${ownerHistoryId},$,$,#${ifcProjectId},(#${siteId}))`);
    builder.add(`IFCRELAGGREGATES(${generateIfcGuid()},#${ownerHistoryId},$,$,#${siteId},(#${buildingId}))`);
    builder.add(`IFCRELAGGREGATES(${generateIfcGuid()},#${ownerHistoryId},$,$,#${buildingId},(#${defaultStoreyId}))`);

    const containedElementIds: number[] = [];

    // Helper: Create a solid box shape (Extruded area solid)
    const createBoxShape = (dx: number, dy: number, dz: number) => {
        const halfX = dx / 2;
        const halfY = dy / 2;
        const p1 = builder.add(`IFCCARTESIANPOINT((-${halfX.toFixed(3)},-${halfY.toFixed(3)}))`);
        const p2 = builder.add(`IFCCARTESIANPOINT((${halfX.toFixed(3)},-${halfY.toFixed(3)}))`);
        const p3 = builder.add(`IFCCARTESIANPOINT((${halfX.toFixed(3)},${halfY.toFixed(3)}))`);
        const p4 = builder.add(`IFCCARTESIANPOINT((-${halfX.toFixed(3)},${halfY.toFixed(3)}))`);
        const polyline = builder.add(`IFCPOLYLINE((#${p1},#${p2},#${p3},#${p4},#${p1}))`);
        const profile = builder.add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${polyline})`);

        const extrusionAxis = builder.add(`IFCAXIS2PLACEMENT3D(#${zeroPointId},#${zDirId},#${xDirId})`);
        const solid = builder.add(`IFCEXTRUDEDAREASOLID(#${profile},#${extrusionAxis},#${zDirId},${dz.toFixed(3)})`);
        return builder.add(`IFCSHAPEREPRESENTATION(#${bodySubContextId},'Body','SweptSolid',(#${solid}))`);
    };

    // Helper: Create a single Property Value
    const createSingleProp = (name: string, value: string) => {
        const valStr = formatString(value);
        const valDef = builder.add(`IFCLABEL(${valStr})`);
        return builder.add(`IFCPROPERTYSINGLEVALUE(${formatString(name)},$,#${valDef},$)`);
    };

    // 4. Export Site Logistics Items (Gruas, Contentores, Extintores, Postos SOS, Vias)
    logisticsItems.forEach(item => {
        // Coordinate mapping: Three.js (x, y=elevation, z) -> IFC (X=x, Y=-z or z, Z=y elevation)
        const posX = item.position[0] || 0;
        const posY = -(item.position[2] || 0); // Horizontal Y in IFC
        const posZ = Math.max(item.position[1] || 0, 0); // Elevation Z in IFC

        const itemPointId = builder.add(`IFCCARTESIANPOINT((${posX.toFixed(3)},${posY.toFixed(3)},${posZ.toFixed(3)}))`);
        const itemAxisPlacementId = builder.add(`IFCAXIS2PLACEMENT3D(#${itemPointId},#${zDirId},#${xDirId})`);
        const itemPlacementId = builder.add(`IFCLOCALPLACEMENT(#${storeyPlacementId},#${itemAxisPlacementId})`);

        // Dimensions according to logistics item type
        let dx = 3.0, dy = 3.0, dz = 2.5;
        let ifcType = 'SITE_LOGISTICS_OBJECT';

        if (item.type === 'crane' || item.type === 'mobile_crane') {
            dx = 3.5; dy = 3.5; dz = 24.0;
            ifcType = 'CRANE_STATION';
        } else if (item.type.includes('container') || item.type === 'office_container') {
            dx = 6.0; dy = 2.44; dz = 2.6;
            ifcType = 'CONTAINER_MODULAR';
        } else if (item.type === 'first_aid' || item.type === 'meeting_point') {
            dx = 1.2; dy = 0.6; dz = 2.2;
            ifcType = 'EMERGENCY_STATION';
        } else if (item.type === 'fire_extinguisher') {
            dx = 0.4; dy = 0.4; dz = 1.4;
            ifcType = 'FIRE_EXTINGUISHER_STATION';
        } else if (item.type === 'waste_bay') {
            dx = 4.0; dy = 4.0; dz = 1.8;
            ifcType = 'WASTE_DISPOSAL_BAY';
        } else if (item.type === 'evacuation_route' || item.type === 'pedestrian_path') {
            dx = 1.8; dy = 8.0; dz = 0.15;
            ifcType = 'SAFETY_EVACUATION_WAY';
        }

        const shapeRepId = createBoxShape(dx, dy, dz);
        const prodDefShapeId = builder.add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}))`);

        const elemId = builder.add(
            `IFCBUILDINGELEMENTPROXY(${generateIfcGuid()},#${ownerHistoryId},${formatString(item.name)},${formatString(item.notes || 'Equipamento / Logistica de Estaleiro')},${formatString(ifcType)},#${itemPlacementId},#${prodDefShapeId},$,.NOTDEFINED.)`
        );
        containedElementIds.push(elemId);

        // Property Set: Pset_SafeSite_Logistics
        const prop1 = createSingleProp('Category', item.category);
        const prop2 = createSingleProp('EquipmentType', item.type);
        const prop3 = createSingleProp('RadiusCoverage', item.radius ? `${item.radius}m` : 'N/A');
        const prop4 = createSingleProp('Storey', item.storeyName || 'Geral');
        const prop5 = createSingleProp('Status', item.status || 'active');
        const prop6 = createSingleProp('RegulatoryFramework', 'DL 273/2003 (CSO)');

        const psetId = builder.add(`IFCPROPERTYSET(${generateIfcGuid()},#${ownerHistoryId},'Pset_SafeSite_Logistics',$,(#${prop1},#${prop2},#${prop3},#${prop4},#${prop5},#${prop6}))`);
        builder.add(`IFCRELDEFINESBYPROPERTIES(${generateIfcGuid()},#${ownerHistoryId},$,$,(#${elemId}),#${psetId})`);
    });

    // 5. Export Site Inspection Observations / Non-Conformances
    observations.forEach(obs => {
        const posX = obs.position[0] || 0;
        const posY = -(obs.position[2] || 0);
        const posZ = Math.max(obs.position[1] || 0, 0);

        const obsPointId = builder.add(`IFCCARTESIANPOINT((${posX.toFixed(3)},${posY.toFixed(3)},${posZ.toFixed(3)}))`);
        const obsAxisPlacementId = builder.add(`IFCAXIS2PLACEMENT3D(#${obsPointId},#${zDirId},#${xDirId})`);
        const obsPlacementId = builder.add(`IFCLOCALPLACEMENT(#${storeyPlacementId},#${obsAxisPlacementId})`);

        // Inspection Pin Box (0.60m x 0.60m x 0.90m)
        const shapeRepId = createBoxShape(0.60, 0.60, 0.90);
        const prodDefShapeId = builder.add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}))`);

        const elemId = builder.add(
            `IFCBUILDINGELEMENTPROXY(${generateIfcGuid()},#${ownerHistoryId},${formatString(obs.title)},${formatString(obs.description)},'SAFETY_INSPECTION_PIN',#${obsPlacementId},#${prodDefShapeId},$,.NOTDEFINED.)`
        );
        containedElementIds.push(elemId);

        // Property Set: Pset_SafeSite_InspectionIssue
        const p1 = createSingleProp('Category', obs.category);
        const p2 = createSingleProp('Severity', obs.severity);
        const p3 = createSingleProp('Status', obs.status);
        const p4 = createSingleProp('TargetElement', obs.elementName || 'Estrutura');
        const p5 = createSingleProp('Inspector', obs.createdByName || 'Fiscalizacao / CSO');
        const p6 = createSingleProp('InspectionDate', obs.createdAt ? obs.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
        const p7 = createSingleProp('ResolutionNotes', obs.resolutionNotes || 'Pendente');

        const psetId = builder.add(`IFCPROPERTYSET(${generateIfcGuid()},#${ownerHistoryId},'Pset_SafeSite_InspectionIssue',$,(#${p1},#${p2},#${p3},#${p4},#${p5},#${p6},#${p7}))`);
        builder.add(`IFCRELDEFINESBYPROPERTIES(${generateIfcGuid()},#${ownerHistoryId},$,$,(#${elemId}),#${psetId})`);
    });

    // 6. Export Work Hazard Zones (Delimitações espaciais e requisitos de acesso)
    workZones.forEach(zone => {
        if (!zone.polygon || zone.polygon.length < 3) return;

        // Bounding dimensions of the polygon
        const xs = zone.polygon.map(p => p[0]);
        const zs = zone.polygon.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const w = Math.max(maxX - minX, 1.0);
        const d = Math.max(maxZ - minZ, 1.0);

        const zonePointId = builder.add(`IFCCARTESIANPOINT((${cx.toFixed(3)},${(-cz).toFixed(3)},0.000))`);
        const zoneAxisPlacementId = builder.add(`IFCAXIS2PLACEMENT3D(#${zonePointId},#${zDirId},#${xDirId})`);
        const zonePlacementId = builder.add(`IFCLOCALPLACEMENT(#${storeyPlacementId},#${zoneAxisPlacementId})`);

        // Zone volume (height 3.00m)
        const shapeRepId = createBoxShape(w, d, 3.00);
        const prodDefShapeId = builder.add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}))`);

        const spaceId = builder.add(
            `IFCSPACE(${generateIfcGuid()},#${ownerHistoryId},${formatString(zone.name)},${formatString(zone.description || 'Zona Condicionada de Risco')},.ELEMENT.,#${zonePlacementId},#${prodDefShapeId},$,.INTERNAL.,$)`
        );
        containedElementIds.push(spaceId);

        // Property Set: Pset_SafeSite_RiskZone
        const zp1 = createSingleProp('HazardCategory', zone.category);
        const zp2 = createSingleProp('RequiredCertifications', (zone.requiredCertifications || []).join(', ') || 'Geral');
        const zp3 = createSingleProp('MaxWorkersAllowed', zone.maxWorkers ? String(zone.maxWorkers) : 'Livre');
        const zp4 = createSingleProp('Storey', zone.storeyName || 'Todos');

        const psetId = builder.add(`IFCPROPERTYSET(${generateIfcGuid()},#${ownerHistoryId},'Pset_SafeSite_RiskZone',$,(#${zp1},#${zp2},#${zp3},#${zp4}))`);
        builder.add(`IFCRELDEFINESBYPROPERTIES(${generateIfcGuid()},#${ownerHistoryId},$,$,(#${spaceId}),#${psetId})`);
    });

    // 7. Contain all generated HSE elements in Spatial Hierarchy (Storey)
    if (containedElementIds.length > 0) {
        const elementsRefList = containedElementIds.map(id => `#${id}`).join(',');
        builder.add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${generateIfcGuid()},#${ownerHistoryId},'SafeSite HSE Spatial Containment',$,(${elementsRefList}),#${defaultStoreyId})`);
    }

    builder.addFooter();
    return builder.build();
};
