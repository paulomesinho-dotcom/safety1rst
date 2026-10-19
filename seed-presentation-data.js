// SEED PRESENTATION DATA
// Run this script in the browser console (F12) to populate the app with sample data
// This creates realistic data for: Companies, Workers, Equipment, Training, and Accidents

console.log("🌱 SEEDING PRESENTATION DATA...");

(async () => {
    try {
        // Import the store
        const { useStore } = await import('/src/store/useStore.ts');
        const store = useStore.getState();

        // Get current project ID (assumes you're on a project page)
        const currentUrl = window.location.pathname;
        const projectIdMatch = currentUrl.match(/\/project\/([^\/]+)/);

        if (!projectIdMatch) {
            console.error("❌ Please navigate to a project page first!");
            return;
        }

        const projectId = projectIdMatch[1];
        const accountId = store.currentUser?.accountId || 'demo-account';

        console.log(`📍 Using Project ID: ${projectId}`);
        console.log(`📍 Using Account ID: ${accountId}`);

        // Helper function to generate random date
        const randomDate = (start, end) => {
            return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        };

        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const oneYearFromNow = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
        const sixMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());

        // ============================================
        // 1. CREATE COMPANIES
        // ============================================
        console.log("\n🏢 Creating Companies...");

        const companies = [
            {
                name: "Construções Silva & Filhos, Lda",
                nif: "501234567",
                activity: "Construção Civil",
                impic: "12345",
                email: "geral@silvafilhos.pt",
                phone: "+351 210 123 456",
                address: "Rua das Obras, 123, Lisboa",
                tier: 1,
                entryDate: formatDate(threeMonthsAgo),
                workSchedule: "Segunda a Sexta: 08:00-17:00",
                siteManager: "João Silva",
                siteContact: "+351 912 345 678",
                insuranceCivilDate: formatDate(sixMonthsFromNow),
                insuranceCivilPolicy: "RC-2024-001",
                insuranceWorkAccDate: formatDate(sixMonthsFromNow),
                insuranceWorkAccPolicy: "AT-2024-001",
                cleanSSDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                cleanFinDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                workflowStatus: 'validated',
                status: 'active'
            },
            {
                name: "Electromec - Instalações Eléctricas",
                nif: "502345678",
                activity: "Instalações Eléctricas",
                impic: "23456",
                email: "info@electromec.pt",
                phone: "+351 220 234 567",
                address: "Av. Engenharia, 45, Porto",
                tier: 2,
                entryDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 2, 15)),
                workSchedule: "Segunda a Sexta: 09:00-18:00",
                siteManager: "Carlos Mendes",
                siteContact: "+351 923 456 789",
                insuranceCivilDate: formatDate(sixMonthsFromNow),
                insuranceCivilPolicy: "RC-2024-002",
                insuranceWorkAccDate: formatDate(sixMonthsFromNow),
                insuranceWorkAccPolicy: "AT-2024-002",
                cleanSSDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                cleanFinDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                workflowStatus: 'validated',
                status: 'active'
            },
            {
                name: "HidroTec - Canalizações e AVAC",
                nif: "503456789",
                activity: "Canalizações e AVAC",
                impic: "34567",
                email: "contacto@hidrotec.pt",
                phone: "+351 230 345 678",
                address: "Rua dos Canos, 78, Braga",
                tier: 2,
                entryDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 20)),
                workSchedule: "Segunda a Sexta: 08:00-17:00",
                siteManager: "Manuel Costa",
                siteContact: "+351 934 567 890",
                insuranceCivilDate: formatDate(sixMonthsFromNow),
                insuranceCivilPolicy: "RC-2024-003",
                insuranceWorkAccDate: formatDate(sixMonthsFromNow),
                insuranceWorkAccPolicy: "AT-2024-003",
                cleanSSDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                cleanFinDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                workflowStatus: 'validated',
                status: 'active'
            },
            {
                name: "Acabamentos Premium, SA",
                nif: "504567890",
                activity: "Acabamentos e Pinturas",
                impic: "45678",
                email: "geral@acabamentospremium.pt",
                phone: "+351 240 456 789",
                address: "Praça das Tintas, 12, Coimbra",
                tier: 3,
                entryDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 5)),
                workSchedule: "Segunda a Sexta: 08:30-17:30",
                siteManager: "Pedro Alves",
                siteContact: "+351 945 678 901",
                insuranceCivilDate: formatDate(sixMonthsFromNow),
                insuranceCivilPolicy: "RC-2024-004",
                insuranceWorkAccDate: formatDate(sixMonthsFromNow),
                insuranceWorkAccPolicy: "AT-2024-004",
                cleanSSDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                cleanFinDate: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                workflowStatus: 'validated',
                status: 'active'
            }
        ];

        const createdCompanies = [];
        for (const companyData of companies) {
            const company = store.addCompany({
                ...companyData,
                accountId,
                projectId
            });
            createdCompanies.push(company);
            console.log(`  ✓ Created: ${company.name}`);
        }

        // ============================================
        // 2. CREATE WORKERS
        // ============================================
        console.log("\n👷 Creating Workers...");

        const workerData = [
            // Silva & Filhos workers
            { name: "António Ferreira", role: "Encarregado Geral", company: 0, nif: "123456789", phone: "+351 911 111 111", email: "antonio.ferreira@silvafilhos.pt", birthDate: "1975-03-15" },
            { name: "José Santos", role: "Pedreiro", company: 0, nif: "123456790", phone: "+351 911 111 112", birthDate: "1985-07-22" },
            { name: "Manuel Rodrigues", role: "Servente", company: 0, nif: "123456791", phone: "+351 911 111 113", birthDate: "1990-11-08" },
            { name: "Paulo Oliveira", role: "Carpinteiro", company: 0, nif: "123456792", phone: "+351 911 111 114", birthDate: "1982-05-19" },
            { name: "Ricardo Sousa", role: "Armador de Ferro", company: 0, nif: "123456793", phone: "+351 911 111 115", birthDate: "1988-09-30" },

            // Electromec workers
            { name: "Carlos Pereira", role: "Electricista Chefe", company: 1, nif: "234567890", phone: "+351 922 222 221", email: "carlos.pereira@electromec.pt", birthDate: "1978-02-10" },
            { name: "Fernando Lopes", role: "Electricista", company: 1, nif: "234567891", phone: "+351 922 222 222", birthDate: "1986-06-25" },
            { name: "Miguel Martins", role: "Electricista", company: 1, nif: "234567892", phone: "+351 922 222 223", birthDate: "1991-12-03" },
            { name: "Rui Gonçalves", role: "Ajudante Electricista", company: 1, nif: "234567893", phone: "+351 922 222 224", birthDate: "1995-04-17" },

            // HidroTec workers
            { name: "Joaquim Almeida", role: "Canalizador Chefe", company: 2, nif: "345678901", phone: "+351 933 333 331", email: "joaquim.almeida@hidrotec.pt", birthDate: "1980-08-12" },
            { name: "Luís Fernandes", role: "Canalizador", company: 2, nif: "345678902", phone: "+351 933 333 332", birthDate: "1987-01-28" },
            { name: "Tiago Ribeiro", role: "Canalizador", company: 2, nif: "345678903", phone: "+351 933 333 333", birthDate: "1992-10-05" },
            { name: "André Costa", role: "Ajudante", company: 2, nif: "345678904", phone: "+351 933 333 334", birthDate: "1996-03-21" },

            // Acabamentos Premium workers
            { name: "Bruno Silva", role: "Pintor Chefe", company: 3, nif: "456789012", phone: "+351 944 444 441", email: "bruno.silva@acabamentospremium.pt", birthDate: "1983-11-14" },
            { name: "Daniel Carvalho", role: "Pintor", company: 3, nif: "456789013", phone: "+351 944 444 442", birthDate: "1989-07-09" },
            { name: "Hugo Marques", role: "Pintor", company: 3, nif: "456789014", phone: "+351 944 444 443", birthDate: "1993-02-26" },
            { name: "Nuno Pinto", role: "Gesseiro", company: 3, nif: "456789015", phone: "+351 944 444 444", birthDate: "1991-05-18" }
        ];

        const createdWorkers = [];
        for (const worker of workerData) {
            const companyId = createdCompanies[worker.company].id;
            const idExpiry = new Date(oneYearFromNow);
            idExpiry.setMonth(idExpiry.getMonth() + Math.floor(Math.random() * 12));

            const medicalExpiry = new Date(today);
            medicalExpiry.setMonth(medicalExpiry.getMonth() + 3 + Math.floor(Math.random() * 9));

            const contractExpiry = new Date(oneYearFromNow);
            contractExpiry.setMonth(contractExpiry.getMonth() + Math.floor(Math.random() * 12));

            const createdWorker = store.addWorker({
                name: worker.name,
                role: worker.role,
                companyId,
                nif: worker.nif,
                phone: worker.phone,
                email: worker.email,
                birthDate: worker.birthDate,
                address: `Rua Exemplo ${Math.floor(Math.random() * 100)}, Lisboa`,
                idCardExpiry: formatDate(idExpiry),
                contractExpiry: formatDate(contractExpiry),
                medicalExpiry: formatDate(medicalExpiry),
                epiDate: formatDate(randomDate(threeMonthsAgo, today)),
                inductionDate: formatDate(randomDate(threeMonthsAgo, today)),
                specificTrainingDate: formatDate(randomDate(threeMonthsAgo, today)),
                isForeign: Math.random() > 0.85,
                workflowStatus: 'validated',
                status: 'active',
                accessCardCode: `WRK${String(createdWorkers.length + 1).padStart(4, '0')}`,
                accessCardValid: true,
                accountId,
                projectId
            });

            createdWorkers.push(createdWorker);
            console.log(`  ✓ Created: ${worker.name} (${worker.role})`);
        }

        // ============================================
        // 3. CREATE EQUIPMENT
        // ============================================
        console.log("\n🚜 Creating Equipment...");

        const equipmentData = [
            // Silva & Filhos equipment
            { name: "Escavadora Giratória", type: "Escavadora", brand: "Caterpillar", model: "320D", serialNumber: "CAT320D001", company: 0, manufacturingYear: "2020", soundPower: "105" },
            { name: "Dumper Articulado", type: "Dumper", brand: "Volvo", model: "A25G", serialNumber: "VOL-A25G-002", company: 0, manufacturingYear: "2019", soundPower: "108" },
            { name: "Grua Torre", type: "Grua", brand: "Liebherr", model: "71K", serialNumber: "LIE-71K-003", company: 0, manufacturingYear: "2021", soundPower: "95" },
            { name: "Betoneira Autocarregável", type: "Betoneira", brand: "Carmix", model: "3.5TT", serialNumber: "CMX-35TT-004", company: 0, manufacturingYear: "2022", soundPower: "98" },

            // Electromec equipment
            { name: "Plataforma Elevatória", type: "Plataforma", brand: "Genie", model: "Z-45/25J", serialNumber: "GEN-Z45-005", company: 1, manufacturingYear: "2021", soundPower: "85" },
            { name: "Gerador Diesel", type: "Gerador", brand: "Atlas Copco", model: "QAS 60", serialNumber: "ATC-QAS60-006", company: 1, manufacturingYear: "2020", soundPower: "97" },
            { name: "Andaime Móvel", type: "Andaime", brand: "Layher", model: "Allround", serialNumber: "LAY-AR-007", company: 1, manufacturingYear: "2022", soundPower: "0" },

            // HidroTec equipment
            { name: "Máquina de Soldar", type: "Soldadura", brand: "Fronius", model: "TPS 320i", serialNumber: "FRO-TPS320-008", company: 2, manufacturingYear: "2021", soundPower: "75" },
            { name: "Compressor de Ar", type: "Compressor", brand: "Atlas Copco", model: "XAS 68", serialNumber: "ATC-XAS68-009", company: 2, manufacturingYear: "2020", soundPower: "99" },
            { name: "Bomba de Água", type: "Bomba", brand: "Grundfos", model: "CR 64", serialNumber: "GRU-CR64-010", company: 2, manufacturingYear: "2022", soundPower: "82" },

            // Acabamentos Premium equipment
            { name: "Máquina de Projetar Reboco", type: "Projeção", brand: "PFT", model: "G4", serialNumber: "PFT-G4-011", company: 3, manufacturingYear: "2021", soundPower: "88" },
            { name: "Lixadora de Parede", type: "Lixadora", brand: "Festool", model: "Planex LHS 225", serialNumber: "FES-PLX225-012", company: 3, manufacturingYear: "2022", soundPower: "78" },
            { name: "Compressor Portátil", type: "Compressor", brand: "Stanley", model: "DST 100/8/6", serialNumber: "STN-DST100-013", company: 3, manufacturingYear: "2021", soundPower: "97" }
        ];

        const createdEquipment = [];
        for (const equip of equipmentData) {
            const companyId = createdCompanies[equip.company].id;
            const entryDate = randomDate(threeMonthsAgo, today);
            const lastMaintenance = randomDate(threeMonthsAgo, today);
            const nextMaintenance = new Date(lastMaintenance);
            nextMaintenance.setMonth(nextMaintenance.getMonth() + 3);

            const createdEquip = store.addEquipment({
                name: equip.name,
                type: equip.type,
                brand: equip.brand,
                model: equip.model,
                serialNumber: equip.serialNumber,
                companyId,
                manufacturingYear: equip.manufacturingYear,
                soundPower: equip.soundPower,
                entryDate: formatDate(entryDate),
                lastMaintenanceDate: formatDate(lastMaintenance),
                nextMaintenanceDate: formatDate(nextMaintenance),
                workingHoursOrKm: String(Math.floor(Math.random() * 5000) + 500),
                status: Math.random() > 0.9 ? 'maintenance' : 'operational',
                workflowStatus: 'validated',
                accountId,
                projectId
            });

            createdEquipment.push(createdEquip);
            console.log(`  ✓ Created: ${equip.name} (${equip.type})`);
        }

        // ============================================
        // 4. CREATE TRAINING RECORDS
        // ============================================
        console.log("\n📚 Creating Training Records...");

        const trainingTypes = [
            { name: "Segurança em Altura", type: "heights", provider: "SafeWork Academy", validityMonths: 24 },
            { name: "Trabalhos em Espaços Confinados", type: "confined_space", provider: "SafeWork Academy", validityMonths: 24 },
            { name: "Primeiros Socorros", type: "first_aid", provider: "Cruz Vermelha Portuguesa", validityMonths: 36 },
            { name: "Operação de Máquinas Pesadas", type: "machinery", provider: "IEFP", validityMonths: 60 },
            { name: "Segurança Eléctrica", type: "electrical", provider: "APSEI", validityMonths: 24 },
            { name: "Segurança Geral em Obra", type: "general", provider: "SafeWork Academy", validityMonths: 12 }
        ];

        const createdTrainings = [];
        for (const training of trainingTypes) {
            const createdTraining = store.addTraining({
                name: training.name,
                type: training.type,
                provider: training.provider,
                validityMonths: training.validityMonths,
                description: `Formação em ${training.name}`,
                accountId,
                projectId
            });
            createdTrainings.push(createdTraining);
            console.log(`  ✓ Created: ${training.name}`);
        }

        // Assign random trainings to workers
        console.log("\n  📝 Assigning trainings to workers...");
        for (const worker of createdWorkers) {
            const numTrainings = Math.floor(Math.random() * 3) + 1; // 1-3 trainings per worker
            const assignedTrainings = [];

            for (let i = 0; i < numTrainings; i++) {
                const randomTraining = createdTrainings[Math.floor(Math.random() * createdTrainings.length)];
                if (!assignedTrainings.includes(randomTraining.id)) {
                    assignedTrainings.push(randomTraining.id);
                }
            }

            store.updateWorker(worker.id, {
                completedTrainingIds: assignedTrainings
            });
        }

        // ============================================
        // 5. CREATE ACCESS POINTS
        // ============================================
        console.log("\n🚪 Creating Access Points...");

        const accessPointsData = [
            { name: "Entrada Principal", code: "GATE-001", type: "entry", category: "gate", capacity: 100 },
            { name: "Saída de Emergência Norte", code: "EXIT-N-001", type: "exit", category: "gate", capacity: 50 },
            { name: "Zona de Trabalho - Piso 1", code: "ZONE-P1", type: "zone", category: "zone", capacity: 30 },
            { name: "Zona de Trabalho - Piso 2", code: "ZONE-P2", type: "zone", category: "zone", capacity: 30 },
            { name: "Zona de Trabalho - Piso 3", code: "ZONE-P3", type: "zone", category: "zone", capacity: 30 },
            { name: "Ponto de Segurança - Refeitório", code: "SAFE-REF", type: "zone", category: "safe_point", capacity: 80 },
            { name: "Armazém de Materiais", code: "ZONE-ARM", type: "zone", category: "zone", capacity: 10 }
        ];

        const createdAccessPoints = [];
        for (const ap of accessPointsData) {
            const createdAP = store.addAccessPoint({
                name: ap.name,
                code: ap.code,
                type: ap.type,
                category: ap.category,
                capacity: ap.capacity,
                status: 'active',
                requiresGps: false,
                projectId
            });
            createdAccessPoints.push(createdAP);
            console.log(`  ✓ Created: ${ap.name}`);
        }

        // ============================================
        // 6. CREATE ACCESS LOGS
        // ============================================
        console.log("\n📊 Creating Access Logs...");

        // Generate 50 random access logs over the past 30 days
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (let i = 0; i < 50; i++) {
            const randomWorker = createdWorkers[Math.floor(Math.random() * createdWorkers.length)];
            const randomAccessPoint = createdAccessPoints[Math.floor(Math.random() * createdAccessPoints.length)];
            const randomTimestamp = randomDate(thirtyDaysAgo, today);
            const methods = ['qr', 'nfc', 'face'];
            const randomMethod = methods[Math.floor(Math.random() * methods.length)];
            const isGranted = Math.random() > 0.05; // 95% granted

            store.addAccessLog({
                projectId,
                entityType: 'worker',
                workerId: randomWorker.id,
                entityName: randomWorker.name,
                workerName: randomWorker.name,
                location: randomAccessPoint.name,
                locationId: randomAccessPoint.id,
                timestamp: randomTimestamp.toISOString(),
                status: isGranted ? 'granted' : 'denied',
                method: randomMethod,
                reason: isGranted ? undefined : 'Cartão inválido ou expirado'
            });
        }
        console.log(`  ✓ Created 50 access logs`);

        // ============================================
        // 7. CREATE ACCIDENTS/INCIDENTS
        // ============================================
        console.log("\n⚠️ Creating Accidents & Incidents...");

        const accidentsData = [
            {
                title: "Queda de Material em Altura",
                type: "accident",
                severity: "medium",
                status: "closed",
                location: createdAccessPoints[2].name,
                locationId: createdAccessPoints[2].id,
                description: "Durante trabalhos no piso 2, uma ferramenta caiu de uma altura de aproximadamente 3 metros. Não houve feridos, mas o incidente foi registado para análise de procedimentos de segurança.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth() - 2, 15)),
                workerIds: [createdWorkers[6].id, createdWorkers[7].id]
            },
            {
                title: "Corte Superficial em Mão",
                type: "accident",
                severity: "low",
                status: "closed",
                location: createdAccessPoints[3].name,
                locationId: createdAccessPoints[3].id,
                description: "Trabalhador sofreu corte superficial na mão esquerda ao manusear chapa metálica. Primeiros socorros aplicados no local. Trabalhador retornou ao trabalho no mesmo dia.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 22)),
                workerIds: [createdWorkers[10].id]
            },
            {
                title: "Quase Acidente - Escorregamento",
                type: "near_miss",
                severity: "low",
                status: "closed",
                location: createdAccessPoints[0].name,
                locationId: createdAccessPoints[0].id,
                description: "Trabalhador quase escorregou em piso molhado na entrada principal. Área foi sinalizada e procedimentos de limpeza foram revistos.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 8)),
                workerIds: [createdWorkers[3].id]
            },
            {
                title: "Exposição a Ruído Excessivo",
                type: "incident",
                severity: "medium",
                status: "investigating",
                location: createdAccessPoints[4].name,
                locationId: createdAccessPoints[4].id,
                description: "Medições de ruído no piso 3 ultrapassaram os limites recomendados durante operação de equipamento pesado. Equipas foram instruídas a usar proteção auditiva reforçada. Investigação em curso para medidas adicionais.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth(), 3)),
                workerIds: []
            },
            {
                title: "Quase Acidente - Carga Suspensa",
                type: "near_miss",
                severity: "high",
                status: "open",
                location: createdAccessPoints[2].name,
                locationId: createdAccessPoints[2].id,
                description: "Trabalhador passou sob carga suspensa por grua. Operador da grua alertou imediatamente. Briefing de segurança realizado com toda a equipa sobre zonas de exclusão.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth(), 10)),
                workerIds: [createdWorkers[1].id]
            },
            {
                title: "Entorse no Tornozelo",
                type: "accident",
                severity: "medium",
                status: "investigating",
                location: createdAccessPoints[6].name,
                locationId: createdAccessPoints[6].id,
                description: "Trabalhador torceu o tornozelo ao descer de plataforma no armazém. Recebeu assistência médica e está em recuperação. Análise de ergonomia do local em curso.",
                date: formatDate(new Date(today.getFullYear(), today.getMonth(), 12)),
                workerIds: [createdWorkers[14].id]
            }
        ];

        for (const accident of accidentsData) {
            store.addAccident({
                title: accident.title,
                type: accident.type,
                severity: accident.severity,
                status: accident.status,
                location: accident.location,
                locationId: accident.locationId,
                description: accident.description,
                date: accident.date,
                workerIds: accident.workerIds,
                projectId
            });
            console.log(`  ✓ Created: ${accident.title} (${accident.type})`);
        }

        // ============================================
        // SUMMARY
        // ============================================
        console.log("\n" + "=".repeat(50));
        console.log("✅ SEEDING COMPLETE!");
        console.log("=".repeat(50));
        console.log(`📊 Summary:`);
        console.log(`   • ${createdCompanies.length} Companies`);
        console.log(`   • ${createdWorkers.length} Workers`);
        console.log(`   • ${createdEquipment.length} Equipment`);
        console.log(`   • ${createdTrainings.length} Training Types`);
        console.log(`   • ${createdAccessPoints.length} Access Points`);
        console.log(`   • 50 Access Logs`);
        console.log(`   • ${accidentsData.length} Accidents/Incidents`);
        console.log("=".repeat(50));
        console.log("\n🔄 Reloading page in 2 seconds...");

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        console.error("❌ Error seeding data:", error);
    }
})();
