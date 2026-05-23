const ui = {
    currentDB: 'magazzino_studio.csv',
    selectedItems: [],
    favorites: JSON.parse(localStorage.getItem('rei_favorites')) || [],
    isUnlocked: false,
    isStarFilterActive: false,

    showSection(id) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(id + '-section');
        if (target) target.classList.remove('hidden');
        
        if (id === 'inventory') {
            this.caricaMagazzino();
            const modal = document.getElementById('job-modal');
            if (modal) {
                modal.style.display = "flex";
                const input = document.getElementById('job-name-input');
                if (input) input.value = ""; // <-- FORZATURA CAMPO VUOTO
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
        this.currentDB = nomeFile;
        document.querySelectorAll('.btn-db').forEach(btn => {
            if (btn.getAttribute('onclick').includes(nomeFile)) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        this.caricaMagazzino();
    },

    caricaMagazzino() {
        fetch(this.currentDB)
            .then(response => response.text())
            .then(data => {
                const lista = document.getElementById('gear-list');
                if (!lista) return;
                lista.innerHTML = "";
                
                const righe = data.split('\n');
                righe.forEach(riga => {
                    const voce = riga.trim();
                    if (!voce) return;
                    
                    if (voce.startsWith('#')) {
                        const li = document.createElement('li');
                        li.className = "category-title";
                        li.innerText = voce.replace('#', '').trim();
                        lista.appendChild(li);
                    } else {
                        const li = document.createElement('li');
                        li.className = "gear-item";
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.className = "item-text";
                        nameSpan.innerText = voce;
                        nameSpan.onclick = () => this.addItem(voce);
                        li.appendChild(nameSpan);
                        
                        const starSpan = document.createElement('span');
                        starSpan.className = "item-star";
                        starSpan.innerText = this.favorites.includes(voce) ? "★" : "☆";
                        if (this.favorites.includes(voce)) starSpan.classList.add('fav');
                        
                        starSpan.onclick = (e) => {
                            e.stopPropagation();
                            this.toggleFavorite(voce, starSpan);
                        };
                        li.appendChild(starSpan);
                        
                        nameSpan.ontouchstart = function() { li.classList.add('gear-item-active'); };
                        nameSpan.ontouchend = function() { setTimeout(() => li.classList.remove('gear-item-active'), 80); };
                        
                        if (this.selectedItems.find(item => item.nome === voce)) {
                            li.classList.add('selected');
                        }
                        lista.appendChild(li);
                    }
                });
                this.filterGear();
            });
    },

    addItem(nome) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (item) { item.qta += 1; } else { this.selectedItems.push({ nome: nome, qta: 1 }); }
        this.showToast("Aggiunto: " + nome + " (x" + (item ? item.qta : 1) + ")");
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
        
        // .slice().reverse() inverte l'ordine: l'ultimo attrezzo inserito balza in cima!
        // La scatola esterna ha un'altezza massima fissa (max-height) e scorre dentro (overflow-y)
        summary.innerHTML = `<div style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
            ${this.selectedItems.slice().reverse().map(item => 
                `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; background:#1a1a1a; padding:8px 12px; border-radius:6px; border:1px solid #222;">
                    <span style="color:#fff; font-size:13px; font-weight:500;">${item.nome}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button onclick="ui.removeItem('${item.nome.replace(/'/g, "\\'")}')" style="background:#222; border:1px solid #333; color:#ff1e00; width:28px; height:28px; border-radius:6px; font-weight:bold; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer;">-</button>
                        <span style="font-weight:bold; color:#fff; font-size:14px; min-width:20px; text-align:center;">${item.qta}</span>
                        <button onclick="ui.addItem('${item.nome.replace(/'/g, "\\'")}')" style="background:#222; border:1px solid #333; color:#00ff66; width:28px; height:28px; border-radius:6px; font-weight:bold; font-size:14px; display:flex; align-items:center; justify-content:center; cursor:pointer;">+</button>
                    </div>
                 </div>`
            ).join('')}
        </div>`;
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
        
        // INTESTAZIONE PULITA RICHIESTA: "LISTA: nome_lavoro" SENZA LA PAROLA ATTREZZATURA
        const nomeLavoro = localStorage.getItem('rei_job_name') || "";
        let testo = nomeLavoro !== "" ? `📋 LISTA: ${nomeLavoro}\n\n` : "📋 LISTA:\n\n";
        
        this.selectedItems.forEach(item => {
            testo += `• ${item.nome} (x${item.qta})\n`;
        });
        
        // CODICE COMPATIBILE AL 100% CON IL SITEMA NATIVO CONDIVISIONE APPLE
        if (navigator.share) {
            try { 
                await navigator.share({ 
                    title: nomeLavoro !== "" ? `Lista ${nomeLavoro}` : 'Lista Noleggio', 
                    text: testo 
                }); 
            }
            catch (e) { this.fallbackMail(testo); }
        } else { this.fallbackMail(testo); }
    },

    fallbackMail(testo) {
        window.open(`mailto:?subject=Lista Attrezzatura REI&body=${encodeURIComponent(testo)}`);
    },


    showToast(msg) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    }
};

window.onload = () => {
    ui.showSection('dashboard');
    const title = document.getElementById('app-title');
    if (title) {
        title.innerText = "LITE";
        title.style.color = "#ff1e00";
    }
};
