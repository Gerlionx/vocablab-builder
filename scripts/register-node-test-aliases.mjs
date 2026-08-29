import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./node-test-resolve-hook.mjs", import.meta.url);
