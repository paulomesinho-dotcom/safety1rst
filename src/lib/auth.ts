import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import MicrosoftEntraId from 'next-auth/providers/microsoft-entra-id';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/pt/login',
        error: '/pt/login',
    },

    providers: [
        // ── Email + Password ─────────────────────────
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.avatarUrl,
                    role: user.role,
                    tenantId: user.tenantId,
                };
            },
        }),

        // ── Google OAuth ─────────────────────────────
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                  GoogleProvider({
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  }),
              ]
            : []),

        // ── Microsoft / Azure AD ──────────────────────
        ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET
            ? [
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (MicrosoftEntraId as any)({
                      clientId: process.env.AZURE_AD_CLIENT_ID,
                      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
                      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID ?? 'common'}/v2.0`,
                  }),
              ]
            : []),
    ],

    callbacks: {
        // Adiciona campos da aplicação ao token JWT
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role ?? 'user';
                token.tenantId = (user as any).tenantId ?? null;
            }

            // Primeiro login OAuth — verificar se o user tem tenant atribuído
            if (account && account.provider !== 'credentials') {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email! },
                });
                if (dbUser) {
                    token.id = dbUser.id;
                    token.role = dbUser.role;
                    token.tenantId = dbUser.tenantId;
                }
            }

            return token;
        },

        // Expõe campos ao objecto de sessão no client
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).tenantId = token.tenantId as string | null;
            }
            return session;
        },

        // Após login OAuth, garantir que user existe na nossa tabela
        async signIn({ user, account }) {
            if (account?.provider !== 'credentials') {
                await prisma.user.upsert({
                    where: { email: user.email! },
                    update: { name: user.name ?? undefined, image: user.image ?? undefined },
                    create: {
                        email: user.email!,
                        name: user.name,
                        image: user.image,
                        role: 'user',
                    },
                });
            }
            return true;
        },
    },
});
