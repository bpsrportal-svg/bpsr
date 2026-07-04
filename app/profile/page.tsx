import { GuildForbiddenError, requireGuildMembershipPage, requireLogin } from "@/lib/authz";
import { ProfileEditor } from "@/components/profile-editor";

export default async function ProfilePage() {
  const user = await requireLogin("/profile");

  try {
    await requireGuildMembershipPage(user.id);
  } catch (error) {
    if (error instanceof GuildForbiddenError) {
      return (
        <main className="page-shell">
          <section className="form-section">
            <h1>403 Forbidden</h1>
            <p className="lead">{error.message}</p>
          </section>
        </main>
      );
    }

    throw error;
  }

  return <ProfileEditor />;
}
