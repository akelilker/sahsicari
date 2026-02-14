<?php
// load.php - v78.34 - Güvenli Veri Çekme (bozuk JSON korumalı)
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header('Access-Control-Allow-Origin: *');

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

$mainFile = __DIR__ . '/veriler.json';
$backupDir = __DIR__ . '/backups';

function isValidJsonObjectOrArray($text) {
    $decoded = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE) return false;
    return is_array($decoded); // senin formatın array/object
}

// 1) Ana dosya sağlamsa onu ver
if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    if ($content !== false && isValidJsonObjectOrArray($content)) {
        echo $content;
        exit;
    }
}

// 2) Ana dosya bozuksa: en yeni yedeği bul, sağlamsa onu döndür
$backupFiles = glob($backupDir . '/veriler_*.json');
if ($backupFiles) {
    usort($backupFiles, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });

    foreach ($backupFiles as $bf) {
        $bcontent = @file_get_contents($bf);
        if ($bcontent !== false && isValidJsonObjectOrArray($bcontent)) {
            echo $bcontent;
            exit;
        }
    }
}

// 3) Hiçbir şey yoksa / hepsi bozuksa boş obje
echo json_encode(new stdClass());
?>