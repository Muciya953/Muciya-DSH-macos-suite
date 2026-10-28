/**
 * Muciya DSH macOS Suite — bundle identity only.
 *
 * The suite used to be one package that carried four panels inside a single browser
 * module. It is now five independently installable plugins under `./packages`, each of
 * which owns its Host half, its browser half, its `cordis.patch.yml` row and its README.
 *
 * Why the split is load-bearing: a DSH client module is one package, so a single bundle
 * meant every profile downloaded and executed every panel's browser half before it
 * could paint, and a panel that refused to mount cost the others their place too. Five
 * packages make each plugin an independent Loader row: install one, get one.
 *
 * This file stays because a bundle needs an importable entry. It declares the identity
 * and mounts nothing — the five `packages/*` rows do the mounting.
 *
 * @module muciya-dsh-plugin-macos-suite
 */

/** This package's manifest name. The browser module identity lives in the five packages. */
export const PACKAGE_NAME = "muciya-dsh-plugin-macos-suite";

/** No services requested: nothing here composes anything. */
export const inject = [];

/** Intentionally empty. A suite that mounted panels would be the old aggregate package again. */
export function apply() {}
