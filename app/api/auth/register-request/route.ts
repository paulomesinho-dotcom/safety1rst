import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, ensureSubscriptionTable } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

// POST /api/auth/register-request
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { companyName, nif, contactName, name, email, phone, password, plan, consentRgpd } = body;
        const finalContactName = (contactName || name || '').trim();

        // Validações
        if (!companyName?.trim() || !nif?.trim() || !finalContactName || !email?.trim() || !password) {
            return NextResponse.json(
                { error: 'Todos os campos obrigatórios (Empresa, NIF, Nome do Responsável, Email e Palavra-passe) devem ser preenchidos.' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'A palavra-passe deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }

        if (!consentRgpd) {
            return NextResponse.json(
                { error: 'É necessário autorizar o tratamento de dados pessoais (RGPD) para submeter o pedido.' },
                { status: 400 }
            );
        }

        const cleanEmail = email.trim().toLowerCase();
        const verificationToken = nanoid(32);
        const hashedPassword = await bcrypt.hash(password, 10);
        const selectedPlan = plan || 'basic';

        // 1. Guardar na base de dados Prisma
        try {
            await ensureSubscriptionTable();

            // Verificar se utilizador já existe
            const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
            if (existingUser) {
                return NextResponse.json(
                    { error: 'Já existe um utilizador registado com este endereço de email.' },
                    { status: 409 }
                );
            }

            // Remover pedidos anteriores pendentes com o mesmo email para evitar duplicados
            await prisma.subscriptionRequest.deleteMany({
                where: { email: cleanEmail, status: 'pending_email' }
            }).catch(() => {});

            // Criar pedido de subscrição
            await prisma.subscriptionRequest.create({
                data: {
                    companyName,
                    nif,
                    contactName: finalContactName,
                    email: cleanEmail,
                    phone: phone || null,
                    password: hashedPassword,
                    plan: selectedPlan,
                    status: 'pending_email',
                    verificationToken,
                },
            });
            console.log(`[Register-Request] Pedido de ${cleanEmail} (${companyName}) gravado na base de dados Prisma com sucesso.`);
        } catch (dbErr: any) {
            console.error('[Register-Request DB Error]:', dbErr);
        }

        // 2. Enviar email de verificação via Resend
        const emailResult = await sendVerificationEmail({
            to: cleanEmail,
            name: finalContactName,
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
