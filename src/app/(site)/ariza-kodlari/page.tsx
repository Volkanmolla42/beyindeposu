import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import FaultCodesClient from "./FaultCodesClient";

export const metadata: Metadata = {
  title: "OBD Arıza Kodları ve Anlamları | Beyin Deposu",
  description:
    "Aracınızın motor, şanzıman, ABS ve airbag OBD-II arıza kodlarını öğrenin. P, C, B, U kodlarının anlamları, olası nedenleri ve profesyonel çözüm yolları.",
  openGraph: {
    title: "OBD Arıza Kodları ve Anlamları | Beyin Deposu",
    description:
      "Aracınızın OBD-II arıza kodlarını öğrenin, anlamlarını keşfedin, doğru oto elektronik çözümlerine ulaşın.",
    images: ["/images/obd-scanner-hero.jpg"],
  },
};

async function getFaultCodes() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  return await new ConvexHttpClient(convexUrl).query(api.faultCodes.listPublic, {});
}

export default async function FaultCodesPage() {
  const codes = await getFaultCodes();
  return <FaultCodesClient codes={codes} />;
}
