import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, updateDoc, increment, collection, onSnapshot, arrayUnion, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

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

// Les traductions et la fonction de date restent ici (elles n'ont pas bougé)
// ... (omission du code non modifié pour la clarté) ...

// ** LE CODE EST ENVELOPPÉ ICI POUR RÉGLER L'ERREUR 'NULL IS NOT AN OBJECT' **
document.addEventListener('DOMContentLoaded', () => {
    
    // Logique de l'admin est maintenant ici...

    // Logique de l'admin...
    
    // Fonctionnalité : Supprimer l'utilisateur
    document.getElementById('delete-user').onclick = async () => {
        if (!selectedUserId) return;
        if (confirm("ATTENTION: Voulez-vous VRAIMENT supprimer cet utilisateur ? Cette action est irréversible.")) {
            try {
                // Suppression dans Firestore
                await deleteDoc(doc(db, "users", selectedUserId));
                
                // IMPORTANT : Pour supprimer l'utilisateur de l'Auth (mot de passe/email),
                // il faut le faire depuis un serveur sécurisé. Ce code ne fera que
                // supprimer la carte de fidélité, mais le compte de connexion restera.
                
                // On pourrait ajouter ici un appel à une Netlify Function pour la suppression
                // complète, mais pour l'instant, c'est la meilleure solution simple.
                
                alert("Utilisateur supprimé (carte de fidélité retirée).");
                document.getElementById('user-modal').style.display = 'none';
            } catch (error) {
                console.error("Erreur suppression:", error);
                alert("Erreur lors de la suppression du client.");
            }
        }
    };

    // Les écouteurs d'événements (onclick, oninput) sont ici...

    // Les fonctions qui dépendent du HTML sont maintenant ici...
    
    // ...

    // Fonction pour afficher la liste (utilisée aussi pour le filtrage)
    function renderUserList(users) {
        // ... (ton code de renderUserList) ...
    }

    // Fonction pour ouvrir les détails d'un client
    function openUserDetails(id, user) {
        // ... (ton code de openUserDetails) ...
        // AJOUT : Lien vers la nouvelle option dans le modal
        document.getElementById('delete-user-btn').style.display = 'block';
    }

    // Fonction pour mettre à jour les points (avec Reset à 0 automatique)
    async function updatePoints(change) {
        // ... (ton code de updatePoints) ...
        
        // AJOUT : LOGIQUE DE RESET AUTOMATIQUE APRES 5 POINTS
        if (newDoc.data().points >= 5 && change > 0) {
            if (confirm("Le client a atteint 5 points. Le cadeau a-t-il été donné ? (OK pour Reset à 0)")) {
                 await updateDoc(userRef, { points: 0 });
                 alert("Points réinitialisés à 0.");
            }
        }
    }

    // Le code du Scanner est ici...
    document.getElementById('open-scanner').onclick = () => {
        // ... (ton code de scanner) ...
    };
    
    // ... et tous les autres "onclick" sont ici
});