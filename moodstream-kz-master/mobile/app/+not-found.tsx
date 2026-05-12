import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function NotFound() {
  const user = useAuthStore(s => s.user);
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
