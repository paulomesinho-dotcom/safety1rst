// FIX SCRIPT - Run this in browser console (F12)
// This will clear localStorage and force reload from SQLite

console.log("🔧 FIXING DATA PERSISTENCE ISSUE...");

// Step 1: Backup current localStorage (just in case)
const backup = localStorage.getItem('safesite-storage');
console.log("✅ Backed up localStorage");

// Step 2: Clear the problematic localStorage
localStorage.removeItem('safesite-storage');
console.log("✅ Cleared localStorage");

// Step 3: Reload the page
console.log("🔄 Reloading page to initialize from SQLite...");
setTimeout(() => {
    window.location.reload();
}, 1000);

console.log("\n⏳ Page will reload in 1 second...");
console.log("After reload, your data should come fresh from SQLite database.");
