import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0TZI_OpGJ5_-zlDY08KmYx4K9aodJRsU",
    authDomain: "project-loyalty-4a445.firebaseapp.com",
    projectId: "project-loyalty-4a445",
    storageBucket: "project-loyalty-4a445.firebasestorage.app",
    messagingSenderId: "645134286018",
    appId: "1:645134286018:web:5bf96b80d24393a2bd8f5b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const langData = {
    fr: { title: "Connexion", google: "Continuer avec Google", loyalty: "Ma Fidélité", gift: "🎁 Coupe offerte !", logout: "Déconnexion", qr: "Présentez ce code au salon :", next: "Prochain RDV", navHome: "Accueil", navBooking: "Rendez-vous", navProfile: "Profil", navHistory: "Visites", profileTitle: "Mon Profil", langLabel: "Changer la langue :", phEmail: "Email", phPassword: "Mot de passe", phUsername: "Nom/Pseudo", login: "Se connecter", signup: "Inscription", signupToggle: "Vous n'avez pas de compte ? S'inscrire", historyTitle: "Historique des visites", noHistory: "Aucune visite enregistrée.", emailInvalid: "L'adresse email n'est pas valide.", emailUsed: "Cet email est déjà utilisé.", passTooWeak: "Mot de passe trop faible (min 6)", visitOn: "Visite du", settingsTitle: "Paramètres du compte", displayNameLabel: "Nom affiché", emailLabel: "Email", saveProfile: "Enregistrer", profileUpdated: "Profil mis à jour.", nameRequired: "Le nom est requis." },
    sr: { title: "Prijava", google: "Nastavi sa Google-om", loyalty: "Moja lojalnost", gift: "🎁 Besplatno šišanje !", logout: "Odjavi se", qr: "Pokažite ovaj kod u salonu :", next: "Sledeći termin", navHome: "Početna", navBooking: "Termini", navProfile: "Profil", navHistory: "Posete", profileTitle: "Moj Profil", langLabel: "Promeni jezik :", phEmail: "Email", phPassword: "Lozinka", phUsername: "Ime/Nadimak", login: "Prijavi se", signup: "Registracija", signupToggle: "Nemate nalog? Registracija", historyTitle: "Istorija poseta", noHistory: "Nema zabeleženih poseta.", emailInvalid: "Neispravna adresa e-pošte.", emailUsed: "Ovaj e-mail je već u upotrebi.", passTooWeak: "Lozinka je preslaba (min 6)", visitOn: "Poseta dana", settingsTitle: "Podešavanja naloga", displayNameLabel: "Prikazano ime", emailLabel: "Email", saveProfile: "Sačuvaj", profileUpdated: "Profil ažuriran.", nameRequired: "Ime je obavezno." },
    en: { title: "Login", google: "Continue with Google", loyalty: "My Loyalty", gift: "🎁 Free Haircut !", logout: "Logout", qr: "Show this code at the salon:", next: "Next Appointment", navHome: "Home", navBooking: "Booking", navProfile: "Profile", navHistory: "History", profileTitle: "My Profile", langLabel: "Change Language :", phEmail: "Email", phPassword: "Password", phUsername: "Name/Nickname", login: "Login", signup: "Signup", signupToggle: "Don't have an account? Sign up", historyTitle: "Visit History", noHistory: "No recorded visits.", emailInvalid: "Invalid email address.", emailUsed: "This email is already in use.", passTooWeak: "Password too weak (min 6)", visitOn: "Visit on", settingsTitle: "Account settings", displayNameLabel: "Display name", emailLabel: "Email", saveProfile: "Save", profileUpdated: "Profile updated.", nameRequired: "Name is required." }
};

function updateLanguage(lang) {
    const t = langData[lang];
    if (!t) return;
    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

    safeSetText('txt-title', t.title); safeSetText('txt-google', t.google); safeSetText('txt-loyalty', t.loyalty);
    safeSetText('txt-show-qr', t.qr); safeSetText('txt-profile-title', t.profileTitle);
    safeSetText('txt-lang-label', t.langLabel); safeSetText('nav-home', t.navHome);
    safeSetText('nav-booking', t.navBooking); safeSetText('nav-profile', t.navProfile);
    safeSetText('nav-history', t.navHistory); safeSetText('history-title', t.historyTitle);
    safeSetText('txt-next-apt', t.next);
    if (t.settingsTitle) safeSetText('txt-settings-title', t.settingsTitle);
    if (t.displayNameLabel) safeSetText('txt-display-name-label', t.displayNameLabel);
    if (t.emailLabel) safeSetText('txt-email-label', t.emailLabel);
    if (t.saveProfile) { const sp = document.getElementById('btn-save-profile'); if (sp) sp.innerText = t.saveProfile; }
    safeSetPlaceholder('email', t.phEmail); safeSetPlaceholder('password', t.phPassword); safeSetPlaceholder('username', t.phUsername);

    document.getElementById('btn-login').innerText = t.login;
    document.getElementById('btn-signup').innerText = t.signup;
    document.getElementById('btn-logout').innerText = t.logout;
    document.getElementById('toggle-signup').innerText = t.signupToggle;

    localStorage.setItem('userLang', lang);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('client-section').style.display = 'flex'; 

        const homeTab = document.getElementById('tab-home');
        homeTab.style.display = 'flex';
        homeTab.style.opacity = '1'; 
        
        const displayName = user.displayName || user.email.split('@')[0];
        const profileNameInput = document.getElementById('profile-display-name');
        const emailDisplay = document.getElementById('user-email-display');
        if (profileNameInput) profileNameInput.value = displayName;
        if (emailDisplay) emailDisplay.innerText = user.email || '';

        onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const currentLang = localStorage.getItem('userLang') || 'sr';
                if (document.getElementById('profile-display-name') && data.displayName !== undefined)
                    document.getElementById('profile-display-name').value = data.displayName;
                
                document.getElementById('points-display').innerText = `${data.points} / 5`;
                if(document.getElementById('progress-bar')) document.getElementById('progress-bar').style.width = (data.points / 5 * 100) + "%";
                
                const gift = document.getElementById('gift-msg');
                gift.style.display = data.points >= 5 ? 'block' : 'none';
                gift.innerText = langData[currentLang].gift;

                document.getElementById('qrcode').innerHTML = "";
                new QRCode(document.getElementById('qrcode'), { text: user.uid, width: 140, height: 140, colorDark: '#1A1A1A' });

                const histDiv = document.getElementById('visit-history-client');
                const history = data.history || [];
                if (histDiv) {
                    if (history.length === 0) {
                        histDiv.innerHTML = `<p style="text-align:center; color: var(--secondary);">${langData[currentLang].noHistory}</p>`;
                    } else {
                        histDiv.innerHTML = history.slice().reverse().map(date => 
                            `<div class="history-item-client"><span>${langData[currentLang].visitOn}</span>${date}</div>`
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

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('userLang') || 'sr';
    updateLanguage(savedLang);

    const lSelect = document.getElementById('lang-select');
    const pLSelect = document.getElementById('lang-select-profile');
    if(lSelect) lSelect.value = savedLang;
    if(pLSelect) pLSelect.value = savedLang;

    if(lSelect) lSelect.onchange = (e) => { updateLanguage(e.target.value); if(pLSelect) pLSelect.value = e.target.value; };
    if(pLSelect) pLSelect.onchange = (e) => { updateLanguage(e.target.value); if(lSelect) lSelect.value = e.target.value; };

    const usernameInput = document.getElementById('username');
    const toggleLink = document.getElementById('toggle-signup');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    let isSigningUp = false;

    if(toggleLink) toggleLink.onclick = () => {
        isSigningUp = !isSigningUp;
        const currentLang = localStorage.getItem('userLang') || 'sr';
        if(isSigningUp) {
            usernameInput.style.display = 'block';
            btnLogin.style.display = 'none';
            btnSignup.style.display = 'block';
        } else {
            usernameInput.style.display = 'none';
            btnSignup.style.display = 'none';
            btnLogin.style.display = 'block';
        }
        updateLanguage(currentLang); 
    };
});

document.getElementById('btn-google').onclick = async () => {
    const res = await signInWithPopup(auth, new GoogleAuthProvider());
    const userRef = doc(db, "users", res.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
        setDoc(userRef, { email: res.user.email, displayName: res.user.displayName, points: 0, history: [] });
    } else {
        updateDoc(userRef, { email: res.user.email, displayName: res.user.displayName });
    }
};
document.getElementById('btn-login').onclick = () => signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
document.getElementById('btn-signup').onclick = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    if (!username) { alert("Nom/Pseudo requis"); return; }
    createUserWithEmailAndPassword(auth, e, p).then(res => updateProfile(res.user, { displayName: username })).then(() => {
        setDoc(doc(db, "users", auth.currentUser.uid), { email: auth.currentUser.email, displayName: username, points: 0, history: [] });
    }).catch(error => {
        const currentLang = localStorage.getItem('userLang') || 'sr';
        const emailErr = document.getElementById('email-error');
        const passErr = document.getElementById('password-error');
        if(emailErr) emailErr.style.display = 'none'; 
        if(passErr) passErr.style.display = 'none';
        if (error.code === "auth/weak-password" && passErr) { passErr.innerText = langData[currentLang].passTooWeak; passErr.style.display = 'block'; }
        else if (error.code === "auth/email-already-in-use" && emailErr) { emailErr.innerText = langData[currentLang].emailUsed; emailErr.style.display = 'block'; }
        else if (error.code === "auth/invalid-email" && emailErr) { emailErr.innerText = langData[currentLang].emailInvalid; emailErr.style.display = 'block'; }
    });
};
document.getElementById('btn-logout').onclick = () => signOut(auth);

document.getElementById('btn-save-profile').onclick = async () => {
    const input = document.getElementById('profile-display-name');
    const name = (input && input.value) ? input.value.trim() : '';
    const currentLang = localStorage.getItem('userLang') || 'sr';
    if (!name) {
        alert(langData[currentLang].nameRequired);
        return;
    }
    const user = auth.currentUser;
    if (!user) return;
    try {
        await updateProfile(user, { displayName: name });
        await updateDoc(doc(db, "users", user.uid), { displayName: name });
        alert(langData[currentLang].profileUpdated);
    } catch (err) {
        console.error(err);
        alert(err.message || 'Erreur');
    }
};