import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'icon' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const buttonClassNames: Record<ButtonVariant, string> = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  icon: 'icon-button',
  danger: 'icon-button danger-button',
}

export function Button({ className = '', variant = 'secondary', ...props }: ButtonProps) {
  return (
    <button
      className={[buttonClassNames[variant], className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
