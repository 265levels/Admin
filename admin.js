// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCPUBkJzJhLUVD0qXMg2_tyvsZ9ZxtfWuc",
  authDomain: "levels-ecommerce.firebaseapp.com",
  projectId: "levels-ecommerce",
  storageBucket: "levels-ecommerce.appspot.com", // corrected bucket
  messagingSenderId: "637669858543",
  appId: "1:637669858543:web:9f61dafba8842416f58f1a",
  measurementId: "G-RQJSBPTWC9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- AUTH CONFIG & ROLES ---
async function login() {
  console.log("Attempting login...");
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("Detailed Auth Error:", error);
    showToast("Firebase Auth Error: " + error.message, "error");
  }
}

function logout() {
  auth.signOut().then(() => {
    showToast("Logged out successfully", "info");
    location.reload();
  });
}

// Listen for auth state
auth.onAuthStateChanged(async (user) => {
  const overlay = document.getElementById('login-overlay');
  const errorMsg = document.getElementById('login-error');
  const userDisplay = document.getElementById('current-user');

  if (user) {
    // Check Firestore "admins" collection for role-based access
    const adminDoc = await db.collection("admins").doc(user.uid).get();
    if (adminDoc.exists) {
      overlay.classList.add('hidden');
      console.log("Authorized as:", user.email);
      if (userDisplay) userDisplay.innerText = user.displayName || user.email;

      logActivity("Login", user.email);
      startDashboard(adminDoc.data().role);
    } else {
      await auth.signOut();
      errorMsg.classList.remove('hidden');
      errorMsg.innerText = "Access Denied: " + user.email + " is not authorized.";
    }
  } else {
    overlay.classList.remove('hidden');
  }
});

// --- DASHBOARD LOGIC ---
function startDashboard(role) {
  // Role-based tab visibility
  if (role !== "superadmin") {
    document.querySelector("[onclick*='transactions']").style.display = "none";
  }

  loadClientsRealtime();
  loadTransactionsRealtime();
  loadImagesRealtime();
  updateOverviewStats();
}

// --- NAVIGATION ---
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");
}

function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('hidden');
  sidebar.classList.toggle('flex');
}

function switchTabMobile(tabId) {
  switchTab(tabId);
  if (window.innerWidth < 1024) toggleMenu();
}

// --- OVERVIEW MONITORS ---
function updateOverviewStats() {
  db.collection("products").where("status", "==", "pending")
    .onSnapshot(snap => {
      document.getElementById('counter-pending-images').innerText = snap.size;
    });

  db.collection("transactions").where("status", "==", "pending")
    .onSnapshot(snap => {
      document.getElementById('counter-queue-transactions').innerText = snap.size;
    });

  db.collection("transactions").where("status", "==", "failed")
    .onSnapshot(snap => {
      document.getElementById('counter-failed-transactions').innerText = snap.size;
    });

  db.collection("users").onSnapshot(snap => {
    document.getElementById('total-users').innerText = snap.size;
  });
}

// --- CLIENTS ---
async function searchClients() {
  const type = document.getElementById("search-type").value;
  const value = document.getElementById("client-search-input").value.trim();
  const container = document.getElementById("clients-list");

  if (!value) return showToast("Please enter a search term", "error");
  container.innerHTML = "<p class='text-zinc-500'>Searching...</p>";

  try {
    let query;
    if (type === "transactionId") {
      const transSnap = await db.collection("transactions").where("transactionId", "==", value).get();
      if (transSnap.empty) {
        container.innerHTML = "<p class='text-red-400'>No transaction found.</p>";
        return;
      }
      const buyerEmail = transSnap.docs[0].data().buyerEmail;
      query = db.collection("users").where("email", "==", buyerEmail);
    } else {
      query = db.collection("users").where(type, "==", value);
    }

    const snap = await query.get();
    renderClients(snap);
  } catch (e) {
    console.error(e);
    container.innerHTML = "<p class='text-red-500'>Error executing search.</p>";
  }
}

function renderClients(snap) {
  const container = document.getElementById("clients-list");
  if (snap.empty) {
    container.innerHTML = "<p class='p-4 text-zinc-500'>No clients found.</p>";
    return;
  }
  container.innerHTML = "";
  snap.forEach(doc => {
    const u = doc.data();
    container.innerHTML += `
      <div class="card flex justify-between items-center border border-zinc-800">
        <div>
          <p class="font-bold text-lg">${u.name || 'Anonymous'}</p>
          <div class="flex gap-4 text-sm text-zinc-400">
            <span>📧 ${u.email || 'N/A'}</span>
            <span>📞 ${u.phone || 'N/A'}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="blockUser('${doc.id}')" class="btn-outline text-red-500 border-red-900 hover:bg-red-950">Block</button>
        </div>
      </div>`;
  });
}

function loadClientsRealtime() {
  db.collection("users").limit(20).onSnapshot(renderClients);
}

// --- TRANSACTIONS ---
function renderTransactions(snap) {
  const container = document.getElementById("transactions-list");
  container.innerHTML = "";
  snap.forEach(doc => {
    const t = doc.data();
    container.innerHTML += `
      <div class="card flex justify-between items-center border-l-4 ${t.status === 'paid' ? 'border-green-600' : 'border-zinc-700'}">
        <div>
          <p class="font-bold">${t.buyerName || 'Buyer'}</p>
          <p class="text-xs text-zinc-500">ID: ${t.transactionId || doc.id}</p>
        </div>
        <span class="text-green-500 font-bold">MWK ${new Intl.NumberFormat('en-MW').format(t.amount || 0)}</span>
      </div>`;
  });
}

function loadTransactionsRealtime() {
  db.collection("transactions").orderBy("createdAt", "desc").limit(15).onSnapshot(renderTransactions);
}

// --- IMAGE APPROVAL ---
function renderImages(snap) {
  const container = document.getElementById("image-queue");
  container.innerHTML = snap.empty ? "<p class='text-zinc-500'>All caught up!</p>" : "";
  snap.forEach(doc => {
    const p = doc.data();
    container.innerHTML += `
      <div class="card border border-zinc-800">
        <p class="mb-3 font-bold text-lg">${p.title}</p>
        <div class="flex flex-wrap gap-2 mb-4">
          ${p.images?.map(img => <img src="${img}" class="w-24 h-24 object-cover rounded-lg"/>).join("")}
        </div>
        <div class="flex gap-3">
          <button onclick="updateProductStatus('${doc.id}','approved')" class="flex-1 btn-outline text-green-500 border-green-900 hover:bg-green-950">Approve</button>
          <button onclick="updateProductStatus('${doc.id}','rejected')" class="flex-1 btn-outline text-red-500 border-red-900 hover:bg-red-950">Reject</button>
        </div>
      </div>`;
  });
}

function loadImagesRealtime() {
  db.collection("products").where("status", "==", "pending").onSnapshot(renderImages);
}

async function updateProductStatus(id, status) {
  await db.collection("products").doc(id).update({ status });
  logActivity("Product " + status, id);
  showToast("Product " + status, "success");
}

// --- ACTIONS ---
async function blockUser(id) {
  if(!confirm("Block this user?")) return;
  await db.collection("users").doc(id).update({ status: 'blocked' });
  logActivity("Block User", id);
