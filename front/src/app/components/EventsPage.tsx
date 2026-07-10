import { useState } from 'react';
import { Calendar, MapPin, Clock, Ticket, X, CheckCircle2 } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Concert } from './api';
import { useTranslation } from './i18n';

interface EventCardProps {
  concert: Concert;
  onBuy: (c: Concert) => void;
}

function EventCard({ concert, onBuy }: EventCardProps) {
  const { t } = useTranslation();
  const date = new Date(concert.date);
  const month = date.toLocaleString('ru', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/30 transition-all flex flex-col sm:flex-row gap-4 sm:gap-5 shadow-sm">
      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 shrink-0">
        <span className="text-xs font-medium text-primary">{month}</span>
        <span className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{concert.artist}</p>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{concert.venue}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin size={11} />{concert.city}</span>
          <span className="flex items-center gap-1"><Clock size={11} />{concert.time}</span>
        </div>
      </div>
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between shrink-0 gap-2">
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold text-foreground">{concert.ticketPrice ? `${concert.ticketPrice.toLocaleString()} ₸` : 'Бесплатно'}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Доступно: {concert.tickets_available ?? 0}</p>
        </div>
        <button
          onClick={() => onBuy(concert)}
          disabled={concert.tickets_available <= 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Ticket size={12} /> {t('buy_ticket')}
        </button>
      </div>
    </div>
  );
}

export function EventsPage() {
  const { data, loading, error, refresh } = useApi(() => api.concerts());
  const { t } = useTranslation();

  const [activeConcert, setActiveConcert] = useState<Concert | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const handleOpenBuy = (c: Concert) => {
    setActiveConcert(c);
    setEmail('');
    setPhone('');
    setBought(false);
    setBuyError(null);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConcert) return;

    setBuying(true);
    setBuyError(null);
    try {
      await api.concerts.purchase(activeConcert.id, email.trim(), phone.trim());
      setBought(true);
      // Refresh backend list to update tickets counts
      refresh();
      setTimeout(() => {
        setBought(false);
        setActiveConcert(null);
      }, 2500);
    } catch (err: any) {
      setBuyError(err.message || 'Ошибка при покупке билета');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={16} className="text-primary" />
        <span className="text-sm text-muted-foreground">{(data ?? []).length} {t('coming_soon').toLowerCase()}</span>
      </div>

      {loading && <div className="text-muted-foreground text-sm text-center py-12">{t('loading')}</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="flex flex-col gap-3 max-w-3xl">
          {(data ?? []).map(c => (
            <EventCard key={c.id} concert={c} onBuy={handleOpenBuy} />
          ))}
          {(data ?? []).length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Событий не найдено</div>
          )}
        </div>
      )}

      {/* Buy Ticket Modal */}
      {activeConcert && (
        <div
          onClick={() => !buying && setActiveConcert(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setActiveConcert(null)}
              disabled={buying}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>

            {!bought ? (
              <form onSubmit={handlePurchase} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {t('buy_ticket_title')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Событие: <span className="font-semibold text-foreground">{activeConcert.artist}</span> в {activeConcert.city}
                  </p>
                </div>

                {buyError && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {buyError}
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-medium text-muted-foreground">{t('enter_email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-medium text-muted-foreground">{t('enter_phone')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 707 123 4567"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-between text-xs py-2 border-t border-border">
                  <span className="text-muted-foreground">{t('price')}:</span>
                  <span className="font-bold text-foreground text-sm">{activeConcert.ticketPrice.toLocaleString()} ₸</span>
                </div>

                <button
                  type="submit"
                  disabled={buying}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {buying ? 'Оформление билета...' : t('buy_ticket')}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Билет куплен!
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    {t('ticket_success')}
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
