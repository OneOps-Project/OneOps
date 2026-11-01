import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import {
  dependencySpecifier,
  literalSpecifier,
} from "./source-dependencies.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = JSON.parse(
  await fs.readFile(path.join(root, "modules.json"), "utf8"),
);
const structure = JSON.parse(
  await fs.readFile(path.join(root, "feature-structure.json"), "utf8"),
);
const leaves = Object.entries(structure).flatMap(([main, groups]) =>
  Object.entries(groups).flatMap(([group, names]) =>
    names.length
      ? names.map((name) => `${main}/${group}/${name}`)
      : [`${main}/${group}`],
  ),
);
const owners = [
  ...new Set([...leaves, ...modules.map((module) => module.feature)]),
].sort((a, b) => b.length - a.length);
const failures = [];
async function exists(relative) {
  try {
    await fs.access(path.join(root, relative));
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return false;
  }
}
async function walk(folder) {
  return (
    await Promise.all(
      (await fs.readdir(folder, { withFileTypes: true }))
        .filter(
          (entry) =>
            !["node_modules", "generated", "dist", ".next"].includes(
              entry.name,
            ),
        )
        .map((entry) =>
          entry.isDirectory()
            ? walk(path.join(folder, entry.name))
            : [path.join(folder, entry.name)],
        ),
    )
  ).flat();
}
function ownerOf(file) {
  const relative = file.match(/^apps\/(web|api)\/src\/features\/(.*)/)?.[2];
  return relative
    ? owners.find(
        (owner) => relative === owner || relative.startsWith(owner + "/"),
      )
    : undefined;
}
function publicEntry(target, owner) {
  return ["", "/index", "/index.ts", "/index.tsx", "/index.js"].includes(
    target.slice(target.indexOf("/features/") + 10 + owner.length),
  );
}
function normalize(file, spec) {
  if (spec.startsWith("."))
    return path.posix.normalize(
      path.posix.join(path.posix.dirname(file), spec),
    );
  if (spec.startsWith("@/"))
    return path.posix.normalize("apps/web/src/" + spec.slice(2));
  return spec;
}
const viewIntegrations = new Set([
  "work-management/work/tasks->work-management/work/kanban",
  "work-management/work/tasks->work-management/work/task-comments",
]);
for (const base of ["apps/web/src", "apps/api/src", "packages/database"]) {
  for (const absolute of await walk(path.join(root, base))) {
    if (!/\.(tsx?|mjs)$/.test(absolute)) continue;
    const file = path.relative(root, absolute).replaceAll("\\", "/"),
      text = await fs.readFile(absolute, "utf8");
    const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
      ),
      owner = ownerOf(file);
    function check(node) {
      const expression = dependencySpecifier(node),
        spec = literalSpecifier(expression);
      if (expression && spec === undefined)
        failures.push(`${file}: computed dependency cannot be checked`);
      if (spec !== undefined) {
        const target = normalize(file, spec),
          targetOwner = ownerOf(target);
        if (
          /@oneops\/contracts|\/src\/(modules|application|platform|tooling)\//.test(
            target,
          )
        )
          failures.push(`${file}: obsolete source path ${spec}`);
        if (
          file.startsWith("apps/web/") &&
          (/@nestjs|@prisma|@oneops\/database/.test(spec) ||
            target.startsWith("apps/api/") ||
            target.startsWith("packages/database/"))
        )
          failures.push(`${file}: frontend imports backend/database ${spec}`);
        if (
          owner &&
          file.startsWith("apps/web/src/features/") &&
          target.startsWith("apps/web/src/") &&
          targetOwner !== owner
        ) {
          const allowed =
            targetOwner &&
            viewIntegrations.has(owner + "->" + targetOwner) &&
            publicEntry(target, targetOwner);
          if (!allowed)
            failures.push(
              `${file}: frontend dependency is outside its feature ${spec}`,
            );
        }
        if (
          owner &&
          file.startsWith("apps/api/src/features/") &&
          targetOwner &&
          targetOwner !== owner
        )
          failures.push(
            `${file}: backend feature imports another feature ${spec}`,
          );
        if (targetOwner && targetOwner !== owner) {
          const main = file.match(
            /^apps\/api\/src\/features\/([^/]+)\/[^/]+\.ts$/,
          )?.[1];
          const composition =
            file.startsWith("apps/web/src/core/") ||
            file.startsWith("apps/web/src/app/") ||
            (main && targetOwner.startsWith(main + "/")) ||
            (owner && viewIntegrations.has(owner + "->" + targetOwner));
          if (!composition || !publicEntry(target, targetOwner))
            failures.push(
              `${file}: integration must use an approved public feature index ${spec}`,
            );
        }
        if (file.startsWith("apps/api/src/core/") && targetOwner)
          failures.push(
            `${file}: core infrastructure imports business feature ${spec}`,
          );
        if (
          file.includes("/core/ui/design-system/") &&
          target.startsWith("apps/web/src/") &&
          !target.startsWith("apps/web/src/core/ui/design-system/")
        )
          failures.push(
            `${file}: design-system depends on an upper layer ${spec}`,
          );
        if (
          file.startsWith("apps/api/src/features/") &&
          /@oneops\/database|generated\//.test(spec) &&
          !file.endsWith(".repository.ts")
        )
          failures.push(
            `${file}: Prisma is restricted to owned repositories ${spec}`,
          );
        if (
          owner &&
          !file.endsWith(".repository.ts") &&
          ts.isImportDeclaration(node) &&
          node.importClause?.namedBindings &&
          ts.isNamedImports(node.importClause.namedBindings)
        ) {
          if (
            node.importClause.namedBindings.elements.some(
              (item) =>
                (item.propertyName || item.name).text === "Database" &&
                !node.importClause.isTypeOnly &&
                !item.isTypeOnly,
            )
          )
            failures.push(`${file}: Database value import outside repository`);
        }
      }
      ts.forEachChild(node, check);
    }
    check(source);
  }
}
for (const main of Object.keys(structure))
  for (const layer of ["api", "web"]) {
    const base = `apps/${layer}/src/features/${main}`;
    if (!(await exists(base))) failures.push(`Missing main group ${base}`);
    if (layer === "api" && !(await exists(`${base}/${main}.module.ts`)))
      failures.push(`Missing main Nest module ${main}`);
  }
for (const feature of leaves) {
  for (const sub of [
    "prisma",
    "dto",
    "entities",
    "guards",
    "middlewares",
    "listeners",
  ])
    if (!(await exists(`apps/api/src/features/${feature}/${sub}`)))
      failures.push(`Missing backend folder ${feature}/${sub}`);
  for (const sub of ["components", "hooks", "api", "actions"])
    if (!(await exists(`apps/web/src/features/${feature}/${sub}`)))
      failures.push(`Missing frontend folder ${feature}/${sub}`);
}
const namespaces = new Set(),
  routes = new Set(),
  models = new Set();
for (const module of modules) {
  for (const [set, value, label] of [
    [namespaces, module.databaseSchema, "namespace"],
    [routes, module.route, "API route"],
  ]) {
    if (value === null || value === undefined) continue;
    if (set.has(value)) failures.push(`Duplicate ${label}: ${value}`);
    set.add(value);
  }
  const ownedModels = module.models || [module.model];
  for (const model of ownedModels) {
    if (models.has(model)) failures.push(`Duplicate model: ${model}`);
    models.add(model);
  }
  const backend = `apps/api/src/features/${module.feature}`,
    frontend = `apps/web/src/features/${module.feature}`;
  for (const file of [
    ...(module.kind === "service"
      ? []
      : [`${backend}/${module.name}.controller.ts`]),
    `${backend}/${module.name}.service.ts`,
    `${backend}/${module.name}.repository.ts`,
    `${backend}/${module.name}.module.ts`,
    `${backend}/dto/${module.name}.dto.ts`,
    module.schema,
    ...(module.kind === "service"
      ? []
      : [
          `${frontend}/components/page.tsx`,
          `${frontend}/constants.ts`,
          `${frontend}/types.ts`,
          `${frontend}/api/client.ts`,
        ]),
  ])
    if (!(await exists(file))) failures.push(`Missing owned artifact: ${file}`);
  const schema = await fs.readFile(path.join(root, module.schema), "utf8");
  if (!schema.includes(`@@schema("${module.databaseSchema}")`))
    failures.push(`${module.name}: namespace mismatch`);
  for (const model of ownedModels)
    if (!new RegExp(`\\bmodel\\s+${model}\\s*\\{`).test(schema))
      failures.push(`${module.name}: missing owned model ${model}`);
  const repo = await fs.readFile(
    path.join(root, backend, `${module.name}.repository.ts`),
    "utf8",
  );
  for (const [, delegate] of repo.matchAll(/\b(?:tx|this\.db)\.(\w+)/g))
    if (
      !ownedModels.some(
        (model) => delegate === model[0].toLowerCase() + model.slice(1),
      )
    )
      failures.push(`${module.name}: foreign delegate ${delegate}`);
}
const base = await fs.readFile(
    path.join(root, "packages/database/prisma/schema/base.prisma"),
    "utf8",
  ),
  list = base.match(/schemas\s*=\s*(\[[\s\S]*?\])/);
if (
  !list ||
  JSON.stringify(JSON.parse(list[1]).sort()) !==
    JSON.stringify([...namespaces].sort())
)
  failures.push("Prisma namespaces do not match owned models");
if (/\bmodel\s+/.test(base))
  failures.push("Database base.prisma must not duplicate feature models");
const link = await fs.realpath(
  path.join(root, "packages/database/prisma/schema/features"),
);
if (link !== path.join(root, "apps/api/src/features"))
  failures.push("Schema source link must point to canonical backend features");
for (const old of [
  "apps/web/src/app/(admin)",
  "apps/api/src/modules",
  "apps/web/src/modules",
  "apps/web/src/application",
  "apps/web/src/tooling",
  "apps/api/src/platform",
  "apps/api/prisma",
  "packages/contracts",
])
  if (await exists(old)) failures.push(`Remove old structure ${old}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Boundaries valid: 4 main groups, ${leaves.length} symmetric feature folders, ${modules.length} existing data implementations. Unimplemented sections remain empty.`,
  );
