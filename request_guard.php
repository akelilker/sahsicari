<?php
function deny_request(int $statusCode, string $message): void {
    http_response_code($statusCode);
    echo json_encode(["status" => "error", "message" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

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

function is_loopback_host(string $host): bool {
    return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
}

function hosts_match(string $left, string $right): bool {
    if ($left === '' || $right === '') return false;
    if ($left === $right) return true;

    // Treat local loopback aliases as equivalent for local development.
    return is_loopback_host($left) && is_loopback_host($right);
}

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

    if ($origin !== '') {
        $originHost = normalize_host($origin);
        if (!hosts_match($originHost, $host)) {
            deny_request(403, 'Cross-origin request denied');
        }
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($origin === '' && $referer !== '') {
        $refererHost = normalize_host($referer);
        if (!hosts_match($refererHost, $host)) {
            deny_request(403, 'Invalid referer');
        }
    }

    $secFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($secFetchSite !== '' && !in_array($secFetchSite, ['same-origin', 'same-site', 'none'], true)) {
        deny_request(403, 'Fetch-site policy violation');
    }
}
?>
