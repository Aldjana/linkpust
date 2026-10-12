import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { RESERVED_USERNAMES } from '../utils/plans.js';
import { serializeUser } from '../utils/serializers.js';
import { syncSubscription } from '../services/subscription.js';

const signToken = (user) => jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Hash factice pour que le temps de réponse de /login ne révèle pas si l'email existe
const DUMMY_HASH = bcrypt.hashSync('linkpulse-dummy-password', 12);

export const register = asyncHandler(async (req, res) => {
  const { email, username, password, displayName } = req.body;

  if (RESERVED_USERNAMES.has(username)) {
    throw new AppError(400, "Ce nom d'utilisateur est réservé", 'USERNAME_RESERVED', {
      username: "Ce nom d'utilisateur est réservé",
    });
  }

  const [emailTaken, usernameTaken] = await Promise.all([
    User.exists({ email }),
    User.exists({ username }),
  ]);
  if (emailTaken) {
    throw new AppError(409, 'Un compte existe déjà avec cet email', 'EMAIL_TAKEN', {
      email: 'Un compte existe déjà avec cet email',
    });
  }
  if (usernameTaken) {
    throw new AppError(409, "Ce nom d'utilisateur est déjà pris", 'USERNAME_TAKEN', {
      username: "Ce nom d'utilisateur est déjà pris",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    username,
    passwordHash,
    displayName: displayName || username,
  });

  res.status(201).json({ token: signToken(user), user: serializeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const found = await User.findOne({ email }).select('+passwordHash');

  const valid = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !valid) {
    throw new AppError(401, 'Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
  }

  const user = await syncSubscription(found);
  res.json({ token: signToken(user), user: serializeUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

export const usernameAvailable = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (RESERVED_USERNAMES.has(username)) return res.json({ available: false });
  const taken = await User.exists({ username });
  res.json({ available: !taken });
});
