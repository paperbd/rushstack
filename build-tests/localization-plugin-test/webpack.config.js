'use strict';

const path = require('path');
const webpack = require('webpack');

const { LocalizationPlugin } = require('@rushstack/localization-plugin');

module.exports = function(env) {
  const configuration = {
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: require.resolve('ts-loader'),
          exclude: /(node_modules)/,
          options: {
            compiler: require.resolve('@microsoft/rush-stack-compiler-3.4/node_modules/typescript'),
            logLevel: 'ERROR',
            configFile: path.resolve(__dirname, 'tsconfig.json')
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    },
    entry: {
      'localization-test': path.join(__dirname, 'src', 'index.ts')
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name]_[locale]_[contenthash].js',
      chunkFilename: '[id].[name]_[locale]_[contenthash].js'
    },
    optimization: {
      minimize: false
    },
    plugins: [
      new webpack.optimize.ModuleConcatenationPlugin(),
      new LocalizationPlugin({
        localizedStrings: {
          "en-us": {
            "./src/strings1.loc.json": {
              "string1": "the first string"
            },
            "./src/strings2.loc.json": {
              "string1": "the second string"
            },
            "./src/strings3.loc.json": {
              "string1": "the third string",
              "string2": "the fourth string",
              "string3": "UNUSED STRING!"
            }
          },
          "es-es": {
            "./src/strings1.loc.json": {
              "string1": "la primera cadena"
            },
            "./src/strings2.loc.json": {
              "string1": "la segunda cadena"
            },
            "./src/strings3.loc.json": {
              "string1": "la tercera cadena",
              "string2": "la cuarta cadena",
              "string3": "UNUSED STRING!"
            }
          }
        },
        defaultLocale: {
          usePassthroughLocale: true
        },
        serveLocale: {
          locale: 'en-us'
        }
      })
    ]
  };

  return configuration;
}
