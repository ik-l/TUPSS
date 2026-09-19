// Shared Nutri-Score / NOVA chip rendering (used in the Log form preview
// and the Dashboard meal list) — both come from Open Food Facts lookups.

const NUTRISCORE_COLORS = { A: '#16a34a', B: '#84cc16', C: '#f59e0b', D: '#f97316', E: '#dc2626' };

function chipsHtml(nutriscore, nova) {
  const parts = [];
  if (nutriscore) {
    const color = NUTRISCORE_COLORS[nutriscore] || '#6b7280';
    parts.push(`<span class="quality-chip" style="background:${color}">Nutri-Score ${nutriscore}</span>`);
  }
  if (nova) {
    const novaNote = nova >= 4 ? ' (highly processed)' : '';
    parts.push(`<span class="quality-chip" style="background:#4b5563">NOVA ${nova}${novaNote}</span>`);
  }
  return parts.join(' ');
}

export const Quality = { NUTRISCORE_COLORS, chipsHtml };
