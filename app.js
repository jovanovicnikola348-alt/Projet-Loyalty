import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* ... VOS INFOS ... */ };
const SETMORE_REFRESH_TOKEN = "r1/2557ad16dcZ1aOBR0sCas6W2Z7MtRXgk25KLBL9cDIMW7";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const langData = {
    fr: { title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", next: "Prochain RDV", navHome: "Accueil", navBooking: "Rendez-vous", navProfile: "Profil", navHistory: "Visites", profileTitle: "Mon Profil", langLabel: "Changer la langue :", phEmail: "Email", phPassword: "Mot de passe", phUsername: "Nom/Pseudo", login: "Se connecter", signup: "Inscription", signupToggle: "Vous n'avez pas de compte ? S'inscrire", historyTitle: "Historique des visites", noHistory: "Aucune visite enregistrée." },
    sr: { title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja lojalnost", gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil", navHistory: "Posete", profileTitle: "Moj Profil", langLabel: "Promeni jezik :", phEmail: "Email", phPassword: "Lozinka", phUsername: "Ime/Nadimak", login: "Prijavi se", signup: "Registracija", signupToggle: "Nemate nalog? Registracija", historyTitle: "Istorija poseta", noHistory: "Nema zabeleženih poseta." },
    en: { title: "Login", google: "Continue with Google", loyalty: "My Loyalty", gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile", navHistory: "History", profileTitle: "My Profile", langLabel: "Change Language :", phEmail: "Email", phPassword: "Password", phUsername: "Name/Nickname", login: "Login", signup: "Signup", signupToggle: "Don't have an account? Sign up", historyTitle: "Visit History", noHistory: "No recorded visits." }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;

    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

    safeSetText('txt-title', t.title); safeSetText('txt-google', t.google); safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-logout', t.logout); safeSetText('btn-logout', t.logout); safeSetText('txt-show-qr', t.qr);
    safeSetText('txt-profile-title', t.profileTitle); safeSetText('txt-lang-label', t.langLabel);
    safeSetText('nav-home', t.navHome); safeSetText('nav-booking', t.navBooking);
    safeSetText('nav-profile', t.navProfile); safeSetText('nav-history', t.navHistory);
    safeSetText('history-title', t.historyTitle);
    safeSetText('btn-login', t.login); safeSetText('btn-signup', t.signup); safeSetText('toggle-signup', t.signupToggle);
    safeSetText('txt-next-apt', t.next);

    safeSetPlaceholder('email', t.phEmail); safeSetPlaceholder('password', t.phPassword); safeSetPlaceholder('username', t.phUsername);

    localStorage.setItem('userLang', lang);
}

// --- 2. LOGIQUE SETMORE (Désactivé) ---
async function updateAppointmentUI(email) {
    const cardHome = document.getElementById('appointment-card');
    const cardProfile = document.getElementById('appointment-card-profile');
    if (cardHome) cardHome.style.display = 'none';
    if (cardProfile) cardProfile.style.display = 'none';
}

// --- 3. INITIALISATION & LOGIQUE INSCRIPTION/LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'fr';
    updateLanguage(savedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };

    // LOGIQUE DE BASCULE LOGIN/SIGNUP (Nettoyée)
    const usernameInput = document.getElementById('username');
    const toggleLink = document.getElementById('toggle-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    
    let isSigningUp = false;

    if(toggleLink) toggleLink.onclick = () => {
        isSigningUp = !isSigningUp;
        if(isSigningUp) {
            usernameInput.style.display = 'block';
            btnLogin.style.display = 'none';
            btnSignup.style.display = 'block';
        } else {
            usernameInput.style.display = 'none';
            btnSignup.style.display = 'none';
            btnLogin.style.display = 'block';
        }
        updateLanguage(localStorage.getItem('userLang') || 'fr');
    };
    
    if(usernameInput) usernameInput.style.display = 'none';
    if(btnSignup) btnSignup.style.display = 'none';
});

// --- 4. AUTH & TEMPS RÉEL ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('client-section').style.display = 'block';
        
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('user-email-display').innerText = displayName;

        updateAppointmentUI(user.email);
        
        window.addEventListener('refreshAppointments', () => { updateAppointmentUI(user.email); });

        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const currentLang = localStorage.getItem('userLang') || 'fr';
                
                // Points
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                const progress = document.getElementById('progress-bar');
                if(progress) progress.style.width = (data.points / 5 * 100) + "%";
                document.getElementById('gift-msg').style.display = data.points >= 5 ? 'block' : 'none';
                document.getElementById('gift-msg').innerText = langData[currentLang].gift;

                // QR Code
                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140 });

                // HISTORIQUE CLIENT
                const histDiv = document.getElementById('visit-history-client');
                const history = data.history || [];
                if (histDiv) {
                    if (history.length === 0) {
                        histDiv.innerHTML = `<p style="text-align:center; color: var(--secondary);">${langData[currentLang].noHistory}</p>`;
                    } else {
                        histDiv.innerHTML = history.slice().reverse().map(date => // .slice() pour ne pas modifier l'original
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

// --- 5. Boutons Auth (Mis à jour pour pseudo/inscription) ---
document.getElementById('btn-google').onclick = () => {
    signInWithPopup(auth, new GoogleAuthProvider()).then(res => {
        setDoc(doc(db, "users", res.user.uid), { email: res.user.email, displayName: res.user.displayName, points: 0, history: [] }, { merge: true });
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
    
    if (!username) {
        alert("Veuillez entrer un nom/pseudo pour vous inscrire.");
        return;
    }
    
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