import type { Metadata } from "next";
import { getSiteContactSettings } from "@/lib/services-data";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni, Çerez ve Gizlilik Politikası",
  description:
    "Beyin Deposu kişisel verilerin korunması (KVKK), canlı destek, iletişim ve çerez/analitik aydınlatma metni.",
};

export default async function PrivacyPage() {
  const contact = await getSiteContactSettings();
  const address = contact.address;
  const email = contact.email;
  const phone = contact.phoneNumber;

  return (
    <article className="container max-w-3xl space-y-8 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="text-3xl font-medium text-slate-900">
        KVKK Aydınlatma Metni ve Gizlilik Politikası
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">1. Veri sorumlusu ve kapsam</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) m. 10 uyarınca Veri Sorumlusu
          sıfatıyla <strong>Beyin Deposu Oto Elektronik ve Kontrol Üniteleri Servisi</strong>{" "}
          (Adres: {address || "İletişim sayfasında belirtilen merkez adresi"}, E-posta:{" "}
          {email || "info@beyindeposu.com"}, Tel: {phone || "İletişim hattı"}) olarak; canlı
          destek, telefon/WhatsApp danışma hattı, servis/parça talepleri ve isteğe bağlı analitik
          ölçüm süreçlerinde işlenen kişisel verileriniz hakkında sizi bilgilendiriyoruz.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">
          2. Canlı destek ve iletişim süreçlerinde işlenen veriler
        </h2>
        <p>
          Sitemizdeki Canlı Destek penceresini açıp mesaj gönderdiğinizde; isteğe bağlı paylaştığınız{" "}
          <strong>ad soyad</strong>, <strong>telefon numarası</strong>,{" "}
          <strong>mesaj içeriğiniz</strong>, incelediğiniz parça bilgisi ve sohbet oturumunun
          sürdürülmesi için tarayıcınızda oluşturulan rastgele ziyaretçi kimliği (
          <code>beyindeposu_visitor_id</code>) işlenir. Canlı destek penceresini açmadığınız sürece
          tarayıcınıza canlı destek kimliği kaydedilmez.
        </p>
        <p>
          <strong>Hukuki sebep ve saklama süresi:</strong> Bu veriler, parça uyumluluk kontrolü,
          fiyat/stok bilgisi verilmesi ve arıza/onarım taleplerinizin yanıtlanması amacıyla KVKK m.
          5/2-c (bir sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması) ve m. 5/2-f
          (meşru menfaat) hukuki sebeplerine dayanarak işlenir. Son mesaj tarihinden itibaren{" "}
          <strong>180 gün</strong> boyunca hareketsiz kalan canlı destek konuşmaları ve mesajları
          otomatik olarak silinir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">3. İsteğe bağlı analitik ve çerezler</h2>
        <p>
          Beyin Deposu, kataloğunu ve site kullanımını iyileştirmek için yalnızca açık rıza veren
          ziyaretçilerin kullanım hareketlerini ölçer. İzin vermek siteyi kullanmanın şartı değildir.
          Sayfa ve ürün açılmaları, katalogda aranan parça/OEM terimleri, sonuç bulunamaması,
          kullanılan filtreler, katalog sayfalama, görsel seçimi ve yakınlaştırma, OEM ve bağlantı
          kopyalama, aktif süre, WhatsApp/telefon/e-posta tıklamaları ve sohbet açma/başlatma/mesaj
          gönderme sayıları ile kaba cihaz sınıfı ve trafik kaynağı kategorisi ölçülür.
        </p>
        <p>
          İsim, telefon, e-posta, sohbet veya form içeriği, şasi numarası (VIN), hesap kimliği, tam
          yönlendiren adres, URL sorgu parametreleri ve hassas girdi içerikleri analitik kaydına
          eklenmez. Tanınmayan serbest metin aramalar gizlenir; doğrulanan katalog terimleri ve
          uygun parça kodları tutulur. Analitik veritabanına IP adresi yazılmaz.
        </p>
        <p>
          <strong>Saklama ve silme:</strong> Analitik için hukuki sebep açık rızanızdır (KVKK m.
          5/1). Kabul ve ret tercihiniz 180 gün saklanır. Analitik tanımlayıcı çerez 90 gün, oturum
          çerezi son ölçümden itibaren 30 dakika geçerlidir. Hareketler, oturumlar ve tekil sayım
          kayıtları 90 gün; kişi tanımlayıcısı içermeyen istatistik toplamları en fazla 400 gün
          saklanır. Alt bilgideki “Çerez tercihleri” bağlantısından izninizi dilediğiniz an geri
          alabilir ve mevcut tarayıcınıza ait analitik kayıtlarının silinmesini sağlayabilirsiniz.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">
          4. Üçüncü taraf hizmetler ve yurt dışı veri aktarımı
        </h2>
        <p>
          Canlı destek ve analitik verileri, site sunucusu üzerinden bulut veritabanı sağlayıcımız{" "}
          <strong>Convex Inc.</strong> altyapısında işlenir. Analitik sistemi Google Analytics veya
          reklam ağlarına veri göndermez. İletişim sayfasındaki harita görünümü{" "}
          <strong>Google Haritalar (Google Ireland / Google LLC)</strong> üzerinden yüklendiğinden
          bu sayfayı ziyaret ettiğinizde tarayıcınız Google sunucularıyla bağlantı kurar; WhatsApp
          bağlantılarına tıklamanız halinde ise kendi tercihinizle WhatsApp (Meta) uygulamasına
          yönlendirilirsiniz. Yurt dışı sunucu altyapısı kullanımları KVKK m. 9 hükümleri
          çerçevesinde yürütülür.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">
          5. KVKK Madde 11 kapsamındaki haklarınız ve başvuru
        </h2>
        <p>
          6698 sayılı Kanun’un 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini
          öğrenme, bilgi talep etme, işleme amacını ve aktarılan tarafları öğrenme, eksik veya
          yanlış işlenmişse düzeltilmesini, işlenmesini gerektiren sebeplerin ortadan kalkması
          halinde silinmesini veya yok edilmesini isteme haklarına sahipsiniz. Taleplerinizi
          aşağıdaki adres veya e-posta üzerinden bize iletebilirsiniz; başvurularınız en geç 30
          (otuz) gün içinde ücretsiz olarak sonuçlandırılır.
        </p>
        <p>
          Beyin Deposu · {address}
          <br />
          İletişim:{" "}
          <a className="text-amber-600 underline hover:text-amber-700" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      </section>

      <p className="text-xs text-slate-500">Metin sürümü: 29 Ekim 2026</p>
    </article>
  );
}
