# Database model plan

MongoDB is the initial persistence layer. Models intentionally do not embed large or independently-changing documents; references preserve a clear audit trail from a CV profile through analysis and a reviewed application.

## Relationships

```text
User 1--* CVProfile
User 0..1--* Job
Job 1--* JobAnalysis
CVProfile 0..1--* JobAnalysis
CVProfile 1--* GeneratedCV
Job 0..1--* GeneratedCV
Job 1--* Application
CVProfile 1--* Application
GeneratedCV 0..1--* Application
Application 1--* ApplicationLog
```

`Job.userId` is optional until authentication and per-user saved-job behaviour are implemented. Jobs are deduplicated using the `source + url` unique index. Every model except `ApplicationLog` uses Mongoose `createdAt` and `updatedAt`; logs are immutable and only store `createdAt`.

## Initial indexes

- `User.email` — unique
- `Job.source + Job.url` — unique
- Foreign keys used in normal list/detail queries: CV profile user, job user, analysis job/profile, generated CV profile/job, application job/profile, and application-log application.

## Deliberate future decisions

- Add a MongoDB connection lifecycle before any route or worker persistence uses these models.
- Revisit job deduplication if a single public listing needs multiple source URLs.
- Store generated PDF/DOCX assets externally and keep only file metadata/URLs in MongoDB.
- Add authorization checks after authentication establishes user ownership.
