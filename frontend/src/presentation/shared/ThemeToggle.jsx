import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../core/context/ThemeContext';

export const ThemeToggle = ({ showLabel = true, inline = false }) => {
  const { theme, updateTheme, mounted } = useTheme();

  if (!mounted) return null; // Prevent hydration mismatch

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  if (inline) {
    // Horizontal toggle for navbar/header
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-gray)',
        borderRadius: '0.5rem',
        padding: '0.25rem',
      }}>
        {options.map((option) => {
          const IconComponent = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => updateTheme(option.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: theme === option.value ? 'var(--bg-white)' : 'transparent',
                color: theme === option.value ? 'var(--primary)' : 'var(--text-light)',
                cursor: 'pointer',
                transition: 'all 200ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={option.label}
            >
              <IconComponent size={18} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    );
  }

  // Vertical radio buttons for settings page
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {showLabel && (
        <p style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
          color: 'var(--text-medium)',
          marginBottom: '1rem',
        }}>
          Theme
        </p>
      )}
      {options.map((option) => {
        const IconComponent = option.icon;
        return (
          <label
            key={option.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: `1px solid var(--border)`,
              backgroundColor: theme === option.value ? 'var(--bg-gray)' : 'transparent',
              transition: 'all 200ms ease',
            }}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={(e) => updateTheme(e.target.value)}
              style={{
                width: '1rem',
                height: '1rem',
                cursor: 'pointer',
                accentColor: 'var(--primary)',
              }}
            />
            <IconComponent size={18} color="var(--text-medium)" strokeWidth={1.5} />
            <span style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              color: 'var(--text-medium)',
            }}>
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
};
