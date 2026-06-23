import type { CandidateProfile, JobListing, JobScore } from '@ai-job-hunter/shared';

export function scoreJob(job: JobListing, candidate: CandidateProfile): JobScore {
  const haystack = `${job.title} ${job.description}`.toLocaleLowerCase();
  const matchedSkills = candidate.skills.filter((skill) => haystack.includes(skill.toLocaleLowerCase()));
  const missingSkills = candidate.skills.filter((skill) => !matchedSkills.includes(skill));
  const score = candidate.skills.length === 0 ? 0 : Math.round((matchedSkills.length / candidate.skills.length) * 100);
  return { score, matchedSkills, missingSkills, reasons: matchedSkills.map((skill) => `Matches ${skill}`) };
}
