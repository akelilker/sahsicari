<?php
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

if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    if ($content !== false && isValidJsonObjectOrArray($content)) {
        echo $content;
        exit;
    }
}

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

echo json_encode(new stdClass());
?>
