/**
 * Şahsi Cari – XSS/render yardımcıları (app.js tarafından kullanılır).
 * Kullanıcı/veri katmanından gelen metin innerHTML veya attribute'a yazılmadan önce
 * sanitizeHTML (HTML) veya safeAttr (attribute) ile kaçışlanmalı.
 */
(function (global) {
    'use strict';

    function sanitizeHTML(str) {
        if (str === null || str === undefined) return '';
        const strValue = String(str);
        return strValue
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function renderEmptyState(message) {
        return '<div class="empty-state">' + sanitizeHTML(message) + '</div>';
    }

    function formatDateTR(dateObj) {
        if (!dateObj) return '';
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        return d + '.' + m + '.' + y;
    }

    function getLocalTimeISO() {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        return d.toISOString();
    }

    function formatTitleCase(str) {
        if (!str) return '';
        return str.toLocaleLowerCase('tr-TR').split(' ').map(function (word) {
            return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1);
        }).join(' ');
    }

    function debounce(fn, delay) {
        delay = delay === undefined ? 180 : delay;
        var timeoutId = null;
        return function () {
            var context = this;
            var args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function () { fn.apply(context, args); }, delay);
        };
    }

    function deformatCurrency(value) {
        if (value === null || value === undefined) return 0;
        var stringValue = String(value);
        if (stringValue.trim() === '') return 0;
        var cleanValue = stringValue.replace(/₺|\s|\./g, '').replace(',', '.');
        var number = parseFloat(cleanValue);
        return isNaN(number) ? 0 : number;
    }

    function formatNumber(num) {
        var number = parseFloat(num);
        if (isNaN(number)) return '0,00';
        return number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatAmount(amount) {
        return '₺' + formatNumber(amount);
    }

    /** Input alanına TR para formatı uygular (binlik ayırıcı, virgül). input.value güncellenir. */
    function formatCurrency(input) {
        if (!input) return;
        var value = input.value;
        if (value === '' || value === undefined || value === null) return;
        var cleanValue = String(value).replace(/[^\d,]/g, '');
        var parts = cleanValue.split(',');
        var integerPart = parts[0].replace(/\D/g, '');
        var decimalPart = parts.length > 1 ? parts[1] : undefined;
        if (integerPart === '') integerPart = '0';
        var formattedInteger = new Intl.NumberFormat('tr-TR').format(parseInt(integerPart, 10) || 0);
        var newValue = formattedInteger;
        if (decimalPart !== undefined) {
            newValue += ',' + decimalPart.substring(0, 2);
        } else if (String(value).includes(',')) {
            newValue += ',';
        }
        input.value = newValue;
    }

    /**
     * Kategori kartı HTML (bakiye, durum). onclick için kategori adı JS string olarak kaçışlanır.
     * Beklenen global: showCategoryDetails(categoryName)
     */
    function renderCategoryItem(categoryName, balance, status) {
        var b = Number(balance) || 0;
        var color = b > 0 ? '#d40000' : (b < 0 ? '#81c784' : '#ffd54f');
        var balanceClass = b > 0 ? 'positive-balance' : 'negative-balance';
        var safeForOnclick = String(categoryName).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return '<div class="category-item ' + balanceClass + '" onclick="showCategoryDetails(\'' + safeForOnclick + '\')">' +
            '<div class="category-item-name-row"><span class="category-name">' + sanitizeHTML(categoryName) + '</span></div>' +
            '<span class="category-balance" style="color:' + color + '">' + formatAmount(Math.abs(b)) + '</span>' +
            '<span>' + sanitizeHTML(status) + '</span></div>';
    }

    /**
     * İşlem geçmişi tek satırı (type, date, amount, category, description, edit/delete id ile).
     * t: { id, type, date, amount, category, description }
     */
    function renderTransactionHistoryItem(t) {
        var typeTxt = t.type === 'giden' ? 'Giden' : 'Gelen';
        var typeClass = t.type === 'giden' ? 'giden' : 'gelen';
        var dateStr = formatDateTR(new Date(t.date));
        var desc = t.description || '';
        var id = Number(t.id) || 0;
        return '<div class="history-item" data-tx-id="' + id + '">' +
            '<div class="history-left">' +
            '<div class="history-top-row">' +
            '<span class="history-type ' + typeClass + '">' + typeTxt + '</span>' +
            '<span class="history-date">' + dateStr + '</span>' +
            '<span class="history-amount ' + (t.type === 'giden' ? 'text-expense' : 'text-income') + '">' + formatAmount(t.amount) + '</span>' +
            '</div>' +
            '<div class="history-meta">' +
            '<span class="history-category">' + sanitizeHTML(t.category) + '</span>' + (desc ? ' - ' + sanitizeHTML(desc) : '') +
            '</div></div>' +
            '<div class="history-right">' +
            '<button class="edit-transaction-btn" onclick="editTransaction(' + id + ')">✏️</button>' +
            '<button class="delete-transaction-btn" onclick="deleteTransaction(' + id + ')">✖</button>' +
            '</div></div>';
    }

    /** Excel kütüphanelerini yalnızca export anında yükler (ilk açılışta ~415 KB tasarruf). */
    var excelLibsPromise = null;
    function ensureExcelLibs() {
        if (typeof global.XLSX !== 'undefined') {
            return Promise.resolve(global.XLSX);
        }
        if (excelLibsPromise) return excelLibsPromise;

        function loadScript(src) {
            return new Promise(function (resolve, reject) {
                var existing = document.querySelector('script[data-excel-lib="' + src + '"]');
                if (existing) {
                    if (existing.getAttribute('data-loaded') === '1') {
                        resolve();
                        return;
                    }
                    existing.addEventListener('load', function () { resolve(); });
                    existing.addEventListener('error', function () { reject(new Error('Failed: ' + src)); });
                    return;
                }
                var s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.setAttribute('data-excel-lib', src);
                s.onload = function () {
                    s.setAttribute('data-loaded', '1');
                    resolve();
                };
                s.onerror = function () { reject(new Error('Failed to load ' + src)); };
                document.head.appendChild(s);
            });
        }

        excelLibsPromise = loadScript('js/FileSaver.min.js')
            .then(function () { return loadScript('js/xlsx.bundle.min.js'); })
            .then(function () {
                if (typeof global.XLSX === 'undefined') {
                    throw new Error('XLSX yüklenemedi');
                }
                return global.XLSX;
            })
            .catch(function (err) {
                excelLibsPromise = null;
                throw err;
            });
        return excelLibsPromise;
    }

    global.sanitizeHTML = sanitizeHTML;
    global.safeAttr = safeAttr;
    global.renderEmptyState = renderEmptyState;
    global.formatDateTR = formatDateTR;
    global.getLocalTimeISO = getLocalTimeISO;
    global.formatTitleCase = formatTitleCase;
    global.debounce = debounce;
    global.deformatCurrency = deformatCurrency;
    global.formatNumber = formatNumber;
    global.formatAmount = formatAmount;
    global.formatCurrency = formatCurrency;
    global.renderCategoryItem = renderCategoryItem;
    global.renderTransactionHistoryItem = renderTransactionHistoryItem;
    global.ensureExcelLibs = ensureExcelLibs;

    function isIosDevice() {
        var ua = navigator.userAgent || navigator.vendor || window.opera || '';
        return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    }

    function isStandalonePwa() {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    }

    function isIosStandalonePwa() {
        return isIosDevice() && isStandalonePwa();
    }

    function applyIosPwaClass() {
        if (!isIosStandalonePwa()) return;
        document.documentElement.classList.add('ios-pwa');
        if (document.body) document.body.classList.add('ios-pwa');
    }

    global.isIosDevice = isIosDevice;
    global.isStandalonePwa = isStandalonePwa;
    global.isIosStandalonePwa = isIosStandalonePwa;
    global.applyIosPwaClass = applyIosPwaClass;
})(typeof window !== 'undefined' ? window : this);
