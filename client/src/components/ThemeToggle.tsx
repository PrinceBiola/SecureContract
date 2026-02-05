import { useTheme } from '@/context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const { actualTheme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title={`Switch to ${actualTheme === 'light' ? 'dark' : 'light'} mode`}
        >
            {actualTheme === 'light' ? <FaMoon size={16} /> : <FaSun size={16} />}
        </Button>
    );
}
