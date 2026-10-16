# sahsicari Deployment Rehberi

Bu uygulama `public_html/sahsicari` altında yayınlanmalıdır.
Diğer siteler/klasörler etkilenmez.

## Canlı Erişim Adresi

- Ana adres: `https://karmotors.com.tr/sahsicari/`

## Kurulum (cPanel)

### Seçenek A: FTP (canlı veri için güvenli yol)

GitHub Actions (`.github/workflows/deploy.yml`) kodu FTP ile atar.
`veriler.json`, `kd_veriler.json`, `auth_config.php` ve yedek JSON'lar exclude'dadır; deploy bunları silmez.
`backups/.htaccess` ve `kd_backups/.htaccess` kodla birlikte gider.

### Seçenek B: cPanel Git — canlı klasörü repo yapma

`.cpanel.yml` yalnız kod dosyalarını `cp` ile kopyalar. Canlı JSON'u silen adım budur diye değil, **git çalışma kopyası canlı klasörün kendisiyse** silinir.

`kd_veriler.json` ve `veriler.json` repodan çıkarıldı. cPanel Git Version Control repo yolu `public_html/sahsicari` ise `Update from Remote` bu dosyaları diskten kaldırır. Yedekler de aynı şekilde gider.

Bunu kullanacaksan:

1. Repo yolunu canlı klasörün **dışına** al (örnek: `/home/karmotor/repositories/sahsicari`).
2. `.cpanel.yml` içindeki `DEPLOYPATH` canlı klasör kalsın.
3. `Update from Remote` sonra `Deploy HEAD Commit`.
4. Canlı klasörde elle duran `veriler.json`, `kd_veriler.json`, `auth_config.php` ve yedek JSON'lara dokunma.

Canlı klasör zaten bir git çalışma kopyasıysa yeni deploy'u oraya çekme. FTP yolunu kullan.

### Seçenek C: File Manager / manuel kopya

- Kod dosyalarını `public_html/sahsicari/` altına kopyala.
- Veri dosyalarını ezme.

## İlk parola

Veri API'leri oturumsuz cevap vermez. Sunucuda `auth_config.php` yoksa site ilk açılışta parola belirleme ekranı gösterir. Parolayı deploy'dan hemen sonra koy. Adres dışarıdan erişilebiliyorsa ilk kaydeden o parolayı alır.

Shell varsa, web formunu beklemeden:

```bash
php tools/create-auth-config.php "en-az-10-karakter"
```

`auth_config.php` repoya ve FTP deploy'una girmez. Dosyayı elle silersen giriş kapanır; yenisini hemen yaz.

## Kritik Veri Dosyaları (EZME)

Aşağıdakiler canlı veridir, deploy sırasında korunmalıdır:

- `veriler.json`
- `kd_veriler.json`
- `auth_config.php`
- `backups/*.json`
- `kd_backups/*.json`

## .cpanel.yml Notu

Bu projedeki `.cpanel.yml` kod dosyalarını deploy eder; veri yedek klasörlerini taşımaz.

Hedef path:
- `/home/karmotor/public_html/sahsicari`

## İzinler

- PHP dosyaları: `644`
- Klasörler: `755`
- Veri dosyaları (`veriler.json`, `kd_veriler.json`): `644` veya gerekiyorsa `664`

## Hızlı Kontrol Listesi

1. `https://karmotors.com.tr/sahsicari/` açılıyor mu?
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