<?php
/**
 * save.php – Veri kaydetme endpoint.
 * Akış: input validate → anti-wipe kontrolü (force yoksa) → backup → temp write → atomic rename → response.
 * force=true: GET parametresi ile koruma atlanır (yedekten dönüş / bilinçli overwrite).
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

/** Toplam işlem sayısını hesaplar (kişi başına transactions dizisi). */
function countTotalTransactions(array $data): int {
    $n = 0;
    foreach ($data as $person) {
        if (is_array($person) && isset($person['transactions']) && is_array($person['transactions'])) {
            $n += count($person['transactions']);
        }
    }
    return $n;
}

$force = (isset($_GET['force']) && $_GET['force'] === 'true');
$input = file_get_contents('php://input');
$newData = json_decode($input, true);

// --- 1) Input validate: geçerli JSON ve en az bir kişi
if (!is_array($newData) || count($newData) === 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Gecersiz veri"], JSON_UNESCAPED_UNICODE);
    exit;
}

$mainFile = __DIR__ . '/veriler.json';
$backupDir = __DIR__ . '/backups';

// --- 2) Anti-wipe: ani veri düşüşünde kayıt reddedilir (force=true ile atlanır)
if (!$force && file_exists($mainFile)) {
    $oldDataContent = @file_get_contents($mainFile);
    $oldData = json_decode($oldDataContent, true);

    if (is_array($oldData) && count($oldData) > 0) {
        $oldPeopleCount = count($oldData);
        $newPeopleCount = count($newData);
        $oldTxCount = countTotalTransactions($oldData);
        $newTxCount = countTotalTransactions($newData);

        // Kişi sayısında büyük düşüş (mevcut kural)
        if ($oldPeopleCount > 1 && ($newPeopleCount < ($oldPeopleCount * 0.7))) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: ani veri kaybi algilandi, kayit reddedildi.",
                "details" => ["old" => $oldPeopleCount, "new" => $newPeopleCount]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
        // İşlem sayısında aşırı düşüş (yanlış pozitif riski için eşik: eski veride yeterli işlem varsa)
        if ($oldTxCount > 20 && $newTxCount < ($oldTxCount * 0.5)) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: islem sayisinda ani dusus algilandi, kayit reddedildi.",
                "details" => ["oldTx" => $oldTxCount, "newTx" => $newTxCount]
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// --- 3) Backup: yedek klasörü ve mevcut dosyanın kopyası
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

// 30 günden eski yedekleri temizle
$otuzGunOnce = time() - (30 * 24 * 60 * 60);
$backupFiles = glob($backupDir . '/veriler_*.json');
if ($backupFiles) {
    foreach ($backupFiles as $dosya) {
        if (@filemtime($dosya) < $otuzGunOnce) {
            @unlink($dosya);
        }
    }
}

// --- 4) Temp write: önce .tmp dosyasına yaz (ana dosyayı bozmadan)
$tmpFile = $mainFile . '.tmp';
if (@file_put_contents($tmpFile, $input, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (tmp)"], JSON_UNESCAPED_UNICODE);
    exit;
}
// --- 5) Atomic rename: .tmp → ana dosya (tek adımda geçiş)
if (!@rename($tmpFile, $mainFile)) {
    @unlink($tmpFile);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (rename)"], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- 6) Response: tutarlı JSON formatı
echo json_encode([
    "status" => "success",
    "message" => "Veriler guvenle kaydedildi.",
    "force" => $force ? true : false
], JSON_UNESCAPED_UNICODE);
?>