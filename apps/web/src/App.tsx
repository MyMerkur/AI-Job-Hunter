import { scoreJob } from '@ai-job-hunter/scoring';

const demoScore = scoreJob({
  title: 'TypeScript Developer',
  description: 'Build React and Node.js products with TypeScript.',
  source: 'demo',
  url: 'https://example.com/jobs/typescript-developer',
}, { skills: ['TypeScript', 'React', 'Node.js'] });

export function App() {
  return (
    <main>
      <p className="eyebrow">AI JOB HUNTER</p>
      <h1>Your job search, with a thoughtful co-pilot.</h1>
      <p className="lede">Upload a CV, discover roles, and review tailored application material before anything is sent.</p>
      <section>
        <h2>Baseline is running</h2>
        <p>Example rule-based match: <strong>{demoScore.score}%</strong></p>
        <p className="muted">Next: CV upload, job-source integrations, and a review queue.</p>
      </section>
    </main>
  );
}
