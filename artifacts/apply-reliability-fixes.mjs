import { readFileSync, writeFileSync } from 'node:fs';
function replaceRegion(text, start, end, replacement, offset = 0) {
  const a = text.indexOf(start, offset), b = text.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Missing edit anchor: ${start}`);
  return text.slice(0, a) + replacement + text.slice(b);
}
let agents = readFileSync('src/app/agents.mjs', 'utf8');
agents = agents.replace("import { scopedProvider }", "import { refundInTransaction } from './reliability.mjs';\nimport { scopedProvider }");
agents = agents.replaceAll("SELECT status FROM agent_runs WHERE id = ?'", "SELECT status FROM agent_runs WHERE id = ? FOR UPDATE'");
agents = agents.replace("        return built;\n      });\n      await log(workspace.id, principal.name, 'Companion agent responded', runId, agentId);", "        await log(workspace.id, principal.name, 'Companion agent responded', runId, agentId);\n        return built;\n      });");
agents = replaceRegion(agents, '        if (points > 0) {', '        if (idempotencyKey)', "        await refundInTransaction(store, principal.id, workspace.id, runId, 'agent_run');\n", agents.indexOf('    } catch (error) {', agents.indexOf('async function send')));
agents = agents.replace("SELECT * FROM agent_runs WHERE status = 'running' AND created_at < ?\"", "SELECT * FROM agent_runs WHERE status = 'running' AND created_at < ? ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED\"");
agents = replaceRegion(agents, '        const debit = await db.prepare(', '        await db.prepare("UPDATE agent_runs SET status', "        await refundInTransaction(store, run.principal_id, run.workspace_id, run.id, 'agent_run', now);\n", agents.indexOf('async function reconcile'));
agents = agents.replace("AND created_at < ?\").all(new Date(now - 120000)", "AND created_at < ? ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED\").all(new Date(now - 120000)");
agents = replaceRegion(agents, '        if (data.pointsCharged &&', "        await db.prepare('UPDATE records", "        await refundInTransaction(store, data.principalId, row.workspace_id, row.id, 'ai_review', now);\n");
writeFileSync('src/app/agents.mjs', agents);

let ai = readFileSync('src/app/ai.mjs', 'utf8');
ai = replaceRegion(ai, "      const review = (await records(req.workspace.id, 'ai_review')).find(", "      if (!review)", "      const row = await db.prepare(\"SELECT data FROM records WHERE id = ? AND workspace_id = ? AND kind = 'ai_review' FOR UPDATE\").get(req.params.id, req.workspace.id);\n      const review = row ? { ...JSON.parse(row.data), id: req.params.id } : null;\n");
ai = replaceRegion(ai, '      if (\n        review.pointsCharged &&', '      await log(', "      await refundInTransaction(store, review.principalId, req.workspace.id, review.id, 'ai_review');\n");
ai = ai.replaceAll("SELECT data FROM records WHERE id = ?'", "SELECT data FROM records WHERE id = ? FOR UPDATE'");
ai = ai.replace("if (current && JSON.parse(current.data).status === 'cancelled') return;", "if (!current || JSON.parse(current.data).status !== 'pending') return;");
ai = replaceRegion(ai, '        if (\n          !(await db', "        if (!(await db.prepare('SELECT 1 FROM records", "        await refundInTransaction(store, req.user.id, req.workspace.id, item.id, 'ai_review');\n", ai.indexOf('    } catch (error) {', ai.indexOf('const item = reserved.item')));
writeFileSync('src/app/ai.mjs', ai);
