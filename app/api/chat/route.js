// Text models — tried in order, picked dynamically from live free list
const PREFERRED_TEXT = [
  'nvidia/nemotron-3-ultra-550b-a55b',
  'minimax/minimax-m3',
  'nvidia/nemotron-3-super-120b-a12b',
  'google/gemma-4-31b-it',
  'google/gemma-4-26b-a4b-it',
  'openrouter/free',
];

// Models that are specialized/bad for general chat — skip them
const SKIP_MODELS = ['content-safety', 'finance', 'lyria', 'audio', 'clip', 'note-preview', 'inkling', 'laguna', 'lightning', 'code'];

// Vision models — hardcoded because the free-list filter is unreliable for vision
// Each is tried in order; if all fail we strip the image and answer text-only
const VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen2-vl-7b-instruct:free',
  'google/gemma-3-12b-it:free',
];

let _textCache = null, _textCacheAt = 0;

async function getTextModels(apiKey) {
  const now = Date.now();
  if (_textCache && now - _textCacheAt < 3_600_000) return _textCache;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const { data } = await res.json();
    const free = (data || [])
      .filter(m => parseFloat(m.pricing?.prompt ?? 1) === 0)
      .map(m => m.id)
      .filter(id => !SKIP_MODELS.some(s => id.includes(s)));
    const matched = PREFERRED_TEXT.map(p => free.find(f => f.startsWith(p))).filter(Boolean);
    const rest    = free.filter(f => !PREFERRED_TEXT.some(p => f.startsWith(p))).sort();
    _textCache = [...new Set([...matched, ...rest])];
    _textCacheAt = now;
    return _textCache;
  } catch {
    return ['nvidia/nemotron-3-ultra-550b-a55b:free', 'minimax/minimax-m3:free', 'openrouter/free'];
  }
}

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
- Never show the raw IDs or action tags in your visible text`;
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
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://duee.app',
      'X-Title': 'Duee Student Planner',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 1200,
      temperature: 0.65,
    }),
  });
}

export async function POST(request) {
  try {
    const { messages, hasImage, context, memory } = await request.json();

    if (!messages?.length) return Response.json({ error: 'No messages provided.' }, { status: 400 });

    const system = buildSystemPrompt(
      context || { userName: 'Student', classes: [], assignments: [], date: new Date().toISOString().split('T')[0] },
      memory
    );

    const apiKey = process.env.OPENROUTER_API_KEY;
    let res, raw;

    if (hasImage) {
      // Try vision models first
      for (const model of VISION_MODELS) {
        res = await callModel(model, system, messages);
        raw = await res.json();
        if (res.ok && !raw.error) break;
        res = null; raw = null;
      }
      // If all vision models failed, strip images and answer text-only
      if (!res || !res.ok || raw?.error) {
        const textOnly = messages.map(m =>
          Array.isArray(m.content)
            ? { ...m, content: m.content.filter(p => p.type === 'text').map(p => p.text).join(' ') || '(image attached)' }
            : m
        );
        const textModels = await getTextModels(apiKey);
        for (const model of textModels) {
          res = await callModel(model, system, textOnly);
          raw = await res.json();
          if (res.ok && !raw.error) {
            // Prepend a note that image couldn't be processed
            const content = raw.choices?.[0]?.message?.content || '';
            raw = { ...raw, choices: [{ message: { content: "(I couldn't fully analyze your image right now, but I'll help with your text question.)\n\n" + content } }] };
            break;
          }
        }
      }
    } else {
      const textModels = await getTextModels(apiKey);
      for (const model of textModels) {
        res = await callModel(model, system, messages);
        raw = await res.json();
        if (res.ok && !raw.error) break;
      }
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
