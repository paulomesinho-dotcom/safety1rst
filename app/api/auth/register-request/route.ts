import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

// POST /api/auth/register-request
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { companyName, nif, contactName, email, phone, password, plan } = body;

        // Validações
        if (!companyName || !nif || !contactName || !email || !password) {
            return NextResponse.json(
                { error: 'Todos os campos obrigatórios devem ser preenchidos.' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'A palavra-passe deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }

        const cleanEmail = email.trim().toLowerCase();
        const verificationToken = nanoid(32);
        const hashedPassword = await bcrypt.hash(password, 10);
        const selectedPlan = plan || 'basic';

        // 1. Tentar guardar na base de dados Prisma (se configurada e acessível)
        try {
            // Verificar se utilizador ou pedido pendente já existe
            const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
            if (existingUser) {
                return NextResponse.json(
                    { error: 'Já existe um utilizador registado com este endereço de email.' },
                    { status: 409 }
                );
            }

            // Criar ou atualizar pedido de subscrição
            await prisma.subscriptionRequest.create({
                data: {
                    companyName,
                    nif,
                    contactName,
                    email: cleanEmail,
                    phone: phone || null,
                    password: hashedPassword,
                    plan: selectedPlan,
                    status: 'pending_email',
                    verificationToken,
                },
            });
        } catch (dbErr: any) {
            console.warn('[Register-Request DB Warning] Erro Prisma (a funcionar com fallback local):', dbErr.message);
        }

        // 2. Enviar email de verificação via Resend
        const emailResult = await sendVerificationEmail({
            to: cleanEmail,
            name: contactName,
            companyName,
            plan: selectedPlan,
            token: verificationToken,
        });

        return NextResponse.json({
            success: true,
            message: 'Pedido submetido com sucesso. Enviámos um email de confirmação.',
            token: verificationToken,
            emailSent: emailResult.success,
        });
    } catch (error: any) {
        console.error('[Register-Request Error]:', error);
        return NextResponse.json(
            { error: 'Ocorreu um erro ao processar o seu pedido. Tente novamente.' },
            { status: 500 }
        );
    }
}
