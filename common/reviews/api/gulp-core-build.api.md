## API Report File for "@microsoft/gulp-core-build"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import gulp = require('gulp');
import * as gulp_2 from 'gulp';
import { JsonObject } from '@microsoft/node-core-library';
import Orchestrator = require('orchestrator');

// @public
export function addSuppression(suppression: string | RegExp): void;

// @public (undocumented)
export const clean: IExecutable;

// @public (undocumented)
export const cleanFlag: IExecutable;

// @public
export class CleanFlagTask extends CleanTask {
    constructor();
    // (undocumented)
    executeTask(gulp: typeof gulp_2, completeCallback: (error?: string | Error) => void): void;
    // (undocumented)
    isEnabled(buildConfig: IBuildConfig): boolean;
}

// @public
export class CleanTask extends GulpTask<void> {
    constructor();
    executeTask(gulp: typeof gulp_2, completeCallback: (error?: string | Error) => void): void;
}

// @public (undocumented)
export const copyStaticAssets: CopyStaticAssetsTask;

// @public
export class CopyStaticAssetsTask extends GulpTask<ICopyStaticAssetsTaskConfig> {
    constructor();
    // (undocumented)
    executeTask(gulp: typeof gulp_2, completeCallback: (error?: string) => void): NodeJS.ReadWriteStream;
    // (undocumented)
    loadSchema(): JsonObject;
}

// @public
export class CopyTask extends GulpTask<ICopyConfig> {
    constructor();
    executeTask(gulp: typeof gulp_2, completeCallback: (error?: string | Error) => void): Promise<any> | NodeJS.ReadWriteStream | void;
    loadSchema(): JsonObject;
}

// @public
export function coverageData(coverage: number, threshold: number, filePath: string): void;

// @public
export function error(...args: string[]): void;

// @public
export function fileError(taskName: string, filePath: string, line: number, column: number, errorCode: string, message: string): void;

// @public
export function fileLog(write: (text: string) => void, taskName: string, filePath: string, line: number, column: number, errorCode: string, message: string): void;

// @public
export function fileWarning(taskName: string, filePath: string, line: number, column: number, errorCode: string, message: string): void;

// @public
export function functionalTestRun(name: string, result: TestResultState, duration: number): void;

// @public
export class GenerateShrinkwrapTask extends GulpTask<void> {
    constructor();
    executeTask(gulp: gulp.Gulp, completeCallback: (error?: string | Error) => void): NodeJS.ReadWriteStream | void;
}

// @public
export function getConfig(): IBuildConfig;

// @public
export function getErrors(): string[];

// @public
export function getWarnings(): string[];

// @public
export abstract class GulpTask<TTaskConfig> implements IExecutable {
    constructor(name: string, initialTaskConfig?: Partial<TTaskConfig>);
    buildConfig: IBuildConfig;
    cleanMatch: string[];
    copyFile(localSourcePath: string, localDestPath?: string): void;
    enabled: boolean;
    execute(config: IBuildConfig): Promise<void>;
    // Warning: (ae-forgotten-export) The symbol "GulpProxy" needs to be exported by the entry point index.d.ts
    abstract executeTask(gulp: gulp.Gulp | GulpProxy, completeCallback?: (error?: string | Error) => void): Promise<any | void> | NodeJS.ReadWriteStream | void;
    fileError(filePath: string, line: number, column: number, errorCode: string, message: string): void;
    fileExists(localPath: string): boolean;
    fileWarning(filePath: string, line: number, column: number, warningCode: string, message: string): void;
    getCleanMatch(buildConfig: IBuildConfig, taskConfig?: TTaskConfig): string[];
    protected _getConfigFilePath(): string;
    isEnabled(buildConfig: IBuildConfig): boolean;
    protected loadSchema(): JsonObject | undefined;
    log(message: string): void;
    logError(message: string): void;
    logVerbose(message: string): void;
    logWarning(message: string): void;
    mergeConfig(taskConfig: Partial<TTaskConfig>): void;
    name: string;
    onRegister(): void;
    readJSONSync(localPath: string): JsonObject | undefined;
    replaceConfig(taskConfig: TTaskConfig): void;
    resolvePath(localPath: string): string;
    readonly schema: JsonObject | undefined;
    setConfig(taskConfig: Partial<TTaskConfig>): void;
    taskConfig: TTaskConfig;
}

// @public (undocumented)
export interface IBuildConfig {
    args: {
        [name: string]: string | boolean;
    };
    buildErrorIconPath?: string;
    buildSuccessIconPath?: string;
    distFolder: string;
    gulp: GulpProxy | gulp_2.Gulp;
    isRedundantBuild?: boolean;
    jestEnabled?: boolean;
    libAMDFolder?: string;
    libES6Folder?: string;
    libESNextFolder?: string;
    libFolder: string;
    maxBuildTimeMs: number;
    onTaskEnd?: (taskName: string, duration: number[], error?: any) => void;
    onTaskStart?: (taskName: string) => void;
    packageFolder: string;
    production: boolean;
    properties?: {
        [key: string]: any;
    };
    relogIssues?: boolean;
    rootPath: string;
    shouldWarningsFailBuild: boolean;
    showToast?: boolean;
    srcFolder: string;
    tempFolder: string;
    uniqueTasks?: IExecutable[];
    verbose: boolean;
}

// @public
export interface ICopyConfig {
    copyTo: {
        [destPath: string]: string[];
    };
    shouldFlatten?: boolean;
}

// @public
export interface ICopyStaticAssetsTaskConfig {
    // (undocumented)
    excludeExtensions?: string[];
    // (undocumented)
    excludeFiles?: string[];
    // (undocumented)
    includeExtensions?: string[];
    // (undocumented)
    includeFiles?: string[];
}

// @public
export interface ICustomGulpTask {
    // (undocumented)
    (gulp: typeof gulp_2 | GulpProxy, buildConfig: IBuildConfig, done?: (failure?: any) => void): Promise<object> | NodeJS.ReadWriteStream | void;
}

// @public (undocumented)
export interface IExecutable {
    execute: (config: IBuildConfig) => Promise<void>;
    getCleanMatch?: (config: IBuildConfig, taskConfig?: any) => string[];
    isEnabled?: (buildConfig: IBuildConfig) => boolean;
    maxBuildTimeMs?: number;
    name?: string;
    onRegister?: () => void;
}

// @alpha
export interface IJestConfig {
    cache?: boolean;
    collectCoverageFrom?: string[];
    coverage?: boolean;
    coverageReporters?: string[];
    isEnabled?: boolean;
    maxWorkers?: number;
    moduleDirectories?: string[];
    modulePathIgnorePatterns?: string[];
    testMatch?: string[];
    testPathIgnorePatterns?: string[];
}

// @public
export function initialize(gulp: typeof gulp_2): void;

// @internal
export function _isJestEnabled(rootFolder: string): boolean;

// Warning: (ae-incompatible-release-tags) The symbol "jest" is marked as @public, but its signature references "JestTask" which is marked as @alpha
// 
// @public (undocumented)
export const jest: JestTask;

// @alpha
export class JestTask extends GulpTask<IJestConfig> {
    constructor();
    // (undocumented)
    executeTask(gulp: typeof gulp_2, completeCallback: (error?: string | Error) => void): void;
    // (undocumented)
    isEnabled(buildConfig: IBuildConfig): boolean;
    loadSchema(): JsonObject;
}

// @public
export function log(...args: string[]): void;

// @public
export function logSummary(value: string): void;

// @public
export function mergeConfig(config: Partial<IBuildConfig>): void;

// @public
export function parallel(...tasks: (IExecutable[] | IExecutable)[]): IExecutable;

// @public
export function replaceConfig(config: IBuildConfig): void;

// @public
export function reset(): void;

// @public
export function serial(...tasks: (IExecutable[] | IExecutable)[]): IExecutable;

// @public
export function setConfig(config: Partial<IBuildConfig>): void;

// @public
export function subTask(taskName: string, fn: ICustomGulpTask): IExecutable;

// @public
export function task(taskName: string, taskExecutable: IExecutable): IExecutable;

// @public
export enum TestResultState {
    // (undocumented)
    Failed = 1,
    // (undocumented)
    FlakyFailed = 2,
    // (undocumented)
    Passed = 0,
    // (undocumented)
    Skipped = 3
}

// @public
export class ValidateShrinkwrapTask extends GulpTask<void> {
    constructor();
    executeTask(gulp: gulp.Gulp, completeCallback: (error: string) => void): NodeJS.ReadWriteStream | void;
    }

// @public
export function verbose(...args: string[]): void;

// @public
export function warn(...args: string[]): void;

// @public
export function watch(watchMatch: string | string[], taskExecutable: IExecutable): IExecutable;


// (No @packageDocumentation comment for this package)

```
