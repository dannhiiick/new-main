import { useThemeStore } from '../store/theme';

export function useColors() {
  return useThemeStore(s => s.palette);
}
