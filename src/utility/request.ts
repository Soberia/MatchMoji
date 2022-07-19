interface ResponseType {
  arrayBuffer: ArrayBuffer;
  text: string;
  json: {[key: string]: any[]};
}

/** Custom error class for storing HTTP error during Fetch API call. */
class HttpError extends Error {
  /**
   * @param code - HTTP error code
   * @param fatal - Request failed due to timeout, no internet connection or server downtime.
   */
  constructor(public code?: number, public fatal?: boolean) {
    super();
  }
}

/**
 * Sends fetch requests while handling errors.
 * @param timeout - In milliseconds
 */
async function safeFetch<T extends keyof ResponseType>(
  url: URL | string,
  type: T,
  timeout: number = 1e4,
  params?: RequestInit
): Promise<ResponseType[T]> {
  let errorCode: number | undefined;
  const controller = new AbortController();
  const timerId =
    timeout !== Infinity
      ? window.setTimeout(() => controller.abort(), timeout)
      : undefined;
  if (typeof url !== 'string') {
    url = url.toString();
  }

  try {
    const response = await window.fetch(url, {
      signal: controller.signal,
      ...params
    });
    window.clearTimeout(timerId);
    if (response.status === 200) {
      return await response[type]();
    }
    errorCode = response.status;
  } catch {}

  throw new HttpError(errorCode, errorCode ? false : true);
}

/**
 * Gets static files from web server.
 * @param timeout - In milliseconds
 * @param cache - Whether to cache the response.
 */
export async function fetchFile<T extends keyof ResponseType>(
  url: URL | string,
  type: T,
  timeout?: number,
  cache = false
) {
  return await safeFetch(url, type, timeout, {
    cache: cache ? 'default' : 'no-store'
  });
}
