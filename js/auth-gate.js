(function (global) {
    var pending = null;
    var submitResolve = null;

    var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';
    var SAVE_PASSWORD_KEY = 'sahsicariAuthSavePassword';

    function readSavePasswordPref() {
        try {
            return localStorage.getItem(SAVE_PASSWORD_KEY) !== '0';
        } catch (_) {
            return true;
        }
    }

    function writeSavePasswordPref(checked) {
        try {
            localStorage.setItem(SAVE_PASSWORD_KEY, checked ? '1' : '0');
        } catch (_) {}
    }

    async function storeLoginPasswordCredential(password) {
        if (!password || !window.PasswordCredential || !navigator.credentials || !navigator.credentials.store) {
            return;
        }
        try {
            var userEl = byId('authGateUser');
            var id = (userEl && userEl.value) ? userEl.value : 'sahsicari';
            await navigator.credentials.store(new PasswordCredential({
                id: id,
                password: password,
                name: id
            }));
        } catch (_) {}
    }

    function ensureSavePasswordCheckbox() {
        if (byId('authGateSavePassword')) return;
        var submit = byId('authGateSubmit');
        if (!submit) return;
        submit.insertAdjacentHTML('beforebegin',
            '<label class="auth-gate__save-password" for="authGateSavePassword">'
            + '<input type="checkbox" id="authGateSavePassword">'
            + '<span>Beni hatırla</span></label>');
        var box = byId('authGateSavePassword');
        if (box && box.dataset.bound !== '1') {
            box.dataset.bound = '1';
            box.checked = readSavePasswordPref();
            box.addEventListener('change', function () {
                writeSavePasswordPref(box.checked);
            });
        }
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

    function updateStrength() {
        var bar = byId('authGateStrength');
        if (!bar) return;
        var value = byId('authGatePassword').value;
        var score = passwordScore(value);
        var colors = ['#d40000', '#d40000', '#f5a623', '#f5a623', '#00e676', '#00e676'];
        bar.style.width = value ? Math.max(12, score * 20) + '%' : '0';
        bar.style.background = colors[score];
    }

    function setMessage(text, isError) {
        var el = byId('authGateMessage');
        el.textContent = text || '';
        el.classList.toggle('is-error', !!isError);
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function ensureUsernameField() {
        var form = byId('authGateForm');
        if (!form) return;
        var user = byId('authGateUser');
        var body = form.querySelector('.auth-gate__body');
        if (!body) return;
        if (!user) {
            body.insertAdjacentHTML('afterbegin',
                '<label class="sr-only" for="authGateUser">Kullanıcı</label>'
                + '<input id="authGateUser" class="sr-only" name="username" type="text" autocomplete="username" value="sahsicari" tabindex="-1">');
            return;
        }
        if (!form.contains(user)) {
            body.insertBefore(user, body.firstChild);
            var label = form.querySelector('label[for="authGateUser"]');
            if (label && !body.contains(label)) body.insertBefore(label, user);
        }
        user.type = 'text';
        user.name = 'username';
        user.setAttribute('autocomplete', 'username');
        user.classList.add('sr-only');
        user.removeAttribute('aria-hidden');
    }

    function ensureDom() {
        if (byId('authGate')) {
            ensureUsernameField();
            ensureSavePasswordCheckbox();
            return;
        }
        var wrap = document.createElement('div');
        wrap.id = 'authGate';
        wrap.className = 'auth-gate';
        wrap.hidden = true;
        wrap.innerHTML = ''
            + '<form id="authGateForm" class="auth-gate__card" novalidate>'
            + '<div class="auth-gate__head"><h2 id="authGateTitle">Giriş</h2></div>'
            + '<div class="auth-gate__body">'
            + '<p id="authGateMessage" aria-live="polite"></p>'
            + '<label class="sr-only" for="authGateUser">Kullanıcı</label>'
            + '<input id="authGateUser" class="sr-only" name="username" type="text" autocomplete="username" value="sahsicari" tabindex="-1">'
            + '<label class="sr-only" for="authGatePassword">Parola</label>'
            + '<div class="auth-gate__field"><input id="authGatePassword" type="password" placeholder="Parola" autocomplete="current-password" required>'
            + '<button type="button" class="auth-gate__eye" aria-label="Parolayı göster" data-target="authGatePassword">' + EYE + '</button>' + '</div>'
            + '<div class="auth-gate__strength" aria-hidden="true"><span id="authGateStrength"></span></div>'
            + '<label id="authGateConfirmLabel" class="sr-only" for="authGateConfirm">Parola tekrar</label>'
            + '<div class="auth-gate__field auth-gate__confirm"><input id="authGateConfirm" type="password" placeholder="Parola tekrar" autocomplete="new-password">'
            + '<button type="button" class="auth-gate__eye" aria-label="Parolayı göster" data-target="authGateConfirm">' + EYE + '</button>' + '</div>'
            + '<label class="auth-gate__save-password" for="authGateSavePassword">'
            + '<input type="checkbox" id="authGateSavePassword">'
            + '<span>Beni hatırla</span></label>'
            + '<button type="submit" id="authGateSubmit" class="auth-gate__submit">Devam</button>'
            + '</div></form>';
        document.body.appendChild(wrap);
        wrap.querySelectorAll('.auth-gate__eye').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = byId(btn.getAttribute('data-target'));
                var reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';
                btn.innerHTML = reveal ? EYE_OFF : EYE;
                btn.setAttribute('aria-label', reveal ? 'Parolayı gizle' : 'Parolayı göster');
            });
        });
        byId('authGatePassword').addEventListener('input', updateStrength);
        byId('authGateForm').addEventListener('submit', onSubmit);
        ensureSavePasswordCheckbox();
    }

    function show(mode, message) {
        ensureDom();
        var gate = byId('authGate');
        var setup = mode === 'setup';
        gate.hidden = false;
        gate.setAttribute('data-mode', setup ? 'setup' : 'login');
        byId('authGateTitle').textContent = setup ? 'İlk Kurulum' : 'Giriş';
        byId('authGateConfirm').required = setup;
        byId('authGatePassword').value = '';
        byId('authGateConfirm').value = '';
        setMessage(message);
        byId('authGatePassword').autocomplete = setup ? 'new-password' : 'current-password';
        updateStrength();
        byId('authGateSubmit').textContent = setup ? 'Kaydet' : 'Giriş';
        ensureSavePasswordCheckbox();
        var saveBox = byId('authGateSavePassword');
        if (saveBox && !setup) {
            saveBox.checked = readSavePasswordPref();
        }
        byId('authGatePassword').focus();
    }

    function hide() {
        var gate = byId('authGate');
        if (gate) gate.hidden = true;
    }

    async function readStatus() {
        var response = await fetch('auth.php?action=status', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });
        var data = await response.json().catch(function () { return null; });
        if (!response.ok || !data) throw new Error('status');
        return data;
    }

    async function onSubmit(event) {
        event.preventDefault();
        var gate = byId('authGate');
        var setup = gate && gate.getAttribute('data-mode') === 'setup';
        var password = byId('authGatePassword').value;
        var confirm = byId('authGateConfirm').value;
        var button = byId('authGateSubmit');
        if (setup && password.length < 10) {
            setMessage('Parola en az 10 karakter olmalı', true);
            return;
        }
        if (setup && password !== confirm) {
            setMessage('Parolalar eşleşmiyor', true);
            return;
        }
        if (!password) {
            setMessage('Parola gerekli', true);
            return;
        }
        button.disabled = true;
        try {
            var response = await fetch('auth.php?action=' + (setup ? 'setup' : 'login'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ password: password, confirm: confirm })
            });
            var data = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                setMessage((data && data.message) ? data.message : 'Giriş başarısız', true);
                return;
            }
            if (!setup) {
                var saveLogin = byId('authGateSavePassword');
                if (saveLogin && saveLogin.checked) {
                    await storeLoginPasswordCredential(password);
                }
            }
            hide();
            if (submitResolve) {
                var resolve = submitResolve;
                submitResolve = null;
                resolve({ ok: true });
            }
        } catch (error) {
            setMessage('Sunucuya ulaşılamadı', true);
        } finally {
            button.disabled = false;
        }
    }

    global.ensureServerAuth = function () {
        if (pending) return pending;
        pending = (async function () {
            if (!navigator.onLine) return { ok: false, offline: true };
            try {
                var state = await readStatus();
                if (state.authenticated) return { ok: true };
                return await new Promise(function (resolve) {
                    submitResolve = resolve;
                    show(state.configured ? 'login' : 'setup', state.configured
                        ? 'Sunucu verisi için parola gerekli.'
                        : 'En az 10 karakter');
                });
            } catch (error) {
                return { ok: false, offline: true };
            } finally {
                pending = null;
            }
        })();
        return pending;
    };
})(window);
