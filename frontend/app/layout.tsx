import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Saarthi Voice", description: "A voice-first digital guide for India" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
