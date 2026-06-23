import { describe, expect, it } from 'vitest';
import { scoreJob } from './index.js';

const baseCv = 'Computer science student. React Node.js TypeScript JavaScript MongoDB Express. English.';

describe('scoreJob', () => {
  it('recommends applying to a strong junior remote match', () => {
    const result = scoreJob({
      title: 'Junior React Developer',
      description: 'Part-time remote internship using React, Node.js, TypeScript, MongoDB and Express. English required for university students.',
      remoteType: 'remote', languageRequirement: 'English required', cvRawText: baseCv,
    });
    expect(result.score).toBe(100);
    expect(result.decision).toBe('apply');
    expect(result.positiveSignals).toContain('React +15');
  });

  it('penalises senior roles with language and experience blockers', () => {
    const result = scoreJob({
      title: 'Senior Node.js Engineer', description: '5+ years required. Full-time only. Native Czech required.',
      languageRequirement: [{ language: 'Czech', level: 'native', required: true }], cvRawText: baseCv,
    });
    expect(result.score).toBe(0);
    expect(result.decision).toBe('ignore');
    expect(result.negativeSignals).toContain('Senior -40');
    expect(result.risks).toContain('Ana dil seviyesinde Çekçe isteniyor.');
  });

  it('does not award technical skill points missing from the CV', () => {
    const result = scoreJob({ title: 'React Developer', description: 'React and TypeScript required.', cvRawText: 'Python developer' });
    expect(result.score).toBe(0);
    expect(result.positiveSignals).toEqual([]);
  });
});
