import type { AuthSession, CompanyWorkspace } from '../api.js'
import { createCompanyPath } from '../routing.js'

interface WorkspaceHeaderProps {
  companyWorkspace: CompanyWorkspace | null
  session: AuthSession
  onLogout: () => void
  onNavigate: (path: string) => void
}

export function WorkspaceHeader({
  companyWorkspace,
  session,
  onLogout,
  onNavigate,
}: WorkspaceHeaderProps) {
  return (
    <section className="workspace">
      <div>
        <p className="eyebrow">TaskBoard</p>
        <h1>{companyWorkspace?.name ?? session.company.name}</h1>
        <p className="muted">
          Sessao ativa para {session.user.name} com perfil {session.company.role}.
        </p>
      </div>
      <div className="workspace-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate(createCompanyPath(session.company.id))}
        >
          Empresa
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate('/admin/companies')}
        >
          Admin geral
        </button>
        <button type="button" className="secondary-button" onClick={onLogout}>
          Sair
        </button>
      </div>
    </section>
  )
}
