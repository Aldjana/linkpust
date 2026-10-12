import { getLimits } from './plans.js';

// Liens réellement publiés sur la page publique.
// Free : seuls les 5 premiers liens actifs (dans l'ordre) sont visibles. Si un utilisateur
// redescend de Pro à Free avec plus de 5 liens, rien n'est supprimé : les surplus sont
// simplement masqués jusqu'à un nouvel upgrade.
export function publishedLinks(sortedLinks, plan) {
  const active = sortedLinks.filter((link) => link.active);
  const { maxLinks } = getLimits(plan);
  return maxLinks === null ? active : active.slice(0, maxLinks);
}
