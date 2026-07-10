import { useState, useRef } from 'react';
import { User, MapPin, Mail, Shield, Edit2, Check, X, Camera } from 'lucide-react';
import { useAuth } from './AuthContext';
import { api } from './api';
import { useTranslation } from './i18n';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('display_name', displayName.trim());
    formData.append('bio', bio.trim());
    formData.append('city', city.trim());
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      await api.auth.updateProfile(formData);
      await refreshUser();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    setCity(user.city || '');
    setAvatarFile(null);
    setAvatarPreview(user.avatar || null);
    setIsEditing(false);
    setError(null);
  };

  const userAvatarLabel = (displayName || user.username).slice(0, 2).toUpperCase();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {t('profile')}
          </h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-all cursor-pointer"
            >
              <Edit2 size={13} /> {t('editProfile')}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar + name details */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            <div className="relative group shrink-0">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-xl"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  userAvatarLabel
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Изменить аватар"
                >
                  <Camera size={20} />
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="flex-1 min-w-0 w-full">
              {!isEditing ? (
                <>
                  <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {user.displayName || user.username}
                  </h2>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                  {user.bio ? (
                    <p className="text-sm text-foreground mt-3 bg-secondary/35 p-3.5 rounded-xl border border-border leading-relaxed">
                      {user.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic mt-3">Биография не заполнена.</p>
                  )}
                </>
              ) : (
                <div className="space-y-3.5 w-full text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Отображаемое имя
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Иван Иванов"
                      className="w-full px-3 py-2 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Биография
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Расскажите о себе..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Details list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
              <Mail size={18} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground truncate">{user.email || 'Не указан'}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
              <MapPin size={18} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Город</p>
                {!isEditing ? (
                  <p className="text-sm text-foreground truncate">{user.city || 'Не указан'}</p>
                ) : (
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Алматы"
                    className="w-full mt-1 px-3.5 py-1.5 rounded-lg bg-input-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
              <User size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">ID пользователя</p>
                <p className="text-sm text-foreground font-mono">#{user.id}</p>
              </div>
            </div>

            {user.isStaff && (
              <div className="bg-card border border-primary/30 rounded-2xl p-5 flex items-center gap-3">
                <Shield size={18} className="text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <p className="text-sm text-primary font-semibold">Администратор</p>
                </div>
              </div>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer transition-colors"
              >
                <X size={14} /> Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/95 cursor-pointer transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
              >
                <Check size={14} /> {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
