import type { AuthSession } from '../api.js'

interface ProfilePageProps {
  session: AuthSession
}

export function ProfilePage({ session }: ProfilePageProps) {
  return (
    <section className="profile-page">
      <div className="page-section-header">
        <div>
          <p className="eyebrow">Meu perfil</p>
          <h2>{session.user.name}</h2>
        </div>
      </div>
      <dl className="profile-list">
        <div>
          <dt>Email</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt>Empresa atual</dt>
          <dd>{session.company.name}</dd>
        </div>
        <div>
          <dt>Perfil</dt>
          <dd>{session.company.role}</dd>
        </div>
      </dl>
    </section>
  )
}
