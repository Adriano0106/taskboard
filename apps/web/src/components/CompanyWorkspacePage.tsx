import type { FormEvent } from 'react'
import type { CompanyWorkspace } from '../api.js'
import { createBoardPath } from '../routing.js'

interface CompanyWorkspacePageProps {
  canManageWorkspace: boolean
  companyWorkspace: CompanyWorkspace | null
  deletingBoardId: string | null
  deletingDepartmentId: string | null
  editingBoardId: string | null
  editingDepartmentId: string | null
  isLoading: boolean
  workspaceStructureMessage: string
  onCreateBoard: (formEvent: FormEvent<HTMLFormElement>, departmentId: string) => void
  onCreateDepartment: (formEvent: FormEvent<HTMLFormElement>) => void
  onDeleteBoard: (boardId: string, boardName: string) => void
  onDeleteDepartment: (departmentId: string, departmentName: string) => void
  onNavigate: (path: string) => void
  onRenameDepartment: (formEvent: FormEvent<HTMLFormElement>, departmentId: string) => void
  onUpdateBoard: (formEvent: FormEvent<HTMLFormElement>, boardId: string) => void
}

export function CompanyWorkspacePage({
  canManageWorkspace,
  companyWorkspace,
  deletingBoardId,
  deletingDepartmentId,
  editingBoardId,
  editingDepartmentId,
  isLoading,
  workspaceStructureMessage,
  onCreateBoard,
  onCreateDepartment,
  onDeleteBoard,
  onDeleteDepartment,
  onNavigate,
  onRenameDepartment,
  onUpdateBoard,
}: CompanyWorkspacePageProps) {
  return (
    <section className="company-page">
      <div className="page-section-header workspace-structure-header">
        <div>
          <p className="eyebrow">Empresa</p>
          <h2>{companyWorkspace?.name ?? 'Empresa'}</h2>
        </div>
        {canManageWorkspace ? (
          <form className="workspace-create-form" onSubmit={onCreateDepartment}>
            <input name="name" type="text" minLength={2} placeholder="Novo departamento" required />
            <button type="submit" className="secondary-button">
              Adicionar
            </button>
          </form>
        ) : null}
      </div>

      {isLoading ? <p className="surface-message">Carregando empresa...</p> : null}
      {workspaceStructureMessage ? (
        <p className="surface-message error-message">{workspaceStructureMessage}</p>
      ) : null}

      {!isLoading && companyWorkspace?.departments.length === 0 ? (
        <p className="surface-message">Nenhum departamento encontrado.</p>
      ) : null}

      {companyWorkspace?.departments.map((department) => (
        <div className="department-section" key={department.id}>
          <div className="department-header">
            {canManageWorkspace ? (
              <form
                className="department-title-form"
                onSubmit={(event) => onRenameDepartment(event, department.id)}
              >
                <input
                  name="name"
                  type="text"
                  minLength={2}
                  defaultValue={department.name}
                  disabled={editingDepartmentId === department.id}
                  required
                />
                <button type="submit" className="icon-button">
                  Salvar
                </button>
              </form>
            ) : (
              <h3>{department.name}</h3>
            )}
            {canManageWorkspace ? (
              <button
                type="button"
                className="icon-button danger-button"
                disabled={deletingDepartmentId === department.id || department.boards.length > 0}
                onClick={() => onDeleteDepartment(department.id, department.name)}
              >
                Remover
              </button>
            ) : null}
          </div>

          {canManageWorkspace ? (
            <form
              className="board-create-form"
              onSubmit={(event) => onCreateBoard(event, department.id)}
            >
              <input name="name" type="text" minLength={2} placeholder="Novo quadro" required />
              <input name="description" type="text" placeholder="Descricao opcional" />
              <button type="submit" className="secondary-button">
                Criar quadro
              </button>
            </form>
          ) : null}

          {department.boards.length > 0 ? (
            <div className="board-grid">
              {department.boards.map((board) => (
                <article className="board-card" key={board.id}>
                  <button
                    type="button"
                    className="board-open-button"
                    onClick={() => onNavigate(createBoardPath(companyWorkspace.id, board.id))}
                  >
                    <span>{board.key}</span>
                    <strong>{board.name}</strong>
                    {board.description ? <small>{board.description}</small> : null}
                  </button>
                  {canManageWorkspace ? (
                    <form
                      className="board-edit-form"
                      onSubmit={(event) => onUpdateBoard(event, board.id)}
                    >
                      <input
                        name="name"
                        type="text"
                        minLength={2}
                        defaultValue={board.name}
                        disabled={editingBoardId === board.id}
                        required
                      />
                      <input
                        name="description"
                        type="text"
                        defaultValue={board.description ?? ''}
                        disabled={editingBoardId === board.id}
                        placeholder="Descricao"
                      />
                      <div className="board-edit-actions">
                        <button type="submit" className="icon-button">
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="icon-button danger-button"
                          disabled={deletingBoardId === board.id}
                          onClick={() => onDeleteBoard(board.id, board.name)}
                        >
                          Remover
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
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
