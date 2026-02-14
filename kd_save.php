<?php
// kd_save.php - Kasa Defteri Veri Kaydetme v1.0
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
if (!is_array($newData)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Geçersiz Veri"]);
    exit;
}

$mainFile = __DIR__ . '/kd_veriler.json';
$backupDir = __DIR__ . '/kd_backups';

// Yedekleme klasörünü oluştur
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0755, true);
}

// Mevcut dosyayı yedekle
if (file_exists($mainFile)) {
    @copy($mainFile, $backupDir . '/kd_veriler_' . date('Y-m-d_H-i-s') . '.json');
}

// Eski yedekleri temizle (30 günden eski)
$otuzGunOnce = time() - (30 * 24 * 60 * 60);
$backupFiles = glob($backupDir . '/kd_veriler_*.json');
if ($backupFiles) {
    foreach ($backupFiles as $dosya) {
        if (@filemtime($dosya) < $otuzGunOnce) {
            @unlink($dosya);
        }
    }
}

// Atomik yazma
$tmpFile = $mainFile . '.tmp';
if (@file_put_contents($tmpFile, $input, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yazma hatası (tmp)"]);
    exit;
} 

if (!@rename($tmpFile, $mainFile)) {
    @unlink($tmpFile);
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Yazma hatası (rename)"]);
    exit;
}

echo json_encode([
    "status" => "success",
    "message" => "Veriler kaydedildi."
]);
?>