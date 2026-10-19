// SQL DIRECT FIX - Run this in browser console
// This will check and fix the company "b" directly in SQLite

(async () => {
    console.log("🔍 Checking company 'b' in SQLite...");

    try {
        // Dynamic import of db functions
        const dbModule = await import('/src/lib/db.js');
        const { executeQuery } = dbModule;

        // Check current status
        const companies = await executeQuery("SELECT id, name, workflow_status FROM companies WHERE name = 'b'");

        if (companies.length === 0) {
            console.error("❌ Company 'b' not found in database!");
            console.log("Available companies:");
            const all = await executeQuery("SELECT name, workflow_status FROM companies");
            console.table(all);
            return;
        }

        const company = companies[0];
        console.log("Found company 'b':");
        console.log("  ID:", company.id);
        console.log("  Current workflow_status:", company.workflow_status);

        // Update to validation_pending
        await executeQuery(
            "UPDATE companies SET workflow_status = 'validation_pending' WHERE id = ?",
            [company.id]
        );

        console.log("✅ Updated to validation_pending");

        // Verify
        const updated = await executeQuery("SELECT workflow_status FROM companies WHERE id = ?", [company.id]);
        console.log("Verified new status:", updated[0].workflow_status);

        console.log("\n🔄 Reloading page...");
        setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
        console.error("❌ Error:", error);
        console.log("\nTry this alternative:");
        console.log("1. Open DevTools → Application → IndexedDB → sql.js");
        console.log("2. Find the companies table");
        console.log("3. Manually change workflow_status to 'validation_pending'");
    }
})();
