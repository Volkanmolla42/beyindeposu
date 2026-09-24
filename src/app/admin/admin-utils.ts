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
  renault: "/images/brands/renault.svg",
  volkswagen: "/images/brands/volkswagen.svg",
  vw: "/images/brands/volkswagen.svg",
  "mercedes-benz": "/images/brands/mercedes-benz.svg",
  mercedes: "/images/brands/mercedes-benz.svg",
  bmw: "/images/brands/bmw.svg",
  audi: "/images/brands/audi.svg",
  ford: "/images/brands/ford.svg",
  peugeot: "/images/brands/peugeot.svg",
  citroen: "/images/brands/citroen.svg",
  "citroën": "/images/brands/citroen.svg",
  fiat: "/images/brands/fiat.svg",
  opel: "/images/brands/opel.svg",
  seat: "/images/brands/seat.svg",
  skoda: "/images/brands/skoda.svg",
  "škoda": "/images/brands/skoda.svg",
  toyota: "/images/brands/toyota.svg",
  hyundai: "/images/brands/hyundai.svg",
  honda: "/images/brands/honda.svg",
  nissan: "/images/brands/nissan.svg",
  volvo: "/images/brands/volvo.svg",
  kia: "/images/brands/kia.svg",
  dacia: "/images/brands/dacia.svg",
  "alfa-romeo": "/images/brands/alfa-romeo.svg",
  alfaromeo: "/images/brands/alfa-romeo.svg",
  porsche: "/images/brands/porsche.svg",
  "land-rover": "/images/brands/land-rover.svg",
  landrover: "/images/brands/land-rover.svg",
  jaguar: "/images/brands/jaguar.svg",
  mitsubishi: "/images/brands/mitsubishi.svg",
  chevrolet: "/images/brands/chevrolet.svg",
  chevy: "/images/brands/chevrolet.svg",
  suzuki: "/images/brands/suzuki.svg",
  mini: "/images/brands/mini.svg",
  mazda: "/images/brands/mazda.svg",
  jeep: "/images/brands/jeep.svg",
  iveco: "/images/brands/iveco.svg",
  subaru: "/images/brands/subaru.svg",
  genel: "/images/brands/genel.svg",
  "genel-uyumlu": "/images/brands/genel.svg",
  evrensel: "/images/brands/genel.svg",
  universal: "/images/brands/genel.svg",
  "tum-araclar": "/images/brands/genel.svg",
  "tum-markalar": "/images/brands/genel.svg",
  "coklu-uyumlu": "/images/brands/genel.svg",
  diger: "/images/brands/genel.svg",
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
