// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as Webpack from 'webpack';
import * as path from 'path';
import * as lodash from 'lodash';
import * as Tapable from 'tapable';

export interface ILocJsonFileData {
  [stringName: string]: string;
}

export interface ILocale {
  [locJsonFilePath: string]: ILocJsonFileData;
}

export interface ILocales {
  [locale: string]: ILocale;
}

export interface IDefaultLocaleOptions {
  locale?: string;
  usePassthroughLocale?: boolean;

  /**
   * If {@see usePassthroughLocale} is set, use this name for the passthrough locale. Defaults to "passthrough"
   */
  passthroughLocaleName?: string;
}

/**
 * The options for localization.
 *
 * @public
 */
export interface ILocalizationPluginOptions {
  localizedStrings: ILocales;
  defaultLocale: IDefaultLocaleOptions;
  serveLocale: IDefaultLocaleOptions;
  filesToIgnore?: string[];
}

/**
 * @internal
 */
export interface IStringPlaceholder {
  value: string;
  suffix: string;
}

const PLUGIN_NAME: string = 'localization';
const LOCALE_FILENAME_PLACEHOLDER: string = '[locale]';
const LOCALE_FILENAME_PLACEHOLDER_REGEX: RegExp = new RegExp(lodash.escapeRegExp(LOCALE_FILENAME_PLACEHOLDER), 'g');
const STRING_PLACEHOLDER_PREFIX: string = '-LOCALIZED-STRING-f12dy0i7-n4bo-dqwj-39gf-sasqehjmihz9';

interface IAsset {
  size(): number;
  source(): string;
}

interface IExtendedMainTemplate {
  hooks: {
    localVars: Tapable.SyncHook<string, Webpack.compilation.Chunk, string>;
  };
}

interface ISingleLocaleConfigOptions {
  localeName: string;
  resolvedStrings: Map<string, Map<string, string>>;
  passthroughLocale: boolean;
}

/**
 * This plugin facilitates localization in webpack.
 *
 * @public
 */
export class LocalizationPlugin implements Webpack.Plugin {
  /**
   * @internal
   */
  public stringKeys: Map<string, IStringPlaceholder>;

  private _options: ILocalizationPluginOptions;
  private _locJsonFiles: Set<string>;
  private _locJsonFilesToIgnore: Set<string>;
  private _stringPlaceholderCounter: number;
  private _stringPlaceholderMap: Map<string, { [locale: string]: string }>;
  private _passthroughStringsMap: Map<string, string>;
  private _locales: Set<string>;
  private _localeNamePlaceholder: IStringPlaceholder;
  private _defaultLocale: string;
  private _serveLocale: string;
  private _usePassthroughForServe: boolean | undefined;
  /**
   * The outermost map's keys are the locale names.
   * The middle map's keys are the resolved, uppercased file names.
   * The innermost map's keys are the string identifiers and its values are the string values.
   */
  private _resolvedLocalizedStrings: Map<string, Map<string, Map<string, string>>>;

  constructor(options: ILocalizationPluginOptions) {
    this._options = options;
  }

  public apply(compiler: Webpack.Compiler): void {
    const isWebpack4: boolean = !!compiler.hooks;

    if (!isWebpack4) {
      throw new Error('The localization plugin requires webpack 4');
    }

    // https://github.com/webpack/webpack-dev-server/pull/1929/files#diff-15fb51940da53816af13330d8ce69b4eR66
    const isWebpackDevServer: boolean = process.env.WEBPACK_DEV_SERVER === 'true';

    const errors: Error[] = this._initializeAndValidateOptions(compiler.options, isWebpackDevServer);

    if (errors.length > 0) {
      compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: Webpack.compilation.Compilation) => {
        compilation.errors.push(...errors);
      });

      this._amendWebpackConfiguration(compiler.options);

      return;
    }

    if (this._locales.size === 1) {
      const singleLocale: string = Array.from(this._locales.keys())[0];
      const resolvedStrings: Map<string, Map<string, string>> = this._resolvedLocalizedStrings.get(singleLocale)!;
      this._amendWebpackConfigurationForSingleLocale(
        compiler.options,
        {
          localeName: singleLocale,
          passthroughLocale: false,
          resolvedStrings
        }
      );
    } else if (isWebpackDevServer) {
      const firstLocaleName: string = Array.from(this._locales.keys())[0];
      const singleLocale: string = this._usePassthroughForServe ? firstLocaleName : this._serveLocale;

      const resolvedStrings: Map<string, Map<string, string>> = this._resolvedLocalizedStrings.get(singleLocale)!;
      this._amendWebpackConfigurationForSingleLocale(
        compiler.options,
        {
          localeName: this._serveLocale || firstLocaleName,
          passthroughLocale: !!this._usePassthroughForServe,
          resolvedStrings
        }
      );
    } else {
      this._amendWebpackConfigurationForMultiLocale(compiler.options);

      if (errors.length === 0) {
        compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: Webpack.compilation.Compilation) => {
          (compilation.mainTemplate as unknown as IExtendedMainTemplate).hooks.localVars.tap(
            PLUGIN_NAME,
            (source: string, chunk: Webpack.compilation.Chunk, hash: string) => {
              return source.replace(LOCALE_FILENAME_PLACEHOLDER_REGEX, this._localeNamePlaceholder.value);
            }
          );
        });

        compiler.hooks.emit.tap(PLUGIN_NAME, (compilation: Webpack.compilation.Compilation) => {
          for (const chunkGroup of compilation.chunkGroups) {
            const children: Webpack.compilation.Chunk[] = chunkGroup.getChildren();
            if (
              (children.length > 0) && // Chunks found
              (
                !compiler.options.output ||
                !compiler.options.output.chunkFilename ||
                compiler.options.output.chunkFilename.indexOf(LOCALE_FILENAME_PLACEHOLDER) === -1
              )
            ) {
              compilation.errors.push(new Error(
                'The configuration.output.chunkFilename property must be provided and must include ' +
                `the ${LOCALE_FILENAME_PLACEHOLDER} placeholder`
              ));

              return;
            }
          }

          for (const assetName in compilation.assets) {
            if (compilation.assets.hasOwnProperty(assetName) && assetName.indexOf(LOCALE_FILENAME_PLACEHOLDER) !== -1) {
              const asset: IAsset = compilation.assets[assetName];
              const resultingAssets: { [assetName: string]: IAsset } = this._processAsset(
                compilation,
                assetName,
                asset
              );

              // Delete the existing asset because it's been renamed
              delete compilation.assets[assetName];

              for (const newAssetName in resultingAssets) {
                if (resultingAssets.hasOwnProperty(newAssetName)) {
                  const newAsset: IAsset = resultingAssets[newAssetName];
                  compilation.assets[newAssetName] = newAsset;
                }
              }
            }
          }
        });
      }
    }
  }

  private _processAsset(
    compilation: Webpack.compilation.Compilation,
    assetName: string,
    asset: IAsset
  ): { [assetName: string]: IAsset } {
    interface IReconstructionElement {
      kind: 'static' | 'localized';
    }

    interface IStaticReconstructionElement extends IReconstructionElement {
      kind: 'static';
      staticString: string;
    }

    interface ILocalizedReconstructionElement extends IReconstructionElement {
      kind: 'localized';
      values: { [locale: string]: string };
      size: number;
    }

    const placeholderRegex: RegExp = new RegExp(`${lodash.escapeRegExp(STRING_PLACEHOLDER_PREFIX)}_(\\d+)`, 'g');
    const result: { [assetName: string]: IAsset } = {};
    const assetSource: string = asset.source();

    const reconstructionSeries: IReconstructionElement[] = [];

    let lastIndex: number = 0;
    let regexResult: RegExpExecArray | null;
    while (regexResult = placeholderRegex.exec(assetSource)) {
      const staticElement: IStaticReconstructionElement = {
        kind: 'static',
        staticString: assetSource.substring(lastIndex, regexResult.index)
      };
      reconstructionSeries.push(staticElement);

      const [placeholder, placeholderSerialNumber] = regexResult;

      const values: { [locale: string]: string } | undefined = this._stringPlaceholderMap.get(placeholderSerialNumber);
      if (!values) {
        compilation.errors.push(new Error(`Missing placeholder ${placeholder}`));
        const brokenLocalizedElement: IStaticReconstructionElement = {
          kind: 'static',
          staticString: placeholder
        };
        reconstructionSeries.push(brokenLocalizedElement);
      } else {
        const localizedElement: ILocalizedReconstructionElement = {
          kind: 'localized',
          values: values,
          size: placeholder.length
        };
        reconstructionSeries.push(localizedElement);
        lastIndex = regexResult.index + placeholder.length;
      }
    }

    const lastElement: IStaticReconstructionElement = {
      kind: 'static',
      staticString: assetSource.substr(lastIndex)
    };
    reconstructionSeries.push(lastElement);

    this._locales.forEach((locale) => {
      const reconstruction: string[] = [];

      let sizeDiff: number = 0;
      for (const element of reconstructionSeries) {
        if (element.kind === 'static') {
          reconstruction.push((element as IStaticReconstructionElement).staticString);
        } else {
          const localizedElement: ILocalizedReconstructionElement = element as ILocalizedReconstructionElement;
          const newValue: string = localizedElement.values[locale];
          reconstruction.push(newValue);
          sizeDiff += (newValue.length - localizedElement.size);
        }
      }

      let newAsset: IAsset;
      if (locale === this._defaultLocale) {
        newAsset = asset;
      } else {
        newAsset = lodash.clone(asset);
      }

      // TODO:
      //  - Ensure stats.json is correct
      //  - Fixup source maps
      const resultFilename: string = assetName.replace(LOCALE_FILENAME_PLACEHOLDER_REGEX, locale);
      const newAssetSource: string = reconstruction.join('');
      const newAssetSize: number = asset.size() + sizeDiff;
      newAsset.source = () => newAssetSource;
      newAsset.size = () => newAssetSize;
      result[resultFilename] = newAsset;
    });

    return result;
  }

  private _amendWebpackConfigurationForMultiLocale(configuration: Webpack.Configuration): void {
    this._amendWebpackConfiguration(
      configuration,
      (rules: Webpack.RuleSetRule[]) => {
        rules.push({
          test: (filePath: string) => this._locJsonFiles.has(filePath.toUpperCase()),
          loader: path.resolve(__dirname, 'loaders', 'LocJsonLoader.js'),
          options: {
            pluginInstance: this
          }
        });
      }
    );
  }

  private _amendWebpackConfigurationForSingleLocale(
    configuration: Webpack.Configuration,
    options: ISingleLocaleConfigOptions
  ): void {
    // We can cheat on the validation a bit here because _initializeAndValidateOptions already validated this
    configuration.output!.filename = (configuration.output!.filename as string).replace(
      LOCALE_FILENAME_PLACEHOLDER_REGEX,
      options.localeName
    );
    if (configuration.output!.chunkFilename) {
      configuration.output!.chunkFilename = (configuration.output!.chunkFilename as string).replace(
        LOCALE_FILENAME_PLACEHOLDER_REGEX,
        options.localeName
      );
    }

    this._amendWebpackConfiguration(
      configuration,
      (rules: Webpack.RuleSetRule[]) => {
        rules.push({
          test: (filePath: string) => this._locJsonFiles.has(filePath.toUpperCase()),
          loader: path.resolve(__dirname, 'loaders', 'SingleLocaleLoader.js'),
          options: {
            resolvedStrings: options.resolvedStrings,
            passthroughLocale: options.passthroughLocale
          }
        });
      }
    );
  }

  private _amendWebpackConfiguration(
    configuration: Webpack.Configuration,
    beforeWarningLoader: (rules: Webpack.RuleSetRule[]) => void = () => { /* no-op */ }
  ): void {
    if (!configuration.module) {
      configuration.module = {
        rules: []
      };
    }

    if (!configuration.module.rules) {
      configuration.module.rules = [];
    }

    beforeWarningLoader(configuration.module.rules);

    configuration.module.rules.push({
      test: {
        and: [
          (filePath: string) => !this._locJsonFiles.has(filePath.toUpperCase()),
          (filePath: string) => !this._locJsonFilesToIgnore.has(filePath.toUpperCase()),
          /\.loc\.json$/i
        ]
      },
      loader: path.resolve(__dirname, 'loaders', 'LocJsonWarningLoader.js')
    });
  }

  private _initializeAndValidateOptions(configuration: Webpack.Configuration, isWebpackDevServer: boolean): Error[] {
    const errors: Error[] = [];

    // START configuration
    {
      if (
        !configuration.output ||
        !configuration.output.filename ||
        (typeof configuration.output.filename !== 'string') ||
        configuration.output.filename.indexOf(LOCALE_FILENAME_PLACEHOLDER) === -1
      ) {
        errors.push(new Error(
          'The configuration.output.filename property must be provided, must be a string, and must include ' +
          `the ${LOCALE_FILENAME_PLACEHOLDER} placeholder`
        ));
      }
    }
    // END configuration

    // START options.filesToIgnore
    {
      this._locJsonFilesToIgnore = new Set<string>();
      for (const locJsonFilePath of this._options.filesToIgnore || []) {
        let normalizedLocJsonFilePath: string = path.isAbsolute(locJsonFilePath)
          ? locJsonFilePath
          : path.resolve(configuration.context!, locJsonFilePath);
        normalizedLocJsonFilePath = normalizedLocJsonFilePath.toUpperCase();
        this._locJsonFilesToIgnore.add(normalizedLocJsonFilePath);
      }
    }
    // END options.filesToIgnore

    // START options.localizedStrings
    {
      const { localizedStrings } = this._options;

      const localeNameRegex: RegExp = /[a-z-]/i;
      const definedStringsInLocJsonFiles: Map<string, Set<string>> = new Map<string, Set<string>>();
      this._locJsonFiles = new Set<string>();
      this.stringKeys = new Map<string, IStringPlaceholder>();
      this._stringPlaceholderMap = new Map<string, { [locale: string]: string }>();
      const normalizedLocales: Set<string> = new Set<string>();
      this._locales = new Set<string>();
      this._passthroughStringsMap = new Map<string, string>();
      this._resolvedLocalizedStrings = new Map<string, Map<string, Map<string, string>>>();

      // Create a special placeholder for the locale's name
      this._localeNamePlaceholder = this._getPlaceholderString();
      const localeNameMap: { [localeName: string]: string } = {};
      this._stringPlaceholderMap.set(this._localeNamePlaceholder.suffix, localeNameMap);

      for (const localeName in localizedStrings) {
        if (localizedStrings.hasOwnProperty(localeName)) {
          const normalizedLocaleName: string = localeName.toUpperCase();
          if (normalizedLocales.has(normalizedLocaleName)) {
            errors.push(Error(
              `The locale "${localeName}" appears multiple times. ` +
              'There may be multiple instances with different casing.'
            ));
            return errors;
          }

          this._locales.add(localeName);
          normalizedLocales.add(normalizedLocaleName);
          localeNameMap[localeName] = localeName;

          const filesMap: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
          this._resolvedLocalizedStrings.set(localeName, filesMap);

          if (!localeName.match(localeNameRegex)) {
            errors.push(new Error(
               `Invalid locale name: ${localeName}. Locale names may only contain letters and hyphens.`
            ));
            return errors;
          }

          const locFilePathsInLocale: Set<string> = new Set<string>();

          const locale: ILocale = localizedStrings[localeName];
          for (const locJsonFilePath in locale) {
            if (locale.hasOwnProperty(locJsonFilePath)) {
              let normalizedLocJsonFilePath: string = path.isAbsolute(locJsonFilePath)
                ? locJsonFilePath
                : path.resolve(configuration.context!, locJsonFilePath);
              normalizedLocJsonFilePath = normalizedLocJsonFilePath.toUpperCase();

              if (this._locJsonFilesToIgnore.has(normalizedLocJsonFilePath)) {
                errors.push(new Error(
                  `The .loc.json file path "${locJsonFilePath}" is listed both in the filesToIgnore object and in ` +
                  'strings data.'
                ));
                return errors;
              }

              if (locFilePathsInLocale.has(normalizedLocJsonFilePath)) {
                errors.push(new Error(
                  `The .loc.json file path "${locJsonFilePath}" appears multiple times in locale ${localeName}. ` +
                  'There may be multiple instances with different casing.'
                ));
                return errors;
              }

              locFilePathsInLocale.add(normalizedLocJsonFilePath);
              this._locJsonFiles.add(normalizedLocJsonFilePath);

              const stringsMap: Map<string, string> = new Map<string, string>();
              filesMap.set(normalizedLocJsonFilePath, stringsMap);

              const locJsonFileData: ILocJsonFileData = locale[locJsonFilePath];

              for (const stringName in locJsonFileData) {
                if (locJsonFileData.hasOwnProperty(stringName)) {
                  const stringKey: string = `${normalizedLocJsonFilePath}?${stringName}`;
                  if (!this.stringKeys.has(stringKey)) {
                    this.stringKeys.set(stringKey, this._getPlaceholderString());
                  }

                  const placeholder: IStringPlaceholder = this.stringKeys.get(stringKey)!;
                  if (!this._stringPlaceholderMap.has(placeholder.suffix)) {
                    this._stringPlaceholderMap.set(placeholder.suffix, {});
                    this._passthroughStringsMap.set(placeholder.suffix, stringName);
                  }

                  const stringValue: string = locJsonFileData[stringName];

                  this._stringPlaceholderMap.get(placeholder.suffix)![localeName] = stringValue;

                  if (!definedStringsInLocJsonFiles.has(stringKey)) {
                    definedStringsInLocJsonFiles.set(stringKey, new Set<string>());
                  }

                  definedStringsInLocJsonFiles.get(stringKey)!.add(normalizedLocaleName);

                  stringsMap.set(stringName, stringValue);
                }
              }
            }
          }
        }
      }

      const issues: string[] = [];
      definedStringsInLocJsonFiles.forEach((localesForString: Set<string>, stringKey: string) => {
        if (localesForString.size !== this._locales.size) {
          const missingLocales: string[] = [];
          this._locales.forEach((locale) => {
            if (!localesForString.has(locale)) {
              missingLocales.push(locale);
            }
          });

          const [locJsonPath, stringName] = stringKey.split('?');
          issues.push(
            `The string "${stringName}" in "${locJsonPath}" is missing in the ` +
            `following locales: ${missingLocales.join(', ')}`
          );
        }
      });

      if (issues.length > 0) {
        errors.push(Error(
          `Issues during localized string validation:\n${issues.map((issue) => `  ${issue}`).join('\n')}`
        ));
      }
    }
    // END options.localizedStrings

    // START options.defaultLocale
    {
      if (
        !this._options.defaultLocale ||
        (!this._options.defaultLocale.locale && !this._options.defaultLocale.usePassthroughLocale)
      ) {
        if (this._locales.size === 1) {
          this._defaultLocale = this._locales.entries[0];
        } else {
          errors.push(new Error(
            'Either options.defaultLocale.locale must be provided or options.defaultLocale.usePassthroughLocale ' +
            'must be set to true if more than one locale\'s data is provided'
          ));
        }
      } else {
        const { locale, usePassthroughLocale, passthroughLocaleName } = this._options.defaultLocale;
        if (locale && usePassthroughLocale) {
          errors.push(new Error(
            'Either options.defaultLocale.locale must be provided or options.defaultLocale.usePassthroughLocale ' +
            'must be set to true, but not both'
          ));
        } else if (usePassthroughLocale) {
          this._defaultLocale = passthroughLocaleName || 'passthrough';
          this._locales.add(this._defaultLocale);
          this._stringPlaceholderMap.get(this._localeNamePlaceholder.suffix)![this._defaultLocale] =
            this._defaultLocale;
          this._passthroughStringsMap.forEach((stringName: string, stringKey: string) => {
            this._stringPlaceholderMap.get(stringKey)![this._defaultLocale] = stringName;
          });
        } else if (locale) {
          this._defaultLocale = locale;
          if (!this._locales.has(locale)) {
            errors.push(new Error(`The specified default locale "${locale}" was not provided in the localized data`));
          }
        } else {
          errors.push(new Error('Unknown error occurred processing default locale.'));
        }
      }
    }
    // END options.defaultLocale

    // START options.serveLocale
    if (isWebpackDevServer) {
      if (
        !this._options.serveLocale ||
        (!this._options.serveLocale.locale && !this._options.serveLocale.usePassthroughLocale)
      ) {
        if (this._locales.size === 1) {
          this._serveLocale = this._locales.entries[0];
        } else {
          errors.push(new Error(
            'Either options.serveLocale.locale must be provided or options.serveLocale.usePassthroughLocale ' +
            'must be set to true if more than one locale\'s data is provided. An arbitrary locale will be used.'
          ));
        }
      } else {
        const { locale, usePassthroughLocale, passthroughLocaleName } = this._options.serveLocale;
        if (locale && usePassthroughLocale) {
          errors.push(new Error(
            'Either options.serveLocale.locale must be provided or options.serveLocale.usePassthroughLocale ' +
            'must be set to true, but not both. An arbitrary locale will be used.'
          ));
        } else if (usePassthroughLocale) {
          this._serveLocale = passthroughLocaleName || 'passthrough';
          this._usePassthroughForServe = true;
        } else if (locale) {
          this._serveLocale = locale;
          if (!this._locales.has(locale)) {
            errors.push(new Error(`The specified serve locale "${locale}" was not provided in the localized data`));
          }
        } else {
          errors.push(new Error('Unknown error occurred processing serve locale.'));
        }
      }
    }
    // END options.serveLocale

    return errors;
  }

  private _getPlaceholderString(): IStringPlaceholder {
    if (this._stringPlaceholderCounter === undefined) {
      this._stringPlaceholderCounter = 0;
    }

    const suffix: string = (this._stringPlaceholderCounter++).toString();
    return {
      value: `${STRING_PLACEHOLDER_PREFIX}_${suffix}`,
      suffix: suffix
    };
  }
}
