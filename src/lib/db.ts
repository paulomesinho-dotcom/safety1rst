// Main thread bridge to SQLite Worker
// SQLite OPFS requires running in a worker.

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
const requestMap = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

export const initDB = async () => {
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            resolve(); // Serverside fix: no-op
            return;
        }

        worker = new Worker(new URL('./db.worker.ts', import.meta.url));

        worker.onmessage = (e) => {
            const { id, result, error } = e.data;
            if (id === 'init') {
                if (error) {
                    console.error('[DB Bridge] Init Failed:', error);
                    reject(error);
                } else {
                    console.log('[DB Bridge] Worker Initialized');
                    // Trigger schema creation after init
                    createSchema().then(() => resolve()).catch(reject);
                }
            } else {
                const req = requestMap.get(id);
                if (req) {
                    if (error) req.reject(error);
                    else req.resolve(result);
                    requestMap.delete(id);
                }
            }
        };

        // Send init signal
        worker.postMessage({ id: 'init', type: 'init' });
    });

    return initPromise;
};

// Generate UUID for requests
const uuid = () => Math.random().toString(36).substring(2, 9);

export const executeQuery = async (sql: string, params: any[] = []) => {
    await initDB();

    return new Promise<any[]>((resolve, reject) => {
        const id = uuid();
        requestMap.set(id, { resolve, reject });
        worker?.postMessage({ id, type: 'exec', sql, params });
    });
};

// Helper: Convert JS Object Key to Snake Case for DB
export const toSnake = (str: string) => {
    if (str === 'cleanSSDate') return 'clean_ss_date';
    return str.replace(/[A-Z]/g, match => '_' + match.toLowerCase());
};

export const insert = async (table: string, data: any) => {
    if (!data) return;
    if (Array.isArray(data)) {
        for (const item of data) {
            await insert(table, item);
        }
        return;
    }
    const dbItem: any = {};
    for (const k of Object.keys(data)) {
        if (data[k] === undefined) continue;
        const dbKey = toSnake(k);
        const val = data[k];
        if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
            dbItem[dbKey] = JSON.stringify(val);
        } else {
            dbItem[dbKey] = val;
        }
    }
    const cols = Object.keys(dbItem).join(', ');
    const placeholders = Object.keys(dbItem).map(() => '?').join(', ');
    const values = Object.values(dbItem);
    await executeQuery(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);

    // Sync mutation to central server database asynchronously
    if (typeof window !== 'undefined' && data.id) {
        fetch('/api/data/mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'insert', table, id: data.id, data }),
        }).catch((err) => console.warn('[Server Sync Mutation Error]:', err));
    }
};

export const update = async (table: string, id: string, data: any) => {
    if (!data) return;
    const dbItem: any = {};
    for (const k of Object.keys(data)) {
        if (data[k] === undefined) continue;
        const dbKey = toSnake(k);
        const val = data[k];
        if (Array.isArray(val) || (typeof val === 'object' && val !== null)) {
            dbItem[dbKey] = JSON.stringify(val);
        } else {
            dbItem[dbKey] = val;
        }
    }
    if (Object.keys(dbItem).length === 0) return;

    const setClause = Object.keys(dbItem).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(dbItem), id];
    await executeQuery(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);

    // Sync mutation to central server database asynchronously
    if (typeof window !== 'undefined') {
        fetch('/api/data/mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', table, id, data }),
        }).catch((err) => console.warn('[Server Sync Mutation Error]:', err));
    }
};

export const remove = async (table: string, id: string) => {
    await executeQuery(`DELETE FROM ${table} WHERE id = ?`, [id]);

    // Sync deletion to central server database asynchronously
    if (typeof window !== 'undefined') {
        fetch('/api/data/mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove', table, id }),
        }).catch((err) => console.warn('[Server Sync Mutation Error]:', err));
    }
};

// Schema Definition (Called after Worker Init)
const createSchema = async () => {
    const run = (sql: string) => {
        return new Promise<any[]>((resolve, reject) => {
            const id = uuid();
            requestMap.set(id, { resolve, reject });
            worker?.postMessage({ id, type: 'exec', sql, params: [] });
        });
    };

    // Execute schema creation in steps to identify failures
    console.log('[DB Bridge] Starting Schema Creation...');

    const tables = [
        `CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            plan TEXT CHECK (plan IN ('basic', 'premium')) DEFAULT 'basic',
            max_projects INTEGER DEFAULT 1,
            access_control_limit INTEGER DEFAULT 100,
            subscription_status TEXT DEFAULT 'active',
            modules TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            address TEXT,
            account_id TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            logo_url TEXT,
            cde_config TEXT DEFAULT '{}',
            card_config TEXT DEFAULT '{}',
            workflow_cc_list TEXT DEFAULT '[]',
            approval_workflow TEXT DEFAULT '{}',
            default_company_profile_id TEXT,
            default_worker_profile_id TEXT,
            default_equipment_profile_id TEXT,
            approval_flow_enabled BOOLEAN DEFAULT 0,
            shst_settings TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            size TEXT,
            type TEXT,
            url TEXT,
            entity_id TEXT NOT NULL,
            project_id TEXT,
            category TEXT,
            provider TEXT DEFAULT 'local',
            status TEXT DEFAULT 'synced',
            version INTEGER DEFAULT 1,
            archived BOOLEAN DEFAULT 0,
            cde_file_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS companies ( id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT, name TEXT NOT NULL, number TEXT, nif TEXT, activity TEXT, impic TEXT, email TEXT, phone TEXT, address TEXT, entry_date TEXT, work_schedule TEXT, site_manager TEXT, site_contact TEXT, insurance_civil_date TEXT, insurance_civil_policy TEXT, insurance_work_acc_date TEXT, insurance_work_acc_policy TEXT, clean_ss_date TEXT, clean_fin_date TEXT, ss_discount_sheet TEXT, pss_acceptance_date TEXT, tier INTEGER, parent_id TEXT, exit_date TEXT, work_schedule_delivered BOOLEAN DEFAULT 0, workflow_status TEXT DEFAULT 'draft', assigned_data_user_id TEXT, workflow_notification_ccs TEXT DEFAULT '[]', field_validations TEXT DEFAULT '{}', draft_data TEXT DEFAULT '{}', approval_status TEXT, approved_by TEXT, approved_at TEXT, archived BOOLEAN DEFAULT 0, status TEXT DEFAULT 'active', profile_id TEXT, custom_documents TEXT DEFAULT '{}', field_edit_permissions TEXT DEFAULT '{}', field_last_editors TEXT DEFAULT '{}', company_role TEXT, company_role_custom TEXT, ifc_actor_role TEXT, ifc_actor_role_user_defined TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS workers ( id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT, company_id TEXT NOT NULL, name TEXT NOT NULL, first_name TEXT, middle_name TEXT, last_name TEXT, initials TEXT, id_card_number TEXT, ssn TEXT, nationality TEXT, nationality_type TEXT, foreign_country TEXT, gender TEXT, postal_code TEXT, city TEXT, emergency_contact TEXT, emergency_contact_phone TEXT, contract_type TEXT, entry_date TEXT, exit_date TEXT, profession TEXT, category TEXT, profession_category TEXT, productivity REAL, hourly_cost REAL, wbs TEXT, work_schedule TEXT, subcontractor_of TEXT, ifc_guid TEXT, ifc_actor_role TEXT, daily_availability REAL, worker_card_number TEXT, risk_level TEXT, medical_exam_date TEXT, medical_fitness TEXT, mandatory_ppe TEXT DEFAULT '[]', certifications TEXT, insurance_covered BOOLEAN DEFAULT 0, insurance_work_acc_policy_worker TEXT, epi_delivery_list TEXT DEFAULT '[]', epi_signed_date TEXT, medical_restrictions TEXT, authorized_zone TEXT, authorized_zone_ids TEXT DEFAULT '[]', mandatory_trainings TEXT DEFAULT '{}', observations TEXT, last_access TEXT, role TEXT, email TEXT, phone TEXT, nif TEXT, birth_date TEXT, id_card_expiry TEXT, address TEXT, is_foreign BOOLEAN DEFAULT 0, passport_number TEXT, passport_expiry TEXT, residency_permit_number TEXT, act_communication BOOLEAN DEFAULT 0, eu_citizen_certificate BOOLEAN DEFAULT 0, foreign_contract BOOLEAN DEFAULT 0, residency_expiry TEXT, contract_expiry TEXT, medical_expiry TEXT, epi_date TEXT, induction_date TEXT, specific_training_date TEXT, access_card_code TEXT UNIQUE, access_card_valid BOOLEAN DEFAULT 0, is_access_card_blocked BOOLEAN DEFAULT 0, avatar_url TEXT, workflow_status TEXT DEFAULT 'draft', assigned_data_user_id TEXT, workflow_notification_ccs TEXT DEFAULT '[]', missing_elements TEXT DEFAULT '[]', field_validations TEXT DEFAULT '{}', completed_training_ids TEXT DEFAULT '[]', approval_status TEXT, approved_by TEXT, approved_at TEXT, archived BOOLEAN DEFAULT 0, status TEXT DEFAULT 'active', profile_id TEXT, custom_documents TEXT DEFAULT '{}', field_edit_permissions TEXT DEFAULT '{}', field_last_editors TEXT DEFAULT '{}', obligatory_role TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS equipment ( id TEXT PRIMARY KEY, account_id TEXT NOT NULL, project_id TEXT, company_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, serial_number TEXT, brand TEXT, model TEXT, manufacturing_year TEXT, sound_power TEXT, entry_date TEXT, exit_date TEXT, manufacturer TEXT, year_of_manufacture INTEGER, ce_marking BOOLEAN, ce_declaration_date TEXT, inspection_due_date TEXT, last_inspection_date TEXT, inspection_entity TEXT, maintenance_schedule TEXT, last_maintenance_date TEXT, next_maintenance_date TEXT, working_hours_or_km TEXT, operator_id TEXT, max_load_kg REAL, noise_level_db REAL, vibration_level REAL, risk_name TEXT, risk_type TEXT, risk_nature TEXT, unmitigated_risk TEXT, mitigated_risk TEXT, mitigation_measures TEXT, ifc_global_id TEXT, workflow_status TEXT DEFAULT 'draft', missing_elements TEXT DEFAULT '[]', field_validations TEXT DEFAULT '{}', assigned_data_user_id TEXT, workflow_notification_ccs TEXT DEFAULT '[]', approval_status TEXT, approved_by TEXT, approved_at TEXT, status TEXT DEFAULT 'operational', archived BOOLEAN DEFAULT 0, profile_id TEXT, custom_documents TEXT DEFAULT '{}', field_edit_permissions TEXT DEFAULT '{}', field_last_editors TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS users ( id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, role TEXT DEFAULT 'user', account_id TEXT, avatar_url TEXT, password TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS project_members ( id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'viewer', allowed_modules TEXT DEFAULT '[]', company_id TEXT, created_at TEXT DEFAULT (datetime('now')), UNIQUE(project_id, user_id) )`,
        `CREATE TABLE IF NOT EXISTS company_profiles ( id TEXT PRIMARY KEY, project_id TEXT, name TEXT NOT NULL, requirements TEXT DEFAULT '{}', standard_uploads TEXT DEFAULT '{}', standard_doc_config TEXT DEFAULT '{}', custom_documents TEXT DEFAULT '[]', is_system BOOLEAN DEFAULT 0, created_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS worker_profiles ( id TEXT PRIMARY KEY, project_id TEXT, name TEXT NOT NULL, requirements TEXT DEFAULT '{}', standard_uploads TEXT DEFAULT '{}', standard_doc_config TEXT DEFAULT '{}', custom_documents TEXT DEFAULT '[]', is_system BOOLEAN DEFAULT 0, created_at TEXT DEFAULT (datetime('now')) )`,
        `CREATE TABLE IF NOT EXISTS equipment_profiles ( id TEXT PRIMARY KEY, project_id TEXT, name TEXT NOT NULL, requirements TEXT DEFAULT '{}', standard_uploads TEXT DEFAULT '{}', standard_doc_config TEXT DEFAULT '{}', custom_documents TEXT DEFAULT '[]', is_system BOOLEAN DEFAULT 0, created_at TEXT DEFAULT (datetime('now')) )`,
        // Missing tables from previous implementation
        `CREATE TABLE IF NOT EXISTS access_points (
            id TEXT PRIMARY KEY,
            name TEXT,
            code TEXT,
            type TEXT,
            category TEXT,
            parent_id TEXT REFERENCES access_points(id),
            capacity INTEGER,
            gps TEXT DEFAULT '{}',
            requires_gps BOOLEAN DEFAULT 0,
            required_training_ids TEXT DEFAULT '[]',
            project_id TEXT REFERENCES projects(id),
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS access_logs (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id),
            entity_type TEXT,
            worker_id TEXT REFERENCES workers(id),
            equipment_id TEXT REFERENCES equipment(id),
            worker_name TEXT,
            entity_name TEXT,
            location TEXT,
            timestamp TEXT,
            status TEXT CHECK (status IN ('granted', 'denied')),
            method TEXT,
            reason TEXT,
            location_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS workflow_logs (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id),
            entity_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            action TEXT NOT NULL,
            previous_status TEXT,
            new_status TEXT,
            actor_id TEXT,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            entity_id TEXT NOT NULL,
            project_id TEXT REFERENCES projects(id),
            type TEXT CHECK (type IN ('field_review', 'general', 'support')),
            field_id TEXT,
            title TEXT,
            description TEXT,
            priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
            status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
            created_by TEXT REFERENCES users(id),
            assigned_to TEXT REFERENCES users(id),
            is_draft BOOLEAN DEFAULT 0,
            value_at_review TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS ticket_messages (
            id TEXT PRIMARY KEY,
            ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
            user_id TEXT,
            message TEXT,
            is_system_message BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS pdf_templates (
              id TEXT PRIMARY KEY,
              account_id TEXT REFERENCES accounts(id) NOT NULL,
              name TEXT NOT NULL,
              config TEXT NOT NULL DEFAULT '{}',
              header TEXT NOT NULL DEFAULT '{}',
              footer TEXT NOT NULL DEFAULT '{}',
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS trainings (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            provider TEXT,
            description TEXT,
            validity_months INTEGER,
            icon TEXT,
            is_mandatory BOOLEAN DEFAULT 0,
            mandatory_key TEXT,
            account_id TEXT REFERENCES accounts(id) NOT NULL,
            project_id TEXT REFERENCES projects(id),
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS accidents (
            id TEXT PRIMARY KEY,
            title TEXT,
            date TEXT,
            time TEXT,
            location TEXT,
            location_id TEXT,
            severity TEXT,
            status TEXT,
            type TEXT,
            description TEXT,
            worker_ids TEXT DEFAULT '[]',
            photos TEXT DEFAULT '[]',
            project_id TEXT REFERENCES projects(id),
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS risk_assessments (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id),
            entity_id TEXT,
            entity_type TEXT,
            risk_name TEXT,
            risk_type TEXT,
            risk_nature TEXT,
            unmitigated_risk TEXT,
            mitigated_risk TEXT,
            mitigation_measures TEXT,
            ifc_global_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS safety_incidents (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id),
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT,
            location TEXT,
            location_id TEXT,
            severity TEXT,
            status TEXT DEFAULT 'open',
            type TEXT DEFAULT 'incident',
            description TEXT,
            worker_ids TEXT DEFAULT '[]',
            photos TEXT DEFAULT '[]',
            ifc_global_id TEXT,
            mitigation_measures TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        // ── Course Module ─────────────────────────────────────────────────────
        `CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            project_id TEXT REFERENCES projects(id),
            account_id TEXT REFERENCES accounts(id),
            title TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'draft',
            is_template BOOLEAN DEFAULT 0,
            is_mandatory BOOLEAN DEFAULT 0,
            is_self_learning BOOLEAN DEFAULT 0,
            language TEXT DEFAULT 'pt',
            estimated_duration INTEGER,
            source_type TEXT DEFAULT 'manual',
            source_document_url TEXT,
            ai_prompt_used TEXT,
            slides TEXT DEFAULT '[]',
            passing_score INTEGER DEFAULT 70,
            questions TEXT DEFAULT '[]',
            validity_months INTEGER,
            created_by TEXT,
            version INTEGER DEFAULT 1,
            cover_image TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS training_sessions (
            id TEXT PRIMARY KEY,
            course_id TEXT REFERENCES courses(id),
            project_id TEXT REFERENCES projects(id),
            account_id TEXT REFERENCES accounts(id),
            status TEXT DEFAULT 'scheduled',
            scheduled_date TEXT,
            started_at TEXT,
            completed_at TEXT,
            location TEXT,
            trainer_id TEXT REFERENCES users(id),
            enrolled_workers TEXT DEFAULT '[]',
            attendees TEXT DEFAULT '[]',
            signed_document_url TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS worker_training_records (
            id TEXT PRIMARY KEY,
            worker_id TEXT REFERENCES workers(id),
            project_id TEXT REFERENCES projects(id),
            course_id TEXT REFERENCES courses(id),
            session_id TEXT REFERENCES training_sessions(id),
            training_type TEXT,
            course_title TEXT NOT NULL,
            completed_at TEXT NOT NULL,
            valid_until TEXT,
            score INTEGER,
            passed BOOLEAN DEFAULT 0,
            trainer_id TEXT,
            trainer_name TEXT,
            signed_document_url TEXT,
            source TEXT DEFAULT 'presential',
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS subscription_requests (
            id TEXT PRIMARY KEY,
            company_name TEXT NOT NULL,
            nif TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            password TEXT,
            plan TEXT DEFAULT 'basic',
            status TEXT DEFAULT 'pending_email',
            verification_token TEXT UNIQUE,
            email_verified_at TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT,
            rejection_reason TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS project_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            user_name TEXT,
            user_email TEXT,
            project_id TEXT NOT NULL,
            project_name TEXT,
            company_id TEXT,
            company_name TEXT,
            nif TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS company_invitations (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            account_name TEXT NOT NULL,
            invited_email TEXT NOT NULL,
            invited_name TEXT,
            invited_by_user_id TEXT,
            invited_by_user_name TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            resolved_at TEXT
        )`
    ];


    for (let index = 0; index < tables.length; index++) {
        const sql = tables[index];
        try {
            await run(sql);
            // console.log(\`[DB Bridge] Table \${index + 1}/\${tables.length} created.\`);
        } catch (e: any) {
            console.error(`[DB Bridge] Failed to create table ${index + 1}: `, e);
        }
    }

    console.log('[DB Bridge] Schema applied.');

    // Migrations: Add columns that may not exist in older databases
    const migrations = [
        `ALTER TABLE users ADD COLUMN password TEXT`,
        `ALTER TABLE users ADD COLUMN can_manage_company_data BOOLEAN DEFAULT 0`,
        `ALTER TABLE company_profiles ADD COLUMN standard_doc_config TEXT DEFAULT '{}'`,
        `ALTER TABLE worker_profiles ADD COLUMN standard_doc_config TEXT DEFAULT '{}'`,
        `ALTER TABLE equipment_profiles ADD COLUMN standard_doc_config TEXT DEFAULT '{}'`,
        `ALTER TABLE workers ADD COLUMN first_name TEXT`,
        `ALTER TABLE workers ADD COLUMN last_name TEXT`,
        `ALTER TABLE workers ADD COLUMN initials TEXT`,
        `ALTER TABLE workers ADD COLUMN id_card_number TEXT`,
        `ALTER TABLE workers ADD COLUMN ssn TEXT`,
        `ALTER TABLE workers ADD COLUMN nationality TEXT`,
        `ALTER TABLE workers ADD COLUMN gender TEXT`,
        `ALTER TABLE workers ADD COLUMN postal_code TEXT`,
        `ALTER TABLE workers ADD COLUMN city TEXT`,
        `ALTER TABLE workers ADD COLUMN emergency_contact TEXT`,
        `ALTER TABLE workers ADD COLUMN contract_type TEXT`,
        `ALTER TABLE workers ADD COLUMN entry_date TEXT`,
        `ALTER TABLE workers ADD COLUMN exit_date TEXT`,
        `ALTER TABLE workers ADD COLUMN profession TEXT`,
        `ALTER TABLE workers ADD COLUMN category TEXT`,
        `ALTER TABLE workers ADD COLUMN productivity REAL`,
        `ALTER TABLE workers ADD COLUMN hourly_cost REAL`,
        `ALTER TABLE workers ADD COLUMN wbs TEXT`,
        `ALTER TABLE workers ADD COLUMN ifc_guid TEXT`,
        `ALTER TABLE workers ADD COLUMN daily_availability REAL`,
        `ALTER TABLE workers ADD COLUMN worker_card_number TEXT`,
        `ALTER TABLE workers ADD COLUMN risk_level TEXT`,
        `ALTER TABLE workers ADD COLUMN medical_exam_date TEXT`,
        `ALTER TABLE workers ADD COLUMN medical_fitness TEXT`,
        `ALTER TABLE workers ADD COLUMN mandatory_ppe TEXT DEFAULT '[]'`,
        `ALTER TABLE workers ADD COLUMN certifications TEXT`,
        `ALTER TABLE workers ADD COLUMN insurance_work_acc_policy_worker TEXT`,
        `ALTER TABLE workers ADD COLUMN medical_restrictions TEXT`,
        `ALTER TABLE workers ADD COLUMN authorized_zone TEXT`,
        `ALTER TABLE workers ADD COLUMN observations TEXT`,
        `ALTER TABLE workers ADD COLUMN last_access TEXT`,
        `ALTER TABLE workers ADD COLUMN middle_name TEXT`,
        `ALTER TABLE workers ADD COLUMN emergency_contact_phone TEXT`,
        `ALTER TABLE workers ADD COLUMN profession_category TEXT`,
        `ALTER TABLE workers ADD COLUMN work_schedule TEXT`,
        `ALTER TABLE workers ADD COLUMN subcontractor_of TEXT`,
        `ALTER TABLE workers ADD COLUMN insurance_covered BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN epi_delivery_list TEXT DEFAULT '[]'`,
        `ALTER TABLE workers ADD COLUMN epi_signed_date TEXT`,
        `ALTER TABLE workers ADD COLUMN passport_number TEXT`,
        `ALTER TABLE workers ADD COLUMN passport_expiry TEXT`,
        `ALTER TABLE workers ADD COLUMN residency_permit_number TEXT`,
        `ALTER TABLE workers ADD COLUMN act_communication BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN nationality_type TEXT`,
        `ALTER TABLE workers ADD COLUMN foreign_country TEXT`,
        `ALTER TABLE workers ADD COLUMN eu_citizen_certificate BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN foreign_contract BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN ifc_actor_role TEXT`,
        `ALTER TABLE companies ADD COLUMN ifc_actor_role TEXT`,
        `ALTER TABLE companies ADD COLUMN ifc_actor_role_user_defined TEXT`,
        `ALTER TABLE companies ADD COLUMN company_role TEXT`,
        `ALTER TABLE companies ADD COLUMN company_role_custom TEXT`,
        `ALTER TABLE projects ADD COLUMN shst_settings TEXT`,
        `ALTER TABLE workers ADD COLUMN obligatory_role TEXT`,
        `ALTER TABLE workers ADD COLUMN occupation TEXT`,
        `ALTER TABLE workers ADD COLUMN occupation_custom TEXT`,
        `ALTER TABLE workers ADD COLUMN ifc_labor_type TEXT`,
        `ALTER TABLE workers ADD COLUMN worker_role_id TEXT`,
        `ALTER TABLE workers ADD COLUMN authorized_zone_ids TEXT DEFAULT '[]'`,
        `ALTER TABLE workers ADD COLUMN mandatory_trainings TEXT DEFAULT '{}'`,
        `ALTER TABLE workers ADD COLUMN medical_observations TEXT`,

        // IFC4.3 - Workers (Trabalhadores)
        `ALTER TABLE workers ADD COLUMN given_name TEXT`,
        `ALTER TABLE workers ADD COLUMN family_name TEXT`,
        `ALTER TABLE workers ADD COLUMN prefix_titles TEXT`, // Store stringified array or JSON
        `ALTER TABLE workers ADD COLUMN ss_number TEXT`,
        `ALTER TABLE workers ADD COLUMN work_permit_number TEXT`,
        `ALTER TABLE workers ADD COLUMN work_permit_expiry TEXT`,
        `ALTER TABLE workers ADD COLUMN epi_list TEXT`, // Store JSON array
        `ALTER TABLE workers ADD COLUMN training_certificates TEXT`, // Store JSON
        `ALTER TABLE workers ADD COLUMN height_work_cert BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN height_work_cert_expiry TEXT`,
        `ALTER TABLE workers ADD COLUMN confined_space_cert BOOLEAN DEFAULT 0`,
        `ALTER TABLE workers ADD COLUMN induction_given_by TEXT`, // UUID text
        `ALTER TABLE workers ADD COLUMN blood_type TEXT`,
        `ALTER TABLE workers ADD COLUMN risk_category TEXT DEFAULT 'low'`,
        `ALTER TABLE workers ADD COLUMN emergency_contact_name TEXT`,
        `ALTER TABLE workers ADD COLUMN ifc_global_id TEXT`,

        // IFC4.3 - Companies (Empresas)
        `ALTER TABLE companies ADD COLUMN cae_code TEXT`,
        `ALTER TABLE companies ADD COLUMN legal_form TEXT`,
        `ALTER TABLE companies ADD COLUMN site_manager_id TEXT`, // FK to workers
        `ALTER TABLE companies ADD COLUMN safety_technician_id TEXT`, // FK to workers
        `ALTER TABLE companies ADD COLUMN prior_notice_date TEXT`,
        `ALTER TABLE companies ADD COLUMN prior_notice_number TEXT`,
        `ALTER TABLE companies ADD COLUMN pss_version TEXT`,
        `ALTER TABLE companies ADD COLUMN insurance_civil_provider TEXT`,
        `ALTER TABLE companies ADD COLUMN insurance_work_acc_provider TEXT`,
        `ALTER TABLE companies ADD COLUMN iso_45001_cert BOOLEAN DEFAULT 0`,
        `ALTER TABLE companies ADD COLUMN iso_45001_expiry TEXT`,
        `ALTER TABLE companies ADD COLUMN max_workers_on_site INTEGER`,
        `ALTER TABLE companies ADD COLUMN risk_level TEXT DEFAULT 'low'`,
        `ALTER TABLE companies ADD COLUMN ifc_global_id TEXT`,

        // IFC4.3 - Equipment (Equipamentos)
        `ALTER TABLE equipment ADD COLUMN manufacturer TEXT`,
        `ALTER TABLE equipment ADD COLUMN model TEXT`,
        `ALTER TABLE equipment ADD COLUMN year_of_manufacture INTEGER`,
        `ALTER TABLE equipment ADD COLUMN ce_marking BOOLEAN DEFAULT 0`,
        `ALTER TABLE equipment ADD COLUMN ce_declaration_date TEXT`,
        `ALTER TABLE equipment ADD COLUMN inspection_due_date TEXT`,
        `ALTER TABLE equipment ADD COLUMN last_inspection_date TEXT`,
        `ALTER TABLE equipment ADD COLUMN inspection_entity TEXT`,
        `ALTER TABLE equipment ADD COLUMN maintenance_schedule TEXT`,
        `ALTER TABLE equipment ADD COLUMN last_maintenance_date TEXT`,
        `ALTER TABLE equipment ADD COLUMN next_maintenance_date TEXT`,
        `ALTER TABLE equipment ADD COLUMN operator_id TEXT`, // FK to workers
        `ALTER TABLE equipment ADD COLUMN risk_name TEXT`,
        `ALTER TABLE equipment ADD COLUMN risk_type TEXT`,
        `ALTER TABLE equipment ADD COLUMN risk_nature TEXT`,
        `ALTER TABLE equipment ADD COLUMN unmitigated_risk TEXT`,
        `ALTER TABLE equipment ADD COLUMN mitigated_risk TEXT`,
        `ALTER TABLE equipment ADD COLUMN mitigation_measures TEXT`,
        `ALTER TABLE equipment ADD COLUMN noise_level_db REAL`,
        `ALTER TABLE equipment ADD COLUMN vibration_level REAL`,
        `ALTER TABLE equipment ADD COLUMN max_load_kg REAL`,
        `ALTER TABLE equipment ADD COLUMN ifc_global_id TEXT`,

        // ISO 19650 - Documents (Documentos)
        `ALTER TABLE documents ADD COLUMN entity_type TEXT`, // 'worker' | 'company' | 'equipment' | 'project'
        `ALTER TABLE documents ADD COLUMN expiry_date TEXT`,
        `ALTER TABLE documents ADD COLUMN issue_date TEXT`,
        `ALTER TABLE documents ADD COLUMN document_version TEXT`,
        `ALTER TABLE documents ADD COLUMN approval_status TEXT DEFAULT 'draft'`, // 'draft' | 'shared' | 'published' | 'archived'
        `ALTER TABLE documents ADD COLUMN approved_by_id TEXT`, // FK to users
        `ALTER TABLE documents ADD COLUMN approved_at TEXT`,
        `ALTER TABLE documents ADD COLUMN document_code TEXT`,
        `ALTER TABLE documents ADD COLUMN discipline TEXT`,
        `ALTER TABLE documents ADD COLUMN language TEXT DEFAULT 'pt'`,
        `ALTER TABLE documents ADD COLUMN file_hash TEXT`,
        `ALTER TABLE documents ADD COLUMN is_confidential BOOLEAN DEFAULT 0`,
        `ALTER TABLE documents ADD COLUMN gdpr_basis TEXT`,
        `ALTER TABLE documents ADD COLUMN retention_until TEXT`,

        `ALTER TABLE trainings ADD COLUMN is_mandatory BOOLEAN DEFAULT 0`,
        `ALTER TABLE trainings ADD COLUMN mandatory_key TEXT`,

        // Novas Tabelas ISO 19650-6
        `CREATE TABLE IF NOT EXISTS safety_incidents (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            incident_code TEXT NOT NULL,
            incident_type TEXT,
            severity TEXT,
            occurred_at TEXT NOT NULL,
            location_description TEXT,
            zone_id TEXT,
            worker_id TEXT,
            company_id TEXT,
            equipment_id TEXT,
            related_risk_name TEXT,
            description TEXT NOT NULL,
            immediate_cause TEXT,
            root_cause TEXT,
            corrective_action TEXT,
            reported_to_act BOOLEAN DEFAULT 0,
            act_report_date TEXT,
            act_reference TEXT,
            reported_to_insurance BOOLEAN DEFAULT 0,
            insurance_report_date TEXT,
            work_days_lost INTEGER DEFAULT 0,
            investigated_by TEXT,
            investigation_date TEXT,
            status TEXT DEFAULT 'reported',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS risk_assessments (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            project_id TEXT NOT NULL,
            risk_name TEXT NOT NULL UNIQUE,
            risk_type TEXT,
            nature_of_risk TEXT NOT NULL,
            risk_assessment_methodology TEXT,
            unmitigated_likelihood TEXT,
            unmitigated_consequence TEXT,
            unmitigated_significance TEXT,
            mitigation_planned TEXT,
            mitigation_accepted TEXT,
            mitigated_likelihood TEXT,
            mitigated_consequence TEXT,
            mitigated_significance TEXT,
            associated_worker_id TEXT,
            associated_equipment_id TEXT,
            associated_company_id TEXT,
            associated_location TEXT,
            associated_activity TEXT,
            responsible_user_id TEXT,
            review_date TEXT,
            version INTEGER DEFAULT 1,
            supersedes_id TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )`,
        `ALTER TABLE courses ADD COLUMN cover_image TEXT`
    ];

    const existingColumnsCache = new Map<string, Set<string>>();
    const getTableColumns = async (table: string): Promise<Set<string>> => {
        if (existingColumnsCache.has(table)) return existingColumnsCache.get(table)!;
        try {
            const rows = await run(`PRAGMA table_info(${table})`);
            const set = new Set<string>((rows || []).map((r: any) => String(r.name)));
            existingColumnsCache.set(table, set);
            return set;
        } catch {
            return new Set<string>();
        }
    };

    for (const sql of migrations) {
        try {
            const alterMatch = sql.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i);
            if (alterMatch) {
                const [, table, col] = alterMatch;
                const cols = await getTableColumns(table);
                if (cols.has(col)) {
                    continue; // Column already exists in SQLite — skip without error
                }
            }
            await run(sql);
        } catch (_) {
            // Safe to ignore
        }
    }
};
