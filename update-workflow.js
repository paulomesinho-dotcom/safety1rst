// UPDATE WORKFLOW STATUS SCRIPT - Run this in browser console (F12)
// This will update the company "Acme" to validation_pending in SQLite

console.log("🔧 UPDATING COMPANY WORKFLOW STATUS...");

// This script needs to access the SQL.js database
// We'll use the store's executeQuery function

(async () => {
    try {
        // Import the executeQuery function
        const { executeQuery } = await import('/src/lib/db.js');

        console.log("📊 Checking current company data...");

        // Get current companies
        const companies = await executeQuery('SELECT id, name, workflow_status FROM companies');
        console.log("Current companies:", companies);

        // Find Acme
        const acme = companies.find(c => c.name === 'Acme');

        if (!acme) {
            console.error("❌ Company 'Acme' not found in database");
            return;
        }

        console.log(`Found Acme: id=${acme.id}, current status=${acme.workflow_status}`);

        // Update to validation_pending
        await executeQuery(
            'UPDATE companies SET workflow_status = ? WHERE id = ?',
            ['validation_pending', acme.id]
        );

        console.log("✅ Updated Acme to validation_pending");

        // Verify update
        const updated = await executeQuery('SELECT name, workflow_status FROM companies WHERE id = ?', [acme.id]);
        console.log("Verified:", updated);

        console.log("\n🔄 Reloading page to reflect changes...");
        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (error) {
        console.error("❌ Error updating database:", error);
        console.log("\nAlternative: Use the complete-reset.js script instead");
    }
})();
