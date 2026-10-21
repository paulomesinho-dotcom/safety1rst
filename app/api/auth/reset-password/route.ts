import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, ensureVerificationTokenTable } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, password } = body;

        if (!token || !token.trim()) {
            return NextResponse.json(
                { error: 'Token de reposição em falta.' },
                { status: 400 }
            );
        }

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'A palavra-passe deve ter pelo menos 8 caracteres.' },
                { status: 400 }
            );
        }
        if (!/[A-Z]/.test(password)) {
            return NextResponse.json(
                { error: 'A palavra-passe deve conter pelo menos 1 letra maiúscula.' },
                { status: 400 }
            );
        }
        if (!/[0-9]/.test(password)) {
            return NextResponse.json(
                { error: 'A palavra-passe deve conter pelo menos 1 número.' },
                { status: 400 }
            );
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            return NextResponse.json(
                { error: 'A palavra-passe deve conter pelo menos 1 caráter especial.' },
                { status: 400 }
            );
        }

        await ensureVerificationTokenTable();

        // 1. Procurar o token
        const tokenRecord = await prisma.verificationToken.findUnique({
            where: { token: token.trim() },
        });

        if (!tokenRecord) {
            return NextResponse.json(
                { error: 'O link de recuperação é inválido ou já foi utilizado.' },
                { status: 400 }
            );
        }

        // 2. Verificar validade temporal
        if (new Date(tokenRecord.expires) < new Date()) {
            await prisma.verificationToken.delete({ where: { token: token.trim() } }).catch(() => {});
            return NextResponse.json(
                { error: 'O link de recuperação expirou. Por favor solicite um novo link.' },
                { status: 400 }
            );
        }

        // 3. Atualizar a palavra-passe do utilizador
        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
            where: { email: tokenRecord.identifier },
            data: { password: hashedPassword },
        });

        // 4. Eliminar o token usado
        await prisma.verificationToken.delete({
            where: { token: token.trim() },
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: 'Palavra-passe alterada com sucesso.',
        });
    } catch (error: any) {
        console.error('[Reset-Password Error]:', error);
        return NextResponse.json(
            { error: 'Ocorreu um erro ao atualizar a palavra-passe.' },
            { status: 500 }
        );
    }
}
