import type { PlatformCompanySummary } from '../api.js'
import { createCompanyPath } from '../routing.js'

interface AdminCompaniesPageProps {
  companies: PlatformCompanySummary[]
  isLoading: boolean
  onNavigate: (path: string) => void
}

export function AdminCompaniesPage({ companies, isLoading, onNavigate }: AdminCompaniesPageProps) {
  return (
    <section className="admin-page">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">Admin geral</p>
          <h2>Empresas</h2>
        </div>
      </div>

      {isLoading ? <p className="surface-message">Carregando empresas...</p> : null}

      {!isLoading && companies.length === 0 ? (
        <p className="surface-message">Nenhuma empresa encontrada.</p>
      ) : null}

      {companies.length > 0 ? (
        <div className="company-grid">
          {companies.map((company) => (
            <button
              type="button"
              className="company-card"
              key={company.id}
              onClick={() => onNavigate(createCompanyPath(company.id))}
            >
              <strong>{company.name}</strong>
              <span>{company.memberCount} membro(s)</span>
              <span>{company.departmentCount} departamento(s)</span>
              <span>{company.boardCount} quadro(s)</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
