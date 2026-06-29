import type { CompanyWorkspace } from '../api.js'
import { createBoardPath } from '../routing.js'

interface CompanyWorkspacePageProps {
  companyWorkspace: CompanyWorkspace | null
  isLoading: boolean
  onNavigate: (path: string) => void
}

export function CompanyWorkspacePage({
  companyWorkspace,
  isLoading,
  onNavigate,
}: CompanyWorkspacePageProps) {
  return (
    <section className="company-page">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">Empresa</p>
          <h2>{companyWorkspace?.name ?? 'Empresa'}</h2>
        </div>
      </div>

      {isLoading ? <p className="surface-message">Carregando empresa...</p> : null}

      {!isLoading && companyWorkspace?.departments.length === 0 ? (
        <p className="surface-message">Nenhum departamento encontrado.</p>
      ) : null}

      {companyWorkspace?.departments.map((department) => (
        <div className="department-section" key={department.id}>
          <h3>{department.name}</h3>
          {department.boards.length > 0 ? (
            <div className="board-grid">
              {department.boards.map((board) => (
                <button
                  type="button"
                  className="board-card"
                  key={board.id}
                  onClick={() => onNavigate(createBoardPath(companyWorkspace.id, board.id))}
                >
                  <span>{board.key}</span>
                  <strong>{board.name}</strong>
                  {board.description ? <small>{board.description}</small> : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="surface-message">Nenhum quadro neste departamento.</p>
          )}
        </div>
      ))}
    </section>
  )
}
