'use client';

import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import ToastContainer from '@/components/ui/ToastContainer';
import { initDB, executeQuery } from '@/lib/db';

export default function RootClientWrapper({ children }: { children: React.ReactNode }) {
    const initialize = useStore(state => state.initialize);
    const ensureSuperAdmin = useStore(state => state.ensureSuperAdmin);
    const initialized = React.useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            console.log('[SafetyFirst] App Starting - Checking Cleanup Flags...');
            const debugFlags = {
                v7: localStorage.getItem('safesite_cleanup_data_v7'),
                cleanup_v6: localStorage.getItem('safesite_cleanup_demo_v6'),
                skip_seed: localStorage.getItem('safesite_skip_seeding')
            };
            console.log('[SafetyFirst] Startup Flags:', debugFlags);

            initialized.current = true;

            const runInit = async () => {
                // EMERGENCY CLEANUP: Destructive blocks removed to prevent data loss on localStorage wipe.
                // Migrations should be handled in src/lib/db.ts.

                // Proceed with normal Init
                initialize().then(async () => {
                    ensureSuperAdmin();
                    await useStore.getState().syncFromServer().catch(() => {});
                    console.log('[SafetyFirst] App Initialized & Server Synced');

                    // ONE-TIME CLEANUP (For "Seguros e Apólices" migration) - Bumped to v2
                    const hasCleaned = localStorage.getItem('safesite_cleanup_20250126_v2_force');
                    if (!hasCleaned) {
                        try {
                            const db = await initDB();
                            await executeQuery(`
                                UPDATE companies SET 
                                    insurance_work_acc_policy = NULL,
                                    insurance_civil_policy = NULL,
                                    clean_fin_date = NULL,
                                    ss_discount_sheet = NULL,
                                    pss_acceptance_date = NULL
                            `, []);
                            localStorage.setItem('safesite_cleanup_20250126_v2_force', 'true');
                        } catch (err) { console.error('Migration failed', err); }
                    }

                }).catch(e => console.error('[SafetyFirst] Init Failed', e));
            };

            runInit();
        }
    }, [initialize, ensureSuperAdmin]);

    return (
        <>
            <ToastContainer />
            {children}
        </>
    );
}
