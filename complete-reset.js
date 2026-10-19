// COMPLETE RESET SCRIPT - Run this in browser console (F12)
// This will clear BOTH localStorage AND SQLite, forcing complete reinitialization

console.log("🔧 COMPLETE DATA RESET...");

// Step 1: Clear localStorage
localStorage.clear();
console.log("✅ Cleared localStorage");

// Step 2: Clear IndexedDB (where SQLite data is stored)
const deleteDB = indexedDB.deleteDatabase('sql.js');
deleteDB.onsuccess = () => {
    console.log("✅ Cleared SQLite database");
    console.log("🔄 Reloading page...");
    setTimeout(() => {
        window.location.reload();
    }, 500);
};

deleteDB.onerror = () => {
    console.error("❌ Failed to delete SQLite database");
    console.log("Trying alternative method...");

    // Alternative: just reload and let it reinitialize
    setTimeout(() => {
        window.location.reload();
    }, 500);
};

console.log("\n⏳ Clearing all data and reloading...");
console.log("After reload, app will initialize with fresh mock data.");
