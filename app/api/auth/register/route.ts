import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// POST /api/auth/register
// Registo de novo utilizador com criação de Tenant automática
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password, tenantName } = body;

        // Validação básica
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Nome, email e password são obrigatórios.' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'A password deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }

        // Verificar se email já existe
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: 'Este email já está registado.' },
                { status: 409 }
            );
        }

        // Hash da password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Criar Tenant (conta da empresa) + User admin num único transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Criar Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName || `${name} — Empresa`,
                    plan: 'basic',
                    modules: [
                        'companies', 'workers', 'equipment',
                        'access-control', 'training', 'documents',
                        'accidents',
                    ],
                },
            });

            // 2. Criar User como admin do Tenant
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'admin',
                    tenantId: tenant.id,
                },
            });

            return { user, tenant };
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Conta criada com sucesso.',
                userId: result.user.id,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('[Register] Error:', error);
        return NextResponse.json(
            { error: 'Erro interno. Tenta novamente.' },
            { status: 500 }
        );
    }
}
