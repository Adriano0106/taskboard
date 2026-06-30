import type { FormEvent } from 'react'
import type { CompanyWorkspace } from '../api.js'
import { createBoardPath } from '../routing.js'
import { Badge } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Card } from './ui/Card.js'
import { TextInput } from './ui/TextInput.js'

interface CompanyWorkspacePageProps {
  canDeleteBoard: boolean
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
  canDeleteBoard,
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
            <TextInput
              name="name"
              type="text"
              minLength={2}
              placeholder="Novo departamento"
              required
            />
            <Button type="submit">
              Adicionar
            </Button>
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
                <TextInput
                  name="name"
                  type="text"
                  minLength={2}
                  defaultValue={department.name}
                  disabled={editingDepartmentId === department.id}
                  required
                />
                <Button type="submit" variant="icon">
                  Salvar
                </Button>
              </form>
            ) : (
              <h3>{department.name}</h3>
            )}
            {canManageWorkspace ? (
              <Button
                type="button"
                variant="danger"
                disabled={deletingDepartmentId === department.id || department.boards.length > 0}
                onClick={() => onDeleteDepartment(department.id, department.name)}
              >
                Remover
              </Button>
            ) : null}
          </div>

          {canManageWorkspace ? (
            <form
              className="board-create-form"
              onSubmit={(event) => onCreateBoard(event, department.id)}
            >
              <TextInput name="name" type="text" minLength={2} placeholder="Novo quadro" required />
              <TextInput name="description" type="text" placeholder="Descricao opcional" />
              <Button type="submit">
                Criar quadro
              </Button>
            </form>
          ) : null}

          {department.boards.length > 0 ? (
            <div className="board-grid">
              {department.boards.map((board) => (
                <Card className="board-card" key={board.id}>
                  <button
                    type="button"
                    className="board-open-button"
                    onClick={() => onNavigate(createBoardPath(companyWorkspace.id, board.id))}
                  >
                    <Badge>{board.key}</Badge>
                    <strong>{board.name}</strong>
                    {board.description ? <small>{board.description}</small> : null}
                  </button>
                  {canManageWorkspace ? (
                    <form
                      className="board-edit-form"
                      onSubmit={(event) => onUpdateBoard(event, board.id)}
                    >
                      <TextInput
                        name="name"
                        type="text"
                        minLength={2}
                        defaultValue={board.name}
                        disabled={editingBoardId === board.id}
                        required
                      />
                      <TextInput
                        name="description"
                        type="text"
                        defaultValue={board.description ?? ''}
                        disabled={editingBoardId === board.id}
                        placeholder="Descricao"
                      />
                      <div className="board-edit-actions">
                        <Button type="submit" variant="icon">
                          Salvar
                        </Button>
                        {canDeleteBoard ? (
                          <Button
                            type="button"
                            variant="danger"
                            disabled={deletingBoardId === board.id}
                            onClick={() => onDeleteBoard(board.id, board.name)}
                          >
                            Remover
                          </Button>
                        ) : null}
                      </div>
                    </form>
                  ) : null}
                </Card>
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
