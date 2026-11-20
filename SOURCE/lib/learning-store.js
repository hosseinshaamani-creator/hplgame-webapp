export function createLearningStore({client, userId, onStatus = () => {}}) {
  const versions = new Map(), pending = new Map();
  let chain = Promise.resolve(), stopped = false, inFlight = false;
  function status(kind, text) { if (!stopped) onStatus({kind, text}); }
  async function load() {
    const {data, error} = await client.from('learning_projects').select('*').eq('user_id', userId).order('updated_at', {ascending:false});
    if (error) throw error;
    if (stopped) return [];
    versions.clear();
    return data.map(row => {
      versions.set(row.id, row.version);
      return {id:row.id, idea:row.idea, step:row.step, won:row.won, messages:row.messages};
    });
  }
  function enqueue(game) {
    if (stopped || !game) return;
    pending.set(game.id, JSON.parse(JSON.stringify(game)));
    status('pending', 'تغییرات در انتظار ذخیره در حساب…');
  }
  function flush() {
    chain = chain.catch(() => false).then(async () => {
      if (stopped) return false;
      try {
        while (pending.size && !stopped) {
          const [id, snapshot] = pending.entries().next().value;
          inFlight = true;
          status('saving', 'در حال ذخیره در حساب…');
          const {data, error} = await client.rpc('save_learning_project', {
            p_id:id, p_idea:snapshot.idea, p_step:snapshot.step, p_won:snapshot.won,
            p_messages:snapshot.messages, p_version:versions.get(id) || 0
          });
          inFlight = false;
          if (error) { if (!pending.has(id)) pending.set(id, snapshot); throw error; }
          if (!stopped) versions.set(id, data.version);
          if (pending.get(id) === snapshot) pending.delete(id);
        }
        if (stopped) return false;
        status('saved', 'در حساب ذخیره شد ✓');
        return true;
      } catch (error) {
        inFlight = false;
        const conflict = /version_conflict/.test(error.message || '');
        status('error', conflict ? 'این پروژه در پنجرهٔ دیگری تغییر کرده؛ ابتدا نسخهٔ این پنجره را دانلود کن و حساب را دوباره بارگذاری کن.' : /project_limit/.test(error.message || '') ? 'سهمیهٔ بازی رایگان حساب پر شده است؛ پروژهٔ قبلی را ادامه بده.' : 'ذخیره انجام نشد؛ اتصال را بررسی و «ذخیره دوباره» را بزن.');
        return false;
      }
    });
    return chain;
  }
  return {load, enqueue, flush, hasPending:() => pending.size > 0 || inFlight, stop(){stopped = true; pending.clear();}};
}
