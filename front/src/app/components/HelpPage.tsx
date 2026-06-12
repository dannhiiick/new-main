import { useState } from 'react';
import { ChevronDown, MessageCircle, Mail } from 'lucide-react';

const FAQ = [
  { q: 'Как начать слушать музыку?', a: 'Откройте раздел «Треки» или «Главная» и нажмите на любой трек. Плеер внизу экрана автоматически начнёт воспроизведение.' },
  { q: 'Как создать плейлист?', a: 'Функция создания плейлистов доступна в разделе «Плейлисты». Нажмите «Создать плейлист» и добавьте любимые треки.' },
  { q: 'Как купить билет на концерт?', a: 'Перейдите в раздел «События», выберите интересующий концерт и нажмите «Купить». Вы будете перенаправлены на страницу покупки билетов.' },
  { q: 'Почему трек не воспроизводится?', a: 'Убедитесь, что трек доступен на платформе и имеет аудиофайл. Некоторые треки могут быть недоступны в вашем регионе.' },
  { q: 'Как изменить настройки аккаунта?', a: 'Перейдите в раздел «Настройки» через меню профиля в верхнем правом углу.' },
];

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Часто задаваемые вопросы
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  {item.q}
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Чат поддержки</p>
              <p className="text-xs text-muted-foreground">Получите ответ в течение 2 часов</p>
              <button className="mt-3 text-xs text-primary hover:underline">Написать →</button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</p>
              <p className="text-xs text-muted-foreground">support@qmusic.kz</p>
              <a href="mailto:support@qmusic.kz" className="mt-3 text-xs text-accent hover:underline block">Отправить письмо →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
