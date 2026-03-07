# cPanel Otomatik Deploy Kurulumu (GitHub Actions)

Bu repo, `main` branch'e her push'ta cPanel'e FTP ile deploy olacak sekilde ayarlanmistir.

## 1) Mevcut Workflow

Dosya:
- `.github/workflows/deploy.yml`

Tetikleme:
- `push` -> `main`
- `workflow_dispatch` (GitHub Actions'tan manuel calistirma)

Hedef dizin:
- `/public_html/sahsicari/`

Korunan (sunucuda kalacak) dosyalar:
- `veriler.json`
- `kd_veriler.json`
- `backups/`
- `kd_backups/`

## 2) GitHub Secrets Ekle

GitHub -> Repository -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Asagidaki 4 secret'i ekle:

1. `FTP_SERVER`
- Ornek: `ftp.zelda.veridyen.com`

2. `FTP_USERNAME`
- cPanel FTP kullanici adi

3. `FTP_PASSWORD`
- cPanel FTP sifresi

4. `FTP_PORT`
- Genelde: `21`

## 3) Ilk Calistirma (Test)

1. Repo'ya ufak bir degisiklik pushla (`main`).
2. GitHub -> `Actions` -> `Deploy to cPanel` workflow'unu ac.
3. Job log'unda `FTP Deploy` adiminin `success` oldugunu dogrula.
4. Sunucuda `public_html/sahsicari/` altinda kodun guncellendigini kontrol et.

## 4) Kritik Notlar

- Veri dosyalari bilerek deploy disinda:
  - `veriler.json`
  - `kd_veriler.json`
  - `backups/`
  - `kd_backups/`
- Bu sayede kod guncellenirken canli veri ezilmez.
- `dangerous-clean-slate: false` oldugu icin sunucuda tum klasoru silmez.

## 5) SIK Sorunlar

### A) `530 Login authentication failed`
- `FTP_USERNAME` / `FTP_PASSWORD` yanlis.
- cPanel'de ilgili FTP kullanicisinin aktif oldugunu kontrol et.

### B) `ECONNREFUSED` veya baglanti kurulamiyor
- `FTP_SERVER` veya `FTP_PORT` yanlis.
- Hosting firewall/FTP erisimi kontrol edilmeli.

### C) Dosyalar gitmiyor gibi gorunuyor
- `exclude` listesinde oldugu icin kasten atlanan dosyalar olabilir.
- Job log'unda `uploaded` satirlarini kontrol et.

## 6) Gunluk Kullanim

- Kod degisikligi -> `main`'e push -> otomatik deploy.
- Acil durumda Actions ekranindan `Run workflow` ile manuel deploy.