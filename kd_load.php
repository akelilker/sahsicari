<?php
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/request_guard.php';
enforce_same_origin();

$mainFile = __DIR__ . '/kd_veriler.json';

function isValidJson(string $text): bool {
    $decoded = json_decode($text, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($decoded));
}

if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    if ($content !== false && isValidJson($content)) {
        echo $content;
        exit;
    }
}

$defaultData = [
    "baslangicBakiye" => 0,
    "kategoriler" => [
        "Kasa",
        "Maa? Ödemeleri",
        "??yeri Kira+Aidat",
        "Sahibinden.com",
        "Yemek",
        "Yak?t",
        "Noter",
        "Sair Giderler",
        "Ekspertiz",
        "Oto Y?kama+Bak?m",
        "Kargo",
        "Elektrik",
        "Su",
        "Çekici",
        "GSM+?nternet",
        "KDV Geçici+Kurumlar+Muhtasar+Di?er Vergi",
        "Sigorta"
    ],
    "islemler" => []
];

echo json_encode($defaultData, JSON_UNESCAPED_UNICODE);
?>
