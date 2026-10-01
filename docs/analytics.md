# Analitik

Yönetim ekranı: `/admin/analytics`. İlk ölçümden önceki trafik bu sisteme aktarılamaz.

## Ölçüm

Mevcut Convex veritabanında aylık/günlük toplamlar, aylık/günlük sıralamalar ve sayfalı oturum hareketleri tutulur. Yönetim raporu "Bugün" veya seçili ay kapsamına alınabilir; kartlar, trafik grafiği, sıralamalar, oturum başlangıçları ve CSV aynı kapsamı kullanır. Günlük sıralamalar bu sürümden itibaren toplanır. Aylık tekil, günlük tekillerin toplamı değildir: tarayıcı-ay üyeliği ile bir kez artırılır. Türkiye günü UTC+3 ile hesaplanır. Ziyaretçi bir insan hesabı değil, izin veren tarayıcıdır. Çerez yenilenmesi/cihaz değişikliği sayımı etkiler. Ret veren ziyaretçiler ölçülmez.

Ürün açılmaları, OEM/parça aramaları, sonuçsuz aramalar, sonuç seçimi, filtre, sayfalama, görsel seçimi, OEM/link kopyalama, görünür ve odakta kullanım süresi, iletişim tıklamaları ve sohbet olayları ölçülür. Arama sayısı önizleme / ilk sayfadaki sonuç sayısıdır; toplam katalog eşleşmesi değildir. Autocomplete ve katalog araması ayrı etkileşimlerdir. Sıralamalar ilk 20 değeri gösterir; CSV aynı toplu raporu dışa aktarır. Oturumların trafik kaynağı/kaba cihaz sınıfı oturum başlangıcından alınır.

Yeni tablolar mevcut ürün/chat kayıtlarını değiştirmez. İndeksli okuma, sayfalama, önceden hesaplanan toplamlar ve toplu gönderim kullanılır. Çok yüksek trafik için günlük/aylık sayaç çatışması ve maliyetler izlenmeli, gerekirse sayaçlar shard edilmelidir. Güvenilir botlar user-agent kontrolüyle dışlanır; bu bir bot tespit garantisi değildir. Oturum başına dakikada 120 olay ve toplam 10.000 olay sınırı vardır. Sunucu IP tabanlı fingerprint oluşturmaz; volumetrik saldırı koruması barındırma katmanında yapılmalıdır.

## Gizlilik

- İzleme yalnızca açık kabulden sonra başlar; ret ve tercih kontrolleri açıklama metni içinde sunulur. Bu, istenen arayüz düzenidir; yayımdan önce rıza panelinin görünürlüğü ve metni hukuk incelemesinde doğrulanmalıdır. Ziyaretçi reddettiğinde site kullanılabilir.
- Önceki koşulsuz GA etiketi kaldırıldı. Yeni ölçüm Google veya reklam SDK’sı yüklemez.
- İzin ve tanımlayıcılar imzalı, HttpOnly, SameSite=Lax çerezdir; HTTPS’te Secure kullanılır. Rastgele tanımlayıcıların HMAC karşılığı tutulur. Hesap/chat kimliği ile bağlantı kurulmaz.
- 90 günlük tarayıcı tanımlayıcısı sona erdiğinde geçerli analitik rızası varsa yeni tanımlayıcı oluşturulur; oturum sıfırlanır. Değişmeden kaydedilen kabul tercihi mevcut oturumu bölmez.
- Consent sürümü ve zamanı ölçüm oturumunda tutulur. Ret halinde kuyruk atılır; sunucu da izinsiz olayları reddeder. DNT/GPC sinyali ölçümü engeller.
- URL parametreleri, IP, tam referrer, iletişim metni ve form içeriği saklanmaz. Aramalar iki tarafta temizlenir, VIN/telefon/kimlik biçimleri gizlenir; serbest metin backend’de katalog terimleriyle sınırlanır. Bilinmeyen uygun parça kodları talep analizi için tutulur. Filtre değerleri katalog/sabit seçeneklerle doğrulanır.
- Rıza geri alma, mevcut tarayıcının olay/oturum/tekil üyelik kayıtlarını silme kuyruğuna alır. Silme mezar taşı, bekleyen toplama isteklerinin veriyi yeniden eklemesini engeller. Anonim toplu sayaçlar korunur. Bağlantı hatasında tekrar silme için HttpOnly makbuz çerezi tutulur.
- Ham kayıtlar 90 gün, özetler 400 gün. Temizlik altı saatte bir başlar ve 200 kayıtlık parçalarla devam eder. Barındırma/Convex erişim logları ve yedeklerinin yaşam döngüsü bu uygulama tablosu temizliğinden ayrıdır.
- Yönetim sorgularında mevcut `requireAdmin` uygulanır; kullanıcı kayıt olma kapalıdır. Herkese açık ingest/erasure mutasyonları ayrıca yalnızca sunucunun bildiği sırla çağrılabilir. İstemci sır alamaz.

## Yayına alma koşulları

Ölçüm yalnızca kullanıcı açıkça izin verdikten sonra başlar. Kod derlemesi yasal uygunluk belgesi değildir.

1. Veri sorumlusunun resmi ticari unvanı, başvuru yöntemi, işleme envanteri, Convex veri bölgesi/alt işleyenleri ve sözleşmeleri doğrulanmalı; `/gizlilik` metni bunlara göre tamamlanmalıdır. Mevcut metin yalnızca analitik kapsamını açıklar; canlı destek/diğer işleme faaliyetleri ayrıca ele alınmalıdır.
2. Yurt dışı işleme varsa KVKK m.9 kapsamındaki uygun aktarım dayanağı tamamlanmalıdır. Rutin analitik aktarımı yalnızca çerez rızasına dayandırılamaz. Gerekli standart sözleşme/bildirim işlemleri ayrıca yürütülür.
3. Kullanıcıdan açık Convex **üretim dağıtım onayı** alınmalı. Schema, fonksiyonlar ve cron üretime bu onaydan sonra dağıtılır. Geliştirme deployment'ında derleme/dağıtım doğrulandı; üretimde deploy veya env değişikliği yapılmadı.
4. Onaylı ortamda Next.js ile Convex’e aynı en az 32 karakterli rastgele `ANALYTICS_INGEST_SECRET` verilir. Next.js `NEXT_PUBLIC_CONVEX_URL` aynı deployment’a işaret etmelidir. Sır hiçbir zaman istemci ortamına/repoya yazılmaz.
5. Staging’de ret/kabul/geri alma, çoklu sekme, sayfa geçişi, arama, gece/gün/ay sınırı, silme ve süre dolumu doğrulanır. Onay olmadan production’a örnek trafik gönderilmez.

## Kaynaklar

- [KVKK Çerez Uygulamaları Hakkında Rehber, Temmuz 2025](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber)
- [KVKK Yurt Dışına Aktarım Rehberi](https://www.kvkk.gov.tr/Icerik/8142/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi)
- [KVKK standart sözleşmeler](https://www.kvkk.gov.tr/Icerik/7938/Standart-Sozlesmeler-ve-Baglayici-Sirket-Kurallarina-Iliskin-Dokumanlar-Hakkinda-Kamuoyu-Duyurusu)
- [PostHog veri toplama ve gizlilik kontrolleri](https://posthog.com/docs/privacy) karşılaştırıldı; yeni sağlayıcı eklemek yerine mevcut Convex seçildi.
- Kurulu Next.js analitik, usePathname ve route-handler rehberleri okundu.

## Doğrulama

36 test; izinsiz toplama, imzalı çerezler, gerçek Host ile Origin kontrolü, GPC/bot hariç tutma, kişisel arama girdilerinin gizlenmesi, günlük/aylık tekil sayım, yanıt kaybolduğunda yeni oturumla tekrar gönderim, kesin oturum sınırı, çerez süresi dolumu, erişim kontrolü, birden fazla silme/retention grubu, rapor kapsamı, zaman aşımı, rıza geri almada istek iptali ve eski isteğin yeni tercihi etkilememesi kapsandı. Gizli/odaksız süre ve yinelenen ayrılma olayları ölçüm dışında tutulur. Lint, TypeScript ve Next.js production build doğrulandı. Convex geliştirme dağıtımı başarılı; üretim trafiğiyle doğrulama yapılmadı.

1 Ekim 2026 incelemesinde Next.js/eslint-config-next 16.3.8, Sharp 0.35.4 ve etkilenen geçişli geliştirme bağımlılıkları güncellendi. Kullanılmayan `@next/third-parties` kaldırıldı. `npm audit` sıfır açık bildirdi. Bu, kurulu bağımlılıkların o tarihteki bilinen açık denetimidir.
