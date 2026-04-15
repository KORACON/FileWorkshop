'use client';

import { UniversalDropzone } from '@/components/tools/universal-dropzone';
import { Footer } from '@/components/layout/footer';
import { FadeIn } from './fade-in';
import { ScrollReveal } from './scroll-reveal';
import { TrustBar } from './trust-bar';
import { BenefitsSection } from './benefits-section';
import { AboutSection } from './about-section';
import { HowItWorks } from './how-it-works';
import { CategoriesSection } from './categories-section';
import { CtaSection } from './cta-section';

interface Props {
  onFileSelect: (file: File) => void;
}

export function LandingPage({ onFileSelect }: Props) {
  return (
    <div>
      {/* ══ Hero ══ */}
      <section className="pt-10 pb-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-6">
              <h1 className="text-hero font-display text-txt-strong mb-3">
                Мастерская файлов
              </h1>
              <p className="text-body text-txt-muted max-w-lg mx-auto leading-relaxed">
                Конвертируйте, сжимайте и обрабатывайте файлы в одном рабочем пространстве.
                Без установки программ, без рекламы.
              </p>
            </div>
          </FadeIn>

          {/* Большой dropzone */}
          <FadeIn delay={0.12}>
            <UniversalDropzone onFileSelect={onFileSelect} />
          </FadeIn>

          {/* 3 шага под dropzone */}
          <FadeIn delay={0.2}>
            <div className="mt-6 flex items-center justify-center gap-3 text-caption text-txt-faint">
              <Step num="1" text="Загрузите файл" />
              <Arrow />
              <Step num="2" text="Выберите действие" />
              <Arrow />
              <Step num="3" text="Скачайте результат" />
            </div>
          </FadeIn>

          {/* Форматы */}
          <FadeIn delay={0.28}>
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {['JPG', 'PNG', 'WEBP', 'PDF', 'DOCX', 'SVG', 'HEIC', 'AVIF', 'TIFF', 'GIF'].map((f) => (
                <span key={f} className="badge badge-neutral">{f}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <TrustBar />
      <BenefitsSection />
      <HowItWorks />
      <AboutSection />
      <CategoriesSection />
      <CtaSection />
      <Footer />
    </div>
  );
}

function Step({ num, text }: { num: string; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 h-5 bg-accent-100 text-accent-dark rounded-full flex items-center justify-center text-micro font-bold">
        {num}
      </span>
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="8" viewBox="0 0 16 8" fill="none" stroke="#8E9DAD" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0">
      <path d="M1 4h14M12 1l3 3-3 3" />
    </svg>
  );
}
