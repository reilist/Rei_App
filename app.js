// --- CONFIGURAZIONE CHIAVI DI ACCESSO SUPABASE ---
const SUPABASE_URL = "https://jmelxmgxmmaiqcovbvmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_kMyZYDEYOYZEgSgaiciCuw_C3XjLCDd";
let supabaseClient = null;

const ui = {
    currentDB: 'magazzino_studio.csv',
    selectedItems: [],
    favorites: JSON.parse(localStorage.getItem('rei_favorites')) || [],
    isUnlocked: false,
    isStarFilterActive: false,

    showSection(id) {
        // Nasconde tutte le sezioni
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        
        // Trova e mostra la sezione richiesta
        const target = document.getElementById(id + '-section');
        if (target) {
            target.classList.remove('hidden');
        }
        
        // Se si entra nel magazzino, attiva i controlli standard
        if (id === 'inventory') {
            this.caricaMagazzino();
            const modal = document.getElementById('job-modal');
            if (modal) {
                modal.style.display = "flex";
                const input = document.getElementById('job-name-input');
                if (input) input.value = "";
            }
        }
    },
    
    confermaNomeLavoro() {
        const input = document.getElementById('job-name-input');
        const nomeLavoro = input ? input.value.trim() : "";
        localStorage.setItem('rei_job_name', nomeLavoro);
        const modal = document.getElementById('job-modal');
        if (modal) modal.style.display = "none";
    },

        cambiaDatabase(nomeFile) {
        // Se il magazzino non è quello studio e l'app è LITE, blocca l'accesso
        if (nomeFile !== 'magazzino_studio.csv' && !this.isUnlocked) {
            this.showToast("PASSA PRO");
            return;
        }

        this.currentDB = nomeFile;
        document.querySelectorAll('.btn-db').forEach(btn => {
            if (btn.getAttribute('onclick').includes(nomeFile)) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        this.caricaMagazzino();
    },

            async caricaMagazzino() {
        try {
            const badge = document.getElementById('pro-badge');
            if (this.isUnlocked && badge) {
                badge.style.display = "none";
            }
            if (this.isUnlocked) {
                document.querySelectorAll('.btn-db').forEach(btn => {
                    if (btn.innerText.includes('🔒')) {
                        btn.innerText = btn.innerText.replace(' 🔒', '').trim();
                    }
                });
            }
            const resp = await fetch(`./${this.currentDB}`);
            const testo = await resp.text();
            const righe = testo.split('\n');
            const lista = document.getElementById('gear-list');
            if (!lista) return;
            lista.innerHTML = "";
            
            for (let i = 0; i < righe.length; i++) {
                let voce = righe[i].replace(/"/g, '').trim();
                let prossima = righe[i + 1] ? righe[i + 1].replace(/"/g, '').trim() : "";
                if (voce === "" || voce.toLowerCase() === "descrizione") continue;
                
                const li = document.createElement('li');
                
                if (prossima.toLowerCase() === "descrizione") {
                    li.className = "category-title";
                    li.innerText = voce;
                } else {
                    li.className = "gear-item";
                    
                    // Involucro di testo per l'attrezzatura sulla sinistra
                    const nameSpan = document.createElement('span');
                    nameSpan.className = "item-text";
                    nameSpan.innerText = voce;
                    nameSpan.onclick = () => this.addItem(voce);
                    li.appendChild(nameSpan);
                    
                    // Stellina dei preferiti sulla destra (incolonnata)
                    const starSpan = document.createElement('span');
                    starSpan.className = "item-star";
                    starSpan.innerText = this.favorites.includes(voce) ? "★" : "☆";
                    if (this.favorites.includes(voce)) starSpan.classList.add('fav');
                    
                    // Al clic la stella cambia colore (rossa via CSS) e salva in memoria
                    starSpan.onclick = (e) => {
                        e.stopPropagation(); // Blocca l'aggiunta dell'attrezzo alla lista quando metti la stella
                        this.toggleFavorite(voce, starSpan);
                    };
                    li.appendChild(starSpan);
                    
                    nameSpan.ontouchstart = function() { li.parentNode.classList.add('gear-item-active'); };
                    nameSpan.ontouchend = function() { setTimeout(() => li.parentNode.classList.remove('gear-item-active'), 80); };
                    
                    if (this.selectedItems.find(item => item.nome === voce)) {
                        li.classList.add('selected');
                    }
                }
                lista.appendChild(li);
            }
            this.filterGear();
        } catch (e) {
            console.error(e);
            this.showToast("Errore: File non trovato");
        }
    },

    addItem(nome) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (item) { item.qta += 1; } else { this.selectedItems.push({ nome: nome, qta: 1 }); }
        this.showToast("Aggiunto: " + nome + " (x" + (item ? item.qta : 1) + ")");
        this.updateUI();
        this.caricaMagazzino();
    },

    removeItem(nome) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (!item) return;
        
        item.qta -= 1;
        if (item.qta <= 0) {
            this.selectedItems = this.selectedItems.filter(i => i.nome !== nome);
            this.showToast("Rimosso: " + nome);
        } else {
            this.showToast("Ridotto: " + nome + " (x" + item.qta + ")");
        }
        this.updateUI();
        this.caricaMagazzino();
    },

    toggleFavorite(nome, element) {
        if (this.favorites.includes(nome)) {
            this.favorites = this.favorites.filter(f => f !== nome);
            element.innerText = "☆";
            element.classList.remove('fav');
        } else {
            this.favorites.push(nome);
            element.innerText = "★";
            element.classList.add('fav');
        }
        localStorage.setItem('rei_favorites', JSON.stringify(this.favorites));
        this.showToast(this.favorites.includes(nome) ? "Stella aggiunta!" : "Stella rimossa");
        this.caricaMagazzino();
    },

    updateUI() {
        const countSpan = document.getElementById('count');
        if (countSpan) countSpan.innerText = this.selectedItems.reduce((acc, curr) => acc + curr.qta, 0);
        
        const summary = document.getElementById('added-items-summary');
        if (!summary) return;
        
        if (this.selectedItems.length === 0) {
            summary.innerHTML = `<div style="text-align:center; color:#666; padding:15px; font-size:13px;">Nessun elemento selezionato</div>`;
            return;
        }
        
        const elencoInvertitoHtml = this.selectedItems.slice().reverse().map(item => {
            const nomePulito = item.nome.replace(/'/g, "\\'");
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:#1a1a1a; padding:8px 12px; border-radius:6px; border:1px solid #222;">
                    <span style="color:#fff; font-size:13px; font-weight:500;">${item.nome}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button onclick="ui.removeItem('${nomePulito}')" style="background:#222; border:1px solid #333; color:#ff1e00; width:28px; height:28px; border-radius:6px; font-weight:bold; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer;">-</button>
                        <span style="font-weight:bold; color:#fff; font-size:14px; min-width:20px; text-align:center;">${item.qta}</span>
                        <button onclick="ui.addItem('${nomePulito}')" style="background:#222; border:1px solid #333; color:#00ff66; width:28px; height:28px; border-radius:6px; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer;">+</button>
                    </div>
                </div>
            `;
        }).join('');

        summary.innerHTML = `
            <div style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                ${elencoInvertitoHtml}
            </div>
        `;
    },

    clearList() {
        this.selectedItems = [];
        this.showToast("Elenco svuotato");
        this.updateUI();
        this.caricaMagazzino();
    },

    clearSearch() {
        const searchInput = document.getElementById('searchGear');
        if (searchInput) searchInput.value = "";
        const clearBtn = document.querySelector('.clear-search');
        if (clearBtn) clearBtn.style.display = "none";
        this.filterGear();
    },

    toggleStarFilter() {
        this.isStarFilterActive = !this.isStarFilterActive;
        const btn = document.getElementById('starFilterBtn');
        if (btn) {
            btn.innerText = this.isStarFilterActive ? "★" : "☆";
            btn.classList.toggle('active', this.isStarFilterActive);
        }
        this.filterGear();
    },

    filterGear() {
        const searchInput = document.getElementById('searchGear');
        const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const masterStellaAttiva = this.isStarFilterActive;
        
        const clearBtn = document.querySelector('.clear-search');
        if (clearBtn && searchInput) {
            clearBtn.style.display = searchInput.value.length > 0 ? "block" : "none";
        }

        if (q === "" && !masterStellaAttiva) {
            document.querySelectorAll('.gear-item').forEach(item => item.style.display = "flex");
            document.querySelectorAll('.category-title').forEach(c => c.style.display = "block");
            return;
        }
        
        document.querySelectorAll('.category-title').forEach(c => c.style.display = "none");
        const nomiMostrati = [];
        
        document.querySelectorAll('.gear-item').forEach(item => {
            const textSpan = item.querySelector('.item-text');
            if (!textSpan) return;
            const nomeInMinuscolo = textSpan.innerText.toLowerCase().trim();
            const passaFiltroTesto = q === "" || nomeInMinuscolo.includes(q);
            
            const starSpan = item.querySelector('.item-star');
            const haStellaRossa = starSpan ? starSpan.classList.contains('fav') : false;
            const passaFiltroStella = !masterStellaAttiva || haStellaRossa;
            
            if (passaFiltroTesto && passaFiltroStella) {
                if (nomiMostrati.includes(nomeInMinuscolo)) {
                    item.style.display = "none";
                } else {
                    item.style.display = "flex";
                    nomiMostrati.push(nomeInMinuscolo);
                }
            } else {
                item.style.display = "none";
            }
        });
    },

    async shareList() {
        if (this.selectedItems.length === 0) {
            this.showToast("L'elenco è vuoto!");
            return;
        }
        const nomeLavoro = localStorage.getItem('rei_job_name') || "";
        let testo = nomeLavoro !== "" ? `📋 LISTA: ${nomeLavoro}\n\n` : "📋 LISTA:\n\n";
        
        this.selectedItems.forEach(item => {
            testo += ` ${item.qta}X: ${item.nome}\n`;
        });
        
        if (navigator.share) {
            try { 
                await navigator.share({ 
                    title: nomeLavoro !== "" ? `Lista ${nomeLavoro}` : 'Lista Noleggio', 
                    text: testo 
                }); 
            }
            catch (e) { 
                this.fallbackMail(testo, nomeLavoro); 
            }
        } else { 
            this.fallbackMail(testo, nomeLavoro); 
        }
    },

    fallbackMail(testo, nomeLavoro) {
        const oggetto = nomeLavoro !== "" ? `Lista ${nomeLavoro}` : "Lista";
        window.open(`mailto:?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`);
    },

    caricaImmaginiReference(event) {
        const files = event.target.files;
        if (!files) return;

        let immaginiSalvate = JSON.parse(localStorage.getItem('rei_ref_images')) || [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const base64Image = e.target.result;
                immaginiSalvate.push(base64Image);
                localStorage.setItem('rei_ref_images', JSON.stringify(immaginiSalvate));
                this.mostraImmaginiReference();
            };
            reader.readAsDataURL(file);
        }
    },

    mostraImmaginiReference() {
        const grid = document.getElementById('reference-grid');
        if (!grid) return;
        grid.innerHTML = "";

        const immaginiSalvate = JSON.parse(localStorage.getItem('rei_ref_images')) || [];

        if (immaginiSalvate.length === 0) {
            grid.innerHTML = `<div style="grid-column: span 2; text-align:center; color:#666; padding:30px; font-size:13px;">Nessuna immagine caricata.</div>`;
            return;
        }

        immaginiSalvate.forEach((imgSrc, index) => {
            const container = document.createElement('div');
            container.style.position = "relative";
            container.style.borderRadius = "10px";
            container.style.overflow = "hidden";
            container.style.aspectRatio = "1/1";
            container.style.border = "1px solid #222";
            container.style.background = "#000";

            const img = document.createElement('img');
            img.src = imgSrc;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            container.appendChild(img);

            const deleteBtn = document.createElement('div');
            deleteBtn.innerText = "×";
            deleteBtn.style.cssText = "position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.7); color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:bold; cursor:pointer;";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.eliminaImmagineReference(index);
            };
            container.appendChild(deleteBtn);
            grid.appendChild(container);
        });
    },

    eliminaImmagineReference(index) {
        let immaginiSalvate = JSON.parse(localStorage.getItem('rei_ref_images')) || [];
        immaginiSalvate.splice(index, 1);
        localStorage.setItem('rei_ref_images', JSON.stringify(immaginiSalvate));
        this.mostraImmaginiReference();
        this.showToast("Immagine rimossa");
    },

        showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    },

navigaA(id) {
// Nasconde tutte le sezioni visibili
document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));

// Mostra solo la sezione richiesta (senza toccare o cancellare i dati)
const target = document.getElementById(id + '-section');
if (target) target.classList.remove('hidden');
},

    proponiSblocco() {
        // Mostra all'istante la schermata di login che abbiamo inserito nell'HTML
        this.showSection('auth');
    },

    navigaA_DaReferenceALista() {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        
        const target = document.getElementById('inventory-section');
        if (target) target.classList.remove('hidden');
        
        this.caricaMagazzino();
        
        const nomeSalvato = localStorage.getItem('rei_job_name') || "";
        if (nomeSalvato === "") {
            const modal = document.getElementById('job-modal');
            if (modal) {
                modal.style.display = "flex";
                const input = document.getElementById('job-name-input');
                if (input) input.value = "";
            }
        }
    },

    async handleRegister() {
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (email === "" || password === "") {
            this.showToast("Inserisci email e password");
            return;
        }

        this.showToast("Registrazione...");

        if (!supabaseClient) {
            this.showToast("Servizio cloud non pronto, riprova");
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password
            });

            if (error) {
                this.showToast("Errore: " + error.message);
            } else {
                this.showToast("Account creato! Accedi ora");
            }
        } catch (e) {
            this.showToast("Errore di connessione");
        }
    },

    async handleLogin() {
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (email === "" || password === "") {
            this.showToast("Inserisci email e password");
            return;
        }

        this.showToast("Verifica in corso...");

        if (!supabaseClient) {
            this.showToast("Servizio cloud non pronto, riprova");
            return;
        }

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                this.showToast("Credenziali errate");
            } else {
                this.showToast("Sblocco PRO Attivo! 🚀");
                this.isUnlocked = true;
                
                const title = document.getElementById('app-title');
                if (title) {
                    title.innerText = "PRO";
                    title.style.color = "#ffb700";
                    title.style.borderColor = "#ffb700";
                }

                this.caricaMagazzino();
                setTimeout(() => this.showSection('inventory'), 1000);
            }
        } catch (e) {
            this.showToast("Errore di connessione");
        }
    }
};

window.onload = () => {
    ui.showSection('dashboard');
    const title = document.getElementById('app-title');
    if (title) {
        title.innerText = "LITE";
        title.style.color = "#ff1e00";
    }
    ui.mostraImmaginiReference();

    // Inizializzazione pulita usando il file locale supabase.js appena creato
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        supabaseClient.auth.getSession().then(({ data }) => {
            if (data && data.session) {
                ui.isUnlocked = true;
                if (title) {
                    title.innerText = "PRO";
                    title.style.color = "#ffb700";
                    title.style.borderColor = "#ffb700";
                }
                ui.caricaMagazzino();
            }
        });
    }
 };   


