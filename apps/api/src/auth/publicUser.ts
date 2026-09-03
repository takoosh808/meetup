export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export function toPublicUser(user: {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  };
}
