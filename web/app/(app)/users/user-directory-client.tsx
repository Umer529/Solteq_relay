"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, Search, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import type { ProjectRole } from "@relay/shared";
import type { ProjectSummary } from "@/lib/data/projects";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUserAction } from "./actions";

export interface UserDirectoryItem {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
  createdAt: string;
  memberships: {
    projectId: string;
    projectName: string;
    role: ProjectRole;
  }[];
}

export function UserDirectoryClient({
  users,
  projects,
  notice,
}: {
  users: UserDirectoryItem[];
  projects: ProjectSummary[];
  notice?: { error?: string; message?: string };
}) {
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  const manageableProjects = useMemo(
    () => projects.filter((p) => p.role === "owner" || p.role === "admin"),
    [projects],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.memberships.some((m) => m.projectName.toLowerCase().includes(q)),
    );
  }, [search, users]);

  function generatePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(pwd);
  }

  return (
    <div className="users-page-content">
      <header className="users-page-header">
        <div className="users-header-title">
          <div className="users-title-badge">
            <ShieldCheck size={20} strokeWidth={1.8} />
          </div>
          <div>
            <h1>User Management & Provisioning</h1>
            <p>Directly register new user accounts for Relay and assign them to projects.</p>
          </div>
        </div>
        <div className="users-header-stats">
          <div className="stat-pill">
            <Users size={14} />
            <span><strong>{users.length}</strong> Registered {users.length === 1 ? "User" : "Users"}</span>
          </div>
          <div className="stat-pill">
            <UserCheck size={14} />
            <span><strong>{manageableProjects.length}</strong> Managed {manageableProjects.length === 1 ? "Project" : "Projects"}</span>
          </div>
        </div>
      </header>

      {notice && (notice.error || notice.message) && (
        <div
          className="form-message"
          data-tone={notice.error ? "error" : "info"}
          role="status"
          style={{ marginBottom: "20px" }}
        >
          {notice.error ?? notice.message}
        </div>
      )}

      <div className="users-layout-grid">
        <section className="provision-card" aria-labelledby="provision-heading">
          <div className="provision-card-header">
            <UserPlus size={18} strokeWidth={1.7} />
            <div>
              <h2 id="provision-heading">Register New User</h2>
              <p>Create credentials for a teammate. They can sign in immediately at /login.</p>
            </div>
          </div>

          <form className="provision-form" action={createUserAction}>
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="e.g. Alex Morgan"
                required
                maxLength={60}
              />
            </div>

            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="alex@company.com"
                required
              />
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="password">Initial password</label>
                <button
                  type="button"
                  className="generate-pwd-btn"
                  onClick={generatePassword}
                  title="Generate a random secure password"
                >
                  <RefreshCw size={12} />
                  <span>Generate</span>
                </button>
              </div>
              <div className="password-input-wrap">
                <input
                  id="password"
                  name="password"
                  type="text"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  value={generatedPassword}
                  onChange={(e) => setGeneratedPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ flex: 1.3 }}>
                <label htmlFor="projectId">Assign to project <span>Optional</span></label>
                <select
                  id="projectId"
                  name="projectId"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">None (Account only)</option>
                  {manageableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectId && (
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="role">Initial role</label>
                  <select id="role" name="role" defaultValue="member">
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="viewer">viewer</option>
                    <option value="owner">owner</option>
                  </select>
                </div>
              )}
            </div>

            <SubmitButton className="primary-button" pendingLabel="Creating account…">
              <Plus size={15} />
              <span>Create user account</span>
            </SubmitButton>
          </form>
        </section>

        <section className="directory-card" aria-labelledby="directory-heading">
          <div className="directory-card-header">
            <div>
              <h2 id="directory-heading">Registered Users Directory</h2>
              <p>All user accounts provisioned in your Relay organization.</p>
            </div>
            <div className="directory-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Filter users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter users"
              />
            </div>
          </div>

          <div className="directory-list-wrap">
            {filteredUsers.length === 0 ? (
              <div className="directory-empty">
                <p>No users found matching &quot;{search}&quot;</p>
              </div>
            ) : (
              <div className="directory-table">
                <div className="directory-table-head">
                  <span>User</span>
                  <span>Email</span>
                  <span>Project memberships</span>
                  <span>Joined</span>
                </div>
                {filteredUsers.map((user) => (
                  <div className="directory-table-row" key={user.id}>
                    <div className="user-cell">
                      <div
                        className="user-avatar"
                        style={{ backgroundColor: user.avatarColor || "#64748b" }}
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <strong>{user.displayName}</strong>
                    </div>

                    <div className="email-cell">
                      <span>{user.email}</span>
                    </div>

                    <div className="memberships-cell">
                      {user.memberships.length === 0 ? (
                        <span className="no-projects">No project memberships</span>
                      ) : (
                        <div className="membership-chips">
                          {user.memberships.map((m) => (
                            <span className="membership-chip" key={m.projectId}>
                              <span className="chip-name">{m.projectName}</span>
                              <span className={`chip-role role-${m.role}`}>{m.role}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="date-cell">
                      <span>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
