<?php
/**
 * request_guard.php – Same-origin koruması (GET ve yazma istekleri).
 * Tüm veri endpoint'leri (get_data, save, kd_load vb.) bu dosyayı require edip
 * enforce_same_origin() çağırır. GET: Origin/Referer yoksa da (PWA, gizlilik) izin
 * verilebilir. Yazma (POST/PUT): Origin veya Referer ile Host eşleşmeli; aksi 403.
 */
if (!headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
}

function deny_request(int $statusCode, string $message): void {
    http_response_code($statusCode);
    echo json_encode(["status" => "error", "message" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Host/Origin/Referer değerinden sadece host kısmını çıkarır (port, scheme temizlenir). */
function normalize_host(?string $value): string {
    if (!is_string($value) || $value === '') return '';
    $trimmed = trim($value);

    // Header may be "host:port"; parse_url needs a scheme for reliable host parsing.
    $parsed = parse_url((strpos($trimmed, '://') !== false) ? $trimmed : ('http://' . $trimmed), PHP_URL_HOST);
    if (is_string($parsed) && $parsed !== '') {
        return strtolower(trim($parsed, '[]'));
    }

    return strtolower(trim($trimmed, '[]'));
}

/** Yerel geliştirme: localhost / 127.0.0.1 / ::1 birbirine eşit kabul edilir. */
function is_loopback_host(string $host): bool {
    return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function strip_www_prefix(string $host): string {
    return (strpos($host, 'www.') === 0) ? substr($host, 4) : $host;
}

function hosts_match(string $left, string $right): bool {
    if ($left === '' || $right === '') return false;
    if ($left === $right) return true;
    if (strip_www_prefix($left) === strip_www_prefix($right)) return true;

    // Treat local loopback aliases as equivalent for local development.
    return is_loopback_host($left) && is_loopback_host($right);
}

/**
 * Same-origin zorunlu kılar. Sıra:
 * 1) Host zorunlu; yoksa 400.
 * 2) Origin varsa: Origin host ile Request Host aynı olmalı; değilse 403.
 * 3) Origin yoksa (PWA bazen null gönderir): Referer host ile Host eşleşmeli.
 * 4) İkisi de yoksa: Sec-Fetch-Site same-origin/same-site/none olmalı; sadece GET
 *    isteklerinde Origin/Referer yokluğu tolere edilir (PWA / gizlilik).
 */
function enforce_same_origin(): void {
    $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
    $host = normalize_host($hostHeader);
    if ($host === '') {
        deny_request(400, 'Host header missing');
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $origin = is_string($origin) ? trim($origin) : '';
    if (strtolower($origin) === 'null') {
        // PWA/standalone contexts may send Origin: null.
        $origin = '';
    }

    $originOk = false;
    if ($origin !== '') {
        $originHost = normalize_host($origin);
        if (!hosts_match($originHost, $host)) {
            deny_request(403, 'Cross-origin request denied (Origin: ' . $originHost . ' vs Host: ' . $host . ')');
        }
        $originOk = true;
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($origin === '' && $referer !== '') {
        $refererHost = normalize_host($referer);
        if (!hosts_match($refererHost, $host)) {
            deny_request(403, 'Invalid referer (Referer host: ' . $refererHost . ' vs Host: ' . $host . ')');
        }
        $originOk = true;
    }

    // Sec-Fetch-Site: only enforce when we couldn't validate via Origin/Referer.
    // GET: allow without Origin/Referer (PWA, privacy). POST: allow when Sec-Fetch-Site is none (PWA direkt).
    $secFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!$originOk && $secFetchSite !== '' && !in_array($secFetchSite, ['same-origin', 'same-site', 'none'], true)) {
        if ($method !== 'GET') {
            deny_request(403, 'Fetch-site policy violation (Sec-Fetch-Site: ' . $secFetchSite . ')');
        }
    }
}
?>
