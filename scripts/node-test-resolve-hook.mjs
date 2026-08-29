import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveWithExt(absoluteNoExt) {
  for (const ext of [".ts", ".tsx", ".js", ".mjs", ".json"]) {
    const candidate = absoluteNoExt + ext;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  if (existsSync(absoluteNoExt)) return pathToFileURL(absoluteNoExt).href;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = resolveWithExt(join(root, "src", specifier.slice(2)));
    if (url) return { shortCircuit: true, url };
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !extname(specifier) &&
    context.parentURL?.startsWith("file:")
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const url = resolveWithExt(join(parentDir, specifier));
    if (url) return { shortCircuit: true, url };
  }

  return nextResolve(specifier, context);
}
