<?php
/**
 * Uyumluluk dosyası – Kayıt (WAF bypass).
 * WAF bazen "save" içeren URL'leri engelliyor; bu yüzden write_data.php
 * üzerinden save.php çağrılıyor. Asıl endpoint: save.php.
 * Kaldırılabilir mi: WAF kuralı değişmeden hayır.
 */
require_once __DIR__ . '/save.php';
