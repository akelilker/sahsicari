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

    global.sanitizeHTML = sanitizeHTML;
    global.safeAttr = safeAttr;
    global.setText = setText;
    global.clearElement = clearElement;
    global.renderEmptyState = renderEmptyState;
})(typeof window !== 'undefined' ? window : this);
