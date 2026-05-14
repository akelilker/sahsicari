# Sahsicari — kritik akış smoke checklist

**Amaç:** Regresyon riski yüksek 5–6 akışı release / deploy öncesi hızlı elle doğrulamak. Otomatik test altyapısı yok; bu dosya tek kaynak checklist’tir.

**Süre:** ~10–15 dk (veri ortamına göre).

**Ortam:** Gerçek veya staging sunucu + tarayıcı (tercihen mobil + masaüstü biri).

---

## 1. Veri yükleme (`loadData`, `get_data.php`, `loadDataFromServer`)

- [ ] **Normal:** `veriler.json` geçerli. Durum çubuğu / `updateServerStatus` **başarı** veya “Sunucudan yuklendi” benzeri; kişi listesi ve ana toplamlar **dolu**.
- [ ] **Yedek:** Ana dosya bozuk veya yok; sunucu yedekten dönebiliyorsa **“Yedek veriden yuklendi”** (veya eşdeğer) ve veri **tutarlı** görünür.
- [ ] **Metadata-only / boş:** Sunucuda yalnızca `metadata` veya kişi yok. **Yanıltıcı “her şey hazır” hissi yok**; beklenen hata/uyarı metinleri (ör. metadata-only, veri yok) ve gerekirse yerel fallback mesajı görünür.
- [ ] Ağ kesildiğinde: **çevrimdışı / yerel yükleme** mesajı mantıklı; uygulama kilitlenmeden açılır.

*Referans:* `app.js` ~`loadData` / `updateServerStatus`; `get_data.php` üst yorum (ana → yedek → boş).

---

## 2. Kişi modalı sekmeleri (`#personModal`, `openTab`, `initModalSwipe`)

- [ ] Kişi seç → modal aç. **Yeni İşlem** (`#yeniIslem`), **İşlem Geçmişi** (`#islemGecmisi`), **Kategori Durumu** (`#kategoriDurumu`), **Raporlar** (`#raporlar`) sırayla tıkla.
- [ ] Her sekmede **yalnızca bir** `#personModal .tab-content` üzerinde `tab-content--visible` sınıfı aktif; içerik karışmıyor.
- [ ] **Kategori Durumu** sekmesinde liste güncelleniyor; **Raporlar**’da önizleme tetikleniyor (boşsa boş durum kabul).
- [ ] **Mobil:** Modal içinde yatay swipe; sıra `yeniIslem` → `islemGecmisi` → `kategoriDurumu` → `raporlar` (`tabOrder`). Swipe sonrası doğru panel ve aktif sekme butonu.

---

## 3. Hızlı işlem (`processQuickTransaction`, borç dağıtımı)

- [ ] Kişi seçmeden kaydet: **“Kişi seçin”** (veya güncel `VALIDATION_MSG`).
- [ ] Tutar boş / 0 / anlamsız: **“Geçerli bir tutar girin”**.
- [ ] **Gelen** + kişide **çoklu borç** kategorisi: kaydet → **dağıtım overlay** açılır; kapat / onay akışı takılı kalmaz; `disable-events` body’de **takılı kalmaz** (kapatınca).
- [ ] Borç yokken **giden** veya tek borç: kategori zorunluysa **“Kategori seçin”**; başarılı kayıtta bildirim ve liste güncellenir.

---

## 4. İşlem düzenleme (`saveEditedTransaction`)

- [ ] Geçmişten işlem aç → düzenle modal.
- [ ] Tutarı geçersiz yapıp kaydet: **kayıt silinmemeli** (sunucu/önbellekte eski işlem durmalı); hata bildirimi.
- [ ] Geçerli değerlerle kaydet: kayıt **güncellenmiş** görünür; çift kayıt yok.

---

## 5. Menü / overlay (ayarlar, bildirim, renk, bellek)

- [ ] **Ayarlar menüsü:** aç → kapat; backdrop / `disable-events` kalkıyor.
- [ ] **Bildirim menüsü:** aç → kapat; diğer menülerle çakışma yok.
- [ ] **Renk / glow menüsü:** tema seç → kapat; arayüz kullanılabilir.
- [ ] **Bellek / durum overlay** (varsa tetikleyici): aç → kapat veya onay; **arka plan kilidi** ve scroll kilidi **takılı kalmıyor**.

---

## Bilerek dışarıda bırakılanlar

- Siri / sesli kısayol, Excel dışa aktarma detayı, PWA kurulum, kasa modülü (`kasa.js`), Kategori Detay excel, tam senkron çatışma senaryoları, performans yük testi.

## Residual risk

- Elle checklist; insan hatası ve ortam farkları (cache, eski SW) kaçabilir.
- Sunucu yedek dosya adları / izinler production’a özel; staging’de tam yedek senaryosu her zaman mümkün olmayabilir.

## Nerede / nasıl

- Dosya: **`sahsicari/SMOKE-TEST-CHECKLIST.md`**
- Otomatik komut yok; maddeleri sırayla işaretleyerek çalıştır.

*İlgili güvenlik checklist:* `XSS-DOM-insertion-checklist.md`
