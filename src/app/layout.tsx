import type { Metadata } from 'next';
import { Poppins, EB_Garamond } from 'next/font/google';
import './globals.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['300','400','500','600'], variable: '--font-poppins', display: 'swap' });
const garamond = EB_Garamond({ subsets: ['latin'], variable: '--font-garamond', display: 'swap' });
import { ToastViewport } from '@/components/ui/ToastViewport';

export const metadata: Metadata = {
  title: 'Josenildson Ferreira Advogados · Gerador de Documentos',
  description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
  openGraph: {
    title: 'Josenildson Ferreira Advogados · Gerador de Documentos',
    description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Josenildson Ferreira Advogados · Gerador de Documentos',
    description: 'Sistema de emissão e gestão do kit de documentos previdenciários em formato DOCX com histórico e retenção de 1 ano.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${garamond.variable}`}>
      <body suppressHydrationWarning>
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
