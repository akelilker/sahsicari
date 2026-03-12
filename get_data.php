<?php
/**
 * get_data.php – Veri yükleme endpoint.
 * Akış: ana dosya (veriler.json) geçerliyse onu dön → geçersizse yedeklerden en sonuncuyu dene → yoksa boş obje.
 * Response gövdesi geriye uyumlu kalır; metadata isteğe bağlı X-Data-Source / X-Data-Timestamp header ile verilir.
 */
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/request_guard.php';
enforce_same_origin();

$mainFile = __DIR__ . '/veriler.json';
$backupDir = __DIR__ . '/backups';

function isValidJsonObjectOrArray(string $text): bool {
    $decoded = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE) return false;
    return is_array($decoded);
}

// 1) Ana dosya var ve geçerli JSON ise dön (source: main)
if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    if ($content !== false && isValidJsonObjectOrArray($content)) {
        header('X-Data-Source: main');
        $mtime = @filemtime($mainFile);
        if ($mtime !== false) {
            header('X-Data-Timestamp: ' . gmdate('Y-m-d\TH:i:s\Z', $mtime));
        }
        echo $content;
        exit;
    }
}

// 2) Ana dosya yok veya bozuk: yedeklerden en güncel geçerli dosyayı kullan (source: backup)
$backupFiles = glob($backupDir . '/veriler_*.json');
if ($backupFiles) {
    usort($backupFiles, function($a, $b) {
        return filemtime($b) - filemtime($a);
    });

    foreach ($backupFiles as $bf) {
        $bcontent = @file_get_contents($bf);
        if ($bcontent !== false && isValidJsonObjectOrArray($bcontent)) {
            header('X-Data-Source: backup');
            $mtime = @filemtime($bf);
            if ($mtime !== false) {
                header('X-Data-Timestamp: ' . gmdate('Y-m-d\TH:i:s\Z', $mtime));
            }
            echo $bcontent;
            exit;
        }
    }
}

// 3) Hiç geçerli veri yok: boş obje (source: default, frontend aynı davranır)
header('X-Data-Source: default');
echo json_encode(new stdClass());
?>
