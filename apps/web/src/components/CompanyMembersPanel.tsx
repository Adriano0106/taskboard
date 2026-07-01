import type { FormEvent } from 'react'
import type { CompanyMember, CompanyRole, CreateCompanyMemberPayload } from '../api.js'
import { Badge } from './ui/Badge.js'
import { Button } from './ui/Button.js'
import { Card } from './ui/Card.js'
import { TextInput } from './ui/TextInput.js'

const roleLabels: Record<CompanyRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

const companyRoles: CompanyRole[] = ['OWNER', 'ADMIN', 'MEMBER']

interface CompanyMembersPanelProps {
  canManageWorkspace: boolean
  companyMembers: CompanyMember[]
  currentUserId: string
  isCreatingMember: boolean
  membersStatusMessage: string
  updatingMemberId: string | null
  onCreateMember: (payload: CreateCompanyMemberPayload) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  onUpdateMemberRole: (userId: string, role: CompanyRole) => Promise<void>
}

export function CompanyMembersPanel({
  canManageWorkspace,
  companyMembers,
  currentUserId,
  isCreatingMember,
  membersStatusMessage,
  updatingMemberId,
  onCreateMember,
  onRemoveMember,
  onUpdateMemberRole,
}: CompanyMembersPanelProps) {
  async function handleCreateMember(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const formElement = formEvent.currentTarget
    const formData = new FormData(formElement)
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
      role: String(formData.get('role') ?? 'MEMBER') as CompanyRole,
    }

    if (!payload.name || !payload.email || !payload.password) {
      return
    }

    await onCreateMember(payload)
    formElement.reset()
  }

  async function handleRemoveMember(member: CompanyMember) {
    if (!window.confirm(`Remover ${member.name} da empresa?`)) {
      return
    }

    await onRemoveMember(member.id)
  }

  return (
    <Card as="section" className="company-members-panel">
      <div className="company-members-header">
        <div>
          <p className="eyebrow">Membros</p>
          <h3>Usuarios da empresa</h3>
        </div>
        <Badge>{companyMembers.length}</Badge>
      </div>

      {membersStatusMessage ? <p className="surface-message">{membersStatusMessage}</p> : null}

      {canManageWorkspace ? (
        <form className="company-member-create-form" onSubmit={handleCreateMember}>
          <TextInput name="name" type="text" minLength={2} placeholder="Nome" required />
          <TextInput name="email" type="email" placeholder="email@empresa.com" required />
          <TextInput
            name="password"
            type="password"
            minLength={8}
            placeholder="Senha inicial"
            required
          />
          <label>
            Permissao
            <select name="role" defaultValue="MEMBER">
              {companyRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="primary" disabled={isCreatingMember}>
            {isCreatingMember ? 'Adicionando...' : 'Adicionar membro'}
          </Button>
        </form>
      ) : null}

      <div className="company-members-list">
        {companyMembers.map((member) => {
          const isCurrentUser = member.id === currentUserId
          const isUpdating = updatingMemberId === member.id

          return (
            <div className="company-member-row" key={member.id}>
              <div className="company-member-identity">
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              {canManageWorkspace ? (
                <>
                  <select
                    aria-label={`Permissao de ${member.name}`}
                    value={member.role}
                    disabled={isCurrentUser || isUpdating}
                    onChange={(event) =>
                      onUpdateMemberRole(member.id, event.target.value as CompanyRole)
                    }
                  >
                    {companyRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={isCurrentUser || isUpdating}
                    onClick={() => handleRemoveMember(member)}
                  >
                    Remover
                  </Button>
                </>
              ) : (
                <Badge>{roleLabels[member.role]}</Badge>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
