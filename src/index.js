import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

async function fetchAllWorklogs(issueKey) {
    const allWorklogs = [];
    let startAt = 0;
    let total = 0;

    do {
        const res = await api.asUser().requestJira(
            route`/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog?startAt=${startAt}&maxResults=100`
        );
        const json = await res.json();

        allWorklogs.push(...json.worklogs);
        total = json.total;
        startAt += json.worklogs.length;
    } while (allWorklogs.length < total);

    return allWorklogs;
}
resolver.define('getIssues', async (req) => {
    const projectKey = req.context.extension.project.key;
    const issueRes = await api.asUser().requestJira(
        route`/rest/api/3/search?jql=project=${projectKey} AND worklogAuthor IS NOT EMPTY&maxResults=100`
    );
    const issues = (await issueRes.json()).issues;

    const worklogPromises = issues.map(async (issue) => {
        try {
            const worklogs = await fetchAllWorklogs(issue.key);
            return worklogs.map((wl) => ({
                assignee: wl.author.displayName,
                date: wl.started,
                workItem: `${issue.key} - ${issue.fields.summary}`,
                timeSpent: wl.timeSpent,
                comment: wl.comment?.content?.[0]?.content?.[0]?.text || '',
            }));
        } catch (err) {
            console.error(`Failed to fetch worklog for ${issue.key}:`, err);
            return [];
        }
    });
    const results = await Promise.allSettled(worklogPromises);

    // Flatten only fulfilled ones
    const rows = results
        .filter((res) => res.status === 'fulfilled')
        .flatMap((res) => res.value);

    return rows;
});



export const run = resolver.getDefinitions();
