const ui = {
    selectedItems: [],
    isMirrored: false,
    isUnlocked: localStorage.getItem('rei_pro_unlocked') === 'true',
    deviceSeed: localStorage.getItem('rei_device_seed'),
    currentDB: 'magazzino_studio.csv',
    favorites: JSON.parse(localStorage.getItem('rei_favorites')) || [],
    isStarFilterActive: false,

    showSection(id) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(id + '-section').classList.remove('hidden');
        if (id === 'inventory') this.caricaMagazzino();
    },

    cambiaDatabase(nomeFile) {
        if (nomeFile !== 'magazzino_studio.csv' && !this.isUnlocked) {
            this.proponiSblocco();
            return;
        }

        this.currentDB = nomeFile;
        document.querySelectorAll('.btn-db').forEach(btn => {
            if (btn.getAttribute('onclick').includes(nomeFile)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.caricaMagazzino();
        this.showToast("Caricato: " + nomeFile.replace('magazzino_', '').replace('.csv', '').replace('?v=2','').toUpperCase());
    },

    proponiSblocco() {
        if (!this.deviceSeed) {
            this.deviceSeed = localStorage.getItem('rei_device_seed');
            if (!this.deviceSeed) {
                this.deviceSeed = Math.floor(Math.random() * 8999 + 1000);
                localStorage.setItem('rei_device_seed', this.deviceSeed);
            }
        }
        
        const codiceID = "REI-" + this.deviceSeed;
        const chiaveCorretta = (parseInt(this.deviceSeed) * 3) + "PRO";
        const messaggio = `🔒 VERSIONE PRO BLOCCATA\n\nPer sbloccare tutti i database (Location, Digitale, Produzione, Tutto), effettua la donazione di 1,99€.\n\nInvia questo codice ID unico con la donazione:\n👉 ${codiceID}\n\nInserisci la chiave di sblocco ricevuta:`;
        
        const chiaveUtente = prompt(messaggio);

        if (chiaveUtente === chiaveCorretta) {
            localStorage.setItem('rei_pro_unlocked', 'true');
            this.isUnlocked = true;
            alert("✅ Sblocco riuscito! Tutti i database sono ora attivi.");
            
            const badge = document.getElementById('pro-badge');
            if (badge) badge.style.display = "none";
            
            document.querySelectorAll('.btn-db').forEach(btn => {
                btn.innerText = btn.innerText.replace(' 🔒', '').trim();
            });
            
            this.cambiaDatabase('magazzino_studio.csv');
        } else if (chiaveUtente) {
            alert("❌ Chiave errata. Riprova o contatta l'assistenza.");
        }
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

            const resp = await fetch(this.currentDB);
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
                    nameSpan.ontouchend = function() { 
                        setTimeout(() => li.classList.remove('gear-item-active'), 80); 
                    };
                    
                    if (this.selectedItems.find(item => item.nome === voce)) {
                        li.classList.add('selected');
                    }
                }
                lista.appendChild(li);
            }
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

    changeQta(nome, delta) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (item) {
            item.qta += delta;
            if (item.qta <= 0) this.selectedItems = this.selectedItems.filter(i => i.nome !== nome);
        }
        this.updateUI();
        this.caricaMagazzino();
    },

    updateUI() {
        const summary = document.getElementById('added-items-summary');
        const count = document.getElementById('count');
        if (count) count.innerText = this.selectedItems.length;

        if (this.selectedItems.length === 0) {
            summary.innerText = "Nessun elemento selezionato";
            return;
        }

        const visualList = [...this.selectedItems].reverse();

        summary.innerHTML = visualList.map(i => `
            <div class="summary-tag">
                ${i.nome} <b>x${i.qta}</b>
                <span class="btn-qta" onclick="ui.changeQta('${i.nome}', 1)">+</span>
                <span class="btn-qta" onclick="ui.changeQta('${i.nome}', -1)">-</span>
            </div>
        `).join('');
    },

    async shareList() {
        if (this.selectedItems.length === 0) {
            this.showToast("Seleziona almeno un articolo!");
            return;
        }
        const testo = "Lista Attrezzatura REI:\n\n" + 
            this.selectedItems.map(i => `${i.qta}x ${i.nome}`).join('\n');
        if (navigator.share) {
            try { await navigator.share({ title: 'Lista REI', text: testo }); } 
            catch (e) { this.fallbackMail(testo); }
        } else { this.fallbackMail(testo); }
    },

    fallbackMail(testo) {
        window.open(`mailto:?subject=Lista Attrezzatura REI&body=${encodeURIComponent(testo)}`);
    },

    clearList() {
        if (this.selectedItems.length === 0) return;
        if (confirm("Vuoi cancellare tutta la lista?")) {
            this.selectedItems = [];
            this.updateUI();
            this.caricaMagazzino();
            this.showToast("Lista svuotata!");
        }
    },

    filterGear() {
        if (this.isStarFilterActive) {
            this.applyStarFilter();
            return;
        }

        const q = document.getElementById('searchGear').value.toLowerCase();
        if (q === "") {
            document.querySelectorAll('.gear-item').forEach(item => item.style.display = "flex");
            document.querySelectorAll('.category-title').forEach(c => c.style.display = "block");
            return;
        }

        document.querySelectorAll('.category-title').forEach(c => c.style.display = "none");
        const nomiMostrati = [];

        document.querySelectorAll('.gear-item').forEach(item => {
            const nameSpan = item.querySelector('.item-text');
            if (!nameSpan) return;
            const nomeTesto = nameSpan.innerText.toLowerCase().trim();
            const corrisponde = nomeTesto.includes(q);

            if (corrisponde) {
                if (nomiMostrati.includes(nomeTesto)) {
                    item.style.display = "none";
                } else {
                    item.style.display = "flex";
                    nomiMostrati.push(nomeTesto);
                }
            } else {
                item.style.display = "none";
            }
        });
    },

    clearSearch() { 
        document.getElementById('searchGear').value = ""; 
        this.filterGear(); 
    },

    showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg; t.classList.remove('hidden'); t.style.opacity = "1";
        setTimeout(() => {
            t.style.opacity = "0";
            setTimeout(() => t.classList.add('hidden'), 200);
        }, 800);
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
        if (this.isStarFilterActive) this.applyStarFilter();
    },

    toggleStarFilter() {
        this.isStarFilterActive = !this.isStarFilterActive;
        const btn = document.getElementById('starFilterBtn');
        if (btn) {
            btn.innerText = this.isStarFilterActive ? "★" : "☆";
            btn.classList.toggle('active', this.isStarFilterActive);
        }
        this.applyStarFilter();
    },

            applyStarFilter() {
        const q = document.getElementById('searchGear').value.toLowerCase();
        
        if (!this.isStarFilterActive && q === "") {
            this.filterGear();
            return;
        }

        // Nascondiamo i titoli di categoria per ordine visivo
        document.querySelectorAll('.category-title').forEach(c => c.style.display = "none");

        const nomiMostrati = [];

        document.querySelectorAll('.gear-item').forEach(item => {
            // 1. Controlla il testo della barra di ricerca
            const firstSpan = item.querySelector('span');
            const nomeTesto = firstSpan ? firstSpan.innerText.trim() : "";
            const nomeInMinuscolo = nomeTesto.toLowerCase();
            const passaFiltroTesto = q === "" || nomeInMinuscolo.includes(q);

            // 2. IL TUO COMANDO DIRETTO: Controlla se la riga contiene una stella accesa (.fav)
            const haStellaRossa = item.querySelector('.item-star.fav') !== null;
            const passaFiltroStella = !this.isStarFilterActive || haStellaRossa;

            // 3. Applica il filtro
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


    analyzeImage() {
        const input = document.getElementById('imageInput');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('image-preview').src = e.target.result;
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 100; canvas.height = 100;
                    ctx.drawImage(img, 0, 0, 100, 100);
                    const data = ctx.getImageData(0, 0, 100, 100).data;
                    let leftLum = 0, rightLum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const lum = (data[i] + data[i+1] + data[i+2]) / 3;
                        const x = (i / 4) % 100;
                        const y = Math.floor((i / 4) / 100);
                        if (y > 20 && y < 80) { if (x < 50) leftLum += lum; else rightLum += lum; }
                    }
                    const total = leftLum + rightLum;
                    const diff = Math.abs(leftLum - rightLum) / total;
                    let pos = { nome: "Frontale", x: 0.5, y: 0.85 };
                    if (diff > 0.03) {
                        if (leftLum > rightLum) pos = { nome: "45° Laterale SX", x: 0.25, y: 0.75 };
                        else pos = { nome: "45° Laterale DX", x: 0.75, y: 0.75 };
                    }
                    document.getElementById('res-hardness').innerText = "Rilevata";
                    document.getElementById('res-angle').innerText = pos.nome;
                    document.getElementById('analysis-results').classList.remove('hidden');
                    this.drawDiagram(pos);
                };
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    togglePhotoZoom() {
        const img = document.getElementById('image-preview');
        img.classList.toggle('photo-fullscreen');
        const isFull = img.classList.contains('photo-fullscreen');
        document.querySelector('.results-box').style.display = isFull ? "none" : "flex";
        document.getElementById('lightingDiagram').style.display = isFull ? "none" : "block";
    },

    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        this.analyzeImage();
    },

    drawDiagram(pos) {
        const canvas = document.getElementById('lightingDiagram');
        const ctx = canvas.getContext('2d');
        const [w, h] = [canvas.width, canvas.height];
        ctx.clearRect(0, 0, w, h);
        if (!pos) pos = { x: 0.25, y: 0.75 };
        ctx.save();
        if (this.isMirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
        const sx = w / 2;
        const sy = h / 2 - 20;
        const lx = w * pos.x;
        const ly = h * (1 - pos.y + 0.5);
        const angle = Math.atan2(sy - ly, sx - lx);
        const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 160);
        grad.addColorStop(0, 'rgba(255, 30, 0, 0.5)'); grad.addColorStop(1, 'rgba(255, 30, 0, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(lx, ly);
        ctx.lineTo(lx+160*Math.cos(angle-0.4), ly+160*Math.sin(angle-0.4));
        ctx.lineTo(lx+160*Math.cos(angle+0.4), ly+160*Math.sin(angle+0.4));
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.ellipse(sx, sy - 5, 18, 8, 0, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy + 5, 10, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(angle);
        ctx.fillStyle = "#ff1e00"; ctx.fillRect(-12, -8, 24, 16);
        ctx.strokeStyle = "#ff1e00"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(12, 0, 15, -1.5, 1.5); ctx.stroke();
        ctx.restore(); ctx.restore();
    }
};

window.onload = () => ui.showSection('dashboard');
