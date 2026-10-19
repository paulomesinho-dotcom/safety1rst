/**
 * Database Cleanup Script
 * 
 * This script clears ALL data from the SafeSite database.
 * Run this in the browser console to reset the database.
 * 
 * WARNING: This will delete ALL data permanently!
 */

// Function to clear all data from SQLite database
async function clearAllData() {
    console.log('🗑️ Starting database cleanup...');

    try {
        // Import the executeQuery function from the db module
        const { executeQuery } = await import('./src/lib/db');

        // List of all tables to clear
        const tables = [
            'ticket_messages',
            'tickets',
            'workflow_logs',
            'access_logs',
            'access_points',
            'equipment_profiles',
            'worker_profiles',
            'company_profiles',
            'project_members',
            'documents',
            'equipment',
            'workers',
            'companies',
            'trainings',
            'accidents',
            'pdf_templates',
            'projects',
            'users',
            'accounts'
        ];

        console.log(`📋 Found ${tables.length} tables to clear`);

        // Delete data from each table
        for (const table of tables) {
            try {
                await executeQuery(`DELETE FROM ${table}`);
                console.log(`✅ Cleared table: ${table}`);
            } catch (error) {
                console.warn(`⚠️ Could not clear table ${table}:`, error);
            }
        }

        console.log('✨ Database cleanup complete!');
        console.log('🔄 Please refresh the page to reinitialize with fresh data.');

        return { success: true, message: 'All data cleared successfully' };

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        return { success: false, error };
    }
}

// Alternative: Clear IndexedDB and localStorage (if used)
async function clearBrowserStorage() {
    console.log('🗑️ Clearing browser storage...');

    try {
        // Clear localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared');

        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');

        // Clear IndexedDB databases
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
                console.log(`✅ Deleted IndexedDB: ${db.name}`);
            }
        }

        console.log('✨ Browser storage cleanup complete!');
        console.log('🔄 Please refresh the page.');

        return { success: true, message: 'Browser storage cleared successfully' };

    } catch (error) {
        console.error('❌ Error during storage cleanup:', error);
        return { success: false, error };
    }
}

// Complete cleanup: Database + Browser Storage
async function completeCleanup() {
    console.log('🧹 Starting complete cleanup...');
    console.log('⚠️ WARNING: This will delete ALL data permanently!');

    // Clear database
    await clearAllData();

    // Clear browser storage
    await clearBrowserStorage();

    console.log('✨ Complete cleanup finished!');
    console.log('🔄 Refreshing page in 3 seconds...');

    setTimeout(() => {
        window.location.reload();
    }, 3000);
}

// Export functions for use
if (typeof window !== 'undefined') {
    (window as any).clearAllData = clearAllData;
    (window as any).clearBrowserStorage = clearBrowserStorage;
    (window as any).completeCleanup = completeCleanup;

    console.log('📦 Database cleanup functions loaded!');
    console.log('💡 Available commands:');
    console.log('   - clearAllData() - Clear SQLite database only');
    console.log('   - clearBrowserStorage() - Clear localStorage/IndexedDB only');
    console.log('   - completeCleanup() - Clear everything and reload');
}

export { clearAllData, clearBrowserStorage, completeCleanup };
