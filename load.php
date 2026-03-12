<?php
/**
 * Uyumluluk dosyası – Veri yükleme.
 * get_data.php tek kaynak; tüm mantık orada. Service worker ve eski referanslar
 * load.php URL'sini kullanabiliyor; geriye dönük uyum için bırakıldı.
 * Kaldırırsak: SW ve eski linkler bozulur; get_data.php'ye yönlendirilmeli.
 */
require_once __DIR__ . '/get_data.php';
