// Text models — tried in order until one succeeds
const TEXT_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'groq/compound-mini',
];

// Vision models — tried in order; if all fail we strip image and answer text-only
const VISION_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
];

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(context, memory) {
  const { userName, classes, assignments, date } = context;

  const classesStr = classes.length
    ? classes.map(c => `  - ${c.name} (id:${c.id}, color:${c.color})`).join('\n')
    : '  none yet';

  const now = new Date(date + 'T00:00:00');
  const upcoming = assignments
    .filter(a => !a.completed).slice(0, 20)
    .map(a => {
      const cls = classes.find(c => c.id === a.classId);
      const diff = Math.round((new Date(a.dueDate + 'T00:00:00') - now) / 86400000);
      const tag = diff < 0 ? 'OVERDUE' : diff === 0 ? 'TODAY' : diff <= 3 ? 'SOON' : 'UPCOMING';
      const est = a.estimatedTime ? `${parseFloat(a.estimatedTime) * 60} min` : 'unknown';
      return `  [${tag}] "${a.name}" — due ${a.dueDate}, priority:${a.priority}, estimated:${est}, class:${cls?.name || 'none'} (id:${a.id})`;
    }).join('\n') || '  none';

  const memStr = memory?.trim() || 'Nothing yet.';

  return `You are Duee AI, a personal study assistant for ${userName}.

Today: ${date}

CLASSES:
${classesStr}

ASSIGNMENTS:
${upcoming}

WHAT I KNOW ABOUT ${userName}:
${memStr}

HOW TO RESPOND:
- Be direct and helpful like a smart friend, not a textbook
- Keep it short unless the student needs a full explanation
- Use plain sentences. Only use bullet points or headers when it genuinely helps (like listing steps or comparing things)
- Never use ** around words — just write normally
- If they share a screenshot or image, look at it carefully and help them with it
- Be warm and encouraging, but skip the fluff

WHEN THE STUDENT SAYS HOW MUCH TIME THEY HAVE (e.g. "I have 30 minutes", "I have an hour"):
1. Parse the time they gave (convert to minutes if needed)
2. From the assignment list above, pick tasks they can realistically start or finish in that window, prioritizing: OVERDUE first → TODAY → SOON → high priority → medium → low
3. For each task, show: the name, the class, how urgent it is, and the estimated time
4. If an assignment's estimated time is longer than their window, still include it but suggest they work on a chunk of it
5. If estimated time is unknown, give a rough guess based on typical assignment types
6. Format as a numbered list — clean and scannable
7. End with one short motivating sentence, not a paragraph

Example format when student says "I have 45 minutes":
Here's what fits in 45 minutes, most urgent first:

1. [Assignment name] — [Class] · OVERDUE · ~20 min
   Start here, it's past due.

2. [Assignment name] — [Class] · due today · ~15 min
   Quick win, do this right after.

3. [Assignment name] — [Class] · due in 2 days · ~30 min (do a chunk)
   Start the outline now, finish tomorrow.

That's ~35 min of focused work. Go.

ACTIONS you can perform (add at the END of your reply, after your text):
Add assignment  → [ADD_ASSIGNMENT:{"name":"...","dueDate":"YYYY-MM-DD","priority":"high|medium|low","classId":"id-or-empty"}]
Add class       → [ADD_CLASS:{"name":"...","color":"#hex","professor":"...","icon":"book|code|science|math|art|music|sports|globe|star|fire"}]
Remove assign   → [REMOVE_ASSIGNMENT:{"id":"..."}]
Remember fact   → [REMEMBER:{"fact":"..."}]

RULES for actions:
- Only use actions when the student explicitly asks
- Match classId from the class list above
- Use REMEMBER when you learn something useful: their major, schedule, goals, exam dates, struggles
- You can use multiple action tags in one reply
- Never show the raw IDs or action tags in your visible text

BULK ASSIGNMENT RULES (when student pastes a list of many assignments):
- Add them ALL immediately — do NOT ask for confirmation first
- Output ALL assignments as separate [ADD_ASSIGNMENT:...] tags — do not skip any
- Keep your text response to one short line (e.g. "Adding all 25 assignments now...")
- If a due date is missing, default to 7 days from today (${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]})
- If the class is unclear, leave classId as empty string ""
- Do not stop early — add every single assignment in the list`;
}

function parseActions(text) {
  const actions = [];
  for (const m of text.matchAll(/\[ADD_ASSIGNMENT:([\s\S]*?)\]/g)) { try { actions.push({ type: 'ADD_ASSIGNMENT', data: JSON.parse(m[1]) }); } catch {} }
  for (const m of text.matchAll(/\[ADD_CLASS:([\s\S]*?)\]/g))       { try { actions.push({ type: 'ADD_CLASS', data: JSON.parse(m[1]) }); } catch {} }
  for (const m of text.matchAll(/\[REMOVE_ASSIGNMENT:([\s\S]*?)\]/g)){ try { actions.push({ type: 'REMOVE_ASSIGNMENT', data: JSON.parse(m[1]) }); } catch {} }
  return actions;
}
function parseMemories(text) {
  const facts = [];
  for (const m of text.matchAll(/\[REMEMBER:([\s\S]*?)\]/g)) { try { facts.push(JSON.parse(m[1]).fact); } catch {} }
  return facts;
}
function stripTags(text) {
  return text
    .replace(/\[ADD_ASSIGNMENT:[\s\S]*?\]/g, '')
    .replace(/\[ADD_CLASS:[\s\S]*?\]/g, '')
    .replace(/\[REMOVE_ASSIGNMENT:[\s\S]*?\]/g, '')
    .replace(/\[REMEMBER:[\s\S]*?\]/g, '')
    .trim();
}

async function callModel(model, system, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s for bulk operations
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages],
        max_tokens: 2000,
        temperature: 0.65,
      }),
    });
    clearTimeout(timeout);
    return res;
  } catch {
    clearTimeout(timeout);
    return null; // timeout or network error — try next model
  }
}

export async function POST(request) {
  try {
    const { messages, hasImage, context, memory } = await request.json();

    if (!messages?.length) return Response.json({ error: 'No messages provided.' }, { status: 400 });

    // Trim conversation history to avoid context overflow.
    // Keep the last 10 messages, but always include the last user message.
    const trimMessages = msgs => {
      if (msgs.length <= 10) return msgs;
      // Always keep the last 10, but truncate any single message over 2000 chars
      return msgs.slice(-10).map(m => {
        if (typeof m.content === 'string' && m.content.length > 2000) {
          return { ...m, content: m.content.slice(0, 2000) + '\n...[truncated for context]' };
        }
        return m;
      });
    };

    const system = buildSystemPrompt(
      context || { userName: 'Student', classes: [], assignments: [], date: new Date().toISOString().split('T')[0] },
      memory
    );

    let res, raw;

    async function tryModels(modelList, msgs) {
      for (const model of modelList) {
        const r = await callModel(model, system, msgs);
        if (!r) continue; // timed out
        let j;
        try { j = await r.json(); } catch { continue; }
        if (r.ok && !j.error) return { res: r, raw: j };
      }
      return { res: null, raw: null };
    }

    const trimmed = trimMessages(messages);

    if (hasImage) {
      ({ res, raw } = await tryModels(VISION_MODELS, trimmed));
      if (!res) {
        // Strip images, fall back to text models
        const textOnly = trimmed.map(m =>
          Array.isArray(m.content)
            ? { ...m, content: m.content.filter(p => p.type === 'text').map(p => p.text).join(' ') || '(image attached)' }
            : m
        );
        ({ res, raw } = await tryModels(TEXT_MODELS, textOnly));
        if (res && raw) {
          const content = raw.choices?.[0]?.message?.content || '';
          raw = { ...raw, choices: [{ message: { content: "(I couldn't analyze your image right now, but here's help with your question.)\n\n" + content } }] };
        }
      }
    } else {
      ({ res, raw } = await tryModels(TEXT_MODELS, trimmed));
    }

    if (!res?.ok || raw?.error) {
      return Response.json({ error: 'AI unavailable right now. Try again in a moment.' }, { status: 502 });
    }

    const fullText = raw.choices?.[0]?.message?.content || '';
    return Response.json({
      content:   stripTags(fullText),
      actions:   parseActions(fullText),
      memories:  parseMemories(fullText),
    });
  } catch (err) {
    console.error('Chat route error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
