import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { changePassword } from "./api";

export function ChangePasswordForm() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);
    if (newPassword !== confirmation) {
      setError("New passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(token, { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setMessage("Password changed successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="password-form" onSubmit={handleSubmit}>
      <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      <button className="primary-action" type="submit" disabled={isSubmitting}>{isSubmitting ? "Changing password..." : "Update password"}</button>
    </form>
  );
}