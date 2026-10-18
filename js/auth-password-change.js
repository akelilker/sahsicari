(function (global) {
    var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';

    function byId(id) {
        return document.getElementById(id);
    }

    function passwordScore(value) {
        var score = 0;
        if (value.length >= 10) score++;
        if (value.length >= 14) score++;
        if (/[a-zçğıöşü]/.test(value) && /[A-ZÇĞİÖŞÜ]/.test(value)) score++;
        if (/\d/.test(value)) score++;
        if (/[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(value)) score++;
        return value.length < 10 ? Math.min(score, 1) : score;
    }

    function setMessage(text, isError) {
        var el = byId('authChangeMessage');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('is-error', !!isError);
    }

    function updateStrength() {
        var bar = byId('authChangeStrength');
        if (!bar) return;
        var value = byId('authChangePassword').value;
        var score = passwordScore(value);
        var colors = ['#d40000', '#d40000', '#f5a623', '#f5a623', '#00e676', '#00e676'];
        bar.style.width = value ? Math.max(12, score * 20) + '%' : '0';
        bar.style.background = colors[score];
    }

    function bindEyeButtons(root) {
        root.querySelectorAll('.auth-gate__eye').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = byId(btn.getAttribute('data-target'));
                if (!input) return;
                var reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                btn.innerHTML = reveal ? EYE_OFF : EYE;
                btn.setAttribute('aria-label', reveal ? 'Parolayı gizle' : 'Parolayı göster');
            });
        });
    }

    function ensureDom() {
        if (byId('authPasswordChange')) return;
        var wrap = document.createElement('div');
        wrap.id = 'authPasswordChange';
        wrap.className = 'auth-gate';
        wrap.hidden = true;
        wrap.setAttribute('data-mode', 'change');
        wrap.innerHTML = ''
            + '<form id="authPasswordChangeForm" class="auth-gate__card" novalidate>'
            + '<div class="auth-gate__head"><h2 id="authChangeTitle">Parola Değiştir</h2></div>'
            + '<div class="auth-gate__body">'
            + '<p id="authChangeMessage" aria-live="polite"></p>'
            + '<label class="sr-only" for="authChangeCurrent">Mevcut parola</label>'
            + '<div class="auth-gate__field"><input id="authChangeCurrent" type="password" placeholder="Mevcut parola" autocomplete="current-password" required>'
            + '<button type="button" class="auth-gate__eye" aria-label="Parolayı göster" data-target="authChangeCurrent">' + EYE + '</button></div>'
            + '<label class="sr-only" for="authChangePassword">Yeni parola</label>'
            + '<div class="auth-gate__field"><input id="authChangePassword" type="password" placeholder="Yeni parola" autocomplete="new-password" required>'
            + '<button type="button" class="auth-gate__eye" aria-label="Parolayı göster" data-target="authChangePassword">' + EYE + '</button></div>'
            + '<div class="auth-gate__strength" aria-hidden="true"><span id="authChangeStrength"></span></div>'
            + '<label class="sr-only" for="authChangeConfirm">Yeni parola tekrar</label>'
            + '<div class="auth-gate__field"><input id="authChangeConfirm" type="password" placeholder="Yeni parola tekrar" autocomplete="new-password" required>'
            + '<button type="button" class="auth-gate__eye" aria-label="Parolayı göster" data-target="authChangeConfirm">' + EYE + '</button></div>'
            + '<button type="submit" id="authChangeSubmit" class="auth-gate__submit">Kaydet</button>'
            + '</div></form>';
        document.body.appendChild(wrap);
        bindEyeButtons(wrap);
        byId('authChangePassword').addEventListener('input', updateStrength);
        byId('authPasswordChangeForm').addEventListener('submit', onSubmit);
        wrap.addEventListener('click', function (e) {
            if (e.target === wrap) hide();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && wrap && !wrap.hidden) hide();
        });
    }

    function resetForm() {
        byId('authChangeCurrent').value = '';
        byId('authChangePassword').value = '';
        byId('authChangeConfirm').value = '';
        updateStrength();
        setMessage('');
    }

    function hide() {
        var gate = byId('authPasswordChange');
        if (gate) gate.hidden = true;
        resetForm();
    }

    function open() {
        ensureDom();
        resetForm();
        var gate = byId('authPasswordChange');
        gate.hidden = false;
        byId('authChangeCurrent').focus();
    }

    async function onSubmit(event) {
        event.preventDefault();
        var current = byId('authChangeCurrent').value;
        var password = byId('authChangePassword').value;
        var confirm = byId('authChangeConfirm').value;
        var button = byId('authChangeSubmit');

        if (!current) {
            setMessage('Mevcut parola gerekli', true);
            return;
        }
        if (password.length < 10) {
            setMessage('Parola en az 10 karakter olmalı', true);
            return;
        }
        if (password !== confirm) {
            setMessage('Parolalar eşleşmiyor', true);
            return;
        }
        if (current === password) {
            setMessage('Yeni parola mevcut paroladan farklı olmalı', true);
            return;
        }

        button.disabled = true;
        try {
            var response = await fetch('auth.php?action=change-password', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ current: current, password: password, confirm: confirm })
            });
            var data = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                var msg = (data && data.message) ? data.message : 'Parola güncellenemedi';
                if (msg === 'Mevcut parola hatali') msg = 'Mevcut parola hatalı';
                if (msg === 'Parolalar eslesmiyor') msg = 'Parolalar eşleşmiyor';
                if (msg === 'Parola en az 10 karakter olmali') msg = 'Parola en az 10 karakter olmalı';
                if (msg === 'Yeni parola mevcut paroladan farkli olmali') msg = 'Yeni parola mevcut paroladan farklı olmalı';
                if (msg.indexOf('Cok fazla deneme') === 0) msg = 'Çok fazla deneme. 15 dakika sonra tekrar dene.';
                setMessage(msg, true);
                return;
            }
            hide();
            if (typeof global.showNotification === 'function') {
                global.showNotification('✅ Parola güncellendi', 'success');
            }
        } catch (error) {
            setMessage('Sunucuya ulaşılamadı', true);
        } finally {
            button.disabled = false;
        }
    }

    global.openPasswordChangeModal = open;
})(window);
