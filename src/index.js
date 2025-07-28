import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import pLimit from "p-limit";
const resolver = new Resolver();

const limit = pLimit(5)
async function fetchAllWorklogs(issueKey) {
  const allWorklogs = [];
  let startAt = 0;
  let total = 0;

  do {
    const res = await api
      .asUser()
      .requestJira(
        route`/rest/api/3/issue/${encodeURIComponent(
          issueKey
        )}/worklog?startAt=${startAt}&maxResults=100`
      );
    const json = await res.json();

    allWorklogs.push(...json.worklogs);
    total = json.total;
    startAt += json.worklogs.length;
  } while (allWorklogs.length < total);

  return allWorklogs;
}

resolver.define("getIssues", async (req) => {
  console.log("getIssues called with req:", JSON.stringify(req));

  try {
    // 🔒 Get current user info
    const userRes = await api.asUser().requestJira(route`/rest/api/3/myself`);
    const userData = await userRes.json();
    const accountId = userData.accountId;

    console.log(
      `Fetched user data for accountId: ${accountId}, displayName: ${userData.displayName}`
    );

    // 🔒 Get user's groups
    const groupsRes = await api
      .asApp()
      .requestJira(route`/rest/api/3/user/groups?accountId=${accountId}`);
    const groups = await groupsRes.json();

    console.log(
      `User ${userData.displayName} belongs to groups:`,
      groups.map((g) => g.name)
    );

    const allowedGroups = ["Developers", "administrators"];
    const isAllowed = groups.some((group) =>
      allowedGroups.includes(group.name)
    );

    if (!isAllowed) {
      console.log(
        `Access denied for user: ${userData.displayName
        } (not in allowed groups: ${allowedGroups.join(", ")})`
      );
      return {
        statusCode: 403,
        body: "Access denied. You are not allowed to use this app.",
      };
    }

    console.log(
      `User ${userData.displayName} is authorized. Proceeding to fetch issues.`
    );

    const projectKey = req.context.extension.project.key;
    const startAt = req.payload.startAt || 0;
    const pageSize = req.payload.pageSize || 20;
    // Step 1: Fetch all issues with worklogs (only keys)
    const issueKeys = [];
    let start = 0;
    let isLast = false;

    while (!isLast) {
      const response = await api.asUser().requestJira(
        route`/rest/api/3/search?jql=project=${projectKey} AND worklogAuthor IS NOT EMPTY&startAt=${start}&maxResults=100&fields=key`
      );
      const json = await response.json();

      const keys = json.issues.map((issue) => issue.key);
      issueKeys.push(...keys);

      isLast = json.startAt + json.issues.length >= json.total;
      start += json.issues.length;
    }
    // Step 2: Paginate keys manually
    const pagedKeys = issueKeys.slice(startAt, startAt + pageSize);
    // Step 3: Fetch each issue’s summary and worklogs
    const worklogPromises = pagedKeys.map((key) =>
      limit(async () => {
        try {
          const issueRes = await api
            .asUser()
            .requestJira(route`/rest/api/3/issue/${key}?fields=summary`);
          const issue = await issueRes.json();

          const worklogs = await fetchAllWorklogs(key);
          return worklogs.map((wl) => ({
            assignee: wl.author.displayName,
            date: wl.started,
            workItem: `${key} - ${issue.fields.summary}`,
            timeSpent: wl.timeSpent,
            comment: wl.comment?.content?.[0]?.content?.[0]?.text || "",
          }));
        } catch (err) {
          console.error(`Failed to fetch worklog for ${key}:`, err);
          return [];
        }
      })
    );


    const results = await Promise.allSettled(worklogPromises);

    const rows = results
      .filter((res) => res.status === "fulfilled")
      .flatMap((res) => res.value);
    console.log("Row ulit: ", rows);
    return {
      statusCode: 200,
      body: {
        rows,
        pagination: {
          startAt,
          maxResults: pageSize,
          total: issueKeys.length,
          isLast: startAt + pageSize >= issueKeys.length,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error in getIssues resolver:", error);
    return {
      statusCode: 500,
      body: "Internal server error. Please try again later.",
    };
  }
});

export const run = resolver.getDefinitions();
