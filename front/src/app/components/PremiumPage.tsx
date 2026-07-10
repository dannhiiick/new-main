import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, Check, CreditCard, Sparkles, User, Users, GraduationCap } from 'lucide-react';

const PLANS = [
  {
    id: 'student',
    icon: GraduationCap,
    name: 'Студенческий',
    price: 490,
    period: 'месяц',
    description: 'Скидка 50% для учащихся вузов. Требуется ежегодное подтверждение статуса.',
    features: [
      'Качество звука до 320 кбит/с',
      'Прослушивание без рекламы',
      'Офлайн-режим (скачивание треков)',
      'Доступ ко всем текстам песен',
    ],
    color: 'from-green-500/20 to-emerald-500/10',
    borderColor: 'group-hover:border-green-500/30',
    buttonColor: 'bg-green-600 hover:bg-green-500',
  },
  {
    id: 'individual',
    icon: User,
    name: 'Индивидуальный',
    price: 990,
    period: 'месяц',
    description: 'Идеальный выбор для одного слушателя. Все возможности Premium без ограничений.',
    features: [
      'Максимальное качество звука (Hi-Fi)',
      'Прослушивание без рекламы и пауз',
      'Скачивание музыки на устройство',
      'Персональные рекомендации от ИИ',
      'Эксклюзивные предрелизы альбомов',
    ],
    color: 'from-primary/20 to-accent/10',
    borderColor: 'group-hover:border-primary/40 border-primary/20',
    buttonColor: 'bg-primary hover:bg-primary/90',
    popular: true,
  },
  {
    id: 'family',
    icon: Users,
    name: 'Семейный',
    price: 1490,
    period: 'месяц',
    description: 'Музыка для всей семьи. До 6 независимых аккаунтов с отдельными рекомендациями.',
    features: [
      '6 отдельных Premium-аккаунтов',
      'Качество звука Hi-Fi для каждого',
      'Общий семейный плейлист (Family Mix)',
      'Родительский контроль (блокировка Explicit)',
      'Офлайн-режим для всех членов семьи',
    ],
    color: 'from-blue-500/20 to-indigo-500/10',
    borderColor: 'group-hover:border-blue-500/30',
    buttonColor: 'bg-blue-600 hover:bg-blue-500',
  },
];

export function PremiumPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCheckout = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setSuccess(false);
    setError(null);
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setName('');
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Неверный номер карты (должно быть 16 цифр).');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Срок действия должен быть в формате ММ/ГГ.');
      return;
    }
    if (cvv.length !== 3) {
      setError('Код CVV должен состоять из 3 цифр.');
      return;
    }
    if (!name.trim()) {
      setError('Введите имя владельца карты.');
      return;
    }

    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 2000);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background relative">
      <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm w-fit transition-colors">
        <ArrowLeft size={16} /> На главную
      </Link>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Sparkles size={24} className="fill-primary/20 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Почувствуйте настоящую глубину звука с Premium
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Слушайте любимую музыку в высочайшем качестве без рекламы, скачивайте треки на устройство и получайте персональные рекомендации.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between bg-card border rounded-3xl p-6 sm:p-8 transition-all hover:scale-[1.02] duration-300 group ${
                  plan.popular ? 'ring-2 ring-primary border-primary/50' : 'border-border'
                } ${plan.borderColor}`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                    Популярно
                  </span>
                )}
                <div>
                  {/* Plan head */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${plan.color} text-foreground`}>
                      <Icon size={20} className="text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {plan.price.toLocaleString()} ₸
                    </span>
                    <span className="text-muted-foreground text-sm">/{plan.period}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    {plan.description}
                  </p>

                  <hr className="border-border mb-6" />

                  {/* Features list */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Check size={14} className="text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-3 rounded-xl text-white text-xs font-bold transition-all shadow-lg cursor-pointer ${plan.buttonColor}`}
                >
                  Подписаться
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal Dialog */}
      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPlan(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              ✕
            </button>

            {!success ? (
              <form onSubmit={handlePay} className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Оплата подписки «{selectedPlan.name}»
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Сумма к оплате: <span className="font-semibold text-foreground">{selectedPlan.price.toLocaleString()} ₸</span> за первый месяц
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CreditCard size={13} /> Номер карты
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      // format Card number with space groupings
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setCardNumber(formatted.slice(0, 19));
                    }}
                    placeholder="0000 0000 0000 0000"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Срок действия</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={expiry}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val.length >= 2 ? `${val.slice(0, 2)}/${val.slice(2, 4)}` : val;
                        setExpiry(formatted.slice(0, 5));
                      }}
                      placeholder="ММ/ГГ"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground text-center"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={3}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="•••"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Имя на карте</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    placeholder="IVAN IVANOV"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Обработка транзакции...' : 'Оплатить'}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">
                  <Check size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Подписка успешно оформлена!
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    Премиум-доступ для плана «{selectedPlan.name}» активирован. Наслаждайтесь Hi-Fi звуком без ограничений!
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="mt-2 px-6 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors w-full cursor-pointer"
                >
                  Отлично
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
