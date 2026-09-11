import { Router } from "express";
import { requireAuth } from "./middleware";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken } from "./jwt";
import { toPublicUser } from "./publicUser";
import { createUser, findUserByEmail, findUserById, updateUserPassword } from "./repository";
import { changePasswordSchema, loginSchema, signupSchema } from "./schemas";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, passwordHash, displayName });
  const token = signAccessToken(user.id);

  res.status(201).json({ token, user: toPublicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signAccessToken(user.id);
  res.json({ token, user: toPublicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const user = await findUserById(req.userId!);
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.password_hash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return res.status(400).json({ error: "New password must be different" });
  }

  await updateUserPassword(req.userId!, await hashPassword(parsed.data.newPassword));
  res.status(204).send();
});
