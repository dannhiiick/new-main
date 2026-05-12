import { Link } from 'react-router-dom';
import {
  CircleHelp,
  Headphones,
  KeyRound,
  LifeBuoy,
  Mail,
  Music2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import './Help.css';

const faq = [
  {
    question: 'Почему меня отправляет на страницу входа?',
    answer: 'Главная, профиль, настройки и каталог защищены. Создайте аккаунт или войдите, чтобы открыть приложение.',
  },
  {
    question: 'Где меняются профиль и имя в шапке?',
    answer: 'Откройте профиль, заполните имя на сайте, город и описание, затем нажмите сохранить.',
  },
  {
    question: 'Почему трек не играет?',
    answer: 'Проверьте, что backend запущен на 8002, потому что аудио отдается через Django API.',
  },
  {
    question: 'Как попасть в Django admin?',
    answer: 'Откройте /admin на backend и войдите суперпользователем Django.',
  },
];

export function HelpPage() {
  return (
    <div className="help-page">
      <section className="help-hero">
        <div className="help-hero-icon">
          <LifeBuoy size={32} />
        </div>
        <div>
          <h2>Помощь</h2>
          <p>Быстрые ответы по запуску, аккаунту, музыке и админке MoodStream.</p>
        </div>
      </section>

      <section className="help-grid">
        <article className="help-card">
          <div className="help-card-head">
            <Music2 size={22} />
            <h3>Запуск проекта</h3>
          </div>
          <p>Запустите весь стек одной командой из корня проекта.</p>
          <code>.\start-all.ps1</code>
          <div className="help-links">
            <a href="http://127.0.0.1:5173/">Открыть сайт</a>
            <a href="http://127.0.0.1:8002/admin/">Открыть админку</a>
          </div>
        </article>

        <article className="help-card">
          <div className="help-card-head">
            <KeyRound size={22} />
            <h3>Админка</h3>
          </div>
          <p>Если суперпользователь еще не создан, создайте его в терминале.</p>
          <code>.\venv\Scripts\python backend\manage.py createsuperuser</code>
        </article>

        <article className="help-card">
          <div className="help-card-head">
            <ShieldCheck size={22} />
            <h3>Аккаунт</h3>
          </div>
          <p>Профиль и настройки сохраняются в Django API и работают через JWT.</p>
          <div className="help-actions">
            <Link to="/profile">Профиль</Link>
            <Link to="/settings">Настройки</Link>
          </div>
        </article>

        <article className="help-card">
          <div className="help-card-head">
            <Headphones size={22} />
            <h3>Музыка</h3>
          </div>
          <p>В каталоге подключены локальные аудиофайлы, а плеер запускается из главной, треков и чартов.</p>
          <div className="help-actions">
            <Link to="/tracks">Все треки</Link>
            <Link to="/charts">Чарты</Link>
          </div>
        </article>
      </section>

      <section className="help-section">
        <div className="help-section-head">
          <CircleHelp size={22} />
          <h3>Частые вопросы</h3>
        </div>
        <div className="faq-list">
          {faq.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="help-contact">
        <div>
          <h3>Нужна поддержка?</h3>
          <p>Опишите проблему, что нажимали и какой адрес страницы открыт.</p>
        </div>
        <a href="mailto:support@moodstream.local">
          <Mail size={18} />
          Написать
        </a>
      </section>

      <section className="help-section compact">
        <div className="help-section-head">
          <Settings size={22} />
          <h3>Полезные команды</h3>
        </div>
        <div className="command-list">
          <code>.\venv\Scripts\python backend\manage.py changepassword USERNAME</code>
          <code>.\venv\Scripts\python backend\manage.py sync_music</code>
          <code>cd front; npm run build</code>
        </div>
      </section>
    </div>
  );
}
