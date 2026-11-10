import type { Metadata } from "next";
import { Anton, Montserrat } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-face",
});

const body = Montserrat({
  subsets: ["latin"],
  variable: "--font-body-face",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "DESAFIOS REAIS",
    template: "%s · DESAFIOS REAIS",
  },
  description:
    "O SEU DESAFIO. A SUA HISTÓRIA. Plataforma brasileira de entretenimento competitivo.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "DESAFIOS REAIS",
    description: "O SEU DESAFIO. A SUA HISTÓRIA.",
    images: [{ url: "/brand/kart-racing.png" }],
  },
  icons: {
    icon: "/brand/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} font-body antialiased bg-racing text-white`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
