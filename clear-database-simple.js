/**
 * SIMPLE DATABASE CLEANUP
 * 
 * Copy and paste this code into the browser console to clear all data.
 */

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();
console.log('✅ localStorage and sessionStorage cleared');

// Clear all IndexedDB databases
indexedDB.databases().then(databases => {
    databases.forEach(db => {
        if (db.name) {
            indexedDB.deleteDatabase(db.name);
            console.log(`✅ Deleted database: ${db.name}`);
        }
    });

    console.log('✨ All data cleared!');
    console.log('🔄 Refreshing page in 2 seconds...');

    setTimeout(() => {
        window.location.reload();
    }, 2000);
});
