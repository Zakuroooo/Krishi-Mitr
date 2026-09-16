/**
 * The web build of Krishi Mitr.
 *
 * The screens in `src/` are the *same files* that run on the phone — this is a
 * React Native codebase compiled for the browser through `react-native-web`,
 * not a rewrite. That is deliberate: a second implementation of 45 screens
 * would drift from the app within a week, and the demo would then have two
 * different products wearing one name.
 *
 * Two things make that work:
 *
 *   1. `react-native$ → react-native-web`, so `View`/`Text`/`StyleSheet`
 *      resolve to their DOM implementations.
 *   2. The five native modules below have no browser equivalent, so each one
 *      is aliased to a shim in `src/web-shims/` that implements the same API
 *      on a web platform feature (Web Speech, MediaRecorder, a file input).
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);

const babelLoaderConfiguration = {
  test: /\.(tsx|ts|jsx|js)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.tsx'),
    path.resolve(appDirectory, 'src'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        ['@babel/preset-env', { targets: { browsers: ['>0.5%', 'not dead'] } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      // ★ No `react-native-web` babel plugin here, deliberately. It rewrites
      //   every `from 'react-native'` to a deep path inside react-native-web,
      //   which is a bundle-size win and which also routes straight past the
      //   `react-native$` alias below — and that alias is what supplies
      //   `PermissionsAndroid`. Resolution has to go through one door for the
      //   shim to mean anything.
      plugins: [],
    },
  },
};

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: [path.resolve(appDirectory, 'index.web.js')],
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(appDirectory, 'dist'),
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
      babelLoaderConfiguration,
      { test: /\.(gif|jpe?g|png|svg|mp3|wav)$/, type: 'asset/resource' },
    ],
  },
  resolve: {
    alias: {
      // Everything react-native-web exports, plus PermissionsAndroid, which it
      // does not — see the shim's header for why that one absence blanked the
      // entire page.
      'react-native$': path.resolve(appDirectory, 'src/web-shims/react-native.ts'),

      // The native modules. Each shim exports the same surface the screens
      // already call, backed by a browser API — see src/web-shims/README.md.
      'react-native-sound': path.resolve(appDirectory, 'src/web-shims/sound.ts'),
      'react-native-tts': path.resolve(appDirectory, 'src/web-shims/tts.ts'),
      'react-native-fs': path.resolve(appDirectory, 'src/web-shims/fs.ts'),
      'react-native-image-picker': path.resolve(appDirectory, 'src/web-shims/image-picker.ts'),
      'react-native-audio-recorder-player': path.resolve(
        appDirectory,
        'src/web-shims/audio-recorder-player.ts',
      ),

      // Pulled in by react-native-svg's web build, and shipped as Flow source
      // that webpack cannot parse. Nothing here puts a bundled image inside an
      // SVG, so a stub is honest — see the shim's own header.
      '@react-native/assets-registry/registry': path.resolve(
        appDirectory,
        'src/web-shims/assets-registry.ts',
      ),
    },
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      'process.env': JSON.stringify({ NODE_ENV: process.env.NODE_ENV || 'development' }),
    }),
  ],
  performance: { hints: false },
  devServer: {
    port: 8080,
    historyApiFallback: true,
    hot: true,
  },
};
