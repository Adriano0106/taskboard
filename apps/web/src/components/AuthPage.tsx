import type { FormEvent } from 'react'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  authMode: AuthMode
  authModeLabels: Record<AuthMode, string>
  isSubmitting: boolean
  statusMessage: string
  onAuthModeChange: (authMode: AuthMode) => void
  onSubmit: (formEvent: FormEvent<HTMLFormElement>) => void
}

export function AuthPage({
  authMode,
  authModeLabels,
  isSubmitting,
  statusMessage,
  onAuthModeChange,
  onSubmit,
}: AuthPageProps) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">TaskBoard</p>
          <h1>{authModeLabels[authMode]}</h1>
          <p className="muted">Acesse sua empresa e prepare seus quadros de trabalho.</p>
        </div>

        <div className="mode-switch" aria-label="Modo de autenticacao">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => onAuthModeChange('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => onAuthModeChange('register')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {authMode === 'register' ? (
            <>
              <label>
                Nome
                <input name="name" type="text" minLength={2} required />
              </label>
              <label>
                Empresa
                <input name="companyName" type="text" minLength={2} required />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" minLength={8} required />
          </label>

          {statusMessage ? <p className="error-message">{statusMessage}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : authModeLabels[authMode]}
          </button>
        </form>
      </section>
    </main>
  )
}
