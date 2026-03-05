<?php
function deny_request(int $statusCode, string $message): void {
    http_response_code($statusCode);
    echo json_encode(["status" => "error", "message" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function enforce_same_origin(): void {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if ($host === '') {
        deny_request(400, 'Host header missing');
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $originHost = parse_url($origin, PHP_URL_HOST);
        if (!is_string($originHost) || strcasecmp($originHost, $host) !== 0) {
            deny_request(403, 'Cross-origin request denied');
        }
    }

    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($origin === '' && $referer !== '') {
        $refererHost = parse_url($referer, PHP_URL_HOST);
        if (!is_string($refererHost) || strcasecmp($refererHost, $host) !== 0) {
            deny_request(403, 'Invalid referer');
        }
    }

    $secFetchSite = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($secFetchSite !== '' && !in_array($secFetchSite, ['same-origin', 'same-site', 'none'], true)) {
        deny_request(403, 'Fetch-site policy violation');
    }
}
?>
