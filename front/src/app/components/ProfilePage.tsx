import { User, MapPin, Mail, Shield } from 'lucide-react';
import { useAuth } from './AuthContext';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl">
        {/* Avatar + name */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-5 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            {(user.displayName || user.username).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {user.displayName || user.username}
            </h2>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="text-sm text-foreground mt-2">{user.bio}</p>}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4">
          {user.email && (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
              <Mail size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{user.email}</p>
              </div>
            </div>
          )}
          {user.city && (
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
              <MapPin size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Город</p>
                <p className="text-sm text-foreground">{user.city}</p>
              </div>
            </div>
          )}
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
                <p className="text-sm text-primary font-medium">Администратор</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
