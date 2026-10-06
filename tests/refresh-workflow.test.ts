import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const refreshWorkflow = readFileSync('.github/workflows/refresh-data.yml', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');

describe('scheduled football data refresh', () => {
  it('updates through a protected-branch pull request and dispatches required CI', () => {
    expect(refreshWorkflow).toContain('automation/refresh-football-data');
    expect(refreshWorkflow).toContain('git push --force origin "HEAD:$refresh_branch"');
    expect(refreshWorkflow).toContain('gh pr create');
    expect(refreshWorkflow).toContain('gh workflow run ci.yml --ref "$refresh_branch"');
    expect(refreshWorkflow).toContain('gh run watch "$run_id" --exit-status');
    expect(refreshWorkflow).toContain('"repos/$GITHUB_REPOSITORY/statuses/$head_sha"');
    expect(refreshWorkflow).toContain('gh pr merge "$pr_number" --squash --delete-branch');
    expect(refreshWorkflow).toContain('gh workflow run deploy-pages.yml --ref main');
    expect(refreshWorkflow).toContain('gh workflow run deploy-cloudflare.yml --ref main');
    expect(refreshWorkflow).not.toMatch(/git push\s*$/m);
    expect(ciWorkflow).toMatch(/^\s{2}workflow_dispatch:\s*$/m);
  });
});
