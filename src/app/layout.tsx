import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthProvider";
import { AlertProvider } from "../context/AlertContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "WFX Energy",
  description: "Sistema de Orçamentos com Next.js e Firebase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        {/* 🔹 Adiciona metadados automaticamente */}
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <AuthProvider>
          <AlertProvider>
            {children}
            </AlertProvider>
        </AuthProvider>

        {/* 🔹 Rodapé sempre fixo no final */}
        {/* <footer className="text-center">
          © 2025 - Todos os direitos reservados
        </footer> */}
      </body>
    </html>
  );
}
