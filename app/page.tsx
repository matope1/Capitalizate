import type { Metadata } from "next";
import { CapitalGame } from "@/components/CapitalGame";

export const metadata: Metadata = {
  title: "Capitalízate — Aprende las capitales del mundo",
  description: "Un juego educativo de geografía para explorar el mapa y aprender las capitales de 195 países, a tu ritmo.",
};

export default function HomePage() {
  return <CapitalGame />;
}
