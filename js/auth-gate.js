(function (global) {
    var pending = null;
    var submitResolve = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function ensureDom() {
        if (byId('authGate')) return;
        var wrap = document.createElement('div');
        wrap.id = 'authGate';
        wrap.className = 'auth-gate';
        wrap.hidden = true;
        wrap.innerHTML = ''
            + '<form id="authGateForm" class="auth-gate__card">'
            + '<h2 id="authGateTitle">Giriş</h2>'
            + '<p id="authGateMessage"></p>'
            + '<label class="sr-only" for="authGateUser">Kullanıcı</label>'
            + '<input id="authGateUser" class="sr-only" autocomplete="username" value="sahsicari">'
            + '<label for="authGatePassword">Parola</label>'
            + '<input id="authGatePassword" type="password" autocomplete="current-password" required minlength="1">'
            + '<label id="authGateConfirmLabel" for="authGateConfirm">Parola tekrar</label>'
            + '<input id="authGateConfirm" type="password" autocomplete="new-password">'
            + '<button type="submit" id="authGateSubmit">Devam</button>'
            + '</form>';
        document.body.appendChild(wrap);
        byId('authGateForm').addEventListener('submit', onSubmit);
    }

    function show(mode, message) {
        ensureDom();
        var gate = byId('authGate');
        var setup = mode === 'setup';
        gate.hidden = false;
        gate.setAttribute('data-mode', setup ? 'setup' : 'login');
        byId('authGateTitle').textContent = setup ? 'Parola belirle' : 'Giriş';
        byId('authGateConfirm').hidden = !setup;
        byId('authGateConfirmLabel').hidden = !setup;
        byId('authGateConfirm').required = setup;
        byId('authGatePassword').value = '';
        byId('authGateConfirm').value = '';
        byId('authGateMessage').textContent = message || '';
        byId('authGateSubmit').textContent = setup ? 'Kaydet' : 'Giriş';
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
                byId('authGateMessage').textContent = (data && data.message) ? data.message : 'Giriş başarısız';
                return;
            }
            hide();
            if (submitResolve) {
                var resolve = submitResolve;
                submitResolve = null;
                resolve({ ok: true });
            }
        } catch (error) {
            byId('authGateMessage').textContent = 'Sunucuya ulaşılamadı';
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
                        : 'İlk kurulum: en az 10 karakter. Adres açıksa ilk kaydeden bu parolayı alır; kurulumu hemen tamamla.');
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
