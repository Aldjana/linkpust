import { AppError, asyncHandler } from '../utils/http.js';
import { THEMES, getLimits } from '../utils/plans.js';
import { serializeUser } from '../utils/serializers.js';

// PATCH /api/profile — personnalisation de la page publique
export const updateProfile = asyncHandler(async (req, res) => {
  const { user } = req;
  const { theme, ...rest } = req.body;

  if (theme !== undefined) {
    if (THEMES[theme].pro && !getLimits(user.plan).customThemes) {
      throw new AppError(403, 'Ce thème est réservé au plan Pro.', 'PLAN_REQUIRED');
    }
    user.theme = theme;
  }
  Object.assign(user, rest);

  await user.save();
  res.json({ user: serializeUser(user) });
});
