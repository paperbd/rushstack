// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { IYamlTocFile } from '../yaml/IYamlTocFile';

/**
 * Typescript interface describing the config schema for toc.yml file format.
 */
export interface IConfigTableOfContents {
  /**
   * Represents the tree structure describing the toc.file format.
   * Nodes that have an empty `items` array property or their name will be included in the
   * {@link IConfigTableOfContents.nonEmptyCategoryNodeNames} will be filled with API items
   * that are matched with the filters provided. Everything else will be placed under
   * {@link IConfigTableOfContents.catchAllCategory} if provided, which is highly recommended.
   */
  tocConfig: IYamlTocFile;

  /**
   * Optional category name that is recommended to be included along with
   * one of the configs: {@link IConfigTableOfContents.categorizeByName} or
   * {@link IConfigTableOfContents.categoryInlineTag}.
   * Any items that are not matched according to the mentioned configuration options will be placed under this
   * catchAll category. If none provided the items will not be included in the final toc.yml file.
   */
  catchAllCategory?: string;

  /**
   * Toggle either categorization of the API items should be made based on category name presence
   * in the API item's name. Useful when there are API items without an inline tag to categorize them,
   * but still need to place the items under categories. Note: this type of categorization might place some items
   * under wrong categories if the names are similar but belong to different categories.
   * In case that {@link IConfigTableOfContents.categoryInlineTag} is provided it will try categorize by
   * using it and only if it didn't, it will attempt to categorize by name.
   */
  categorizeByName?: boolean;

  /**
   * Inline tag that will be used to categorize the API items. Will take precedence over the
   * {@link IConfigTableOfContents.categorizeByName} flag in trying to place the API item according to the
   * custom inline tag present in documentation of the source code.
   */
  categoryInlineTag?: string;

  /**
   * Array of node names that might have already items injected at the time of creating the
   * {@link IConfigTableOfContents.tocConfig} tree structure but are still needed to be included as category
   * nodes where API items will be pushed during the categorization algorithm.
   */
  nonEmptyCategoryNodeNames?: string[];
}

/**
 * Describes plugin packages to be loaded, and which features to enable.
 */
export interface IConfigPlugin {
  /**
   * Specifies the name of an API Documenter plugin package to be loaded.  By convention, the NPM package name
   * should have the prefix `doc-plugin-`.  Its main entry point should export an object named
   * `apiDocumenterPluginManifest` which implements the {@link IApiDocumenterPluginManifest} interface.
   */
  packageName: string;

  /**
   * A list of features to be enabled.  The features are defined in {@link IApiDocumenterPluginManifest.features}.
   * The `enabledFeatureNames` strings are matched with {@link IFeatureDefinition.featureName}.
   */
  enabledFeatureNames: string[];
}

/**
 * This interface represents the api-documenter.json file format.
 */
export interface IConfigFile {
  /**
   * Specifies the output target.
   */
  outputTarget: 'docfx' | 'markdown';

  /**
   * Specifies what type of newlines API Documenter should use when writing output files.
   *
   * @remarks
   * By default, the output files will be written with Windows-style newlines.
   * To use POSIX-style newlines, specify "lf" instead.
   * To use the OS's default newline kind, specify "os".
   */
  newlineKind?: 'crlf' | 'lf' | 'os';

  /** {@inheritDoc IConfigPlugin} */
  plugins?: IConfigPlugin[];

  /** {@inheritDoc IConfigTableOfContents} */
  tableOfContents?: IConfigTableOfContents;
}
