import { X, Wrench } from 'lucide-react';

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function ComingSoonModal({
  open,
  onClose,
  title = 'Раздел в разработке',
  description = 'Мы активно работаем над этим разделом. Скоро здесь появятся новые возможности — спасибо за терпение!',
}: ComingSoonModalProps) {
  if (!open) return null;

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.04))',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
          >
            <Wrench size={26} className="text-white" />
          </div>

          <div>
            <h3
              className="text-lg font-bold text-foreground mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em' }}
            >
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors w-full"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
