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
  // Always attach listeners when dashboard starts
  loadImagesRealtime();       // <--- add this line
  updateOverviewStats();
  loadTransactionsRealtime();

  // Optional: role-based logic
  if (role === "superadmin") {
    // superadmin-specific features
  }
}

// --- Tab Navigation ---
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.add("hidden");
  });
  
  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.remove("hidden");

  // Update active button styling
  document.querySelectorAll(".tab-btn").forEach(btn => {
    // This checks if the button's onclick contains the tabId string
    const isActive = btn.getAttribute("onclick").includes(tabId);
    btn.classList.toggle("active", isActive);
  });
}

// --- Mobile Sidebar Toggle ---
function toggleMenu() {
  const sidebar = document.getElementById("sidebar");
  
  // This toggles the 'hidden' class that Tailwind uses
  if (sidebar.classList.contains("hidden")) {
    sidebar.classList.remove("hidden");
    // Ensure it covers the screen on mobile
    sidebar.classList.add("fixed", "inset-0", "w-full");
  } else {
    sidebar.classList.add("hidden");
    sidebar.classList.remove("fixed", "inset-0", "w-full");
  }
}

// Close sidebar automatically when a tab is clicked (for mobile UX)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (window.innerWidth < 1024) { // 1024px is the 'lg' breakpoint in Tailwind
      document.getElementById("sidebar").classList.add("hidden");
    }
  });
});


// --- Image Approval Logic ---

function loadImagesRealtime() {
    // Listen for items with status 'pending'
    db.collection("products")
        .where("status", "==", "pending")
        // .orderBy("postedAt", "desc")
        .onSnapshot((snapshot) => {
            const queueContainer = document.getElementById('image-queue');
            const counter = document.getElementById('counter-pending-images');
            
            // Update the Overview Counter instantly
            if (counter) counter.innerText = snapshot.size;

            if (!queueContainer) return;
            queueContainer.innerHTML = "";

            if (snapshot.empty) {
                queueContainer.innerHTML = `
                    <div class="text-center py-20 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
                        <p class="text-zinc-500">No images pending approval.</p>
                    </div>`;
                return;
            }

            snapshot.forEach((doc) => {
                const product = doc.data();
                const productId = doc.id;

                const card = `
                    <div class="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                        <div class="w-full md:w-64 h-48 flex-shrink-0">
                            <img src="${product.images[0]}" class="w-full h-full object-cover rounded-2xl" alt="Product">
                        </div>

                        <div class="flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="text-xl font-bold text-white">${product.title}</h3>
                                    <span class="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Pending</span>
                                </div>
                                <p class="text-zinc-400 text-sm line-clamp-2 mb-4">${product.description}</p>
                                
                                <div class="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p class="text-zinc-500">Price</p>
                                        <p class="text-white font-mono">MWK ${product.price.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p class="text-zinc-500">Seller</p>
                                        <p class="text-white">${product.sellerName}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-3 mt-6">
                                <button onclick="processApproval('${productId}', 'approved')" 
                                        class="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-95">
                                    Approve
                                </button>
                                <button onclick="processApproval('${productId}', 'rejected')" 
                                        class="px-6 bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                queueContainer.innerHTML += card;
            });
        });
}

async function processApproval(id, decision) {
    try {
        await db.collection("products").doc(id).update({
            status: decision,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Item ${decision === 'approved' ? 'is now live' : 'rejected'}`, "success");
        logActivity("Product Approval", `Status: ${decision} | ID: ${id}`);
        
    } catch (error) {
        console.error("Approval Error:", error);
        showToast("Error updating product: " + error.message, "error");
    }
}

// --- Placeholder Functions (To be built later) ---

function loadClientsRealtime() {
    console.log("Clients module: Ready and waiting for code.");
}

function loadTransactionsRealtime() {
    console.log("Transactions module: Ready and waiting for code.");
}

function updateOverviewStats() {
    console.log("Overview Stats: Ready and waiting for code.");
}


