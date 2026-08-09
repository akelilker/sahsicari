/* formatDateTR → js/utils.js */
/** Önbellek / service worker — asset ?v= güncellerken bunu artır */
const APP_VERSION = '78.97';
/** Footer’da görünen sürüm — yalnızca kullanıcıya yansıyan sürüm değişince güncelle */
const FOOTER_VERSION = '78.34';
const APP_DEBUG = false;

/* -----------------------------------------------------------------------------
   Dosya düzeni: yardımcılar & DOM önbelleği → olay bağlama → veri/sunucu
   → ana özet & kişi modalı → işlemler/Excel → hızlı işlem & dağıtım
   → kategori/raporlar → menüler & bildirim → PWA/depolama → bootstrap
   ----------------------------------------------------------------------------- */

let reportExportsLoadPromise = null;

function loadReportExports() {
    if (window.SahsiReportExports) return Promise.resolve(window.SahsiReportExports);
    if (reportExportsLoadPromise) return reportExportsLoadPromise;

    reportExportsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'js/report-exports.js?v=' + APP_VERSION;
        script.async = true;
        script.onload = () => {
            if (window.SahsiReportExports) resolve(window.SahsiReportExports);
            else reject(new Error('Rapor dışa aktarma modülü yüklenemedi'));
        };
        script.onerror = () => reject(new Error('Rapor dışa aktarma dosyası indirilemedi'));
        document.head.appendChild(script);
    }).catch((error) => {
        reportExportsLoadPromise = null;
        throw error;
    });

    return reportExportsLoadPromise;
}

async function runReportExport(name) {
    try {
        const reportExports = await loadReportExports();
        return await reportExports[name]();
    } catch (error) {
        console.error(error);
        showNotification('Rapor modülü yüklenemedi.', 'error');
    }
}

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

/* getLocalTimeISO, formatTitleCase, debounce → js/utils.js */

/* deformatCurrency, formatNumber, formatAmount, formatCurrency → js/utils.js */

/** fetch ile 45 sn timeout; ağ donmasında AbortError fırlatır. */
function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 45000;
    var controller = new AbortController();
    var id = setTimeout(function () { controller.abort(); }, timeoutMs);
    var opts = Object.assign({}, options || {});
    opts.signal = controller.signal;
    return fetch(url, opts).finally(function () { clearTimeout(id); });
}

let allData = {};
let hasLoadedServerData = false;
let notificationHistory = [];
let transactionDateHolder = null;
let currentPerson = null;
let currentCategoryTransactions = [];
let currentCategoryDetailState = {
    person: null,
    category: null,
    allTransactions: [],
    filteredTransactions: [],
    openingBalance: 0
};
let exportInProgress = false;
let editingTransactionId = null; 
let isProcessing = false; 
let quickPersonSelectedValue = null; 
let quickAllocationDesc = '';
let quickAllocationCategory = ''; 
let quickOverlayAmountListenersRegistered = false;
let currentReportFilterType = 'all';
let renderReportPreviewDebounced = null;

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const defaultCategories = ['Elden', 'Havale/EFT', 'Pınar H.', 'İş Bankası KK', 'Black KK', 'Ek Hesap', 'Fiesta']; 

const GLOW_THEMES = ['white', 'blue', 'lila', 'green', 'red', 'gold', 'cyan', 'none']; 

const DOM = {
    personSelect: null,
    personSelectShell: null,
    personSelectTrigger: null,
    personSelectLabel: null,
    personSelectMenu: null,
    personSelectSearch: null,
    personSelectOptions: null,
    categorySelectShell: null,
    categorySelectTrigger: null,
    categorySelectLabel: null,
    categorySelectMenu: null,
    categorySelectOptions: null,
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
    reportSearchInput: null,
    categoryDetailStartDate: null,
    categoryDetailEndDate: null,
    categoryDetailStartDisplay: null,
    categoryDetailEndDisplay: null,
    categoryDetailExcelBtn: null
};

function initDOMCache() {
    DOM.personSelect = document.getElementById('personSelect');
    DOM.personSelectShell = document.getElementById('personSelectShell');
    DOM.personSelectTrigger = document.getElementById('personSelectTrigger');
    DOM.personSelectLabel = document.getElementById('personSelectLabel');
    DOM.personSelectMenu = document.getElementById('personSelectMenu');
    DOM.personSelectSearch = document.getElementById('personSelectSearch');
    DOM.personSelectOptions = document.getElementById('personSelectOptions');
    DOM.categorySelectShell = document.getElementById('categorySelectShell');
    DOM.categorySelectTrigger = document.getElementById('categorySelectTrigger');
    DOM.categorySelectLabel = document.getElementById('categorySelectLabel');
    DOM.categorySelectMenu = document.getElementById('categorySelectMenu');
    DOM.categorySelectOptions = document.getElementById('categorySelectOptions');
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
    DOM.categoryDetailStartDate = document.getElementById('categoryDetailStartDate');
    DOM.categoryDetailEndDate = document.getElementById('categoryDetailEndDate');
    DOM.categoryDetailStartDisplay = document.getElementById('categoryDetailStartDisplay');
    DOM.categoryDetailEndDisplay = document.getElementById('categoryDetailEndDisplay');
    DOM.categoryDetailExcelBtn = document.getElementById('categoryDetailExcelBtn');

    if (DOM.amount) {
        DOM.amount.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === 'Tab') {
                setTimeout(maybeTriggerMainAutoAllocation, 40);
            }
        });
        DOM.amount.addEventListener('blur', function() {
            setTimeout(maybeTriggerMainAutoAllocation, 80);
        });
    }

    if (DOM.startDate) DOM.startDate.addEventListener('change', renderReportPreview);
    if (DOM.endDate) DOM.endDate.addEventListener('change', renderReportPreview);
    if (!renderReportPreviewDebounced) renderReportPreviewDebounced = debounce(renderReportPreview, 180);
    if (DOM.reportSearchInput) DOM.reportSearchInput.addEventListener('input', renderReportPreviewDebounced);

    const zeroToggle = document.getElementById('showZeroBalanceToggle');
    if (zeroToggle) {
        syncZeroBalanceToggleText();
        zeroToggle.addEventListener('change', () => {
            syncZeroBalanceToggleText();
            if (currentPerson) {
                const kd = document.getElementById('kategoriDurumu');
                if (kd && kd.classList.contains(TAB_CONTENT_VISIBLE_CLASS)) {
                    updateCategoryBalanceDisplay(currentPerson);
                }
            }
        });
    }

    syncCustomPersonSelectUI();
}

function syncZeroBalanceToggleText() {
    const toggle = document.getElementById('showZeroBalanceToggle');
    const label = document.getElementById('showZeroBalanceToggleBtn');
    if (!toggle || !label) return;
    label.textContent = toggle.checked ? 'Geri Dön' : 'Sıfır Bakiyeleri Göster';
}
let saveTimer = null;
let dataSaveRevision = 0;
let statusDotHideTimer = null;

function getPersistedPeopleCount(data) {
    if (!data || typeof data !== 'object') return 0;
    return Object.keys(data).filter(key => key !== 'metadata' && data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])).length;
}

function hasPersistedPeopleData(data) {
    return getPersistedPeopleCount(data) > 0;
}

async function queueServerSyncPayload(payload) {
    try {
        const db = await openIndexedDB();
        await clearQueuedServerSyncPayloads(db);
        const serverPayload = JSON.parse(JSON.stringify(payload));
        if (!serverPayload.metadata) serverPayload.metadata = {};
        serverPayload.metadata.unsynced = false;
        await addToSyncQueue(db, {
            url: 'write_data.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(serverPayload)
        });
    } catch (error) {
        console.error('Sync queue add failed:', error);
    }
}

function isServerSyncQueueItem(item) {
    return !!(item && typeof item.url === 'string' && (item.url.includes('save.php') || item.url.includes('write_data.php')));
}

async function clearQueuedServerSyncPayloads(existingDb) {
    const db = existingDb || await openIndexedDB();
    const existing = await getSyncQueue(db);
    for (const item of existing) {
        if (isServerSyncQueueItem(item)) await removeSyncQueueItem(db, item.id);
    }
}

async function persistLocalDataSnapshot(data, unsynced) {
    if (!data.metadata) data.metadata = {};
    data.metadata.unsynced = unsynced === true;
    await advancedStorage.setItem('sahsiHesapTakibiData', JSON.stringify(data));
}

function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    const revision = ++dataSaveRevision;
    if (!allData.metadata) allData.metadata = {};
    allData.metadata.lastUpdate = new Date().toISOString();
    persistLocalDataSnapshot(allData, true).catch(error => {
        console.error('Immediate local snapshot failed:', error);
    });

    const timerId = setTimeout(async () => {
        const payload = JSON.parse(JSON.stringify(allData));
        try {
            if (hasPersistedPeopleData(payload) && navigator.onLine) {
                payload.metadata.unsynced = false;
                await saveDataToServer(payload, false);
                if (revision === dataSaveRevision) {
                    allData.metadata.unsynced = false;
                    await persistLocalDataSnapshot(allData, false);
                    await clearQueuedServerSyncPayloads();
                }
            } else {
                if (revision === dataSaveRevision && hasPersistedPeopleData(payload)) {
                    await queueServerSyncPayload(payload);
                }
            }
            await advancedStorage.setItem('sahsiHesapTakibiNotifications', JSON.stringify(notificationHistory));
        } catch (error) {
            updateServerStatus('error', 'Sunucuya kaydedilemedi, yerelde bekliyor');
            if (revision === dataSaveRevision) {
                await persistLocalDataSnapshot(allData, true);
                if (hasPersistedPeopleData(allData)) await queueServerSyncPayload(allData);
            }
        }
        if (saveTimer === timerId) saveTimer = null;
    }, 1000);
    saveTimer = timerId;
}

if (location.protocol !== 'file:') {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.json';
    document.head.appendChild(link);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    registerAppServiceWorker();
}

function registerAppServiceWorker() {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('service_worker.js?v=' + APP_VERSION)
        .then((registration) => {
            if (registration.waiting) {
                registration.waiting.postMessage('skipWaiting');
            }

            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage('skipWaiting');
                    }
                });
            });

            // Arka planda güncel SW kontrolü (PWA eski cache'te takılmasın)
            setInterval(() => registration.update(), 60 * 60 * 1000);
        })
        .catch(console.error);
}

/** Ayarlar / bildirim açılır menüleri — görünürlük yalnızca sınıf ile */
const MENU_DROPDOWN_OPEN_CLASS = 'dropdown-menu--open';
const COLOR_MENU_OPEN_CLASS = 'color-selection-menu--open';
/** Kişi modalı sekmeleri — görünürlük yalnızca bu sınıf ile (inline display yok) */
const TAB_CONTENT_VISIBLE_CLASS = 'tab-content--visible';

function setMenuBackdropActive(active) {
    const backdrop = document.getElementById('menuBackdrop');
    if (!backdrop) return;
    backdrop.classList.toggle('active', !!active);
    document.body.classList.toggle('menu-dropdown-backdrop', !!active);
}

function setPersonSelectBackdropActive(active) {
    const backdrop = document.getElementById('personSelectBackdrop');
    if (!backdrop) return;
    backdrop.hidden = !active;
    document.body.classList.toggle('person-select-open', !!active);
}

function setCategorySelectBackdropActive(active) {
    document.body.classList.toggle('category-select-open', !!active);
    const personModal = document.getElementById('personModal');
    if (personModal) personModal.classList.toggle('category-select-active', !!active);
}

function bindCategorySelectBackdrop(selectEl) {
    if (!selectEl || selectEl.dataset.categoryBackdropBound) return;
    selectEl.dataset.categoryBackdropBound = '1';
    function activate() { setCategorySelectBackdropActive(true); }
    function deactivate() { setCategorySelectBackdropActive(false); }
    selectEl.addEventListener('focus', activate);
    selectEl.addEventListener('blur', deactivate);
    selectEl.addEventListener('mousedown', activate);
    selectEl.addEventListener('touchstart', activate, { passive: true });
}

function shouldUseCustomCategorySelect() {
    return window.innerWidth <= 768;
}

function syncCustomCategorySelectLabel() {
    if (!DOM.category || !DOM.categorySelectLabel) return;
    const selectedOption = DOM.category.options[DOM.category.selectedIndex];
    const labelText = selectedOption ? selectedOption.textContent.trim() : 'Seç';
    const isPlaceholder = !DOM.category.value;
    DOM.categorySelectLabel.textContent = labelText || 'Seç';
    DOM.categorySelectLabel.classList.toggle('category-select-label--placeholder', isPlaceholder);
}

function positionCategorySelectMenu() {
    const menu = DOM.categorySelectMenu;
    const trigger = DOM.categorySelectTrigger;
    if (!menu || !trigger) return;

    const vv = window.visualViewport;
    const viewH = vv ? vv.height : window.innerHeight;
    const offsetTop = vv ? vv.offsetTop : 0;
    const rect = trigger.getBoundingClientRect();
    const side = 18;
    const gap = 8;
    const footerGap = 72;
    const availableBelow = viewH - (rect.bottom - offsetTop) - footerGap;
    const availableAbove = rect.top - offsetTop - side;
    const preferredMax = Math.min(360, Math.max(220, Math.round(viewH * 0.42)));
    const openAbove = availableBelow < 220 && availableAbove > availableBelow;
    const maxHeight = Math.max(180, Math.min(preferredMax, openAbove ? availableAbove - gap : availableBelow - gap));
    const top = openAbove
        ? Math.max(offsetTop + side, rect.top - gap - maxHeight)
        : Math.min(rect.bottom + gap, offsetTop + viewH - footerGap - maxHeight);
    const width = Math.min(window.innerWidth - side * 2, Math.max(260, rect.width));
    const left = Math.max(side, Math.min(rect.right - width, window.innerWidth - side - width));

    menu.style.setProperty('--category-menu-top', Math.round(top) + 'px');
    menu.style.setProperty('--category-menu-left', Math.round(left) + 'px');
    menu.style.setProperty('--category-menu-width', Math.round(width) + 'px');
    menu.style.setProperty('--category-menu-max-height', Math.round(maxHeight) + 'px');
}

function closeCustomCategorySelect() {
    if (!DOM.categorySelectShell || !DOM.categorySelectMenu || !DOM.categorySelectTrigger) return;
    DOM.categorySelectShell.classList.remove('open');
    DOM.categorySelectMenu.hidden = true;
    DOM.categorySelectTrigger.setAttribute('aria-expanded', 'false');
    setCategorySelectBackdropActive(false);
}

function renderCustomCategorySelectOptions() {
    if (!DOM.category || !DOM.categorySelectOptions) return;
    const fragment = document.createDocumentFragment();
    const options = Array.from(DOM.category.options || []);

    options.forEach(option => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'category-select-option';
        item.textContent = option.textContent.trim();
        item.setAttribute('role', 'option');
        item.setAttribute('data-category-select-value', option.value);
        if (option.value === DOM.category.value) item.classList.add('is-selected');
        fragment.appendChild(item);
    });

    DOM.categorySelectOptions.innerHTML = '';
    DOM.categorySelectOptions.appendChild(fragment);
}

function openCustomCategorySelect() {
    if (!shouldUseCustomCategorySelect()) {
        DOM.category?.focus();
        return;
    }
    if (!DOM.categorySelectShell || !DOM.categorySelectMenu || !DOM.categorySelectTrigger) return;
    closeSettingsAndNotificationMenus();
    closeCustomPersonSelect();
    DOM.categorySelectShell.classList.add('open');
    DOM.categorySelectMenu.hidden = false;
    DOM.categorySelectTrigger.setAttribute('aria-expanded', 'true');
    setCategorySelectBackdropActive(true);
    syncCustomCategorySelectLabel();
    renderCustomCategorySelectOptions();
    positionCategorySelectMenu();
}

function toggleCustomCategorySelect() {
    if (!DOM.categorySelectMenu || DOM.categorySelectMenu.hidden) {
        openCustomCategorySelect();
    } else {
        closeCustomCategorySelect();
    }
}

function syncCustomCategorySelectUI() {
    syncCustomCategorySelectLabel();
    if (DOM.categorySelectShell?.classList.contains('open')) {
        renderCustomCategorySelectOptions();
        positionCategorySelectMenu();
    }
}

function onCategorySelectViewportChange() {
    if (DOM.categorySelectMenu && !DOM.categorySelectMenu.hidden) {
        positionCategorySelectMenu();
    }
}

function positionPersonSelectMenu() {
    const menu = DOM.personSelectMenu;
    const trigger = DOM.personSelectTrigger;
    if (!menu || !trigger) return;

    const isDesktop = window.innerWidth >= 769;
    menu.classList.toggle('person-select-menu--centered', isDesktop);

    if (isDesktop) {
        menu.style.removeProperty('--person-menu-top');
        menu.style.removeProperty('--person-menu-left');
        menu.style.removeProperty('--person-menu-width');
        menu.style.removeProperty('--person-menu-height');
        menu.style.removeProperty('--person-menu-max-height');
        menu.classList.remove('person-select-menu--viewport');
        return;
    }

    /*
     * Mobil: header altında panel.
     * Klavye yokken liste ~8 kişi yüksekliğinde; klavye varken kalan alana sığar.
     */
    const vv = window.visualViewport;
    const viewTop = vv ? vv.offsetTop : 0;
    const viewBottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;
    const viewW = vv ? vv.width : window.innerWidth;
    const offsetLeft = vv ? vv.offsetLeft : 0;
    const side = 10;
    const gap = 6;
    const visibleRows = 8;
    const rowGap = 4;
    const keyboardOpen = !!(vv && (window.innerHeight - vv.height) > 120);

    const headerEl = document.querySelector('.header');
    const footerEl = document.querySelector('.global-status-bar');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : viewTop;
    const footerTop = footerEl ? footerEl.getBoundingClientRect().top : viewBottom;

    const searchWrap = menu.querySelector('.person-select-search-wrap');
    const searchChrome = searchWrap
        ? Math.ceil(searchWrap.getBoundingClientRect().height + 6)
        : 52;
    const menuPadY = 16;
    const sampleOpt = menu.querySelector('.person-select-option');
    const rowH = sampleOpt ? Math.max(32, sampleOpt.getBoundingClientRect().height) : 36;
    const eightListH = Math.ceil(visibleRows * rowH + (visibleRows - 1) * rowGap);

    let top = Math.max(viewTop + gap, headerBottom + gap);
    let listMax;
    let menuHeight;

    if (keyboardOpen) {
        let bottom = Math.min(viewBottom - gap, footerTop - gap);
        if (bottom - top < 140) {
            top = viewTop + gap;
            bottom = viewBottom - gap;
        }
        menuHeight = Math.max(140, Math.floor(bottom - top));
        listMax = Math.max(80, menuHeight - searchChrome - menuPadY);
    } else {
        listMax = eightListH;
        menuHeight = searchChrome + menuPadY + listMax;
        const maxBottom = Math.min(viewBottom - gap, footerTop - gap);
        if (top + menuHeight > maxBottom) {
            menuHeight = Math.max(140, maxBottom - top);
            listMax = Math.max(80, menuHeight - searchChrome - menuPadY);
        }
    }

    const width = Math.max(200, viewW - side * 2);
    const left = offsetLeft + side;

    menu.classList.add('person-select-menu--viewport');
    menu.style.setProperty('--person-menu-top', Math.round(top) + 'px');
    menu.style.setProperty('--person-menu-left', Math.round(left) + 'px');
    menu.style.setProperty('--person-menu-width', Math.round(width) + 'px');
    menu.style.setProperty('--person-menu-height', Math.round(menuHeight) + 'px');
    menu.style.setProperty('--person-menu-max-height', Math.round(listMax) + 'px');
}

function onPersonSelectViewportChange() {
    if (DOM.personSelectMenu && !DOM.personSelectMenu.hidden) {
        positionPersonSelectMenu();
    }
}

function anchorDropdownToIcon(menuEl, iconId, opts) {
    const icon = document.getElementById(iconId);
    if (!menuEl || !icon) return false;
    const r = icon.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    const topOff = isMobile ? opts.mobileTop : opts.desktopTop;
    const rightOff = isMobile ? opts.mobileRight : opts.desktopRight;
    const top = Math.round(r.bottom - topOff);
    const right = Math.round(window.innerWidth - r.right - rightOff);
    ['top', 'right', 'left', 'bottom'].forEach(function(p) { menuEl.style.removeProperty(p); });
    menuEl.style.setProperty('--anchor-menu-top', top + 'px');
    menuEl.style.setProperty('--anchor-menu-right', right + 'px');
    return true;
}

function closeSettingsAndNotificationMenus() {
    DOM.settingsMenu?.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
    DOM.notificationMenu?.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
    setMenuBackdropActive(false);
}

function closeColorSelectionMenuFromUI() {
    document.getElementById('colorSelectionMenu')?.classList.remove(COLOR_MENU_OPEN_CLASS);
}

function onMemoryOverlayPointerClick(e) {
    const overlay = e.currentTarget;
    const yes = e.target.closest('.alert-buttons .btn-yes');
    const no = e.target.closest('.alert-buttons .btn-no');
    if (no) {
        e.preventDefault();
        closeMemoryOverlay();
        return;
    }
    if (!yes) return;
    e.preventDefault();
    if (overlay.dataset.memoryYesPhase === 'finalize') {
        if (!yes.disabled) {
            yes.disabled = true;
            finalizeClear();
        }
    } else {
        attemptBackupAndClear();
    }
}

function initMemoryOverlayListeners() {
    const overlay = document.getElementById('customMemoryOverlay');
    if (!overlay || overlay.dataset.pointerUiBound === '1') return;
    overlay.dataset.pointerUiBound = '1';
    overlay.addEventListener('click', onMemoryOverlayPointerClick);
}

async function onPwaInstallButtonClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    hidePWAInstallBanner();
}

function onPwaInstallCloseClick() {
    localStorage.setItem('pwaInstallDismissed', 'true');
    pwaInstallBannerDismissed = true;
    hidePWAInstallBanner();
}

function initPwaInstallBannerListeners() {
    const installBtn = document.getElementById('pwaInstallBtn');
    const closeBtn = document.getElementById('pwaInstallClose');
    if (!installBtn || installBtn.dataset.bound === '1') return;
    installBtn.dataset.bound = '1';
    if (closeBtn) closeBtn.dataset.bound = '1';
    installBtn.addEventListener('click', onPwaInstallButtonClick);
    if (closeBtn) closeBtn.addEventListener('click', onPwaInstallCloseClick);
}

function bindMenuEvents() {
    const menuBackdrop = document.getElementById('menuBackdrop');
    if (menuBackdrop) {
        menuBackdrop.addEventListener('click', closeAllMenus);
        menuBackdrop.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeAllMenus(); }
        });
    }
    const settingsIcon = document.getElementById('settingsIcon');
    if (settingsIcon) settingsIcon.addEventListener('click', toggleSettingsMenu);
    const notificationIcon = document.getElementById('notificationIcon');
    if (notificationIcon) notificationIcon.addEventListener('click', toggleNotificationMenu);
    initMemoryOverlayListeners();
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) {
        settingsMenu.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            if (action === 'person-mgmt') showPersonManagementModal();
            else if (action === 'category-mgmt') showCategoryManagementModal();
            else if (action === 'color-menu') showColorSelectionMenu();
            else if (action === 'server-test') testServerConnection();
            else if (action === 'sync-help') showSyncHelp();
            else if (action === 'memory-clear') initiateMemoryClear();
        });
    }
    const notificationMenu = document.getElementById('notificationMenu');
    if (notificationMenu) {
        notificationMenu.addEventListener('click', function(e) {
            const del = e.target.closest('.delete-notif-btn[data-notification-index]');
            if (!del) return;
            e.preventDefault();
            const idx = parseInt(del.getAttribute('data-notification-index'), 10);
            if (!Number.isNaN(idx)) deleteNotification(idx);
        });
    }
}

function bindPageEvents() {
    const personSelect = document.getElementById('personSelect');
    if (personSelect) {
        personSelect.addEventListener('change', selectPerson);
        personSelect.addEventListener('change', syncCustomPersonSelectUI);
    }
    if (DOM.personSelectTrigger) {
        DOM.personSelectTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            toggleCustomPersonSelect();
        });
    }
    if (DOM.personSelectSearch) {
        DOM.personSelectSearch.addEventListener('input', function() {
            renderCustomPersonSelectOptions(this.value);
        });
        DOM.personSelectSearch.addEventListener('focus', function() {
            setTimeout(onPersonSelectViewportChange, 80);
            setTimeout(onPersonSelectViewportChange, 320);
        });
        DOM.personSelectSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCustomPersonSelect();
                DOM.personSelectTrigger?.focus();
            }
        });
    }
    if (DOM.categorySelectTrigger) {
        DOM.categorySelectTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            toggleCustomCategorySelect();
        });
        DOM.categorySelectTrigger.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeCustomCategorySelect();
            }
        });
    }
    const addPersonBtn = document.getElementById('addPersonBtn');
    if (addPersonBtn) addPersonBtn.addEventListener('click', showAddPersonModal);
    const quickActionMainBtn = document.getElementById('quickActionMainBtn');
    if (quickActionMainBtn) quickActionMainBtn.addEventListener('click', showQuickTransactionOverlay);
    const generalStatusBtn = document.getElementById('generalStatusBtn');
    if (generalStatusBtn) generalStatusBtn.addEventListener('click', showGeneralStatusReport);
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportSystemToJSON);
    const systemImportFile = document.getElementById('systemImportFile');
    if (systemImportFile) systemImportFile.addEventListener('change', importSystemFromJSON);

    const personSelectBackdrop = document.getElementById('personSelectBackdrop');
    if (personSelectBackdrop) {
        personSelectBackdrop.addEventListener('click', closeCustomPersonSelect);
        personSelectBackdrop.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeCustomPersonSelect(); }
        });
    }

    document.addEventListener('click', function(e) {
        if (!DOM.personSelectMenu || DOM.personSelectMenu.hidden) return;
        if (DOM.personSelectShell?.contains(e.target)) return;
        if (DOM.personSelectMenu.contains(e.target)) return;
        if (e.target === personSelectBackdrop) return;
        closeCustomPersonSelect();
    });

    document.addEventListener('keydown', handlePersonSelectOpenKeydown);

    document.addEventListener('click', function(e) {
        if (!DOM.categorySelectMenu || DOM.categorySelectMenu.hidden) return;
        if (DOM.categorySelectShell?.contains(e.target)) return;
        if (DOM.categorySelectMenu.contains(e.target)) return;
        closeCustomCategorySelect();
    });

    window.addEventListener('resize', onPersonSelectViewportChange);
    window.addEventListener('resize', onCategorySelectViewportChange);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onPersonSelectViewportChange);
        window.visualViewport.addEventListener('scroll', onPersonSelectViewportChange);
        window.visualViewport.addEventListener('resize', onCategorySelectViewportChange);
        window.visualViewport.addEventListener('scroll', onCategorySelectViewportChange);
    }

    const quickOverlayBackdrop = document.getElementById('quickOverlayBackdrop');
    if (quickOverlayBackdrop) {
        quickOverlayBackdrop.addEventListener('click', closeQuickTransactionOverlay);
        quickOverlayBackdrop.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeQuickTransactionOverlay(); }
        });
    }

    document.addEventListener('click', function(e) {
        const quickOverlayContainer = document.getElementById('quickOverlayContainer');
        if (!quickOverlayContainer || quickOverlayContainer.classList.contains('u-hidden')) return;
        const panelContent = quickOverlayContainer.querySelector('.quick-panel-content');
        if (panelContent?.contains(e.target)) return;
        if (quickActionMainBtn?.contains(e.target)) return;
        closeQuickTransactionOverlay();
    });
    const quickOverlayCloseBtn = document.getElementById('quickOverlayCloseBtn');
    if (quickOverlayCloseBtn) quickOverlayCloseBtn.addEventListener('click', closeQuickTransactionOverlay);
    const quickSearchInput = document.getElementById('quickSearchInput');
    if (quickSearchInput) quickSearchInput.addEventListener('input', filterQuickPersonList);
    const quickPersonList = document.getElementById('quickPersonList');
    if (quickPersonList && !quickPersonList.dataset.personPickDelegate) {
        quickPersonList.dataset.personPickDelegate = '1';
        quickPersonList.addEventListener('click', function(e) {
            const addBtn = e.target.closest('.quick-add-person-btn');
            if (addBtn) {
                closeQuickTransactionOverlay();
                showPersonManagementModal();
                return;
            }
            const row = e.target.closest('.quick-person-item:not(.quick-add-person-btn)');
            if (!row || !quickPersonList.contains(row)) return;
            const enc = row.getAttribute('data-quick-person');
            const person = enc ? decodeURIComponent(enc) : (row.textContent || '').trim();
            if (person) selectQuickPersonFromOverlay(person);
        });
    }
    const quickGidenBtn = document.getElementById('quickGidenBtn');
    if (quickGidenBtn) quickGidenBtn.addEventListener('click', function() { setQuickTransactionType('giden'); });
    const quickGelenBtn = document.getElementById('quickGelenBtn');
    if (quickGelenBtn) quickGelenBtn.addEventListener('click', function() { setQuickTransactionType('gelen'); });
    const quickAmount = document.getElementById('quickAmount');
    if (quickAmount) quickAmount.addEventListener('input', function() { formatCurrency(this); });
    const processQuickTransactionBtn = document.getElementById('processQuickTransactionBtn');
    if (processQuickTransactionBtn) processQuickTransactionBtn.addEventListener('click', processQuickTransaction);
    const resetQuickPanelBtn = document.getElementById('resetQuickPanelBtn');
    if (resetQuickPanelBtn) resetQuickPanelBtn.addEventListener('click', resetQuickPanel);

    initPwaInstallBannerListeners();

    const allocationOverlayBackdrop = document.getElementById('allocationOverlayBackdrop');
    if (allocationOverlayBackdrop) {
        allocationOverlayBackdrop.addEventListener('click', closeAllocationOverlay);
        allocationOverlayBackdrop.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeAllocationOverlay(); }
        });
    }
    const allocationOverlayCloseBtn = document.getElementById('allocationOverlayCloseBtn');
    if (allocationOverlayCloseBtn) allocationOverlayCloseBtn.addEventListener('click', closeAllocationOverlay);

    const allocationOverlay = document.getElementById('allocationOverlay');
    if (allocationOverlay) {
        allocationOverlay.addEventListener('click', function(e) {
            const btn = e.target.closest('.allocation-clear-btn');
            if (btn) {
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation();
                payCategoryInFull(btn);
            }
        }, true);
        allocationOverlay.addEventListener('mousedown', function(e) {
            if (e.target.closest('.allocation-clear-btn')) e.preventDefault();
        }, true);
        allocationOverlay.addEventListener('blur', function(e) {
            const input = e.target;
            if (input.classList && input.classList.contains('allocation-input')) {
                persistAllocationInputValue(input);
            }
        }, true);
    }
    const confirmAllocationBtn = document.getElementById('confirmAllocationBtn');
    if (confirmAllocationBtn) confirmAllocationBtn.addEventListener('click', confirmAllocation);
}

function bindModalEvents() {
    document.addEventListener('click', function(e) {
        const personOption = e.target.closest('[data-person-select-value]');
        if (personOption && DOM.personSelectOptions?.contains(personOption)) {
            DOM.personSelect.value = personOption.getAttribute('data-person-select-value') || '';
            syncCustomPersonSelectUI();
            closeCustomPersonSelect();
            selectPerson();
            return;
        }

        const categoryOption = e.target.closest('[data-category-select-value]');
        if (categoryOption && DOM.categorySelectOptions?.contains(categoryOption)) {
            DOM.category.value = categoryOption.getAttribute('data-category-select-value') || '';
            DOM.category.dispatchEvent(new Event('change', { bubbles: true }));
            syncCustomCategorySelectUI();
            closeCustomCategorySelect();
            return;
        }

        const personAction = e.target.closest('[data-person-management-action]');
        if (personAction) {
            const item = personAction.closest('.management-list-item[data-person]');
            const person = item?.getAttribute('data-person');
            if (!person) return;
            const action = personAction.getAttribute('data-person-management-action');
            if (action === 'favorite') toggleFav(person);
            else if (action === 'edit') editPersonName(person);
            else if (action === 'delete') deletePersonByName(person);
            return;
        }

        const categoryAction = e.target.closest('[data-category-management-action]');
        if (categoryAction) {
            const item = categoryAction.closest('.management-list-item[data-category]');
            const category = item?.getAttribute('data-category');
            const person = document.getElementById('categoryManagementPersonSelect')?.value;
            if (!person || !category) return;
            const action = categoryAction.getAttribute('data-category-management-action');
            if (action === 'edit') editCategoryName(person, category);
            else if (action === 'delete') deleteCategoryFromManager(person, category);
            return;
        }

        const allocBtn = e.target.closest('[data-allocation-action]');
        if (allocBtn && allocBtn.closest('#allocationDescPopup')) {
            const action = allocBtn.getAttribute('data-allocation-action');
            if (action === 'finalize-null') {
                finalizeAllocation(null);
                return;
            }
            if (action === 'show-desc-input') {
                showDescriptionInput();
                return;
            }
            if (action === 'close-desc-popup') {
                closeAllocationDescPopup();
                return;
            }
            if (action === 'finalize-with-desc') {
                const input = document.getElementById('allocationDescInput');
                finalizeAllocation(input ? input.value : '');
                return;
            }
        }
        const closeBtn = e.target.closest('.close-modal-btn');
        if (closeBtn) { closeCurrentModal(closeBtn); return; }
        const tabBtn = e.target.closest('.tab-btn[data-tab]');
        if (tabBtn) { openTab(e, tabBtn.getAttribute('data-tab'), tabBtn); return; }
        const filterBtn = e.target.closest('[data-report-filter]');
        if (filterBtn) { setReportFilterType(filterBtn.getAttribute('data-report-filter')); return; }
        const cancelBtn = e.target.closest('.btn-cancel-person');
        if (cancelBtn) { closeCurrentModal(cancelBtn); return; }
    });

    const recalcBalanceBtn = document.getElementById('recalcBalanceBtn');
    if (recalcBalanceBtn) recalcBalanceBtn.addEventListener('click', recalculateAllBalancesFromTransactions);
    const gidenBtn = document.getElementById('gidenBtn');
    if (gidenBtn) gidenBtn.addEventListener('click', function() { setTransactionType('giden'); });
    const gelenBtn = document.getElementById('gelenBtn');
    if (gelenBtn) gelenBtn.addEventListener('click', function() { setTransactionType('gelen'); });
    const amountEl = document.getElementById('amount');
    if (amountEl) amountEl.addEventListener('input', function() { formatCurrency(this); });
    const dateInputEl = document.getElementById('dateInput');
    if (dateInputEl) dateInputEl.addEventListener('change', handleDateChange);
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    if (addTransactionBtn) addTransactionBtn.addEventListener('click', processSingleTransaction);
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        bindCategorySelectBackdrop(categorySelect);
        categorySelect.addEventListener('change', function() {
            if (this.value === '__add_new_category__') {
                this.value = '';
                syncCustomCategorySelectUI();
                showCategoryManagementModal(
                    currentPerson && allData[currentPerson] ? { person: currentPerson } : undefined
                );
                return;
            }
            syncCustomCategorySelectUI();
        });
    }
    const showZeroBalanceToggle = document.getElementById('showZeroBalanceToggle');
    if (showZeroBalanceToggle) showZeroBalanceToggle.addEventListener('change', function() { updateCategoryBalanceDisplay(currentPerson); });
    const toggleShareOptionsBtn = document.getElementById('toggleShareOptionsBtn');
    if (toggleShareOptionsBtn) toggleShareOptionsBtn.addEventListener('click', toggleShareOptions);
    const exportSummaryExcelBtn = document.getElementById('exportSummaryExcelBtn');
    if (exportSummaryExcelBtn) exportSummaryExcelBtn.addEventListener('click', () => runReportExport('exportSummaryExcel'));
    const copySummaryTextBtn = document.getElementById('copySummaryTextBtn');
    if (copySummaryTextBtn) copySummaryTextBtn.addEventListener('click', copySummaryText);
    const monthlyReportButton = document.getElementById('monthlyReportButton');
    if (monthlyReportButton) monthlyReportButton.addEventListener('click', showMonthlySummaryModal);
    const excelReportButton = document.getElementById('excelReportButton');
    if (excelReportButton) excelReportButton.addEventListener('click', () => runReportExport('exportToExcel'));

    const addNewPersonBtn = document.getElementById('addNewPersonBtn');
    if (addNewPersonBtn) addNewPersonBtn.addEventListener('click', addNewPerson);
    const newPersonName = document.getElementById('newPersonName');
    if (newPersonName) {
        newPersonName.addEventListener('keypress', handlePersonNameEnter);
    }
    const personMgmtAddPersonBtn = document.getElementById('personMgmtAddPersonBtn');
    if (personMgmtAddPersonBtn) personMgmtAddPersonBtn.addEventListener('click', showAddPersonModal);
    const categoryManagementPersonSelect = document.getElementById('categoryManagementPersonSelect');
    if (categoryManagementPersonSelect) categoryManagementPersonSelect.addEventListener('change', function() { populateCategoryEditor(this.value); });
    const newManagedCategoryInput = document.getElementById('newManagedCategoryInput');
    if (newManagedCategoryInput) newManagedCategoryInput.addEventListener('keypress', handleCategoryInputEnter);
    const addCategoryFromManagerBtn = document.getElementById('addCategoryFromManagerBtn');
    if (addCategoryFromManagerBtn) addCategoryFromManagerBtn.addEventListener('click', addCategoryFromManager);
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) generateReportBtn.addEventListener('click', () => runReportExport('exportMonthlySummary'));
    const syncHelpCloseBtn = document.getElementById('syncHelpCloseBtn');
    if (syncHelpCloseBtn) syncHelpCloseBtn.addEventListener('click', function() { closeCurrentModal(syncHelpCloseBtn); });
    const editGidenBtn = document.getElementById('editGidenBtn');
    if (editGidenBtn) editGidenBtn.addEventListener('click', function() { setEditTransactionType('giden'); });
    const editGelenBtn = document.getElementById('editGelenBtn');
    if (editGelenBtn) editGelenBtn.addEventListener('click', function() { setEditTransactionType('gelen'); });
    const editAmount = document.getElementById('editAmount');
    if (editAmount) editAmount.addEventListener('input', function() { formatCurrency(this); });
    const saveEditedTransactionBtn = document.getElementById('saveEditedTransactionBtn');
    if (saveEditedTransactionBtn) saveEditedTransactionBtn.addEventListener('click', saveEditedTransaction);
    if (DOM.categoryDetailStartDate) {
        DOM.categoryDetailStartDate.addEventListener('change', function() {
            syncCategoryDetailDateRange('start');
            syncCategoryDetailDateDisplays();
            renderCategoryDetailContent();
        });
    }
    if (DOM.categoryDetailEndDate) {
        DOM.categoryDetailEndDate.addEventListener('change', function() {
            syncCategoryDetailDateRange('end');
            syncCategoryDetailDateDisplays();
            renderCategoryDetailContent();
        });
    }
    if (DOM.categoryDetailExcelBtn) {
        DOM.categoryDetailExcelBtn.addEventListener('click', () => runReportExport('exportCurrentCategoryDetailToExcel'));
    }

    const colorSelectionMenu = document.getElementById('colorSelectionMenu');
    if (colorSelectionMenu) {
        colorSelectionMenu.addEventListener('click', function(e) {
            if (e.target === colorSelectionMenu) closeColorSelectionMenuFromUI();
        });
    }
    const colorBubbles = document.getElementById('colorBubbles');
    if (colorBubbles) {
        colorBubbles.addEventListener('click', function(e) {
            const btn = e.target.closest('button[data-glow]');
            if (btn) changeGlowTheme(btn.getAttribute('data-glow'));
        });
    }
}

/* load: DOM cache, event binding, tema, veri yükleme ve ilk render (bkz. başlatma akışı yorumu). */
window.addEventListener('load', async function() {
    initDOMCache();
    bindMenuEvents();
    bindPageEvents();
    bindModalEvents();
    updateVersionDisplay();
    updateServerStatus('', '📡 Veriler yükleniyor...');

    const glowThemePromise = loadGlowTheme();
    const loadDataPromise = loadData();
    const [loadResult] = await Promise.all([loadDataPromise, glowThemePromise]);

    const savedNotifications = await advancedStorage.getItem('sahsiHesapTakibiNotifications');
    if (savedNotifications) notificationHistory = JSON.parse(savedNotifications);

    migrateOldDataSafely();
    updateMainDisplay();
    setCurrentDate();

    registerQuickOverlayDeferredListeners();
    if (loadResult && loadResult.ok && loadResult.hasPeopleData) {
        checkSiriParams();
    }
});

function updateServerStatus(type, message) {
    const dot = DOM.statusDot;
    const text = DOM.serverStatusText;
    if (!dot || !text) return;
    const safeMessage = (typeof message === 'string' && message.trim()) ? message : 'Sistem hazir';

    if (statusDotHideTimer) {
        clearTimeout(statusDotHideTimer);
        statusDotHideTimer = null;
    }
    
    dot.className = 'status-dot';
    text.className = '';

    if (type === 'success') {
        dot.classList.add('online');
        text.classList.add('text-online');
        text.textContent = safeMessage;
        statusDotHideTimer = setTimeout(() => {
            if (DOM.statusDot) DOM.statusDot.classList.add('hidden');
        }, 10000);
    } else if (type === 'error') {
        dot.classList.add('offline');
        text.classList.add('text-offline');
        text.textContent = safeMessage;
    } else {
        dot.classList.add('syncing');
        text.classList.add('text-status-syncing');
        text.textContent = safeMessage;
    }
}

async function testServerConnection() {
    updateServerStatus('', 'Baglanti test ediliyor...');
    try {
        const response = await fetchWithTimeout('get_data.php?test=1&t=' + Date.now(), { 
            method: 'GET', 
            headers: { 
                'Accept': 'application/json'
            } 
        });
        
        if (response.ok) {
            const text = await response.text();
            const dataSource = response.headers.get('X-Data-Source') || '';
            if (dataSource === 'default') {
                updateServerStatus('error', 'Sunucuda veri veya yedek bulunamadi');
            } else if (text.trim().startsWith('{')) { 
                updateServerStatus('success', 'Sunucu baglantisi basarili');
            } else {
                updateServerStatus('error', 'Sunucu cevabi gecersiz'); 
            }
        } else {
            updateServerStatus('error', `HTTP hatasi: ${response.status}`);
        }
    } catch (error) {
        updateServerStatus('error', error && error.name === 'AbortError' ? 'Baglanti zaman asimi' : 'Sunucuya ulasilamadi');
    }
}

function saveDataToServer(data, force = false) {
    if (!data || typeof data !== 'object' || !hasPersistedPeopleData(data)) {
        console.warn("GUVENLIK: Bos veya hatali veri kaydedilmeye calisildi! Islem iptal edildi.");
        return Promise.reject("Bos veri korumasi: Kayit iptal edildi.");
    }

    const primaryUrl = force ? 'write_data.php?force=true' : 'write_data.php';
    const fallbackUrl = force ? 'save.php?force=true' : 'save.php';

    const sendSave = (url) => fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        mode: 'same-origin',
        body: JSON.stringify(data)
    }).then(async response => {
        const rawText = await response.text();

        if (response.status === 409) {
            throw new Error("ANTI-WIPE: Sunucu veri kaybini engelledi.");
        }

        if (!response.ok) {
            let detail = rawText;
            try {
                const parsed = JSON.parse(rawText);
                if (parsed && typeof parsed.message === 'string') detail = parsed.message;
            } catch (e) {}
            throw new Error('HTTP ' + response.status + (detail ? ' - ' + detail : ''));
        }

        return rawText;
    }).then(text => {
        try {
            const result = JSON.parse(text);
            updateServerStatus('success', 'Sunucuya kaydedildi');
            return result;
        } catch (e) {
            throw new Error('Sunucu hatasi: ' + text);
        }
    });

    return sendSave(primaryUrl)
        .catch(error => {
            if (String(error && error.message || '').includes('HTTP 403')) {
                return sendSave(fallbackUrl);
            }
            throw error;
        })
        .catch(error => {
            console.error(error);
            updateServerStatus('error', 'Kayit Hatasi');
            throw error;
        });
}
function loadDataFromServer() {
    return fetchWithTimeout('get_data.php?t=' + Date.now(), { 
        method: 'GET', 
        headers: { 
            'Accept': 'application/json'
        } 
    })
    .then(async response => {
        const text = await response.text();
        const source = response.headers.get('X-Data-Source') || '';
        if (!response.ok) {
            let msg = 'HTTP ' + response.status;
            try {
                const err = JSON.parse(text);
                if (err && err.message) msg += ': ' + err.message;
            } catch (_) {}
            console.warn('get_data.php hatası:', msg);
            throw new Error(msg);
        }
        return { text, source };
    })
    .then(({ text, source }) => {
        try {
            const result = JSON.parse(text);
            if (result.status === 'success' && result.data) return { data: result.data, source: source || 'main' };
            if (typeof result === 'object') return { data: result, source };
            
            throw new Error('Veri alınamadı');
        } catch (e) { throw new Error('Sunucu hatası: ' + text); }
    });
}

/** @typedef {{ ok: boolean, hasPeopleData: boolean, source: string }} LoadDataResult */

/**
 * Veriyi yükler. Siri / kişi eşlemesi için: `ok && hasPeopleData` anlamlıdır.
 * @returns {Promise<LoadDataResult>}
 */
async function loadData() {
    let localData = null;
    try {
        const savedData = await advancedStorage.getItem('sahsiHesapTakibiData');
        if (savedData) localData = JSON.parse(savedData);
    } catch (_) {}

    if (!hasPersistedPeopleData(localData)) {
        localData = null;
    }

    if (!navigator.onLine) {
        if (localData) {
            allData = localData;
            hasLoadedServerData = false;
            updateServerStatus('error', 'Çevrimdışı mod, cihazdaki veri yüklendi');
            return { ok: true, hasPeopleData: true, source: 'offline-local' };
        }
        hasLoadedServerData = false;
        updateServerStatus('error', 'Çevrimdışı mod, cihazda kayıtlı veri yok');
        return { ok: false, hasPeopleData: false, source: 'offline-empty' };
    }

    try {
        const serverResult = await loadDataFromServer();
        const serverData = serverResult && serverResult.data ? serverResult.data : {};
        const serverSource = serverResult && serverResult.source ? serverResult.source : '';
        const isMetadataOnlyServerData = (serverSource === 'main' || serverSource === 'backup') && !hasPersistedPeopleData(serverData);
        if (localData && localData.metadata && localData.metadata.unsynced === true) {
            allData = localData;
            hasLoadedServerData = false;
            updateServerStatus('', 'Yerel degisiklikler korunuyor, sunucuya gonderiliyor...');
            try {
                allData.metadata.unsynced = false;
                await saveDataToServer(allData, false);
                await persistLocalDataSnapshot(allData, false);
                await clearQueuedServerSyncPayloads();
                updateServerStatus('success', 'Yerel veri sunucuya gonderildi');
            } catch (pushErr) {
                try {
                    await persistLocalDataSnapshot(allData, true);
                    await queueServerSyncPayload(allData);
                } catch (_) {}
                updateServerStatus('error', 'Yerel veri sunucuya gonderilemedi');
            }
            const hasPD = hasPersistedPeopleData(allData);
            return { ok: hasPD, hasPeopleData: hasPD, source: 'local-unsynced-reconciled' };
        }
        if (hasPersistedPeopleData(serverData)) {
            allData = serverData;
            hasLoadedServerData = true;
            await persistLocalDataSnapshot(allData, false);
            await clearQueuedServerSyncPayloads();
            updateServerStatus('success', serverSource === 'backup' ? 'Yedek veriden yuklendi' : 'Sunucudan yuklendi');
            return { ok: true, hasPeopleData: true, source: serverSource === 'backup' ? 'backup' : 'server' };
        }
        if (isMetadataOnlyServerData) {
            updateServerStatus('error', 'Sunucuda yalnizca metadata var, veri yuklenemedi');
        }
        if (localData) {
            allData = localData;
            hasLoadedServerData = false;
            updateServerStatus(isMetadataOnlyServerData || serverSource === 'default' ? 'error' : 'success', isMetadataOnlyServerData ? 'Sunucuda yalnizca metadata var, yerel veri yuklendi' : (serverSource === 'default' ? 'Sunucuda veri bulunamadi, yerel veri yuklendi' : 'Yerel veri yuklendi'));
        } else {
            hasLoadedServerData = false;
            updateServerStatus(isMetadataOnlyServerData || serverSource === 'default' ? 'error' : 'success', isMetadataOnlyServerData ? 'Sunucuda yalnizca metadata var, veri yuklenemedi' : (serverSource === 'default' ? 'Sunucuda veri veya yedek bulunamadi' : 'Yeni sistem hazir'));
        }
        const hasPD = hasPersistedPeopleData(allData);
        const source = localData
            ? 'local-fallback'
            : (isMetadataOnlyServerData ? 'metadata-only-empty' : (serverSource === 'default' ? 'empty-server' : 'new-system'));
        return { ok: hasPD, hasPeopleData: hasPD, source };
    } catch (error) {
        if (localData) {
            allData = localData;
            updateServerStatus('error', 'Sunucuya ulasilamadi, yerel veri yuklendi');
            const hasPD = hasPersistedPeopleData(allData);
            return { ok: true, hasPeopleData: hasPD, source: 'offline-local' };
        }
        updateServerStatus('error', 'Baglanti hatasi');
        return { ok: false, hasPeopleData: hasPersistedPeopleData(allData), source: 'fatal' };
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
            if (allData[person].categoryBalances[''] !== undefined) {
                delete allData[person].categoryBalances[''];
                changed = true;
            }
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
                    const cat = t.category != null ? String(t.category) : '';
                    if (!cat) return;
                    if (allData[person].categoryBalances[cat] === undefined) {
                        allData[person].categoryBalances[cat] = 0;
                    }
                    const amount = Math.abs(Number(t.amount)) || 0;
                    if (t.type === 'giden') {
                        allData[person].categoryBalances[cat] += amount;
                    } else {
                        allData[person].categoryBalances[cat] -= amount;
                    }
                });
            }
        });
    });
    // Boş kategori ( "") bakiyesini kaldır – hayalet bakiye buradan kaynaklanıyordu
    if (allData[person].categoryBalances[''] !== undefined) delete allData[person].categoryBalances[''];
    updateDisplays(person);
}

function calculatePersonTotalBalance(person) {
    if (!allData[person] || !allData[person].categoryBalances) return 0;
    let totalBalance = 0;
    Object.values(allData[person].categoryBalances).forEach(balance => totalBalance += (balance || 0));
    return totalBalance;
}

/** Tüm kişilerin bakiyelerini sadece işlem kayıtlarından yeniden hesaplar. Hayalet bakiye (işlemsiz görünen bakiye) varsa düzeltir. */
function recalculateAllBalancesFromTransactions() {
    if (!confirm('Tüm bakiyeler işlem geçmişinden yeniden hesaplanacak. Devam edilsin mi?')) return;
    if (typeof closeAllMenus === 'function') closeAllMenus();
    Object.keys(allData).forEach(person => {
        if (person === 'metadata') return;
        if (allData[person]) calculateAllBalances(person);
    });
    queueSave();
    updateMainDisplay();
    if (currentPerson) updateDisplays(currentPerson);
    showNotification('Bakiyeler işlemlerden yeniden hesaplandı.', 'success');
}
window.recalculateAllBalancesFromTransactions = recalculateAllBalancesFromTransactions;

/** Belirli bir tutarın (örn. 250000) hangi kişi/kategoride olduğunu ve kaç işlemden geldiğini bulur. */
function findBalanceSource(targetAmount) {
    if (targetAmount == null || targetAmount === '') targetAmount = 250000;
    const num = parseFloat(String(targetAmount).replace(/\s/g, '').replace(',', '.')) || 250000;
    const tolerance = 1;
    const lines = [];
    const found = [];

    Object.keys(allData).forEach(person => {
        if (person === 'metadata') return;
        const bals = allData[person].categoryBalances || {};
        Object.keys(bals).forEach(cat => {
            const balance = Number(bals[cat]) || 0;
            if (Math.abs(balance - num) > tolerance) return;
            const txs = getAllTransactionsForPerson(person);
            const catTxs = txs.filter(t => t.category === cat);
            const sumGiden = catTxs.filter(t => t.type === 'giden').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const sumGelen = catTxs.filter(t => t.type === 'gelen').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const calcBalance = sumGiden - sumGelen;
            found.push({ person, cat, balance, count: catTxs.length, sumGiden, sumGelen, calcBalance, catTxs });
        });
    });

    found.forEach(f => {
        lines.push(`${f.person} → "${f.cat}": bakiye ${formatAmount(f.balance)}, ${f.count} işlem (giden: ${formatAmount(f.sumGiden)}, gelen: ${formatAmount(f.sumGelen)}). Hesaplanan: ${formatAmount(f.calcBalance)}`);
        if (f.count === 0 && Math.abs(f.balance) > 0.01) {
            const anyMatch = getAllTransactionsForPerson(f.person).filter(t => Math.abs((Number(t.amount) || 0) - num) < 1);
            if (anyMatch.length) lines.push(`  ⚠️ Bu kategoride işlem yok ama ${f.person} kişisinde ${formatAmount(num)} tutarlı ${anyMatch.length} işlem var. Kategorileri: ${[...new Set(anyMatch.map(t => t.category))].join(', ')}`);
        }
    });

    if (lines.length === 0) {
        lines.push('Bu tutarda bakiye bulunamadı. Tüm borçlu (pozitif) bakiyeler:');
        Object.keys(allData).forEach(person => {
            if (person === 'metadata') return;
            const bals = allData[person].categoryBalances || {};
            Object.keys(bals).forEach(cat => {
                const b = Number(bals[cat]) || 0;
                if (b > 0.01) {
                    const txs = getAllTransactionsForPerson(person).filter(t => t.category === cat);
                    lines.push(`${person} → "${cat}": ${formatAmount(b)} (${txs.length} işlem)`);
                }
            });
        });
    }

    const msg = lines.join('\n');
    const modal = document.getElementById('balanceSourceModal');
    if (modal) {
        const body = document.getElementById('balanceSourceModalBody');
        if (body) body.textContent = msg;
        if (typeof closeAllMenus === 'function') closeAllMenus();
        return;
    }
    const div = document.createElement('div');
    div.id = 'balanceSourceModal';
    div.className = 'balance-source-modal-host';
    div.innerHTML = `
        <div class="balance-source-modal-shell">
            <div class="balance-source-modal-toolbar">
                <strong>Bakiye kaynağı (${formatAmount(num)})</strong>
                <button type="button" class="btn balance-source-modal-close" id="balanceSourceModalCloseBtn">Kapat</button>
            </div>
            <div id="balanceSourceModalBody" class="balance-source-modal-body">${sanitizeHTML(msg)}</div>
        </div>
    `;
    document.body.appendChild(div);
    function removeBalanceSourceModal() {
        div.removeEventListener('click', onBalanceSourceBackdropClick);
        div.remove();
    }
    function onBalanceSourceBackdropClick(e) {
        if (e.target === div) removeBalanceSourceModal();
    }
    div.addEventListener('click', onBalanceSourceBackdropClick);
    const closeBtn = div.querySelector('#balanceSourceModalCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', removeBalanceSourceModal);
}
window.findBalanceSource = findBalanceSource;

function updateMainDisplay() {
    let totalRec = 0, totalPay = 0;
    const people = [];
    Object.keys(allData).forEach(p => {
        if (p === 'metadata') return;
        people.push(p);
        const bal = calculatePersonTotalBalance(p);
        if (bal > 0.01) totalRec += bal;
        else if (bal < -0.01) totalPay += Math.abs(bal);
    });

    if(DOM.totalReceivable) DOM.totalReceivable.textContent = formatAmount(totalRec);
    if(DOM.totalPayable) DOM.totalPayable.textContent = formatAmount(totalPay);
    if(DOM.totalPeople) DOM.totalPeople.textContent = people.length;

    people.sort((a, b) => a.localeCompare(b, 'tr-TR'));
    const peopleKey = people.join('\0');
    if (DOM.personSelect && peopleKey !== lastMainPeopleKey) {
        lastMainPeopleKey = peopleKey;
        populatePersonSelect(DOM.personSelect, people);
    }
    updateQuickGrid();
}

let draggedIndex = null;
let lastMainPeopleKey = '';
let quickGridDelegated = false;
let historyMenuDelegated = false;
let lastHistoryTxById = Object.create(null);

function safeDisplayName(name) {
    if (!name) return '';
    return (name.length > 15) ? name.substring(0, 15) + '…' : name;
}

function escapeHtmlAttr(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function ensureQuickGridDelegation() {
    const grid = DOM.quickAccessGrid;
    if (!grid || quickGridDelegated) return;
    quickGridDelegated = true;

    grid.addEventListener('click', function(e) {
        const item = e.target.closest('.quick-item');
        if (!item || !grid.contains(item)) return;
        const person = item.getAttribute('data-person');
        if (person == null || person === '') return;
        handleQuickItemClick(e, person);
    });

    grid.addEventListener('dragstart', function(e) {
        const item = e.target.closest('.quick-item');
        if (!item || !grid.contains(item)) return;
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (Number.isNaN(index)) return;
        handleDragStart(e, index, item);
    });

    grid.addEventListener('dragover', handleDragOver);

    grid.addEventListener('drop', function(e) {
        const item = e.target.closest('.quick-item');
        if (!item || !grid.contains(item)) return;
        const index = parseInt(item.getAttribute('data-index'), 10);
        handleDrop(e, Number.isNaN(index) ? null : index);
    });

    grid.addEventListener('dragend', function(e) {
        const item = e.target.closest('.quick-item');
        handleDragEnd(e, item);
    });

    grid.addEventListener('touchstart', function(e) {
        const item = e.target.closest('.quick-item');
        if (!item || !grid.contains(item)) return;
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (Number.isNaN(index)) return;
        handleTouchStart(e, index);
    }, { passive: true });

    grid.addEventListener('touchmove', handleTouchMove, { passive: false });

    grid.addEventListener('touchend', function(e) {
        const item = e.target.closest('.quick-item');
        if (!item || !grid.contains(item)) return;
        const index = parseInt(item.getAttribute('data-index'), 10);
        handleTouchEnd(e, Number.isNaN(index) ? null : index);
    });
}

function updateQuickGrid() {
    if (!DOM.quickAccessGrid) return;
    ensureQuickGridDelegation();
    
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
        const attrPerson = escapeHtmlAttr(person);
        let displayName = person;
        if (displayName.length > 9) displayName = safeDisplayName(displayName).substring(0, 9) + '..';

        const balance = calculatePersonTotalBalance(person);
        let statusClass = ''; 
        if (balance > 0.01) statusClass = 'alacakli';
        else if (balance < -0.01) statusClass = 'borclu';

        html += `
        <div class="quick-item" 
             draggable="true" 
             data-person="${attrPerson}"
             data-index="${index}">
            <span class="q-icon ${statusClass}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28px" height="28px">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </span>
            <span class="q-name display-name-el" data-fullname="${sanitizeHTML(person).replace(/"/g, '&quot;')}" title="${sanitizeHTML(person).replace(/"/g, '&quot;')}">${sanitizeHTML(displayName)}</span>
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

function handleDragStart(event, index, itemEl) {
    draggedIndex = index;
    const el = itemEl || event.target.closest('.quick-item');
    if (el) el.classList.add('quick-item--dragging');
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', el ? el.innerHTML : '');
    }
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

function handleDragEnd(event, itemEl) {
    const el = itemEl || event.target.closest('.quick-item');
    if (el) el.classList.remove('quick-item--dragging');
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
        if (draggedEl) draggedEl.classList.add('quick-item--dragging');
        
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
        el.classList.remove('drag-over', 'quick-item--dragging');
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
    
    let html = '<option value="">Seç</option>';
    
    cats.filter(c => {
        if (c === 'BEN' || c === 'Elden') return false;
        if (c === 'Avans' && transactionType !== 'giden') return false;
        return true;
    }).sort().forEach(c => {
        const bal = balances[c] || 0;
        let statusText = '';
        if (bal < -0.01) {
            statusText = `\u200B (-${formatAmount(Math.abs(bal))})`;
        } else if (bal > 0.01) {
            statusText = `\u200B (+${formatAmount(bal)})`;
        }
        const safeCVal = String(c).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;');
        html += `<option value="${safeCVal}">${sanitizeHTML(c)}${statusText}</option>`;
    });
    if (selectElement.id === 'category') {
        html += '<option value="__add_new_category__">+ Kategori yönetimi</option>';
    }
    selectElement.innerHTML = html;
    if (selectElement.id === 'category') {
        syncCustomCategorySelectUI();
    }
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
    if (typeInputId === 'transactionType') {
        maybeTriggerMainAutoAllocation();
    }
}

function getDebtorCategoriesForPerson(person) {
    if (!person || !allData[person]) return [];
    return Object.keys(allData[person].categoryBalances || {})
        .filter(c => (allData[person].categoryBalances[c] || 0) > 0.01)
        .sort((a, b) => (allData[person].categoryBalances[b] || 0) - (allData[person].categoryBalances[a] || 0));
}

function applySingleDebtDefaultCategory(selectElement, person) {
    if (!selectElement) return false;
    const debts = getDebtorCategoriesForPerson(person);
    if (debts.length !== 1) return false;
    const targetCategory = debts[0];
    const hasOption = Array.from(selectElement.options || []).some(opt => opt.value === targetCategory);
    if (!hasOption) return false;
    selectElement.value = targetCategory;
    return true;
}

function maybeTriggerMainAutoAllocation() {
    if (!DOM.amount || !DOM.category) return;
    const allocEl = document.getElementById('allocationOverlay');
    if (allocEl && !allocEl.classList.contains('u-hidden')) return;

    const person = currentPerson;
    const type = DOM.transactionType?.value || '';
    const amount = deformatCurrency(DOM.amount.value || '0');
    if (!person || type !== 'gelen' || amount <= 0.01) return;

    const debts = getDebtorCategoriesForPerson(person);
    if (debts.length === 0) return;

    applySingleDebtDefaultCategory(DOM.category, person);
    initiateAllocation();
}

function populatePersonSelect(selectElement, sortedPeople = null) {
    if (!selectElement) return;
    const currentVal = selectElement.value;

    while (selectElement.options.length > 1) selectElement.remove(1);

    const peopleToRender = sortedPeople || Object.keys(allData)
        .filter(person => person !== 'metadata')
        .sort((a, b) => a.localeCompare(b, 'tr-TR'));

    peopleToRender.forEach(person => {
        selectElement.add(new Option(person, person));
    });
    selectElement.value = currentVal;
    syncCustomPersonSelectUI();
}

function syncCustomPersonSelectLabel() {
    if (!DOM.personSelect || !DOM.personSelectLabel) return;
    const selectedOption = DOM.personSelect.options[DOM.personSelect.selectedIndex];
    const labelText = selectedOption ? selectedOption.textContent.trim() : 'Kişi Seçiniz...';
    const isPlaceholder = !DOM.personSelect.value;
    DOM.personSelectLabel.textContent = labelText;
    DOM.personSelectLabel.classList.toggle('person-select-label--placeholder', isPlaceholder);
}

function handlePersonSelectOpenKeydown(e) {
    if (!DOM.personSelectMenu || DOM.personSelectMenu.hidden) return;
    if (e.target === DOM.personSelectSearch) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        closeCustomPersonSelect();
        DOM.personSelectTrigger?.focus();
        return;
    }

    if (e.key === 'Backspace') {
        e.preventDefault();
        if (!DOM.personSelectSearch) return;
        DOM.personSelectSearch.focus();
        DOM.personSelectSearch.value = DOM.personSelectSearch.value.slice(0, -1);
        renderCustomPersonSelectOptions(DOM.personSelectSearch.value);
        return;
    }

    if (e.key.length === 1 && /[^\s]/.test(e.key)) {
        e.preventDefault();
        if (!DOM.personSelectSearch) return;
        DOM.personSelectSearch.focus();
        DOM.personSelectSearch.value += e.key;
        renderCustomPersonSelectOptions(DOM.personSelectSearch.value);
    }
}

function closeCustomPersonSelect() {
    if (!DOM.personSelectShell || !DOM.personSelectMenu || !DOM.personSelectTrigger) return;
    DOM.personSelectShell.classList.remove('open');
    DOM.personSelectMenu.hidden = true;
    DOM.personSelectMenu.classList.remove('person-select-menu--viewport');
    DOM.personSelectTrigger.setAttribute('aria-expanded', 'false');
    if (DOM.personSelectSearch) DOM.personSelectSearch.value = '';
    setPersonSelectBackdropActive(false);
}

function renderCustomPersonSelectOptions(filterText = '') {
    if (!DOM.personSelect || !DOM.personSelectOptions) return;

    const fragment = document.createDocumentFragment();
    const normalizedFilter = (filterText || '').trim().toLocaleLowerCase('tr-TR');
    const options = Array.from(DOM.personSelect.options || []).slice(1);
    const matchingOptions = options.filter(option => option.value.toLocaleLowerCase('tr-TR').includes(normalizedFilter));

    if (!matchingOptions.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'person-select-empty';
        emptyState.textContent = 'Eşleşen kişi bulunamadı';
        fragment.appendChild(emptyState);
    } else {
        matchingOptions.forEach(option => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'person-select-option';
            item.textContent = option.textContent.trim();
            item.setAttribute('role', 'option');
            item.setAttribute('data-person-select-value', option.value);
            if (option.value === DOM.personSelect.value) item.classList.add('is-selected');
            fragment.appendChild(item);
        });
    }

    DOM.personSelectOptions.innerHTML = '';
    DOM.personSelectOptions.appendChild(fragment);
}

function openCustomPersonSelect() {
    if (!DOM.personSelectShell || !DOM.personSelectMenu || !DOM.personSelectTrigger) return;
    closeSettingsAndNotificationMenus();
    closeQuickTransactionOverlay();
    DOM.personSelectShell.classList.add('open');
    DOM.personSelectMenu.hidden = false;
    DOM.personSelectTrigger.setAttribute('aria-expanded', 'true');
    positionPersonSelectMenu();
    setPersonSelectBackdropActive(true);
    renderCustomPersonSelectOptions(DOM.personSelectSearch?.value || '');
    if (DOM.personSelectSearch) {
        /* preventScroll: iOS sayfayı kaydırıp menüyü klavyenin altına gömmesin */
        DOM.personSelectSearch.focus({ preventScroll: true });
        DOM.personSelectSearch.select();
    }
    requestAnimationFrame(positionPersonSelectMenu);
    setTimeout(positionPersonSelectMenu, 120);
    setTimeout(positionPersonSelectMenu, 360);
}

function toggleCustomPersonSelect() {
    if (!DOM.personSelectMenu || DOM.personSelectMenu.hidden) {
        openCustomPersonSelect();
    } else {
        closeCustomPersonSelect();
    }
}

function syncCustomPersonSelectUI() {
    syncCustomPersonSelectLabel();
    if (DOM.personSelectShell?.classList.contains('open')) {
        renderCustomPersonSelectOptions(DOM.personSelectSearch?.value || '');
    }
}

function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (!modal) return;
    setTimeout(function() { modal.classList.add('show'); }, 10);

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
    options.classList.toggle('share-options--visible', !options.classList.contains('share-options--visible'));
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
        const shareOpt = document.getElementById('shareOptions');
        if(shareOpt) shareOpt.classList.remove('share-options--visible');
    };

    doCopy(text);
}

function openPersonModal(person) {
    currentPerson = person;
    document.getElementById('modalPersonName').textContent = ` 👤  ${person.toUpperCase()}`;
    
    updatePersonTotalInfo(person);
    clearTransactionForm();
    updateTransactionHistory();
    
    const shareOpt = document.getElementById('shareOptions');
    if(shareOpt) shareOpt.classList.remove('share-options--visible');

    try { updateCategoryBalanceDisplay(person); } catch (e) {}

    setReportDateDefaults();

    const firstTab = document.querySelector('#personModal .tab-btn');
    if (firstTab) firstTab.click();

    openModal('personModal');
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
                    <span class="info-label">${sanitizeHTML(person)} Borcu:</span>
                    <span class="info-amount text-income">${formatAmount(rx)}</span>
                </div>
                <div class="balance-row">
                    <span class="info-label">Borcunuz:</span>
                    <span class="info-amount text-expense">${formatAmount(px)}</span>
                </div>
            </div>
            
            <div class="info-col right-side">
                <div class="balance-row">
                    <span class="info-label">${sanitizeHTML(netLabel)}:</span>
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

        document.body.classList.remove('modal-open-ios');
        
        if ((modalId === 'editTransactionModal' || modalId === 'categoryDetailModal') && currentPerson) {
            const personModal = document.getElementById('personModal');
            if (personModal) {
                personModal.classList.add('show');
                DOM.mainAppContainer?.classList.add('disable-events');
                document.body.classList.add("disable-events");
            }
            return;
        }
        if (modalId === 'monthlySummaryModal' && currentPerson) {
            const personModal = document.getElementById('personModal');
            if (personModal) {
                personModal.classList.add('show');
                DOM.mainAppContainer?.classList.add('disable-events');
                document.body.classList.add("disable-events");
                var raporlarBtn = document.querySelector('#personModal .tab-btn[data-tab="raporlar"]');
                if (raporlarBtn) openTab(null, 'raporlar', raporlarBtn);
            }
            return;
        }
        if (modalId === 'categoryManagementModal' && currentPerson) {
            const personModal = document.getElementById('personModal');
            if (personModal) {
                personModal.classList.add('show');
                DOM.mainAppContainer?.classList.add('disable-events');
                document.body.classList.add("disable-events");
            }
            if (DOM.category) populateCategorySelect(DOM.category, currentPerson);
            return;
        }

        if (!checkAnyMenuOpen()) {
            DOM.mainAppContainer?.classList.remove('disable-events');
            document.body.classList.remove("disable-events"); 
        }
    }
    if(modal && modal.id === 'personModal') {
        setCategorySelectBackdropActive(false);
        if(DOM.personSelect) DOM.personSelect.value = '';
    }
}

function closeAllModals() {
    
    document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('show');
    });
    
    document.body.classList.remove('modal-open-ios');
    closeSettingsAndNotificationMenus();
    closeColorSelectionMenuFromUI();

    closeQuickTransactionOverlay();
    closeMemoryOverlay();

    closeAllocationOverlay();

    setCategorySelectBackdropActive(false);

    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events"); 
    
    if(DOM.personSelect) DOM.personSelect.value = '';
}

function openTab(e, id, activeBtn) {
    const personModalBody = document.querySelector('#personModal .modal-body');
    if (personModalBody) {
        personModalBody.querySelectorAll('.tab-content').forEach(function(t) {
            t.classList.remove(TAB_CONTENT_VISIBLE_CLASS);
        });
    }
    document.querySelectorAll('#personModal .tab-btn').forEach(function(b) { b.classList.remove('active'); });
    const panel = document.getElementById(id);
    if (panel) panel.classList.add(TAB_CONTENT_VISIBLE_CLASS);
    const btn = activeBtn || (e && e.currentTarget);
    if (btn) btn.classList.add('active');
    if (id === 'kategoriDurumu') updateCategoryBalanceDisplay(currentPerson);
    if (id === 'raporlar') renderReportPreview();
}

/** Liste altı “ilk N…” notu; metin uygulama tarafından üretilir, sanitizeHTML ile kaçışlanır. */
function renderListTruncationNote(plainText) {
    return '<div class="list-truncation-note" role="status">' + sanitizeHTML(plainText) + '</div>';
}

function renderTransactionHistoryHeaderHtml() {
    return '<h4 class="transaction-history-title">Son İşlemler</h4>';
}

function renderReportPreviewSummaryHtml(totalCount, totalAmount) {
    const formattedTotal = formatAmount(Math.abs(totalAmount));
    const direction = totalAmount > 0 ? '(Alacak)' : (totalAmount < 0 ? '(Borç)' : '');
    var balClass = 'report-preview-summary-balance--neutral';
    if (totalAmount > 0.01) balClass = 'report-preview-summary-balance--credit';
    else if (totalAmount < -0.01) balClass = 'report-preview-summary-balance--debt';
    return (
        '<span class="report-preview-summary-count">' + totalCount + ' İşlem</span>' +
        '<span class="report-preview-summary-sep" aria-hidden="true">|</span> ' +
        '<span class="report-preview-summary-balance ' + balClass + '">' + sanitizeHTML(formattedTotal + ' ' + direction) + '</span>'
    );
}

function renderReportPreviewItemHtml(t) {
    const dateShort = formatDateTR(new Date(t.date));
    const amountClass = t.type === 'giden' ? 'text-expense' : 'text-income';
    const descHtml = t.description
        ? '<div class="report-preview-desc">' + sanitizeHTML(t.description) + '</div>'
        : '';
    return (
        '<div class="report-preview-item">' +
        '<div class="report-preview-main">' +
        '<div class="report-preview-topline">' +
        '<span class="report-preview-date">' + dateShort + '</span>' +
        '<span class="report-preview-category">' + sanitizeHTML(t.category) + '</span>' +
        '</div>' +
        descHtml +
        '</div>' +
        '<span class="report-preview-amount ' + amountClass + '">' + formatAmount(t.amount) + '</span>' +
        '</div>'
    );
}

function buildSiriConfirmModalHtml(person, amount, type, desc, matchedPerson) {
    const typeText = type === 'gelen' ? 'Gelen' : 'Giden';
    const typeClass = type === 'gelen' ? 'text-income' : 'text-expense';
    const personDisplayClass = matchedPerson ? 'siri-confirm-value' : 'siri-confirm-value siri-confirm-value--missing';
    const personDisplayText = matchedPerson ? sanitizeHTML(matchedPerson) : 'Bulunamadı';
    const descRows = desc
        ? '<div class="siri-confirm-row"><span class="siri-confirm-label">Açıklama:</span><span class="siri-confirm-value">' + sanitizeHTML(desc) + '</span></div>'
        : '';
    const warnBlock = !matchedPerson
        ? '<div class="siri-confirm-warn"><span class="siri-confirm-warn-text">⚠️ "' + sanitizeHTML(person) + '" kişisi bulunamadı. Lütfen kişi seçin:</span>' +
          '<select id="siriPersonSelect" class="siri-person-select"><option value="">Kişi Seçin...</option></select></div>'
        : '';
    return (
        '<div id="siriConfirmModal" class="modal siri-confirm-modal">' +
        '<div class="modal-content">' +
        '<div class="modal-header"><h2>🎤 Sesli Kayıt Onayı</h2></div>' +
        '<div class="modal-body">' +
        '<div class="siri-confirm-summary">' +
        '<div class="siri-confirm-row"><span class="siri-confirm-label">Kişi:</span><span id="siriPersonDisplay" class="' + personDisplayClass + '">' + personDisplayText + '</span></div>' +
        '<div class="siri-confirm-row"><span class="siri-confirm-label">Tutar:</span><span class="siri-confirm-value">' + formatAmount(parseFloat(amount) || 0) + '</span></div>' +
        '<div class="siri-confirm-row"><span class="siri-confirm-label">Tip:</span><span class="' + typeClass + ' siri-confirm-type-emphasis">' + typeText + '</span></div>' +
        descRows +
        '</div>' +
        warnBlock +
        '<div class="siri-confirm-actions">' +
        '<button type="button" class="btn siri-confirm-btn-secondary" data-siri-action="cancel">❌ İptal</button>' +
        '<button type="button" class="btn btn-success" data-siri-action="confirm">✅ Onayla</button>' +
        '</div></div></div></div>'
    );
}

function bindSiriConfirmModal(root, matchedPerson, amountNum, type, desc) {
    const cancelBtn = root.querySelector('[data-siri-action="cancel"]');
    if (cancelBtn) cancelBtn.addEventListener('click', closeSiriModal);

    const confirmBtn = root.querySelector('[data-siri-action="confirm"]');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            var resolved = matchedPerson;
            if (!resolved) {
                const sel = document.getElementById('siriPersonSelect');
                resolved = sel ? sel.value : '';
            }
            confirmSiriTransaction(resolved, amountNum, type, desc);
        });
    }

    if (!matchedPerson) {
        const select = document.getElementById('siriPersonSelect');
        if (select && allData) {
            Object.keys(allData).sort().forEach(function(p) {
                if (p === 'metadata') return;
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt);
            });

            select.addEventListener('change', function() {
                const display = document.getElementById('siriPersonDisplay');
                if (!display) return;
                if (this.value) {
                    display.innerHTML = '<span class="siri-confirm-value--ok">' + sanitizeHTML(this.value) + '</span>';
                } else {
                    display.textContent = 'Bulunamadı';
                    display.className = 'siri-confirm-value siri-confirm-value--missing';
                }
            });
        }
    }
}

function createNotificationMenuItemElement(notif, index) {
    const item = document.createElement('div');
    item.className = 'notif-menu-item ' + (notif.type === 'success' ? 'notif-menu-item--success' : 'notif-menu-item--error');
    const span = document.createElement('span');
    span.textContent = notif.message == null ? '' : String(notif.message);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete-notif-btn';
    btn.setAttribute('data-notification-index', String(index));
    btn.setAttribute('aria-label', 'Bildirimi sil');
    btn.textContent = '✖';
    item.appendChild(span);
    item.appendChild(btn);
    return item;
}

function updateTransactionHistory() {
    if(!DOM.transactionHistory) return;
    ensureHistoryMenuDelegation();
    
    let txs = getAllTransactionsForPerson(currentPerson);
    // ISO string karşılaştırması Date() oluşturmadan sıralar
    txs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    
    if(txs.length === 0) {
         lastHistoryTxById = Object.create(null);
         DOM.transactionHistory.innerHTML = renderEmptyState('Henüz işlem yok');
         return;
    }

    const MAX_HISTORY_ITEMS = 200;
    const displayTxs = txs.length > MAX_HISTORY_ITEMS ? txs.slice(0, MAX_HISTORY_ITEMS) : txs;

    lastHistoryTxById = Object.create(null);
    displayTxs.forEach(function(t) {
        lastHistoryTxById[Number(t.id)] = t;
    });

    var html = renderTransactionHistoryHeaderHtml();
    displayTxs.forEach(function(t) { html += renderTransactionHistoryItem(t); });
    if (txs.length > MAX_HISTORY_ITEMS) {
        html += renderListTruncationNote(
            'İlk ' + MAX_HISTORY_ITEMS + ' işlem gösteriliyor (toplam ' + txs.length + '). Tümünü görmek için Raporlar sekmesini kullanın.'
        );
    }
    
    DOM.transactionHistory.innerHTML = html;
}

function ensureHistoryMenuDelegation() {
    if (!DOM.transactionHistory || historyMenuDelegated) return;
    historyMenuDelegated = true;
    DOM.transactionHistory.addEventListener('click', function(e) {
        if (e.target.closest('.edit-transaction-btn, .delete-transaction-btn')) return;
        const item = e.target.closest('.history-item');
        if (!item || !DOM.transactionHistory.contains(item)) return;
        const rect = item.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        if (clickX <= rect.width - 50) return;
        e.stopPropagation();
        const txId = Number(item.getAttribute('data-tx-id'));
        const transaction = lastHistoryTxById[txId];
        if (transaction && currentPerson) {
            showTransactionContextMenu(e, transaction, currentPerson, item);
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
        let status = b > 0 ? 'Borçlu' : (b < 0 ? 'Alacaklı' : '');
        if (c === 'Avans' && b < 0) {
            status = 'Avans';
        }
        html += renderCategoryItem(c, b, status);
    });
    grid.innerHTML = html || renderEmptyState('Kayıt yok');
}

function showCategoryDetails(categoryName) {
    const person = currentPerson;
    if (!person || !allData[person]) return;

    const modal = DOM.categoryDetailModal;
    const titleEl = document.getElementById('categoryDetailTitle');
    
    titleEl.textContent = `${person.toUpperCase()} - ${categoryName} Detayı`;
    
    let txs = getAllTransactionsForPerson(person);
    const catTxs = txs.filter(t => t.category === categoryName)
                      .sort((a, b) => new Date(a.date) - new Date(b.date));

    currentCategoryDetailState.person = person;
    currentCategoryDetailState.category = categoryName;
    currentCategoryDetailState.allTransactions = catTxs;
    currentCategoryDetailState.filteredTransactions = [...catTxs];
    currentCategoryDetailState.openingBalance = 0;

    if (DOM.categoryDetailStartDate) {
        DOM.categoryDetailStartDate.value = catTxs.length ? formatDateForInput(catTxs[0].date) : '';
        DOM.categoryDetailStartDate.disabled = catTxs.length === 0;
    }
    if (DOM.categoryDetailEndDate) {
        DOM.categoryDetailEndDate.value = catTxs.length ? formatDateForInput(catTxs[catTxs.length - 1].date) : '';
        DOM.categoryDetailEndDate.disabled = catTxs.length === 0;
    }
    syncCategoryDetailDateDisplays();

    renderCategoryDetailContent();
    
    modal.dataset.category = categoryName;
    modal.classList.add('show');
    
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events"); 
    return;
}

function formatDateForInput(dateValue) {
    const date = new Date(dateValue);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function formatDateDDMMYYYY(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return String(date.getDate()).padStart(2, '0') + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + date.getFullYear();
}

/** yyyy-mm-dd → formatDateTR; boş/geçersiz → ''. */
function displayTrFromIsoValue(isoValue) {
    if (!isoValue) return '';
    const d = new Date(isoValue);
    if (isNaN(d.getTime())) return '';
    return formatDateTR(d);
}

function openNativeDatePicker(inputEl, ev) {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    if (!inputEl) return;
    if (typeof inputEl.showPicker === 'function') {
        inputEl.showPicker();
    } else {
        inputEl.focus();
        inputEl.click();
    }
}

/**
 * type=date input ile eş mobil span (dd.mm.yyyy değil, formatDateTR).
 * emptyMode: 'today' boşta bugün; 'skip' boşta dokunma.
 */
function syncMobileTrDateDisplay(inputEl, displayEl, emptyMode) {
    if (!inputEl || !displayEl) return;
    const v = inputEl.value;
    const tr = displayTrFromIsoValue(v);
    if (tr) {
        displayEl.textContent = tr;
    } else if (emptyMode === 'today') {
        displayEl.textContent = formatDateTR(new Date());
    }
}

function getNewTransactionMobileDateDisplayEl() {
    return document.querySelector('.mobile-date-display') || document.querySelector('.current-date-display');
}

function syncIsoInputToDdmmPlaceholderDisplay(inputEl, displayEl) {
    if (!displayEl) return;
    const val = inputEl ? inputEl.value : '';
    displayEl.textContent = val ? formatDateDDMMYYYY(val) : '__.__.____';
}

function syncCategoryDetailDateDisplays() {
    syncIsoInputToDdmmPlaceholderDisplay(DOM.categoryDetailStartDate, DOM.categoryDetailStartDisplay);
    syncIsoInputToDdmmPlaceholderDisplay(DOM.categoryDetailEndDate, DOM.categoryDetailEndDisplay);
}

function syncCategoryDetailDateRange(changedField) {
    const startValue = DOM.categoryDetailStartDate ? DOM.categoryDetailStartDate.value : '';
    const endValue = DOM.categoryDetailEndDate ? DOM.categoryDetailEndDate.value : '';

    if (!startValue || !endValue || startValue <= endValue) return;

    if (changedField === 'start' && DOM.categoryDetailEndDate) {
        DOM.categoryDetailEndDate.value = startValue;
    } else if (changedField === 'end' && DOM.categoryDetailStartDate) {
        DOM.categoryDetailStartDate.value = endValue;
    }
}

function getFilteredCategoryDetailTransactions() {
    const allTransactions = currentCategoryDetailState.allTransactions || [];
    const startValue = DOM.categoryDetailStartDate ? DOM.categoryDetailStartDate.value : '';
    const endValue = DOM.categoryDetailEndDate ? DOM.categoryDetailEndDate.value : '';

    let filteredTransactions = allTransactions;
    let openingBalance = 0;

    if (startValue) {
        const startDate = new Date(startValue + 'T00:00:00');
        openingBalance = allTransactions.reduce((total, transaction) => {
            const transactionDate = new Date(transaction.date);
            if (transactionDate < startDate) {
                return total + (transaction.type === 'giden' ? transaction.amount : -transaction.amount);
            }
            return total;
        }, 0);
        filteredTransactions = filteredTransactions.filter(transaction => new Date(transaction.date) >= startDate);
    }

    if (endValue) {
        const endDate = new Date(endValue + 'T23:59:59.999');
        filteredTransactions = filteredTransactions.filter(transaction => new Date(transaction.date) <= endDate);
    }

    return { filteredTransactions, openingBalance };
}

function updateCategoryDetailExcelButtonState() {
    if (!DOM.categoryDetailExcelBtn) return;
    DOM.categoryDetailExcelBtn.disabled = currentCategoryDetailState.filteredTransactions.length === 0;
}

function renderCategoryDetailContent() {
    const contentEl = document.getElementById('categoryDetailContent');
    if (!contentEl) return;

    const allTransactions = currentCategoryDetailState.allTransactions || [];
    if (allTransactions.length === 0) {
        currentCategoryTransactions = [];
        currentCategoryDetailState.filteredTransactions = [];
        currentCategoryDetailState.openingBalance = 0;
        updateCategoryDetailExcelButtonState();
        contentEl.innerHTML = renderEmptyState('İşlem yok');
        return;
    }

    const { filteredTransactions, openingBalance } = getFilteredCategoryDetailTransactions();
    currentCategoryDetailState.filteredTransactions = filteredTransactions;
    currentCategoryDetailState.openingBalance = openingBalance;
    currentCategoryTransactions = [...filteredTransactions].reverse();
    updateCategoryDetailExcelButtonState();

    if (filteredTransactions.length === 0) {
        contentEl.innerHTML = renderEmptyState('Bu tarih aralığında işlem yok');
        return;
    }

    let runningBalance = openingBalance;
    let rows = [];

    filteredTransactions.forEach(transaction => {
        runningBalance += transaction.type === 'giden' ? transaction.amount : -transaction.amount;
        rows.push(`
            <tr>
                <td>${formatDateTR(new Date(transaction.date))}</td>
                <td class="val-gelen">${transaction.type === 'gelen' ? formatNumber(transaction.amount) : ''}</td>
                <td class="val-giden">${transaction.type === 'giden' ? formatNumber(transaction.amount) : ''}</td>
                <td class="val-bakiye">${formatNumber(runningBalance)}</td>
                <td>${sanitizeHTML(transaction.description || '')}</td>
            </tr>
        `);
    });

    contentEl.innerHTML = `
        <table class="detail-table">
            <thead>
                <tr><th>Tarih</th><th>Gelen</th><th>Giden</th><th>Bakiye</th><th>Açıklama</th></tr>
            </thead>
            <tbody>${rows.reverse().join('')}</tbody>
        </table>
    `;
}

function initiateAllocation() {
    const amount = deformatCurrency(DOM.amount.value);
    const person = currentPerson;
    if (amount <= 0.01) return;

    const debts = getDebtorCategoriesForPerson(person);
        
    if (debts.length === 0) return;

    const content = document.getElementById('allocationDynamicContent');
    const allocOverlay = document.getElementById('allocationOverlay');
    if (allocOverlay) allocOverlay.classList.remove('u-hidden');
    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events");

    const isSingleDebtFlow = debts.length === 1;
    const singleDebtCategory = isSingleDebtFlow ? debts[0] : '';
    
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

    debts.forEach((cat, index) => {
        const debtAmount = allData[person].categoryBalances[cat];
        const safeCategoryAttr = String(cat)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const allocationInputId = `allocation-input-${index}`;
        const defaultAllocationAmount = (isSingleDebtFlow && cat === singleDebtCategory)
            ? Math.min(amount, debtAmount)
            : 0;
        const defaultAllocationValue = defaultAllocationAmount > 0.01
            ? formatNumber(defaultAllocationAmount)
            : '';
        
        itemsHtml += `
        <div class="allocation-item" data-category="${safeCategoryAttr}" data-max-debt="${debtAmount}">
            <div class="allocation-item-header">
                <span class="category-name">${sanitizeHTML(cat)}</span>
                <span class="debt-amount">${formatAmount(debtAmount)}</span>
            </div>
            
            <div class="allocation-item-controls">
                <input type="text" id="${allocationInputId}" name="allocationAmount-${index}" class="allocation-input" value="${defaultAllocationValue}" 
                       aria-label="${safeCategoryAttr} dağıtım tutarı"
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
    
    updateAllocationTotals();
}

function persistAllocationInputValue(input) {
    if (!input || !input.classList.contains('allocation-input')) return;
    const num = deformatCurrency(input.value);
    if (num > 0.01) {
        input.value = formatNumber(num);
        updateAllocationTotals();
        setTimeout(function() {
            if (input.isConnected && deformatCurrency(input.value) < 0.01) {
                input.value = formatNumber(num);
                updateAllocationTotals();
            }
        }, 0);
    } else {
        updateAllocationTotals();
    }
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
        showNotification(VALIDATION_MSG.allocationOverTotal, 'error');
    }

    const remainingAmount = totalAmount - allocatedTotal;
    const displayEl = document.getElementById('allocationRemainingDisplay');
    
    if(displayEl) {
        displayEl.textContent = formatAmount(remainingAmount);
        displayEl.classList.remove('allocation-remaining--balanced', 'allocation-remaining--positive', 'allocation-remaining--negative');
        if (remainingAmount === 0) displayEl.classList.add('allocation-remaining--balanced');
        else if (remainingAmount > 0) displayEl.classList.add('allocation-remaining--positive');
        else displayEl.classList.add('allocation-remaining--negative');
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
    if (overlay) overlay.classList.add('u-hidden');
    
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
        showNotification(VALIDATION_MSG.allocationOverTotal, 'error');
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
                    <button type="button" data-allocation-action="finalize-null" class="allocation-popup-btn btn-cancel">Hayır</button>
                    <button type="button" data-allocation-action="show-desc-input" class="allocation-popup-btn btn-confirm">Evet</button>
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
            <h3 class="allocation-popup-title allocation-popup-title--tight">
                Açıklama:
            </h3>
            <input type="text" id="allocationDescInput" class="allocation-popup-input" placeholder="Açıklama giriniz..." autofocus>
            <div class="allocation-popup-buttons">
                <button type="button" data-allocation-action="close-desc-popup" class="allocation-popup-btn btn-cancel">İptal</button>
                <button type="button" data-allocation-action="finalize-with-desc" class="allocation-popup-btn btn-confirm">Kaydet</button>
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

/** Form doğrulama — kısa, tutarlı kullanıcı mesajları (showNotification ile). */
var VALIDATION_MSG = {
    selectPerson: 'Kişi seçin',
    validAmount: 'Geçerli bir tutar girin',
    selectCategory: 'Kategori seçin',
    selectTransType: 'İşlem tipi seçin',
    validDate: 'Geçerli bir tarih seçin',
    enterName: 'İsim girin',
    duplicatePerson: 'Bu isim zaten var',
    duplicateCategory: 'Bu isimde kategori zaten var',
    enterCategoryName: 'Kategori adı girin',
    allocationOverTotal: 'Dağıtılan tutar, gelen tutardan fazla olamaz'
};

function isValidPositiveAmount(amount) {
    var n = Number(amount);
    return !isNaN(n) && isFinite(n) && n > 0;
}

function isValidOptionalIsoDate(str) {
    if (!str) return true;
    var s = String(str).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-');
    var year = parseInt(p[0], 10);
    var month = parseInt(p[1], 10);
    var day = parseInt(p[2], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    var d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

async function processSingleTransaction() {
    if(isProcessing) return;

    if (!currentPerson || !allData[currentPerson]) {
        return showNotification(VALIDATION_MSG.selectPerson, 'error');
    }

    const amount = deformatCurrency(DOM.amount?.value || '0');
    let category = DOM.category?.value || '';
    const transType = DOM.transactionType?.value || '';
    const dateStr = DOM.dateInput?.value || '';
    if (!isValidPositiveAmount(amount)) return showNotification(VALIDATION_MSG.validAmount, 'error');
    if (!transType) return showNotification(VALIDATION_MSG.selectTransType, 'error');
    if (dateStr && !isValidOptionalIsoDate(dateStr)) {
        return showNotification(VALIDATION_MSG.validDate, 'error');
    }

    if (transType === 'gelen') {
        const debts = getDebtorCategoriesForPerson(currentPerson);
        if (debts.length > 0) {
            applySingleDebtDefaultCategory(DOM.category, currentPerson);
            initiateAllocation();
            return;
        }
    }

    if (!category) return showNotification(VALIDATION_MSG.selectCategory, 'error');

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
            DOM.addTransactionBtn.textContent = 'Kaydet';
            DOM.addTransactionBtn.blur();
        }
    }
}

function addTransaction(person, type, amount, category, description, date = null) {
    amount = Math.abs(amount);
    const cat = (category != null && String(category).trim()) ? String(category).trim() : 'Genel';
    const txDate = date ? date : (transactionDateHolder || getLocalTimeISO());
    const d = new Date(txDate);
    const year = d.getFullYear().toString();
    const month = months[d.getMonth()];

    if (!allData[person][year]) allData[person][year] = {};
    if (!allData[person][year][month]) allData[person][year][month] = { transactions: [], closed: false };

    allData[person][year][month].transactions.push({
        id: Date.now() + Math.random() * 1000,
        amount, description, category: cat, type, date: txDate, status: 'active'
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
    
    const editDateInput = document.getElementById('editDateInput');
    const editDateDisplay = document.getElementById('editMobileDateDisplay');
    if (editDateDisplay && window.innerWidth <= 800) {
        syncMobileTrDateDisplay(editDateInput, editDateDisplay, 'skip');
    }

    openModal('editTransactionModal');
}

async function saveEditedTransaction() {
    if (isProcessing) return;

    const person = currentPerson;
    if (!person || !allData[person]) {
        return showNotification(VALIDATION_MSG.selectPerson, 'error');
    }

    const type = document.getElementById('editTransactionType').value;
    const amount = deformatCurrency(document.getElementById('editAmount').value);
    const cat = document.getElementById('editCategory').value;
    const dateStr = document.getElementById('editDateInput').value;

    if (!isValidPositiveAmount(amount)) return showNotification(VALIDATION_MSG.validAmount, 'error');
    if (!type) return showNotification(VALIDATION_MSG.selectTransType, 'error');
    if (!cat) return showNotification(VALIDATION_MSG.selectCategory, 'error');
    if (dateStr && !isValidOptionalIsoDate(dateStr)) {
        return showNotification(VALIDATION_MSG.validDate, 'error');
    }

    if (!confirm('Düzenlemeyi Kaydetmek İstediğinizden Emin misiniz?')) return;

    isProcessing = true;

    let desc = document.getElementById('editDescription').value;
    desc = formatTitleCase(desc);

    const date = dateStr ? (dateStr + 'T12:00:00.000') : getLocalTimeISO();

    try {
        deleteTransaction(editingTransactionId, true);
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
    setTransactionType('giden');
    setCurrentDate();
}

function checkAnyMenuOpen() {
    const colorEl = document.getElementById('colorSelectionMenu');
    const settings = !!(DOM.settingsMenu && DOM.settingsMenu.classList.contains(MENU_DROPDOWN_OPEN_CLASS));
    const colorSelection = !!(colorEl && colorEl.classList.contains(COLOR_MENU_OPEN_CLASS));
    const notifications = !!(DOM.notificationMenu && DOM.notificationMenu.classList.contains(MENU_DROPDOWN_OPEN_CLASS));

    return settings || colorSelection || notifications;
}

function toggleSettingsMenu() {
    closeColorSelectionMenuFromUI();
    closeCustomPersonSelect();
    if (DOM.notificationMenu) DOM.notificationMenu.classList.remove(MENU_DROPDOWN_OPEN_CLASS);

    const m = DOM.settingsMenu;
    if (!m) return;

    const isCurrentlyOpen = m.classList.contains(MENU_DROPDOWN_OPEN_CLASS);

    if (isCurrentlyOpen) {
        m.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
        setMenuBackdropActive(false);
        DOM.mainAppContainer?.classList.remove('disable-events');
        document.body.classList.remove("disable-events");
    } else {
        anchorDropdownToIcon(m, 'settingsIcon', { mobileTop: 10, mobileRight: 62, desktopTop: 10, desktopRight: 48 });
        m.classList.add(MENU_DROPDOWN_OPEN_CLASS);
        setMenuBackdropActive(true);
        DOM.mainAppContainer?.classList.add('disable-events');
        document.body.classList.add("disable-events");
    }
}

function closeAllMenus() {
    closeSettingsAndNotificationMenus();
    closeColorSelectionMenuFromUI();
    closeCustomPersonSelect();

    closeQuickTransactionOverlay();
    closeMemoryOverlay();

    closeAllocationOverlay();

    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events"); 
}

function showColorSelectionMenu() {
    if (DOM.settingsMenu) DOM.settingsMenu.classList.remove(MENU_DROPDOWN_OPEN_CLASS);

    setMenuBackdropActive(false);

    DOM.mainAppContainer?.classList.remove('disable-events');
    document.body.classList.remove("disable-events");

    const colorMenu = document.getElementById('colorSelectionMenu');
    const colorBubbles = document.getElementById('colorBubbles');

    if (colorMenu && colorBubbles) {
        colorMenu.removeAttribute('style');
        colorBubbles.removeAttribute('style');
        colorMenu.classList.add(COLOR_MENU_OPEN_CLASS);
    }
}

document.addEventListener('click', function(e) {
    const colorMenu = document.getElementById('colorSelectionMenu');
    if (colorMenu && colorMenu.classList.contains(COLOR_MENU_OPEN_CLASS)) {
        if (!e.target.closest('#colorBubbles') && !e.target.closest('[data-action="color-menu"]')) {
            closeColorSelectionMenuFromUI();
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
    if (DOM.settingsMenu) DOM.settingsMenu.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
    closeColorSelectionMenuFromUI();
    closeCustomPersonSelect();

    const menu = DOM.notificationMenu;
    if (!menu) return;

    const isCurrentlyOpen = menu.classList.contains(MENU_DROPDOWN_OPEN_CLASS);

    if (isCurrentlyOpen) {
        menu.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
        setMenuBackdropActive(false);

        DOM.mainAppContainer?.classList.remove('disable-events');
        document.body.classList.remove("disable-events");
    } else {
        anchorDropdownToIcon(menu, 'notificationIcon', { mobileTop: 11, mobileRight: 19, desktopTop: 13, desktopRight: 17 });
        menu.classList.add(MENU_DROPDOWN_OPEN_CLASS);
        setMenuBackdropActive(true);

        DOM.mainAppContainer?.classList.add('disable-events');
        document.body.classList.add("disable-events");
        renderNotificationMenu();
    }
}

document.addEventListener('click', function(e) {
    const settingsBtn = document.getElementById('settingsIcon');
    const notifBtn = document.getElementById('notificationIcon');
    const backdrop = document.getElementById('menuBackdrop');

    const openMenus = document.querySelectorAll('.dropdown-menu.' + MENU_DROPDOWN_OPEN_CLASS);

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
        showNotification(VALIDATION_MSG.enterName, 'error');
        return;
    }
    
    if (allData[name]) {
        showNotification(VALIDATION_MSG.duplicatePerson, 'error');
        return;
    }
    
    isProcessing = true;
    try {
        allData[name] = {
            categories: ['Havale/EFT'],
            categoryBalances: {},
            isFavorite: false
        };

        ['Havale/EFT'].forEach(cat => {
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
    if (sm) sm.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
    openModal('personManagementModal');

    const list = document.getElementById('personManagementList');
    list.innerHTML = '';
    Object.keys(allData).sort().forEach(p => {
        if (p === 'metadata') return;

        const item = document.createElement('div');
        item.className = 'management-list-item';
        item.dataset.person = p;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = p;

        const actions = document.createElement('div');
        actions.className = 'management-actions';

        const favBtn = document.createElement('button');
        favBtn.className = `mgmt-btn ${allData[p].isFavorite ? 'is-fav' : 'not-fav'}`;
        favBtn.textContent = allData[p].isFavorite ? 'Fav' : 'Fav+';
        favBtn.setAttribute('data-person-management-action', 'favorite');

        const editBtn = document.createElement('button');
        editBtn.className = 'mgmt-btn';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('data-person-management-action', 'edit');

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mgmt-btn';
        deleteBtn.textContent = 'Del';
        deleteBtn.setAttribute('data-person-management-action', 'delete');

        actions.appendChild(favBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(nameSpan);
        item.appendChild(actions);
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
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return showNotification(VALIDATION_MSG.enterName, 'error');
    if (trimmed === oldName) return;
    if (allData[trimmed]) {
        showNotification(VALIDATION_MSG.duplicatePerson, 'error');
        return;
    }
    allData[trimmed] = allData[oldName];
    delete allData[oldName];
    queueSave();
    showPersonManagementModal();
    updateMainDisplay();
    showNotification('İsim güncellendi', 'success');
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

function showCategoryManagementModal(opts) {
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) settingsMenu.classList.remove(MENU_DROPDOWN_OPEN_CLASS);
    openModal('categoryManagementModal');
    const sel = document.getElementById('categoryManagementPersonSelect');
    populatePersonSelect(sel);
    const prefer = opts && opts.person;
    if (prefer && allData[prefer] && sel) {
        sel.value = prefer;
        populateCategoryEditor(prefer);
    }
}

function populateCategoryEditor(person) {
    const editor = document.getElementById('categoryEditor');
    const listDiv = document.getElementById('categoryManagementList');
    if (!editor || !listDiv) return;
    if (!person) {
        editor.classList.add('category-editor-hidden');
        editor.classList.remove('category-editor-visible');
        return;
    }

    listDiv.innerHTML = '';
    const categories = allData[person].categories || [];
    categories.forEach(cat => {
        if (cat === 'BEN') return;

        const item = document.createElement('div');
        item.className = 'management-list-item';
        item.dataset.category = cat;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = cat;

        const actions = document.createElement('div');
        actions.className = 'management-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'mgmt-btn';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('data-category-management-action', 'edit');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mgmt-btn';
        deleteBtn.textContent = '';
        deleteBtn.setAttribute('data-category-management-action', 'delete');

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(nameSpan);
        item.appendChild(actions);
        listDiv.appendChild(item);
    });
    editor.classList.remove('category-editor-hidden');
    editor.classList.add('category-editor-visible');
}
function addCategoryFromManager() {
    const person = document.getElementById('categoryManagementPersonSelect').value;
    const categoryName = document.getElementById('newManagedCategoryInput').value.trim();
    if (!person) return showNotification(VALIDATION_MSG.selectPerson, 'error');
    if (!categoryName) return showNotification(VALIDATION_MSG.enterCategoryName, 'error');
    if (allData[person].categories.includes(categoryName)) {
        return showNotification(VALIDATION_MSG.duplicateCategory, 'error');
    }

    allData[person].categories.push(categoryName);
    allData[person].categoryBalances[categoryName] = 0;

    populateCategoryEditor(person);
    document.getElementById('newManagedCategoryInput').value = '';
    showNotification('Kategori eklendi', 'success');
    queueSave();
}

function editCategoryName(person, oldName) {
    const newName = prompt("Yeni kategori ismini giriniz:", oldName);
    
    if (newName === null) return;
    const cleanNewName = newName.trim();
    if (!cleanNewName) return showNotification(VALIDATION_MSG.enterCategoryName, 'error');
    if (cleanNewName === oldName) return;
    
    if (allData[person].categories.includes(cleanNewName)) {
        showNotification(VALIDATION_MSG.duplicateCategory, 'error');
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
        content.innerHTML = renderEmptyState('Henüz bildirim yok.');
        return;
    }
    for (let i = notificationHistory.length - 1; i >= 0; i--) {
        content.appendChild(createNotificationMenuItemElement(notificationHistory[i], i));
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
    const allTransactions = getAllTransactionsForPerson(currentPerson);
    let txs = allTransactions;
    const startVal = DOM.startDate ? DOM.startDate.value : '';
    const endVal = DOM.endDate ? DOM.endDate.value : '';
    const searchText = DOM.reportSearchInput ? DOM.reportSearchInput.value.toLocaleLowerCase('tr-TR') : '';

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

    return { allTransactions, periodTransactions: txs };
}

function renderReportPreview() {
    const listContainer = document.getElementById('reportPreviewList');
    const summaryContainer = document.getElementById('reportPreviewSummary');

    if (!listContainer || !summaryContainer) return;

    const { periodTransactions } = getFilteredTransactions();

    const totalCount = periodTransactions.length;
    let totalAmount = 0;
    periodTransactions.forEach(t => totalAmount += (t.type === 'giden' ? -t.amount : t.amount));

    summaryContainer.innerHTML = renderReportPreviewSummaryHtml(totalCount, totalAmount);

    if (totalCount === 0) {
        listContainer.innerHTML = renderEmptyState('Kriterlere uygun kayıt yok.');
        return;
    }

    const sortedTxs = [...periodTransactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    const MAX_REPORT_ITEMS = 300;
    const displayTxs = sortedTxs.length > MAX_REPORT_ITEMS ? sortedTxs.slice(0, MAX_REPORT_ITEMS) : sortedTxs;

    let html = '';
    displayTxs.forEach(function(t) {
        html += renderReportPreviewItemHtml(t);
    });
    if (sortedTxs.length > MAX_REPORT_ITEMS) {
        html += renderListTruncationNote(
            'İlk ' + MAX_REPORT_ITEMS + ' işlem gösteriliyor (toplam ' + sortedTxs.length + '). Excel ile tümünü indirebilirsiniz.'
        );
    }

    listContainer.innerHTML = html;
}

function showMonthlySummaryModal() {
    const person = currentPerson;
    if (!person) return showNotification(VALIDATION_MSG.selectPerson, 'error');
    
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

function showMemoryOverlay(title, message, icon) {
    document.getElementById('memAlertTitle').textContent = title;
    const safeMsg = String(message).split(/<br\s*\/?>/i).map(function (s) { return sanitizeHTML(s); }).join('<br>');
    document.getElementById('memAlertMessage').innerHTML = safeMsg;
    if (DOM.memAlertIcon) DOM.memAlertIcon.textContent = icon;

    const overlay = document.getElementById('customMemoryOverlay');
    delete overlay.dataset.memoryYesPhase;
    overlay.classList.remove('error-state');
    setTimeout(function() { overlay.classList.add('show'); }, 10);

    DOM.mainAppContainer?.classList.add('disable-events');
    document.body.classList.add("disable-events");
}

function closeMemoryOverlay() {
    const overlay = document.getElementById('customMemoryOverlay');
    overlay.classList.remove('show');
    overlay.classList.remove('error-state');
    delete overlay.dataset.memoryYesPhase;

    const yesBtn = overlay.querySelector('.btn-yes');
    if (yesBtn) {
        yesBtn.textContent = 'EVET';
        yesBtn.disabled = false;
        yesBtn.classList.remove('u-hidden');
    }
    const noBtn = overlay.querySelector('.btn-no');
    if (noBtn) {
        noBtn.disabled = false;
        noBtn.classList.remove('u-hidden');
    }

    setTimeout(function() {
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
    if (yesBtn) {
        yesBtn.textContent = "EVET";
        yesBtn.classList.remove('u-hidden');
    }
    const noBtn = document.querySelector('#customMemoryOverlay .btn-no');
    if (noBtn) noBtn.classList.remove('u-hidden');
} 

const BACKUP_TIMEOUT_MS = 5000;

async function attemptBackupAndClear() {
    const yesBtn = document.querySelector('#customMemoryOverlay .btn-yes');
    const noBtn = document.querySelector('#customMemoryOverlay .btn-no');
    
    if(yesBtn) {
        yesBtn.disabled = true;
        yesBtn.textContent = "Yedekleniyor...";
    }
    if(noBtn) noBtn.disabled = true;
    
    const alertTitle = document.getElementById('memAlertTitle');
    const alertMessage = document.getElementById('memAlertMessage');
    
    alertTitle.textContent = "Yedekleme İşlemi";
    alertMessage.innerHTML = "Sunucuya veri yedekleniyor, lütfen bekleyin...";

    function showBackupFailedAndOfferClear() {
        const overlay = document.getElementById('customMemoryOverlay');
        if (overlay) {
            overlay.classList.add('error-state');
            overlay.dataset.memoryYesPhase = 'finalize';
        }
        if (alertTitle) alertTitle.textContent = "⚠️ YEDEKLEME BAŞARISIZ!";
        if (alertMessage) alertMessage.innerHTML = 'Sunucuya Yedeklenemedi.<br>Devam Etmek İstediğinize Emin misiniz?';
        if (yesBtn) {
            yesBtn.disabled = false;
            yesBtn.textContent = "EVET, SİL";
        }
        if (noBtn) noBtn.disabled = false;
    }

    try {
        const data = await advancedStorage.getItem('sahsiHesapTakibiData');

        if (data) {
            const parsedData = JSON.parse(data);
            const savePromise = saveDataToServer(parsedData, true).catch(async (err) => {
                if (String(err && err.message || '').includes('HTTP 403')) {
                    return saveDataToServer(parsedData, false);
                }
                throw err;
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Yedekleme zaman aşımı')), BACKUP_TIMEOUT_MS)
            );
            await Promise.race([savePromise, timeoutPromise]);
            
            alertTitle.textContent = "Yedekleme Başarılı ✅";
            alertMessage.innerHTML = "Sunucuya kaydedildi. Şimdi bellek temizlenecek...";
            if(yesBtn) yesBtn.textContent = "TEMİZLENİYOR...";
            if(noBtn) noBtn.classList.add('u-hidden');
            setTimeout(() => finalizeClear(), 800);
            
        } else {
            alertTitle.textContent = "Yedekleme Gerekmiyor";
            alertMessage.innerHTML = "Yerel veri bulunamadı. Bellek temizleniyor...";
            if(yesBtn) yesBtn.textContent = "TEMİZLENİYOR...";
            if(noBtn) noBtn.classList.add('u-hidden');
            setTimeout(() => finalizeClear(), 600);
        }
        
    } catch (e) {
        console.error("Yedekleme hatası:", e);
        showBackupFailedAndOfferClear();
    }
}

async function finalizeClear() {
    const overlay = document.getElementById('customMemoryOverlay');
    const btn = overlay?.querySelector('.btn-yes');
    const noBtn = overlay?.querySelector('.btn-no');
    if (btn) btn.innerText = 'TEMİZLENİYOR...';
    if (noBtn) noBtn.classList.add('u-hidden');

    const alertTitle = document.getElementById('memAlertTitle');
    const alertMessage = document.getElementById('memAlertMessage');

    await advancedStorage.removeItem('sahsiHesapTakibiData');
    await advancedStorage.removeItem('sahsiHesapTakibiNotifications');
    localStorage.removeItem('sahsiHesapTakibiData');
    localStorage.removeItem('sahsiHesapTakibiNotifications');
    try {
        await clearQueuedServerSyncPayloads();
    } catch (error) {
        console.error('Sync queue clear failed:', error);
    }

    if (alertTitle) alertTitle.textContent = '✅ BAŞARILI';
    if (alertMessage) alertMessage.innerHTML = 'Bellek temizlendi. Sayfa yenileniyor...';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(reg => reg.unregister());
        }).catch(() => {});
    }
    if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
    }

    setTimeout(() => {
        window.location.href = window.location.pathname || '/';
    }, 400);
}

let deferredPrompt;
let pwaInstallBannerDismissed = false;

function hasCustomPWAInstallUI() {
    return !!(document.getElementById('pwaInstallBanner') && document.getElementById('pwaInstallBtn'));
}

window.addEventListener('beforeinstallprompt', (e) => {
    // Only intercept default browser prompt when custom install UI is available.
    if (!hasCustomPWAInstallUI()) return;

    e.preventDefault();
    deferredPrompt = e;

    const dismissed = localStorage.getItem('pwaInstallDismissed');
    if (!dismissed && !pwaInstallBannerDismissed) {
        showPWAInstallBanner();
    }
});

function showPWAInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (!banner) return;

    banner.classList.remove('u-hidden');
}

function hidePWAInstallBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            banner.classList.add('u-hidden');
            banner.style.animation = '';
        }, 300);
    }
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
    APP_DEBUG && console.log('PWA successfully installed');
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
            APP_DEBUG && console.log('Background sync registered');
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
            APP_DEBUG && console.log('Manual sync: processing', syncQueue.length, 'items');

            for (const item of syncQueue) {
                try {
                    const response = await fetchWithTimeout(item.url, {
                        method: item.method,
                        headers: item.headers,
                        body: item.body
                    }, 45000);

                    if (response.ok) {
                        await removeSyncQueueItem(db, item.id);
                        APP_DEBUG && console.log('Synced item:', item.id);
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
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('data')) db.createObjectStore('data');
            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
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
            APP_DEBUG && console.log('Background sync completed:', event.data.syncedCount, 'items');
            await showNotification(`${event.data.syncedCount} değişiklik senkronize edildi`, 'success');
            // Reload data to show synced changes
            const loadResult = await loadData();
            updateMainDisplay();
            registerQuickOverlayDeferredListeners();
            if (loadResult && loadResult.ok && loadResult.hasPeopleData) {
                checkSiriParams();
            }
        }
    });
}

/* --- Uygulama başlatma akışı ---
 * DOMContentLoaded (bootstrapDomContentLoaded): safe area, ios-pwa, klavye, modal swipe,
 * isim düzeltme + MutationObserver, mobil tarih.
 * window load: initDOMCache, bind*, tema, loadData tamamlanınca migrate/updateMainDisplay/setCurrentDate,
 * ardından hızlı tutar-kategori dinleyicileri ve Siri URL (allData hazır).
 */
function initApp() {
    const root = document.documentElement;
    root.style.setProperty("--sa-top", "env(safe-area-inset-top)");
    root.style.setProperty("--sa-bot", "env(safe-area-inset-bottom)");
    root.style.setProperty("--sa-left", "env(safe-area-inset-left)");
    root.style.setProperty("--sa-right", "env(safe-area-inset-right)");
    root.style.setProperty("--safe-area-top", "env(safe-area-inset-top)");

    if (typeof applyIosPwaClass === 'function') {
        applyIosPwaClass();
    } else if (typeof isIosStandalonePwa === 'function' && isIosStandalonePwa()) {
        root.classList.add('ios-pwa');
        document.body?.classList.add('ios-pwa');
    }
}

function registerQuickOverlayDeferredListeners() {
    if (quickOverlayAmountListenersRegistered) return;
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
            const person = quickPersonSelectedValue;
            const debtCount = person ? getDebtorCategoriesForPerson(person).length : 0;

            if (type === 'gelen' && amount > 0 && debtCount > 1) {
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
    quickOverlayAmountListenersRegistered = true;
}

function bootstrapDomContentLoaded() {
    initApp();
    initPersonSelectKeyboardNav();
    initModalSwipe();
    initDisplayNamesAndObserver();
    initMobileDateDisplay();
}

document.addEventListener('DOMContentLoaded', bootstrapDomContentLoaded);
const closeMenuOutside = (event) => {
    if (!event.target.closest('.notification-icon-btn')) {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        let hasOpenMenu = false;
        dropdowns.forEach(openDropdown => {
            if (openDropdown.classList.contains(MENU_DROPDOWN_OPEN_CLASS) && !openDropdown.contains(event.target)) {
                hasOpenMenu = true;
            }
        });
        if (hasOpenMenu) {
            closeAllMenus();
        }
    }
};

document.addEventListener('touchstart', (event) => {
    const hasOpenMenu = document.querySelector('.dropdown-menu.' + MENU_DROPDOWN_OPEN_CLASS);
    if (hasOpenMenu && !event.target.closest('.dropdown-menu') && !event.target.closest('.notification-icon-btn')) {
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
    html += '<div class="report-header"><span>Borçlar</span></div>';
    html += '<div class="report-list">';
    creditors.forEach(c => {
        html += `<div class="report-item">
            <span class="report-name">${sanitizeHTML(c.name)}</span>
            <span class="report-val val-red">${formatAmount(c.amount)}</span>
        </div>`;
    });
    if(creditors.length === 0) html += renderEmptyState('Borç yok');
    html += '</div>'; 
    html += '</div>'; 

    html += '<div class="report-col right-col">';
    html += '<div class="report-header"><span>Alacaklar</span></div>';
    html += '<div class="report-list">';
    debtors.forEach(d => {
        html += `<div class="report-item">
            <span class="report-name">${sanitizeHTML(d.name)}</span>
            <span class="report-val val-green">${formatAmount(d.amount)}</span>
        </div>`;
    });
    if(debtors.length === 0) html += renderEmptyState('Alacak yok');
    html += '</div>'; 
    html += '</div>'; 
    
    html += '</div>';

    const netBalance = totalCredit - totalDebt;
    let netColorClass = '';
    let resultText = '';
    
    if (netBalance > 0.01) {
        netColorClass = 'val-green'; 
        resultText = 'Net Alacağınız';
    } else if (netBalance < -0.01) {
        netColorClass = 'val-red'; 
        resultText = 'Net Borcunuz';
    } else {
        netColorClass = 'val-neutral';
        resultText = 'Net Durum';
    }
    
    const resultAmount = formatAmount(Math.abs(netBalance));

    let statusHtml = `
    <div class="new-summary-container">
        <div class="summary-top-row">
            <div class="summary-box-item">
                <span class="summary-label">Toplam Borcunuz</span>
                <span class="summary-val val-red">${formatAmount(totalDebt)}</span>
            </div>
            
            <div class="summary-box-item">
                <span class="summary-label">Toplam Alacağınız</span>
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
    closeCustomPersonSelect();

    const quickOverlayContainer = document.getElementById('quickOverlayContainer'); 
    if (quickOverlayContainer) quickOverlayContainer.classList.remove('u-hidden');
    
    document.body.classList.add('quick-overlay-open');
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
    if (quickOverlayContainer) quickOverlayContainer.classList.add('u-hidden');
    
    document.body.classList.remove('quick-overlay-open');
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
        div.setAttribute('data-quick-person', encodeURIComponent(person));
        div.textContent = person;
        list.appendChild(div);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'person-item quick-person-item quick-add-person-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Yeni Kişi Ekle';
    list.appendChild(addBtn);
}

function filterQuickPersonList() {
    const filter = document.getElementById('quickSearchInput').value.toLocaleUpperCase('tr-TR');
    const items = document.querySelectorAll('.person-item');
    
    items.forEach(item => {
        if (item.classList.contains('quick-add-person-btn')) return;
        const txt = item.textContent || item.innerText;
        if (txt.toLocaleUpperCase('tr-TR').indexOf(filter) > -1) {
            item.classList.remove('u-hidden');
        } else {
            item.classList.add('u-hidden');
        }
    });
}

function selectQuickPersonFromOverlay(person) {
    quickPersonSelectedValue = person;
    currentPerson = person;
    
    document.querySelector('.quick-panel-content').classList.add('filled-mode');
    
    document.querySelector('.quick-search-wrapper')?.classList.add('u-hidden');
    document.getElementById('quickPersonList')?.classList.add('u-hidden');
    
    document.getElementById('quickTransactionForm').classList.remove('u-hidden');
    document.getElementById('selectedPersonNameDisplay').textContent = person;
    
    populateCategorySelect(document.getElementById('quickCategory'), person);
    document.getElementById('quickAmount').value = '';
    document.getElementById('quickDescription').value = '';
    setQuickTransactionType('');
}

function resetQuickPanel() {
    quickPersonSelectedValue = null;
    currentPerson = null;
    
    document.querySelector('.quick-panel-content').classList.remove('filled-mode');
    
    document.getElementById('quickTransactionForm').classList.add('u-hidden');
    
    document.querySelector('.quick-search-wrapper')?.classList.remove('u-hidden');
    document.getElementById('quickPersonList')?.classList.remove('u-hidden');
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
        if (type === 'gelen') {
            applySingleDebtDefaultCategory(document.getElementById('quickCategory'), quickPersonSelectedValue);
        }
    }
}

function checkQuickAllocation() {
    const type = document.getElementById('quickTransactionType')?.value;
    const person = quickPersonSelectedValue;
    const amount = deformatCurrency(document.getElementById('quickAmount')?.value || '0');

    if (type !== 'gelen' || !person || !isValidPositiveAmount(amount)) return;
    if (!allData[person]) return;

    const debts = getDebtorCategoriesForPerson(person);
    if (debts.length > 0) {
        const quickCategorySelect = document.getElementById('quickCategory');
        applySingleDebtDefaultCategory(quickCategorySelect, person);
        const desc = document.getElementById('quickDescription')?.value?.trim() || '';
        quickAllocationCategory = quickCategorySelect?.value || '';

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


async function processQuickTransaction() {
    if(isProcessing) return; 
    
    const person = quickPersonSelectedValue;
    const amount = deformatCurrency(document.getElementById('quickAmount').value);
    let category = document.getElementById('quickCategory').value;
    const type = document.getElementById('quickTransactionType').value;

    if (!person) return showNotification(VALIDATION_MSG.selectPerson, 'error');
    if (!allData[person]) return showNotification(VALIDATION_MSG.selectPerson, 'error');
    if (!isValidPositiveAmount(amount)) return showNotification(VALIDATION_MSG.validAmount, 'error');
    if (!type) return showNotification(VALIDATION_MSG.selectTransType, 'error');

    let desc = document.getElementById('quickDescription').value.trim();
    desc = formatTitleCase(desc); 

    if (type === 'gelen' && allData[person]) {
        const debts = getDebtorCategoriesForPerson(person);
        if (debts.length > 0) {
            const quickCategorySelect = document.getElementById('quickCategory');
            applySingleDebtDefaultCategory(quickCategorySelect, person);
            category = quickCategorySelect?.value || category;
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

    if (!category) return showNotification(VALIDATION_MSG.selectCategory, 'error');
 
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
        if(btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
    }
}

function showSyncHelp() {
    openModal('syncHelpModal');
}

let activeContextMenu = null;

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
        if (modalBody) {
            const modalBodyRect = modalBody.getBoundingClientRect();
            menu.classList.add('three-dot-menu--ctx-abs');
            menu.style.setProperty('--ctx-menu-top', (rect.top - modalBodyRect.top + modalBody.scrollTop) + 'px');
            modalBody.appendChild(menu);
        } else {
            menu.classList.add('three-dot-menu--ctx-fixed');
            menu.style.setProperty('--ctx-menu-top', rect.top + 'px');
            document.body.appendChild(menu);
        }
    } else {
        menu.classList.add('three-dot-menu--ctx-fixed');
        menu.style.setProperty('--ctx-menu-top', rect.top + 'px');
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

let typingBuffer = '';
let typingTimeout = null;

function initPersonSelectKeyboardNav() {
    const personTrigger = document.getElementById('personSelectTrigger');
    if (!personTrigger) return;
    
    personTrigger.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCustomPersonSelect();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            openCustomPersonSelect();
            return;
        }
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
            syncCustomPersonSelectUI();
            openCustomPersonSelect();
            if (DOM.personSelectSearch) {
                DOM.personSelectSearch.value = options[i].value;
                renderCustomPersonSelectOptions(options[i].value);
            }

            if (DOM.personSelectTrigger) {
                DOM.personSelectTrigger.classList.add('person-select-trigger--match');
                setTimeout(function() {
                    if (DOM.personSelectTrigger) DOM.personSelectTrigger.classList.remove('person-select-trigger--match');
                }, 300);
            }
            
            return;
        }
    }
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
    if (!modalContent || modalContent.dataset.modalSwipeBound === '1') return;
    modalContent.dataset.modalSwipeBound = '1';

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
        const activeTab = document.querySelector('#personModal .tab-content.' + TAB_CONTENT_VISIBLE_CLASS);
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
            const newTabBtn = document.querySelector(`#personModal .tab-btn[data-tab="${newTabId}"]`);
            if (newTabBtn) {
                openTab(null, newTabId, newTabBtn);
            }
        }
    }
}

function updateVersionDisplay() {
    const versionElement = document.querySelector('.version');
    if (!versionElement) return;

    const currentVersion = FOOTER_VERSION;
    
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

    versionElement.textContent = 'v' + currentVersion + suffix;
}

function initDisplayNamesAndObserver() {
    function applyFullName(el) {
        try {
            if (!el) return;
            el.classList.add('display-name-el');
            var full = el.getAttribute('data-fullname') || el.getAttribute('data-name') || el.title || el.textContent || el.innerText || '';
            if (full && full.length > 1) {
                el.textContent = full;
            }
        } catch (e) {
            if (console && console.warn) console.warn('applyFullName error', e);
        }
    }

    function refreshDisplayNameElements() {
        var items = document.querySelectorAll('.q-name, .quick-item .q-name, .user-name, .display-name');
        items.forEach(function(el) {
            applyFullName(el);
            if (el && (!el.title || el.title.length < 2)) {
                el.title = el.getAttribute('data-fullname') || el.textContent || el.innerText || el.title;
            }
        });
    }

    setTimeout(refreshDisplayNameElements, 50);

    var observerTimeout = null;
    var obs = new MutationObserver(function(mutations) {
        if (observerTimeout) clearTimeout(observerTimeout);
        observerTimeout = setTimeout(function() {
            mutations.forEach(function(m) {
                if (m.addedNodes && m.addedNodes.length) {
                    m.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            if (node.matches && (node.matches('.q-name') || node.querySelector('.q-name'))) {
                                var el = node.matches('.q-name') ? node : node.querySelector('.q-name');
                                applyFullName(el);
                            } else {
                                var inner = node.querySelectorAll && node.querySelectorAll('.q-name');
                                if (inner) inner.forEach(function(el) { applyFullName(el); });
                            }
                        }
                    });
                }
                if (m.type === 'attributes' && m.target && (m.target.classList && m.target.classList.contains('q-name'))) {
                    applyFullName(m.target);
                }
            });
        }, 50);
    });

    var quickGrid = document.getElementById('quickAccessGrid');
    if (quickGrid) {
        obs.observe(quickGrid, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-name', 'data-fullname', 'title']
        });
    }
}

function initMobileDateDisplay() {
    var isNarrow = window.innerWidth <= 800;

    if (isNarrow) {
        const dateInput = document.getElementById('dateInput');
        const dateDisplay = getNewTransactionMobileDateDisplayEl();

        if (dateInput && dateDisplay) {
            function updateMainDateDisplay() {
                syncMobileTrDateDisplay(dateInput, dateDisplay, 'today');
            }

            updateMainDateDisplay();
            dateInput.addEventListener('change', updateMainDateDisplay);

            const dateRow = dateInput.closest('.date-row-transparent');
            if (dateRow) {
                dateRow.addEventListener('click', function(e) {
                    if (e.target !== dateInput) {
                        openNativeDatePicker(dateInput, null);
                    }
                });
            }
        }

        const editDateInput = document.getElementById('editDateInput');
        const editDateDisplay = document.getElementById('editMobileDateDisplay');

        if (editDateInput && editDateDisplay) {
            function updateEditDateDisplay() {
                syncMobileTrDateDisplay(editDateInput, editDateDisplay, 'skip');
            }

            editDateInput.addEventListener('change', updateEditDateDisplay);

            const editDateSection = editDateInput.closest('.date-section-inline');
            if (editDateSection) {
                editDateSection.addEventListener('click', function(e) {
                    if (e.target !== editDateInput && !e.target.matches('label')) {
                        openNativeDatePicker(editDateInput, null);
                    }
                });
            }
        }
    }

    /* Rapor tarihleri: her viewport'ta; takvim SADECE span veya label tıklanınca açılsın (grup listener yok) */
    const startDateInput = document.getElementById('startDate');
    const startDateDisplay = document.getElementById('startDateDisplay');
    const endDateInput = document.getElementById('endDate');
    const endDateDisplay = document.getElementById('endDateDisplay');

    function wireReportDateInputAndPicker(inputEl, displayEl, labelForAttr) {
        if (!inputEl || !displayEl) return;
        function onChange() {
            syncMobileTrDateDisplay(inputEl, displayEl, 'skip');
        }
        inputEl.addEventListener('change', onChange);
        function onOpen(e) {
            openNativeDatePicker(inputEl, e);
        }
        displayEl.addEventListener('click', onOpen);
        var lab = document.querySelector('label[for="' + labelForAttr + '"]');
        if (lab) lab.addEventListener('click', onOpen);
    }

    wireReportDateInputAndPicker(startDateInput, startDateDisplay, 'startDate');
    wireReportDateInputAndPicker(endDateInput, endDateDisplay, 'endDate');
}

function updateAllMobileDateDisplays() {
    if (window.innerWidth > 800) return;

    syncMobileTrDateDisplay(document.getElementById('dateInput'), getNewTransactionMobileDateDisplayEl(), 'skip');
    syncMobileTrDateDisplay(document.getElementById('editDateInput'), document.getElementById('editMobileDateDisplay'), 'skip');
    syncMobileTrDateDisplay(document.getElementById('startDate'), document.getElementById('startDateDisplay'), 'skip');
    syncMobileTrDateDisplay(document.getElementById('endDate'), document.getElementById('endDateDisplay'), 'skip');
}

function checkSiriParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('siri') === '1') {
        const person = params.get('person') || '';
        const amount = params.get('amount') || '';
        const type = params.get('type') || 'gelen';
        const desc = params.get('desc') || '';
        
        window.history.replaceState({}, document.title, window.location.pathname);

        queueMicrotask(function() {
            showSiriConfirmModal(person, amount, type, desc);
        });
    }
}

function showSiriConfirmModal(person, amount, type, desc) {
    const matchedPerson = findMatchingPerson(person);
    document.body.insertAdjacentHTML('beforeend', buildSiriConfirmModalHtml(person, amount, type, desc, matchedPerson));

    const root = document.getElementById('siriConfirmModal');
    if (!root) return;

    const amountNum = parseFloat(amount) || 0;
    bindSiriConfirmModal(root, matchedPerson, amountNum, type, desc);
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
        showNotification(VALIDATION_MSG.selectPerson, 'error');
        return;
    }
    
    if (!isValidPositiveAmount(amount)) {
        showNotification(VALIDATION_MSG.validAmount, 'error');
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




