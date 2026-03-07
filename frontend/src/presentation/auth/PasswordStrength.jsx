import React, { useMemo } from 'react';

/**
 * PasswordRequirements — inline checklist shown below the password field.
 * Each rule lights up green (✓) as the user satisfies it.
 * Replaces the old progress-bar PasswordStrength component.
 *
 * Props:
 *   password (string) — the current password input value
 */
const PasswordRequirements = ({ password = '' }) => {
  const rules = useMemo(() => [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
      required: true,  // this rule is always mandatory
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter (A–Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter (a–z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number (0–9)',
      met: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$%...)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ], [password]);

  const metCount = rules.filter(r => r.met).length;
  const isValid = rules[0].met && metCount >= 3; // length + at least 2 more

  // Don't render anything if the password field is empty
  if (!password) return null;

  return (
    <div style={{
      marginTop: '8px',
      padding: '10px 12px',
      borderRadius: '8px',
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
    }}>
      <p style={{
        margin: '0 0 6px 0',
        fontSize: '11px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        Password requirements
      </p>

      <ul style={{
        margin: 0,
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {rules.map(rule => (
          <li
            key={rule.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '12px',
              color: rule.met ? '#16a34a' : '#6b7280',
              transition: 'color 0.2s ease',
            }}
          >
            {/* Checkmark icon when met, circle when not */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              flexShrink: 0,
              background: rule.met ? '#dcfce7' : 'transparent',
              border: rule.met ? '1.5px solid #16a34a' : '1.5px solid #d1d5db',
              transition: 'all 0.2s ease',
            }}>
              {rule.met && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>

      {/* Summary line — only shows once user has typed something */}
      {password.length > 0 && (
        <p style={{
          margin: '8px 0 0',
          fontSize: '11px',
          fontWeight: '600',
          color: isValid ? '#16a34a' : '#f59e0b',
        }}>
          {isValid
            ? '✓ Password meets requirements'
            : `${metCount} of 5 requirements met — need at least 3`}
        </p>
      )}
    </div>
  );
};

export default PasswordRequirements;