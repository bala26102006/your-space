import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks';

export function useLiveQuery(querier, deps = [], defaultResult = undefined) {
  return useDexieLiveQuery(querier, deps, defaultResult);
}
