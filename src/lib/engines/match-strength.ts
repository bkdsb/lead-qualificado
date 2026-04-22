import type { DbLeadIdentitySignal, MatchStrength } from '@/types/database';

export interface MatchStrengthResult {
  strength: MatchStrength;
  numericValue: number;
  availableSignals: string[];
  missingSignals: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Evaluate match strength based on available identity signals.
 *
 * Classification rules:
 * - Very Low: only event_source_url + user_agent + IP (or less)
 * - Low: has fbc OR fbp (but not phone/email)
 * - Medium: has fbc AND fbp (but not phone/email)
 * - Good: has phone OR email
 * - Strong: has phone + email + (external_id OR fbc/fbp OR ctwa_clid)
 */
export function evaluateMatchStrength(
  signals: DbLeadIdentitySignal[],
  leadContact?: { email?: string | null; phone?: string | null }
): MatchStrengthResult {
  const currentSignals = signals.filter(s => s.is_current);
  const signalTypes = new Set(currentSignals.map(s => s.signal_type));

  // Also consider email/phone stored directly on the lead record
  if (leadContact?.email) signalTypes.add('email');
  if (leadContact?.phone) signalTypes.add('phone');

  const hasEmail = signalTypes.has('email');
  const hasPhone = signalTypes.has('phone');
  const hasFbc = signalTypes.has('fbc');
  const hasFbp = signalTypes.has('fbp');
  const hasCtwaCid = signalTypes.has('ctwa_clid');
  const hasExternalId = signalTypes.has('external_id');
  const hasIp = signalTypes.has('client_ip_address');
  const hasUa = signalTypes.has('client_user_agent');

  const availableSignals = Array.from(signalTypes);
  const missingSignals: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Track what's missing
  if (!hasEmail) missingSignals.push('email');
  if (!hasPhone) missingSignals.push('phone');
  if (!hasFbc) missingSignals.push('fbc');
  if (!hasFbp) missingSignals.push('fbp');
  if (!hasExternalId) missingSignals.push('external_id');

  // Determine strength
  let strength: MatchStrength = 'very_low';
  let numericValue = 1;

  // Strong: phone + email + (external_id OR fbc/fbp OR ctwa_clid)
  if (hasPhone && hasEmail && (hasExternalId || hasFbc || hasFbp || hasCtwaCid)) {
    strength = 'strong';
    numericValue = 5;
  }
  // Good: phone OR email
  else if (hasPhone || hasEmail) {
    strength = 'good';
    numericValue = 4;

    if (!hasPhone) {
      recommendations.push('Coletar telefone para melhorar match');
    }
    if (!hasEmail) {
      recommendations.push('Coletar email para melhorar match');
    }
    if (!hasFbc && !hasFbp) {
      recommendations.push('Capturar fbc/fbp do cookie para match adicional');
    }
  }
  // Medium: fbc AND fbp
  else if (hasFbc && hasFbp) {
    strength = 'medium';
    numericValue = 3;

    recommendations.push('Coletar email ou telefone para atingir Good match');
  }
  // Low: fbc OR fbp
  else if (hasFbc || hasFbp) {
    strength = 'low';
    numericValue = 2;

    recommendations.push('Coletar email e telefone para melhorar match significativamente');
  }
  // Very Low: only IP/UA or nothing
  else {
    strength = 'very_low';
    numericValue = 1;

    warnings.push('Match muito fraco — atribuição será prejudicada');
    recommendations.push('Coletar email, telefone ou dados de cookie (fbc/fbp) urgentemente');
  }

  // Additional warnings based on what's available
  if (strength === 'very_low' && !hasIp && !hasUa) {
    warnings.push('Nenhum sinal de identidade disponível');
  }

  return {
    strength,
    numericValue,
    availableSignals,
    missingSignals,
    warnings,
    recommendations,
  };
}

/**
 * Get a human-readable summary of match strength for display.
 */
export function getMatchStrengthSummary(result: MatchStrengthResult): string {
  const signalCount = result.availableSignals.length;
  const labels: Record<MatchStrength, string> = {
    very_low: `Muito Baixo (${signalCount} sinais)`,
    low: `Baixo (${signalCount} sinais)`,
    medium: `Médio (${signalCount} sinais)`,
    good: `Bom (${signalCount} sinais)`,
    strong: `Forte (${signalCount} sinais)`,
  };
  return labels[result.strength];
}
