<?php
/**
 * Giriş, ilk parola ve oturum durumu.
 * Veri dosyalarına erişmez. Yazma istekleri same-origin guard'dan geçer.
 */
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/request_guard.php';
enforce_same_origin();
require_once __DIR__ . '/auth_lib.php';

$action = isset($_GET['action']) ? (string) $_GET['action'] : 'status';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($action === 'status' && $method === 'GET') {
    echo json_encode([
        'status' => 'success',
        'configured' => sahsicari_auth_configured(),
        'authenticated' => sahsicari_auth_configured() && sahsicari_is_authenticated()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$body = sahsicari_json_input();

if ($action === 'logout') {
    sahsicari_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
    echo json_encode(['status' => 'success'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'setup') {
    if (sahsicari_auth_configured()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Parola zaten tanimli'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $confirm = isset($body['confirm']) && is_string($body['confirm']) ? $body['confirm'] : '';
    if (strlen($password) < 10 || strlen($password) > 200) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parola en az 10 karakter olmali'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!hash_equals($password, $confirm)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parolalar eslesmiyor'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!sahsicari_write_auth_config($password)) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Parola kaydedilemedi'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    sahsicari_mark_authenticated();
    echo json_encode(['status' => 'success', 'configured' => true, 'authenticated' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'login') {
    if (!sahsicari_auth_configured()) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'message' => 'Once parola belirlenmeli', 'configured' => false], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (sahsicari_login_locked()) {
        http_response_code(429);
        echo json_encode(['status' => 'error', 'message' => 'Cok fazla deneme. 15 dakika sonra tekrar dene.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    if (!sahsicari_password_ok($password)) {
        sahsicari_register_login_failure();
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Parola hatali'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    sahsicari_clear_login_failures();
    sahsicari_mark_authenticated();
    echo json_encode(['status' => 'success', 'configured' => true, 'authenticated' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'change-password') {
    if (!sahsicari_auth_configured()) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'message' => 'Parola henuz tanimli degil', 'configured' => false], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!sahsicari_is_authenticated()) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Oturum gerekli', 'configured' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (sahsicari_login_locked()) {
        http_response_code(429);
        echo json_encode(['status' => 'error', 'message' => 'Cok fazla deneme. 15 dakika sonra tekrar dene.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $current = isset($body['current']) && is_string($body['current']) ? $body['current'] : '';
    $password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';
    $confirm = isset($body['confirm']) && is_string($body['confirm']) ? $body['confirm'] : '';
    if (!sahsicari_password_ok($current)) {
        sahsicari_register_login_failure();
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Mevcut parola hatali'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (strlen($password) < 10 || strlen($password) > 200) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parola en az 10 karakter olmali'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!hash_equals($password, $confirm)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Parolalar eslesmiyor'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (hash_equals($current, $password)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Yeni parola mevcut paroladan farkli olmali'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!sahsicari_update_auth_password($password)) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Parola kaydedilemedi'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    sahsicari_start_session();
    session_regenerate_id(true);
    $_SESSION['auth_ok'] = true;
    $_SESSION['auth_at'] = time();
    echo json_encode(['status' => 'success', 'message' => 'Parola guncellendi'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Bilinmeyen islem'], JSON_UNESCAPED_UNICODE);
