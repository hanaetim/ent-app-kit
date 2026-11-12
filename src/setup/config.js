import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import YAML from "yaml";
import { SetupError } from "./process.js";

const SCHEMAS = {
  manifest: {
    documentPath: "manifest.yaml",
    schemaPath: "schemas/manifest-v1.json",
  },
  repos: {
    documentPath: "payload/repos.yaml",
    schemaPath: "schemas/repos-v1.json",
  },
};

export function readManifest(kitRoot) {
  return readValidatedConfig(kitRoot, "manifest");
}

export function readReposConfig(kitRoot) {
  return readValidatedConfig(kitRoot, "repos");
}

export function validatePackageSchemas(kitRoot) {
  readManifest(kitRoot);
  readReposConfig(kitRoot);
}

export function readYamlFile(filePath, label = filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new SetupError(`ERROR: failed to read ${label}: ${error.message}`);
  }

  const document = YAML.parseDocument(text, { prettyErrors: false });

  if (document.errors.length > 0) {
    const message = document.errors.map((error) => error.message).join("; ");
    throw new SetupError(`ERROR: failed to parse ${label}: ${message}`);
  }

  return document.toJS({ maxAliasCount: 100 });
}

export function writeYamlFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf8");
}

export function readJsonFile(filePath, label = filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new SetupError(`ERROR: failed to read ${label}: ${error.message}`);
  }
}

export function validateDocument(document, schema, label) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new SetupError(`ERROR: ${label}: root document must be a mapping`);
  }
  if (document.schema !== schema.$id) {
    throw new SetupError(`ERROR: ${label}: schema id ${JSON.stringify(document.schema)} does not match ${JSON.stringify(schema.$id)}`);
  }

  const ajv = new /** @type {any} */ (Ajv2020)({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(document)) {
    const details = validate.errors.map((error) => `  - ${formatAjvError(error)}`).join("\n");
    throw new SetupError(`ERROR: ${label} failed schema validation:\n${details}`);
  }
}

function readValidatedConfig(kitRoot, kind) {
  const config = SCHEMAS[kind];
  if (!config) throw new SetupError(`ERROR: unknown config kind: ${kind}`);

  const documentFile = path.join(kitRoot, config.documentPath);
  const schemaFile = path.join(kitRoot, config.schemaPath);
  const document = readYamlFile(documentFile, config.documentPath);
  const schema = readJsonFile(schemaFile, config.schemaPath);
  validateDocument(document, schema, config.documentPath);
  return document;
}

function formatAjvError(error) {
  const location = error.instancePath || "$";
  if (error.keyword === "additionalProperties") {
    return `${location}: unexpected key ${JSON.stringify(error.params.additionalProperty)}`;
  }
  if (error.keyword === "required") {
    return `${location}: missing required key ${JSON.stringify(error.params.missingProperty)}`;
  }
  if (error.keyword === "enum") {
    return `${location}: expected one of [${error.params.allowedValues.map((value) => JSON.stringify(value)).join(", ")}]`;
  }
  if (error.keyword === "const") {
    return `${location}: expected ${JSON.stringify(error.params.allowedValue)}`;
  }
  return `${location}: ${error.message}`;
}
