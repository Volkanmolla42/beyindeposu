// Turkish-aware URL slug generator
export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return text
    .split("")
    .map((c) => trMap[c] || c)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Local codebase brand SVGs map
export const LOCAL_BRAND_LOGOS: Record<string, string> = {
  renault: "/images/brands/renault.webp",
  volkswagen: "/images/brands/volkswagen.webp",
  vw: "/images/brands/volkswagen.webp",
  "mercedes-benz": "/images/brands/mercedes-benz.webp",
  mercedes: "/images/brands/mercedes-benz.webp",
  bmw: "/images/brands/bmw.webp",
  audi: "/images/brands/audi.webp",
  ford: "/images/brands/ford.webp",
  peugeot: "/images/brands/peugeot.webp",
  citroen: "/images/brands/citroen.webp",
  "citroën": "/images/brands/citroen.webp",
  fiat: "/images/brands/fiat.webp",
  opel: "/images/brands/opel.webp",
  seat: "/images/brands/seat.webp",
  skoda: "/images/brands/skoda.webp",
  "škoda": "/images/brands/skoda.webp",
  toyota: "/images/brands/toyota.webp",
  hyundai: "/images/brands/hyundai.webp",
  honda: "/images/brands/honda.webp",
  nissan: "/images/brands/nissan.webp",
  volvo: "/images/brands/volvo.webp",
  kia: "/images/brands/kia.webp",
  dacia: "/images/brands/dacia.webp",
  "alfa-romeo": "/images/brands/alfa-romeo.webp",
  alfaromeo: "/images/brands/alfa-romeo.webp",
  porsche: "/images/brands/porsche.webp",
  "land-rover": "/images/brands/land-rover.webp",
  landrover: "/images/brands/land-rover.webp",
  jaguar: "/images/brands/jaguar.webp",
  mitsubishi: "/images/brands/mitsubishi.webp",
  chevrolet: "/images/brands/chevrolet.webp",
  chevy: "/images/brands/chevrolet.webp",
  suzuki: "/images/brands/suzuki.webp",
  mini: "/images/brands/mini.webp",
  mazda: "/images/brands/mazda.webp",
  jeep: "/images/brands/jeep.webp",
  iveco: "/images/brands/iveco.webp",
  subaru: "/images/brands/subaru.webp",
  genel: "/images/brands/genel.webp",
  "genel-uyumlu": "/images/brands/genel.webp",
  evrensel: "/images/brands/genel.webp",
  universal: "/images/brands/genel.webp",
  "tum-araclar": "/images/brands/genel.webp",
  "tum-markalar": "/images/brands/genel.webp",
  "coklu-uyumlu": "/images/brands/genel.webp",
  diger: "/images/brands/genel.webp",
};



// Subtle audio chime for new incoming chat message
export function playAdminNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore restricted audio
  }
}
