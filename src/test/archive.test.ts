import { describe, it, expect } from 'vitest';
import { buildArchiveReason, validateArchive } from '@/lib/archive';

describe('archivo de clientes', () => {
  it('combina motivo y nota', () => expect(buildArchiveReason('Duplicado', ' de ACME ')).toBe('Duplicado — de ACME'));
  it('solo motivo sin nota', () => expect(buildArchiveReason('GG.CC.', '')).toBe('GG.CC.'));
  it('motivo obligatorio', () => expect(validateArchive('', 'x')).not.toBeNull());
  it('Otro exige nota', () => expect(validateArchive('Otro', '  ')).not.toBeNull());
  it('Descartado sin nota es válido', () => expect(validateArchive('Descartado', '')).toBeNull());
});
