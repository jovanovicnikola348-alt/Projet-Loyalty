import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};
const SETMORE_REFRESH_TOKEN = "r1/2557ad16dcZ1aOBR0sCas6W2Z7MtRXgk25KLBL9cDIMW7"; // Gardé pour l'exemple

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 1. LANGUES COMPLÈTES (Pas de changement) ---
const langData = {
    fr: { 
        title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", 
        gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", 
        next: "Prochain RDV", navHome: "Accueil", navBooking: "Rendez-vous", navProfile: "Profil",
        navHistory: "Visites", profileTitle: "Mon Profil", langLabel: "Changer la langue :",
        phEmail: "Email", phPassword: "Mot de passe", phUsername: "Nom/Pseudo",
        login: "Se connecter", signup: "Inscription", signupToggle: "Vous n'avez pas de compte ? S'inscrire",
        historyTitle: "Historique des visites", noHistory: "Aucune visite enregistrée."
    },
    sr: { 
        title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja lojalnost", 
        gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", 
        next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil",
        navHistory: "Posete", profileTitle: "Moj Profil", langLabel: "Promeni jezik :",
        phEmail: "Email", phPassword: "Lozinka", phUsername: "Ime/Nadimak",
        login: "Prijavi se", signup: "Registracija", signupToggle: "Nemate nalog? Registracija",
        historyTitle: "Istorija poseta", noHistory: "Nema zabeleženih poseta."
    },
    en: { 
        title: "Login", google: "Continue with Google", loyalty: "My Loyalty", 
        gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", 
        next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile",
        navHistory: "History", profileTitle: "My Profile", langLabel: "Change Language :",
        phEmail: "Email", phPassword: "Password", phUsername: "Name/Nickname",
        login: "Login", signup: "Signup", signupToggle: "Don't have an account? Sign up",
        historyTitle: "Visit History", noHistory: "No recorded visits."
    }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;

    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };
    const safeSetDataText = (id, text) => { const el = document.getElementById(id); if (el) el.dataset.text = text; }; // Pour les boutons

    // Traduction des textes
    safeSetText('txt-title', t.title);
    safeSetText('txt-google', t.google);
    safeSetText('txt-loyalty', t.loyalty);
    safeSetText('btn-logout', t.logout);
    safeSetText('txt-show-qr', t.qr);
    safeSetText('txt-profile-title', t.profileTitle);
    safeSetText('txt-lang-label', t.langLabel);
    safeSetText('nav-home', t.navHome);
    safeSetText('nav-booking', t.navBooking);
    safeSetText('nav-profile', t.navProfile);
    safeSetText('nav-history', t.navHistory);
    safeSetText('history-title', t.historyTitle);
    safeSetText('toggle-signup', t.signupToggle);
    
    // Traduction des boutons via data-text
    safeSetDataText('btn-login', t.login);
    safeSetDataText('btn-signup', t.signup);
    safeSetDataText('btn-logout', t.logout);

    // Traduction des placeholders
    safeSetPlaceholder('email', t.phEmail);
    safeSetPlaceholder('password', t.phPassword);
    safeSetPlaceholder('username', t.phUsername);
    
    const nextApt = document.getElementById('txt-next-apt');
    if (nextApt) nextApt.innerText = t.next;

    localStorage.setItem('userLang', lang);
}

// --- 2. LOGIQUE SETMORE (Désactivé) ---
async function updateAppointmentUI(email) {
    const cardHome = document.getElementById('appointment-card');
    if (cardHome) cardHome.style.display = 'none';
}

// --- 3. INITIALISATION & LOGIQUE INSCRIPTION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'fr';
    updateLanguage(savedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    
    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };

    // Logique pour basculer entre Login et Inscription
    const usernameInput = document.getElementById('username');
    const toggleLink = document.getElementById('toggle-signup');
    let isSigningUp = false;

    if(toggleLink) toggleLink.onclick = () => {
        isSigningUp = !isSigningUp;
        const currentLang = localStorage.getItem('userLang') || 'fr';
        if(isSigningUp) {
            usernameInput.classList.remove('hidden-input'); // Rendre visible
            toggleLink.innerText = langData[currentLang].login;
            document.getElementById('btn-login').classList.add('hidden-input');
            document.getElementById('btn-signup').classList.remove('hidden-input');
        } else {
            usernameInput.classList.add('hidden-input'); // Rendre invisible
            toggleLink.innerText = langData[currentLang].signupToggle;
            document.getElementById('btn-login').classList.remove('hidden-input');
            document.getElementById('btn-signup').classList.add('hidden-input');
        }
    };
    
    // Au démarrage, on cache le champ username et le bouton inscription
    if(usernameInput) usernameInput.classList.add('hidden-input');
    if(document.getElementById('btn-signup')) document.getElementById('btn-signup').classList.add('hidden-input');
});

// --- 4. AUTH & TEMPS RÉEL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('client-section').style.display = 'flex'; // Utiliser flex pour l'alignement
        
        // Affichage du nom si disponible
        const displayName = user.displayName || user.email.split('@')[0];
        const userEmailDisplay = document.getElementById('user-email-display');
        userEmailDisplay.innerText = displayName;
        userEmailDisplay.classList.add('gold-text'); // Ajout du style Gold

        // Masquer le RDV
        updateAppointmentUI(user.email);
        
        // Points, QR Code & HISTORIQUE
        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const currentLang = localStorage.getItem('userLang') || 'fr';
                
                // Points
                // Mise à jour de l'ID pour le nouveau design
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                document.getElementById('points-display').classList.add('gold-text'); // Ajout du style Gold
                document.getElementById('progress-bar').style.width = (data.points / 5 * 100) + "%";
                document.getElementById('gift-msg').style.display = data.points >= 5 ? 'block' : 'none';
                document.getElementById('gift-msg').innerText = langData[currentLang].gift;

                // QR Code
                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140, colorDark: '#1A1A1A' }); // Couleur QR code

                // HISTORIQUE CLIENT
                const histDiv = document.getElementById('visit-history-client');
                const history = data.history || [];
                if (histDiv) {
                    if (history.length === 0) {
                        histDiv.innerHTML = `<p style="text-align:center; color: hsl(215 20% 65%);">${langData[currentLang].noHistory}</p>`;
                    } else {
                        histDiv.innerHTML = history.reverse().map(date => 
                            `<div class="history-item-client"><span>Visite du</span>${date}</div>`
                        ).join('');
                    }
                }
            }
        });
    } else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('client-section').style.display = 'none';
    }
});

// --- 5. Boutons Auth (Mis à jour pour le pseudo) ---
document.getElementById('btn-google').onclick = () => {
    signInWithPopup(auth, new GoogleAuthProvider()).then(res => {
        setDoc(doc(db, "users", res.user.uid), { email: res.user.email, points: 0, history: [] }, { merge: true });
    });
};

document.getElementById('btn-login').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p);
};

document.getElementById('btn-signup').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    
    createUserWithEmailAndPassword(auth, e, p)
        .then(res => {
            return updateProfile(res.user, { displayName: username });
        })
        .then(() => {
            setDoc(doc(db, "users", auth.currentUser.uid), { 
                email: auth.currentUser.email, 
                displayName: username,
                points: 0, 
                history: [] 
            });
        })
        .catch(error => {
            alert("Erreur Inscription: " + error.message);
        });
};

document.getElementById('btn-logout').onclick = () => signOut(auth);