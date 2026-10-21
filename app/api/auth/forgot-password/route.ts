import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureVerificationTokenTable } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email || !email.trim()) {
            return NextResponse.json(
                { error: 'Por favor forneça o endereço de email.' },
                { status: 400 }
            );
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Assegurar tabela e verificar se o utilizador existe na base de dados
        await ensureVerificationTokenTable();

        const user = await prisma.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            // Requisito expresso: "se o email não existir na app, deve dar esse aviso"
            return NextResponse.json(
                { error: 'Este endereço de email não se encontra registado na plataforma.' },
                { status: 404 }
            );
        }

        // 2. Gerar token de reposição
        const token = nanoid(32);
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

        // Limpar tokens anteriores para o mesmo email
        await prisma.verificationToken.deleteMany({
            where: { identifier: cleanEmail },
        }).catch(() => {});

        // Gravar novo token
        await prisma.verificationToken.create({
            data: {
                identifier: cleanEmail,
                token,
                expires,
            },
        });

        // 3. Enviar email via Resend
        const emailResult = await sendPasswordResetEmail({
            to: cleanEmail,
            name: user.name || 'Utilizador',
            token,
        });

        if (!emailResult.success && !emailResult.mocked) {
            console.error('[Forgot-Password] Erro no envio de email:', emailResult.error);
            return NextResponse.json(
                { error: `Não foi possível enviar o email de reposição: ${emailResult.error}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Email de reposição enviado com sucesso.',
            mocked: emailResult.mocked,
        });
    } catch (error: any) {
        console.error('[Forgot-Password Error]:', error);
        return NextResponse.json(
            { error: 'Ocorreu um erro ao processar o seu pedido. Tente novamente mais tarde.' },
            { status: 500 }
        );
    }
}
