# XSS / DOM ekleme noktaları kontrol listesi

Kullanıcı veya veri katmanından gelen verinin DOM'a (innerHTML, insertAdjacentHTML, attribute) yazıldığı yerler. Faz 1'de işaretlenenler düzeltildi.

## app.js

| Satır (yaklaşık) | Konum | Veri | Durum |
|------------------|--------|------|--------|
| 665–671 | balanceSourceModal | `msg` | Manuel escape (< >) – OK |
| 740–755 | quickAccessGrid | person, displayName | sanitizeHTML / attr kaçış – OK |
| 970 | populateCategorySelect | option `${c}` (kategori) | **Faz 1 artık:** value attr kaçış + sanitizeHTML(c) – OK |
| 1282–1297 | balance-breakdown | person, netLabel | **Faz 1'de düzeltildi** (sanitizeHTML) |
| 1419, 1508, 1513 | transactionHistory, kategori detay tablo | t.category, t.description | sanitizeHTML – OK |
| 1470–1472 | category-item | showCategoryDetails('${safeCat}'), kategori adı | **Faz 1'de düzeltildi** (category-name: sanitizeHTML(c)) |
| 1590 | allocation popup | kategori | sanitizeHTML(cat) – OK |
| 1785 | allocation popup HTML | person, amount | Sabit şablon; veri sadece JS’te – OK |
| 2497 | bildirim öğesi | notif.message | sanitizeHTML – OK |
| 2593–2624 | rapor önizleme listesi | t.description, t.category | sanitizeHTML – OK |
| 3707–3723 | showGeneralStatusReport | c.name, d.name | **Faz 1'de düzeltildi** (sanitizeHTML) |
| 3769 | reportContent (Genel Durum) | Yukarıdaki düzeltmeyle kapatıldı | OK |
| 3295, 3366, 3372, 3398, 3405, 3431 | Bellek overlay mesajları | Sabit metin | Düşük risk |
| 4114, 4119 | Düzenle/Sil buton metni | Sabit HTML | OK |
| 4675 | Siri/voice person display | this.value (kişi adı) | **Faz 1'de düzeltildi** (sanitizeHTML) |
| 4630, 4637 | Import/restore modal | desc, person | sanitizeHTML – OK |

## kasa.js

| Satır (yaklaşık) | Konum | Veri | Durum |
|------------------|--------|------|--------|
| 146, 181, 217, 228 | İşlem listesi, kategoriler | Kategori / işlem verisi | **Faz 1 artık:** sanitizeHTML(k) – OK |
| 349, 496, 543 | Düzenle modal, kategori detay | Kategori adı, işlem alanları | **Faz 1 artık:** aciklama, kategoriAdi sanitize – OK |

---

*Son güncelleme: Faz 1 + Faz 1 artıkları (reportSearchInput label, option sanitize, kasa.js XSS).*
