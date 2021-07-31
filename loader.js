import { resolve as resolvePath, parse as parsePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { access } from "node:fs/promises";
import { TextDecoder } from "node:util";

import { transform } from "esbuild";

console.log("LOADER");

const extensionsToLookFor = ["ts", "tsx", "jsx"];
const resolvableSpecifiers = [/^file:/, /^\.{1,2}[/\\]/];

export const resolve = async (specifier, context, defaultResolve) => {
  const { parentURL = null } = context;

  if (
    resolvableSpecifiers.some((resolvableSpecifier) =>
      resolvableSpecifier.test(specifier)
    )
  ) {
    const resolvedFilePath =
      parentURL === null
        ? fileURLToPath(specifier)
        : resolvePath(parsePath(fileURLToPath(parentURL)).dir, specifier);
    let fileToTranspile = resolvedFilePath;

    if (parentURL !== null) {
      const fileExt = parsePath(resolvedFilePath).ext;

      if (fileExt === ".js") {
        const fileWithoutExtension = fileToTranspile.replace(/\.js$/, "");
        const sourceFilePath = (
          await Promise.all(
            extensionsToLookFor.map(async (extension) => {
              const fileToLookFor = `${fileWithoutExtension}.${extension}`;
              try {
                await access(fileToLookFor);
                return fileToLookFor;
              } catch {
                return null;
              }
            })
          )
        ).find((fileWithExtension) => fileWithExtension !== null);

        if (sourceFilePath) {
          fileToTranspile = sourceFilePath;
        }
      }
    }

    return {
      url: pathToFileURL(fileToTranspile).toString(),
    };
  }

  return defaultResolve(specifier, context, defaultResolve);
};

export const getFormat = async (url, context, defaultGetFormat) => {
  const recognizedExtension = extensionsToLookFor.find((extension) =>
    url.endsWith(extension)
  );

  if (recognizedExtension) {
    return {
      format: "module",
    };
  }

  return defaultGetFormat(url, context, defaultGetFormat);
};

const textDecoder = new TextDecoder();

export const transformSource = async (
  source,
  context,
  defaultTransformSource
) => {
  const { url } = context;
  const loader = extensionsToLookFor.find(
    (extension) => !url.includes("node_modules") && url.endsWith(extension)
  );

  if (loader) {
    const transformResult = await transform(
      ArrayBuffer.isView(source) || source instanceof SharedArrayBuffer
        ? textDecoder.decode(source)
        : source,
      {
        loader,
        format: "esm",
        sourcemap: "inline",
        target: "es2019",
      }
    );

    return {
      source: transformResult.code,
    };
  }

  return defaultTransformSource(source, context, defaultTransformSource);
};
