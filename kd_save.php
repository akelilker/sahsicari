<?php
/**
 * kd_save.php – Kasa kaydı.
 * Akış: same-origin + oturum → şekil kontrolü → anti-wipe → yedek → temp write → atomic rename.
 * force=true yalnız oturum açmış kullanıcıda anti-wipe'ı atlar.
 */
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/request_guard.php';
enforce_same_origin();
require_once __DIR__ . '/auth_lib.php';
require_api_auth();

function kd_is_valid_payload($data): bool {
    if (!is_array($data) || array_is_list_compat($data)) {
        return false;
    }
    if (!array_key_exists('baslangicBakiye', $data) || !is_numeric($data['baslangicBakiye'])) {
        return false;
    }
    if (!isset($data['kategoriler']) || !is_array($data['kategoriler'])) {
        return false;
    }
    if (!isset($data['islemler']) || !is_array($data['islemler'])) {
        return false;
    }
    return true;
}

function array_is_list_compat(array $data): bool {
    if (function_exists('array_is_list')) {
        return array_is_list($data);
    }
    $i = 0;
    foreach ($data as $key => $_value) {
        if ($key !== $i) {
            return false;
        }
        $i++;
    }
    return true;
}

function kd_transaction_count(array $data): int {
    return (isset($data['islemler']) && is_array($data['islemler'])) ? count($data['islemler']) : 0;
}

$force = (isset($_GET['force']) && $_GET['force'] === 'true');
$input = file_get_contents('php://input');
$newData = json_decode($input, true);

if (!kd_is_valid_payload($newData)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Gecersiz veri"], JSON_UNESCAPED_UNICODE);
    exit;
}

$mainFile = __DIR__ . '/kd_veriler.json';
$backupDir = __DIR__ . '/kd_backups';

if (!$force && file_exists($mainFile)) {
    $oldRaw = @file_get_contents($mainFile);
    $oldData = is_string($oldRaw) ? json_decode($oldRaw, true) : null;
    if (is_array($oldData)) {
        $oldCount = kd_transaction_count($oldData);
        $newCount = kd_transaction_count($newData);
        if ($oldCount > 0 && $newCount === 0) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: kasa islemleri bosaltma reddedildi.",
                "details" => ["old" => $oldCount, "new" => $newCount]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if ($oldCount > 8 && $newCount < ($oldCount * 0.5)) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: kasa islem sayisinda ani dusus algilandi, kayit reddedildi.",
                "details" => ["old" => $oldCount, "new" => $newCount]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $oldStamp = (isset($oldData['updatedAt']) && is_string($oldData['updatedAt'])) ? strtotime($oldData['updatedAt']) : false;
        $newStamp = (isset($newData['updatedAt']) && is_string($newData['updatedAt'])) ? strtotime($newData['updatedAt']) : false;
        if ($oldStamp && (!$newStamp || $newStamp < $oldStamp)) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: daha eski kasa kaydi sunucunun uzerine yazamaz."
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) {
    error_log('kd_save.php backup mkdir failed: ' . $backupDir);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yedek klasoru olusturulamadi"], JSON_UNESCAPED_UNICODE);
    exit;
}

if (file_exists($mainFile)) {
    $microNow = microtime(true);
    $timestamp = date('Y-m-d_H-i-s', (int) $microNow);
    $microPart = sprintf('%06d', (int) (($microNow - floor($microNow)) * 1000000));
    try {
        $randomPart = bin2hex(random_bytes(2));
    } catch (Throwable $e) {
        $randomPart = str_pad((string) mt_rand(0, 65535), 4, '0', STR_PAD_LEFT);
    }
    $backupFile = $backupDir . '/kd_veriler_' . $timestamp . '_' . $microPart . '_' . $randomPart . '.json';
    if (!copy($mainFile, $backupFile)) {
        error_log('kd_save.php backup copy failed: ' . $backupFile);
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Yedekleme basarisiz, kayit iptal edildi"], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$otuzGunOnce = time() - (30 * 24 * 60 * 60);
$backupFiles = glob($backupDir . '/kd_veriler_*.json');
if ($backupFiles) {
    foreach ($backupFiles as $dosya) {
        if (@filemtime($dosya) < $otuzGunOnce) {
            @unlink($dosya);
        }
    }
}

$tmpFile = $mainFile . '.tmp';
if (@file_put_contents($tmpFile, $input, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yazma hatasi (tmp)"], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!@rename($tmpFile, $mainFile)) {
    @unlink($tmpFile);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yazma hatasi (rename)"], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    "status" => "success",
    "message" => "Veriler kaydedildi.",
    "force" => $force ? true : false
], JSON_UNESCAPED_UNICODE);
