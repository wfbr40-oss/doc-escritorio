import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gerador de Documentos Previdenciários',
  description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
  openGraph: {
    title: 'Gerador de Documentos Previdenciários',
    description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gerador de Documentos Previdenciários',
    description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
