#!/usr/bin/env node

import {resolve} from 'path';
import {fileURLToPath} from 'url';
import {argv, exit} from 'process';
import {readdir, mkdir, copyFile} from 'fs/promises';

if (!argv[2]) {
  console.error('Invalid argument!');
  exit(1);
}

const DEST_PATH = resolve(argv[2]);
const STATIC_PATH = resolve(fileURLToPath(import.meta.url), '../../lib/static');

await mkdir(DEST_PATH, {recursive: true});
for (const file of await readdir(STATIC_PATH))
  await copyFile(resolve(STATIC_PATH, file), resolve(DEST_PATH, file));

console.log(`>> All static files copied to ${DEST_PATH}`);
