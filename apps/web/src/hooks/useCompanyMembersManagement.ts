import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  type CompanyMember,
  type CompanyRole,
  type CreateCompanyMemberPayload,
  createCompanyMember,
  deleteCompanyMember,
  updateCompanyMemberRole,
} from '../api.js'

interface UseCompanyMembersManagementInput {
  setCompanyMembers: Dispatch<SetStateAction<CompanyMember[]>>
  token: string | null
}

export function useCompanyMembersManagement({
  setCompanyMembers,
  token,
}: UseCompanyMembersManagementInput) {
  const [membersStatusMessage, setMembersStatusMessage] = useState('')
  const [isCreatingMember, setIsCreatingMember] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)

  async function createMember(payload: CreateCompanyMemberPayload) {
    if (!token) {
      return
    }

    setIsCreatingMember(true)
    setMembersStatusMessage('')

    try {
      const members = await createCompanyMember(token, payload)
      setCompanyMembers(members)
      setMembersStatusMessage('Membro adicionado com sucesso.')
    } catch (error) {
      setMembersStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel adicionar o membro',
      )
    } finally {
      setIsCreatingMember(false)
    }
  }

  async function updateMemberRole(userId: string, role: CompanyRole) {
    if (!token) {
      return
    }

    setUpdatingMemberId(userId)
    setMembersStatusMessage('')

    try {
      const members = await updateCompanyMemberRole(token, userId, {
        role,
      })
      setCompanyMembers(members)
      setMembersStatusMessage('Permissao do membro atualizada.')
    } catch (error) {
      setMembersStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar o membro',
      )
    } finally {
      setUpdatingMemberId(null)
    }
  }

  async function removeMember(userId: string) {
    if (!token) {
      return
    }

    setUpdatingMemberId(userId)
    setMembersStatusMessage('')

    try {
      const members = await deleteCompanyMember(token, userId)
      setCompanyMembers(members)
      setMembersStatusMessage('Membro removido da empresa.')
    } catch (error) {
      setMembersStatusMessage(
        error instanceof Error ? error.message : 'Nao foi possivel remover o membro',
      )
    } finally {
      setUpdatingMemberId(null)
    }
  }

  return {
    createMember,
    isCreatingMember,
    membersStatusMessage,
    removeMember,
    updateMemberRole,
    updatingMemberId,
  }
}
