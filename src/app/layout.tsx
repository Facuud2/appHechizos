import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PwaProvider } from "@/providers/PwaProvider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Altar & Hechizos — Grimorio Personal",
  description:
    "Tu grimorio holístico instantáneo para celular, tablet y PC: hechizos, variaciones, paso a paso multimedia, stock y catálogo sincronizado.",
  applicationName: "Altar & Hechizos",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hechizos",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0F16" },
  ],
};

// Synchronous pre-paint script: defaults to vivid Light Mode unless user chose dark or system
const THEME_INIT_SCRIPT = `(function(){try{var k='altar-theme-v1';var p=localStorage.getItem(k)||'light';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${outfit.variable} ${dmSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased selection:bg-accent-soft selection:text-ink">
        <ThemeProvider>
          <PwaProvider>
            <QueryProvider>{children}</QueryProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
