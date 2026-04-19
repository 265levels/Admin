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
    db.collection("products")
        .where("status", "==", "pending")
        .onSnapshot((snapshot) => {
            const queueContainer = document.getElementById('image-queue');
            const counter = document.getElementById('counter-pending-images');
            
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
                const images = product.images || [];
                // This prepares the image array to be passed safely into the HTML
                const imagesJson = JSON.stringify(images).replace(/"/g, '&quot;');

                const card = `
                    <div class="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row gap-6 p-6 hover:border-zinc-700 transition-colors group">
                        <div class="w-full md:w-64 h-64 flex-shrink-0 relative cursor-zoom-in overflow-hidden rounded-2xl" 
                             onclick="openAdminSlideshow(${imagesJson})">
                            <img src="${images[0] || 'placeholder.jpg'}" 
                                 class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Product">
                            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span class="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold border border-white/20">VIEW ${images.length} PHOTOS</span>
                            </div>
                        </div>

                        <div class="flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="text-xl font-bold text-white">${product.title}</h3>
                                    <span class="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">Pending</span>
                                </div>
                                <p class="text-zinc-400 text-sm line-clamp-2 mb-4">${product.description}</p>
                                
                                <div class="grid grid-cols-2 gap-4 text-xs">
                                    <div class="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                        <p class="text-zinc-500 uppercase font-bold text-[9px]">Price</p>
                                        <p class="text-white font-mono text-sm">MWK ${Number(product.price).toLocaleString()}</p>
                                    </div>
                                    <div class="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                                        <p class="text-zinc-500 uppercase font-bold text-[9px]">Seller</p>
                                        <p class="text-white text-sm">${product.sellerName || 'Anonymous'}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-3 mt-6">
                                <button onclick="processApproval('${productId}', 'approved')" 
                                        class="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-green-500 hover:text-white transition-all active:scale-95">
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

// The Slideshow Logic

let adminCurrentSlide = 0;
let adminSlides = [];

function openAdminSlideshow(images) {
    if (!images || images.length === 0) return;
    adminSlides = images;
    adminCurrentSlide = 0;
    
    let modal = document.getElementById('admin-slideshow-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-slideshow-modal';
        // z-[999] ensures it stays above the sidebar and header
        modal.className = 'fixed inset-0 bg-black/98 z-[999] hidden flex items-center justify-center p-4 backdrop-blur-xl';
        document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // Ensure flex display is active
    document.body.style.overflow = 'hidden'; // Stop background from scrolling
    renderAdminSlide();
}

function renderAdminSlide() {
    const modal = document.getElementById('admin-slideshow-modal');
    modal.innerHTML = `
        <button onclick="closeAdminSlideshow()" class="absolute top-6 right-6 text-zinc-500 hover:text-white text-5xl z-[1000] transition-colors cursor-pointer p-4">
            &times;
        </button>
        
        <div class="relative w-full max-w-5xl h-[85vh] flex items-center justify-center">
            <img src="${adminSlides[adminCurrentSlide]}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-zinc-800">
            
            ${adminSlides.length > 1 ? `
                <button onclick="changeAdminSlide(-1)" class="absolute left-4 bg-white/5 hover:bg-white/10 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all cursor-pointer">❮</button>
                <button onclick="changeAdminSlide(1)" class="absolute right-4 bg-white/5 hover:bg-white/10 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all cursor-pointer">❯</button>
                
                <div class="absolute -bottom-10 left-1/2 -translate-x-1/2 text-zinc-500 font-mono text-sm">
                    ${adminCurrentSlide + 1} / ${adminSlides.length}
                </div>
            ` : ''}
        </div>
    `;
}

function changeAdminSlide(dir) {
    adminCurrentSlide = (adminCurrentSlide + dir + adminSlides.length) % adminSlides.length;
    renderAdminSlide();
}

// THE FIX: Explicitly hide and reset display
function closeAdminSlideshow() {
    const modal = document.getElementById('admin-slideshow-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    }
}

// Optional: Exit on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeAdminSlideshow();
});


// --- Client Search & Messaging Logic ---

async function searchClients() {
    const searchInput = document.getElementById('client-search-input').value.trim();
    const listContainer = document.getElementById('clients-list');
    
    if (!searchInput) {
        showToast("Please enter an email", "error");
        return;
    }

    listContainer.innerHTML = '<div class="text-zinc-500 animate-pulse p-10">Searching sellers...</div>';

    try {
        // Querying the 'products' collection based on your current data structure
        const snapshot = await db.collection("products")
            .where("sellerEmail", "==", searchInput.toLowerCase())
            .get();

        if (snapshot.empty) {
            listContainer.innerHTML = `
                <div class="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-zinc-500 italic">
                    No seller found with email: ${searchInput}
                </div>`;
            return;
        }

        listContainer.innerHTML = "";
        
        // Use a Set to avoid showing the same seller multiple times if they have many products
        const seenSellers = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            const sellerId = data.sellerId;
            const sellerEmail = data.sellerEmail;

            if (!seenSellers.has(sellerId)) {
                seenSellers.add(sellerId);
                
                listContainer.innerHTML += `
                    <div class="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 flex justify-between items-center animate-fadeIn">
                        <div>
                            <h3 class="text-white font-bold text-xl">${data.sellerName || 'Seller'}</h3>
                            <p class="text-zinc-400 text-sm">${sellerEmail}</p>
                            <p class="text-zinc-600 text-[10px] mt-1 uppercase tracking-widest">Location: ${data.sellerLocation || 'N/A'}</p>
                        </div>
                        <button onclick="prepareAdminMessage('${sellerId}', '${sellerEmail}')" 
                                class="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
                            Message Seller
                        </button>
                    </div>`;
            }
        });
    } catch (error) {
        console.error("Search failed:", error);
        showToast("Permission denied or search failed", "error");
    }
}

// --- Messaging System Functions ---

function prepareAdminMessage(userId, userEmail) {
    // 1. Switch the admin tab to the 'messages' section
    switchTab('messages'); 

    // 2. Clear the messages area and show the custom compose form
    const messageArea = document.getElementById('messages');
    messageArea.innerHTML = `
        <div class="max-w-3xl animate-fadeIn">
            <h2 class="text-4xl font-bold mb-2">Compose Message</h2>
            <p class="text-zinc-500 mb-10">Contacting Seller: <span class="text-white font-mono bg-zinc-800 px-3 py-1 rounded-lg ml-2">${userEmail}</span></p>

            <div class="bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl">
                <label class="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Message Content</label>
                <textarea id="admin-text-content" 
                          class="w-full bg-zinc-800 border-none rounded-3xl p-6 text-white placeholder-zinc-600 focus:ring-2 focus:ring-red-600 min-h-[250px] outline-none transition-all"
                          placeholder="Type your message to the seller here..."></textarea>
                
                <div class="flex gap-4 mt-8">
                    <button onclick="sendFinalMessage('${userId}')" 
                            class="flex-[2] bg-white text-black font-black py-5 rounded-2xl hover:bg-red-600 hover:text-white transition-all flex justify-center items-center gap-3 active:scale-95">
                        <i class="fa-solid fa-paper-plane"></i>
                        SEND MESSAGE
                    </button>
                    <button onclick="switchTab('clients')" 
                            class="flex-1 bg-zinc-800 text-zinc-400 font-bold py-5 rounded-2xl hover:bg-zinc-700 transition-all">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function sendFinalMessage(recipientId) {
    const content = document.getElementById('admin-text-content').value.trim();
    
    if (!content) {
        showToast("Message cannot be empty", "error");
        return;
    }

    try {
        // Log the attempt
        logActivity("Admin Message Sent", `To: ${recipientId}`);

        // Save the message to Firestore
        await db.collection("messages").add({
            senderId: "admin",
            recipientId: recipientId,
            message: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: "unread",
            type: "admin_notification"
        });

        showToast("Message successfully sent to seller", "success");
        
        // Reset the messages tab to a clean state
        document.getElementById('messages').innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Messages</h2>
            <div class="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl text-green-500">
                Message sent successfully. Use the Clients tab to contact another seller.
            </div>
        `;
    } catch (error) {
        console.error("Messaging Error:", error);
        showToast("Failed to send message: " + error.message, "error");
    }
}

function prepareAdminMessage(userId, userEmail) {
    // 1. Move the UI to the Messages tab
    switchTab('messages'); 

    // 2. Build the message interface inside the messages container
    const container = document.getElementById('messages');
    container.innerHTML = `
        <div class="max-w-2xl animate-fadeIn">
            <div class="flex items-center gap-4 mb-8">
                <button onclick="switchTab('clients')" class="text-zinc-500 hover:text-white transition-colors">← Back</button>
                <h2 class="text-3xl font-bold">Message Seller</h2>
            </div>

            <div class="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-2xl">
                <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Recipient</p>
                <p class="text-white font-mono mb-6">${userEmail}</p>

                <label class="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Message Body</label>
                <textarea id="admin-msg-content" 
                          class="w-full bg-zinc-800 border-none rounded-2xl p-4 text-white placeholder-zinc-600 focus:ring-2 focus:ring-red-600 min-h-[200px] outline-none transition-all"
                          placeholder="Type instructions or feedback for the seller..."></textarea>
                
                <button onclick="sendAdminMessageToUser('${userId}')" 
                        class="w-full mt-6 bg-white text-black font-black py-4 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                    SEND NOTIFICATION
                </button>
            </div>
        </div>
    `;
}

async function sendAdminMessageToUser(recipientId) {
    const text = document.getElementById('admin-msg-content').value.trim();
    
    if (!text) return showToast("Please type a message", "error");

    try {
        await db.collection("messages").add({
            senderId: "admin",
            recipientId: recipientId,
            content: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: "unread",
            type: "admin_alert"
        });

        showToast("Message sent to seller!", "success");
        logActivity("Sent Message", `To User: ${recipientId}`);

        // Reset the message tab view
        document.getElementById('messages').innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Messages</h2>
            <div class="p-10 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl text-center">
                <p class="text-zinc-500">Your message has been delivered successfully.</p>
            </div>`;
            
    } catch (e) {
        showToast("Failed to send", "error");
    }
}
