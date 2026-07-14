import type { FormEvent } from 'react'
import type {
  CompanyMember,
  CompanyRole,
  CompanyWorkspace,
  CreateCompanyMemberPayload,
} from '../api.js'
import { createFriendlyBoardPath } from '../routing.js'
import { CompanyMembersPanel } from './CompanyMembersPanel.js'
import { Badge } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Card } from './ui/Card.js'
import { TextInput } from './ui/TextInput.js'

interface CompanyWorkspacePageProps {
  canDeleteBoard: boolean
  canManageWorkspace: boolean
  companyMembers: CompanyMember[]
  companyWorkspace: CompanyWorkspace | null
  currentUserId: string
  deletingBoardId: string | null
  deletingDepartmentId: string | null
  editingBoardId: string | null
  editingDepartmentId: string | null
  isCreatingMember: boolean
  isLoading: boolean
  membersStatusMessage: string
  updatingMemberId: string | null
  workspaceStructureMessage: string
  onCreateBoard: (formEvent: FormEvent<HTMLFormElement>, departmentId: string) => void
  onCreateDepartment: (formEvent: FormEvent<HTMLFormElement>) => void
  onCreateMember: (payload: CreateCompanyMemberPayload) => Promise<void>
  onDeleteBoard: (boardId: string, boardName: string) => void
  onDeleteDepartment: (departmentId: string, departmentName: string) => void
  onNavigate: (path: string) => void
  onUpdateMemberStatus: (userId: string, isActive: boolean) => Promise<void>
  onRenameDepartment: (formEvent: FormEvent<HTMLFormElement>, departmentId: string) => void
  onUpdateMemberRole: (userId: string, role: CompanyRole) => Promise<void>
  onUpdateCompany: (formEvent: FormEvent<HTMLFormElement>) => void
  onUpdateBoard: (formEvent: FormEvent<HTMLFormElement>, boardId: string) => void
}

export function CompanyWorkspacePage({
  canDeleteBoard,
  canManageWorkspace,
  companyMembers,
  companyWorkspace,
  currentUserId,
  deletingBoardId,
  deletingDepartmentId,
  editingBoardId,
  editingDepartmentId,
  isCreatingMember,
  isLoading,
  membersStatusMessage,
  updatingMemberId,
  workspaceStructureMessage,
  onCreateBoard,
  onCreateDepartment,
  onCreateMember,
  onDeleteBoard,
  onDeleteDepartment,
  onNavigate,
  onUpdateMemberStatus,
  onRenameDepartment,
  onUpdateMemberRole,
  onUpdateCompany,
  onUpdateBoard,
}: CompanyWorkspacePageProps) {
  return (
    <section className="company-page">
      {canManageWorkspace ? (
        <div className="page-section-header workspace-structure-header">
          <div>
            <p className="eyebrow">Empresa</p>
            <h2>{companyWorkspace?.name ?? 'Empresa'}</h2>
          </div>
          <form className="workspace-create-form" onSubmit={onCreateDepartment}>
            <TextInput
              name="name"
              type="text"
              minLength={2}
              placeholder="Novo departamento"
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
        </div>
      ) : null}

      {companyWorkspace ? (
        <Card className="company-settings-card">
          {canManageWorkspace ? (
            <form className="company-settings-form" onSubmit={onUpdateCompany}>
              <label htmlFor="company-name-input">
                Nome da empresa
                <TextInput
                  id="company-name-input"
                  name="name"
                  type="text"
                  minLength={2}
                  defaultValue={companyWorkspace.name}
                  required
                />
              </label>
              <label htmlFor="company-slug-input">
                URL
                <div className="slug-input-group">
                  <span>{window.location.origin}/</span>
                  <TextInput
                    id="company-slug-input"
                    name="slug"
                    type="text"
                    minLength={2}
                    maxLength={48}
                    defaultValue={companyWorkspace.slug}
                    pattern="[a-zA-Z0-9-]+"
                    required
                  />
                </div>
              </label>
              <fieldset className="company-theme-fieldset">
                <legend>Paleta</legend>
                <label htmlFor="company-primary-color-input">
                  Principal
                  <TextInput
                    id="company-primary-color-input"
                    name="primaryColor"
                    type="color"
                    defaultValue={companyWorkspace.theme.primaryColor}
                    required
                  />
                </label>
                <label htmlFor="company-secondary-color-input">
                  Secundaria
                  <TextInput
                    id="company-secondary-color-input"
                    name="secondaryColor"
                    type="color"
                    defaultValue={companyWorkspace.theme.secondaryColor}
                    required
                  />
                </label>
                <label htmlFor="company-accent-color-input">
                  Destaque
                  <TextInput
                    id="company-accent-color-input"
                    name="accentColor"
                    type="color"
                    defaultValue={companyWorkspace.theme.accentColor}
                    required
                  />
                </label>
                <label htmlFor="company-board-background-color-input">
                  Quadro
                  <TextInput
                    id="company-board-background-color-input"
                    name="boardBackgroundColor"
                    type="color"
                    defaultValue={companyWorkspace.theme.boardBackgroundColor}
                    required
                  />
                </label>
              </fieldset>
              <Button type="submit" variant="primary">
                Salvar empresa
              </Button>
            </form>
          ) : (
            <div className="company-settings-readonly">
              <div>
                <p className="eyebrow">Empresa</p>
                <strong>{companyWorkspace.name}</strong>
              </div>
              <span className="company-url-display">
                {window.location.origin}/{companyWorkspace.slug}
              </span>
            </div>
          )}
        </Card>
      ) : null}

      <CompanyMembersPanel
        canManageWorkspace={canManageWorkspace}
        companyMembers={companyMembers}
        currentUserId={currentUserId}
        isCreatingMember={isCreatingMember}
        membersStatusMessage={membersStatusMessage}
        updatingMemberId={updatingMemberId}
        onCreateMember={onCreateMember}
        onUpdateMemberStatus={onUpdateMemberStatus}
        onUpdateMemberRole={onUpdateMemberRole}
      />

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
              <Button type="submit">Criar quadro</Button>
            </form>
          ) : null}

          {department.boards.length > 0 ? (
            <div className="board-grid">
              {department.boards.map((board) => (
                <Card className="board-card" key={board.id}>
                  <button
                    type="button"
                    className="board-open-button"
                    onClick={() =>
                      onNavigate(
                        createFriendlyBoardPath(companyWorkspace.slug, department.key, board.key),
                      )
                    }
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
