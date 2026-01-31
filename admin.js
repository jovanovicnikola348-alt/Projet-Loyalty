import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment, collection, onSnapshot, arrayUnion, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

// --- CONFIGURATION ---
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
const auth = getAuth(app); 

let selectedUserId = null;
let allUsers = []; 
const lang = navigator.language.startsWith('sr') ? 'sr' : 'fr';
const translations = {
    fr: { subtitle: "Gestion Salon", search: "Chercher client...", add: "Point ajouté !", gift: "Cadeau !" },
    sr: { subtitle: "Upravljanje salonom", search: "Traži klijenta...", add: "Poen dodat !", gift: "Poklon !" }
};

// Fonction pour formater la date : "31 janvier à 20h36"
function getNiceDate() {
    const options = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    let d = new Date().toLocaleDateString(lang === 'sr' ? 'sr-RS' : 'fr-FR', options);
    return d.replace(':', 'h').replace(',', ' à');
}


// --- DÉMARRAGE SÉCURISÉ DU CODE (Règle le bug "Cannot set properties of null") ---
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('admin-subtitle').innerText = translations[lang].subtitle;
    document.getElementById('user-search').placeholder = translations[lang].search;

    // --- CHARGER LA LISTE DES UTILISATEURS EN TEMPS RÉEL ---
    onSnapshot(collection(db, "users"), (snapshot) => {
        allUsers = [];
        snapshot.forEach((doc) => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        renderUserList(allUsers);
    });

    // --- FONCTIONS INTERACTIVES (Elles utilisent les éléments HTML) ---

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

    function openUserDetails(id, user) {
        selectedUserId = id;
        document.getElementById('modal-email').innerText = user.email;
        document.getElementById('modal-points').innerText = user.points;
        
        const historyDiv = document.getElementById('visit-history');
        historyDiv.innerHTML = user.history ? [...user.history].reverse().map(h => `<div class="history-item">📅 ${h}</div>`).join('') : "Aucune visite";
        
        document.getElementById('user-modal').style.display = 'flex';
    }

    async function updatePoints(change) {
        if(!selectedUserId) return;
        const userRef = doc(db, "users", selectedUserId);
        const userSnap = await getDoc(userRef);
        
        if (change === "RESET") {
            await updateDoc(userRef, { points: 0 });
        } else {
            const updates = { points: increment(change) };
            if (change > 0) updates.history = arrayUnion(getNiceDate());
            await updateDoc(userRef, updates);
        }
        
        const newDoc = await getDoc(userRef);
        openUserDetails(selectedUserId, newDoc.data());
        
        // LOGIQUE : Reset Automatique après 5 points
        if (newDoc.data().points >= 5 && change > 0) {
            if (confirm("Le client a atteint 5 points. Le cadeau a-t-il été donné ? (OK pour Reset à 0)")) {
                 await updateDoc(userRef, { points: 0 });
                 alert("Points réinitialisés à 0.");
            }
        }
    }
    
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

    // --- ÉCOUTEURS D'ÉVÉNEMENTS (DANS LE DOMContentLoaded) ---

    // Réinitialisation & Suppression
    document.getElementById('add-point').onclick = () => updatePoints(1);
    document.getElementById('remove-point').onclick = () => updatePoints(-1);
    document.getElementById('use-reward').onclick = () => {
        if(confirm("Confirmer le reset des points à 0 ?")) updatePoints("RESET");
    };
    document.getElementById('close-modal').onclick = () => document.getElementById('user-modal').style.display = 'none';

    document.getElementById('delete-user-btn').onclick = async () => {
        if (!selectedUserId) return;
        if (confirm("ATTENTION: Voulez-vous VRAIMENT supprimer cet utilisateur ? Cette action est irréversible.")) {
            try {
                await deleteDoc(doc(db, "users", selectedUserId));
                alert("Utilisateur supprimé (carte de fidélité retirée).");
                document.getElementById('user-modal').style.display = 'none';
            } catch (error) {
                console.error("Erreur suppression:", error);
                alert("Erreur lors de la suppression du client.");
            }
        }
    };
    
    // Logique de recherche
    document.getElementById('user-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm)
        );
        renderUserList(filteredUsers);
    });

    // Logique Scanner (Corrigée pour mobile)
    const html5QrCode = new Html5Qrcode("reader");
    document.getElementById('close-scanner').onclick = stopScanner;
    
    document.getElementById('open-scanner').onclick = () => {
        // SÉCURITÉ ADMIN : REMPLACE "TON_EMAIL_ADMIN@domaine.com" par ton VRAI email
        if (auth.currentUser && auth.currentUser.email !== "TON_EMAIL_ADMIN@domaine.com") {
            alert("Accès refusé. Veuillez vous connecter avec le compte administrateur.");
            return;
        }

        document.getElementById('admin-main').style.display = 'none';
        document.getElementById('scanner-view').style.display = 'block';

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
        }, 500);
    };

});