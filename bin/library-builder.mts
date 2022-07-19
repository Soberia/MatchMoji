import glob from 'glob';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import {readdir, mkdir, copyFile, readFile, writeFile} from 'fs/promises';

import expand from 'dotenv-expand';
import {config} from 'dotenv';

const ROOT_PATH = resolve(fileURLToPath(import.meta.url), '../../');
const PUBLIC_PATH = resolve(ROOT_PATH, 'public');
const SRC_PATH = resolve(ROOT_PATH, 'src');
const BUILD_PATH = resolve(ROOT_PATH, 'build');
const LIB_PATH = resolve(ROOT_PATH, 'lib');
const STATIC_PATH = resolve(LIB_PATH, 'static');
const env = expand(config()).parsed!;

/**
 * Resolves custom environment variables with
 * corresponding values for given module code.
 */
function envResolver(code: string) {
  for (const [key, value] of Object.entries(env))
    if (key.startsWith('REACT_APP'))
      // @ts-ignore
      code = code.replaceAll(`process.env.${key}`, `'${value}'`);

  return code;
}

// Copying required asset files
for (const file of glob.sync(`${SRC_PATH}/**/*.*`) as string[])
  if (!file.match(/\.tsx?|wav$/)) {
    const destPath = file.replace(SRC_PATH, LIB_PATH);
    await mkdir(dirname(destPath), {recursive: true});
    await copyFile(file, destPath);
  }

// Copying required static files
await mkdir(STATIC_PATH);
for (const file of await readdir(PUBLIC_PATH))
  if (file.match(/\.webmanifest|json|svg|webp$/))
    await copyFile(resolve(PUBLIC_PATH, file), resolve(STATIC_PATH, file));

// Copying minified service worker in static files directory
for (const suffix of ['', '.map']) {
  const name = `service-worker.js${suffix}`;
  const destination = resolve(STATIC_PATH, name);
  await copyFile(resolve(BUILD_PATH, name), destination);

  // Removing hashes from JavaScript and CSS file names.
  // End users need to justify the names for their use case.
  if (!suffix)
    await writeFile(
      destination,
      (
        await readFile(destination, 'utf8')
      )
        .replace(/(css\/main).*?(.css)/, '$1$2')
        .replace(/(js\/main).*?(.js)/, '$1$2')
        .replace(/{'revision':'(?!.*html).*?.svg'},/g, '') // Removing SVG URLs
    );
}

// Resolving custom environment variables
for (const file of glob.sync(`${LIB_PATH}/**/*.*`) as string[])
  if (file.endsWith('.js'))
    await writeFile(file, envResolver(await readFile(file, 'utf8')));
