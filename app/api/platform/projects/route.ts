import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/platform/projects
// Lista todos os projetos ou verifica código de convite diretamente na base de dados
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const codeQuery = searchParams.get('code');

        if (codeQuery) {
            const cleanQuery = codeQuery.trim().toUpperCase().replace(/\s+/g, '');
            const allProjects = await prisma.project.findMany({
                where: { status: { not: 'deleted' } },
                include: {
                    tenant: true,
                    companies: true,
                },
                orderBy: { createdAt: 'desc' },
            }).catch(() => []);

            // Normalização e correspondência flexível
            const matched = allProjects.find(p => {
                const year = p.createdAt.getFullYear();
                const prefix4 = p.id.substring(0, 4).toUpperCase();
                const standardCode = `PRJ-${prefix4}-${year}`;
                const noDashCode = `PRJ${prefix4}${year}`;

                return (
                    cleanQuery === standardCode ||
                    cleanQuery === noDashCode ||
                    cleanQuery === prefix4 ||
                    cleanQuery === `${prefix4}-${year}` ||
                    cleanQuery === p.id.toUpperCase() ||
                    cleanQuery === p.name.trim().toUpperCase()
                );
            });

            if (matched) {
                return NextResponse.json({
                    success: true,
                    project: {
                        id: matched.id,
                        name: matched.name,
                        description: matched.description,
                        address: matched.address,
                        accountId: matched.tenantId,
                        status: matched.status,
                        createdAt: matched.createdAt.toISOString(),
                        code: `PRJ-${matched.id.substring(0, 4).toUpperCase()}-${matched.createdAt.getFullYear()}`,
                        companies: (matched.companies || []).map(c => ({
                            id: c.id,
                            name: c.name,
                            nif: c.nif,
                        })),
                    },
                });
            }

            return NextResponse.json({ success: false, message: 'Obra não encontrada com o código fornecido.' }, { status: 404 });
        }

        // Listar todos os projetos
        const projects = await prisma.project.findMany({
            where: { status: { not: 'deleted' } },
            orderBy: { createdAt: 'desc' },
        }).catch(() => []);

        return NextResponse.json({
            success: true,
            projects: projects.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                address: p.address,
                accountId: p.tenantId,
                status: p.status,
                createdAt: p.createdAt.toISOString(),
                code: `PRJ-${p.id.substring(0, 4).toUpperCase()}-${p.createdAt.getFullYear()}`,
            })),
        });
    } catch (error: any) {
        console.error('[API Platform Projects GET] Error:', error);
        return NextResponse.json({ error: 'Erro ao consultar projetos.' }, { status: 500 });
    }
}

// POST /api/platform/projects
// Cria um projeto no PostgreSQL e associa o criador como gestor
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, description, address, accountId, creatorId, status } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'O nome da obra é obrigatório.' }, { status: 400 });
        }

        // Verificar ou associar ao Tenant
        let tenantId = accountId;
        if (!tenantId) {
            const firstTenant = await prisma.tenant.findFirst();
            tenantId = firstTenant?.id;
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Conta/Empresa não encontrada.' }, { status: 400 });
        }

        const projectId = id || `prj_${Date.now()}`;
        const newProject = await prisma.project.create({
            data: {
                id: projectId,
                name: name.trim(),
                description: description?.trim() || null,
                address: address?.trim() || null,
                tenantId,
                status: status || 'active',
            },
        });

        // Associar o criador como gestor do projeto se creatorId fornecido
        if (creatorId) {
            await prisma.projectMember.create({
                data: {
                    projectId: newProject.id,
                    userId: creatorId,
                    role: 'manager',
                },
            }).catch(() => {});
        }

        const projectCode = `PRJ-${newProject.id.substring(0, 4).toUpperCase()}-${newProject.createdAt.getFullYear()}`;

        return NextResponse.json({
            success: true,
            project: {
                id: newProject.id,
                name: newProject.name,
                description: newProject.description,
                address: newProject.address,
                accountId: newProject.tenantId,
                status: newProject.status,
                createdAt: newProject.createdAt.toISOString(),
                code: projectCode,
            },
        });
    } catch (error: any) {
        console.error('[API Platform Projects POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao criar projeto na base de dados.' }, { status: 500 });
    }
}
