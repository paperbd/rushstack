// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';

import { ApiDocumenterCommandLine } from './ApiDocumenterCommandLine';
import { BaseAction } from './BaseAction';
import { DocumenterConfig } from '../documenters/DocumenterConfig';
import { ExperimentalYamlDocumenter } from '../documenters/ExperimentalYamlDocumenter';

import { ApiModel } from '@microsoft/api-extractor-model';
import { FileSystem } from '@microsoft/node-core-library';
import { ExperimentalMarkdownDocumenter } from '../documenters/ExperimentalMarkdownDocumenter';

export class GenerateAction extends BaseAction {
  public constructor(parser: ApiDocumenterCommandLine) {
    super({
      actionName: 'generate',
      summary: 'EXPERIMENTAL',
      documentation: 'EXPERIMENTAL - This action is a prototype of a new config file driven mode of operation for'
        + ' API Documenter.  It is not ready for general usage yet.  Its design may change in the future.'
    });
  }

  protected onExecute(): Promise<void> { // override
    // Look for the config file under the current folder

    let configFilePath: string = path.join(process.cwd(), DocumenterConfig.FILENAME);

    // First try the current folder
    if (!FileSystem.exists(configFilePath)) {
      // Otherwise try the standard "config" subfolder
      configFilePath = path.join(process.cwd(), 'config', DocumenterConfig.FILENAME);
      if (!FileSystem.exists(configFilePath)) {
        throw new Error(`Unable to find ${DocumenterConfig.FILENAME} in the current folder or in a "config" subfolder`);
      }
    }

    const documenterConfig: DocumenterConfig = DocumenterConfig.loadFile(configFilePath);

    const apiModel: ApiModel = this.buildApiModel();

    if (documenterConfig.configFile.outputTarget === 'markdown') {
      const markdownDocumenter: ExperimentalMarkdownDocumenter = new ExperimentalMarkdownDocumenter(apiModel, documenterConfig);
      markdownDocumenter.generateFiles(this.outputFolder);
    } else {
      const yamlDocumenter: ExperimentalYamlDocumenter = new ExperimentalYamlDocumenter(apiModel, documenterConfig);
      yamlDocumenter.generateFiles(this.outputFolder);
    }

    return Promise.resolve();
  }
}
