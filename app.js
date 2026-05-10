const ui = {
    selectedItems: [],
    isMirrored: false,
    currentDB: 'magazzino_studio.csv', // Database di partenza

    showSection(id) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(id + '-section').classList.remove('hidden');
        // Carica il database corrente solo quando entri in inventory
        if (id === 'inventory') this.caricaMagazzino();
    },

        // 1. QUESTA GESTISCE I CLIC SUI 4 TASTI
    cambiaDatabase(nomeFile) {
        this.currentDB = nomeFile;
        
        // Toglie il rosso a tutti e lo mette solo a quello cliccato
        document.querySelectorAll('.btn-db').forEach(btn => {
            if (btn.getAttribute('onclick').includes(nomeFile)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.caricaMagazzino(); // Carica i nuovi dati
        this.showToast("Caricato: " + nomeFile.replace('magazzino_', '').replace('.csv', ''));
    },

    // 2. QUESTA CARICA IL FILE CSV SELEZIONATO
    async caricaMagazzino() {
        try {
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
                li.innerText = voce;

                if (prossima.toLowerCase() === "descrizione") {
                    li.className = "category-title";
                } else {
                    li.className = "gear-item";
                    
                    // Se l'hai già scelto prima, rimane evidenziato (Selected)
                    if (this.selectedItems.find(item => item.nome === voce)) {
                        li.classList.add('selected');
                    }
                    
                    li.onclick = () => this.addItem(voce);
                }
                lista.appendChild(li);
            }
        } catch (e) { 
            console.error(e);
            this.showToast("Errore: File non trovato");
        }
    },

    
    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        this.analyzeImage(); // Ricarica lo schema specchiato
    },

    addItem(nome) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (item) { item.qta += 1; } else { this.selectedItems.push({ nome: nome, qta: 1 }); }
        this.showToast("Aggiunto: " + nome + " (x" + (item ? item.qta : 1) + ")");
        this.updateUI();
    },

    changeQta(nome, delta) {
        const item = this.selectedItems.find(i => i.nome === nome);
        if (item) {
            item.qta += delta;
            if (item.qta <= 0) this.selectedItems = this.selectedItems.filter(i => i.nome !== nome);
        }
        this.updateUI();
    },

    updateUI() {
        const summary = document.getElementById('added-items-summary');
        const count = document.getElementById('count');
        if (count) count.innerText = this.selectedItems.length;
        if (this.selectedItems.length === 0) {
            summary.innerText = "Nessun elemento selezionato";
            return;
        }
        summary.innerHTML = this.selectedItems.map(i => `
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
        const testo = "Lista Noleggio REI:\n\n" + 
            this.selectedItems.map(i => `${i.qta}x ${i.nome}`).join('\n');
            
        if (navigator.share) {
            try { 
                await navigator.share({ title: 'Lista REI', text: testo }); 
            } catch (e) { 
                this.fallbackMail(testo); 
            }
        } else { 
            this.fallbackMail(testo); 
        }
    },

    // QUESTA È LA FUNZIONE CHE MANCAVA:
    fallbackMail(testo) {
        window.open(`mailto:?subject=Lista Noleggio REI&body=${encodeURIComponent(testo)}`);
    },


    clearList() {
        if (this.selectedItems.length === 0) return;
        if (confirm("Vuoi cancellare tutta la lista?")) {
            this.selectedItems = [];
            this.updateUI();
            this.showToast("Lista svuotata!");
        }
    },

    filterGear() {
        const q = document.getElementById('searchGear').value.toLowerCase();
        document.querySelectorAll('.gear-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(q) ? "block" : "none";
        });
        document.querySelectorAll('.category-title').forEach(c => c.style.display = q === "" ? "block" : "none");
    },

    clearSearch() { document.getElementById('searchGear').value = ""; this.filterGear(); },

    showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg; t.classList.remove('hidden'); t.style.opacity = "1";
        setTimeout(() => {
            t.style.opacity = "0";
            setTimeout(() => t.classList.add('hidden'), 200);
        }, 800);
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
                    // Usiamo un'immagine piccola per l'analisi (più veloce e precisa)
                    canvas.width = 100;
                    canvas.height = 100;
                    ctx.drawImage(img, 0, 0, 100, 100);

                    const data = ctx.getImageData(0, 0, 100, 100).data;
                    let leftLum = 0, rightLum = 0;

                                        for (let i = 0; i < data.length; i += 4) {
                        const lum = (data[i] + data[i+1] + data[i+2]) / 3;
                        const x = (i / 4) % 100;
                        const y = Math.floor((i / 4) / 100);
                        // Analizziamo solo la fascia centrale (viso/busto)
                        if (y > 20 && y < 80) { 
                            if (x < 50) leftLum += lum;
                            else rightLum += lum;
                        }
                    }

                    const total = leftLum + rightLum;
                    const diff = Math.abs(leftLum - rightLum) / total;
                    
                    // COORDINATE PER VISTA FOTOGRAFO (Luce in basso, y = 0.75 o 0.85)
                    let pos = { nome: "Frontale", x: 0.5, y: 0.85 }; 

                    if (diff > 0.03) { 
                        if (leftLum > rightLum) {
                            pos = { nome: "45° Laterale SX", x: 0.25, y: 0.75 };
                        } else {
                            pos = { nome: "45° Laterale DX", x: 0.75, y: 0.75 };
                        }
                    }

                    document.getElementById('res-hardness').innerText = "Rilevata";
                    document.getElementById('res-angle').innerText = pos.nome;
                    document.getElementById('analysis-results').classList.remove('hidden');
                    
                    // Disegna lo schema con la luce in basso
                    this.drawDiagram(pos);

                };
            };
            reader.readAsDataURL(input.files[0]);
        }
    },


    togglePhotoZoom() {
        const img = document.getElementById('image-preview');
        img.classList.toggle('photo-fullscreen');
        
        // Se la foto è a tutto schermo, nascondiamo il resto per pulizia
        const results = document.querySelector('.results-box');
        const canvas = document.getElementById('lightingDiagram');
        const isFull = img.classList.contains('photo-fullscreen');
        
        results.style.display = isFull ? "none" : "block";
        canvas.style.display = isFull ? "none" : "block";
    },


            drawDiagram(pos) {
        const canvas = document.getElementById('lightingDiagram');
        const ctx = canvas.getContext('2d');
        const [w, h] = [canvas.width, canvas.height];
        
        ctx.clearRect(0, 0, w, h);
        
        // POSIZIONE DI DEFAULT (Invertita per vista fotografo)
        if (!pos) pos = { x: 0.25, y: 0.75 }; 

        ctx.save();

        // Se lo specchio è attivo (L/R)
        if (this.isMirrored) {
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
        }

        const sx = w / 2;
        const sy = h / 2 - 20; // IL SOGGETTO SALE VERSO L'ALTO
        
        // LA LUCE SCENDE NELLA PARTE BASSA (Vista fotografo)
        const lx = w * pos.x;
        const ly = h * (1 - pos.y + 0.5); // Calcolo per portarla in basso

        const angle = Math.atan2(sy - ly, sx - lx);

        // FASCIO DI LUCE (Punta verso l'alto)
        const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 160);
        grad.addColorStop(0, 'rgba(255, 30, 0, 0.5)'); 
        grad.addColorStop(1, 'rgba(255, 30, 0, 0)');
        ctx.fillStyle = grad; 
        ctx.beginPath(); 
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx+160*Math.cos(angle-0.4), ly+160*Math.sin(angle-0.4));
        ctx.lineTo(lx+160*Math.cos(angle+0.4), ly+160*Math.sin(angle+0.4));
        ctx.fill();

        // SOGGETTO RIVOLTO IN BASSO (Invertiamo spalle e testa)
        ctx.fillStyle = "white"; 
        ctx.beginPath(); ctx.ellipse(sx, sy - 5, 18, 8, 0, 0, 7); ctx.fill(); // Spalle in alto
        ctx.beginPath(); ctx.arc(sx, sy + 5, 10, 0, 7); ctx.fill(); // Testa in basso (guarda te)

        // FARO PROFOTO
        ctx.save(); 
        ctx.translate(lx, ly); 
        ctx.rotate(angle);
        ctx.fillStyle = "#ff1e00"; ctx.fillRect(-12, -8, 24, 16);
        ctx.strokeStyle = "#ff1e00"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.arc(12, 0, 15, -1.5, 1.5); ctx.stroke();
        ctx.restore();

        ctx.restore();
    },


    // FUNZIONE PER ATTIVARE/DISATTIVARE LO SPECCHIO
    toggleMirror() {
        this.isMirrored = !this.isMirrored;
        // Ridisegna con l'ultima posizione rilevata
        this.analyzeImage(); 
    }

};

window.onload = () => ui.showSection('dashboard');
