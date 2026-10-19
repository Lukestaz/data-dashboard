// Read-only report loading. The request function is injected; this module never submits votes.
export function decodeCommunityVoteHash(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.hasOwn(payload, 'error')) {
    throw new Error('Invalid community report response');
  }
  const values = payload.result;
  if (!Array.isArray(values) || values.length % 2 !== 0) throw new Error('Invalid community report pairs');
  const votes = Object.create(null), seen = new Set();
  for (let index = 0; index < values.length; index += 2) {
    const field = values[index], raw = values[index + 1];
    if (typeof field !== 'string' || seen.has(field)) throw new Error('Invalid community report field');
    const separator = field.lastIndexOf(':');
    const key = field.slice(0, separator), type = field.slice(separator + 1);
    if (separator < 1 || !['up', 'down'].includes(type)) throw new Error('Invalid community report field');
    if (typeof raw !== 'number' && !(typeof raw === 'string' && /^[0-9]+$/.test(raw))) {
      throw new Error('Invalid community report count');
    }
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid community report count');
    seen.add(field);
    votes[key] ??= {up:0, down:0};
    votes[key][type] = count;
  }
  for (const value of Object.values(votes)) Object.freeze(value);
  return Object.freeze(votes);
}

export function createCommunityVoteReader({request, onChange = () => {}}) {
  if (typeof request !== 'function' || typeof onChange !== 'function') throw new TypeError('Expected report callbacks');
  let snapshot = Object.freeze({status:'loading', votes:Object.freeze(Object.create(null))});
  let inFlight = null;
  function publish(status, votes) {
    snapshot = Object.freeze({status, votes});
    try {onChange(snapshot);} catch {}
    return snapshot;
  }
  function load() {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve().then(request).then(decodeCommunityVoteHash).then(
      votes => publish('ready', votes),
      () => publish('unavailable', snapshot.votes),
    ).finally(() => {inFlight = null;});
    publish('loading', snapshot.votes);
    return inFlight;
  }
  return Object.freeze({getSnapshot:() => snapshot, load});
}
