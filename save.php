<?php
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

$force = (isset($_GET['force']) && $_GET['force'] === 'true');
$input = file_get_contents('php://input');
$newData = json_decode($input, true);

if (!is_array($newData) || count($newData) === 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Gecersiz veri"], JSON_UNESCAPED_UNICODE);
    exit;
}

$mainFile = __DIR__ . '/veriler.json';
$backupDir = __DIR__ . '/backups';

if (!$force && file_exists($mainFile)) {
    $oldDataContent = @file_get_contents($mainFile);
    $oldData = json_decode($oldDataContent, true);

    if (is_array($oldData) && count($oldData) > 0) {
        $oldPeopleCount = count($oldData);
        $newPeopleCount = count($newData);

        if ($oldPeopleCount > 1 && ($newPeopleCount < ($oldPeopleCount * 0.7))) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: ani veri kaybi algilandi, kayit reddedildi.",
                "details" => ["old" => $oldPeopleCount, "new" => $newPeopleCount]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) {
    error_log('save.php backup mkdir failed: ' . $backupDir);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yedek klasoru olusturulamadi"], JSON_UNESCAPED_UNICODE);
    exit;
}
if (file_exists($mainFile)) {
    $backupFile = $backupDir . '/veriler_' . date('Y-m-d_H-i-s') . '.json';
    if (!copy($mainFile, $backupFile)) {
        error_log('save.php backup copy failed: ' . $backupFile);
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Yedekleme basarisiz, kayit iptal edildi"], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$otuzGunOnce = time() - (30 * 24 * 60 * 60);
$backupFiles = glob($backupDir . '/veriler_*.json');
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
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (tmp)"], JSON_UNESCAPED_UNICODE);
    exit;
}
if (!@rename($tmpFile, $mainFile)) {
    @unlink($tmpFile);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (rename)"], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    "status" => "success",
    "message" => "Veriler guvenle kaydedildi.",
    "force" => $force ? true : false
], JSON_UNESCAPED_UNICODE);
?>