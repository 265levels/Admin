// ======================
// LEVELS ADMIN - admin.js
// ======================

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCPUBkJzJhLUVD0qXMg2_tyvsZ9ZxtfWuc",
  authDomain: "levels-ecommerce.firebaseapp.com",
  projectId: "levels-ecommerce",
  storageBucket: "levels-ecommerce.appspot.com",
  messagingSenderId: "637669858543",
  appId: "1:637669858543:web:9f61dafba8842416f58f1a",
  measurementId: "G-RQJSBPTWC9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- Utility Functions ---
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  
  const toast = document.createElement("div");
  toast.className = `toast-${type} px-6 py-4 rounded-2xl shadow-2xl text-sm font-medium`;
  toast.textContent = message;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function logActivity(action, details) {
  try {
    await db.collection("adminLogs").add({
      action,
      details,
      adminEmail: auth.currentUser?.email || "unknown",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("Failed to log activity:", e);
  }
}

// --- Authentication ---
async function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("Login Error:", error);
    showToast("Login failed: " + error.message, "error");
  }
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    auth.signOut().then(() => {
      showToast("Logged out successfully", "info");
      location.reload();
    });
  }
}

// --- Auth State Listener ---
auth.onAuthStateChanged(async (user) => {
  const overlay = document.getElementById("login-overlay");
  const errorMsg = document.getElementById("login-error");
  const userDisplay = document.getElementById("current-user");

  if (user) {
    const adminDoc = await db.collection("admins").doc(user.uid).get();

    if (adminDoc.exists) {
      overlay.classList.add("hidden");
      userDisplay.textContent = user.displayName || user.email;
      
      logActivity("Admin Login", user.email);
      startDashboard(adminDoc.data().role);
    } else {
      await auth.signOut();
      errorMsg.classList.remove("hidden");
      errorMsg.textContent = `Access Denied: ${user.email} is not authorized.`;
    }
  } else {
    overlay.classList.remove("hidden");
  }
});

// --- Dashboard Initialization ---
function startDashboard(role) {
  if (role !== "superadmin") {
    const transBtn = document.querySelector("[onclick*='transactions']");
    if (transBtn) transBtn.style.display = "none";
  }

  loadClientsRealtime();
  loadTransactionsRealtime();
  loadImagesRealtime();
  updateOverviewStats();
}

// --- Tab Navigation ---
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.add("hidden");
  });
  
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.remove("hidden");

  // Update active button
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("onclick") ===
