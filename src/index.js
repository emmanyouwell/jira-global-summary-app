import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getIssues', async (req) => {
    const projectKey = req.context.extension.project.key;


    const issueRes = await api.asUser().requestJira(
        route`/rest/api/3/search?jql=project=${projectKey}&maxResults=50`
    );
    const issues = (await issueRes.json()).issues;

    const rows = [];

    for (const issue of issues) {
        const worklogRes = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issue.key}/worklog`
        );
        const worklogs = (await worklogRes.json()).worklogs;

        for (const wl of worklogs) {
            rows.push({
                assignee: wl.author.displayName,
                date: wl.started,
                workItem: issue.key + ' - ' + issue.fields.summary,
                timeSpent: wl.timeSpent,
                comment: wl.comment?.content?.[0]?.content?.[0]?.text || '',
            });
        }
    }

    return rows;
});

export const run = resolver.getDefinitions();
