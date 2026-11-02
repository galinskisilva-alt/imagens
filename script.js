// ==========================================
// 1. DADOS INICIAIS, ESTOQUE & PERSISTÊNCIA
// ==========================================
const DEFAULT_CATALOG = [
    {
        id: "1",
        title: "Ursinho Polar Articulado",
        category: "Decorativo",
        material: "PLA",
        price: 45.00,
        inStock: true,
        dimensions: "10 x 10 x 10 cm",
        printTime: "4h",
        weight: "95g",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: "2",
        title: "Busto Futurista Cyberpunk",
        category: "Decorativo",
        material: "Resina UV",
        price: 110.00,
        inStock: true,
        dimensions: "12 x 10 x 18 cm",
        printTime: "10h",
        weight: "160g",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: "3",
        title: "Suporte Headset Gamer",
        category: "Utilitários",
        material: "PETG",
        price: 65.00,
        inStock: true,
        dimensions: "14 x 12 x 24 cm",
        printTime: "7h 30m",
        weight: "210g",
        image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800"
    }
];

const DEFAULT_MATERIALS = ["PLA", "PETG", "ABS", "Resina UV", "Flexível (TPU)"];

const DEFAULT_COLORS = [
    { name: "Preto Matte", hex: "#1e1e1e" },
    { name: "Branco Puríssimo", hex: "#ffffff" },
    { name: "Cinza Espacial", hex: "#6b7280" },
    { name: "Vermelho Rubi", hex: "#ef4444" },
    { name: "Azul Cobalto", hex: "#2563eb" },
    { name: "Dourado Silk", hex: "#d97706" },
    { name: "Cobre Silk", hex: "#b45309" },
    { name: "Verde Menta", hex: "#10b981" }
];

// Estado Global
let catalog = [];
let availableMaterials = [];
let availableColors = [];
let isAdmin = false;
let selectedCategory = "Todos";
let selectedProduct = null;
let selectedScale = 100;
let selectedColorName = "";
let currentImageData = "";

// Inicialização ao carregar a página
window.addEventListener("DOMContentLoaded", () => {
    loadCatalog();
    loadInventory();
    renderCatalog();
    renderMaterialDropdowns();
});

function loadCatalog() {
    const saved = localStorage.getItem("nexus_3d_catalog");
    if (saved) {
        catalog = JSON.parse(saved);
    } else {
        catalog = [...DEFAULT_CATALOG];
        saveCatalog();
    }
}

function saveCatalog() {
    localStorage.setItem("nexus_3d_catalog", JSON.stringify(catalog));
}

function loadInventory() {
    const savedMat = localStorage.getItem("nexus_3d_materials");
    const savedCol = localStorage.getItem("nexus_3d_colors");

    availableMaterials = savedMat ? JSON.parse(savedMat) : [...DEFAULT_MATERIALS];
    availableColors = savedCol ? JSON.parse(savedCol) : [...DEFAULT_COLORS];

    if (!savedMat) saveMaterials();
    if (!savedCol) saveColors();
}

function saveMaterials() {
    localStorage.setItem("nexus_3d_materials", JSON.stringify(availableMaterials));
    renderMaterialDropdowns();
}

function saveColors() {
    localStorage.setItem("nexus_3d_colors", JSON.stringify(availableColors));
}

function getAdminPin() {
    return localStorage.getItem("nexus_3d_admin_pin") || "1234";
}

// ==========================================
// 2. CÁLCULOS PROPORCIONAIS DE ESCALA
// ==========================================
function calculateScaledDimensions(dimStr, scalePercent) {
    if (!dimStr) return "-";
    const factor = scalePercent / 100;
    
    return dimStr.replace(/(\d+(?:[\.,]\d+)?)/g, (match) => {
        const num = parseFloat(match.replace(',', '.'));
        if (isNaN(num)) return match;
        const scaled = num * factor;
        return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
    });
}

function calculateScaledWeight(weightStr, scalePercent) {
    if (!weightStr) return "-";
    const volumeFactor = Math.pow(scalePercent / 100, 3);
    
    return weightStr.replace(/(\d+(?:[\.,]\d+)?)/g, (match) => {
        const num = parseFloat(match.replace(',', '.'));
        if (isNaN(num)) return match;
        const scaled = num * volumeFactor;
        return Math.round(scaled);
    });
}

function calculateScaledTime(timeStr, scalePercent) {
    if (!timeStr || timeStr === "-") return "-";
    
    let hours = 0;
    let minutes = 0;

    const hMatch = timeStr.match(/(\d+)\s*h/i);
    const mMatch = timeStr.match(/(\d+)\s*m/i);

    if (hMatch) hours = parseInt(hMatch[1]);
    if (mMatch) minutes = parseInt(mMatch[1]);

    if (!hMatch && !mMatch) {
        const num = parseFloat(timeStr.replace(',', '.'));
        if (!isNaN(num)) hours = num;
    }

    const totalMinutes = (hours * 60) + minutes;
    if (totalMinutes === 0) return timeStr;

    const timeFactor = Math.pow(scalePercent / 100, 2);
    const scaledTotalMin = Math.round(totalMinutes * timeFactor);

    const newHours = Math.floor(scaledTotalMin / 60);
    const newMin = scaledTotalMin % 60;

    if (newHours > 0 && newMin > 0) return `${newHours}h ${newMin}m`;
    if (newHours > 0) return `${newHours}h`;
    return `${newMin}m`;
}

// ==========================================
// 3. RENDERIZAÇÃO DO CATÁLOGO E FILTROS
// ==========================================
function renderMaterialDropdowns() {
    const filterSelect = document.getElementById("materialSelect");
    const formSelect = document.getElementById("formMaterial");
    const modalSelect = document.getElementById("modalMaterialSelect");

    if (filterSelect) {
        filterSelect.innerHTML = `<option value="Todos">Todos os Materiais</option>` +
            availableMaterials.map(m => `<option value="${m}">${m}</option>`).join("");
    }

    if (formSelect) {
        formSelect.innerHTML = availableMaterials.map(m => `<option value="${m}">${m}</option>`).join("");
    }

    if (modalSelect) {
        modalSelect.innerHTML = availableMaterials.map(m => `<option value="${m}">${m}</option>`).join("");
    }
}

function renderCatalog() {
    const grid = document.getElementById("productGrid");
    const noResults = document.getElementById("noResults");
    const searchVal = document.getElementById("searchInput").value.toLowerCase();
    const materialVal = document.getElementById("materialSelect").value;

    grid.innerHTML = "";

    const filtered = catalog.filter(p => {
        const matchCategory = selectedCategory === "Todos" || p.category === selectedCategory;
        const matchMaterial = materialVal === "Todos" || p.material === materialVal;
        const matchSearch = p.title.toLowerCase().includes(searchVal);
        return matchCategory && matchMaterial && matchSearch;
    });

    if (filtered.length === 0) {
        noResults.classList.remove("hidden");
    } else {
        noResults.classList.add("hidden");
    }

    filtered.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            ${isAdmin ? `
                <div class="admin-actions">
                    <button class="btn-icon" onclick="openEditProductModal('${p.id}', event)" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteProduct('${p.id}', event)" title="Apagar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            ` : ''}
            <img class="card-image" src="${p.image}" alt="${p.title}" onclick="openSpecModal('${p.id}')">
            <div class="card-body" onclick="openSpecModal('${p.id}')">
                <span class="card-category">${p.category} • ${p.material}</span>
                <h3 class="card-title">${p.title}</h3>
                <div class="card-footer">
                    <span class="card-price">R$ ${parseFloat(p.price).toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm">Ver Detalhes</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function setCategoryFilter(category) {
    selectedCategory = category;
    document.querySelectorAll(".chip").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-category") === category);
    });
    renderCatalog();
}

function filterProducts() {
    renderCatalog();
}

// ==========================================
// 4. MODAL DE ESPECIFICAÇÕES & CORES (CLIENTE)
// ==========================================
function openSpecModal(id) {
    selectedProduct = catalog.find(p => p.id === id);
    if (!selectedProduct) return;

    selectedScale = 100;
    
    document.getElementById("modalImage").src = selectedProduct.image;
    document.getElementById("modalTitle").innerText = selectedProduct.title;
    document.getElementById("modalCategory").innerText = `${selectedProduct.category} | ${selectedProduct.material}`;

    const matSelect = document.getElementById("modalMaterialSelect");
    if (matSelect) {
        matSelect.value = selectedProduct.material || (availableMaterials[0] || "PLA");
    }

    renderColorSwatches();
    updateScaleUI();
    document.getElementById("specModal").classList.remove("hidden");
}

function renderColorSwatches() {
    const container = document.getElementById("colorSwatchesContainer");
    container.innerHTML = "";

    if (!availableColors.length) {
        container.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">Nenhuma cor cadastrada.</span>`;
        selectedColorName = "Padrão";
        return;
    }

    selectedColorName = availableColors[0].name;

    availableColors.forEach((c, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `color-swatch-btn ${idx === 0 ? 'active' : ''}`;
        btn.onclick = () => selectColorSwatch(c.name, btn);

        btn.innerHTML = `
            <span class="color-dot" style="background-color: ${c.hex}"></span>
            <span>${c.name}</span>
        `;
        container.appendChild(btn);
    });
}

function selectColorSwatch(colorName, btnElement) {
    selectedColorName = colorName;
    document.querySelectorAll(".color-swatch-btn").forEach(b => b.classList.remove("active"));
    btnElement.classList.add("active");
}

function closeSpecModal() {
    document.getElementById("specModal").classList.add("hidden");
}

function setScale(scale) {
    selectedScale = scale;
    updateScaleUI();
}

function updateScaleUI() {
    if (!selectedProduct) return;

    const buttons = document.querySelectorAll(".scale-selector button");
    buttons.forEach(b => {
        b.classList.toggle("active", b.innerText.includes(`${selectedScale}%`));
    });

    const priceFactor = selectedScale / 100;
    const calculatedPrice = selectedProduct.price * priceFactor;
    document.getElementById("modalPrice").innerText = `R$ ${calculatedPrice.toFixed(2)}`;

    document.getElementById("specDimensions").innerText = calculateScaledDimensions(selectedProduct.dimensions, selectedScale);
    document.getElementById("specWeight").innerText = calculateScaledWeight(selectedProduct.weight, selectedScale);
    document.getElementById("specTime").innerText = calculateScaledTime(selectedProduct.printTime, selectedScale);
}

// ==========================================
// 5. ENVIAR PEDIDO AO WHATSAPP
// ==========================================
function sendWhatsAppOrder() {
    if (!selectedProduct) return;

    const phone = "5511999999999"; // <-- Digite o seu número com DDD aqui
    const chosenMaterial = document.getElementById("modalMaterialSelect").value;
    
    const priceFactor = selectedScale / 100;
    const finalPrice = (selectedProduct.price * priceFactor).toFixed(2);
    const finalDimensions = calculateScaledDimensions(selectedProduct.dimensions, selectedScale);
    const finalWeight = calculateScaledWeight(selectedProduct.weight, selectedScale);
    const finalTime = calculateScaledTime(selectedProduct.printTime, selectedScale);

    const message = `Olá! Gostaria de fazer o pedido deste modelo 3D:\n\n` +
        `📌 *Modelo:* ${selectedProduct.title}\n` +
        `📐 *Escala Escolhida:* ${selectedScale}%\n` +
        `📏 *Dimensões:* ${finalDimensions}\n` +
        `⚖️ *Peso Estimado:* ${finalWeight}\n` +
        `⏱️ *Tempo Estimado:* ${finalTime}\n` +
        `🧵 *Material:* ${chosenMaterial}\n` +
        `🎨 *Cor:* ${selectedColorName}\n` +
        `💰 *Valor Calculado:* R$ ${finalPrice}\n\n` +
        `Como podemos prosseguir com o pagamento e a entrega?`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}

// ==========================================
// 6. GERENCIADOR DE ESTOQUE (MATERIAIS E CORES)
// ==========================================
function openInventoryModal() {
    renderInventoryLists();
    document.getElementById("inventoryModal").classList.remove("hidden");
}

function closeInventoryModal() {
    document.getElementById("inventoryModal").classList.add("hidden");
}

function renderInventoryLists() {
    const matList = document.getElementById("adminMaterialsList");
    matList.innerHTML = availableMaterials.map((m, index) => `
        <div class="inventory-item">
            <span>${m}</span>
            <button class="btn-icon delete" onclick="removeMaterial(${index})" title="Remover"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join("");

    const colList = document.getElementById("adminColorsList");
    colList.innerHTML = availableColors.map((c, index) => `
        <div class="inventory-item">
            <div style="display:flex; align-items:center; gap:8px;">
                <span class="color-dot" style="background-color: ${c.hex}"></span>
                <span>${c.name}</span>
            </div>
            <button class="btn-icon delete" onclick="removeColor(${index})" title="Remover"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join("");
}

function addMaterial() {
    const input = document.getElementById("newMaterialInput");
    const val = input.value.trim();

    if (!val) return;
    if (availableMaterials.includes(val)) {
        alert("Este material já está cadastrado!");
        return;
    }

    availableMaterials.push(val);
    saveMaterials();
    renderInventoryLists();
    input.value = "";
}

function removeMaterial(index) {
    availableMaterials.splice(index, 1);
    saveMaterials();
    renderInventoryLists();
}

function addColor() {
    const nameInput = document.getElementById("newColorNameInput");
    const hexInput = document.getElementById("newColorHexInput");
    
    const name = nameInput.value.trim();
    const hex = hexInput.value;

    if (!name) return;

    availableColors.push({ name, hex });
    saveColors();
    renderInventoryLists();
    nameInput.value = "";
}

function removeColor(index) {
    availableColors.splice(index, 1);
    saveColors();
    renderInventoryLists();
}

// ==========================================
// 7. PAINEL ADMIN E SENHA
// ==========================================
function toggleAdminMode() {
    if (isAdmin) {
        isAdmin = false;
        document.getElementById("adminBanner").classList.add("hidden");
        document.getElementById("adminBtnText").innerText = "Área Admin";
        document.getElementById("adminToggleBtn").classList.remove("active");
        renderCatalog();
    } else {
        document.getElementById("pinModal").classList.remove("hidden");
    }
}

function verifyPin() {
    const pin = document.getElementById("pinInput").value;
    const pinError = document.getElementById("pinError");
    const currentPin = getAdminPin();

    if (pin === currentPin) {
        isAdmin = true;
        pinError.classList.add("hidden");
        document.getElementById("pinInput").value = "";
        closePinModal();
        
        document.getElementById("adminBanner").classList.remove("hidden");
        document.getElementById("adminBtnText").innerText = "Sair do Admin";
        document.getElementById("adminToggleBtn").classList.add("active");
        renderCatalog();
    } else {
        pinError.classList.remove("hidden");
    }
}

function closePinModal() {
    document.getElementById("pinModal").classList.add("hidden");
}

function openChangePinModal() {
    document.getElementById("changePinModal").classList.remove("hidden");
}

function closeChangePinModal() {
    document.getElementById("changePinModal").classList.add("hidden");
    document.getElementById("newPinInput").value = "";
}

function saveNewPin() {
    const newPin = document.getElementById("newPinInput").value.trim();
    if (!newPin) {
        alert("Por favor, digite uma nova senha.");
        return;
    }
    localStorage.setItem("nexus_3d_admin_pin", newPin);
    alert("Senha alterada com sucesso!");
    closeChangePinModal();
}

function handleBulkUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    let loadedCount = 0;

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const titleName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

            const newProduct = {
                id: (Date.now() + index).toString(),
                title: titleName,
                price: 50.00,
                category: "Decorativo",
                material: availableMaterials[0] || "PLA",
                dimensions: "10 x 10 x 10 cm",
                weight: "100g",
                printTime: "4h",
                image: e.target.result,
                inStock: true
            };

            catalog.unshift(newProduct);
            loadedCount++;

            if (loadedCount === files.length) {
                saveCatalog();
                renderCatalog();
                alert(`${files.length} peças carregadas com sucesso!`);
            }
        };
        reader.readAsDataURL(file);
    });
}

function openAddProductModal() {
    document.getElementById("formModalTitle").innerText = "Cadastrar Novo Modelo 3D";
    document.getElementById("productForm").reset();
    document.getElementById("formProductId").value = "";
    document.getElementById("formImagePreview").classList.add("hidden");
    currentImageData = "";
    document.getElementById("productFormModal").classList.remove("hidden");
}

function openEditProductModal(id, e) {
    if (e) e.stopPropagation();
    const prod = catalog.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("formModalTitle").innerText = "Editar Modelo 3D";
    document.getElementById("formProductId").value = prod.id;
    document.getElementById("formTitle").value = prod.title;
    document.getElementById("formPrice").value = prod.price;
    document.getElementById("formCategory").value = prod.category;
    document.getElementById("formMaterial").value = prod.material;
    document.getElementById("formDimensions").value = prod.dimensions || "";
    document.getElementById("formWeight").value = prod.weight || "";
    document.getElementById("formTime").value = prod.printTime || "";
    
    document.getElementById("formImageUrl").value = prod.image;
    document.getElementById("formImagePreview").src = prod.image;
    document.getElementById("formImagePreview").classList.remove("hidden");
    currentImageData = prod.image;

    document.getElementById("productFormModal").classList.remove("hidden");
}

function closeProductFormModal() {
    document.getElementById("productFormModal").classList.add("hidden");
}

function previewUrlImage() {
    const url = document.getElementById("formImageUrl").value;
    if (url) {
        document.getElementById("formImagePreview").src = url;
        document.getElementById("formImagePreview").classList.remove("hidden");
        currentImageData = url;
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            currentImageData = evt.target.result;
            document.getElementById("formImagePreview").src = currentImageData;
            document.getElementById("formImagePreview").classList.remove("hidden");
            document.getElementById("formImageUrl").value = "";
        };
        reader.readAsDataURL(file);
    }
}

function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById("formProductId").value;
    const title = document.getElementById("formTitle").value;
    const price = parseFloat(document.getElementById("formPrice").value);
    const category = document.getElementById("formCategory").value;
    const material = document.getElementById("formMaterial").value;
    const dimensions = document.getElementById("formDimensions").value;
    const weight = document.getElementById("formWeight").value;
    const printTime = document.getElementById("formTime").value;
    const image = currentImageData || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800";

    if (id) {
        const index = catalog.findIndex(p => p.id === id);
        if (index !== -1) {
            catalog[index] = { ...catalog[index], title, price, category, material, dimensions, weight, printTime, image };
        }
    } else {
        const newProduct = {
            id: Date.now().toString(),
            title,
            price,
            category,
            material,
            dimensions,
            weight,
            printTime,
            image,
            inStock: true
        };
        catalog.unshift(newProduct);
    }

    saveCatalog();
    renderCatalog();
    closeProductFormModal();
}

function deleteProduct(id, e) {
    if (e) e.stopPropagation();
    if (confirm("Tem certeza de que deseja apagar este modelo 3D do catálogo?")) {
        catalog = catalog.filter(p => p.id !== id);
        saveCatalog();
        renderCatalog();
    }
}