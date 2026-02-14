function formatDateTR(dateObj) {
    if (!dateObj) return '';
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}.${m}.${y}`;
}
const API_SECRET_KEY = "Karmotor_Guvenlik_Sifresi_2025";
const APP_VERSION = '79.19';

const safeStorage = {
    getItem: function(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('Storage erişimi engellendi (Okuma):', e);
            return null;
        }
    },
    setItem: function(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('Storage erişimi engellendi (Yazma):', e);
        }
    },
    removeItem: function(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Storage erişimi engellendi (Silme):', e);
        }
    },
    clear: function() {
        try {
            localStorage.clear();
        } catch (e) {
            console.warn('Storage erişimi engellendi (Temizleme):', e);
        }
    }
};

function setVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVh);
setVh();

function setCurrentDate() {
    const d = new Date();
    const dateDisplayEl = DOM.dateDisplay;
    if (dateDisplayEl) dateDisplayEl.textContent = formatDateTR(d);
    
    const modalDateDisplays = document.querySelectorAll('.current-date-display');
    modalDateDisplays.forEach(el => el.textContent = formatDateTR(d));

    if(DOM.dateInput) {
        const localDateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        DOM.dateInput.value = localDateStr;
    }
    transactionDateHolder = getLocalTimeISO(); 
    
    if (typeof updateAllMobileDateDisplays === 'function') {
        setTimeout(updateAllMobileDateDisplays, 50);
    }
    
}

function getLocalTimeISO() {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    return d.toISOString();
}

function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    const strValue = String(str);
    return strValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatTitleCase(str) {
    if (!str) return "";
    return str.toLocaleLowerCase('tr-TR').split(' ').map(word => 
        word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
    ).join(' ');
}

function deformatCurrency(value) {
    if (value === null || value === undefined) return 0;
    const stringValue = String(value);
    if (stringValue.trim() === '') return 0;
    const cleanValue = stringValue.replace(/₺|\s|\./g, '').replace(',', '.');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
}

function formatCurrency(input) {
    if (!input) return;
    let value = input.value;
    if (value === "" || value === undefined || value === null) return;
    let cleanValue = String(value).replace(/[^\d,]/g, '');
    let parts = cleanValue.split(',');
    let integerPart = parts[0].replace(/\D/g, '');
    let decimalPart = parts.length > 1 ? parts[1] : undefined;
    if (integerPart === "") integerPart = "0";
    let formattedInteger = new Intl.NumberFormat('tr-TR').format(parseInt(integerPart, 10) || 0);
    let newValue = formattedInteger;
    if (decimalPart !== undefined) {
        newValue += ',' + decimalPart.substring(0, 2);
    } else if (String(value).includes(',')) {
        newValue += ',';
    }
    input.value = newValue;
}

function formatNumber(num) {
    const number = parseFloat(num);
    if (isNaN(number)) return '0,00';
    return number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(amount) {
    return '₺' + formatNumber(amount);
}

let allData = {};
let hasLoadedServerData = false;
let notificationHistory = [];
let transactionDateHolder = null;
let currentPerson = null;
let currentCategoryTransactions = [];
let exportInProgress = false;
let editingTransactionId = null; 
let isProcessing = false; 
let quickPersonSelectedValue = null; 
let quickAllocationDesc = '';
let quickAllocationCategory = ''; 
let currentReportFilterType = 'all';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const defaultCategories = ['Elden', 'Havale/EFT', 'Pınar H.', 'İş Bankası KK', 'Black KK', 'Ek Hesap', 'Fiesta']; 

const GLOW_THEMES = ['white', 'blue', 'lila', 'green', 'red', 'gold', 'cyan', 'none']; 

const DOM = {
    personSelect: null,
    transactionType: null,
    amount: null,
    category: null,
    description: null,
    dateInput: null,
    statusDot: null,
    serverStatusText: null,
    totalReceivable: null,
    totalPayable: null,
    totalPeople: null,
    quickAccessGrid: null,
    notification: null,
    transactionHistory: null,
    categoryBalanceGrid: null,
    personModal: null,
    editTransactionModal: null,
    categoryDetailModal: null,
    settingsMenu: null,
    notificationMenu: null,
    colorSelectionMenu: null,
    addTransactionBtn: null,
    gidenBtn: null,
    gelenBtn: null,
    dateDisplay: null,
    memAlertIcon: null,
    mainAppContainer: null,
    reportPreviewList: null,
    reportPreviewSummary: null,
    startDate: null,
    endDate: null,
    reportSearchInput: null
};

function initDOMCache() {
    DOM.personSelect = document.getElementById('personSelect');
    DOM.transactionType = document.getElementById('transactionType');
    DOM.amount = document.getElementById('amount');
    DOM.category = document.getElementById('category');
    DOM.description = document.getElementById('description');
    DOM.dateInput = document.getElementById('dateInput');
    DOM.statusDot = document.getElementById('statusDot');
    DOM.serverStatusText = document.getElementById('serverStatusText');
    DOM.totalReceivable = document.getElementById('totalReceivable');
    DOM.totalPayable = document.getElementById('totalPayable');
    DOM.totalPeople = document.getElementById('totalPeople');
    DOM.quickAccessGrid = document.getElementById('quickAccessGrid');
    DOM.notification = document.getElementById('notification');
    DOM.transactionHistory = document.getElementById('transactionHistory');
    DOM.categoryBalanceGrid = document.getElementById('categoryBalanceGrid');
    DOM.personModal = document.getElementById('personModal');
    DOM.editTransactionModal = document.getElementById('editTransactionModal');
    DOM.categoryDetailModal = document.getElementById('categoryDetailModal');
    DOM.settingsMenu = document.getElementById('settingsMenu');
    DOM.notificationMenu = document.getElementById('notificationMenu');
    DOM.colorSelectionMenu = document.getElementById('colorSelectionMenu');
    DOM.addTransactionBtn = document.getElementById('addTransactionBtn');
    DOM.gidenBtn = document.getElementById('gidenBtn');
    DOM.gelenBtn = document.getElementById('gelenBtn');
    DOM.dateDisplay = document.getElementById('currentDateDisplay');
    DOM.memAlertIcon = document.getElementById('memAlertIcon');
    DOM.mainAppContainer = document.getElementById('mainAppContainer');
    
    DOM.reportPreviewList = document.getElementById('reportPreviewList');
    DOM.reportPreviewSummary = document.getElementById('reportPreviewSummary');
    DOM.startDate = document.getElementById('startDate');
    DOM.endDate = document.getElementById('endDate');
    DOM.reportSearchInput = document.getElementById('reportSearchInput');

    if (DOM.amount) {
        DOM.amount.addEventListener('blur', function() {
            const type = DOM.transactionType ? DOM.transactionType.value : 'giden';
            if (type === 'gelen' && deformatCurrency(this.value) > 0) {
                initiateAllocation();
            }
        });

        DOM.amount.addEventListener('keydown', function(event) {
            const type = DOM.transactionType ? DOM.transactionType.value : 'giden';
            if ((event.key === 'Enter' || event.key === 'Tab') && type === 'gelen' && deformatCurrency(this.value) > 0) {
                event.preventDefault();
                initiateAllocation();
            }
        });
    }

    if (DOM.startDate) DOM.startDate.addEventListener('change', renderReportPreview);
    if (DOM.endDate) DOM.endDate.addEventListener('change', renderReportPreview);
    if (DOM.reportSearchInput) DOM.reportSearchInput.addEventListener('input', renderReportPreview);

    const zeroToggle = document.getElementById('showZeroBalanceToggle');
    if (zeroToggle) {
        zeroToggle.addEventListener('change', () => {
             if(currentPerson && document.getElementById('kategoriDurumu').style.display === 'block') {
                 updateCategoryBalanceDisplay(currentPerson);
             }
        });
    }
}

let saveTimer = null;

function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    
    if (!hasLoadedServerData) {
        console.warn("⚠️ Veriler sunucudan henüz tam yüklenmediği için otomatik kayıt engellendi.");
        return;
    }

    saveTimer = setTimeout(async () => {
        if (!allData.metadata) allData.metadata = {};
        allData.metadata.lastUpdate = new Date().toISOString();
        try {
            if (Object.keys(allData).length > 0 && navigator.onLine && hasLoadedServerData) {
                await saveDataToServer(allData, false);
                await advancedStorage.removeItem('sahsiHesapTakibiData');
            } else {
                await advancedStorage.setItem('sahsiHesapTakibiData', JSON.stringify(allData));
            }
            await advancedStorage.setItem('sahsiHesapTakibiNotifications', JSON.stringify(notificationHistory));
        } catch (error) {
            await advancedStorage.setItem('sahsiHesapTakibiData', JSON.stringify(allData));
        }
        saveTimer = null;
    }, 1000);
}

if (location.protocol !== 'file:') {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('service_worker.js?v=' + APP_VERSION).catch(console.error);
}

window.addEventListener('load', async function() {
    initDOMCache();
    updateVersionDisplay();
    await loadGlowTheme();
    updateServerStatus('', '📡 Veriler yükleniyor...');

    loadData().then(async () => {
        const savedNotifications = await advancedStorage.getItem('sahsiHesapTakibiNotifications');
        if (savedNotifications) notificationHistory = JSON.parse(savedNotifications);

        migrateOldDataSafely();
        updateMainDisplay();
        setCurrentDate();
    });
});

function updateServerStatus(type, message) {
    const dot = DOM.statusDot;
    const text = DOM.serverStatusText;
    if (!dot || !text) return;
    
    dot.className = 'status-dot';
    text.className = ''; 
    text.style.color = ''; 

    if (type === 'success') {
        dot.classList.add('online');
        text.classList.add('text-online'); 
        text.textContent = 'Sistem hazır'; 
    } else if (type === 'error') {
        dot.classList.add('offline');
        text.classList.add('text-offline'); 
        text.textContent = 'Bağlantı Hatası';
    } else {
        dot.classList.add('syncing');
        text.textContent = message || 'İşleniyor...';
        text.style.color = '#ffea00'; 
    }
}

async function testServerConnection() {
    updateServerStatus('', '🔄 Bağlantı test ediliyor...');
    try {
        const response = await fetch('load.php?test=1&auth=' + API_SECRET_KEY, { 
            method: 'GET', 
            headers: { 
                'Accept': 'application/json'
            } 
        });
        
        if (response.ok) {
            const text = await response.text();
            if (text.includes('success') || text.trim().startsWith('{')) { 
                updateServerStatus('success', '✅ Sunucu Bağlantısı & Yetki Başarılı');
            } else {
                updateServerStatus('error', '❌ Şifre/Yetki Hatası!'); 
            }
        } else {
            updateServerStatus('error', `❌ HTTP Hatası: ${response.status}`);
        }
    } catch (error) {
        updateServerStatus('error', '❌ Sunucuya Ulaşılamadı');
    }
}

function saveDataToServer(data, force = false) {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        console.warn("🛑 GÜVENLİK: Boş veya hatalı veri kaydedilmeye çalışıldı! İşlem iptal edildi.");
        return Promise.reject("Boş veri koruması: Kayıt iptal edildi.");
    }

    let url = 'save.php?auth=' + API_SECRET_KEY;
    if (force) url += '&force=true';

    return fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (response.status === 409) {
            throw new Error("ANTI-WIPE: Sunucu veri kaybını engelledi.");
        }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
    }).then(text => {
        try {
            const result = JSON.parse(text);
            updateServerStatus('success', '✅ Sunucuya kaydedildi');
            return result;
        } catch (e) { throw new Error('Sunucu hatası: ' + text); }
    }).catch(error => {
        console.error(error);
        updateServerStatus('error', '❌ Kayıt Hatası');
        throw error;
    });
}

function loadDataFromServer() {
    return fetch('load.php?auth=' + API_SECRET_KEY, { 
        method: 'GET', 
        headers: { 
            'Accept': 'application/json'
        } 
    })
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
    })
    .then(text => {
        try {
            const result = JSON.parse(text);
            if (result.status === 'success' && result.data) return result.data;
            if (typeof result === 'object') return result;
            
            throw new Error('Veri alınamadı');
        } catch (e) { throw new Error('Sunucu hatası: ' + text); }
    });
}

async function loadData() {
    try {
        const serverData = await loadDataFromServer();
        if (serverData && Object.keys(serverData).length > 0) {
            allData = serverData;
            hasLoadedServerData = true;
            updateServerStatus('success', '✅ Sunucudan yüklendi');
            return true;
        } else {
            const savedData = await advancedStorage.getItem('sahsiHesapTakibiData');
            if (savedData) {
                allData = JSON.parse(savedData);
                hasLoadedServerData = false;
                updateServerStatus('success', '✅ Yerel veri yüklendi');
            } else {
                hasLoadedServerData = false;
                updateServerStatus('success', '✅ Yeni sistem hazır');
            }
            return true;
        }
    } catch (error) {
        updateServerStatus('error', '❌ Bağlantı hatası');
        const savedData = await advancedStorage.getItem('sahsiHesapTakibiData');
        if (savedData) allData = JSON.parse(savedData);
        return false;
    }
}

function migrateOldDataSafely() {
    let changed = false;
    try {
        if (!allData.metadata) { allData.metadata = {}; changed = true; }
        Object.keys(allData).forEach(person => {
            if (person === 'metadata') return;
            if (!allData[person] || typeof allData[person] !== 'object') { allData[person] = {}; changed = true; }
            if (!Array.isArray(allData[person].categories)) { allData[person].categories = [...defaultCategories]; changed = true; }
            if (!allData[person].categoryBalances) { allData[person].categoryBalances = {}; changed = true; }
            if (typeof allData[person].isFavorite === 'undefined') { allData[person].isFavorite = false; changed = true; }
            
            if (!allData[person].categories.includes('Avans')) {
                allData[person].categories.push('Avans');
                allData[person].categoryBalances['Avans'] = 0;
                changed = true;
            }
            
            allData[person].categories.forEach(category => {
                if (typeof allData[person].categoryBalances[category] !== 'number') {
                    allData[person].categoryBalances[category] = 0;
                    changed = true;
                }
            });
        });
        if (changed) queueSave();
    } catch (error) { console.error('Migrasyon hatası:', error); }
}

function calculateAllBalances(person) {
    if (!allData[person]) return;
    if (!allData[person].categoryBalances) allData[person].categoryBalances = {};
    if (allData[person].categories) {
        allData[person].categories.forEach(cat => { allData[person].categoryBalances[cat] = 0; });
    }
    Object.keys(allData[person]).forEach(year => {
        if (['categories', 'categoryBalances', 'metadata', 'isFavorite'].includes(year)) return;
        Object.keys(allData[person][year]).forEach(month => {
            const monthData = allData[person][year][month];
            if (monthData && monthData.transactions) {
                monthData.transactions.forEach(t => {
                    if (allData[person].categoryBalances[t.category] === undefined) {
                        allData[person].categoryBalances[t.category] = 0;
                    }
                    if (t.type === 'giden') {
                        allData[person].categoryBalances[t.category] += t.amount;
                    } else {
                        allData[person].categoryBalances[t.category] -= t.amount;
                    }
                });
            }
        });
    });
    updateDisplays(person);
}

function calculatePersonTotalBalance(person) {
    if (!allData[person] || !allData[person].categoryBalances) return 0;
    let totalBalance = 0;
    Object.values(allData[person].categoryBalances).forEach(balance => totalBalance += (balance || 0));
    return totalBalance;
}

function updateMainDisplay() {
    let totalRec = 0, totalPay = 0;
    Object.keys(allData).forEach(p => {
        if(p === 'metadata') return;
        const bal = calculatePersonTotalBalance(p);
        if(bal > 0.01) totalRec += bal;
        else if(bal < -0.01) totalPay += Math.abs(bal);
    });
    
    if(DOM.totalReceivable) DOM.totalReceivable.textContent = formatAmount(totalRec);
    if(DOM.totalPayable) DOM.totalPayable.textContent = formatAmount(totalPay);
    if(DOM.totalPeople) DOM.totalPeople.textContent = Object.keys(allData).filter(p => p !== 'metadata').length;
    
    if(DOM.personSelect) populatePersonSelect(DOM.personSelect);
    updateQuickGrid();
}

let draggedElement = null;
let draggedIndex = null;

function safeDisplayName(name) {
    if (!name) return '';
    return (name.length > 15) ? name.substring(0, 15) + '…' : name;
}

function updateQuickGrid() {
    if (!DOM.quickAccessGrid) return;
    
    let html = '';
    const allPeople = Object.keys(allData).filter(p => p !== 'metadata').sort();
    let displayPeople = allPeople.filter(p => allData[p].isFavorite);
    
    if (allData.metadata && allData.metadata.favoriteOrder) {
        const favOrder = allData.metadata.favoriteOrder;
        displayPeople = displayPeople.sort((a, b) => {
            const indexA = favOrder.indexOf(a);
            const indexB = favOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }
    
    if (displayPeople.length === 0) displayPeople = allPeople.slice(0, 4);
    displayPeople = displayPeople.slice(0, 4);

    displayPeople.forEach((person, index) => {
        const safeName = person.replace(/'/g, "\\'");
        let displayName = person;
        if (displayName.length > 9) displayName = safeDisplayName(displayName).substring(0, 9) + '..';

        const balance = calculatePersonTotalBalance(person);
        let statusClass = ''; 
        if (balance > 0.01) statusClass = 'alacakli';
        else if (balance < -0.01) statusClass = 'borclu';

        html += `
        <div class="quick-item" 
             draggable="true" 
             data-person="${safeName}"
             data-index="${index}"
             onclick="handleQuickItemClick(event, '${safeName}')"
             ondragstart="handleDragStart(event, ${index})"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event, ${index})"
             ondragend="handleDragEnd(event)"
             ontouchstart="handleTouchStart(event, ${index})"
             ontouchmove="handleTouchMove(event)"
             ontouchend="handleTouchEnd(event, ${index})">
            <span class="q-icon ${statusClass}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28px" height="28px">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </span>
            <span class="q-name" data-fullname="${sanitizeHTML(person).replace(/"/g, '&quot;')}" title="${sanitizeHTML(person).replace(/"/g, '&quot;')}">${sanitizeHTML(displayName)}</span>
        </div>`;
    });

    DOM.quickAccessGrid.innerHTML = html;
}

function handleQuickItemClick(event, person) {
    if (justDragged) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    if (!event.defaultPrevented) {
        openPersonModal(person);
    }
}

function handleDragStart(event, index) {
    draggedIndex = index;
    event.target.style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.innerHTML);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const target = event.target.closest('.quick-item');
    if (target) {
        document.querySelectorAll('.quick-item').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
    }
    return false;
}

function handleDrop(event, dropIndex) {
    event.stopPropagation();
    event.preventDefault();
    
    document.querySelectorAll('.quick-item').forEach(el => el.classList.remove('drag-over'));
    
    const target = event.target.closest('.quick-item');
    if (target && target.dataset.index) {
        dropIndex = parseInt(target.dataset.index);
    }
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        reorderFavorites(draggedIndex, dropIndex);
    }
    
    return false;
}

function handleDragEnd(event) {
    event.target.style.opacity = '';
    if (draggedIndex !== null) {
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 100);
    }
    draggedIndex = null;
}

let touchStartX, touchStartY;
let isTouchDragging = false;
let touchDraggedIndex = null;

function handleTouchStart(event, index) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchDraggedIndex = index;
    isTouchDragging = false;
}

function handleTouchMove(event) {
    if (touchDraggedIndex === null) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    if (deltaX > 10 || deltaY > 10) {
        isTouchDragging = true;
        event.preventDefault();
        
        const draggedEl = document.querySelector(`.quick-item[data-index="${touchDraggedIndex}"]`);
        if (draggedEl) draggedEl.style.opacity = '0.5';
        
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetItem = elementBelow?.closest('.quick-item');
        
        document.querySelectorAll('.quick-item').forEach(el => el.classList.remove('drag-over'));
        
        if (targetItem && targetItem.dataset.index !== String(touchDraggedIndex)) {
            targetItem.classList.add('drag-over');
        }
    }
}

function handleTouchEnd(event, originalDropIndex) {
    document.querySelectorAll('.quick-item').forEach(el => {
        el.classList.remove('drag-over');
        el.style.opacity = '';
    });
    
    if (!isTouchDragging) {
        touchDraggedIndex = null;
        return;
    }
    
    event.preventDefault();
    
    const touch = event.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetItem = elementBelow?.closest('.quick-item');
    
    let dropIndex = originalDropIndex;
    if (targetItem && targetItem.dataset.index) {
        dropIndex = parseInt(targetItem.dataset.index);
    }
    
    if (touchDraggedIndex !== null && touchDraggedIndex !== dropIndex) {
        reorderFavorites(touchDraggedIndex, dropIndex);
    }
    
    touchDraggedIndex = null;
    isTouchDragging = false;
}

let justDragged = false;

function reorderFavorites(fromIndex, toIndex) {
    
    const allPeople = Object.keys(allData).filter(p => p !== 'metadata').sort();
    let displayPeople = allPeople.filter(p => allData[p].isFavorite);
    
    if (allData.metadata && allData.metadata.favoriteOrder) {
        const favOrder = allData.metadata.favoriteOrder;
        displayPeople = displayPeople.sort((a, b) => {
            const indexA = favOrder.indexOf(a);
            const indexB = favOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }
    
    displayPeople = displayPeople.slice(0, 4);
    
    if (fromIndex < 0 || fromIndex >= displayPeople.length || toIndex < 0 || toIndex >= displayPeople.length) {
        return;
    }
    
    const movedPerson = displayPeople[fromIndex];
    
    displayPeople.splice(fromIndex, 1);
    displayPeople.splice(toIndex, 0, movedPerson);
    
    allData.metadata.favoriteOrder = displayPeople;
    
    queueSave();
    updateQuickGrid();
    showNotification('✅ Sıralama güncellendi', 'success');
    
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 100);
}

async function showNotification(message, type = 'info') {
    const notification = DOM.notification || document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'notification show';
    notification.classList.add(type);

    notificationHistory.push({
        message: message,
        type: type,
        date: new Date().toISOString()
    });

    if (notificationHistory.length > 20) notificationHistory.shift();
    await advancedStorage.setItem('sahsiHesapTakibiNotifications', JSON.stringify(notificationHistory));

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function populateCategorySelect(selectElement, person) {
    if (!selectElement || !allData[person]) return;
    const cats = allData[person]?.categories || defaultCategories;
    const balances = allData[person]?.categoryBalances || {};
    
    const transactionType = DOM.transactionType?.value || 
                           document.getElementById('editTransactionType')?.value ||
                           document.getElementById('quickTransactionType')?.value;
    
    let html = '<option value="">Kategori Seçin</option>';
    
    cats.filter(c => {
        if (c === 'BEN' || c === 'Elden') return false;
        if (c === 'Avans' && transactionType !== 'giden') return false;
        return true;
    }).sort().forEach(c => {
        const bal = balances[c] || 0;
        let statusText = '';
        if (bal < -0.01) {
            statusText = ` (-${formatAmount(Math.abs(bal))})`;
        } else if (bal > 0.01) {
            statusText = ` (+${formatAmount(bal)})`;
        }
        html += `<option value="${c}">${c}${statusText}</option>`;
    });
    
    selectElement.innerHTML = html;
}

function setTransactionTypeUnified(type, typeInputId, gidenBtnId, gelenBtnId) {
    const typeInput = document.getElementById(typeInputId);
    if (typeInput) typeInput.value = type;
    document.getElementById(gidenBtnId).classList.toggle('active', type === 'giden');
    document.getElementById(gelenBtnId).classList.toggle('active', type === 'gelen');
    
    if (currentPerson) {
        const categorySelect = DOM.category || 
                              document.getElementById('editCategory') || 
                              document.getElementById('quickCategory');
        if (categorySelect) {
            populateCategorySelect(categorySelect, currentPerson);
        }
    }
}

function populatePersonSelect(selectElement) {
    if (!selectElement) return;
    const currentVal = selectElement.value;
    
    while (selectElement.options.length > 1) selectElement.remove(1);
    
    Object.keys(allData).sort().forEach(person => {
        if (person === 'metadata') return;
        selectElement.add(new Option(person, person));
    });
    selectElement.value = currentVal;
}

function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events"); 
}

function getAllTransactionsForPerson(person) {
    if (!allData[person]) return [];
    let transactions = [];
    Object.keys(allData[person]).forEach(year => {
        if (isNaN(year)) return;
        Object.keys(allData[person][year]).forEach(month => {
            if (allData[person][year][month].transactions) {
                transactions.push(...allData[person][year][month].transactions);
            }
        });
    });
    return transactions;
}

function handleDateChange(event) {
    const dateVal = event.target.value;
    if (dateVal) {
        transactionDateHolder = dateVal + 'T12:00:00.000';
    } else {
        transactionDateHolder = getLocalTimeISO();
    }
}

function handlePersonNameEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addNewPerson();
    }
}

function handleCategoryInputEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addCategoryFromManager();
    }
}

function toggleShareOptions() {
    const options = document.getElementById('shareOptions');
    if (!options) return;
    options.style.display = options.style.display === 'flex' ? 'none' : 'flex';
}

function copySummaryText() {
    if (!currentPerson || !allData[currentPerson]) return;
    
    const balances = allData[currentPerson].categoryBalances || {};
    let text = `${currentPerson.toUpperCase()} Bakiye Durumu (${new Date().toLocaleDateString('tr-TR')})\n\n`;
    
    let hasDebt = false;
    Object.keys(balances).forEach(cat => {
        const amount = balances[cat];
        if (Math.abs(amount) > 0.01) {
            hasDebt = true;
            if (amount > 0) text += `${cat}: ${formatAmount(amount)} (Borçlu)\n`;
            else text += `${cat}: ${formatAmount(Math.abs(amount))} (Alacaklı)\n`;
        }
    });

    if (!hasDebt) text += "Borç/Alacak bulunmuyor.";
    
    const total = calculatePersonTotalBalance(currentPerson);
    text += `\nGENEL NET: ${formatAmount(Math.abs(total))} ${total > 0 ? '(ALACAĞINIZ)' : (total < 0 ? '(BORCUNUZ)' : '')}`;

    const doCopy = (txt) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(txt).then(() => showNotification('📋 Metin Kopyalandı', 'success'));
        } else {
            const ta = document.createElement('textarea');
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showNotification('📋 Metin Kopyalandı', 'success');
        }
        document.getElementById('shareOptions').style.display = 'none';
    };

    doCopy(text);
}

function exportSummaryExcel() {
    if (!currentPerson || !allData[currentPerson]) return;
    
    const balances = allData[currentPerson].categoryBalances || {};
    const data = [];
    
    const borderStyle = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    
    data.push([
        { 
            v: "Kategori", 
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } } 
        },
        { 
            v: "Tutar (₺)", 
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } } 
        },
        { 
            v: "Durum", 
            s: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "444444" } }, border: borderStyle, alignment: { horizontal: 'center' } } 
        }
    ]);

    let hasData = false;
    
    Object.keys(balances).sort().forEach(cat => {
        if (cat === 'BEN') return;
        const amount = balances[cat];
        if (Math.abs(amount) > 0.01) {
            hasData = true;
            
            let bgColor = "FFFFFF"; 
            let durum = "-";
            
            if(amount > 0.01) {
                bgColor = "FCE4D6";
                durum = "Borçlu";
            } else if(amount < -0.01) {
                bgColor = "E2EFDA";
                durum = "Alacaklı";
            }
            
            const cellStyle = {
                border: borderStyle,
                fill: { fgColor: { rgb: bgColor } },
                font: { color: { rgb: "000000" } }
            };
            
            const numStyle = {
                ...cellStyle,
                numFmt: "#,##0.00",
                alignment: { horizontal: 'right' }
            };

            data.push([
                { v: cat, s: { ...cellStyle, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: 'left' } } },
                { v: Math.abs(amount), t: 'n', s: numStyle },
                { v: durum, s: { ...cellStyle, alignment: { horizontal: 'center' } } }
            ]);
        }
    });

    if (!hasData) return showNotification('⚠️ Bakiye verisi yok', 'warning');

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    ws['!cols'] = [{wch: 25}, {wch: 18}, {wch: 12}];

    XLSX.utils.book_append_sheet(wb, ws, "Ozet");
    XLSX.writeFile(wb, `${currentPerson}_Ozet_Durum.xlsx`);
    
    showNotification('✅ Excel İndirildi', 'success');
    document.getElementById('shareOptions').style.display = 'none';
}

function openSelectedPersonIfAny() {
    const select = DOM.personSelect;
    if (!select) return;
    const person = select.value;
    if (person && (!DOM.personModal || DOM.personModal.style.display !== 'block')) {
        openPersonModal(person);
    }
}

function openPersonModal(person) {
    currentPerson = person;
    document.getElementById('modalPersonName').textContent = ` 👤  ${person.toUpperCase()}`;
    
    updatePersonTotalInfo(person);
    populateCategorySelect(DOM.category, person);
    updateTransactionHistory();
    setCurrentDate();
    
    const shareOpt = document.getElementById('shareOptions');
    if(shareOpt) shareOpt.style.display = 'none';

    try { updateCategoryBalanceDisplay(person); } catch (e) {}

    setReportDateDefaults();

    const firstTab = document.querySelector('#personModal .tab-btn');
    if (firstTab) firstTab.click();

    openModal('personModal');
    
    setTimeout(() => initModalSwipe(), 100);
}

function updatePersonTotalInfo(person) {
    if (!allData[person]?.categoryBalances) return;
    
    let rx = 0, px = 0;
    Object.values(allData[person].categoryBalances).forEach(b => {
        if (b > 0) rx += b; else px += Math.abs(b);
    });

    const net = rx - px;
    let netClass = ''; 
    let netLabel = 'Net Durum'; 

    if(net > 0.01) {
        netClass = 'text-income'; 
        netLabel = 'Net Alacağınız'; 
    } else if(net < -0.01) {
        netClass = 'text-expense'; 
        netLabel = 'Net Borcunuz'; 
    }

    const breakdown = document.querySelector('.balance-breakdown');
    if(breakdown) {
        breakdown.innerHTML = `
            <div class="info-col left-side">
                <div class="balance-row">
                    <span class="info-label">${person} Borcu:</span>
                    <span class="info-amount text-income">${formatAmount(rx)}</span>
                </div>
                <div class="balance-row">
                    <span class="info-label">Borcunuz:</span>
                    <span class="info-amount text-expense">${formatAmount(px)}</span>
                </div>
            </div>
            
            <div class="info-col right-side">
                <div class="balance-row">
                    <span class="info-label">${netLabel}:</span>
                    <span class="info-amount ${netClass}">${formatAmount(Math.abs(net))}</span>
                </div>
            </div>
        `;
    }
}

function selectPerson() {
    const selectedPerson = DOM.personSelect?.value;
    if (selectedPerson && allData[selectedPerson]) openPersonModal(selectedPerson);
}

function updateDisplays(person) {
    if (currentPerson === person) {
        updatePersonTotalInfo(person);
        updateTransactionHistory();
        updateCategoryBalanceDisplay(person);
    }
    updateMainDisplay();
}

function closeCurrentModal(el) {
    const modal = el.closest('.modal');
    if (modal) {
        const modalId = modal.id;
        
        modal.classList.remove('show');
        modal.style.display = 'none';

        document.body.classList.remove('modal-open-ios');
        
        if ((modalId === 'editTransactionModal' || modalId === 'categoryDetailModal') && currentPerson) {
            const personModal = document.getElementById('personModal');
            if (personModal) {
                personModal.style.display = 'block';
                personModal.classList.add('show');
                DOM.mainAppContainer?.classList.add('disable-events');
                document.body.classList.add("disable-events");
            }
            return;
        }
        
        if (!checkAnyMenuOpen()) {
            DOM.mainAppContainer?.classList.remove('disable-events');
            document.body.classList.remove("disable-events"); 
        }
    }
    if(modal && modal.id === 'personModal') {
        if(DOM.personSelect) DOM.personSelect.value = '';
    }
}

function closeAllModals() {
    
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('show');
        m.style.display = 'none';
    });
    
    document.body.classList.remove('modal-open-ios');
if(DOM.settingsMenu) DOM.settingsMenu.style.display = 'none';
    
    const colorMenu = document.getElementById('colorSelectionMenu');
    if(colorMenu) colorMenu.style.display = 'none';
    
    if(DOM.notificationMenu) DOM.notificationMenu.style.display = 'none';

    const backdrop = document.getElementById('menuBackdrop');
    if(backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
    }
    
    closeQuickTransactionOverlay();
    closeMemoryOverlay();
    
    closeAllocationOverlay();
    
    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events"); 
    
    if(DOM.personSelect) DOM.personSelect.value = '';
}

function openTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    e.currentTarget.classList.add('active');
    
    if (id === 'kategoriDurumu') updateCategoryBalanceDisplay(currentPerson);
    if (id === 'raporlar') renderReportPreview();
}

function updateTransactionHistory() {
    if(!DOM.transactionHistory) return;
    
    let txs = getAllTransactionsForPerson(currentPerson);
    txs.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(txs.length === 0) {
         DOM.transactionHistory.innerHTML = '<div class="empty-state">Henüz işlem yok</div>';
         return;
    }

    let html = '<h4 style="color:#b0bec5; margin-bottom:5px; font-size:0.9em; font-weight:600; padding-left:2px;">Son İşlemler</h4>';
    
    txs.forEach(t => { 
        const typeTxt = t.type === 'giden' ? 'Giden' : 'Gelen';
        const typeClass = t.type === 'giden' ? 'giden' : 'gelen'; 
        const dateStr = formatDateTR(new Date(t.date));
        const desc = t.description || '';
        
        html += `
        <div class="history-item">
            <div class="history-left">
                <div class="history-top-row">
                    <span class="history-type ${typeClass}">${typeTxt}</span>
                    <span class="history-date">${dateStr}</span>
                    <span class="history-amount ${t.type === 'giden' ? 'text-expense' : 'text-income'}">${formatAmount(t.amount)}</span>
                </div>
                <div class="history-meta">
                    <span class="history-category">${sanitizeHTML(t.category)}</span>${desc ? ' - ' + sanitizeHTML(desc) : ''}
                </div>
            </div>
            <div class="history-right">
                <button class="edit-transaction-btn" onclick="editTransaction(${t.id})">✏️</button>
                <button class="delete-transaction-btn" onclick="deleteTransaction(${t.id})">✖</button>
            </div>
        </div>`;
    });
    
    DOM.transactionHistory.innerHTML = html;
    
    const historyItems = DOM.transactionHistory.querySelectorAll('.history-item');
    historyItems.forEach(function(item, index) {
        const transaction = txs[index];
        if (transaction) {
            attachThreeDotsMenu(item, transaction, currentPerson);
        }
    });
}

function updateCategoryBalanceDisplay(person) {
    const grid = DOM.categoryBalanceGrid;
    if(!grid) return;
    
    const bals = allData[person].categoryBalances || {};
    const toggle = document.getElementById('showZeroBalanceToggle');
    const showZero = toggle ? toggle.checked : false;

    let html = '';
    
    Object.keys(bals).forEach(c => {
        if(c === 'BEN') return; 
        
        const b = Number(bals[c]) || 0;
        
        if (showZero) {
            if(Math.abs(b) > 0.01) return;
        } else {
            if(Math.abs(b) < 0.01) return;
        }
        
        const color = b > 0 ? '#ef5350' : (b < 0 ? '#81c784' : '#ffd54f');
let status = b > 0 ? 'Borçlu' : (b < 0 ? 'Alacaklı' : '');
        if (c === 'Avans' && b < 0) {
            status = 'Avans';
        }
        
        const safeCat = c.replace(/'/g, "\\'");
        
        html += `
        <div class="category-item ${b > 0 ? 'positive-balance' : 'negative-balance'}" onclick="showCategoryDetails('${safeCat}')">
            <span class="category-name">${c}</span>
            <span class="category-balance" style="color:${color}">${formatAmount(Math.abs(b))}</span>
            <span>${status}</span>
        </div>`;
    });
    grid.innerHTML = html || '<div class="empty-state">Kayıt yok</div>';
}

function showCategoryDetails(categoryName) {
    const person = currentPerson;
    if (!person || !allData[person]) return;

    const modal = DOM.categoryDetailModal;
    const titleEl = document.getElementById('categoryDetailTitle');
    const contentEl = document.getElementById('categoryDetailContent');
    
    titleEl.textContent = `${person.toUpperCase()} - ${categoryName} Detayı`;
    
    let txs = getAllTransactionsForPerson(person);
    const catTxs = txs.filter(t => t.category === categoryName)
                      .sort((a, b) => new Date(a.date) - new Date(b.date));

    currentCategoryTransactions = [...catTxs].reverse(); 

    if (catTxs.length === 0) {
        contentEl.innerHTML = '<div class="empty-state">İşlem yok</div>';
    } else {
        let runningBalance = 0;
        let rows = [];
        catTxs.forEach(t => {
            if (t.type === 'giden') runningBalance += t.amount; else runningBalance -= t.amount;
            rows.push(`
                <tr>
                    <td>${formatDateTR(new Date(t.date))}</td>
                    <td class="val-gelen">${t.type==='gelen' ? formatNumber(t.amount) : ''}</td>
                    <td class="val-giden">${t.type==='giden' ? formatNumber(t.amount) : ''}</td>
                    <td class="val-bakiye">${formatNumber(runningBalance)}</td>
                    <td>${t.description || ''}</td>
                </tr>
            `);
        });

        contentEl.innerHTML = `
            <table class="detail-table" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr><th>Tarih</th><th>Gelen</th><th>Giden</th><th>Bakiye</th><th>Açıklama</th></tr>
                </thead>
                <tbody>${rows.reverse().join('')}</tbody>
            </table>
        `;
    }
    
    modal.dataset.category = categoryName;
    modal.style.display = 'block';
    
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events"); 

    const excelBtn = document.getElementById('exportCategoryExcelBtn');
    if (excelBtn) {
        const newBtn = excelBtn.cloneNode(true);
        excelBtn.parentNode.replaceChild(newBtn, excelBtn);
        
        newBtn.onclick = () => {
            showNotification('⚠️ Rapor hazırlanıyor...', 'warning');
            setTimeout(() => {
                exportStyledCategoryDetailToExcel(person, categoryName, currentCategoryTransactions);
            }, 100);
        };
    }
}

function initiateAllocation() {
    const amount = deformatCurrency(DOM.amount.value);
    const person = currentPerson;
    if (amount <= 0.01) return;

    const debts = Object.keys(allData[person].categoryBalances || {})
        .filter(c => allData[person].categoryBalances[c] > 0.01)
        .sort((a,b) => allData[person].categoryBalances[b] - allData[person].categoryBalances[a]);
        
    if (debts.length === 0) return;

    const content = document.getElementById('allocationDynamicContent');
    document.getElementById('allocationOverlay').style.display = 'flex';
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events");

    let remainingMoney = amount;
    
    let headerHtml = `
        <div class="allocation-header">
            <div class="allocation-amount-row">
                <span class="label">Gelen Tutar:</span>
                <span class="value-income">${formatAmount(amount)}</span>
            </div>
            
            <div class="allocation-amount-row">
                <span class="label">Kalan Tutar:</span>
                <span id="allocationRemainingDisplay" class="value-remaining">${formatAmount(amount)}</span>
            </div>
        </div>
        
        <div class="allocation-debts-title">
            <span>Borçlar:</span>
        </div>
    `;

    let itemsHtml = '<div class="allocation-items-container">';

    debts.forEach(cat => {
        const debtAmount = allData[person].categoryBalances[cat];
        let pay = 0;
        if(remainingMoney > 0) {
            pay = Math.min(remainingMoney, debtAmount);
            remainingMoney -= pay;
        }
        
        itemsHtml += `
        <div class="allocation-item" data-category="${cat}" data-max-debt="${debtAmount}">
            <div class="allocation-item-header">
                <span class="category-name">${sanitizeHTML(cat)}</span>
                <span class="debt-amount">${formatAmount(debtAmount)}</span>
            </div>
            
            <div class="allocation-item-controls">
                <input type="text" class="allocation-input" value="" 
                       oninput="formatCurrency(this); updateAllocationTotals();" 
                       placeholder="0,00">
                
                <button class="allocation-clear-btn" type="button">
                    Sıfırla
                </button>
            </div>
        </div>`;
    });
    
    itemsHtml += '</div>';
    
    itemsHtml += `<input type="hidden" id="totalAllocationSource" value="${amount}">`;

    content.innerHTML = headerHtml + itemsHtml;
    
    // Event Delegation - Sıfırla butonları için
    content.addEventListener('click', function(e) {
        const btn = e.target.closest('.allocation-clear-btn');
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            payCategoryInFull(btn);
        }
    }, true); // capture phase'de yakala
    
    // Input focus/blur sorununu çözmek için
    content.addEventListener('mousedown', function(e) {
        if (e.target.closest('.allocation-clear-btn')) {
            e.preventDefault(); // Input'un blur olmasını engelle
        }
    }, true);
    
    updateAllocationTotals();
}

function updateAllocationTotals() {
    const totalSourceInput = document.getElementById('totalAllocationSource');
    if(!totalSourceInput) return;
    
    const totalAmount = parseFloat(totalSourceInput.value);
    let allocatedTotal = 0;

    document.querySelectorAll('.allocation-item').forEach(item => {
        const input = item.querySelector('.allocation-input');
        let amount = deformatCurrency(input.value);
        const maxDebt = parseFloat(item.dataset.maxDebt);
        const category = item.dataset.category;

        if (category.toLowerCase() !== 'elden' && category.toLowerCase() !== 'avans' && amount > maxDebt) {
            amount = maxDebt;
            input.value = formatNumber(maxDebt);
            showNotification(`${sanitizeHTML(category)} için borçtan fazla girilemez.`, 'warning');
        }
        allocatedTotal += amount;
    });

    if (allocatedTotal > totalAmount) {
        showNotification('Dağıtılan tutar gelen paradan fazla!', 'error');
    }

    const remainingAmount = totalAmount - allocatedTotal;
    const displayEl = document.getElementById('allocationRemainingDisplay');
    
    if(displayEl) {
        displayEl.textContent = formatAmount(remainingAmount);
        if(remainingAmount === 0) displayEl.style.color = '#66bb6a';
        else if (remainingAmount > 0) displayEl.style.color = '#ffd54f';
        else displayEl.style.color = '#ef5350';
    }
}

function payCategoryInFull(button) {
    const item = button.closest('.allocation-item');
    const maxDebt = parseFloat(item.dataset.maxDebt);
    const input = item.querySelector('.allocation-input');

    const totalAmount = parseFloat(document.getElementById('totalAllocationSource').value);
    const allocatedSoFar = getAllocatedTotal(item);
    const remainingToAllocate = totalAmount - allocatedSoFar;

    const amountToPay = Math.min(maxDebt, remainingToAllocate);

    input.value = formatNumber(amountToPay);
    updateAllocationTotals();
}

function getAllocatedTotal(excludeItem = null) {
    let allocatedTotal = 0;
    document.querySelectorAll('.allocation-item').forEach(item => {
        if (item !== excludeItem) {
            const input = item.querySelector('.allocation-input');
            allocatedTotal += deformatCurrency(input.value);
        }
    });
    return allocatedTotal;
}

function closeAllocationOverlay() {
    const overlay = document.getElementById('allocationOverlay');
    if (overlay) overlay.style.display = 'none';
    
    if (!document.querySelector('.modal.show') && !checkAnyMenuOpen()) {
        DOM.mainAppContainer?.classList.remove('disable-events');
        document.body.classList.remove("disable-events"); 
    }
}

async function confirmAllocation() {
    if(isProcessing) return; 
    
    const totalReceived = parseFloat(document.getElementById('totalAllocationSource').value);
    const person = currentPerson;

    let transactionsToCreate = [];
    let allocatedTotal = 0;

    document.querySelectorAll('.allocation-input').forEach(inp => {
        const amount = deformatCurrency(inp.value);
        const cat = inp.closest('.allocation-item').dataset.category;
        if(amount > 0.01) {
            transactionsToCreate.push({ category: cat, amount: amount });
            allocatedTotal += amount;
        }
    });

    const remainingAmount = totalReceived - allocatedTotal;
    if (remainingAmount > 0.01) {
        transactionsToCreate.push({ category: 'Avans', amount: remainingAmount });
    }

    if (allocatedTotal > totalReceived + 0.01) {
        showNotification('Dağıtılan tutar gelen paradan fazla!', 'error');
        return;
    }

    showAllocationDescriptionPopup(transactionsToCreate, totalReceived, person);
}

function showAllocationDescriptionPopup(transactions, totalReceived, person) {
    const popupHtml = `
        <div id="allocationDescPopup" class="allocation-popup-overlay">
            <div class="allocation-popup-box">
                <h3 class="allocation-popup-title">
                    Açıklama Girmek İster misiniz?
                </h3>
                <div class="allocation-popup-buttons">
                    <button onclick="finalizeAllocation(null)" class="allocation-popup-btn btn-cancel">Hayır</button>
                    <button onclick="showDescriptionInput()" class="allocation-popup-btn btn-confirm">Evet</button>
                </div>
            </div>
        </div>
    `;
    
    window.pendingAllocationData = { transactions, totalReceived, person };
    
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function showDescriptionInput() {
    const popup = document.getElementById('allocationDescPopup');
    if (!popup) return;
    
    popup.innerHTML = `
        <div class="allocation-popup-box">
            <h3 class="allocation-popup-title" style="margin-bottom: 15px; font-size: 1em;">
                Açıklama:
            </h3>
            <input type="text" id="allocationDescInput" class="allocation-popup-input" placeholder="Açıklama giriniz..." autofocus>
            <div class="allocation-popup-buttons">
                <button onclick="closeAllocationDescPopup()" class="allocation-popup-btn btn-cancel">İptal</button>
                <button onclick="finalizeAllocation(document.getElementById('allocationDescInput').value)" class="allocation-popup-btn btn-confirm">Kaydet</button>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('allocationDescInput')?.focus();
    }, 100);
}

function closeAllocationDescPopup() {
    const popup = document.getElementById('allocationDescPopup');
    if (popup) popup.remove();
    window.pendingAllocationData = null;
}

async function finalizeAllocation(description) {
    const data = window.pendingAllocationData;
    if (!data) return;
    
    const { transactions, totalReceived, person } = data;
    const txDate = transactionDateHolder || getLocalTimeISO();
    const autoDesc = `Otm. (Toplam Gelen: ${formatAmount(totalReceived)})`;
    const desc = description?.trim() ? `${description.trim()} - ${autoDesc}` : autoDesc;
    
    closeAllocationDescPopup();
    
    isProcessing = true;
    const confirmBtn = document.querySelector('#allocationOverlay .btn-success');
    if(confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Kaydediliyor...'; }

    try {
        transactions.forEach(tx => {
            addTransaction(person, 'gelen', tx.amount, tx.category, desc, txDate);
        });

        calculateAllBalances(person); 
        queueSave();
        closeAllocationOverlay(); 
        clearTransactionForm(); 
        updateDisplays(person);
        showNotification(`✅ ${formatAmount(totalReceived)} Para Girişi Dağıtıldı`, 'success');
    } finally {
        isProcessing = false;
        if(confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'DAĞITIMI ONAYLA'; }
    }
}

async function processSingleTransaction() {
    if(isProcessing) return;
    
    const amount = deformatCurrency(DOM.amount?.value || '0');
    const category = DOM.category?.value || '';
    const transType = DOM.transactionType?.value || '';
    if (amount === 0) return showNotification('Tutar giriniz!', 'error');
    if (!category) return showNotification('Kategori seçiniz!', 'error');
    if (!transType) return showNotification('İşlem tipi seçiniz!', 'error');

    let desc = DOM.description?.value?.trim() || '';
    desc = formatTitleCase(desc); 

    isProcessing = true;
    if(DOM.addTransactionBtn) { 
        DOM.addTransactionBtn.disabled = true; 
        DOM.addTransactionBtn.textContent = 'Kaydediliyor...'; 
    }

    try {
        addTransaction(currentPerson, transType, amount, category, desc);
        
        queueSave();
        
        const typeText = transType === 'gelen' ? 'Girişi' : 'Çıkışı';
        showNotification(`✅ ${formatAmount(amount)} Para ${typeText} Oldu`, 'success');
        clearTransactionForm();
        updateDisplays(currentPerson);
    } finally {
        isProcessing = false;
        if(DOM.addTransactionBtn) { 
            DOM.addTransactionBtn.disabled = false; 
            DOM.addTransactionBtn.textContent = ' ✅ İşlemi Kaydet'; 
        }
    }
}

function addTransaction(person, type, amount, category, description, date = null) {
    amount = Math.abs(amount); 
    const txDate = date ? date : (transactionDateHolder || getLocalTimeISO());
    const d = new Date(txDate);
    const year = d.getFullYear().toString();
    const month = months[d.getMonth()];

    if (!allData[person][year]) allData[person][year] = {};
    if (!allData[person][year][month]) allData[person][year][month] = { transactions: [], closed: false };

    allData[person][year][month].transactions.push({
        id: Date.now() + Math.random() * 1000,
        amount, description, category, type, date: txDate, status: 'active'
    });
    calculateAllBalances(person);
}

function deleteTransaction(id, silent = false) {
    if(!silent && !confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    
    let found = false;
    let deletedAmount = 0;
    let deletedType = '';

    Object.keys(allData[currentPerson]).forEach(y => {
        if(isNaN(y)) return;
        Object.keys(allData[currentPerson][y]).forEach(m => {
            const txs = allData[currentPerson][y][m].transactions;
            const idx = txs.findIndex(t => t.id === id);
            if(idx > -1) {
                deletedAmount = txs[idx].amount;
                deletedType = txs[idx].type;
                txs.splice(idx, 1);
                found = true;
            }
        });
    });
    if(found) {
        calculateAllBalances(currentPerson);
        queueSave();
        updateDisplays(currentPerson);
        
        if(!silent) {
            const typeText = deletedType === 'gelen' ? 'Girişi' : 'Çıkışı';
            showNotification(`🗑️ ${formatAmount(deletedAmount)}'lik Para ${typeText} Silindi`, 'success');
        }
    }
}

function editTransaction(id) {
    const person = currentPerson;
    const txs = getAllTransactionsForPerson(person);
    const t = txs.find(tr => tr.id === id);
    
    if (!t) return;
    editingTransactionId = id; 
    
    setTransactionTypeUnified(t.type, 'editTransactionType', 'editGidenBtn', 'editGelenBtn');
    
    document.getElementById('editAmount').value = formatNumber(t.amount);
    document.getElementById('editDescription').value = t.description;
    
    populateCategorySelect(document.getElementById('editCategory'), person);
    document.getElementById('editCategory').value = t.category;
    
    const d = new Date(t.date);
    document.getElementById('editDateInput').value = d.toISOString().split('T')[0];
    
    const editDateDisplay = document.getElementById('editMobileDateDisplay');
    if (editDateDisplay && window.innerWidth <= 800) {
        editDateDisplay.textContent = formatDateTR(d);
    }
    
    openModal('editTransactionModal');
}

async function saveEditedTransaction() {
    if (!confirm('Düzenlemeyi Kaydetmek İstediğinizden Emin misiniz?')) return;

    if(isProcessing) return; 
    isProcessing = true;
    
    const person = currentPerson;
    
    deleteTransaction(editingTransactionId, true); 
    
    const type = document.getElementById('editTransactionType').value;
    const amount = deformatCurrency(document.getElementById('editAmount').value);
    const cat = document.getElementById('editCategory').value;
    
    let desc = document.getElementById('editDescription').value;
    desc = formatTitleCase(desc);

    const dateStr = document.getElementById('editDateInput').value;
    const date = dateStr ? (dateStr + 'T12:00:00.000') : getLocalTimeISO();
    
    try {
        addTransaction(person, type, amount, cat, desc, date);
        queueSave();
        closeCurrentModal(document.getElementById('editTransactionModal'));
        updateDisplays(person);
        const typeText = type === 'gelen' ? 'Girişi' : 'Çıkışı';
        showNotification(`✅ ${formatAmount(amount)}'lik Para ${typeText} Düzeltildi`, 'success');
    } finally {
        isProcessing = false;
    }
}

function setTransactionType(t) {
    setTransactionTypeUnified(t, 'transactionType', 'gidenBtn', 'gelenBtn');
}

function setEditTransactionType(type) {
    setTransactionTypeUnified(type, 'editTransactionType', 'editGidenBtn', 'editGelenBtn');
}

function clearTransactionForm() {
    if(DOM.amount) DOM.amount.value = '';
    if(DOM.description) DOM.description.value = '';
    if(DOM.category) DOM.category.value = '';
    setTransactionType('');
    setCurrentDate();
}

function checkAnyMenuOpen() {
    const settings = document.getElementById('settingsMenu')?.style.display === 'block';
    const colorSelection = document.getElementById('colorSelectionMenu')?.style.display === 'block';
    const notifications = DOM.notificationMenu?.style.display === 'block';
    
    return settings || colorSelection || notifications;
}

function toggleSettingsMenu() {
    document.getElementById('colorSelectionMenu')?.style.setProperty('display', 'none');
    if(DOM.notificationMenu) DOM.notificationMenu.style.display = 'none';

    const m = DOM.settingsMenu;
    const backdrop = document.getElementById('menuBackdrop');
    
    if(m) {
        const isCurrentlyOpen = m.style.display === 'block';
        
        if (isCurrentlyOpen) {
            m.style.display = 'none';
            if (backdrop) {
                backdrop.classList.remove('active');
                backdrop.style.display = 'none';
            }
            DOM.mainAppContainer?.classList.remove('disable-events');
            document.body.classList.remove("disable-events");
        } else {
            const __icon = document.querySelector('.notification-icon-btn[onclick*="toggleSettingsMenu"]');
            if (__icon) {
                const r = __icon.getBoundingClientRect();
                const isMobile = window.innerWidth <= 768;
                m.style.position = 'fixed';
                m.style.top = Math.round(r.bottom - (isMobile ? 10 : 10)) + 'px';
                m.style.right = Math.round(window.innerWidth - r.right - (isMobile ? 62 : 48)) + 'px';
                m.style.left = 'auto';
            }
            m.style.display = 'block';
            
            if (backdrop) {
                backdrop.classList.add('active');
                backdrop.style.display = 'block';
            }
            DOM.mainAppContainer?.classList.add('disable-events');
            document.body.classList.add("disable-events");
        }
    }
}

function closeAllMenus() {
    if(DOM.settingsMenu) DOM.settingsMenu.style.display = 'none';
    
    const colorMenu = document.getElementById('colorSelectionMenu');
    if(colorMenu) colorMenu.style.display = 'none';
    
    if(DOM.notificationMenu) DOM.notificationMenu.style.display = 'none';

    const backdrop = document.getElementById('menuBackdrop');
    if(backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
    }
    
    closeQuickTransactionOverlay();
    closeMemoryOverlay();
    
    closeAllocationOverlay();
    
    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events"); 
}

function showColorSelectionMenu() {
    if(DOM.settingsMenu) DOM.settingsMenu.style.display = 'none';
    
    const backdrop = document.getElementById('menuBackdrop');
    if(backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
    }
    
    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events"); 
    
    const colorMenu = document.getElementById('colorSelectionMenu');
    const colorBubbles = document.getElementById('colorBubbles');
    
    if(colorMenu && colorBubbles) {
        const isMobile = window.innerWidth < 600;
        
        if(isMobile) {
            colorMenu.style.cssText = `
                display: block;
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: transparent;
                z-index: 999999;
            `;
            colorBubbles.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                gap: 10px;
                background: rgba(20,28,45,0.95);
                padding: 15px 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;
        } else {
            colorMenu.style.cssText = `
                display: flex;
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: transparent;
                z-index: 999999;
                justify-content: center;
                align-items: center;
            `;
            colorBubbles.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                background: rgba(20,28,45,0.95);
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            `;
        }
    }
}

document.addEventListener('click', function(e) {
    const colorMenu = document.getElementById('colorSelectionMenu');
    if(colorMenu && (colorMenu.style.display === 'block' || colorMenu.style.display === 'flex')) {
        if(!e.target.closest('#colorBubbles') && !e.target.closest('[onclick*="showColorSelectionMenu"]')) {
            colorMenu.style.display = 'none';
        }
    }
});

async function changeGlowTheme(themeName, silent = false) {
    const container = DOM.mainAppContainer;
    if (!container) return;

    GLOW_THEMES.forEach(theme => {
        container.classList.remove(`theme-${theme}-glow`);
    });

    container.classList.add(`theme-${themeName}-glow`);

    await advancedStorage.setItem('sahsiHesapTakibiGlowTheme', themeName);

    if(!silent) {
        await showNotification(`${themeName === 'none' ? 'Işıklar kapatıldı.' : themeName.toUpperCase() + ' ışık seçildi.'}`, 'success');
    }
}

async function loadGlowTheme() {
    const savedTheme = await advancedStorage.getItem('sahsiHesapTakibiGlowTheme') || 'blue';
    await changeGlowTheme(savedTheme, true);
}

function toggleNotificationMenu() {
    if(document.getElementById('settingsMenu')) document.getElementById('settingsMenu').style.display = 'none';
    if(document.getElementById('colorSelectionMenu')) document.getElementById('colorSelectionMenu').style.display = 'none';

    const menu = DOM.notificationMenu;
    const backdrop = document.getElementById('menuBackdrop');
    
    if (menu) { 
        const isCurrentlyOpen = menu.style.display === 'block';
        if(isCurrentlyOpen) {
            menu.style.display = 'none';
            
            backdrop?.classList.remove('active');
            if(backdrop) backdrop.style.display = 'none'; 
            
            DOM.mainAppContainer?.classList.remove('disable-events');
            document.body.classList.remove("disable-events"); 
        } else {
            const __icon = document.querySelector('.notification-icon-btn[onclick*="toggleNotificationMenu"]');
            if (__icon) {
                const r = __icon.getBoundingClientRect();
                const isMobile = window.innerWidth <= 768;
                menu.style.position = 'fixed';
                menu.style.top = Math.round(r.bottom - (isMobile ? 11 : 13)) + 'px';
                menu.style.right = Math.round(window.innerWidth - r.right - (isMobile ? 19 : 17)) + 'px';
                menu.style.left = 'auto';
            }
            menu.style.display = 'block';

            backdrop?.classList.add('active');
            if(backdrop) backdrop.style.display = 'block'; 
            
            DOM.mainAppContainer?.classList.add('disable-events');
            document.body.classList.add("disable-events"); 
            renderNotificationMenu();
        }
    }
}

document.addEventListener('click', function(e) {
    const settingsBtn = document.querySelector('.notification-icon-btn[onclick*="toggleSettingsMenu"]');
    const notifBtn = document.querySelector('.notification-icon-btn[onclick*="toggleNotificationMenu"]');
    const backdrop = document.getElementById('menuBackdrop');
    
    const openMenus = document.querySelectorAll('.dropdown-menu[style*="display: block"]');
    
    let isClickInsideMenu = false;
    openMenus.forEach(menu => {
        if (menu.contains(e.target)) {
            isClickInsideMenu = true;
        }
    });
    
    const isClickOnAnyButton = e.target === settingsBtn || settingsBtn?.contains(e.target) || e.target === notifBtn || notifBtn?.contains(e.target);
    const isClickOnBackdrop = e.target === backdrop;

    if (!isClickInsideMenu && !isClickOnAnyButton && !isClickOnBackdrop && openMenus.length > 0) {
        closeAllMenus();
    }
});

function showAddPersonModal() {
    document.getElementById('newPersonName').value = '';
    openModal('addPersonModal');
    setTimeout(() => document.getElementById('newPersonName').focus(), 100);
}

async function addNewPerson() {
    if(isProcessing) return;
    const nameInput = document.getElementById('newPersonName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('İsim boş olamaz!', 'error');
        return;
    }
    
    if (allData[name]) {
        showNotification('Bu kişi zaten var!', 'error');
        return;
    }
    
    isProcessing = true;
    try {
        allData[name] = {
            categories: [...defaultCategories, 'Avans'], 
            categoryBalances: {},
            isFavorite: false
        };
        
        [...defaultCategories, 'Avans'].forEach(cat => {
            allData[name].categoryBalances[cat] = 0;
        });
        
        queueSave();
        showNotification(`${name} eklendi.`, 'success');
        
        nameInput.value = '';
        closeAllModals();
        updateMainDisplay();
    } finally {
        isProcessing = false;
    }
}

function showPersonManagementModal() {
    if (typeof closeAllMenus === 'function') closeAllMenus();
    const sm = document.getElementById('settingsMenu');
    if (sm) sm.style.display = 'none';
    openModal('personManagementModal');

    const list = document.getElementById('personManagementList');
    list.innerHTML = '';
    Object.keys(allData).sort().forEach(p => {
        if(p==='metadata') return;
        const item = document.createElement('div');
        item.className = 'management-list-item';
        const icon = allData[p].isFavorite ? '⭐ ' : '☆';
        const iconClass = allData[p].isFavorite ? 'is-fav' : 'not-fav';
        
        item.innerHTML = `
            <span>${p}</span>
            <div class="management-actions">
                <button class="mgmt-btn ${iconClass}" onclick="toggleFav('${p}')">${icon}</button>
                <button class="mgmt-btn" onclick="editPersonName('${p}')">✏️</button>
                <button class="mgmt-btn" onclick="deletePersonByName('${p}')">✕</button> 
            </div>`;
        list.appendChild(item);
    });
}

function toggleFav(p) {
    allData[p].isFavorite = !allData[p].isFavorite;
    queueSave();
    showPersonManagementModal(); 
    updateQuickGrid(); 
}

function editPersonName(oldName) {
    const newName = prompt("Yeni ismi giriniz:", oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        if (allData[newName.trim()]) {
            showNotification('Bu isimde başka biri zaten var!', 'error');
            return;
        }
        allData[newName.trim()] = allData[oldName];
        delete allData[oldName];
        queueSave();
        showPersonManagementModal();
        updateMainDisplay();
        showNotification('İsim güncellendi', 'success');
    }
}

function deletePersonByName(personName) {
    const balance = calculatePersonTotalBalance(personName);
    if (Math.abs(balance) > 0.01) {
        showNotification("Bakiyesi olan kişi silinemez!", 'error');
        return;
    }
    if (confirm(`${personName} kişisi silinecek. Emin misiniz?`)) {
        delete allData[personName];
        queueSave();
        showPersonManagementModal();
        updateMainDisplay();
        showNotification('Kişi silindi', 'success');
    }
} 

function showCategoryManagementModal() {
    document.getElementById('settingsMenu').style.display = 'none'; 
    openModal('categoryManagementModal');
    const sel = document.getElementById('categoryManagementPersonSelect');
    populatePersonSelect(sel);
}

function populateCategoryEditor(person) {
    const editor = document.getElementById('categoryEditor');
    const listDiv = document.getElementById('categoryManagementList');
    if (!editor || !listDiv) return;
    if (!person) { editor.style.display = 'none'; return; }
    
    listDiv.innerHTML = '';
    const categories = allData[person].categories || [];
    categories.forEach(cat => {
        if (cat === 'BEN') return;
        const item = document.createElement('div');
        item.className = 'management-list-item';
        
        item.innerHTML = `
            <span>${sanitizeHTML(cat)}</span>
            <div class="management-actions">
                <button class="mgmt-btn" onclick="editCategoryName('${person}', '${cat}')">✏️</button>
                <button class="mgmt-btn" style="color: #ef5350 !important; font-weight: bold; font-size: 1.2em;" onclick="deleteCategoryFromManager('${person}', '${cat}')">✕</button>
            </div>`;
        listDiv.appendChild(item);
    });
    editor.style.display = 'block';
}

function addCategoryFromManager() {
    const person = document.getElementById('categoryManagementPersonSelect').value;
    const categoryName = document.getElementById('newManagedCategoryInput').value.trim();
    if (!person || !categoryName) return showNotification('Bilgileri kontrol edin', 'error');
    if (allData[person].categories.includes(categoryName)) return showNotification('Zaten var', 'error');

    allData[person].categories.push(categoryName);
    allData[person].categoryBalances[categoryName] = 0;

    populateCategoryEditor(person);
    document.getElementById('newManagedCategoryInput').value = '';
    showNotification('Kategori eklendi', 'success');
    queueSave();
}

function editCategoryName(person, oldName) {
    const newName = prompt("Yeni kategori ismini giriniz:", oldName);
    
    if (!newName || newName.trim() === "" || newName === oldName) return;
    
    const cleanNewName = newName.trim();
    
    if (allData[person].categories.includes(cleanNewName)) {
        showNotification('Bu isimde kategori zaten var!', 'error');
        return;
    }

    const index = allData[person].categories.indexOf(oldName);
    if (index !== -1) {
        allData[person].categories[index] = cleanNewName;
    }

    if (allData[person].categoryBalances.hasOwnProperty(oldName)) {
        allData[person].categoryBalances[cleanNewName] = allData[person].categoryBalances[oldName];
        delete allData[person].categoryBalances[oldName];
    }

    Object.keys(allData[person]).forEach(year => {
        if (['categories', 'categoryBalances', 'metadata', 'isFavorite'].includes(year)) return;
        Object.keys(allData[person][year]).forEach(month => {
             if (allData[person][year][month].transactions) {
                 allData[person][year][month].transactions.forEach(t => {
                     if(t.category === oldName) {
                         t.category = cleanNewName;
                     }
                 });
             }
        });
    });

    queueSave();
    populateCategoryEditor(person);
    updateDisplays(person);
    showNotification('Kategori ismi güncellendi', 'success');
}

function deleteCategoryFromManager(person, category) {
    if (Math.abs(allData[person].categoryBalances[category]) > 0.01) return showNotification("Bakiyesi olan silinemez!", 'error');
    if (confirm(`Silmek istediğinize emin misiniz?`)) {
        const index = allData[person].categories.indexOf(category);
        if (index > -1) allData[person].categories.splice(index, 1);
        delete allData[person].categoryBalances[category];
        populateCategoryEditor(person);
        showNotification('Silindi', 'success');
        queueSave();
    }
}

function renderNotificationMenu() {
    const content = DOM.notificationMenu;
    if (!content) return;

    content.innerHTML = '';
    if (notificationHistory.length === 0) {
        content.innerHTML = '<div class="empty-state">Henüz bildirim yok.</div>';
    } else {
        for (let i = notificationHistory.length - 1; i >= 0; i--) {
            const notif = notificationHistory[i];
            const item = document.createElement('div');
            const color = notif.type === 'success' ? '#81c784' : '#ef5350';
            
            item.style.color = color;
            item.style.fontSize = '0.85em';
            item.innerHTML = `
                <span>${sanitizeHTML(notif.message)}</span>
                <span class="delete-notif-btn" onclick="deleteNotification(${i})">✖</span>
            `;
            content.appendChild(item);
        }
    }
}

async function deleteNotification(index) {
    notificationHistory.splice(index, 1);
    await advancedStorage.setItem('sahsiHesapTakibiNotifications', JSON.stringify(notificationHistory));
    renderNotificationMenu();
}

function setReportDateDefaults() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if(!startInput || !endInput) return;

    const d = new Date();
    const firstDay = new Date(d.getFullYear(), 0, 1);
    const today = new Date();

    const format = (date) => {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    };

    startInput.value = format(firstDay);
    endInput.value = format(today);
    
    if (typeof updateAllMobileDateDisplays === 'function') {
        setTimeout(updateAllMobileDateDisplays, 50);
    }
    
    renderReportPreview();
}

function setReportFilterType(type) {
    currentReportFilterType = type;
    
    document.querySelectorAll('.rd-toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filterBtn-' + type).classList.add('active');
    
    renderReportPreview();
}

function getFilteredTransactions() {
    let txs = getAllTransactionsForPerson(currentPerson);
    const startVal = document.getElementById('startDate').value;
    const endVal = document.getElementById('endDate').value;
    const searchText = document.getElementById('reportSearchInput') ? document.getElementById('reportSearchInput').value.toLocaleLowerCase('tr-TR') : '';
    
    if (startVal && endVal) {
        const start = new Date(startVal);
        const end = new Date(endVal);
        end.setHours(23, 59, 59); 
        txs = txs.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });
    }
    
    if (currentReportFilterType !== 'all') {
        txs = txs.filter(t => t.type === currentReportFilterType);
    }

    if (searchText.trim() !== '') {
        txs = txs.filter(t => {
            const desc = (t.description || '').toLocaleLowerCase('tr-TR');
            const cat = (t.category || '').toLocaleLowerCase('tr-TR');
            const amt = t.amount.toString();
            return desc.includes(searchText) || cat.includes(searchText) || amt.includes(searchText);
        });
    }
    
    return { allTransactions: getAllTransactionsForPerson(currentPerson), periodTransactions: txs };
}

function renderReportPreview() {
    const listContainer = document.getElementById('reportPreviewList');
    const summaryContainer = document.getElementById('reportPreviewSummary');

    if (!listContainer || !summaryContainer) return;

    const { periodTransactions } = getFilteredTransactions();

    const totalCount = periodTransactions.length;
    let totalAmount = 0;
    periodTransactions.forEach(t => totalAmount += (t.type === 'giden' ? -t.amount : t.amount));

    const formattedTotal = formatAmount(Math.abs(totalAmount));
    const direction = totalAmount > 0 ? '(Alacak)' : (totalAmount < 0 ? '(Borç)' : '');
    const color = totalAmount > 0 ? '#00e676' : (totalAmount < 0 ? '#ff1744' : '#b0bec5');

    summaryContainer.innerHTML = `
        <span style="color:#e0e0e0;">${totalCount} İşlem</span> | 
        <span style="color:${color};">${formattedTotal} ${direction}</span> 
    `;

    if (totalCount === 0) {
        listContainer.innerHTML = '<div class="empty-state">Kriterlere uygun kayıt yok.</div>';
        return;
    }

    const sortedTxs = [...periodTransactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    let html = '';
    sortedTxs.forEach(t => {
const dateShort = formatDateTR(new Date(t.date));
const amountClass = t.type === 'giden' ? 'text-expense' : 'text-income';
const descHtml = t.description ? `<div style="font-size:0.75em; color:#90a4ae; margin-top:2px;">${sanitizeHTML(t.description)}</div>` : '';

        html += `
        <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding:6px 4px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:0.8em; color:#90a4ae; min-width:70px;">${dateShort}</span>
                    <span style="font-size:0.85em; color:#e0e0e0; font-weight:600;">${sanitizeHTML(t.category)}</span>
                </div>
                <span class="${amountClass}" style="font-size:0.9em; font-weight:700;">${formatAmount(t.amount)}</span>
            </div>
            ${descHtml}
        </div>`;
    });

    listContainer.innerHTML = html;
}

function createCategorySummaryData(person, allTransactions, periodTransactions, startDateStr) {
    const cats = allData[person].categories.sort();
    const startDate = new Date(startDateStr);
    
    const data = [['Kategori', 'Devreden', 'Gelen TL', 'Giden TL', 'Kalan', 'Durum']];
    const activeCategories = [];
    
    cats.forEach(cat => {
        if(cat === 'BEN') return;
        
        let devreden = 0;
        allTransactions.forEach(t => {
            if (t.category === cat && new Date(t.date) < startDate) {
                if (t.type === 'giden') devreden += t.amount;
                else devreden -= t.amount;
            }
        });

        let periodGelen = 0;
        let periodGiden = 0;
        let hasPeriodActivity = false;

        periodTransactions.forEach(t => {
            if(t.category === cat) {
                hasPeriodActivity = true;
                if(t.type === 'giden') periodGiden += t.amount;
                else periodGelen += t.amount;
            }
        });
        
        if (Math.abs(devreden) > 0.01 || hasPeriodActivity) {
            const finalBalance = devreden + periodGiden - periodGelen;
            
            let status = finalBalance > 0.01 ? 'Borçlu' : (finalBalance < -0.01 ? 'Alacaklı' : '-');
            
            data.push([
                cat, 
                devreden,
                periodGelen,
                periodGiden,
                Math.abs(finalBalance),
                status
            ]);
            activeCategories.push(cat);
        }
    });
    
    return { categoryData: data, activeCategories };
}

function createTransactionDetailsData(transactions) {
    const data = [['Tarih', 'İşlem Tipi', 'Kategori', 'Açıklama', 'Tutar']];
    const sortedTransactions = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
    
    sortedTransactions.forEach(t => {
        data.push([
            formatDateTR(new Date(t.date)),
            t.type === 'giden' ? 'Giden' : 'Gelen',
            t.category,
            t.description,
            t.amount
        ]);
    });
    return data;
}

function applyNumberFormattingToSheet(ws, colIndexes, startRow) {
    if(!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    for(let R = startRow; R <= range.e.r; ++R) {
        colIndexes.forEach(C => {
            const cellRef = XLSX.utils.encode_cell({r: R, c: C});
            if(ws[cellRef]) {
                ws[cellRef].t = 'n'; 
                ws[cellRef].z = '#,##0.00'; 
            }
        });
    }
}

function exportToExcel() {
    if (exportInProgress) return showNotification("⚠️ Rapor hazırlanıyor...", "warning");
    const person = currentPerson;
    if (!person) return showNotification('Önce kişi seçmelisiniz.', 'error');
    
    exportInProgress = true;
    
    const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const styles = {
        title: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } } },
        dateRange: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: "FFFFFF" } } },
        header: { fill: { fgColor: { rgb: "BDD7EE" } }, font: { bold: true, color: { rgb: "000000" } }, border: borderStyle, alignment: { horizontal: 'center', vertical: 'center' } },
        rowGiden: { fill: { fgColor: { rgb: "FCE4D6" } }, border: borderStyle, alignment: { vertical: 'top', wrapText: true } },
        rowGelen: { fill: { fgColor: { rgb: "E2EFDA" } }, border: borderStyle, alignment: { vertical: 'top', wrapText: true } },
        cellNumber: { numFmt: "#,##0.00" },
        summaryHeader: { fill: { fgColor: { rgb: "444444" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, border: borderStyle, alignment: { horizontal: 'center' } }
    };

    function calculateColumnWidth(text, isNumber = false, isBold = false) {
        if (!text && text !== 0) return 10;
        const strText = String(text);
        let baseWidth = strText.length;
        if (isNumber) baseWidth *= 1.2; 
        if (isBold) baseWidth *= 1.15; 
        return Math.max(10, Math.ceil(baseWidth) + 2); 
    }

    try {
        const { allTransactions, periodTransactions } = getFilteredTransactions();
        
        const startDateVal = document.getElementById('startDate').value;
        const startDateDisplay = formatDateTR(new Date(startDateVal));
        const endDateDisplay = document.getElementById('endDate').value ? new Date(document.getElementById('endDate').value).toLocaleDateString('tr-TR') : 'Bugün';
        
        const dateRangeText = `${startDateDisplay} - ${endDateDisplay}`;

        if (periodTransactions.length === 0) {
             showNotification('⚠️ Seçilen aralıkta işlem yok.', 'warning');
        }

        const wb = XLSX.utils.book_new();

        const sortedTxs = [...periodTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        const titleText = `${person.toLocaleUpperCase('tr-TR')} - HESAP HAREKETLERİ`;

        const wsDataDetails = [
            [{ v: titleText, s: styles.title }, null, null, null, null], 
            [{ v: dateRangeText, s: styles.dateRange }, null, null, null, null], 
            [ 
                { v: "Tarih", s: styles.header },
                { v: "Gelen TL", s: styles.header },
                { v: "Giden TL", s: styles.header },
                { v: "Kalan TL", s: styles.header },
                { v: "Açıklama", s: styles.header }
            ]
        ];

        let colWidths = [12, 12, 12, 12, 50]; 
        
        let runningBalance = 0;
        allTransactions.forEach(t => {
            if (new Date(t.date) < new Date(startDateVal)) {
                 if (t.type === 'giden') runningBalance += t.amount;
                 else runningBalance -= t.amount;
            }
        });

        const devirRowStyle = { fill: { fgColor: { rgb: "BDD7EE" } }, border: borderStyle, font: { bold: true, italic: true } };
        wsDataDetails.push([
            { v: startDateDisplay, s: devirRowStyle },
            { v: "", s: devirRowStyle },
            { v: "", s: devirRowStyle },
            { v: runningBalance, t: 'n', s: { ...devirRowStyle, ...styles.cellNumber, alignment: { horizontal: 'right' } } },
            { v: "Önceki Aydan Devir", s: devirRowStyle }
        ]);

        sortedTxs.forEach(tx => {
            let amountNum = Number(tx.amount);
            if (tx.type === 'giden') runningBalance += amountNum;
            else runningBalance -= amountNum;
            
            let currentBalDisplay = Math.round(runningBalance * 100) / 100;
            const dateStr = formatDateTR(new Date(tx.date));
            let fullDescription = tx.category.toLocaleUpperCase('tr-TR');
            if (tx.description && tx.description.trim() !== "") fullDescription += " - " + tx.description;

            let rowStyleBase = tx.type === 'giden' ? styles.rowGiden : styles.rowGelen;

            if (tx.type === 'gelen') colWidths[1] = Math.max(colWidths[1], calculateColumnWidth(amountNum, true));
            if (tx.type === 'giden') colWidths[2] = Math.max(colWidths[2], calculateColumnWidth(amountNum, true));
            colWidths[3] = Math.max(colWidths[3], calculateColumnWidth(currentBalDisplay, true));

            const row = [
                { v: dateStr, s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top' } } },
                { v: tx.type === 'gelen' ? amountNum : "", t: tx.type === 'gelen' ? 'n' : 's', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: tx.type === 'giden' ? amountNum : "", t: tx.type === 'giden' ? 'n' : 's', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: currentBalDisplay, t: 'n', s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } },
                { v: fullDescription, s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } } }
            ];
            wsDataDetails.push(row);
        });

        const wsDetails = XLSX.utils.aoa_to_sheet([]);
        XLSX.utils.sheet_add_aoa(wsDetails, wsDataDetails, { origin: "A1" });
        wsDetails['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
        wsDetails['!cols'] = colWidths.map(w => ({ wch: w }));
        
        XLSX.utils.book_append_sheet(wb, wsDetails, 'Hareketler');

        const { categoryData, activeCategories } = createCategorySummaryData(person, allTransactions, periodTransactions, startDateVal);
        
        if (activeCategories.length > 0) {
            const wsDataSummary = [];

            wsDataSummary.push([{ v: `${person.toUpperCase()} - KATEGORİ ÖZETİ`, s: styles.title }]);
            wsDataSummary.push([{ v: dateRangeText, s: styles.dateRange }]);

            const headerRow = categoryData[0].map(h => ({ v: h, s: styles.summaryHeader }));
            wsDataSummary.push(headerRow);

            let sumColWidths = [25, 15, 15, 15, 15, 12];

            for (let i = 1; i < categoryData.length; i++) {
                const rowData = categoryData[i];
                const durum = rowData[5];
                
                let rowBg = "FFF2CC";
                if (durum === 'Borçlu') rowBg = "FCE4D6";
                if (durum === 'Alacaklı') rowBg = "E2EFDA";

                const cellStyle = { 
                    border: borderStyle, 
                    alignment: { horizontal: 'center', vertical: 'center' },
                    fill: { fgColor: { rgb: rowBg } } 
                };
                const numStyle = { ...cellStyle, ...styles.cellNumber, alignment: { horizontal: 'right' } };
                const boldNumStyle = { ...numStyle, font: { bold: true } };

                sumColWidths[0] = Math.max(sumColWidths[0], calculateColumnWidth(rowData[0]));
                sumColWidths[1] = Math.max(sumColWidths[1], calculateColumnWidth(rowData[1], true));
                sumColWidths[2] = Math.max(sumColWidths[2], calculateColumnWidth(rowData[2], true));
                sumColWidths[3] = Math.max(sumColWidths[3], calculateColumnWidth(rowData[3], true));
                sumColWidths[4] = Math.max(sumColWidths[4], calculateColumnWidth(rowData[4], true));

                wsDataSummary.push([
                    { v: rowData[0], s: { ...cellStyle, font: { bold: true }, alignment: { horizontal: 'left' } } }, 
                    { v: rowData[1], t: 'n', s: numStyle },
                    { v: rowData[2], t: 'n', s: numStyle },
                    { v: rowData[3], t: 'n', s: numStyle },
                    { v: rowData[4], t: 'n', s: boldNumStyle },
                    { v: rowData[5], s: cellStyle }
                ]);
            } 

            const wsSummary = XLSX.utils.aoa_to_sheet([]);
            XLSX.utils.sheet_add_aoa(wsSummary, wsDataSummary, { origin: "A1" });
            
            wsSummary['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
            ];
            
            wsSummary['!cols'] = sumColWidths.map(w => ({ wch: w }));

            XLSX.utils.book_append_sheet(wb, wsSummary, 'Kategori Özeti');
        }

        XLSX.writeFile(wb, `${person}_Ekstre_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('✅ Excel Başarıyla İndirildi', 'success');

    } catch (error) {
        console.error(error);
        showNotification('❌ Excel oluşturulurken hata!', 'error');
    } finally {
        setTimeout(() => exportInProgress = false, 1000);
    }
}

function showMonthlySummaryModal() {
    const person = currentPerson;
    if (!person) return showNotification('Kişi seçiniz', 'error');
    
    const ySel = document.getElementById('summaryYearSelect');
    const mSel = document.getElementById('summaryMonthSelect');
    if(!ySel || !mSel) return;
    
    ySel.innerHTML = ''; mSel.innerHTML = '';
    const dates = {};
    Object.keys(allData[person]).forEach(y => {
        if(!isNaN(y)) {
            dates[y] = new Set();
            Object.keys(allData[person][y]).forEach(m => dates[y].add(months.indexOf(m)));
        }
    });
    Object.keys(dates).sort((a,b)=>b-a).forEach(y => ySel.add(new Option(y,y)));
    ySel.onchange = () => {
        mSel.innerHTML = '';
        Array.from(dates[ySel.value]||[]).sort((a,b)=>a-b).forEach(m => mSel.add(new Option(months[m], m)));
    };
    if(ySel.options.length > 0) ySel.onchange();
    openModal('monthlySummaryModal');
}

async function exportMonthlySummary() {
    if (exportInProgress) return;
    const person = currentPerson;
    const year = document.getElementById('summaryYearSelect').value;
    const monthIndex = document.getElementById('summaryMonthSelect').value;

    if (!person || !year || monthIndex === "") return showNotification('Lütfen Tarih Seçiniz', 'error');

    exportInProgress = true;
    const btn = document.getElementById('generateReportBtn');
    if(btn) { btn.disabled = true; btn.textContent = 'Hazırlanıyor...'; }

    try {
        const monthName = months[monthIndex];
        
        const startDate = new Date(year, monthIndex, 1); 
        const endDate = new Date(year, parseInt(monthIndex) + 1, 0); 
        endDate.setHours(23, 59, 59);

        let allTxs = getAllTransactionsForPerson(person);
        
        let totalDevreden = 0;
        let categoryDevir = {};
        
        if(allData[person].categories) {
            allData[person].categories.forEach(c => categoryDevir[c] = 0);
        }

        allTxs.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate < startDate) {
                if (t.type === 'giden') {
                    totalDevreden += t.amount; 
                    if(categoryDevir[t.category] !== undefined) categoryDevir[t.category] += t.amount;
                } else {
                    totalDevreden -= t.amount; 
                    if(categoryDevir[t.category] !== undefined) categoryDevir[t.category] -= t.amount;
                }
            }
        });

        const monthlyTxs = allTxs.filter(t => {
            const d = new Date(t.date);
            return d >= startDate && d <= endDate;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        const wb = XLSX.utils.book_new();

        const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        const alignCenter = { horizontal: 'center', vertical: 'center' };
        const alignLeft = { horizontal: 'left', vertical: 'center' };
        const alignRight = { horizontal: 'right', vertical: 'center' };
        const fmtNumber = "#,##0.00"; 

        function calcWidth(currentMax, value) {
            let valStr = "";
            if (typeof value === 'number') {
                valStr = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(value);
            } else {
                valStr = String(value);
            }
            return Math.max(currentMax, valStr.length + 3);
        }

        const wsDataSummary = [
            [{ v: `${person.toUpperCase()} / ${monthName.toUpperCase()} ${year} - AYLIK HESAP ÖZETİ`, s: { font: { bold: true, sz: 12 }, alignment: alignCenter, fill: { fgColor: { rgb: "FFFFFF" } } } }],
            [
                { v: "Kategori", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Devreden", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Gelen TL", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Giden TL", s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Kalan",    s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } },
                { v: "Durum",    s: { fill: { fgColor: { rgb: "424242" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, border: borderStyle, alignment: alignCenter } }
            ]
        ];

        let sumColWidths = [20, 10, 10, 10, 10, 10]; 

        const categories = allData[person].categories ? allData[person].categories.sort() : [];
        let hasSummaryData = false;

        categories.forEach(cat => {
            if(cat === 'BEN') return;

            let ayGelen = 0;
            let ayGiden = 0;

            monthlyTxs.forEach(t => {
                if(t.category === cat) {
                    if(t.type === 'gelen') ayGelen += t.amount;
                    else ayGiden += t.amount;
                }
            });

            const devir = categoryDevir[cat] || 0;
            
            if (Math.abs(devir) > 0.01 || ayGelen > 0 || ayGiden > 0) {
                hasSummaryData = true;
                const kalan = devir + ayGiden - ayGelen;
                
                let durum = "-";
                let rowBg = "FFFFFF"; 

                if (kalan > 0.01) {
                    durum = "Borçlu";
                    rowBg = "FCE4D6"; 
                } else if (kalan < -0.01) {
                    durum = "Alacaklı";
                    rowBg = "E2EFDA"; 
                } else {
                    rowBg = "FFF2CC"; 
                }

                let cellStyle = { border: borderStyle, fill: { fgColor: { rgb: rowBg } }, font: { sz: 11 } };
                const numStyle = { ...cellStyle, numFmt: fmtNumber, alignment: alignRight };
                const boldNumStyle = { ...numStyle, font: { bold: true } };

                sumColWidths[0] = calcWidth(sumColWidths[0], cat);
                sumColWidths[1] = calcWidth(sumColWidths[1], devir);
                sumColWidths[2] = calcWidth(sumColWidths[2], ayGelen);
                sumColWidths[3] = calcWidth(sumColWidths[3], ayGiden);
                sumColWidths[4] = calcWidth(sumColWidths[4], kalan);

                wsDataSummary.push([
                    { v: cat, s: { ...cellStyle, font: { bold: true }, alignment: alignLeft } },
                    { v: devir, t: 'n', s: numStyle },
                    { v: ayGelen, t: 'n', s: numStyle },
                    { v: ayGiden, t: 'n', s: numStyle },
                    { v: kalan, t: 'n', s: boldNumStyle }, 
                    { v: durum, s: { ...cellStyle, alignment: alignCenter } }
                ]);
            }
        });

        if(!hasSummaryData) wsDataSummary.push([{v: "Bu ay işlem yok.", s: {alignment: alignCenter}}]);

        const wsSummary = XLSX.utils.aoa_to_sheet(wsDataSummary);
        wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
        
        wsSummary['!cols'] = sumColWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, wsSummary, "Aylık Özet");

        const wsDataMoves = [];
        
        wsDataMoves.push([
            { v: "KARMOTORS", s: { font: { bold: true, sz: 14 }, alignment: alignCenter } },
            null, null, null, null
        ]);

        wsDataMoves.push([
            { v: `${monthName.toUpperCase()} ${year} - HESAP HAREKETLERİ`, s: { font: { bold: true, sz: 11, color: { rgb: "000000" } }, alignment: alignCenter } },
            null, null, null, null
        ]);

        const headerStyle = { 
            fill: { fgColor: { rgb: "D9D9D9" } }, 
            font: { bold: true, color: { rgb: "000000" } }, 
            border: borderStyle,
            alignment: alignCenter
        };

        wsDataMoves.push([
            { v: "Tarih", s: headerStyle },
            { v: "Gelen TL", s: headerStyle },
            { v: "Giden TL", s: headerStyle },
            { v: "Kalan TL", s: headerStyle },
            { v: "Açıklama", s: headerStyle }
        ]);

        let moveColWidths = [11, 10, 10, 10, 50];

        let runningBalance = totalDevreden;
        
        const devirRowStyle = {
            fill: { fgColor: { rgb: "BDD7EE" } }, 
            border: borderStyle,
            font: { bold: true, italic: true }
        };
        const devirNumStyle = { ...devirRowStyle, numFmt: fmtNumber, alignment: alignRight };

        moveColWidths[3] = calcWidth(moveColWidths[3], runningBalance);

        wsDataMoves.push([
            { v: formatDateTR(startDate), s: { ...devirRowStyle, alignment: alignCenter } }, 
            { v: "", s: devirRowStyle }, 
            { v: "", s: devirRowStyle }, 
            { v: runningBalance, t: 'n', s: devirNumStyle }, 
            { v: "Önceki Aydan Devir", s: { ...devirRowStyle, alignment: alignLeft } }
        ]);

        monthlyTxs.forEach(t => {
            if (t.type === 'giden') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }

            let rowFill = "FFFFFF";
            if (t.type === 'gelen') rowFill = "E2EFDA"; 
            if (t.type === 'giden') rowFill = "FCE4D6"; 

            const rowStyle = {
                fill: { fgColor: { rgb: rowFill } },
                border: borderStyle,
                alignment: { vertical: "center" }
            };
            const rowNumStyle = { ...rowStyle, numFmt: fmtNumber, alignment: alignRight };
            const rowDateStyle = { ...rowStyle, alignment: alignCenter };
            
            const dateStr = formatDateTR(new Date(t.date));
            const desc = t.description ? t.description : t.category;

            if(t.type === 'gelen') moveColWidths[1] = calcWidth(moveColWidths[1], t.amount);
            if(t.type === 'giden') moveColWidths[2] = calcWidth(moveColWidths[2], t.amount);
            moveColWidths[3] = calcWidth(moveColWidths[3], runningBalance);

            wsDataMoves.push([
                { v: dateStr, s: rowDateStyle },
                { v: t.type === 'gelen' ? t.amount : "", t: t.type === 'gelen' ? 'n' : 's', s: rowNumStyle },
                { v: t.type === 'giden' ? t.amount : "", t: t.type === 'giden' ? 'n' : 's', s: rowNumStyle },
                { v: runningBalance, t: 'n', s: { ...rowNumStyle, font: { bold: true } } }, 
                { v: desc, s: { ...rowStyle, alignment: alignLeft, wrapText: true } }
            ]);
        });

        const wsMoves = XLSX.utils.aoa_to_sheet(wsDataMoves);
        wsMoves['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
        
        wsMoves['!cols'] = moveColWidths.map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, wsMoves, "Aylık Hareketler");

        XLSX.writeFile(wb, `${person}_${monthName}_${year}_Raporu.xlsx`);
        
        showNotification('✅ Rapor Başarıyla İndirildi', 'success');
        closeCurrentModal(document.getElementById('monthlySummaryModal'));

    } catch (e) {
        console.error(e);
        showNotification('❌ Rapor oluşturulurken hata!', 'error');
    } finally {
        exportInProgress = false;
        if(btn) { btn.disabled = false; btn.textContent = 'Rapor Oluştur'; }
    }
}

async function exportStyledCategoryDetailToExcel(person, categoryName, transactions) {
    if (!transactions || transactions.length === 0) return showNotification('⚠️ Veri yok', 'warning');

    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const startDate = formatDateTR(new Date(sortedTxs[0].date));
    const endDate = formatDateTR(new Date(sortedTxs[sortedTxs.length - 1].date));

    const borderStyle = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    
    const styles = {
        title: {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center', vertical: 'center' }
        },
        dateRange: {
            font: { bold: true },
            alignment: { horizontal: 'left' }
        },
        header: {
            fill: { fgColor: { rgb: "BDD7EE" } }, 
            font: { bold: true, color: { rgb: "000000" } },
            border: borderStyle,
            alignment: { horizontal: 'center', vertical: 'center' }
        },
        rowGiden: {
            fill: { fgColor: { rgb: "FCE4D6" } }, 
            border: borderStyle,
            alignment: { vertical: 'top', wrapText: true } 
        },
        rowGelen: {
            fill: { fgColor: { rgb: "E2EFDA" } }, 
            border: borderStyle,
            alignment: { vertical: 'top', wrapText: true } 
        },
        cellNumber: { numFmt: "#,##0.00" } 
    };

    function calculateColumnWidth(text, isNumber = false, isBold = false) {
        if (!text && text !== 0) return 8;
        const strText = String(text);
        let baseWidth = strText.length;
        if (isNumber) baseWidth *= 1.2; 
        if (isBold) baseWidth *= 1.15; 
        return Math.max(10, Math.ceil(baseWidth) - 1); 
    }

    let safeCatName = categoryName.toLocaleUpperCase('tr-TR');
    let titleSuffix = (safeCatName.includes('HESAP') || safeCatName.endsWith(' H.') || safeCatName.endsWith(' H')) ? '' : ' HESABI';
    const titleText = `${person.toLocaleUpperCase('tr-TR')} - ${safeCatName}${titleSuffix} HAREKETLERİ`;

    const wsData = [
        [{ v: titleText, s: styles.title }, null, null, null, null], 
        [{ v: `${startDate} - ${endDate}`, s: styles.dateRange }, null, null, null, null], 
        [ 
            { v: "Tarih", s: styles.header },
            { v: "Gelen TL", s: styles.header },
            { v: "Giden TL", s: styles.header },
            { v: "Bakiye", s: styles.header },
            { v: "Açıklama", s: styles.header }
        ]
    ];

    let colWidths = [
        calculateColumnWidth("Tarih", false, true),       
        calculateColumnWidth("Gelen TL", false, true),    
        calculateColumnWidth("Giden TL", false, true),    
        calculateColumnWidth("Bakiye", false, true),      
        50 
    ];

    let runningBalance = 0;
    
    sortedTxs.forEach(tx => {
        let amountNum = Number(tx.amount);

        if (tx.type === 'giden') {
            runningBalance += amountNum;
        } else {
            runningBalance -= amountNum;
        }
        
        runningBalance = Math.round(runningBalance * 100) / 100;

        const dateStr = formatDateTR(new Date(tx.date));
        const amountStr = new Intl.NumberFormat('tr-TR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(amountNum);
        const balanceStr = new Intl.NumberFormat('tr-TR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(Math.abs(runningBalance));

        const dateWidth = calculateColumnWidth(dateStr, false, false);
        if (dateWidth > colWidths[0]) colWidths[0] = dateWidth;

        if (tx.type === 'gelen') {
            const gelenWidth = calculateColumnWidth(amountStr, true, false);
            if (gelenWidth > colWidths[1]) colWidths[1] = gelenWidth;
        }

        if (tx.type === 'giden') {
            const gidenWidth = calculateColumnWidth(amountStr, true, false);
            if (gidenWidth > colWidths[2]) colWidths[2] = gidenWidth;
        }

        const bakiyeWidth = calculateColumnWidth(balanceStr, true, false);
        if (bakiyeWidth > colWidths[3]) colWidths[3] = bakiyeWidth;

        let rowStyleBase = tx.type === 'giden' ? styles.rowGiden : styles.rowGelen;

        const row = [
            { 
                v: dateStr, 
                s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top' } } 
            },
            { 
                v: tx.type === 'gelen' ? amountNum : "", 
                t: tx.type === 'gelen' ? 'n' : 's',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } 
            },
            { 
                v: tx.type === 'giden' ? amountNum : "", 
                t: tx.type === 'giden' ? 'n' : 's',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } 
            },
            { 
                v: runningBalance, 
                t: 'n',
                s: { ...rowStyleBase, ...styles.cellNumber, alignment: { horizontal: 'right', vertical: 'top' } } 
            },
            { 
                v: tx.description || '', 
                s: { ...rowStyleBase, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } } 
            }
        ];

        wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]); 
    
    XLSX.utils.sheet_add_aoa(ws, wsData, { origin: "A1" });

    ws['!cols'] = [
        { wch: colWidths[0] },      
        { wch: colWidths[1] },      
        { wch: colWidths[2] },      
        { wch: colWidths[3] },      
        { wch: 50 }                 
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, 
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } } 
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Hareketler");
    XLSX.writeFile(wb, `${categoryName}_Ekstre_${person}.xlsx`);
    
    showNotification('✅ Excel İndirildi (Otomatik Boyutlandırma)', 'success');
    return true;
}

function showMemoryOverlay(title, message, icon) {
    document.getElementById('memAlertTitle').textContent = title;
    document.getElementById('memAlertMessage').innerHTML = message; 
    if(DOM.memAlertIcon) DOM.memAlertIcon.textContent = icon;

    const overlay = document.getElementById('customMemoryOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('show'), 10);
    
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events"); 
}

function closeMemoryOverlay() {
    const overlay = document.getElementById('customMemoryOverlay');
    overlay.classList.remove('show');
    overlay.classList.remove('error-state');
    
    const yesBtn = overlay.querySelector('.btn-yes');
    if(yesBtn) {
        yesBtn.onclick = attemptBackupAndClear; 
        yesBtn.textContent = 'EVET';
        yesBtn.disabled = false;
    }

    setTimeout(() => {
        overlay.style.display = 'none';
        
        if (!document.querySelector('.modal.show') && !checkAnyMenuOpen()) {
             DOM.mainAppContainer?.classList.remove('disable-events');
             document.body.classList.remove("disable-events"); 
        }
    }, 300);
}

function initiateMemoryClear() {
    toggleSettingsMenu();
    
    showMemoryOverlay(
        "⚠️ DİKKAT",
        "Tarayıcı Belleğini Temizlemek İstediğinizden Emin misiniz?<br>Önce Sunucu Yedeklemesi Denenecektir!",
        "🧹"
    );
    
    const yesBtn = document.querySelector('#customMemoryOverlay .btn-yes');
    if(yesBtn) {
        yesBtn.onclick = attemptBackupAndClear; 
        yesBtn.textContent = "EVET";
    }
    const noBtn = document.querySelector('#customMemoryOverlay .btn-no');
    if(noBtn) {
        noBtn.onclick = closeMemoryOverlay;
    }
} 

async function attemptBackupAndClear() {
    const yesBtn = document.querySelector('#customMemoryOverlay .btn-yes');
    const noBtn = document.querySelector('#customMemoryOverlay .btn-no');
    
    if(yesBtn) {
        yesBtn.disabled = true;
        yesBtn.textContent = "Yedekleniyor...";
        noBtn.disabled = true;
    }
    
    const alertTitle = document.getElementById('memAlertTitle');
    const alertMessage = document.getElementById('memAlertMessage');
    
    alertTitle.textContent = "Yedekleme İşlemi";
    alertMessage.innerHTML = "Sunucuya veri yedekleniyor, lütfen bekleyin...";

    try {
        const data = await advancedStorage.getItem('sahsiHesapTakibiData');

        if(data) {
            await saveDataToServer(JSON.parse(data), true);
            
            alertTitle.textContent = "Yedekleme Başarılı ✅";
            alertMessage.innerHTML = "Sunucuya kaydedildi. Şimdi bellek temizlenecek...";
            
            if(yesBtn) yesBtn.textContent = "TEMİZLENİYOR...";
            if(noBtn) noBtn.style.display = "none";
            setTimeout(() => finalizeClear(), 1500);
            
        } else {
            alertTitle.textContent = "Yedekleme Gerekmiyor";
            alertMessage.innerHTML = "Yerel veri bulunamadı. Bellek temizleniyor...";
            if(yesBtn) yesBtn.textContent = "TEMİZLENİYOR...";
            if(noBtn) noBtn.style.display = "none";
            setTimeout(() => finalizeClear(), 1000);
        }
        
    } catch (e) {
        console.error("Yedekleme hatası:", e);
        
        const overlay = document.getElementById('customMemoryOverlay');
        overlay.classList.add('error-state');

        alertTitle.textContent = "⚠️ YEDEKLEME BAŞARISIZ!";
        alertMessage.innerHTML = "Sunucuya erişilemedi/kaydedilemedi.<br>Yine de silerseniz **veriler kaybolabilir**.<br>Devam edilsin mi?";
        
        if(yesBtn) {
            yesBtn.disabled = false; 
            yesBtn.textContent = "EVET, SİL";
            yesBtn.onclick = finalizeClear;
            noBtn.disabled = false;
        }
    }
}

async function finalizeClear() {
    const btn = document.querySelector('.btn-yes');
    const noBtn = document.querySelector('.btn-no');
    if(btn) btn.innerText = 'TEMİZLENİYOR...';
    if(noBtn) noBtn.style.display = "none";

    try {
        localStorage.removeItem('sahsiHesapTakibiData');
        localStorage.removeItem('sahsiHesapTakibiNotifications');
        
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        
        if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
                await caches.delete(key);
            }
        }
        
        const alertTitle = document.getElementById('memAlertTitle');
        const alertMessage = document.getElementById('memAlertMessage');
        alertTitle.textContent = "✅ BAŞARILI";
        alertMessage.innerHTML = "Bellek temizlendi. Sayfa yenileniyor...";

        setTimeout(() => {
            window.location.href = window.location.pathname;
        }, 1500); 
        
    } catch (e) {
        console.error("Temizleme hatası:", e);
        window.location.reload(true);
    }
}

let deferredPrompt;
let pwaInstallBannerDismissed = false;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwaInstallDismissed');
    if (!dismissed && !pwaInstallBannerDismissed) {
        showPWAInstallBanner();
    }
});

function showPWAInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (!banner) return;

    banner.style.display = 'block';

    // Install button
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
        installBtn.onclick = async () => {
            if (!deferredPrompt) return;

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('PWA installed successfully');
            }

            deferredPrompt = null;
            hidePWAInstallBanner();
        };
    }

    // Close button
    const closeBtn = document.getElementById('pwaInstallClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            localStorage.setItem('pwaInstallDismissed', 'true');
            pwaInstallBannerDismissed = true;
            hidePWAInstallBanner();
        };
    }
}

function hidePWAInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            banner.style.display = 'none';
        }, 300);
    }
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    console.log('PWA successfully installed');
    hidePWAInstallBanner();
    showNotification('Uygulama başarıyla yüklendi!', 'success');
});

// Background Sync: Online/Offline Detection
let isOnline = navigator.onLine;

window.addEventListener('online', async () => {
    isOnline = true;
    updateServerStatus('success', '🌐 Bağlantı kuruldu');
    await showNotification('İnternet bağlantısı geri geldi', 'success');

    // Trigger background sync if supported
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-data');
            console.log('Background sync registered');
        } catch (error) {
            console.error('Background sync registration failed:', error);
            // Fallback: manual sync
            await manualSync();
        }
    } else {
        // Browser doesn't support background sync, do manual sync
        await manualSync();
    }
});

window.addEventListener('offline', async () => {
    isOnline = false;
    updateServerStatus('error', '📡 Çevrimdışı mod');
    await showNotification('İnternet bağlantısı kesildi. Veriler cihazda saklanıyor.', 'warning');
});

// Manual sync fallback
async function manualSync() {
    try {
        const db = await openIndexedDB();
        const syncQueue = await getSyncQueue(db);

        if (syncQueue.length > 0) {
            console.log('Manual sync: processing', syncQueue.length, 'items');

            for (const item of syncQueue) {
                try {
                    const response = await fetch(item.url, {
                        method: item.method,
                        headers: item.headers,
                        body: item.body
                    });

                    if (response.ok) {
                        await removeSyncQueueItem(db, item.id);
                        console.log('Synced item:', item.id);
                    }
                } catch (error) {
                    console.error('Sync failed for item:', item.id, error);
                }
            }

            await showNotification(`${syncQueue.length} değişiklik senkronize edildi`, 'success');
        }
    } catch (error) {
        console.error('Manual sync error:', error);
    }
}

// Helper functions for sync queue
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SahsiHesapDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getSyncQueue(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('syncQueue', 'readonly');
        const store = transaction.objectStore('syncQueue');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function addToSyncQueue(db, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('syncQueue', 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.add({
            ...item,
            timestamp: Date.now()
        });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function removeSyncQueueItem(db, itemId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('syncQueue', 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.delete(itemId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Listen for sync complete message from service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
            console.log('Background sync completed:', event.data.syncedCount, 'items');
            await showNotification(`${event.data.syncedCount} değişiklik senkronize edildi`, 'success');
            // Reload data to show synced changes
            await loadData();
            updateMainDisplay();
        }
    });
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const root = document.documentElement;
    root.style.setProperty("--sa-top", "env(safe-area-inset-top)");
    root.style.setProperty("--sa-bot", "env(safe-area-inset-bottom)");
    root.style.setProperty("--sa-left", "env(safe-area-inset-left)");
    root.style.setProperty("--sa-right", "env(safe-area-inset-right)");
    root.style.setProperty("--safe-area-top", "env(safe-area-inset-top)");

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
    if (isIOS && isPWA) {
        document.body.classList.add('ios-pwa');
    }
});
window.installPWA = function() {
    if (!deferredPrompt) {
        alert("PWA kurulumu şu anda kullanılamıyor");
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        deferredPrompt = null;
    });
};

const closeMenuOutside = (event) => {
    if (!event.target.closest('.notification-icon-btn')) {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        let hasOpenMenu = false;
        dropdowns.forEach(openDropdown => {
            if (openDropdown.style.display === 'block' && !openDropdown.contains(event.target)) {
                hasOpenMenu = true;
            }
        });
        if (hasOpenMenu) {
            closeAllMenus();
        }
    }
};

document.addEventListener('touchstart', (event) => {
    const hasOpenMenu = document.querySelector('.dropdown-menu[style*="display: block"]');
    if(hasOpenMenu && !event.target.closest('.dropdown-menu') && !event.target.closest('.notification-icon-btn')) {
         closeMenuOutside(event);
    }
}, {passive: true});

function showGeneralStatusReport() {
    const debtors = [];
    const creditors = [];
    
    let totalDebt = 0;
    let totalCredit = 0;
    
    Object.keys(allData).sort().forEach(person => {
        if(person === 'metadata') return;
        
        const balance = calculatePersonTotalBalance(person);
        const absBal = Math.abs(balance);
        
        if(absBal < 0.01) return; 
        
        if (balance > 0) {
            debtors.push({ name: person, amount: absBal });
            totalCredit += absBal; 
        } else {
            creditors.push({ name: person, amount: absBal });
            totalDebt += absBal; 
        }
    });
    
    let html = '<div class="report-grid">';
    
    html += '<div class="report-col left-col">';
    html += '<div class="report-header"><span>BORÇLAR</span></div>';
    html += '<div class="report-list">';
    creditors.forEach(c => {
        html += `<div class="report-item">
            <span class="report-name">${c.name}</span>
            <span class="report-val val-red">${formatAmount(c.amount)}</span>
        </div>`;
    });
    if(creditors.length === 0) html += '<div class="empty-state">Borç yok</div>';
    html += '</div>'; 
    html += '</div>'; 

    html += '<div class="report-col right-col">';
    html += '<div class="report-header"><span>ALACAKLAR</span></div>';
    html += '<div class="report-list">';
    debtors.forEach(d => {
        html += `<div class="report-item">
            <span class="report-name">${d.name}</span>
            <span class="report-val val-green">${formatAmount(d.amount)}</span>
        </div>`;
    });
    if(debtors.length === 0) html += '<div class="empty-state">Alacak yok</div>';
    html += '</div>'; 
    html += '</div>'; 
    
    html += '</div>';

    const netBalance = totalCredit - totalDebt;
    let netColorClass = '';
    let resultText = '';
    
    if (netBalance > 0.01) {
        netColorClass = 'val-green'; 
        resultText = 'NET ALACAĞINIZ';
    } else if (netBalance < -0.01) {
        netColorClass = 'val-red'; 
        resultText = 'NET BORCUNUZ';
    } else {
        netColorClass = 'val-neutral';
        resultText = 'NET DURUM';
    }
    
    const resultAmount = formatAmount(Math.abs(netBalance));

    let statusHtml = `
    <div class="new-summary-container">
        <div class="summary-top-row">
            <div class="summary-box-item">
                <span class="summary-label">TOPLAM BORCUNUZ</span>
                <span class="summary-val val-red">${formatAmount(totalDebt)}</span>
            </div>
            
            <div class="summary-box-item">
                <span class="summary-label">TOPLAM ALACAĞINIZ</span>
                <span class="summary-val val-green">${formatAmount(totalCredit)}</span>
            </div>
        </div>

        <div class="summary-net-row">
            <span class="summary-label">${resultText}</span>
            <span class="summary-val ${netColorClass}">${resultAmount}</span>
        </div>
    </div>`;

    document.getElementById('reportContent').innerHTML = html + statusHtml;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);

    if (isIOS && isPWA) {
        document.body.classList.add('modal-open-ios');
    }

    openModal('generalStatusModal');
}

function exportSystemToJSON() {
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SahsiHesapYedek_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('✅ Yedek dosyası indirildi', 'success');
}

function importSystemFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (confirm('Mevcut veriler silinip yedekten geri yüklenecek. Onaylıyor musunuz?')) {
                allData = importedData;
                queueSave();
                updateMainDisplay();
                showNotification('✅ Yedek başarıyla yüklendi', 'success');
                event.target.value = '';
            }
        } catch (error) {
            showNotification('❌ Hatalı dosya formatı!', 'error');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

function showQuickTransactionOverlay() {
    
    const quickOverlayContainer = document.getElementById('quickOverlayContainer'); 
    if (quickOverlayContainer) quickOverlayContainer.style.display = 'flex';
    
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events"); 
    
    document.querySelector('.quick-panel-content').classList.remove('filled-mode');
    
    resetQuickPanel();
    populateQuickPersonList();
    
    setTimeout(() => {
        document.getElementById('quickSearchInput').focus();
    }, 100);
}

function closeQuickTransactionOverlay() {
    
    const quickOverlayContainer = document.getElementById('quickOverlayContainer'); 
    if (quickOverlayContainer) quickOverlayContainer.style.display = 'none';
    
    document.body.classList.remove("disable-events"); 

    if (!document.querySelector('.modal.show') && !checkAnyMenuOpen()) {
        DOM.mainAppContainer?.classList.remove('disable-events');
    }
    
    document.getElementById('quickSearchInput').value = '';
    
    const panelContent = document.querySelector('.quick-panel-content');
    if (panelContent) panelContent.classList.remove('filled-mode');
}

function populateQuickPersonList() {
    const list = document.getElementById('quickPersonList');
    if(!list) return;
    list.innerHTML = '';
    
    const people = Object.keys(allData).filter(p => p !== 'metadata').sort();
    
    people.forEach(person => {
        const div = document.createElement('div');
        div.className = 'person-item quick-person-item'; 
        div.textContent = person;
        div.onclick = () => selectQuickPersonFromOverlay(person);
        list.appendChild(div);
    });
}

function filterQuickPersonList() {
    const filter = document.getElementById('quickSearchInput').value.toLocaleUpperCase('tr-TR');
    const items = document.querySelectorAll('.person-item');
    
    items.forEach(item => {
        const txt = item.textContent || item.innerText;
        if (txt.toLocaleUpperCase('tr-TR').indexOf(filter) > -1) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });
}

function selectQuickPersonFromOverlay(person) {
    quickPersonSelectedValue = person;
    currentPerson = person;
    
    document.querySelector('.quick-panel-content').classList.add('filled-mode');
    
    document.querySelector('.quick-search-wrapper').style.display = 'none';
    document.getElementById('quickPersonList').style.display = 'none';
    
    document.getElementById('quickTransactionForm').style.display = 'block';
    document.getElementById('selectedPersonNameDisplay').textContent = person;
    
    populateCategorySelect(document.getElementById('quickCategory'), person);
    document.getElementById('quickAmount').value = '';
    document.getElementById('quickDescription').value = '';
    setQuickTransactionType('giden');
}

function resetQuickPanel() {
    quickPersonSelectedValue = null;
    currentPerson = null;
    
    document.querySelector('.quick-panel-content').classList.remove('filled-mode');
    
    document.getElementById('quickTransactionForm').style.display = 'none';
    
    document.querySelector('.quick-search-wrapper').style.display = 'block';
    document.getElementById('quickPersonList').style.display = 'block';
    document.getElementById('quickSearchInput').value = '';
    filterQuickPersonList(); 
}

function setQuickTransactionType(type) {
    const typeInput = document.getElementById('quickTransactionType');
    if (typeInput) typeInput.value = type;
    
    document.getElementById('quickGidenBtn').classList.toggle('active', type === 'giden');
    document.getElementById('quickGelenBtn').classList.toggle('active', type === 'gelen');
    
    if (quickPersonSelectedValue) {
        populateCategorySelect(document.getElementById('quickCategory'), quickPersonSelectedValue);
    }
}

function checkQuickAllocation() {
    const type = document.getElementById('quickTransactionType')?.value;
    const person = quickPersonSelectedValue;
    const amount = deformatCurrency(document.getElementById('quickAmount')?.value || '0');
    
    if (type !== 'gelen' || !person || amount <= 0) return;
    
    if (allData[person]) {
        const debts = Object.keys(allData[person].categoryBalances || {})
            .filter(c => allData[person].categoryBalances[c] > 0.01);
        
        if (debts.length > 0) {
            const desc = document.getElementById('quickDescription')?.value?.trim() || '';
            
            closeQuickTransactionOverlay();
            
            currentPerson = person;
            quickAllocationDesc = desc;
            
            setTimeout(() => {
                const tempInput = document.createElement('input');
                tempInput.value = amount.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                const origAmount = DOM.amount;
                DOM.amount = tempInput;
                
                initiateAllocation();
                
                DOM.amount = origAmount;
            }, 150);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const quickAmountInput = document.getElementById('quickAmount');
        const quickCategorySelect = document.getElementById('quickCategory');
        
        if (quickAmountInput) {
            quickAmountInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                    setTimeout(checkQuickAllocation, 50);
                }
            });
            
            quickAmountInput.addEventListener('blur', () => {
                setTimeout(checkQuickAllocation, 100);
            });
        }
        
        if (quickCategorySelect) {
            quickCategorySelect.addEventListener('mousedown', (e) => {
                const type = document.getElementById('quickTransactionType')?.value;
                const amount = deformatCurrency(document.getElementById('quickAmount')?.value || '0');
                
                if (type === 'gelen' && amount > 0) {
                    e.preventDefault();
                    checkQuickAllocation();
                }
            });
            
            quickCategorySelect.addEventListener('focus', () => {
                const type = document.getElementById('quickTransactionType')?.value;
                const amount = deformatCurrency(document.getElementById('quickAmount')?.value || '0');
                
                if (type === 'gelen' && amount > 0) {
                    checkQuickAllocation();
                }
            });
        }
    }, 500);
});
 
async function processQuickTransaction() {
    if(isProcessing) return; 
    
    const person = quickPersonSelectedValue;
    const amount = deformatCurrency(document.getElementById('quickAmount').value);
    const category = document.getElementById('quickCategory').value;
    const type = document.getElementById('quickTransactionType').value;
    
    if (!person) return showNotification('Kişi seçiniz!', 'error');
    if (amount === 0) return showNotification('Tutar giriniz!', 'error');
    if (!category) return showNotification('Kategori seçiniz!', 'error');

    let desc = document.getElementById('quickDescription').value.trim();
    desc = formatTitleCase(desc); 

    if (type === 'gelen' && allData[person]) {
        const debts = Object.keys(allData[person].categoryBalances || {})
            .filter(c => allData[person].categoryBalances[c] > 0.01);
        
        if (debts.length > 0) {
            closeQuickTransactionOverlay();
            
            currentPerson = person;
            quickAllocationDesc = desc;
            quickAllocationCategory = category;
            
            setTimeout(() => {
                const tempInput = document.createElement('input');
                tempInput.value = amount.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                const origAmount = DOM.amount;
                DOM.amount = tempInput;
                
                initiateAllocation();
                
                DOM.amount = origAmount;
            }, 150);
            
            return;
        }
    }
 
    isProcessing = true;
    const btn = document.querySelector('#quickTransactionForm .btn-success');
    if(btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    try {
        addTransaction(person, type, amount, category, desc); 
        queueSave(); 
        
        const typeText = type === 'gelen' ? 'Girişi' : 'Çıkışı';
        showNotification(`⚡ ${formatAmount(amount)} Para ${typeText} Oldu`, 'success');
        
        closeQuickTransactionOverlay();
        updateMainDisplay(); 
        
    } finally {
        isProcessing = false;
        if(btn) { btn.disabled = false; btn.textContent = ' ✅ İşlemi Kaydet'; }
    }
}

function showSyncHelp() {
    openModal('syncHelpModal');
}

let activeContextMenu = null;

function attachThreeDotsMenu(historyItem, transaction, person) {
    
    historyItem.addEventListener('click', function(e) {
        const rect = historyItem.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        if (clickX > rect.width - 50) {
            e.stopPropagation();
            showTransactionContextMenu(e, transaction, person, historyItem);
        }
    });
}

function showTransactionContextMenu(event, transaction, person, historyItem) {
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
    }
    
    const menu = document.createElement('div');
    menu.className = 'three-dot-menu';
    
    const editItem = document.createElement('div');
    editItem.className = 'menu-item';
    editItem.setAttribute('data-action', 'edit');
    editItem.innerHTML = '<span>&#9998;</span> Düzenle';
    
    const deleteItem = document.createElement('div');
    deleteItem.className = 'menu-item';
    deleteItem.setAttribute('data-action', 'delete');
    deleteItem.innerHTML = '<span>&#10060;</span> Sil';
    
    menu.appendChild(editItem);
    menu.appendChild(deleteItem);
    
    const modal = historyItem.closest('.modal');
    const rect = historyItem.getBoundingClientRect();
    
    if (modal) {
        const modalBody = modal.querySelector('.modal-body');
        const modalBodyRect = modalBody.getBoundingClientRect();
        
        menu.style.position = 'absolute';
        menu.style.top = (rect.top - modalBodyRect.top + modalBody.scrollTop) + 'px';
        menu.style.right = '10px';
        menu.style.zIndex = '5000';
        
        modalBody.appendChild(menu);
    } else {
        menu.style.position = 'fixed';
        menu.style.top = rect.top + 'px';
        menu.style.right = '10px';
        menu.style.zIndex = '5000';
        
        document.body.appendChild(menu);
    }
    
    activeContextMenu = menu;
    
    setTimeout(function() {
        menu.classList.add('show');
    }, 10);
    
    menu.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            
            if (action === 'edit') {
                editTransaction(transaction.id, person);
            } else if (action === 'delete') {
deleteTransaction(transaction.id);
            }
            
            closeContextMenu();
        });
    });
    
    setTimeout(function() {
        document.addEventListener('click', closeContextMenu);
    }, 100);
}

function closeContextMenu() {
    if (activeContextMenu) {
        activeContextMenu.classList.remove('show');
        setTimeout(function() {
            if (activeContextMenu) {
                activeContextMenu.remove();
                activeContextMenu = null;
            }
        }, 200);
    }
    document.removeEventListener('click', closeContextMenu);
}

function injectThreeDotMenuStyles() {
    if (document.getElementById('three-dot-menu-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'three-dot-menu-styles';
    style.textContent = '.three-dot-menu {background: rgba(14, 21, 37, 0.98);border: 1px solid rgba(255, 255, 255, 0.4);border-radius: 12px;padding: 8px;min-width: 150px;box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);opacity: 0;transform: translateX(20px);transition: all 0.2s ease;}.three-dot-menu.show {opacity: 1;transform: translateX(0);}.three-dot-menu .menu-item {padding: 8px 15px;color: #e0e0e0;font-weight: 600;cursor: pointer;border-radius: 8px;display: flex;align-items: center;gap: 10px;transition: all 0.2s ease;}.three-dot-menu .menu-item:hover {transform: scale(1.05);}.three-dot-menu .menu-item[data-action="delete"]:hover {color: #ff1744;}.three-dot-menu .menu-item span {font-size: 18px;}';
    
    document.head.appendChild(style);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectThreeDotMenuStyles);
} else {
    injectThreeDotMenuStyles();
}

let typingBuffer = '';
let typingTimeout = null;

function initPersonSelectKeyboardNav() {
    const personSelect = document.getElementById('personSelect');
    if (!personSelect) return;
    
    personSelect.addEventListener('keydown', function(e) {
        if (e.key.length === 1 && /[a-züğşçöıİ]/i.test(e.key)) {
            e.preventDefault();
            
            typingBuffer += e.key.toLocaleLowerCase('tr-TR');
            
            if (typingTimeout) clearTimeout(typingTimeout);
            
            typingTimeout = setTimeout(() => {
                typingBuffer = '';
            }, 1000);
            
            findAndSelectPerson(typingBuffer);
        }
    });
}

function findAndSelectPerson(searchText) {
    const personSelect = document.getElementById('personSelect');
    if (!personSelect) return;
    
    const options = Array.from(personSelect.options);
    
    for (let i = 1; i < options.length; i++) {
        const personName = options[i].value.toLocaleLowerCase('tr-TR');
        
        if (personName.startsWith(searchText)) {
            personSelect.selectedIndex = i;
            
            personSelect.style.borderColor = '#42a5f5';
            setTimeout(() => {
                personSelect.style.borderColor = '';
            }, 300);
            
            return;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersonSelectKeyboardNav);
} else {
    initPersonSelectKeyboardNav();
}

let modalSwipeStartX = 0;
let modalSwipeStartY = 0;
let modalSwipeEndX = null;
let modalSwipeEndY = null;
let modalSwipeStartTime = 0;

const tabOrder = ['yeniIslem', 'islemGecmisi', 'kategoriDurumu', 'raporlar'];

function initModalSwipe() {
    const modal = document.getElementById('personModal');
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (!modalContent) return;
    
    modalContent.addEventListener('touchstart', handleModalTouchStart, { passive: true });
    modalContent.addEventListener('touchmove', handleModalTouchMove, { passive: true });
    modalContent.addEventListener('touchend', handleModalTouchEnd, { passive: true });
}

function handleModalTouchStart(e) {
    modalSwipeStartX = e.changedTouches[0].screenX;
    modalSwipeStartY = e.changedTouches[0].screenY;
    modalSwipeStartTime = new Date().getTime();
    
    modalSwipeEndX = null;
    modalSwipeEndY = null;
}

function handleModalTouchMove(e) {
    modalSwipeEndX = e.changedTouches[0].screenX;
    modalSwipeEndY = e.changedTouches[0].screenY;
}

function handleModalTouchEnd(e) {
    if (modalSwipeEndX === null || modalSwipeEndY === null) return;

    const duration = new Date().getTime() - modalSwipeStartTime;
    if (duration > 500) return; 

    const diffX = modalSwipeStartX - modalSwipeEndX;
    const diffY = modalSwipeStartY - modalSwipeEndY;
    
    const isHorizontalSwipe = Math.abs(diffX) > (Math.abs(diffY) * 1.8);
    
    const minSwipeDistance = 60;
    
    if (isHorizontalSwipe && Math.abs(diffX) > minSwipeDistance) {
        const activeTab = document.querySelector('.tab-content[style*="display: block"]');
        if (!activeTab) return;
        
        const currentTabId = activeTab.id;
        const currentIndex = tabOrder.indexOf(currentTabId);
        
        if (currentIndex === -1) return;
        
        let newIndex;
        
        if (diffX > 0) {
            newIndex = currentIndex + 1;
        } else {
            newIndex = currentIndex - 1;
        }
        
        if (newIndex >= 0 && newIndex < tabOrder.length) {
            const newTabId = tabOrder[newIndex];
            const newTabBtn = document.querySelector(`.tab-btn[onclick*="${newTabId}"]`);
            if (newTabBtn) {  
                newTabBtn.click();
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalSwipe);
} else {
    initModalSwipe();
} 

function updateVersionDisplay() {
    const versionElement = document.querySelector('.version');
    if (!versionElement) return;

    const currentVersion = 'v' + APP_VERSION;
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);

    let suffix = "";

    if (isPWA) {
        if (isIOS) {
            suffix = " iOS PWA";
        } else {
            suffix = " PWA";
        }
    } else if (isMobile) {
        suffix = " Mobil";
    }

    versionElement.textContent = currentVersion + suffix;
}

(function(){
  function applyFullName(el){
    try{
      if(!el) return;
      var full = el.getAttribute('data-fullname') || el.getAttribute('data-name') || el.title || el.textContent || el.innerText || '';
      if(full && full.length>1){
        el.textContent = full;
      }
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'visible';
      el.style.textOverflow = 'clip';
      el.style.minWidth = '86px';
      el.style.maxWidth = '240px';
      el.style.display = 'inline-block';
      el.style.padding = '0 6px';
    }catch(e){
      console && console.warn && console.warn('applyFullName error', e);
    }
  }

  function fixAll(){
    var items = document.querySelectorAll('.q-name, .quick-item .q-name, .user-name, .display-name');
    items.forEach(function(el){
      applyFullName(el);
      if(el && (!el.title || el.title.length<2)) el.title = el.getAttribute('data-fullname') || el.textContent || el.innerText || el.title;
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixAll);
  } else {
    setTimeout(fixAll, 50);
  } 

  var observerTimeout = null;
  var obs = new MutationObserver(function(mutations){
    if(observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(function(){
      mutations.forEach(function(m){
        if(m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(function(node){
            if(node.nodeType===1){
              if(node.matches && (node.matches('.q-name') || node.querySelector('.q-name'))){
                var el = node.matches('.q-name') ? node : node.querySelector('.q-name');
                applyFullName(el);
              } else {
                var inner = node.querySelectorAll && node.querySelectorAll('.q-name');
                inner && inner.forEach(function(el){ applyFullName(el); });
              }
            }
          });
        }
        if(m.type === 'attributes' && m.target && (m.target.classList && m.target.classList.contains('q-name'))){
          applyFullName(m.target);
        }
      });
    }, 50);
  });

  var quickGrid = document.getElementById('quickAccessGrid');
  if(quickGrid) {
    obs.observe(quickGrid, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class','data-name','data-fullname','title']
    });
  }

  window.__karmotors_forceFixNames = fixAll;
})();
function initMobileDateDisplay() {
    if (window.innerWidth > 800) return;
    
    const dateInput = document.getElementById('dateInput');
    const dateDisplay = document.querySelector('.mobile-date-display') || document.querySelector('.current-date-display');
    
    if (dateInput && dateDisplay) {
        function updateMainDateDisplay() {
            const value = dateInput.value;
            if (value) {
                dateDisplay.textContent = formatDateTR(new Date(value));
            } else {
                dateDisplay.textContent = formatDateTR(new Date());
            }
        }
        
        updateMainDateDisplay();
        dateInput.addEventListener('change', updateMainDateDisplay);
        
        const dateRow = dateInput.closest('.date-row-transparent');
        if (dateRow) {
            dateRow.addEventListener('click', (e) => {
                if (e.target !== dateInput) {
                    if (typeof dateInput.showPicker === 'function') {
                        dateInput.showPicker();
                    } else {
                        dateInput.focus();
                        dateInput.click();
                    }
                }
            });
        }
    }
    
    const editDateInput = document.getElementById('editDateInput');
    const editDateDisplay = document.getElementById('editMobileDateDisplay');
    
    if (editDateInput && editDateDisplay) {
        function updateEditDateDisplay() {
            const value = editDateInput.value;
            if (value) {
                editDateDisplay.textContent = formatDateTR(new Date(value));
            }
        }
        
        editDateInput.addEventListener('change', updateEditDateDisplay);
        
        const editDateSection = editDateInput.closest('.date-section-inline');
        if (editDateSection) {
            editDateSection.addEventListener('click', (e) => {
                if (e.target !== editDateInput && !e.target.matches('label')) {
                    if (typeof editDateInput.showPicker === 'function') {
                        editDateInput.showPicker();
                    } else {
                        editDateInput.focus();
                        editDateInput.click();
                    }
                }
            });
        }
    }
    
    const startDateInput = document.getElementById('startDate');
    const startDateDisplay = document.getElementById('startDateDisplay');
    const endDateInput = document.getElementById('endDate');
    const endDateDisplay = document.getElementById('endDateDisplay');
    
    if (startDateInput && startDateDisplay) {
        function updateStartDateDisplay() {
            const value = startDateInput.value;
            if (value) {
                startDateDisplay.textContent = formatDateTR(new Date(value));
            }
        }
        
        startDateInput.addEventListener('change', updateStartDateDisplay);
        
        const startDateGroup = startDateInput.closest('.rd-date-group');
        if (startDateGroup) {
            startDateGroup.addEventListener('click', (e) => {
                if (e.target !== startDateInput && !e.target.matches('label')) {
                    if (typeof startDateInput.showPicker === 'function') {
                        startDateInput.showPicker();
                    } else {
                        startDateInput.focus();
                        startDateInput.click();
                    }
                }
            });
        }
    }
    
    if (endDateInput && endDateDisplay) {
        function updateEndDateDisplay() {
            const value = endDateInput.value;
            if (value) {
                endDateDisplay.textContent = formatDateTR(new Date(value));
            }
        }
        
        endDateInput.addEventListener('change', updateEndDateDisplay);
        
        const endDateGroup = endDateInput.closest('.rd-date-group');
        if (endDateGroup) {
            endDateGroup.addEventListener('click', (e) => {
                if (e.target !== endDateInput && !e.target.matches('label')) {
                    if (typeof endDateInput.showPicker === 'function') {
                        endDateInput.showPicker();
                    } else {
                        endDateInput.focus();
                        endDateInput.click();
                    }
                }
            });
        }
    }
}

function updateAllMobileDateDisplays() {
    if (window.innerWidth > 800) return;
    
    const dateInput = document.getElementById('dateInput');
    const dateDisplay = document.querySelector('.mobile-date-display');
    if (dateInput && dateDisplay && dateInput.value) {
        dateDisplay.textContent = formatDateTR(new Date(dateInput.value));
    }
    
    const editDateInput = document.getElementById('editDateInput');
    const editDateDisplay = document.getElementById('editMobileDateDisplay');
    if (editDateInput && editDateDisplay && editDateInput.value) {
        editDateDisplay.textContent = formatDateTR(new Date(editDateInput.value));
    } 
    
    const startDateInput = document.getElementById('startDate');
    const startDateDisplay = document.getElementById('startDateDisplay');
    if (startDateInput && startDateDisplay && startDateInput.value) {
        startDateDisplay.textContent = formatDateTR(new Date(startDateInput.value));
    }
    
    const endDateInput = document.getElementById('endDate');
    const endDateDisplay = document.getElementById('endDateDisplay');
    if (endDateInput && endDateDisplay && endDateInput.value) {
        endDateDisplay.textContent = formatDateTR(new Date(endDateInput.value));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileDateDisplay);
} else {
    initMobileDateDisplay();
}

function checkSiriParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('siri') === '1') {
        const person = params.get('person') || '';
        const amount = params.get('amount') || '';
        const type = params.get('type') || 'gelen';
        const desc = params.get('desc') || '';
        
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
            showSiriConfirmModal(person, amount, type, desc);
        }, 500);
    }
}

function showSiriConfirmModal(person, amount, type, desc) {
    const matchedPerson = findMatchingPerson(person);
    const typeText = type === 'gelen' ? 'Gelen' : 'Giden';
    const typeClass = type === 'gelen' ? 'text-income' : 'text-expense';
    
    const modalHtml = `
        <div id="siriConfirmModal" class="modal" style="display:flex; z-index:9999;">
            <div class="modal-content" style="max-width:350px; padding:20px;">
                <div class="modal-header" style="border-bottom:none; padding-bottom:10px;">
                    <h2 style="margin:0; font-size:1.2em; display:flex; align-items:center; gap:8px;">
                        🎤 Sesli Kayıt Onayı
                    </h2>
                </div>
                <div class="modal-body" style="padding:15px 0;">
                    <div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:15px; margin-bottom:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                            <span style="color:#78909c;">Kişi:</span>
                            <span style="color:#e0e0e0; font-weight:600;" id="siriPersonDisplay">${matchedPerson || '<span style="color:#ff1744;">Bulunamadı</span>'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                            <span style="color:#78909c;">Tutar:</span>
                            <span style="color:#e0e0e0; font-weight:600;">${formatAmount(parseFloat(amount) || 0)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                            <span style="color:#78909c;">Tip:</span>
                            <span class="${typeClass}" style="font-weight:600;">${typeText}</span>
                        </div>
                        ${desc ? `
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:#78909c;">Açıklama:</span>
                            <span style="color:#e0e0e0;">${sanitizeHTML(desc)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${!matchedPerson ? `
                    <div style="background:rgba(255,23,68,0.1); border:1px solid rgba(255,23,68,0.3); border-radius:8px; padding:10px; margin-bottom:15px;">
                        <span style="color:#ff1744; font-size:0.9em;">⚠️ "${sanitizeHTML(person)}" kişisi bulunamadı. Lütfen kişi seçin:</span>
                        <select id="siriPersonSelect" style="width:100%; margin-top:8px; padding:10px; border-radius:8px; background:#1a2332; color:#e0e0e0; border:1px solid rgba(255,255,255,0.2);">
                            <option value="">Kişi Seçin...</option>
                        </select>
                    </div>
                    ` : ''}
                    
                    <div style="display:flex; gap:10px;">
                        <button onclick="closeSiriModal()" class="btn" style="flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2);">
                            ❌ İptal
                        </button>
                        <button onclick="confirmSiriTransaction('${matchedPerson || ''}', ${parseFloat(amount) || 0}, '${type}', '${desc.replace(/'/g, "\\'")}')" 
                                class="btn btn-success" style="flex:1;" ${!matchedPerson ? 'id="siriConfirmBtn"' : ''}>
                            ✅ Onayla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    if (!matchedPerson) {
        const select = document.getElementById('siriPersonSelect');
        if (select && allData) {
            Object.keys(allData).sort().forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt);
            });
            
            select.addEventListener('change', function() {
                const btn = document.getElementById('siriConfirmBtn');
                const display = document.getElementById('siriPersonDisplay');
                if (this.value) {
                    btn.onclick = () => confirmSiriTransaction(this.value, parseFloat(amount) || 0, type, desc);
                    display.innerHTML = `<span style="color:#00e676;">${this.value}</span>`;
                }
            });
        }
    }
}

function findMatchingPerson(searchName) {
    if (!searchName || !allData) return null;
    
    const search = searchName.toLowerCase().trim();
    
    for (const person of Object.keys(allData)) {
        if (person.toLowerCase() === search) {
            return person;
        }
    }
    
    for (const person of Object.keys(allData)) {
        if (person.toLowerCase().includes(search) || search.includes(person.toLowerCase())) {
            return person;
        }
    }
    
    return null;
}

function closeSiriModal() {
    const modal = document.getElementById('siriConfirmModal');
    if (modal) modal.remove();
}

function confirmSiriTransaction(person, amount, type, desc) {
    if (!person) {
        showNotification('Lütfen kişi seçin!', 'error');
        return;
    }
    
    if (amount <= 0) {
        showNotification('Geçersiz tutar!', 'error');
        return;
    }
    
    let category = 'Genel';
    if (allData[person] && allData[person].categoryBalances) {
        const categories = Object.keys(allData[person].categoryBalances);
        if (categories.length > 0) {
            category = categories[0];
        }
    }
    
    addTransaction(person, type, amount, category, desc);
    queueSave();
    
    closeSiriModal();
    
    const typeText = type === 'gelen' ? 'Gelen' : 'Giden';
    showNotification(`🎤 ${formatAmount(amount)} ${typeText} - ${person}`, 'success');
    
    updateMainDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkSiriParams, 1000);
});