<?php
/**
 * CLI: php tools/create-auth-config.php "parola"
 * Web'den çağrılırsa 404. Mevcut auth_config.php dosyasının üzerine yazmaz.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/auth_lib.php';

$password = $argv[1] ?? '';
if (!is_string($password) || strlen($password) < 10) {
    fwrite(STDERR, "Kullanim: php tools/create-auth-config.php \"en-az-10-karakter\"\n");
    exit(1);
}
if (sahsicari_auth_configured()) {
    fwrite(STDERR, "auth_config.php zaten var. Degistirmek icin dosyayi sunucuda elle sil, hemen ardindan yenisini yaz.\n");
    exit(1);
}
if (!sahsicari_write_auth_config($password)) {
    fwrite(STDERR, "auth_config.php yazilamadi.\n");
    exit(1);
}
fwrite(STDOUT, "auth_config.php olustu. Bu dosyayi repoya ekleme.\n");
