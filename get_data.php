<?php
/**
 * get_data.php – Veri yükleme endpoint.
 * Akış: ana dosya (veriler.json) geçerliyse onu dön → geçersizse yedeklerden en sonuncu geçerli dosyayı dene → yoksa boş obje.
 * Not: geçmişte/manuel alınmış yedeklerde "backup_*.json" adı da görülebilir; fallback her iki deseni de destekler.
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

function decodeJsonArray(string $text): ?array {
    $decoded = json_decode($text, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
        return null;
    }
    return $decoded;
}

function countPersistedPeople(array $data): int {
    $count = 0;
    foreach ($data as $key => $value) {
        if ($key === 'metadata' || !is_array($value)) {
            continue;
        }
        $count++;
    }
    return $count;
}

function getBackupSortKey(string $filePath): int {
    $fileName = basename($filePath);
    if (preg_match('/^(?:veriler|backup)_(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})(?:-(\d{2}))?/', $fileName, $matches)) {
        $year = (int) $matches[1];
        $month = (int) $matches[2];
        $day = (int) $matches[3];
        $hour = (int) $matches[4];
        $minute = (int) $matches[5];
        $second = isset($matches[6]) ? (int) $matches[6] : 0;
        return gmmktime($hour, $minute, $second, $month, $day, $year);
    }

    $mtime = @filemtime($filePath);
    return $mtime !== false ? (int) $mtime : 0;
}

function getBackupCandidates(string $backupDir): array {
    $patterns = [
        $backupDir . '/veriler_*.json',
        $backupDir . '/backup_*.json'
    ];

    $files = [];
    foreach ($patterns as $pattern) {
        $matches = glob($pattern);
        if (is_array($matches) && !empty($matches)) {
            $files = array_merge($files, $matches);
        }
    }

    $files = array_values(array_unique($files));
    usort($files, function($a, $b) {
        $timeCompare = getBackupSortKey($b) <=> getBackupSortKey($a);
        if ($timeCompare !== 0) return $timeCompare;

        $mtimeCompare = (@filemtime($b) ?: 0) <=> (@filemtime($a) ?: 0);
        if ($mtimeCompare !== 0) return $mtimeCompare;

        return strcmp(basename($b), basename($a));
    });

    return $files;
}

function tryRestoreMainFileFromBackup(string $mainFile, string $backupFile): void {
    if (file_exists($mainFile)) return;
    @copy($backupFile, $mainFile);
}

// 1) Ana dosya var ve geçerli JSON ise dön (source: main)
if (file_exists($mainFile)) {
    $content = @file_get_contents($mainFile);
    $decodedMain = $content !== false ? decodeJsonArray($content) : null;
    if (is_array($decodedMain) && countPersistedPeople($decodedMain) > 0) {
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
$backupFiles = getBackupCandidates($backupDir);
if ($backupFiles) {
    foreach ($backupFiles as $bf) {
        $bcontent = @file_get_contents($bf);
        $decodedBackup = $bcontent !== false ? decodeJsonArray($bcontent) : null;
        if (is_array($decodedBackup) && countPersistedPeople($decodedBackup) > 0) {
            tryRestoreMainFileFromBackup($mainFile, $bf);
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
