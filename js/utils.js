/**
 * Şahsi Cari – XSS/render yardımcıları (app.js tarafından kullanılır).
 * Kullanıcı/veri katmanından gelen metin innerHTML veya attribute'a yazılmadan önce
 * sanitizeHTML (HTML) veya safeAttr (attribute) ile kaçışlanmalı; sadece metin için setText.
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

    function setText(el, text) {
        if (el) el.textContent = text == null ? '' : String(text);
    }

    function clearElement(el) {
        if (!el) return;
        while (el.firstChild) el.removeChild(el.firstChild);
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

    global.sanitizeHTML = sanitizeHTML;
    global.safeAttr = safeAttr;
    global.setText = setText;
    global.clearElement = clearElement;
    global.renderEmptyState = renderEmptyState;
    global.formatDateTR = formatDateTR;
    global.getLocalTimeISO = getLocalTimeISO;
    global.formatTitleCase = formatTitleCase;
    global.debounce = debounce;
    global.deformatCurrency = deformatCurrency;
    global.formatNumber = formatNumber;
    global.formatAmount = formatAmount;
})(typeof window !== 'undefined' ? window : this);
