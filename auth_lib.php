<?php
/**
 * Oturum ve parola. Veri uçları require_api_auth() çağırır.
 * Parola yalnız auth_config.php içindeki hash'te durur; bu dosya repoya girmez.
 */
const SAHSICARI_SESSION_SECONDS = 2592000;

function sahsicari_auth_config_path(): string {
    return __DIR__ . '/auth_config.php';
}

function sahsicari_attempts_path(): string {
    return __DIR__ . '/auth_attempts.json';
}

function sahsicari_cookie_path(): string {
    $script = isset($_SERVER['SCRIPT_NAME']) ? (string) $_SERVER['SCRIPT_NAME'] : '/';
    $dir = str_replace('\\', '/', dirname($script));
    if ($dir === '/' || $dir === '.' || $dir === '\\' || $dir === '') {
        return '/';
    }
    return rtrim($dir, '/');
}

function sahsicari_request_is_https(): bool {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    $forwarded = isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? (string) $_SERVER['HTTP_X_FORWARDED_PROTO'] : '';
    return strtolower($forwarded) === 'https';
}

function sahsicari_start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('SAHSICARI_SESS');
    session_set_cookie_params([
        'lifetime' => SAHSICARI_SESSION_SECONDS,
        'path' => sahsicari_cookie_path(),
        'secure' => sahsicari_request_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) SAHSICARI_SESSION_SECONDS);
    session_start();
}

function sahsicari_load_auth_config(): ?array {
    $path = sahsicari_auth_config_path();
    if (!is_file($path)) {
        return null;
    }
    $config = include $path;
    if (!is_array($config) || empty($config['password_hash']) || !is_string($config['password_hash'])) {
        return null;
    }
    return $config;
}

function sahsicari_auth_configured(): bool {
    return sahsicari_load_auth_config() !== null;
}

function sahsicari_client_key(): string {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : 'unknown';
    return hash('sha256', $ip);
}

function sahsicari_read_attempts(): array {
    $path = sahsicari_attempts_path();
    if (!is_file($path)) {
        return ['keys' => []];
    }
    $raw = @file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded) || !isset($decoded['keys']) || !is_array($decoded['keys'])) {
        return ['keys' => []];
    }
    return $decoded;
}

function sahsicari_write_attempts(array $data): void {
    $path = sahsicari_attempts_path();
    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    if (!is_string($json)) {
        return;
    }
    @file_put_contents($path, $json, LOCK_EX);
}

function sahsicari_login_locked(): bool {
    $data = sahsicari_read_attempts();
    $key = sahsicari_client_key();
    $row = $data['keys'][$key] ?? null;
    if (!is_array($row)) {
        return false;
    }
    $until = isset($row['lockedUntil']) ? (int) $row['lockedUntil'] : 0;
    return $until > time();
}

function sahsicari_register_login_failure(): void {
    $data = sahsicari_read_attempts();
    $key = sahsicari_client_key();
    $row = isset($data['keys'][$key]) && is_array($data['keys'][$key]) ? $data['keys'][$key] : ['fails' => 0, 'lockedUntil' => 0];
    $row['fails'] = ((int) ($row['fails'] ?? 0)) + 1;
    if ($row['fails'] >= 8) {
        $row['lockedUntil'] = time() + (15 * 60);
        $row['fails'] = 0;
    }
    $data['keys'][$key] = $row;
    sahsicari_write_attempts($data);
}

function sahsicari_clear_login_failures(): void {
    $data = sahsicari_read_attempts();
    $key = sahsicari_client_key();
    unset($data['keys'][$key]);
    sahsicari_write_attempts($data);
}

function sahsicari_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function sahsicari_password_ok(string $password): bool {
    if ($password === '' || strlen($password) > 200) {
        return false;
    }
    $config = sahsicari_load_auth_config();
    if ($config === null) {
        return false;
    }
    return password_verify($password, $config['password_hash']);
}

function sahsicari_mark_authenticated(): void {
    sahsicari_start_session();
    session_regenerate_id(true);
    $_SESSION['auth_ok'] = true;
    $_SESSION['auth_at'] = time();
}

function sahsicari_is_authenticated(): bool {
    sahsicari_start_session();
    return !empty($_SESSION['auth_ok']);
}

function sahsicari_auth_config_export(string $hash): string {
    return "<?php\nreturn " . var_export(['password_hash' => $hash], true) . ";\n";
}

function sahsicari_write_auth_config(string $password): bool {
    $path = sahsicari_auth_config_path();
    if (is_file($path)) {
        return false;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === '') {
        return false;
    }
    $contents = sahsicari_auth_config_export($hash);
    $handle = @fopen($path, 'x');
    if ($handle === false) {
        return false;
    }
    $written = fwrite($handle, $contents);
    fclose($handle);
    if ($written === false) {
        @unlink($path);
        return false;
    }
    @chmod($path, 0640);
    return true;
}

function sahsicari_update_auth_password(string $password): bool {
    if (!sahsicari_auth_configured()) {
        return false;
    }
    if ($password === '' || strlen($password) > 200) {
        return false;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === '') {
        return false;
    }
    $path = sahsicari_auth_config_path();
    $contents = sahsicari_auth_config_export($hash);
    $tmp = $path . '.tmp.' . bin2hex(random_bytes(8));
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false) {
        return false;
    }
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    @chmod($path, 0640);
    return true;
}

function require_api_auth(): void {
    if (!sahsicari_auth_configured()) {
        http_response_code(503);
        echo json_encode([
            'status' => 'error',
            'message' => 'Parola henuz tanimli degil',
            'configured' => false
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!sahsicari_is_authenticated()) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Oturum gerekli',
            'configured' => true
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
