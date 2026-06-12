import { useState } from 'react';
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Concert } from './api';
import { ComingSoonModal } from './ComingSoonModal';

function EventCard({ concert }: { concert: Concert }) {
  const date = new Date(concert.date);
  const month = date.toLocaleString('ru', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all flex gap-5">
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
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className="text-sm font-semibold text-foreground">{concert.ticketPrice ? `${concert.ticketPrice.toLocaleString()} ₸` : 'Бесплатно'}</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          <Ticket size={12} /> Купить
        </button>
      </div>
    </div>
  );
}

export function EventsPage() {
  const { data, loading, error } = useApi(() => api.concerts());
  const [showModal, setShowModal] = useState(true);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <ComingSoonModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Раздел «События» в разработке"
        description="Покупка билетов, фильтры по городам и календарь концертов скоро появятся. Сейчас вы видите превью с демо-данными."
      />
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={16} className="text-primary" />
        <span className="text-sm text-muted-foreground">{data?.length ?? 0} предстоящих событий</span>
      </div>

      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка событий...</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {(data ?? []).map(c => <EventCard key={c.id} concert={c} />)}
          {(data ?? []).length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Событий не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
