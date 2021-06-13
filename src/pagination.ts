import Spotify from './main'

interface PagingObject<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

const LIMIT = 50

export async function autoPaginate<T>(fn: (...args: any) => Promise<{ items: T }>, ...args: any[]): Promise<T[]> {
  // TODO: Pagination
  const firstResult = await apHelper(fn, 0, ...args)
  const promises = Array(Math.ceil((firstResult.total - LIMIT) / LIMIT)).fill(0).map((_, i) => {
    const offset = (i + 1) * LIMIT
    return apHelper(fn, offset, ...args)
  })
  const pages = await Promise.all(promises) as any[]
  return [firstResult, ...pages].flatMap(page => page.items)
}

export async function apHelper<T>(fn: (...args: any) => Promise<{ items: T }>, offset: number, ...args: any[]): Promise<PagingObject<T>> {
  console.log(`CALLING FN WITH ARGS (${JSON.stringify(args.concat({ limit: LIMIT, offset }))})`)
  const results = await fn.bind(Spotify)(...args, { limit: LIMIT, offset })
  return process ? (results as any).body : results
}

export function retryWrapper<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T | undefined> {
  return helper(fn, 3, ...args)
}

async function helper<T>(fn: (...args: any[]) => T, tries, ...args: any[]): Promise<T | undefined> {
  try {
    return await fn(...args)
  } catch(e) {
    await sleep(5)
    return tries ? await helper(fn, tries - 1, ...args) : undefined
  }
}

function sleep(secs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, secs * 1000))
}
