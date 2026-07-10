import { useState } from 'react';
import { ChevronDown, MessageCircle, Mail, Send, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from './i18n';

const FAQ = [
  { q: 'Как начать слушать музыку?', a: 'Откройте раздел «Треки» или «Главная» и нажмите на любой трек. Плеер внизу экрана автоматически начнёт воспроизведение.' },
  { q: 'Как создать плейлист?', a: 'Функция создания плейлистов доступна в разделе «Плейлисты». Нажмите «Создать плейлист» и добавьте любимые треки.' },
  { q: 'Как купить билет на концерт?', a: 'Перейдите в раздел «События», выберите интересующий концерт и нажмите «Купить». Вы будете перенаправлены на страницу покупки билетов.' },
  { q: 'Почему трек не воспроизводится?', a: 'Убедитесь, что трек доступен на платформе и имеет аудиофайл. Некоторые треки могут быть недоступны в вашем регионе.' },
  { q: 'Как изменить настройки аккаунта?', a: 'Перейдите в раздел «Настройки» через меню профиля в верхнем правом углу.' },
];

export function HelpPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setShowForm(false);
      }, 2500);
    }, 1500);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Часто задаваемые вопросы
          </h2>
          <div className="flex flex-col gap-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-foreground hover:bg-secondary transition-colors text-left cursor-pointer"
                >
                  {item.q}
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted-foreground transition-transform ${open === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Чат поддержки</p>
              <p className="text-xs text-muted-foreground">Получите ответ в течение 2 часов</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs text-primary hover:underline cursor-pointer font-medium"
              >
                Написать →
              </button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Email</p>
              <p className="text-xs text-muted-foreground">support@qmusic.kz</p>
              <a href="mailto:support@qmusic.kz" className="mt-3 text-xs text-accent hover:underline block font-medium">Отправить письмо →</a>
            </div>
          </div>
        </div>
      </div>

      {/* Support Form Modal */}
      {showForm && (
        <div
          onClick={() => !sending && setShowForm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setShowForm(false)}
              disabled={sending}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>

            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {t('write_us')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('contact_text')}</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-medium text-muted-foreground">{t('subject')}</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Вопрос по подписке / ошибка"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-medium text-muted-foreground">{t('message')}</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Опишите вашу проблему..."
                    rows={4}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Отправка...' : <><Send size={13} /> {t('send')}</>}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Сообщение отправлено!
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    Мы получили ваше обращение и ответим на него в ближайшее время. Спасибо за связь с нами!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
