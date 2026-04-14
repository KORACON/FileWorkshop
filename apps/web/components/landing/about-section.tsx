'use client';

import { ScrollReveal } from './scroll-reveal';

export function AboutSection() {
  return (
    <section className="section-soft">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="card p-8 sm:p-10 text-center">
            <h2 className="text-h1 font-display text-txt-strong mb-4">О программе</h2>
            <div className="space-y-3 text-body text-txt-base leading-relaxed">
              <p>
                <span className="font-semibold text-txt-strong">«Мастерская файлов»</span> — это веб-приложение
                для повседневной работы с файлами: изображениями, PDF и документами.
              </p>
              <p>
                Сервис нужен тем, кто регулярно сталкивается с простыми, но частыми задачами:
                изменить размер изображения, сжать файл, конвертировать формат,
                подготовить документ к отправке или собрать результат в удобный вид.
              </p>
              <p className="text-txt-muted">
                Главная идея — убрать хаос. Вместо десятков сайтов, перегруженных интерфейсов
                и случайных инструментов вы получаете одно понятное рабочее пространство.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
