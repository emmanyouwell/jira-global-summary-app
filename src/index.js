import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getIssues', async (req) => {
    const meRes = await api.asUser().requestJira(route`/rest/api/3/myself`);
    const me = await meRes.json();
    console.log(me);

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

resolver.define('getUserAccess', async (req) => {
    const meRes = await api.asUser().requestJira(route`/rest/api/3/myself`);
    const me = await meRes.json();
    const groups = me.groups.items.map(g => g.name);
    const accountId = me.accountId;

    // Check if user is in forbidden groups
    const forbiddenGroups = ['Support'];
    if (groups.some(g => forbiddenGroups.includes(g))) {
        return { allowed: false };
    }

    // Check project roles
    const key = req.context.extension.project?.key || req.context.extension.issue?.fields?.project?.key;
    const rolesRes = await api.asUser().requestJira(route`/rest/api/3/project/${key}/role`);
    const roles = await rolesRes.json();
    console.log('Roles:', roles);
    const forbiddenRoles = ['TK-Support', 'TK-Management'];

    for (const [name, url] of Object.entries(roles)) {
        if (forbiddenRoles.includes(name)) {
            const roleDetailsRes = await api.asUser().requestJira(url);
            const roleDetails = await roleDetailsRes.json();

            const isInRole = roleDetails.actors.some(actor => actor.accountId === accountId);
            if (isInRole) return { allowed: false };
        }
    }

    return { allowed: true };
});



export const run = resolver.getDefinitions();
