export type RemoteType = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export interface JobScoringInput {
  title: string;
  description: string;
  location?: string;
  languageRequirement?: string | string[] | { language: string; level?: string; required?: boolean }[];
  remoteType?: RemoteType;
  cvRawText: string;
}

export interface JobScoringResult {
  score: number;
  decision: 'apply' | 'maybe' | 'ignore';
  positiveSignals: string[];
  negativeSignals: string[];
  risks: string[];
}

type Rule = { label: string; points: number; matches: (jobText: string, cvText: string, input: JobScoringInput) => boolean; risk?: string };

const normalise = (value: string | undefined): string => value?.toLocaleLowerCase('en-US') ?? '';
const contains = (value: string, expression: RegExp) => expression.test(value);

function languageText(value: JobScoringInput['languageRequirement']): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.map((item) => typeof item === 'string' ? item : `${item.language} ${item.level ?? ''} ${item.required ? 'required' : ''}`).join(' ');
}

function hasInJobAndCv(expression: RegExp) {
  return (jobText: string, cvText: string) => contains(jobText, expression) && contains(cvText, expression);
}

const positiveRules: Rule[] = [
  { label: 'React', points: 15, matches: hasInJobAndCv(/\breact(?:\.js)?\b/i) },
  { label: 'Node.js', points: 15, matches: hasInJobAndCv(/\bnode\.?js\b/i) },
  { label: 'TypeScript', points: 10, matches: hasInJobAndCv(/\btypescript\b/i) },
  { label: 'JavaScript', points: 10, matches: hasInJobAndCv(/\bjavascript\b/i) },
  { label: 'MongoDB', points: 8, matches: hasInJobAndCv(/\bmongodb\b/i) },
  { label: 'Express', points: 8, matches: hasInJobAndCv(/\bexpress(?:\.js)?\b/i) },
  { label: 'Junior', points: 20, matches: (jobText) => contains(jobText, /\bjunior\b|entry[ -]level|graduate/i) },
  { label: 'Internship', points: 20, matches: (jobText) => contains(jobText, /\binternship\b|\bintern\b|\bstaj\b/i) },
  { label: 'Part-time', points: 20, matches: (jobText) => contains(jobText, /\bpart[ -]?time\b/i) },
  { label: 'Remote', points: 10, matches: (jobText, _cvText, input) => input.remoteType === 'remote' || contains(jobText, /\bremote\b/i) },
  { label: 'English', points: 10, matches: (jobText, _cvText, input) => contains(`${jobText} ${languageText(input.languageRequirement)}`, /\benglish\b/i) },
  { label: 'Student', points: 15, matches: (jobText, cvText) => contains(jobText, /\bstudent\b|undergraduate|university/i) && contains(cvText, /\bstudent\b|undergraduate|university|öğrenci/i) },
];

const negativeRules: Rule[] = [
  { label: 'Senior', points: -40, matches: (jobText) => contains(jobText, /\bsenior\b/i), risk: 'Kıdem seviyesi aday profiliyle uyumsuz olabilir.' },
  { label: '5+ years', points: -40, matches: (jobText) => contains(jobText, /\b(?:5|five)\+?\s*(?:years?|yrs?)\b/i), risk: 'Beş yıl veya daha fazla deneyim isteniyor.' },
  { label: 'Czech required', points: -50, matches: (jobText, _cvText, input) => contains(`${jobText} ${languageText(input.languageRequirement)}`, /czech.{0,30}(?:required|requirement)|(?:required|requirement).{0,30}czech/i), risk: 'Çekçe zorunluluğu başvuru engeli olabilir.' },
  { label: 'Native Czech', points: -60, matches: (jobText, _cvText, input) => contains(`${jobText} ${languageText(input.languageRequirement)}`, /native\s+czech|czech\s+native/i), risk: 'Ana dil seviyesinde Çekçe isteniyor.' },
  { label: 'Full-time only', points: -20, matches: (jobText) => contains(jobText, /\bfull[ -]?time\s+(?:only|required)\b|\bonly\s+full[ -]?time\b/i), risk: 'İlan yalnızca tam zamanlı çalışmaya açık.' },
];

/** Scores a listing deterministically. Technical points require matches in both the listing and CV. */
export function scoreJob(input: JobScoringInput): JobScoringResult {
  const jobText = normalise([input.title, input.description, input.location, languageText(input.languageRequirement)].filter(Boolean).join(' '));
  const cvText = normalise(input.cvRawText);
  const matchedPositiveRules = positiveRules.filter((rule) => rule.matches(jobText, cvText, input));
  const matchedNegativeRules = negativeRules.filter((rule) => rule.matches(jobText, cvText, input));
  const score = Math.max(0, Math.min(100, [...matchedPositiveRules, ...matchedNegativeRules].reduce((total, rule) => total + rule.points, 0)));
  return {
    score,
    decision: score >= 70 ? 'apply' : score >= 45 ? 'maybe' : 'ignore',
    positiveSignals: matchedPositiveRules.map((rule) => `${rule.label} +${rule.points}`),
    negativeSignals: matchedNegativeRules.map((rule) => `${rule.label} ${rule.points}`),
    risks: matchedNegativeRules.flatMap((rule) => rule.risk ? [rule.risk] : []),
  };
}
