# sahsicari Deployment Rehberi

Bu uygulama `public_html/sahsicari` altında yayınlanmalıdır.
Diğer siteler/klasörler etkilenmez.

## Canlı Erişim Adresi

- Ana adres: `https://zelda.veridyen.com/sahsicari/`

## Kurulum (cPanel)

### Seçenek A: cPanel Git (önerilen)

1. cPanel -> `Git Version Control`
2. Repo path: `/home/karmotor/public_html/sahsicari`
3. Branch: `main`
4. `Update from Remote`
5. `Deploy HEAD Commit`

Bu repo içinde `.cpanel.yml` bulunduğu için deploy görevleri otomatik uygulanır.

### Seçenek B: File Manager / manuel kopya

- Kod dosyalarını `public_html/sahsicari/` altına kopyala.
- Veri dosyalarını ezme.

## Kritik Veri Dosyaları (EZME)

Aşağıdakiler canlı veridir, deploy sırasında korunmalıdır:

- `veriler.json`
- `kd_veriler.json`
- `backups/`
- `kd_backups/`

## .cpanel.yml Notu

Bu projedeki `.cpanel.yml` kod dosyalarını deploy eder; veri yedek klasörlerini taşımaz.

Hedef path:
- `/home/karmotor/public_html/sahsicari`

## İzinler

- PHP dosyaları: `644`
- Klasörler: `755`
- Veri dosyaları (`veriler.json`, `kd_veriler.json`): `644` veya gerekiyorsa `664`

## Hızlı Kontrol Listesi

1. `https://zelda.veridyen.com/sahsicari/` açılıyor mu?
2. Yeni kayıt ekleniyor mu?
3. Sunucuda `backups/` içinde yeni `veriler_YYYY-MM-DD_HH-MM-SS.json` oluşuyor mu?
4. Sağ alttaki durum metni hata veriyorsa log/cPanel error log kontrol edildi mi?

## Sık Sorunlar

### 1) Deploy sonrası eski ekran görünüyor
- Tarayıcı cache + service worker temizle
- Sayfayı hard refresh yap (`Ctrl+F5`)

### 2) Kayıt var ama yedek yok
- `save.php` write/permission kontrol et
- `backups` klasörü yazılabilir mi kontrol et

### 3) cPanel Git merge hatası
- `untracked working tree files would be removed by merge` görürsen çakışan yerel dosyayı silip tekrar `Update from Remote` yap