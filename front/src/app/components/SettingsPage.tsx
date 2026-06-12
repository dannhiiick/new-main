import { useState } from 'react';
import { useAuth } from './AuthContext';
import { api, type UserSettings } from './api';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-switch-background'}`}
      style={{ height: '1.375rem' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform"
        style={{
          width: '1.125rem', height: '1.125rem',
          transform: checked ? 'translateX(1.375rem)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(
    user?.settings ?? {
      language: 'ru', theme: 'system', audioQuality: 'auto',
      autoplay: true, notificationsEnabled: true, privateProfile: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<UserSettings>) => {
    setSettings(s => ({ ...s, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateSettings(settings);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg flex flex-col gap-5">

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Язык и регион</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Язык интерфейса</p>
            </div>
            <select
              value={settings.language}
              onChange={e => update({ language: e.target.value as UserSettings['language'] })}
              className="px-3 py-1.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Аудио</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Качество звука</p>
              <p className="text-xs text-muted-foreground mt-0.5">Влияет на потребление трафика</p>
            </div>
            <select
              value={settings.audioQuality}
              onChange={e => update({ audioQuality: e.target.value as UserSettings['audioQuality'] })}
              className="px-3 py-1.5 rounded-lg bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="auto">Автоматически</option>
              <option value="high">Высокое</option>
              <option value="saver">Экономия трафика</option>
            </select>
          </div>
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Автовоспроизведение</p>
              <p className="text-xs text-muted-foreground mt-0.5">Следующий трек после окончания</p>
            </div>
            <Toggle checked={settings.autoplay} onChange={v => update({ autoplay: v })} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Конфиденциальность</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Уведомления</p>
            </div>
            <Toggle checked={settings.notificationsEnabled} onChange={v => update({ notificationsEnabled: v })} />
          </div>
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Закрытый профиль</p>
              <p className="text-xs text-muted-foreground mt-0.5">Только вы видите свою активность</p>
            </div>
            <Toggle checked={settings.privateProfile} onChange={v => update({ privateProfile: v })} />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-start"
        >
          {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
}
