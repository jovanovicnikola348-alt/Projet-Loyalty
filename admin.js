import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, increment, collection, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// AJOUT : Importation de l'authentification pour la sécurité Admin
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

// --- CONFIGURATION CORRIGÉE ---
const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialisation de l'authentification

// Traduction
const translations = {
    fr: { subtitle: "Gestion Salon", search: "Chercher client...", add: "Point ajouté !", gift: "Cadeau !" },
    sr: { subtitle: "Upravljanje salonom", search: "Traži klijenta...", add: "Poen dodat !", gift: "Poklon !" }
};
const lang = navigator.language.startsWith('sr') ? 'sr' : 'fr';
document.getElementById('admin-subtitle').innerText = translations[lang].subtitle;
document.getElementById('user-search').placeholder = translations[lang].search;

let selectedUserId = null;
let allUsers = []; // Stockage local pour la recherche

// Fonction pour formater la date : "31 janvier à 20h36"
function getNiceDate() {
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    let d = new Date().toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'fr-FR', options);
    return d.replace(':', 'h').replace(',', ' à');
}

// --- CHARGER LA LISTE DES UTILISATEURS EN TEMPS RÉEL ---
onSnapshot(collection(db, "users"), (snapshot) => {
    allUsers = [];
    snapshot.forEach((doc) => {
        allUsers.push({ id: doc.id, ...doc.data() });
    });
    renderUserList(allUsers);
});

// Fonction pour afficher la liste (utilisée aussi pour le filtrage)
function renderUserList(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = "";
    
    users.forEach((user) => {
        const div = document.createElement('div');
        div.className = 'user-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>${user.email}</span>
                <span class="badge">${user.points}/5</span>
            </div>
        `;
        div.onclick = () => openUserDetails(user.id, user);
        userList.appendChild(div);
    });
}

// --- LOGIQUE DE RECHERCHE ---
document.getElementById('user-search').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = allUsers.filter(user => 
        user.email.toLowerCase().includes(searchTerm)
    );
    renderUserList(filteredUsers);
});

// --- OUVRIR LES DÉTAILS D'UN CLIENT ---
function openUserDetails(id, user) {
    selectedUserId = id;
    document.getElementById('modal-email').innerText = user.email;
    document.getElementById('modal-points').innerText = user.points;
    
    const historyDiv = document.getElementById('visit-history');
    // Historique au format : "31 janvier à 20h36"
    historyDiv.innerHTML = user.history ? [...user.history].reverse().map(h => `<div class="history-item">📅 ${h}</div>`).join('') : "Aucune visite";
    
    document.getElementById('user-modal').style.display = 'flex';
}

// --- AJOUTER / ENLEVER POINT & RESET RECOMPENSE ---
async function updatePoints(change) {
    if(!selectedUserId) return;
    const userRef = doc(db, "users", selectedUserId);
    
    if (change === "RESET") {
        await updateDoc(userRef, { points: 0 });
    } else {
        const updates = { points: increment(change) };
        if (change > 0) updates.history = arrayUnion(getNiceDate()); // Ajout de la date formatée
        await updateDoc(userRef, updates);
    }
    
    const newDoc = await getDoc(userRef);
    openUserDetails(selectedUserId, newDoc.data());
}

document.getElementById('add-point').onclick = () => updatePoints(1);
document.getElementById('remove-point').onclick = () => updatePoints(-1);
document.getElementById('use-reward').onclick = () => {
    if(confirm("Confirmer le reset des points à 0 ?")) updatePoints("RESET");
};
document.getElementById('close-modal').onclick = () => document.getElementById('user-modal').style.display = 'none';

// --- LOGIQUE SCANNER CORRIGÉE POUR MOBILE ---
const html5QrCode = new Html5Qrcode("reader");

function stopScanner() {
    if(html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('admin-main').style.display = 'block';
            document.getElementById('scanner-view').style.display = 'none';
        }).catch(() => {
            document.getElementById('admin-main').style.display = 'block';
            document.getElementById('scanner-view').style.display = 'none';
        });
    } else {
        document.getElementById('admin-main').style.display = 'block';
        document.getElementById('scanner-view').style.display = 'none';
    }
}
document.getElementById('close-scanner').onclick = stopScanner;

document.getElementById('open-scanner').onclick = () => {
    // SÉCURITÉ ADMIN : REMPLACE "TON_EMAIL_ADMIN@domaine.com" par ton VRAI email
    if (auth.currentUser && auth.currentUser.email !== "jovanovicnikola348.com") {
        alert("Accès refusé. Veuillez vous connecter avec le compte administrateur.");
        return;
    }

    document.getElementById('admin-main').style.display = 'none';
    document.getElementById('scanner-view').style.display = 'block';

    // Délai pour que l'interface ait le temps de s'ouvrir sur mobile
    setTimeout(() => {
        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (id) => {
            selectedUserId = id;
            updatePoints(1);
            alert(translations[lang].add);
            stopScanner();
        }).catch(err => {
            alert("Erreur Caméra: Assurez-vous d'être sur HTTPS et d'avoir autorisé l'accès.");
            stopScanner();
        });
    }, 500); // 500ms
};