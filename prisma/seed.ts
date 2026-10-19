import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Iniciando seed da base de dados SafeSite...\n');

    // ── 1. Criar Tenant principal (Xispoli / conta demo) ──────────
    const tenant = await prisma.tenant.upsert({
        where: { id: 'tenant_main' },
        update: {},
        create: {
            id: 'tenant_main',
            name: 'Xispoli Construction',
            plan: 'premium',
            subscriptionStatus: 'active',
            maxProjects: 10,
            accessControlLimit: -1, // ilimitado
            modules: [
                'companies', 'workers', 'equipment',
                'access-control', 'training', 'documents',
                'accidents', 'forms',
            ],
        },
    });
    console.log(`✅ Tenant criado: ${tenant.name} (${tenant.id})`);

    // ── 2. Criar utilizador Super Admin ───────────────────────────
    const superAdminPassword = await bcrypt.hash('SuperAdmin2026!', 12);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'super@safesite.pt' },
        update: {},
        create: {
            email: 'super@safesite.pt',
            name: 'Super Admin',
            password: superAdminPassword,
            role: 'superadmin',
            tenantId: null, // Super Admin não tem tenant
        },
    });
    console.log(`✅ Super Admin criado: ${superAdmin.email}`);

    // ── 3. Criar utilizador Admin da conta Xispoli ────────────────
    const adminPassword = await bcrypt.hash('Admin2026!', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@xispoli.pt' },
        update: {},
        create: {
            email: 'admin@xispoli.pt',
            name: 'Paulo Admin',
            password: adminPassword,
            role: 'admin',
            tenantId: tenant.id,
        },
    });
    console.log(`✅ Admin criado: ${admin.email}`);

    // ── 4. Criar projecto de demonstração ─────────────────────────
    const project = await prisma.project.upsert({
        where: { id: 'proj_demo' },
        update: {},
        create: {
            id: 'proj_demo',
            name: 'Skyline Tower',
            description: 'Complexo residencial de luxo — projecto de demonstração',
            address: 'Av. da Liberdade 100, Lisboa',
            tenantId: tenant.id,
            status: 'active',
            approvalWorkflow: { companies: true, workers: true, equipment: true },
        },
    });
    console.log(`✅ Projecto criado: ${project.name}`);

    // ── 5. Adicionar Admin como Manager do projecto ───────────────
    await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId: admin.id } },
        update: {},
        create: {
            projectId: project.id,
            userId: admin.id,
            role: 'manager',
            allowedModules: [
                'companies', 'workers', 'equipment',
                'access-control', 'training', 'documents',
                'accidents', 'forms',
            ],
        },
    });
    console.log(`✅ Admin adicionado como Manager ao projecto`);

    console.log('\n═══════════════════════════════════════════');
    console.log('🚀 Seed concluído!');
    console.log('\nCredenciais de acesso:');
    console.log('  Admin:       admin@xispoli.pt    / Admin2026!');
    console.log('  Super Admin: super@safesite.pt   / SuperAdmin2026!');
    console.log('\n⚠️  ALTERAR AS PASSWORDS APÓS O PRIMEIRO LOGIN!');
    console.log('═══════════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
