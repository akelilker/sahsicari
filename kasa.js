/* =================================================================
KASA DEFTERİ JS - v1.10 (DÜZELTILMIŞ)
✅ Negatif Sayı Koruma Eklendi
================================================================= */

// ==================== GLOBAL ====================
let kasaData = {
baslangicBakiye: 0,
kategoriler: ["Kasa","Maaş Ödemeleri","İşyeri Kira+Aidat","Sahibinden.com","Yemek","Yakıt","Noter","Sair Giderler","Ekspertiz","Oto Yıkama+Bakım","Kargo","Elektrik","Su","Çekici","GSM+İnternet","KDV Geçici+Kurumlar+Muhtasar+Diğer Vergi","Sigorta"],
islemler: []
};

let currentIslemTip = 'giris';
let selectedIslemId = null;
let currentKasaCategory = null;
const AUTH_KEY = "Karmotor_Guvenlik_Sifresi_2025";

// Kategori ikonları
const katIkonlar = {
"Kasa": "💰", "Maaş Ödemeleri": "👷", "İşyeri Kira+Aidat": "🏢", "Sahibinden.com": "🌐",
"Yemek": "🍽️", "Yakıt": "⛽", "Noter": "📜", "Sair Giderler": "📦", "Ekspertiz": "🔍",
"Oto Yıkama+Bakım": "🚗", "Kargo": "📬", "Elektrik": "⚡", "Su": "💧", "Çekici": "🚛",
"GSM+İnternet": "📱", "KDV Geçici+Kurumlar+Muhtasar+Diğer Vergi": "🧾", "Sigorta": "🛡️"
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
loadData();
setDefaultDate();
if (window.navigator.standalone === true) document.body.classList.add('ios-pwa');
});

// ==================== DATA ====================
async function loadData() {
try {
const res = await fetch(`kd_load.php?auth=${AUTH_KEY}&t=${Date.now()}`);
if (res.ok) {
const data = await res.json();
if (data && typeof data === 'object') kasaData = { ...kasaData, ...data };
}
} catch (_) { /* Varsayılan veri kullanılıyor */ }
updateAll();
}

async function saveData() {
try {
const res = await fetch(`kd_save.php?auth=${AUTH_KEY}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(kasaData)
});
return res.ok;
} catch (e) {
showNotification('Kayıt hatası!', 'error');
return false;
}
}

// ==================== UI UPDATE ====================
function updateAll() {
updateBakiye();
updateHistory();
updateKategoriGrid();
updateKategoriSelect();
updateKategoriListesi();
updateRaporOzet();

const inp = document.getElementById('baslangicBakiyeInput');
if (inp) inp.value = formatNum(kasaData.baslangicBakiye);

const mevcut = document.getElementById('mevcutBakiye');
if (mevcut) mevcut.textContent = formatMoney(kasaData.baslangicBakiye);

}

function updateBakiye() {
let giris = 0, cikis = 0;
kasaData.islemler.forEach(i => {
if (i.tip === 'giris') giris += i.tutar;
else cikis += i.tutar;
});
const bakiye = kasaData.baslangicBakiye + giris - cikis;

document.getElementById('toplamGiris').textContent = formatMoney(giris);
document.getElementById('toplamCikis').textContent = formatMoney(cikis);

const el = document.getElementById('anlikBakiye');
el.textContent = formatMoney(bakiye);
el.className = 'info-amount ' + (bakiye >= 0 ? 'text-income' : 'text-expense');
}

function updateHistory() {
const container = document.getElementById('historyContainer');
const islemler = [...kasaData.islemler].sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

if (islemler.length === 0) {
    container.innerHTML = '<p class="empty-state">Henüz işlem yok</p>';
    return;
}

let html = `
    <div id="transactionHistory">
        <h3 style="color:#b0bec5; font-size:0.95em; margin-bottom:10px; padding-left:5px;">Son İşlemler</h3>
`;

html += islemler.map(i => `
    <div class="history-item" data-islem-id="${i.id}">
        <div class="history-left">
            <div class="history-top-row">
                <span class="history-type ${i.tip === 'giris' ? 'gelen' : 'giden'}">
                    ${i.tip === 'giris' ? 'Gelen' : 'Giden'}
                </span>
                <span class="history-date">${formatDate(i.tarih)}</span>
            </div>
            <div>
                <span class="history-category">${i.kategori}</span>
                ${i.aciklama ? `<span class="history-meta"> - ${i.aciklama}</span>` : ''}
            </div>
        </div>
        
        <div class="history-right">
            <span class="history-amount ${i.tip === 'giris' ? 'text-income' : 'text-expense'}">
                ${formatMoney(i.tutar)}
            </span>
            </div>
    </div>
`).join('');

html += `</div>`;

container.innerHTML = html;

container.addEventListener('click', function(e) {
    const historyItem = e.target.closest('.history-item');
    if (historyItem && historyItem.dataset.islemId) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        showEditModal(historyItem.dataset.islemId);
    }
}, true);

}

function updateKategoriGrid() {
const grid = document.getElementById('kategoriGrid');
if (!grid) return;

const toplamlar = {};
kasaData.islemler.forEach(i => {
    if (i.tip === 'cikis') {
        toplamlar[i.kategori] = (toplamlar[i.kategori] || 0) + i.tutar;
    }
});

const giderKat = kasaData.kategoriler.filter(k => k !== 'Kasa');

grid.innerHTML = giderKat.map(k => `
    <div class="kategori-card" data-kategori="${k}">
        <div class="kat-icon">${katIkonlar[k] || '📁'}</div>
        <div class="kat-ad">${k.length > 12 ? k.substring(0,10) + '..' : k}</div>
        <div class="kat-tutar">${formatMoney(toplamlar[k] || 0)}</div>
    </div>
`).join('');

grid.addEventListener('click', function(e) {
    const card = e.target.closest('.kategori-card');
    if (card && card.dataset.kategori) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        showKasaCategoryDetails(card.dataset.kategori);
    }
}, true);

}

function updateKategoriSelect() {
const sel = document.getElementById('islemKategori');
const giderKat = kasaData.kategoriler.filter(k => k !== 'Kasa');

if (currentIslemTip === 'giris') {
    sel.innerHTML = '<option value="Kasa">Kasa</option>';
    sel.disabled = true;
} else {
    sel.disabled = false;
    sel.innerHTML = '<option value="">Kategori Seçin</option>' + giderKat.map(k => `<option value="${k}">${k}</option>`).join('');
}

}

function updateKategoriListesi() {
const list = document.getElementById('kategoriListesi');
if (!list) return;

const giderKat = kasaData.kategoriler.filter(k => k !== 'Kasa');
list.innerHTML = giderKat.map(k => `
    <div class="kategori-yonetim-item">
        <span>${katIkonlar[k] || '📁'} ${k}</span>
        <button class="kategori-sil-btn" data-kategori="${k}">🗑️</button>
    </div>
`).join('');

list.addEventListener('click', function(e) {
    const btn = e.target.closest('.kategori-sil-btn');
    if (btn && btn.dataset.kategori) {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        kategoriSil(btn.dataset.kategori);
    }
}, true);

}

function updateRaporOzet() {
const ozet = document.getElementById('raporOzet');
if (!ozet) return;

let giris = 0, cikis = 0;
kasaData.islemler.forEach(i => {
    if (i.tip === 'giris') giris += i.tutar;
    else cikis += i.tutar;
});
const bakiye = kasaData.baslangicBakiye + giris - cikis;

ozet.innerHTML = `
    <p><strong>Başlangıç:</strong> ${formatMoney(kasaData.baslangicBakiye)}</p>
    <p><strong>Toplam Giriş:</strong> <span style="color:#00e676">${formatMoney(giris)}</span></p>
    <p><strong>Toplam Çıkış:</strong> <span style="color:#ff1744">${formatMoney(cikis)}</span></p>
    <p><strong>Anlık Bakiye:</strong> <span style="color:${bakiye >= 0 ? '#00e676' : '#ff1744'}">${formatMoney(bakiye)}</span></p>
    <p><strong>İşlem Sayısı:</strong> ${kasaData.islemler.length}</p>
`;

}

// ==================== TAB ====================
function openKasaTab(evt, tabId) {
document.querySelectorAll('.modal-body .tab-content').forEach(t => t.style.display = 'none');
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
document.getElementById(tabId).style.display = 'block';
evt.currentTarget.classList.add('active');

if (tabId === 'kategoriDurumu') updateKategoriGrid();
if (tabId === 'raporlar') updateRaporOzet();

}

// ==================== İŞLEM ====================
function setIslemType(tip) {
currentIslemTip = tip;
document.getElementById('girisBtn').classList.toggle('active', tip === 'giris');
document.getElementById('cikisBtn').classList.toggle('active', tip === 'cikis');
updateKategoriSelect();
}

function islemKaydet() {
const tutarStr = document.getElementById('islemTutar').value.trim();
const tutar = parseMoney(tutarStr);
const kategori = document.getElementById('islemKategori').value;
const aciklama = document.getElementById('islemAciklama').value.trim();
const tarih = document.getElementById('islemTarih').value;

// ✅ NEGATIF KORUMA - 1. Satır: "-" işareti kontrol et
if (tutarStr.includes('-')) {
    return showNotification('Negatif tutar girilemez!', 'error');
}

// ✅ NEGATIF KORUMA - 2. Satır: Tutar validasyonu
if (!tutar || tutar <= 0) {
    return showNotification('Geçerli tutar girin!', 'error');
}

if (currentIslemTip === 'cikis' && !kategori) {
    return showNotification('Kategori seçin!', 'error');
}

kasaData.islemler.push({
    id: 'kd_' + Date.now() + '_' + Math.random().toString(36).substr(2,9),
    tip: currentIslemTip,
    tutar: Math.abs(tutar), // ✅ NEGATIF KORUMA - 3. Satır: Math.abs() ile güvenlik
    kategori: currentIslemTip === 'giris' ? 'Kasa' : kategori,
    aciklama: aciklama,
    tarih: tarih,
    olusturma: new Date().toISOString()
});

saveData().then(ok => {
    if (ok) {
        showNotification(currentIslemTip === 'giris' ? 'Para girişi kaydedildi!' : 'Para çıkışı kaydedildi!');
        document.getElementById('islemTutar').value = '';
        document.getElementById('islemAciklama').value = '';
        updateAll();
    }
});

}

// ==================== EDIT MODAL ====================
function showEditModal(id) {
selectedIslemId = id;
const i = kasaData.islemler.find(x => x.id === id);
if (!i) return;

const katOptions = kasaData.kategoriler
    .filter(k => i.tip === 'giris' ? k === 'Kasa' : k !== 'Kasa')
    .map(k => `<option value="${k}" ${i.kategori === k ? 'selected' : ''}>${k}</option>`)
    .join('');

const editModalContent = document.getElementById('editModalContent');
editModalContent.innerHTML = `
    <div class="edit-form-group">
        <label>Tutar (₺)</label>
        <input id="editTutar" class="edit-input" type="text" value="${formatNum(i.tutar)}" oninput="formatCurrency(this)">
    </div>
    <div class="edit-form-group">
        <label>Kategori</label>
        <select id="editKategori" class="edit-input" ${i.tip === 'giris' ? 'disabled' : ''}>
            ${katOptions}
        </select>
    </div>
    <div class="edit-form-group">
        <label>Tarih</label>
        <input id="editTarih" class="edit-input" type="date" value="${i.tarih}">
    </div>
    <div class="edit-form-group">
        <label>Açıklama</label>
        <input id="editAciklama" class="edit-input" type="text" value="${i.aciklama || ''}">
    </div>
    
    <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn btn-success edit-update-btn" style="flex:1;">💾 Güncelle</button>
        <button class="btn edit-delete-btn" style="flex:1; border-color:#ff1744; color:#ff1744;">🗑️ Sil</button>
    </div>
    <div style="margin-top:10px;">
         <button class="btn edit-cancel-btn" style="width:100%;">İptal</button>
    </div>
`;

editModalContent.addEventListener('click', function(e) {
    if (e.target.closest('.edit-update-btn')) {
        e.stopPropagation();
        e.preventDefault();
        islemGuncelle();
    } else if (e.target.closest('.edit-delete-btn')) {
        e.stopPropagation();
        e.preventDefault();
        islemSil();
    } else if (e.target.closest('.edit-cancel-btn')) {
        e.stopPropagation();
        e.preventDefault();
        closeEditModal();
    }
}, true);

const modalFooter = document.querySelector('#editModal .modal-body > div:last-child');
if(modalFooter && modalFooter.id !== 'editModalContent') {
    modalFooter.style.display = 'none'; 
}

document.getElementById('editModal').classList.add('show');

}

function islemGuncelle() {
if (!selectedIslemId) return;

const tutarStr = document.getElementById('editTutar').value.trim();
const tutar = parseMoney(tutarStr);
const kategori = document.getElementById('editKategori').value;
const tarih = document.getElementById('editTarih').value;
const aciklama = document.getElementById('editAciklama').value.trim();

// ✅ NEGATIF KORUMA - Edit modal'da da aynı kontrol
if (tutarStr.includes('-')) {
    return showNotification('Negatif tutar girilemez!', 'error');
}

if (tutar <= 0) {
    return showNotification('Geçerli tutar girin!', 'error');
}

const index = kasaData.islemler.findIndex(x => x.id === selectedIslemId);
if (index > -1) {
    kasaData.islemler[index].tutar = Math.abs(tutar); // ✅ NEGATIF KORUMA
    kasaData.islemler[index].kategori = kategori;
    kasaData.islemler[index].tarih = tarih;
    kasaData.islemler[index].aciklama = aciklama;
    
    saveData().then(ok => {
        if (ok) {
            showNotification('İşlem güncellendi!');
            closeEditModal();
            updateAll();
        }
    });
}

}

function closeEditModal() {
document.getElementById('editModal').classList.remove('show');
selectedIslemId = null;
}

function islemSil() {
if (!selectedIslemId || !confirm('Bu işlemi silmek istediğinize emin misiniz?')) return;
kasaData.islemler = kasaData.islemler.filter(i => i.id !== selectedIslemId);
saveData().then(ok => {
if (ok) {
showNotification('İşlem silindi!');
closeEditModal();
updateAll();
}
});
}

// ==================== KATEGORİ ====================
function kategoriEkle() {
const inp = document.getElementById('yeniKategoriAdi');
const ad = inp.value.trim();
if (!ad) return showNotification('Kategori adı girin!', 'error');
if (kasaData.kategoriler.includes(ad)) return showNotification('Bu kategori zaten var!', 'error');

kasaData.kategoriler.push(ad);
inp.value = '';
saveData().then(ok => {
    if (ok) {
        showNotification('Kategori eklendi!');
        updateAll();
    }
});

}

function kategoriSil(ad) {
if (ad === 'Kasa') return showNotification('Kasa silinemez!', 'error');
if (kasaData.islemler.some(i => i.kategori === ad)) {
if (!confirm('Bu kategoride işlem var. Silmek istiyor musunuz?')) return;
}
kasaData.kategoriler = kasaData.kategoriler.filter(k => k !== ad);
saveData().then(ok => {
if (ok) {
showNotification('Kategori silindi!');
updateAll();
}
});
}

// ==================== KASA KATEGORİ DETAY ====================

function showKasaCategoryDetails(kategoriAdi) {
currentKasaCategory = kategoriAdi;
const modal = document.getElementById('kasaCategoryDetailModal');
const title = document.getElementById('kasaCategoryTitle');
const content = document.getElementById('kasaCategoryDetailContent');

title.innerHTML = `${katIkonlar[kategoriAdi] || '📂'} ${kategoriAdi}`;

let islemListesi = kasaData.islemler.filter(i => i.kategori === kategoriAdi);
islemListesi.sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

if (islemListesi.length === 0) {
    content.innerHTML = '<div class="empty-state">Bu kategoride henüz işlem yok.</div>';
} else {
    let totalTutar = 0;
    
    let html = `
        <table class="detail-table" style="width:100%; border-collapse:collapse; font-size:0.85em;">
            <thead>
                <tr>
                    <th style="text-align:left; padding:8px; color:#b0bec5;">Tarih</th>
                    <th style="text-align:right; padding:8px; color:#b0bec5;">Tutar</th>
                    <th style="text-align:left; padding:8px; color:#b0bec5;">Açıklama</th>
                </tr>
            </thead>
            <tbody>
    `;

    islemListesi.forEach(t => {
        totalTutar += t.tutar;
        const dateStr = new Date(t.tarih).toLocaleDateString('tr-TR');
        const colorClass = t.tip === 'giris' ? '#00e676' : '#ff1744'; 
        
        html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px; color:#e0e0e0;">${dateStr}</td>
                <td style="padding:8px; text-align:right; color:${colorClass}; font-weight:bold;">
                    ${formatMoney(t.tutar)}
                </td>
                <td style="padding:8px; color:#90a4ae;">${t.aciklama || '-'}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    
    html += `
        <div style="margin-top:15px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.2); text-align:right;">
            <span style="color:#b0bec5; font-size:0.9em;">Toplam:</span>
            <span style="color:#e0e0e0; font-size:1.1em; font-weight:bold; margin-left:5px;">${formatMoney(totalTutar)}</span>
        </div>
    `;

    content.innerHTML = html;
}

const btnExcel = document.getElementById('btnKasaCategoryExcel');
if(btnExcel) {
    btnExcel.onclick = () => exportKasaCategoryExcel(kategoriAdi, islemListesi);
}

modal.classList.add('show');
modal.style.display = 'flex';

}

function closeKasaCategoryModal() {
const modal = document.getElementById('kasaCategoryDetailModal');
modal.classList.remove('show');
modal.style.display = 'none';
currentKasaCategory = null;
}

function exportKasaCategoryExcel(kategoriAdi, transactions) {
if (!transactions || transactions.length === 0) return showNotification('Dışa aktarılacak veri yok!', 'error');

const data = [];

data.push([
    { v: `KASA - ${kategoriAdi.toUpperCase()} DETAY RAPORU`, s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2E7D32" } } } }
]);
data.push([]);

data.push([
    { v: "Tarih", s: { font: { bold: true }, border: { bottom: { style: "thin" } } } },
    { v: "İşlem Tipi", s: { font: { bold: true }, border: { bottom: { style: "thin" } } } },
    { v: "Tutar", s: { font: { bold: true }, border: { bottom: { style: "thin" } } } },
    { v: "Açıklama", s: { font: { bold: true }, border: { bottom: { style: "thin" } } } }
]);

let total = 0;

transactions.forEach(t => {
    total += t.tutar;
    data.push([
        { v: new Date(t.tarih).toLocaleDateString('tr-TR') },
        { v: t.tip === 'giris' ? 'Giriş' : 'Çıkış' },
        { v: t.tutar, t: 'n', s: { numFmt: "#,##0.00" } },
        { v: t.aciklama || '' }
    ]);
});

data.push([]);
data.push([
    { v: "TOPLAM", s: { font: { bold: true } } },
    { v: "" },
    { v: total, t: 'n', s: { font: { bold: true }, numFmt: "#,##0.00" } },
    { v: "" }
]);

const ws = XLSX.utils.aoa_to_sheet(data);
ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];
ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Kategori Detay");

XLSX.writeFile(wb, `Kasa_${kategoriAdi}_Rapor.xlsx`);
showNotification('Excel indirildi! ✅');

}

// ==================== BAKİYE ====================
function bakiyeKaydet() {
const val = parseMoney(document.getElementById('baslangicBakiyeInput').value);
if (isNaN(val)) return showNotification('Geçerli tutar girin!', 'error');
kasaData.baslangicBakiye = val;
saveData().then(ok => {
if (ok) {
showNotification('Bakiye güncellendi!');
updateAll();
}
});
}

// ==================== RAPOR ====================
function setPeriod(period) {
document.querySelectorAll('.rd-toggle-btn').forEach(b => b.classList.remove('active'));
document.querySelector(`[data-period="${period}"]`).classList.add('active');

const today = new Date();
let start = '', end = today.toISOString().split('T')[0];

if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
} else if (period === 'week') {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    start = weekStart.toISOString().split('T')[0];
}

document.getElementById('raporBaslangic').value = start;
document.getElementById('raporBitis').value = end;

}

// ==================== EXCEL ====================
function excelExport() {
if (kasaData.islemler.length === 0) return showNotification('Dışa aktarılacak işlem yok!', 'error');

const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} }
};

const cellStyle = {
    border: { top:{style:"thin",color:{rgb:"CCCCCC"}}, bottom:{style:"thin",color:{rgb:"CCCCCC"}}, left:{style:"thin",color:{rgb:"CCCCCC"}}, right:{style:"thin",color:{rgb:"CCCCCC"}} },
    alignment: { vertical: "center" }
};

const data = [];

data.push([{ v: "KASA DEFTERİ", s: { ...headerStyle, font: { ...headerStyle.font, sz: 14 } } }]);

const baslangic = document.getElementById('raporBaslangic').value;
const bitis = document.getElementById('raporBitis').value;
if (baslangic && bitis) {
    data.push([{ v: `${formatDate(baslangic)} - ${formatDate(bitis)}`, s: cellStyle }]);
}

data.push([]);

data.push([
    { v: "Tarih", s: headerStyle },
    { v: "Gelen TL", s: headerStyle },
    { v: "Giden TL", s: headerStyle },
    { v: "Bakiye", s: headerStyle },
    { v: "Açıklama", s: headerStyle }
]);

let islemler = [...kasaData.islemler].sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

if (baslangic) islemler = islemler.filter(i => i.tarih >= baslangic);
if (bitis) islemler = islemler.filter(i => i.tarih <= bitis);

let runningBalance = kasaData.baslangicBakiye;

islemler.forEach(i => {
    if (i.tip === 'giris') runningBalance += i.tutar;
    else runningBalance -= i.tutar;
    
    const gelenStyle = { ...cellStyle, font: { color: { rgb: "00B050" } } };
    const gidenStyle = { ...cellStyle, font: { color: { rgb: "FF0000" } } };
    
    data.push([
        { v: formatDate(i.tarih), s: cellStyle },
        { v: i.tip === 'giris' ? formatNum(i.tutar) : '', s: gelenStyle },
        { v: i.tip === 'cikis' ? formatNum(i.tutar) : '', s: gidenStyle },
        { v: formatNum(runningBalance), s: { ...cellStyle, font: { color: { rgb: runningBalance >= 0 ? "00B050" : "FF0000" } } } },
        { v: `${i.kategori}${i.aciklama ? ' - ' + i.aciklama : ''}`, s: cellStyle }
    ]);
});

const ws = XLSX.utils.aoa_to_sheet(data);
ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Kasa Defteri");

XLSX.writeFile(wb, `Kasa_Defteri_${new Date().toISOString().split('T')[0]}.xlsx`);
showNotification('Excel indirildi!');

}

// ==================== HELPERS ====================
function formatMoney(n) { return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatNum(n) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function parseMoney(s) { if (!s) return 0; return parseFloat(s.replace(/[₺\s]/g,'').replace(/\./g,'').replace(',','.')) || 0; }
function formatCurrency(inp) {
// ✅ NEGATIF KORUMA: Sadece sayı ve virgül izin ver
let v = inp.value.replace(/[^0-9,]/g,'');

if (!v) {
    inp.value = '';
    return;
}

const p = v.split(',');
if (p.length > 2) v = p[0] + ',' + p.slice(1).join('');
if (p.length === 2 && p[1].length > 2) v = p[0] + ',' + p[1].substring(0,2);
inp.value = v;

}
function formatDate(d) { return new Date(d).toLocaleDateString('tr-TR'); }
function setDefaultDate() {
const today = new Date().toISOString().split('T')[0];
document.getElementById('islemTarih').value = today;
updateDateDisplay();
}
function updateDateDisplay() {
const d = document.getElementById('islemTarih').value;
document.getElementById('tarihDisplay').textContent = formatDate(d);
}
function showNotification(msg, type = 'success') {
const n = document.getElementById('notification');
n.textContent = msg;
n.className = 'notification show' + (type === 'error' ? ' error' : '');
setTimeout(() => n.classList.remove('show'), 3000);
}
