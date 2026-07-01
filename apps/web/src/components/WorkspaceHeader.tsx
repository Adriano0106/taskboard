import type { AuthSession, CompanyWorkspace } from '../api.js'
import { createCompanyPath, createCompanySlugPath } from '../routing.js'

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
  const avatarInitials = session.user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart[0])
    .join('')
    .toUpperCase()
  const companySlug = companyWorkspace?.slug ?? session.company.slug
  const companyPath = companySlug
    ? createCompanySlugPath(companySlug)
    : createCompanyPath(session.company.id)

  return (
    <nav className="workspace">
      <div className="workspace-brand">
        <button type="button" className="brand-button" onClick={() => onNavigate('/')}>
          TaskBoard
        </button>
        <button
          type="button"
          className="workspace-company-button"
          onClick={() => onNavigate(companyPath)}
        >
          {companyWorkspace?.name ?? session.company.name}
        </button>
      </div>
      <div className="workspace-actions">
        <button type="button" className="secondary-button" onClick={() => onNavigate(companyPath)}>
          Empresa
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onNavigate('/admin/companies')}
        >
          Admin geral
        </button>
        <button
          type="button"
          className="avatar-button"
          title="Meu perfil"
          onClick={() => onNavigate('/profile')}
        >
          <span>{avatarInitials || 'U'}</span>
        </button>
        <button type="button" className="secondary-button" onClick={onLogout}>
          Sair
        </button>
      </div>
    </nav>
  )
}
