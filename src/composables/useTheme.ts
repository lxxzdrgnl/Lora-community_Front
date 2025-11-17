import { ref, watch, onMounted } from 'vue';

type Theme = 'light' | 'dark';

export function useTheme() {
  const theme = ref<Theme>('dark');

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light');
  };

  onMounted(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  });

  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
  });

  return {
    theme,
    toggleTheme,
  };
}
