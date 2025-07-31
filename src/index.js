import Resolver from "@forge/resolver";
import api, { route } from "@forge/api";
import pLimit from "p-limit";

const resolver = new Resolver();
const limit = pLimit(5);

// 🎯 CACHE: Store data per project to avoid re-fetching
const dataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

async function getAllWorklogData(projectKey) {
  const cacheKey = `project_${projectKey}`;
  const cached = dataCache.get(cacheKey);
  
  // 🚀 Return cached data if still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("📦 Using cached data");
    return cached.data;
  }

  console.log("🔄 Fetching fresh data...");
  
  const issueKeys = [];
  let start = 0;
  let isLast = false;

  while (!isLast) {
    const res = await api.asUser().requestJira(
      route`/rest/api/3/search?jql=project=${projectKey} AND worklogAuthor IS NOT EMPTY&startAt=${start}&maxResults=100&fields=key`
    );
    const data = await res.json();
    issueKeys.push(...data.issues.map((issue) => issue.key));
    start += data.issues.length;
    isLast = start >= data.total;
  }

  const worklogPromises = issueKeys.map((key) =>
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
        console.error(`❌ Failed to fetch ${key}:`, err);
        return [];
      }
    })
  );

  const results = await Promise.allSettled(worklogPromises);
  const allRows = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // 💾 Cache the results
  dataCache.set(cacheKey, {
    data: allRows,
    timestamp: Date.now()
  });

  return allRows;
}

resolver.define("getIssues", async (req) => {
  console.log("getIssues called with req:", JSON.stringify(req));

  try {
    const userRes = await api.asUser().requestJira(route`/rest/api/3/myself`);
    const userData = await userRes.json();
    const accountId = userData.accountId;

    const searchTerm = (req.payload.searchTerm || "").toLowerCase();
    const startAt = req.payload.startAt || 0;
    const pageSize = req.payload.pageSize || 20;

    console.log(`Authenticated user: ${userData.displayName} (${accountId})`);

    const groupsRes = await api
      .asApp()
      .requestJira(route`/rest/api/3/user/groups?accountId=${accountId}`);
    const groups = await groupsRes.json();
    const allowedGroups = ["Developers", "administrators"];
    const isAllowed = groups.some((g) => allowedGroups.includes(g.name));

    if (!isAllowed) {
      console.warn(`Access denied for ${userData.displayName}`);
      return { statusCode: 403, body: "Access denied." };
    }

    const projectKey = req.context.extension.project.key;
    
    // 🚀 Get data from cache (fast!) or fetch once
    const allRows = await getAllWorklogData(projectKey);

    let filteredRows = allRows;
    if (searchTerm) {
      filteredRows = allRows.filter((row) => {
        return (
          row.assignee.toLowerCase().includes(searchTerm) ||
          row.workItem.toLowerCase().includes(searchTerm) ||
          row.comment.toLowerCase().includes(searchTerm)
        );
      });
    }

    const paginatedRows = filteredRows.slice(startAt, startAt + pageSize);

    return {
      statusCode: 200,
      body: {
        rows: paginatedRows,
        pagination: {
          startAt,
          maxResults: pageSize,
          total: filteredRows.length,
          isLast: startAt + pageSize >= filteredRows.length,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error in getIssues:", error);
    return {
      statusCode: 500,
      body: "Internal server error. Please try again later.",
    };
  }
});

export const run = resolver.getDefinitions();