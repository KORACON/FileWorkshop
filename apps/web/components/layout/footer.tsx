import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-small text-txt-muted">
            <Image src="/logo.png" alt="" width={20} height={20} className="rounded" />
            © {new Date().getFullYear()} Мастерская файлов
          </div>
          <nav className="flex gap-4">
            <Link href="/pricing" className="text-small text-txt-muted hover:text-txt-base transition-colors">Тарифы</Link>
            <Link href="/tools" className="text-small text-txt-muted hover:text-txt-base transition-colors">Инструменты</Link>
            <Link href="/privacy" className="text-small text-txt-muted hover:text-txt-base transition-colors">Конфиденциальность</Link>
            <Link href="/terms" className="text-small text-txt-muted hover:text-txt-base transition-colors">Условия</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
