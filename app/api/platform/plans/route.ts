import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DEFAULT_PLATFORM_PLANS, PlatformPlan, PlanType } from '@/types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const PLANS_FILE = path.join(DATA_DIR, 'platform_plans.json');

function getStoredPlans(): PlatformPlan[] {
    try {
        if (fs.existsSync(PLANS_FILE)) {
            const raw = fs.readFileSync(PLANS_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Merge with default plans to guarantee all 4 plans exist with complete fields
                return DEFAULT_PLATFORM_PLANS.map(def => {
                    const match = parsed.find((p: any) => p.id === def.id);
                    return match ? { ...def, ...match } : def;
                });
            }
        }
    } catch (e) {
        console.error('[API Platform Plans] Error reading plans file:', e);
    }
    return DEFAULT_PLATFORM_PLANS;
}

function saveStoredPlans(plans: PlatformPlan[]) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
    } catch (e) {
        console.error('[API Platform Plans] Error saving plans file:', e);
    }
}

// GET /api/platform/plans
export async function GET() {
    try {
        const plans = getStoredPlans();
        return NextResponse.json({ success: true, plans });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/platform/plans
// Apenas Super Admin ou Admin podem alterar os parâmetros de subscrição
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (session?.user) {
            const role = (session.user as any).role;
            if (role !== 'superadmin' && role !== 'admin') {
                return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem gerir planos.' }, { status: 403 });
            }
        }

        const body = await req.json();
        const { reset, planId, updates, plans: fullPlans } = body;

        let currentPlans = getStoredPlans();

        if (reset) {
            saveStoredPlans(DEFAULT_PLATFORM_PLANS);
            return NextResponse.json({ success: true, plans: DEFAULT_PLATFORM_PLANS, message: 'Planos repostos para os valores padrão.' });
        }

        if (Array.isArray(fullPlans)) {
            saveStoredPlans(fullPlans);
            return NextResponse.json({ success: true, plans: fullPlans, message: 'Planos atualizados com sucesso.' });
        }

        if (planId && updates) {
            currentPlans = currentPlans.map(p => p.id === planId ? { ...p, ...updates } : p);
            saveStoredPlans(currentPlans);
            return NextResponse.json({ success: true, plans: currentPlans, message: `Plano ${planId.toUpperCase()} atualizado com sucesso.` });
        }

        return NextResponse.json({ error: 'Dados inválidos fornecidos.' }, { status: 400 });
    } catch (error: any) {
        console.error('[API Platform Plans POST] Error:', error);
        return NextResponse.json({ error: 'Erro ao guardar planos.' }, { status: 500 });
    }
}
