<?php
// save.php - v78.34 - Güçlendirilmiş Anti-Wipe Koruma (force + kilitli yazım)
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$gizliAnahtar = "Karmotor_Guvenlik_Sifresi_2025";

// force=true gelirse Anti-Wipe (%70) kontrolünü BİLİNÇLİ olarak pas geçer
$force = (isset($_GET['force']) && $_GET['force'] === 'true');

$gelenAnahtar = "";
if (isset($_GET['auth'])) {
    $gelenAnahtar = $_GET['auth'];
} elseif (isset($_SERVER['HTTP_X_AUTH_TOKEN'])) {
    $gelenAnahtar = $_SERVER['HTTP_X_AUTH_TOKEN'];
}

if ($gelenAnahtar !== $gizliAnahtar) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Yetkisiz"]);
    exit;
}

$input = file_get_contents('php://input');
$newData = json_decode($input, true);

// Boş/bozuk veri koruması
if (!is_array($newData) || count($newData) === 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Gecersiz Veri"]);
    exit;
}

$mainFile = __DIR__ . '/veriler.json';
$backupDir = __DIR__ . '/backups';

// --- KRİTİK KORUMA (Anti-Wipe) ---
if (!$force && file_exists($mainFile)) {
    $oldDataContent = @file_get_contents($mainFile);
    $oldData = json_decode($oldDataContent, true);

    if (is_array($oldData) && count($oldData) > 0) {
        $oldPeopleCount = count($oldData);
        $newPeopleCount = count($newData);

        // Eğer gelen kişi sayısı mevcut olanın %70'inden azsa işlemi durdur
        if ($oldPeopleCount > 1 && ($newPeopleCount < ($oldPeopleCount * 0.7))) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Koruma: Ani veri kaybı algılandı! Kayıt reddedildi.",
                "details" => ["old" => $oldPeopleCount, "new" => $newPeopleCount]
            ]);
            exit;
        }
    }
}

// Otomatik Yedekleme
if (!is_dir($backupDir)) @mkdir($backupDir, 0755, true);
if (file_exists($mainFile)) {
    @copy($mainFile, $backupDir . '/veriler_' . date('Y-m-d_H-i-s') . '.json');
}

// --- ESKİ BACKUP TEMİZLİĞİ (30 günden eski dosyaları sil) ---
$otuzGunOnce = time() - (30 * 24 * 60 * 60);
$backupFiles = glob($backupDir . '/veriler_*.json');
if ($backupFiles) {
    foreach ($backupFiles as $dosya) {
        if (@filemtime($dosya) < $otuzGunOnce) {
            @unlink($dosya);
        }
    }
}

// --- ATOMİK + KİLİTLİ YAZMA ---
// Not: tmp dosyaya LOCK_EX ile yaz -> sonra rename (aynı disk içinde atomik)
$tmpFile = $mainFile . '.tmp';
if (@file_put_contents($tmpFile, $input, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (tmp)"]);
    exit;
}
if (!@rename($tmpFile, $mainFile)) {
    @unlink($tmpFile);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Sunucu yazma hatasi (rename)"]);
    exit;
}

echo json_encode([
    "status" => "success",
    "message" => "Veriler güvenle kaydedildi.",
    "force" => $force ? true : false
]);
?>