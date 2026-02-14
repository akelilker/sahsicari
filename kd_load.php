<?php
// kd_load.php - Kasa Defteri Veri Yükleme v1.0
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

$mainFile = __DIR__ . '/kd_veriler.json';

function isValidJson($text) {
    $decoded = json_decode($text, true);
    return (json_last_error() === JSON_ERROR_NONE && is_array($decoded));
}
 
// Ana dosya varsa ve geçerliyse onu döndür
if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    if ($content !== false && isValidJson($content)) {
        echo $content;
        exit;
    }
}

// Dosya yoksa veya bozuksa varsayılan veri döndür
$defaultData = [
    "baslangicBakiye" => 0,
    "kategoriler" => [
        "Kasa",
        "Maaş Ödemeleri",
        "İşyeri Kira+Aidat",
        "Sahibinden.com",
        "Yemek",
        "Yakıt",
        "Noter",
        "Sair Giderler",
        "Ekspertiz",
        "Oto Yıkama+Bakım",
        "Kargo",
        "Elektrik",
        "Su",
        "Çekici",
        "GSM+İnternet",
        "KDV Geçici+Kurumlar+Muhtasar+Diğer Vergi",
        "Sigorta"
    ],
    "islemler" => []
];

echo json_encode($defaultData, JSON_UNESCAPED_UNICODE);
?>