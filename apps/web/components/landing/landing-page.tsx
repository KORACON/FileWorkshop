'use client';

import { UniversalDropzone } from '@/components/tools/universal-dropzone';
import { Footer } from '@/components/layout/footer';
import { FadeIn } from './fade-in';
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
      {/* ── Hero ── */}
      <section className="pt-12 pb-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-8">
              <h1 className="text-hero text-txt-strong mb-3">
                Мастерская файлов
              </h1>
              <p className="text-body text-txt-muted max-w-md mx-auto">
                Конвертируйте, сжимайте и обрабатывайте файлы в одном рабочем пространстве.
                Без установки программ.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <UniversalDropzone onFileSelect={onFileSelect} />
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {['JPG', 'PNG', 'WEBP', 'PDF', 'DOCX', 'SVG', 'HEIC', 'AVIF', 'TIFF', 'GIF'].map((f) => (
                <span key={f} className="badge badge-neutral">{f}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <TrustBar />

      {/* ── Benefits ── */}
      <BenefitsSection />

      {/* ── How it works ── */}
      <HowItWorks />

      {/* ── About ── */}
      <AboutSection />

      {/* ── Categories ── */}
      <CategoriesSection />

      {/* ── CTA ── */}
      <CtaSection />

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
