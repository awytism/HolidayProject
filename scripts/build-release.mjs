import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = join(root, "release");
export const RELEASE_DIRECTORIES = Object.freeze(["deploy", "docs", "public", "scripts", "src"]);
export const RELEASE_FILES = Object.freeze([
  ".env.example", "CONTEXT.md", "package-lock.json", "package.json", "start.bat", "start.sh", "STARTING.md",
]);

export async function buildRelease(options = {}) {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const name = options.name ?? `gramado-tripboard-${packageJson.version}`;
  const outputRoot = resolve(options.outputRoot ?? releaseRoot);
  const staging = join(outputRoot, name);
  const archive = join(outputRoot, `${name}.tar.gz`);

  await mkdir(outputRoot, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await rm(archive, { force: true });
  await mkdir(staging, { recursive: true });
  await copyReleaseFiles(staging);
  await writeReleaseMetadata(staging, packageJson.version);
  await writeManifest(staging);
  createArchive(outputRoot, name, archive);
  return { staging, archive };
}

async function copyReleaseFiles(staging) {
  for (const directory of RELEASE_DIRECTORIES) {
    await cp(join(root, directory), join(staging, directory), { recursive: true });
  }
  for (const file of RELEASE_FILES) await cp(join(root, file), join(staging, file));
}

async function writeReleaseMetadata(staging, version) {
  const metadata = {
    version,
    createdAt: new Date().toISOString(),
    persistentPathsExcluded: ["data/", ".env", "node_modules/", "release/"],
  };
  await writeFile(join(staging, "RELEASE.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function writeManifest(staging) {
  const files = await walk(staging);
  const lines = [];
  for (const file of files) {
    const digest = createHash("sha256").update(await readFile(file)).digest("hex");
    lines.push(`${digest}  ${relative(staging, file).replaceAll("\\", "/")}`);
  }
  await writeFile(join(staging, "RELEASE-MANIFEST.sha256"), `${lines.join("\n")}\n`, "utf8");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ((await stat(path)).isFile()) files.push(path);
  }
  return files.sort();
}

function createArchive(outputRoot, name, archive) {
  const result = spawnSync("tar", ["-czf", archive, "-C", outputRoot, name], { stdio: "inherit" });
  if (result.error) throw new Error(`Unable to create release archive: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Unable to create release archive: tar exited ${result.status}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildRelease();
  console.log(`Release archive: ${result.archive}`);
}
